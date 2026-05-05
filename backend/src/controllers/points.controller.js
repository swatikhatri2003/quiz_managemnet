const { z } = require("zod");
const { validateBody } = require("../utils/validate");
const { ApiError } = require("../utils/apiError");
const { getTeamById } = require("../models/teams.model");
const { getRoundById } = require("../models/rounds.model");
const { getQuizById } = require("../models/quiz.model");
const {
  getPointById,
  getPointByTeamRound,
  insertPoint,
  updatePoint,
  listPoints,
} = require("../models/points.model");
const { buildUploadUrl } = require("../utils/publicUrl");

const upsertSchema = z.object({
  point_id: z.coerce.number().int().positive().optional(),
  points: z.coerce.number().int().min(0),
  team_id: z.coerce.number().int().positive(),
  round_id: z.coerce.number().int().positive(),
});

const getSchema = z.object({
  team_id: z.coerce.number().int().positive().optional(),
  round_id: z.coerce.number().int().positive().optional(),
  quiz_id: z.coerce.number().int().positive().optional(),
});

function mapPointRowToObject(req, row) {
  return {
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
      quiz: {
        quiz_id: row.team_quiz_id,
      },
    },
    round: {
      round_id: row.round_id,
      round_name: row.round_name,
      maximum_score: row.maximum_score,
      quiz: {
        quiz_id: row.round_quiz_id,
      },
    },
    quiz: {
      quiz_id: row.quiz_id,
      name: row.quiz_name,
      image: row.quiz_image,
      image_url: buildUploadUrl(req, row.quiz_image ? `/uploads/quiz/${row.quiz_image}` : null),
    },
  };
}

async function upsertPoints(req, res) {
  const body = validateBody(upsertSchema, req.body);

  const team = await getTeamById(body.team_id);
  if (!team) throw new ApiError(404, "Team not found.", { team_id: body.team_id });

  const round = await getRoundById(body.round_id);
  if (!round) throw new ApiError(404, "Round not found.", { round_id: body.round_id });

  // Strong check: team.quiz_id must match round.quiz_id
  if (team.quiz_id !== round.quiz_id) {
    throw new ApiError(
      400,
      "Team and Round must belong to the same Quiz.",
      {
        team_id: team.team_id,
        team_quiz_id: team.quiz_id,
        round_id: round.round_id,
        round_quiz_id: round.quiz_id,
      }
    );
  }

  const quiz = await getQuizById(round.quiz_id);
  if (!quiz) throw new ApiError(500, "Invalid quiz reference.", { quiz_id: round.quiz_id });

  if (body.points > round.maximum_score) {
    throw new ApiError(400, "Points cannot be greater than maximum_score for this round.", {
      points: body.points,
      maximum_score: round.maximum_score,
      round_id: round.round_id,
    });
  }

  // Update by point_id if present, else create/update by unique(team_id,round_id)
  if (body.point_id) {
    const existing = await getPointById(body.point_id);
    if (!existing) {
      throw new ApiError(404, "Point record not found for update.", {
        point_id: body.point_id,
      });
    }
    if (existing.team_id !== body.team_id || existing.round_id !== body.round_id) {
      throw new ApiError(
        400,
        "point_id does not match provided team_id/round_id.",
        {
          point_id: body.point_id,
          existing_team_id: existing.team_id,
          existing_round_id: existing.round_id,
          team_id: body.team_id,
          round_id: body.round_id,
        }
      );
    }
    await updatePoint({ point_id: body.point_id, points: body.points });
    return res.json({
      ok: true,
      message: "Points updated successfully.",
      data: {
        point_id: body.point_id,
        points: body.points,
        team: {
          ...team,
          image_url: buildUploadUrl(req, team.image ? `/uploads/teams/${team.image}` : null),
          quiz: {
            ...quiz,
            image_url: buildUploadUrl(req, quiz.image ? `/uploads/quiz/${quiz.image}` : null),
          },
        },
        round,
      },
    });
  }

  const existingByUnique = await getPointByTeamRound({
    team_id: body.team_id,
    round_id: body.round_id,
  });

  if (existingByUnique) {
    await updatePoint({ point_id: existingByUnique.point_id, points: body.points });
    return res.json({
      ok: true,
      message: "Points updated successfully.",
      data: {
        point_id: existingByUnique.point_id,
        points: body.points,
        team: {
          ...team,
          image_url: buildUploadUrl(req, team.image ? `/uploads/teams/${team.image}` : null),
          quiz: {
            ...quiz,
            image_url: buildUploadUrl(req, quiz.image ? `/uploads/quiz/${quiz.image}` : null),
          },
        },
        round,
      },
    });
  }

  const insertId = await insertPoint({
    points: body.points,
    team_id: body.team_id,
    round_id: body.round_id,
  });

  res.status(201).json({
    ok: true,
    message: "Points created successfully.",
    data: {
      point_id: insertId,
      points: body.points,
      team: {
        ...team,
        image_url: buildUploadUrl(req, team.image ? `/uploads/teams/${team.image}` : null),
        quiz: {
          ...quiz,
          image_url: buildUploadUrl(req, quiz.image ? `/uploads/quiz/${quiz.image}` : null),
        },
      },
      round,
    },
  });
}

async function getPoints(req, res) {
  const body = validateBody(getSchema, req.body);

  if (body.quiz_id) {
    const quiz = await getQuizById(body.quiz_id);
    if (!quiz) throw new ApiError(404, "Quiz not found.", { quiz_id: body.quiz_id });
  }

  if (body.team_id) {
    const team = await getTeamById(body.team_id);
    if (!team) throw new ApiError(404, "Team not found.", { team_id: body.team_id });
  }

  if (body.round_id) {
    const round = await getRoundById(body.round_id);
    if (!round) throw new ApiError(404, "Round not found.", { round_id: body.round_id });
  }

  const rows = await listPoints({
    team_id: body.team_id,
    round_id: body.round_id,
    quiz_id: body.quiz_id,
  });

  res.json({
    ok: true,
    data: rows.map((r) => mapPointRowToObject(req, r)),
  });
}

module.exports = { upsertPoints, getPoints };

