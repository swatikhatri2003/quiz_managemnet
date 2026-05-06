import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "out");
const buildDir = path.join(root, "build");

/** macOS AppleDouble / resource-fork sidecar files (often on ExFAT / USB drives). */
function removeAppleDoubleFiles(dir) {
  let removed = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.name.startsWith("._")) {
      try {
        fs.rmSync(full, { recursive: true, force: true });
        removed += 1;
      } catch {
        /* ignore */
      }
      continue;
    }
    if (e.isDirectory()) {
      removed += removeAppleDoubleFiles(full);
    }
  }
  return removed;
}

if (!fs.existsSync(outDir)) {
  console.error("export-to-build: expected out/ after next build — build may have failed.");
  process.exit(1);
}

fs.rmSync(buildDir, { recursive: true, force: true });
fs.renameSync(outDir, buildDir);
const n = removeAppleDoubleFiles(buildDir);
console.log(
  "Static export → frontend/build/ (deploy everything inside build/ to the server path /quiz_f/)."
);
if (n) console.log(`Removed ${n} macOS ._* artifact(s) from build/.`);
