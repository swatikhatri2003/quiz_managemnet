const { query } = require("../config/db");

async function listTeams({ quiz_id } = {}) {
  if (quiz_id) {
    return await query(
      "SELECT team_id, team_name, quiz_id, image FROM quiz_teams WHERE quiz_id = :quiz_id ORDER BY team_id ASC",
      { quiz_id }
    );
  }
  return await query(
    "SELECT team_id, team_name, quiz_id, image FROM quiz_teams ORDER BY team_id ASC"
  );
}

async function getTeamById(team_id) {
  const rows = await query(
    "SELECT team_id, team_name, quiz_id, image FROM quiz_teams WHERE team_id = :team_id",
    { team_id }
  );
  return rows[0] || null;
}

async function createTeam({ team_name, quiz_id, image }) {
  const result = await query(
    "INSERT INTO quiz_teams (team_name, quiz_id, image) VALUES (:team_name, :quiz_id, :image)",
    { team_name, quiz_id, image: image ?? null }
  );
  return { team_id: result.insertId, team_name, quiz_id, image: image ?? null };
}

async function updateTeam({ team_id, team_name, quiz_id, image }) {
  const result = await query(
    "UPDATE quiz_teams SET team_name = COALESCE(:team_name, team_name), quiz_id = COALESCE(:quiz_id, quiz_id), image = COALESCE(:image, image) WHERE team_id = :team_id",
    {
      team_id,
      team_name: team_name ?? null,
      quiz_id: quiz_id ?? null,
      image: image ?? null,
    }
  );
  return result.affectedRows || 0;
}

async function deleteTeam(team_id) {
  const result = await query("DELETE FROM quiz_teams WHERE team_id = :team_id", { team_id });
  return result.affectedRows || 0;
}

module.exports = { listTeams, getTeamById, createTeam, updateTeam, deleteTeam };

