import fs from "node:fs";
import path from "node:path";

export const ESLINT_FILE_CHUNK_SIZE = 500;
export const ESLINT_MAX_BATCH_FILES = 3;
export const ESLINT_MAX_BATCH_BYTES = 150_000;
export const GENERATED_IGNORE_ALLOWLIST = Object.freeze([
  Object.freeze({
    file: "next-env.d.ts",
    message: "File ignored because of a matching ignore pattern. Use \"--no-ignore\" to disable file ignore settings or use \"--no-warn-ignored\" to suppress this warning.",
  }),
]);

export function discoverLintFiles(root) {
  const extensions = new Set([".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".mts", ".cts"]);
  const excluded = new Set(["node_modules", ".next", ".velmere", "artifacts", "archive", "out", "coverage"]);
  const excludedRootDirectories = new Set(["build"]);
  const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        const relative = path.relative(root, absolute).split(path.sep).join("/");
        if (excluded.has(entry.name) || excludedRootDirectories.has(relative) || entry.name.startsWith(".next-pass25-")) continue;
        walk(absolute);
      } else if (entry.isFile() && extensions.has(path.extname(entry.name))) {
        files.push(path.relative(root, absolute).split(path.sep).join("/"));
      }
    }
  }
  walk(root);
  return files.sort((a, b) => a.localeCompare(b));
}

export function partitionFiles(files, chunkSize = ESLINT_FILE_CHUNK_SIZE) {
  if (!Number.isInteger(chunkSize) || chunkSize < 1) throw new Error("eslint_chunk_size_invalid");
  const parts = [];
  for (let index = 0; index < files.length; index += chunkSize) parts.push(files.slice(index, index + chunkSize));
  return parts;
}

export function planSubBatches(root, files, {
  maxFiles = ESLINT_MAX_BATCH_FILES,
  maxBytes = ESLINT_MAX_BATCH_BYTES,
} = {}) {
  if (!Number.isInteger(maxFiles) || maxFiles < 1) throw new Error("eslint_max_batch_files_invalid");
  if (!Number.isInteger(maxBytes) || maxBytes < 1) throw new Error("eslint_max_batch_bytes_invalid");
  const batches = [];
  let current = [];
  let currentBytes = 0;
  for (const file of files) {
    const bytes = fs.statSync(path.join(root, file)).size;
    if (current.length > 0 && (current.length >= maxFiles || currentBytes + bytes > maxBytes)) {
      batches.push({ files: current, bytes: currentBytes });
      current = [];
      currentBytes = 0;
    }
    current.push(file);
    currentBytes += bytes;
  }
  if (current.length > 0) batches.push({ files: current, bytes: currentBytes });
  return batches;
}

export function generatedIgnoreMatch(file, message) {
  return GENERATED_IGNORE_ALLOWLIST.some((row) => row.file === file && row.message === message);
}
