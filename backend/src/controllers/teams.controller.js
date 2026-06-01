const { z } = require("zod");
const { validateBody } = require("../utils/validate");
const { ApiError } = require("../utils/apiError");
const { listTeams, getTeamById, createTeam, updateTeam, deleteTeam } = require("../models/teams.model");
const { getQuizById } = require("../models/quiz.model");
const { buildUploadUrl } = require("../utils/publicUrl");
const { removeUpload } = require("../utils/upload");

const schema = z.object({
  team_id: z.coerce.number().int().positive().optional(),
  quiz_id: z.coerce.number().int().positive().optional(),
});

async function getTeams(req, res) {
  const body = validateBody(schema, req.body);

  if (body.team_id) {
    const team = await getTeamById(body.team_id);
    if (!team) throw new ApiError(404, "Team not found.", { team_id: body.team_id });

    const quiz = await getQuizById(team.quiz_id);
    if (!quiz) {
      throw new ApiError(500, "Team has invalid quiz reference.", {
        team_id: team.team_id,
        quiz_id: team.quiz_id,
      });
    }

    return res.json({
      ok: true,
      data: {
        ...team,
        image_url: buildUploadUrl(req, team.image ? `/uploads/teams/${team.image}` : null),
        quiz: {
          ...quiz,
          image_url: buildUploadUrl(req, quiz.image ? `/uploads/quiz/${quiz.image}` : null),
        },
      },
    });
  }

  if (body.quiz_id) {
    const quiz = await getQuizById(body.quiz_id);
    if (!quiz) throw new ApiError(404, "Quiz not found.", { quiz_id: body.quiz_id });
  }

  const teams = await listTeams({ quiz_id: body.quiz_id });
  const quizMap = new Map();
  const enriched = [];

  for (const t of teams) {
    let quiz = quizMap.get(t.quiz_id);
    if (!quiz) {
      quiz = await getQuizById(t.quiz_id);
      if (quiz) quizMap.set(t.quiz_id, quiz);
    }
    enriched.push({
      ...t,
      image_url: buildUploadUrl(req, t.image ? `/uploads/teams/${t.image}` : null),
      quiz: quiz
        ? {
            ...quiz,
            image_url: buildUploadUrl(req, quiz.image ? `/uploads/quiz/${quiz.image}` : null),
          }
        : null,
    });
  }

  res.json({ ok: true, data: enriched });
}

const createSchema = z.object({
  team_name: z.string().trim().min(1, "Name is required."),
  quiz_id: z.coerce.number().int().positive(),
});

async function createTeamController(req, res) {
  const body = validateBody(createSchema, req.body);
  const quiz = await getQuizById(body.quiz_id);
  if (!quiz) throw new ApiError(404, "Quiz not found.", { quiz_id: body.quiz_id });

  const image = req.file?.filename ?? null;
  const created = await createTeam({ team_name: body.team_name, quiz_id: body.quiz_id, image });
  res.json({
    ok: true,
    message: "Team created.",
    data: {
      ...created,
      image_url: buildUploadUrl(req, created.image ? `/uploads/teams/${created.image}` : null),
    },
  });
}

const updateSchema = z.object({
  team_id: z.coerce.number().int().positive(),
  team_name: z.string().trim().min(1, "Name is required.").optional(),
  quiz_id: z.coerce.number().int().positive().optional(),
});

async function updateTeamController(req, res) {
  const body = validateBody(updateSchema, req.body);
  const existing = await getTeamById(body.team_id);
  if (!existing) throw new ApiError(404, "Team not found.", { team_id: body.team_id });

  const nextQuizId = body.quiz_id ?? existing.quiz_id;
  const quiz = await getQuizById(nextQuizId);
  if (!quiz) throw new ApiError(404, "Quiz not found.", { quiz_id: nextQuizId });

  const nextImage = req.file?.filename ?? null;
  const affected = await updateTeam({
    team_id: body.team_id,
    team_name: body.team_name ?? null,
    quiz_id: body.quiz_id ?? null,
    image: nextImage,
  });
  if (!affected) throw new ApiError(400, "Team update failed.", { team_id: body.team_id });

  if (nextImage && existing.image) removeUpload("teams", existing.image);

  const updated = await getTeamById(body.team_id);
  res.json({
    ok: true,
    message: "Team updated.",
    data: {
      ...updated,
      image_url: buildUploadUrl(req, updated.image ? `/uploads/teams/${updated.image}` : null),
    },
  });
}

const deleteSchema = z.object({
  team_id: z.coerce.number().int().positive(),
});

async function deleteTeamController(req, res) {
  const body = validateBody(deleteSchema, req.body);
  const existing = await getTeamById(body.team_id);
  if (!existing) throw new ApiError(404, "Team not found.", { team_id: body.team_id });

  const affected = await deleteTeam(body.team_id);
  if (!affected) throw new ApiError(400, "Team delete failed.", { team_id: body.team_id });

  if (existing.image) removeUpload("teams", existing.image);
  res.json({ ok: true, message: "Team deleted.", data: { team_id: body.team_id } });
}

module.exports = { getTeams, createTeamController, updateTeamController, deleteTeamController };

