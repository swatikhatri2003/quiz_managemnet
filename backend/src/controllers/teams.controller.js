const { z } = require("zod");
const { validateBody } = require("../utils/validate");
const { ApiError } = require("../utils/apiError");
const { listTeams, getTeamById } = require("../models/teams.model");
const { getQuizById } = require("../models/quiz.model");
const { buildUploadUrl } = require("../utils/publicUrl");

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

module.exports = { getTeams };

