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

module.exports = { listTeams, getTeamById };

