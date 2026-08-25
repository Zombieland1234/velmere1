import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export const ROOT = process.cwd();
export const BUILDS_DIR = path.join(ROOT, ".velmere", "deployment-builds");
const EXCLUDED_ROOT_DIRECTORIES = new Set([
  ".git", ".velmere", "_velmere", "node_modules", "artifacts", "coverage", "out", "build",
  ".next", ".next-pass25-webpack", ".next-pass25-turbopack",
]);
const EXCLUDED_FILES = new Set(["CLEAN_SAFE_VERIFICATION.json", "CLEAN_SAFE_PAYLOAD_MANIFEST.json"]);
export function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
export function normalizePath(value) { return value.split(path.sep).join("/"); }
export function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temporary, filePath);
}
export function sourceTreeDigest(root = ROOT) {
  const rows = [];
  let totalBytes = 0;
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const relativeParent = normalizePath(path.relative(root, directory));
      if (entry.isDirectory() && (relativeParent === "" || relativeParent === ".") && EXCLUDED_ROOT_DIRECTORIES.has(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && !entry.name.endsWith(".tsbuildinfo")) {
        const relative = normalizePath(path.relative(root, absolute));
        if (EXCLUDED_FILES.has(relative)) continue;
        const bytes = fs.readFileSync(absolute);
        totalBytes += bytes.length;
        rows.push(`${relative}\0${bytes.length}\0${sha256(bytes)}`);
      }
    }
  };
  visit(root);
  rows.sort();
  return { sha256: sha256(rows.join("\n")), fileCount: rows.length, totalBytes };
}
export function relativeToRoot(filePath, root = ROOT) { return normalizePath(path.relative(root, filePath)); }
