function notFoundHandler(req, res) {
  res.status(404).json({
    ok: false,
    error: { message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
}

module.exports = { notFoundHandler };

