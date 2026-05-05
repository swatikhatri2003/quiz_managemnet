const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const { getTeams } = require("../controllers/teams.controller");

const teamsRouter = express.Router();

// POST /api/teams/get  { team_id? }
teamsRouter.post("/get", asyncHandler(getTeams));

module.exports = { teamsRouter };

