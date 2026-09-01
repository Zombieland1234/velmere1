#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const root = process.cwd();
async function loadTypeScript() {
  try { return await import("typescript"); } catch (ignoredError) { void ignoredError; }
  const candidates = [];
  try {
    const globalRoot = execFileSync("npm", ["root", "-g"], { encoding: "utf8", timeout: 5000 }).trim();
    candidates.push(path.join(globalRoot, "typescript", "lib", "typescript.js"));
  } catch (ignoredError) { void ignoredError; }
  candidates.push("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return import(pathToFileURL(candidate).href);
  }
  throw new Error("TypeScript parser unavailable; install exact dependencies for semantic proof.");
}
const tsModule = await loadTypeScript();
const ts = tsModule.default ?? tsModule;
const extensions = new Set([".ts", ".tsx", ".mts", ".cts"]);
const excluded = new Set(["node_modules", ".next", ".git"]);
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excluded.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && extensions.has(path.extname(entry.name))) files.push(full);
  }
}
walk(root);
files.sort();
const errors = [];
const digest = createHash("sha256");
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file).replaceAll(path.sep, "/");
  digest.update(relative).update("\0").update(text).update("\0");
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(relative, text, ts.ScriptTarget.Latest, true, kind);
  for (const diagnostic of source.parseDiagnostics ?? []) {
    const position = source.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
    errors.push({ file: relative, line: position.line + 1, column: position.character + 1, code: diagnostic.code, message: ts.flattenDiagnosticMessageText(diagnostic.messageText, " ") });
  }
}
const result = {
  schemaVersion: "velmere.pass15.typescript-syntax-scan.v1",
  generatedAt: new Date().toISOString(),
  typescriptVersion: ts.version,
  files: files.length,
  parseErrors: errors.length,
  errors,
  sourceSha256: digest.digest("hex"),
  truthBoundary: "Syntax-only TypeScript parser scan using available environment TypeScript; not semantic typecheck, lint, dependency resolution or build proof."
};
fs.writeFileSync(path.join(root, "config/pass15/typescript-syntax-scan.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ typescriptVersion: result.typescriptVersion, files: result.files, parseErrors: result.parseErrors }, null, 2));
if (errors.length) process.exit(1);
