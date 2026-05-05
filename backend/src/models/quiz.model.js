const { query } = require("../config/db");

async function listQuiz() {
  return await query("SELECT quiz_id, name, image FROM quiz ORDER BY quiz_id DESC");
}

async function getQuizById(quiz_id) {
  const rows = await query(
    "SELECT quiz_id, name, image FROM quiz WHERE quiz_id = :quiz_id",
    { quiz_id }
  );
  return rows[0] || null;
}

module.exports = { listQuiz, getQuizById };

