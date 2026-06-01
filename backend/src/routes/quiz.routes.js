const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  getQuiz,
  createQuizController,
  updateQuizController,
  deleteQuizController,
} = require("../controllers/quiz.controller");
const { makeImageUpload } = require("../utils/upload");

const quizRouter = express.Router();

// POST /api/quiz/get { quiz_id? }
quizRouter.post("/get", asyncHandler(getQuiz));

// POST /api/quiz/create (multipart: name, image?)
quizRouter.post("/create", makeImageUpload("quiz"), asyncHandler(createQuizController));

// POST /api/quiz/update (multipart: quiz_id, name?, image?)
quizRouter.post("/update", makeImageUpload("quiz"), asyncHandler(updateQuizController));

// POST /api/quiz/delete { quiz_id }
quizRouter.post("/delete", asyncHandler(deleteQuizController));

module.exports = { quizRouter };

