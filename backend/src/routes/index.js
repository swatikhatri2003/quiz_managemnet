const express = require("express");
const { teamsRouter } = require("./teams.routes");
const { roundsRouter } = require("./rounds.routes");
const { pointsRouter } = require("./points.routes");
const { quizRouter } = require("./quiz.routes");

const apiRouter = express.Router();

apiRouter.use("/teams", teamsRouter);
apiRouter.use("/rounds", roundsRouter);
apiRouter.use("/points", pointsRouter);
apiRouter.use("/quiz", quizRouter);

module.exports = { apiRouter };

