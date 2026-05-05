const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const { getRounds } = require("../controllers/rounds.controller");

const roundsRouter = express.Router();

// POST /api/rounds/get  { round_id? , quiz_id? }
roundsRouter.post("/get", asyncHandler(getRounds));

module.exports = { roundsRouter };

