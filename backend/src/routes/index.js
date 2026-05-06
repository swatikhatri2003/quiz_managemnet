const express = require("express");
const { teamsRouter } = require("./teams.routes");
const { roundsRouter } = require("./rounds.routes");
const { pointsRouter } = require("./points.routes");
const { quizRouter } = require("./quiz.routes");

const apiRouter = express.Router();
apiRouter.get("/", (req, res) => {
    res.json({ status: "server is running", timestamp: new Date() });
  });
apiRouter.use("/quiz/teams", teamsRouter);
apiRouter.use("/quiz/rounds", roundsRouter);
apiRouter.use("/quiz/points", pointsRouter);
apiRouter.use("/quiz/quiz", quizRouter);

module.exports = { apiRouter };

