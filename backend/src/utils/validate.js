const { ZodError } = require("zod");
const { ApiError } = require("./apiError");

function validateBody(schema, body) {
  try {
    return schema.parse(body ?? {});
  } catch (err) {
    if (err instanceof ZodError) {
      throw new ApiError(400, "Validation failed.", {
        issues: err.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }
    throw err;
  }
}

module.exports = { validateBody };

