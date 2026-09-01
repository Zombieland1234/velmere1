#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tests = [
  { id: "single-sku-truth", args: ["scripts/pass36/test-a102r44p16-current-sku-truth.mjs"], status: "PASS_R44P16_SINGLE_SKU_TRUTH", min: 85 },
  { id: "analysis-queue", args: ["scripts/pass36/test-a102r44p16-analysis-queue-migration.mjs"], status: "PASS_R44P16_ANALYSIS_QUEUE_MIGRATION", min: 32 },
  { id: "a88-input-hash-migration", args: ["scripts/pass36/verify-a102r44p16-a88-input-hash-migration.mjs"], status: "PASS_R44P16_A88_INPUT_HASH_MIGRATION", min: 32 },
  { id: "route-ast-migration", args: ["scripts/pass36/verify-a102r44p16-route-ast-registry-migration.mjs"], status: "PASS_R44P16_ROUTE_AST_REGISTRY_MIGRATION", min: 13 },
  { id: "current-sku-runtime", args: ["--import", "./scripts/pass11/register-offline-ts-loader.mjs", "tests/pass36/a102r44p16-current-sku-runtime.ts"], status: "PASS_R44P16_CURRENT_SKU_RUNTIME", min: 185 },
];
const rows = [];
for (const test of tests) {
  const run = spawnSync(process.execPath, test.args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 180_000, env: { ...process.env, NODE_NO_WARNINGS: "1" } });
  let parsed = null; let parseError = null;
  try { parsed = JSON.parse(run.stdout); } catch (error) { parseError = String(error); }
  const summary = parsed?.summary ?? {};
  const count = Number(summary.checks ?? parsed?.checks ?? 0);
  const failed = Number(summary.failed ?? parsed?.failed ?? 0);
  const passed = Number(summary.passed ?? parsed?.passed ?? 0);
  const ok = run.status === 0 && run.signal === null && parsed?.status === test.status && count >= test.min && failed === 0 && passed === count;
  rows.push({ id: test.id, ok, exitCode: run.status, signal: run.signal, expectedStatus: test.status, observedStatus: parsed?.status ?? null, checks: count, passed, failed, stderrBytes: Buffer.byteLength(run.stderr ?? ""), parseError });
}
const state = JSON.parse(fs.readFileSync(path.join(ROOT, "config/pass36/a102r44p16-action-required-current-state.json"), "utf8"));
const policy = JSON.parse(fs.readFileSync(path.join(ROOT, "config/pass36/a102r44p16-current-sku-truth-policy.json"), "utf8"));
const stateOk = state.revisionId === policy.revisionId && state.globalDecision === "NO_GO" && state.LIVE === false && state.saleEnabled === false && state.productionApproved === false && state.worldClassProven === false && state.currentByteCredit?.webpack === false && state.currentByteCredit?.browser57 === false && state.currentByteCredit?.pdfRegeneration150 === false;
rows.push({ id: "current-state-fail-closed", ok: stateOk, exitCode: 0, signal: null, expectedStatus: "NO_GO_FALSE_FLAGS", observedStatus: state.globalDecision, checks: 1, passed: stateOk ? 1 : 0, failed: stateOk ? 0 : 1, stderrBytes: 0, parseError: null });
const failedRows = rows.filter((row) => !row.ok);
const result = { schemaVersion: "velmere.pass36.a102r44p16.static-policy-receipt.v1", revisionId: state.revisionId, status: failedRows.length ? "FAIL_R44P16_STATIC_POLICY" : "PASS_R44P16_STATIC_POLICY", summary: { stages: rows.length, passedStages: rows.length - failedRows.length, failedStages: failedRows.length, assertions: rows.reduce((sum, row) => sum + row.checks, 0) }, rows, truthBoundary: state.currentByteCredit };
console.log(JSON.stringify(result, null, 2));
if (failedRows.length) process.exit(1);
