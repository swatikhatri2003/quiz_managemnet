const { ApiError } = require("../utils/apiError");

function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-unused-vars
  const _next = next;

  const status = err instanceof ApiError ? err.status : 500;
  const payload = {
    ok: false,
    error: {
      message:
        err instanceof ApiError
          ? err.message
          : "Unexpected server error. Please try again.",
    },
  };

  if (err instanceof ApiError && err.details) {
    payload.error.details = err.details;
  }

  if (process.env.NODE_ENV !== "production") {
    payload.error.debug = { name: err.name, stack: err.stack };
  }

  res.status(status).json(payload);
}

module.exports = { errorHandler };

