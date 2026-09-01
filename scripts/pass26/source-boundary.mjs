import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const ROOT_EXCLUDED_DIRECTORIES = new Set([
  ".git", ".velmere", "node_modules", "artifacts", "coverage", "out", "build",
  ".next", ".next-pass25-webpack", ".next-pass25-turbopack",
]);
const EXCLUDED_FILES = new Set([
  "CLEAN_SAFE_VERIFICATION.json",
  "config/pass26/package-payload-manifest.json",
]);

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizePath(value) {
  return value.split(path.sep).join("/");
}

export function shouldExcludeDirectory(root, directory, entryName) {
  const relativeParent = normalizePath(path.relative(root, directory));
  return (relativeParent === "" || relativeParent === ".") && ROOT_EXCLUDED_DIRECTORIES.has(entryName);
}

export function listCleanPayloadFiles(root = process.cwd()) {
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isDirectory() && shouldExcludeDirectory(root, directory, entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Symlink is forbidden in clean source: ${normalizePath(path.relative(root, absolute))}`);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && !entry.name.endsWith(".tsbuildinfo")) {
        const relative = normalizePath(path.relative(root, absolute));
        if (!EXCLUDED_FILES.has(relative)) files.push({ absolute, relative });
      }
    }
  };
  visit(root);
  return files.sort((a, b) => a.relative.localeCompare(b.relative));
}

export function cleanPayloadManifest(root = process.cwd()) {
  const rows = [];
  let bytes = 0;
  for (const file of listCleanPayloadFiles(root)) {
    const content = fs.readFileSync(file.absolute);
    bytes += content.length;
    rows.push({ path: file.relative, bytes: content.length, sha256: sha256(content) });
  }
  const treeSha256 = sha256(rows.map((row) => `${row.path}\0${row.bytes}\0${row.sha256}`).join("\n"));
  return { files: rows.length, bytes, treeSha256, rows };
}
