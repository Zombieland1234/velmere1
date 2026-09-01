import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const auditPath = path.join(root, "scripts/pass13/audit-full-tree.mjs");
const declarationPath = path.join(root, "lib/security/solidity-structured-signal.d.mts");
const auditSource = fs.readFileSync(auditPath, "utf8");
const declarationSource = fs.readFileSync(declarationPath, "utf8");
const rows = [];
const check = (id, ok, detail = null) => rows.push({ id, ok: Boolean(ok), detail });

check("declaration-pattern-covers-d-ts-mts-cts", /\\\.d\\\.\\\(\?:ts\|mts\|cts\\\)\$/.test(JSON.stringify(auditSource)) || auditSource.includes('/\\.d\\.(?:ts|mts|cts)$/u'));
check("legacy-d-ts-only-branch-removed", !auditSource.includes('relative.endsWith(".d.ts")'));
const sourceFile = ts.createSourceFile(declarationPath, declarationSource, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
const parseErrors = (sourceFile.parseDiagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
check("declaration-parse-zero-errors", parseErrors.length === 0, parseErrors.map((item) => item.code));
let transpileThrows = false;
try {
  ts.transpileModule(declarationSource, {
    fileName: declarationPath,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, isolatedModules: true },
  });
} catch {
  transpileThrows = true;
}
check("negative-control-transpile-path-is-unsafe-for-declaration", transpileThrows);
check("ordinary-ts-files-remain-transpiled", auditSource.includes("ts.transpileModule(source"));

const failed = rows.filter((row) => !row.ok);
const result = {
  schemaVersion: "velmere.pass36.a102r44p15.source-audit-declaration-boundary.v1",
  checks: rows.length,
  passed: rows.length - failed.length,
  failed: failed.length,
  rows,
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
