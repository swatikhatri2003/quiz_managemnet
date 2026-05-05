const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const { getQuiz } = require("../controllers/quiz.controller");

const quizRouter = express.Router();

// POST /api/quiz/get { quiz_id? }
quizRouter.post("/get", asyncHandler(getQuiz));

module.exports = { quizRouter };

