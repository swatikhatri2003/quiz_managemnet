const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  getTeams,
  createTeamController,
  updateTeamController,
  deleteTeamController,
} = require("../controllers/teams.controller");
const { makeImageUpload } = require("../utils/upload");

const teamsRouter = express.Router();

// POST /api/teams/get  { team_id? }
teamsRouter.get("/", asyncHandler(getTeams));

// POST /api/teams/get { team_id?, quiz_id? }
teamsRouter.post("/get", asyncHandler(getTeams));

// POST /api/teams/create (multipart: team_name, quiz_id, image?)
teamsRouter.post("/create", makeImageUpload("teams"), asyncHandler(createTeamController));

// POST /api/teams/update (multipart: team_id, team_name?, quiz_id?, image?)
teamsRouter.post("/update", makeImageUpload("teams"), asyncHandler(updateTeamController));

// POST /api/teams/delete { team_id }
teamsRouter.post("/delete", asyncHandler(deleteTeamController));

module.exports = { teamsRouter };

