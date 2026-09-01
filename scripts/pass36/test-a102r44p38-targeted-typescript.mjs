#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const arg = (name, fallback = null) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : fallback; };
const typescriptRoot = path.resolve(arg("--typescript-root", process.env.VELMERE_TYPESCRIPT_ROOT ?? ""));
const output = arg("--output");
const direct = path.join(typescriptRoot, "lib/typescript.js");
const nested = path.join(typescriptRoot, "package/lib/typescript.js");
const typescriptEntry = fs.existsSync(direct) ? direct : nested;
if (!fs.existsSync(typescriptEntry)) throw new Error(`exact_typescript_entry_missing:${typescriptRoot}`);
const require = createRequire(import.meta.url);
const ts = require(typescriptEntry);
if (ts.version !== "5.9.3") throw new Error(`unexpected_typescript_version:${ts.version}`);
const files = [
  "lib/security/audit-a01-a05-engine.ts",
  "lib/security/solidity-compiler-ast-runtime.d.mts",
  "lib/security/solidity-compiler-ast-generalization.d.mts",
  "lib/security/audit-compiler-ast-review-layer.d.mts",
];
const rows = [];
for (const relativePath of files) {
  const sourceText = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
  const sourceFile = ts.createSourceFile(relativePath, sourceText, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const parseDiagnostics = [...(sourceFile.parseDiagnostics ?? [])];
  const transpileDiagnostics = relativePath.endsWith(".d.mts") ? [] : [...(ts.transpileModule(sourceText, {
    fileName: relativePath,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, jsx: ts.JsxEmit.ReactJSX, isolatedModules: true, skipLibCheck: true },
  }).diagnostics ?? [])];
  const diagnostics = [...parseDiagnostics, ...transpileDiagnostics];
  rows.push({ path: relativePath, byteLength: Buffer.byteLength(sourceText), sha256: crypto.createHash("sha256").update(sourceText).digest("hex"), diagnostics: diagnostics.map((item) => ({ code: item.code, category: item.category, message: ts.flattenDiagnosticMessageText(item.messageText, "\n") })), passed: diagnostics.length === 0 });
}
const failed = rows.filter((row) => !row.passed);
const receipt = { schemaVersion: "velmere.pass36.a102r44p38.targeted-typescript.v1", status: failed.length ? "FAIL_R44P38_TARGETED_TYPESCRIPT" : "PASS_R44P38_TARGETED_TYPESCRIPT", node: process.version, typescript: ts.version, files: rows.length, passed: rows.length - failed.length, failed: failed.length, rows, semanticProjectTypecheckCredit: false, fullProjectTypeScriptCredit: false, truthBoundary: "Exact TypeScript 5.9.3 parse/transpile checks cover changed TS/declaration files only. Full semantic project typecheck is deferred to cycle 3/3." };
if (output) { fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true }); fs.writeFileSync(path.resolve(output), `${JSON.stringify(receipt, null, 2)}\n`); }
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
