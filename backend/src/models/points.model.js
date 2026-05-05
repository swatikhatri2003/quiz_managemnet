const { query } = require("../config/db");

async function getPointById(point_id) {
  const rows = await query(
    "SELECT point_id, points, team_id, round_id FROM quiz_points WHERE point_id = :point_id",
    { point_id }
  );
  return rows[0] || null;
}

async function getPointByTeamRound({ team_id, round_id }) {
  const rows = await query(
    "SELECT point_id, points, team_id, round_id FROM quiz_points WHERE team_id = :team_id AND round_id = :round_id",
    { team_id, round_id }
  );
  return rows[0] || null;
}

async function insertPoint({ points, team_id, round_id }) {
  const result = await query(
    "INSERT INTO quiz_points (points, team_id, round_id) VALUES (:points, :team_id, :round_id)",
    { points, team_id, round_id }
  );
  return result.insertId;
}

async function updatePoint({ point_id, points }) {
  await query("UPDATE quiz_points SET points = :points WHERE point_id = :point_id", {
    point_id,
    points,
  });
}

async function listPoints({ team_id, round_id, quiz_id } = {}) {
  // We join to expand FK details in response.
  const where = [];
  const params = {};

  if (team_id) {
    where.push("p.team_id = :team_id");
    params.team_id = team_id;
  }
  if (round_id) {
    where.push("p.round_id = :round_id");
    params.round_id = round_id;
  }
  if (quiz_id) {
    where.push("(t.quiz_id = :quiz_id OR r.quiz_id = :quiz_id)");
    params.quiz_id = quiz_id;
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  return await query(
    `
    SELECT
      p.point_id,
      p.points,
      t.team_id,
      t.team_name,
      t.image AS team_image,
      t.quiz_id AS team_quiz_id,
      r.round_id,
      r.round_name,
      r.maximum_score,
      r.quiz_id AS round_quiz_id,
      q.quiz_id,
      q.name AS quiz_name,
      q.image AS quiz_image
    FROM quiz_points p
    JOIN quiz_teams t ON t.team_id = p.team_id
    JOIN quiz_rounds r ON r.round_id = p.round_id
    JOIN quiz q ON q.quiz_id = r.quiz_id
    ${whereSql}
    ORDER BY q.quiz_id ASC, r.round_id ASC, t.team_id ASC
    `,
    params
  );
}

module.exports = {
  getPointById,
  getPointByTeamRound,
  insertPoint,
  updatePoint,
  listPoints,
};

