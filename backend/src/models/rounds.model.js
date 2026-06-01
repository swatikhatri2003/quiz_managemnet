const { query } = require("../config/db");

async function listRounds({ quiz_id } = {}) {
  if (quiz_id) {
    return await query(
      "SELECT round_id, round_name, image, quiz_id, maximum_score FROM quiz_rounds WHERE quiz_id = :quiz_id ORDER BY round_id ASC",
      { quiz_id }
    );
  }
  return await query(
    "SELECT round_id, round_name, image, quiz_id, maximum_score FROM quiz_rounds ORDER BY round_id ASC"
  );
}

async function getRoundById(round_id) {
  const rows = await query(
    "SELECT round_id, round_name, image, quiz_id, maximum_score FROM quiz_rounds WHERE round_id = :round_id",
    { round_id }
  );
  return rows[0] || null;
}

async function createRound({ round_name, quiz_id, maximum_score, image }) {
  const result = await query(
    "INSERT INTO quiz_rounds (round_name, image, quiz_id, maximum_score) VALUES (:round_name, :image, :quiz_id, :maximum_score)",
    {
      round_name,
      image: image ?? null,
      quiz_id,
      maximum_score: maximum_score ?? 0,
    }
  );
  return {
    round_id: result.insertId,
    round_name,
    image: image ?? null,
    quiz_id,
    maximum_score: maximum_score ?? 0,
  };
}

async function updateRound({ round_id, round_name, quiz_id, maximum_score, image }) {
  const result = await query(
    "UPDATE quiz_rounds SET round_name = COALESCE(:round_name, round_name), quiz_id = COALESCE(:quiz_id, quiz_id), maximum_score = COALESCE(:maximum_score, maximum_score), image = COALESCE(:image, image) WHERE round_id = :round_id",
    {
      round_id,
      round_name: round_name ?? null,
      quiz_id: quiz_id ?? null,
      maximum_score: maximum_score ?? null,
      image: image ?? null,
    }
  );
  return result.affectedRows || 0;
}

async function deleteRound(round_id) {
  const result = await query("DELETE FROM quiz_rounds WHERE round_id = :round_id", { round_id });
  return result.affectedRows || 0;
}

module.exports = { listRounds, getRoundById, createRound, updateRound, deleteRound };

