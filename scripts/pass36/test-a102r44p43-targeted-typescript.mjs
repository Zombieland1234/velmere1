#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const sourceRoot = path.resolve(arg("--source-root", SOURCE_ROOT));
const typescriptRoot = path.resolve(arg("--typescript-root", process.env.VELMERE_TYPESCRIPT_ROOT ?? ""));
const outputPath = arg("--output");
const direct = path.join(typescriptRoot, "lib/typescript.js");
const nested = path.join(typescriptRoot, "package/lib/typescript.js");
const entry = fs.existsSync(direct) ? direct : nested;
if (!fs.existsSync(entry)) throw new Error(`exact_typescript_entry_missing:${typescriptRoot}`);
const require = createRequire(import.meta.url);
const ts = require(entry);
if (ts.version !== "5.9.3") throw new Error(`unexpected_typescript_version:${ts.version}`);

const files = [
  "lib/security/solidity-compiler-ast-runtime.d.mts",
  "lib/security/solidity-compiler-legacy-evaluation.d.mts",
  "lib/security/r44p43-public-balanced-holdout-evidence.d.mts",
];
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const rows = [];
for (const relativePath of files) {
  const absolutePath = path.join(sourceRoot, ...relativePath.split("/"));
  const sourceText = fs.readFileSync(absolutePath, "utf8");
  const sourceFile = ts.createSourceFile(relativePath, sourceText, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const diagnostics = [...(sourceFile.parseDiagnostics ?? [])].map((diagnostic) => ({
    code: diagnostic.code,
    category: ts.DiagnosticCategory[diagnostic.category],
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
  }));
  rows.push({
    path: relativePath,
    byteLength: Buffer.byteLength(sourceText),
    sha256: sha256(sourceText),
    diagnostics,
    passed: diagnostics.length === 0,
  });
}
const failedRows = rows.filter((row) => !row.passed);
const receipt = {
  schemaVersion: "velmere.pass36.a102r44p43.targeted-typescript.v1",
  status: failedRows.length ? "FAIL_R44P43_TARGETED_TYPESCRIPT" : "PASS_R44P43_TARGETED_TYPESCRIPT",
  node: process.version,
  typescript: ts.version,
  files: rows.length,
  passed: rows.length - failedRows.length,
  failed: failedRows.length,
  rows,
  semanticProjectTypecheckCredit: false,
  fullProjectTypeScriptCredit: false,
  truthBoundary: "Exact TypeScript 5.9.3 parse checks cover changed declaration files only. Full semantic project typecheck is deferred to R44P44 cycle 3/3.",
};
const serialized = `${JSON.stringify(receipt, null, 2)}\n`;
if (outputPath) {
  const absoluteOutput = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true });
  fs.writeFileSync(absoluteOutput, serialized);
}
process.stdout.write(serialized);
if (failedRows.length) process.exit(1);
