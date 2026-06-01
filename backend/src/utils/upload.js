const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { ApiError } = require("./apiError");

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function safeExt(originalName) {
  const ext = path.extname(originalName || "").toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg" || ext === ".png" || ext === ".webp" || ext === ".gif")
    return ext;
  return "";
}

function isAllowedImageMime(mime) {
  return (
    mime === "image/jpeg" ||
    mime === "image/png" ||
    mime === "image/webp" ||
    mime === "image/gif"
  );
}

function makeImageUpload(subdir) {
  const uploadRoot = path.join(process.cwd(), "uploads", subdir);
  ensureDirSync(uploadRoot);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      ensureDirSync(uploadRoot);
      cb(null, uploadRoot);
    },
    filename: (req, file, cb) => {
      const ext = safeExt(file.originalname) || ".jpg";
      const name = `${Date.now()}_${crypto.randomBytes(10).toString("hex")}${ext}`;
      cb(null, name);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      if (!isAllowedImageMime(file.mimetype)) {
        return cb(new ApiError(400, "Invalid image type. Allowed: jpg, png, webp, gif."));
      }
      cb(null, true);
    },
  }).single("image");
}

function removeUpload(subdir, filename) {
  if (!filename) return;
  const p = path.join(process.cwd(), "uploads", subdir, filename);
  fs.promises.unlink(p).catch(() => null);
}

module.exports = { makeImageUpload, removeUpload };

