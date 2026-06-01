const { z } = require("zod");
const { validateBody } = require("../utils/validate");
const { ApiError } = require("../utils/apiError");
const { listRounds, getRoundById, createRound, updateRound, deleteRound } = require("../models/rounds.model");
const { getQuizById } = require("../models/quiz.model");
const { buildUploadUrl } = require("../utils/publicUrl");
const { removeUpload } = require("../utils/upload");

const schema = z.object({
  round_id: z.coerce.number().int().positive().optional(),
  quiz_id: z.coerce.number().int().positive().optional(),
});

async function getRounds(req, res) {
  const body = validateBody(schema, req.body);

  if (body.round_id) {
    const round = await getRoundById(body.round_id);
    if (!round) throw new ApiError(404, "Round not found.", { round_id: body.round_id });

    const quiz = await getQuizById(round.quiz_id);
    if (!quiz) {
      throw new ApiError(500, "Round has invalid quiz reference.", {
        round_id: round.round_id,
        quiz_id: round.quiz_id,
      });
    }

    return res.json({
      ok: true,
      data: {
        ...round,
        image_url: buildUploadUrl(req, round.image ? `/uploads/rounds/${round.image}` : null),
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

  const rounds = await listRounds({ quiz_id: body.quiz_id });
  const quizMap = new Map();
  const enriched = [];

  for (const r of rounds) {
    let quiz = quizMap.get(r.quiz_id);
    if (!quiz) {
      quiz = await getQuizById(r.quiz_id);
      if (quiz) quizMap.set(r.quiz_id, quiz);
    }
    enriched.push({
      ...r,
      image_url: buildUploadUrl(req, r.image ? `/uploads/rounds/${r.image}` : null),
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
  round_name: z.string().trim().min(1, "Name is required."),
  quiz_id: z.coerce.number().int().positive(),
  maximum_score: z.coerce.number().int().nonnegative().optional(),
});

async function createRoundController(req, res) {
  const body = validateBody(createSchema, req.body);
  const quiz = await getQuizById(body.quiz_id);
  if (!quiz) throw new ApiError(404, "Quiz not found.", { quiz_id: body.quiz_id });

  const image = req.file?.filename ?? null;
  const created = await createRound({
    round_name: body.round_name,
    quiz_id: body.quiz_id,
    maximum_score: body.maximum_score ?? 0,
    image,
  });

  res.json({
    ok: true,
    message: "Round created.",
    data: {
      ...created,
      image_url: buildUploadUrl(req, created.image ? `/uploads/rounds/${created.image}` : null),
    },
  });
}

const updateSchema = z.object({
  round_id: z.coerce.number().int().positive(),
  round_name: z.string().trim().min(1, "Name is required.").optional(),
  quiz_id: z.coerce.number().int().positive().optional(),
  maximum_score: z.coerce.number().int().nonnegative().optional(),
});

async function updateRoundController(req, res) {
  const body = validateBody(updateSchema, req.body);
  const existing = await getRoundById(body.round_id);
  if (!existing) throw new ApiError(404, "Round not found.", { round_id: body.round_id });

  const nextQuizId = body.quiz_id ?? existing.quiz_id;
  const quiz = await getQuizById(nextQuizId);
  if (!quiz) throw new ApiError(404, "Quiz not found.", { quiz_id: nextQuizId });

  const nextImage = req.file?.filename ?? null;
  const affected = await updateRound({
    round_id: body.round_id,
    round_name: body.round_name ?? null,
    quiz_id: body.quiz_id ?? null,
    maximum_score: body.maximum_score ?? null,
    image: nextImage,
  });
  if (!affected) throw new ApiError(400, "Round update failed.", { round_id: body.round_id });

  if (nextImage && existing.image) removeUpload("rounds", existing.image);

  const updated = await getRoundById(body.round_id);
  res.json({
    ok: true,
    message: "Round updated.",
    data: {
      ...updated,
      image_url: buildUploadUrl(req, updated.image ? `/uploads/rounds/${updated.image}` : null),
    },
  });
}

const deleteSchema = z.object({
  round_id: z.coerce.number().int().positive(),
});

async function deleteRoundController(req, res) {
  const body = validateBody(deleteSchema, req.body);
  const existing = await getRoundById(body.round_id);
  if (!existing) throw new ApiError(404, "Round not found.", { round_id: body.round_id });

  const affected = await deleteRound(body.round_id);
  if (!affected) throw new ApiError(400, "Round delete failed.", { round_id: body.round_id });

  if (existing.image) removeUpload("rounds", existing.image);
  res.json({ ok: true, message: "Round deleted.", data: { round_id: body.round_id } });
}

module.exports = { getRounds, createRoundController, updateRoundController, deleteRoundController };

