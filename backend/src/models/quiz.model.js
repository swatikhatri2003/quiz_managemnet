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

async function createQuiz({ name, image }) {
  const result = await query("INSERT INTO quiz (name, image) VALUES (:name, :image)", {
    name,
    image: image ?? null,
  });
  return { quiz_id: result.insertId, name, image: image ?? null };
}

async function updateQuiz({ quiz_id, name, image }) {
  const result = await query(
    "UPDATE quiz SET name = COALESCE(:name, name), image = COALESCE(:image, image) WHERE quiz_id = :quiz_id",
    { quiz_id, name: name ?? null, image: image ?? null }
  );
  return result.affectedRows || 0;
}

async function deleteQuiz(quiz_id) {
  const result = await query("DELETE FROM quiz WHERE quiz_id = :quiz_id", { quiz_id });
  return result.affectedRows || 0;
}

module.exports = { listQuiz, getQuizById, createQuiz, updateQuiz, deleteQuiz };

