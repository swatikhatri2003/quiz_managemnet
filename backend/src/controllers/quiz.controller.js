const { z } = require("zod");
const { validateBody } = require("../utils/validate");
const { ApiError } = require("../utils/apiError");
const { listQuiz, getQuizById, createQuiz, updateQuiz, deleteQuiz } = require("../models/quiz.model");
const { listTeams } = require("../models/teams.model");
const { listRounds } = require("../models/rounds.model");
const { listPoints } = require("../models/points.model");
const { buildUploadUrl } = require("../utils/publicUrl");
const { removeUpload } = require("../utils/upload");

const schema = z.object({
  quiz_id: z.coerce.number().int().positive().optional(),
});

function groupBy(arr, keyFn) {
  const m = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    const list = m.get(k) || [];
    list.push(item);
    m.set(k, list);
  }
  return m;
}

async function getQuiz(req, res) {
  const body = validateBody(schema, req.body);

  if (!body.quiz_id) {
    const quizzes = await listQuiz();
    return res.json({
      ok: true,
      data: quizzes.map((q) => ({
        ...q,
        image_url: buildUploadUrl(req, q.image ? `/uploads/quiz/${q.image}` : null),
      })),
    });
  }

  const quiz = await getQuizById(body.quiz_id);
  if (!quiz) throw new ApiError(404, "Quiz not found.", { quiz_id: body.quiz_id });

  const [teams, rounds, pointsRows] = await Promise.all([
    listTeams({ quiz_id: quiz.quiz_id }),
    listRounds({ quiz_id: quiz.quiz_id }),
    listPoints({ quiz_id: quiz.quiz_id }),
  ]);

  const points = pointsRows.map((row) => ({
    point_id: row.point_id,
    points: row.points,
    team: {
      team_id: row.team_id,
      team_name: row.team_name,
      image: row.team_image,
      image_url: buildUploadUrl(
        req,
        row.team_image ? `/uploads/teams/${row.team_image}` : null
      ),
    },
    round: {
      round_id: row.round_id,
      round_name: row.round_name,
      maximum_score: row.maximum_score,
    },
  }));

  const byRound = groupBy(points, (p) => p.round.round_id);
  const byTeam = groupBy(points, (p) => p.team.team_id);

  res.json({
    ok: true,
    data: {
      ...quiz,
      image_url: buildUploadUrl(req, quiz.image ? `/uploads/quiz/${quiz.image}` : null),
      teams: teams.map((t) => ({
        ...t,
        image_url: buildUploadUrl(req, t.image ? `/uploads/teams/${t.image}` : null),
      })),
      rounds,
      points,
      points_matrix: {
        by_round: Object.fromEntries(byRound.entries()),
        by_team: Object.fromEntries(byTeam.entries()),
      },
    },
  });
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
});

async function createQuizController(req, res) {
  const body = validateBody(createSchema, req.body);
  const image = req.file?.filename ?? null;
  const created = await createQuiz({ name: body.name, image });
  res.json({
    ok: true,
    message: "Quiz created.",
    data: {
      ...created,
      image_url: buildUploadUrl(req, created.image ? `/uploads/quiz/${created.image}` : null),
    },
  });
}

const updateSchema = z.object({
  quiz_id: z.coerce.number().int().positive(),
  name: z.string().trim().min(1, "Name is required.").optional(),
});

async function updateQuizController(req, res) {
  const body = validateBody(updateSchema, req.body);
  const existing = await getQuizById(body.quiz_id);
  if (!existing) throw new ApiError(404, "Quiz not found.", { quiz_id: body.quiz_id });

  const nextImage = req.file?.filename ?? null;
  const affected = await updateQuiz({
    quiz_id: body.quiz_id,
    name: body.name ?? null,
    image: nextImage,
  });
  if (!affected) throw new ApiError(400, "Quiz update failed.", { quiz_id: body.quiz_id });

  if (nextImage && existing.image) removeUpload("quiz", existing.image);

  const updated = await getQuizById(body.quiz_id);
  res.json({
    ok: true,
    message: "Quiz updated.",
    data: {
      ...updated,
      image_url: buildUploadUrl(req, updated.image ? `/uploads/quiz/${updated.image}` : null),
    },
  });
}

const deleteSchema = z.object({
  quiz_id: z.coerce.number().int().positive(),
});

async function deleteQuizController(req, res) {
  const body = validateBody(deleteSchema, req.body);
  const existing = await getQuizById(body.quiz_id);
  if (!existing) throw new ApiError(404, "Quiz not found.", { quiz_id: body.quiz_id });

  const affected = await deleteQuiz(body.quiz_id);
  if (!affected) throw new ApiError(400, "Quiz delete failed.", { quiz_id: body.quiz_id });

  if (existing.image) removeUpload("quiz", existing.image);
  res.json({ ok: true, message: "Quiz deleted.", data: { quiz_id: body.quiz_id } });
}

module.exports = { getQuiz, createQuizController, updateQuizController, deleteQuizController };

