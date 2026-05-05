const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const dotenv = require("dotenv");

const { notFoundHandler } = require("./middlewares/notFoundHandler");
const { errorHandler } = require("./middlewares/errorHandler");
const { apiRouter } = require("./routes");

async function createApp() {
  dotenv.config();

  const app = express();

  app.set("trust proxy", true);

  // Allow images served from /uploads to be used by the frontend (different origin).
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan("dev"));

  // Static uploads
  app.use(
    "/uploads",
    express.static(path.join(process.cwd(), "uploads"), {
      fallthrough: false,
      maxAge: "1h",
    })
  );

  app.get("/health", (req, res) => {
    res.json({ ok: true });
  });

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };

