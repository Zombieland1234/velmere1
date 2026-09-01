#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REVISION = "VELMERE_PASS36_A102R44P3_ACTION_REQUIRED_CURRENT_BYTE_SHIELD_PRO_REAL_MARKETS_AND_MULTILINGUAL_AI_MATRIX_CLOSURE_NO_LIVE_CREDIT";
const root = process.cwd();
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const receiptPaths = ["config/pass36/a85-test-receipt.json", "config/pass36/a86-test-receipt.json"];
const artifactPaths = ["artifacts/pass36/a85", "artifacts/pass36/a86"];
const scriptRows = [
  { id: "a85", path: "scripts/pass36/test-a85-shield-pro-map-full-depth-matrix.ts", minimumChecks: 30 },
  { id: "a86", path: "scripts/pass36/test-a86-real-markets-cross-asset-matrix.ts", minimumChecks: 29 },
];
const checks = [];
const check = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
const fileState = (relative) => {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return { exists: false };
  const bytes = fs.readFileSync(absolute);
  return { exists: true, byteLength: bytes.length, sha256: sha256(bytes) };
};
const dirState = (relative) => {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return { exists: false, files: [] };
  const files = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
      const item = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(item);
      else if (entry.isFile()) files.push(path.relative(root, item).split(path.sep).join("/"));
    }
  };
  walk(absolute);
  return { exists: true, files };
};
const parseJson = (stdout) => {
  const text = String(stdout ?? "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("json_not_found");
  return JSON.parse(text.slice(start, end + 1));
};

const receiptsBefore = Object.fromEntries(receiptPaths.map((relative) => [relative, fileState(relative)]));
const artifactsBefore = Object.fromEntries(artifactPaths.map((relative) => [relative, dirState(relative)]));

for (const row of scriptRows) {
  const source = fs.readFileSync(path.join(root, row.path), "utf8");
  check(`${row.id}:guard-declared`, source.includes('const writeArtifacts = process.argv.includes("--write")'));
  check(`${row.id}:writes-guarded`, source.includes("if (writeArtifacts)"));
  const run = spawnSync(process.execPath, ["--import", "./scripts/pass11/register-offline-ts-loader.mjs", row.path], {
    cwd: root,
    encoding: "utf8",
    shell: false,
    timeout: 300_000,
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, NODE_NO_WARNINGS: "1", NO_COLOR: "1", TERM: "dumb" },
  });
  let output = null;
  let parseError = null;
  try { output = parseJson(run.stdout); } catch (error) { parseError = error instanceof Error ? error.message : String(error); }
  check(`${row.id}:exit`, run.status === 0, { status: run.status, signal: run.signal, stderr: String(run.stderr ?? "").slice(0, 1200) });
  check(`${row.id}:json`, output !== null, parseError);
  check(`${row.id}:contract`, output?.summary?.failed === 0 && output?.summary?.checks >= row.minimumChecks, output?.summary ?? null);
}

const receiptsAfter = Object.fromEntries(receiptPaths.map((relative) => [relative, fileState(relative)]));
const artifactsAfter = Object.fromEntries(artifactPaths.map((relative) => [relative, dirState(relative)]));
for (const relative of receiptPaths) check(`receipt:${relative}:unchanged`, JSON.stringify(receiptsBefore[relative]) === JSON.stringify(receiptsAfter[relative]), { before: receiptsBefore[relative], after: receiptsAfter[relative] });
for (const relative of artifactPaths) check(`artifact:${relative}:unchanged`, JSON.stringify(artifactsBefore[relative]) === JSON.stringify(artifactsAfter[relative]), { before: artifactsBefore[relative], after: artifactsAfter[relative] });

const failed = checks.filter((row) => !row.passed);
const report = {
  schemaVersion: "velmere.pass36.a102r44p3.non-mutating-a85-a86-test.v1",
  revisionId: REVISION,
  status: failed.length ? "FAIL_A102R44P3_A85_A86_NON_MUTATING_DEFAULT" : "PASS_A102R44P3_A85_A86_NON_MUTATING_DEFAULT",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failures: failed,
  receiptsBefore,
  receiptsAfter,
  artifactsBefore,
  artifactsAfter,
  explicitWriteRequired: true,
  realDataCredit: false,
  liveCredit: false,
  saleEnabled: false,
  rows: checks,
  truthBoundary: "This test proves only that default A85/A86 verification execution does not rewrite canonical SOURCE receipts or runtime artifacts. The explicit --write generation path is not production, real-data, LIVE or sale evidence.",
};
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
