const { query } = require("../config/db");

async function listRounds({ quiz_id } = {}) {
  if (quiz_id) {
    return await query(
      "SELECT round_id, round_name, quiz_id, maximum_score FROM quiz_rounds WHERE quiz_id = :quiz_id ORDER BY round_id ASC",
      { quiz_id }
    );
  }
  return await query(
    "SELECT round_id, round_name, quiz_id, maximum_score FROM quiz_rounds ORDER BY round_id ASC"
  );
}

async function getRoundById(round_id) {
  const rows = await query(
    "SELECT round_id, round_name, quiz_id, maximum_score FROM quiz_rounds WHERE round_id = :round_id",
    { round_id }
  );
  return rows[0] || null;
}

module.exports = { listRounds, getRoundById };

