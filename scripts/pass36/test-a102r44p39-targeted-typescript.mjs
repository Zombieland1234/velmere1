#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const root = path.resolve(process.argv[2] ?? process.cwd());
const tsRoot = path.resolve(process.argv[3] ?? "");
const require = createRequire(pathToFileURL(path.join(tsRoot, "package.json")));
const ts = require(path.join(tsRoot, "lib/typescript.js"));
if (ts.version !== "5.9.3") throw new Error(`typescript_version_mismatch:${ts.version}`);
const files = [
  "lib/security/audit-a01-a05-engine.ts",
  "lib/security/solidity-compiler-ast-runtime.d.mts",
  "lib/security/audit-compiler-ast-review-layer.d.mts",
  "lib/security/audit-compiler-deployment-binding.d.mts",
  "lib/security/audit-compiler-canonical-packet.d.mts",
];
const rows = [];
for (const rel of files) {
  const source = fs.readFileSync(path.join(root, rel), "utf8");
  const kind = rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(rel, source, ts.ScriptTarget.ES2022, true, kind);
  const diagnostics = [...(sourceFile.parseDiagnostics ?? [])].map((d) => ({ code: d.code, category: ts.DiagnosticCategory[d.category], message: ts.flattenDiagnosticMessageText(d.messageText, " ") }));
  if (!rel.endsWith(".d.mts")) {
    const result = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, strict: true, skipLibCheck: false }, fileName: rel, reportDiagnostics: true });
    diagnostics.push(...(result.diagnostics ?? []).map((d) => ({ code: d.code, category: ts.DiagnosticCategory[d.category], message: ts.flattenDiagnosticMessageText(d.messageText, " ") })));
  }
  rows.push({ path: rel, diagnostics, passed: diagnostics.length === 0 });
}
const failed = rows.filter((row) => !row.passed);
console.log(JSON.stringify({ schemaVersion: "velmere.pass36.a102r44p39.targeted-typescript.v1", status: failed.length ? "FAIL_R44P39_TARGETED_TYPESCRIPT" : "PASS_R44P39_TARGETED_TYPESCRIPT", node: process.version, typescript: ts.version, files: rows.length, passed: rows.length - failed.length, failed: failed.length, semanticProjectTypecheckCredit: false, rows }, null, 2));
if (failed.length) process.exit(1);
