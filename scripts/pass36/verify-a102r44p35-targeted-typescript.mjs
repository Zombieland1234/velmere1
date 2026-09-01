#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PARENT_MANIFEST_PATH = "_velmere/PASS36_A102R44P34_SOURCE_ONLY_MANIFEST.json";
const tsRoot = process.env.VELMERE_EXACT_TYPESCRIPT_ROOT ?? process.env.VELMERE_TYPESCRIPT_ROOT;
if (!tsRoot) throw new Error("VELMERE_EXACT_TYPESCRIPT_ROOT_REQUIRED");
const ts = await import(pathToFileURL(path.join(tsRoot, "lib/typescript.js")));
if (ts.version !== "5.9.3") throw new Error(`TYPESCRIPT_VERSION_MISMATCH:${ts.version}`);

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const parentManifestBytes = fs.readFileSync(PARENT_MANIFEST_PATH);
const parentManifest = JSON.parse(parentManifestBytes);
const parentEntries = new Map(parentManifest.entries.map((entry) => [entry.path, entry]));

const ignoredParts = new Set(["node_modules", ".git", ".turbo", ".cache", "coverage", "test-results", "playwright-report"]);
const ignoredFile = (relative) => {
  const parts = relative.split("/");
  return parts.some((part) => ignoredParts.has(part) || part === ".next" || part.startsWith(".next-"));
};
const walk = (directory, prefix = "") => {
  const rows = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (ignoredFile(relative)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) rows.push(...walk(absolute, relative));
    else if (entry.isFile() && /\.tsx?$/u.test(relative)) rows.push(relative);
  }
  return rows;
};

const changedFiles = walk(".")
  .filter((file) => {
    const bytes = fs.readFileSync(file);
    const parent = parentEntries.get(file);
    return !parent || parent.byteLength !== bytes.length || parent.sha256 !== sha256(bytes);
  })
  .sort();

if (!changedFiles.length) throw new Error("NO_CHANGED_TYPESCRIPT_FILES_DISCOVERED");

const rows = [];
for (const file of changedFiles) {
  const source = fs.readFileSync(file, "utf8");
  const isTsx = file.endsWith(".tsx");
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.ES2022,
    true,
    isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const parseDiagnostics = sourceFile.parseDiagnostics.map((row) => ({
    code: row.code,
    message: ts.flattenDiagnosticMessageText(row.messageText, "\n"),
  }));
  const output = ts.transpileModule(source, {
    fileName: file,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      strict: true,
      isolatedModules: true,
      verbatimModuleSyntax: true,
      jsx: ts.JsxEmit.Preserve,
      useDefineForClassFields: true,
    },
    reportDiagnostics: true,
  });
  const transpileDiagnostics = (output.diagnostics ?? [])
    .filter((row) => row.category === ts.DiagnosticCategory.Error)
    .map((row) => ({
      code: row.code,
      message: ts.flattenDiagnosticMessageText(row.messageText, "\n"),
    }));
  const diagnostics = [...parseDiagnostics, ...transpileDiagnostics];
  rows.push({
    file,
    fileSha256: sha256(Buffer.from(source, "utf8")),
    parentState: parentEntries.has(file) ? "MODIFIED" : "ADDED",
    scriptKind: isTsx ? "TSX" : "TS",
    bytes: Buffer.byteLength(source),
    passed: diagnostics.length === 0,
    diagnostics,
  });
}

const failures = rows.filter((row) => !row.passed);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p35.targeted-typescript.v3",
  status: failures.length ? "FAIL" : "PASS_R44P35_TARGETED_TYPESCRIPT",
  typescriptVersion: ts.version,
  parentManifestPath: PARENT_MANIFEST_PATH,
  parentManifestSha256: sha256(parentManifestBytes),
  discoveryClass: "ALL_CURRENT_TS_TSX_FILES_ADDED_OR_CHANGED_VS_EXACT_R44P34_MANIFEST",
  checkClass: "EXACT_TARGETED_PARSE_AND_TRANSPILE_NOT_FULL_PROJECT_TYPECHECK",
  files: rows.length,
  passed: rows.length - failures.length,
  failed: failures.length,
  fullProjectTypeScriptCredit: false,
  semanticTypecheckCredit: false,
  rows,
}, null, 2));
if (failures.length) process.exit(1);
