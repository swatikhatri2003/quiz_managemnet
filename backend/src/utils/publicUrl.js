function getPublicBaseUrl(req) {
  const envUrl = process.env.PUBLIC_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  return `${proto}://${req.get("host")}`;
}

function buildUploadUrl(req, relativePath) {
  if (!relativePath) return null;
  const base = getPublicBaseUrl(req);
  const clean = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return `${base}${clean}`;
}

module.exports = { buildUploadUrl };

