const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const { upsertPoints, getPoints } = require("../controllers/points.controller");

const pointsRouter = express.Router();

// POST /api/points/upsert  { point_id? , points, team_id, round_id }
pointsRouter.post("/upsert", asyncHandler(upsertPoints));

// POST /api/points/get { team_id? , round_id? , quiz_id? }
pointsRouter.post("/get", asyncHandler(getPoints));

module.exports = { pointsRouter };

