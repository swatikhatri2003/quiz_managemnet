const { z } = require("zod");
const { validateBody } = require("../utils/validate");
const { ApiError } = require("../utils/apiError");
const { listRounds, getRoundById } = require("../models/rounds.model");
const { getQuizById } = require("../models/quiz.model");
const { buildUploadUrl } = require("../utils/publicUrl");

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

module.exports = { getRounds };

