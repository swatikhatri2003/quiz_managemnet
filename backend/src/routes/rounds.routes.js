const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  getRounds,
  createRoundController,
  updateRoundController,
  deleteRoundController,
} = require("../controllers/rounds.controller");
const { makeImageUpload } = require("../utils/upload");

const roundsRouter = express.Router();

// POST /api/rounds/get  { round_id? , quiz_id? }
roundsRouter.post("/get", asyncHandler(getRounds));

// POST /api/rounds/create (multipart: round_name, quiz_id, maximum_score?, image?)
roundsRouter.post("/create", makeImageUpload("rounds"), asyncHandler(createRoundController));

// POST /api/rounds/update (multipart: round_id, round_name?, quiz_id?, maximum_score?, image?)
roundsRouter.post("/update", makeImageUpload("rounds"), asyncHandler(updateRoundController));

// POST /api/rounds/delete { round_id }
roundsRouter.post("/delete", asyncHandler(deleteRoundController));

module.exports = { roundsRouter };

