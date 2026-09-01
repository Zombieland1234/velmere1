#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const run = spawnSync(process.execPath, ["scripts/pass36/build-a102r44p35-standalone-psychology-matrix.mjs"], {
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
let matrix = null;
try { matrix = JSON.parse(run.stdout); } catch { matrix = null; }
const rows = [];
const add = (id, passed, detail = null) => rows.push({ id, passed: Boolean(passed), detail });
add("builder-exit", run.status === 0, run.stderr);
add("matrix-json", Boolean(matrix));
if (matrix) {
  add("personas-30", matrix.summary.personas === 30);
  add("modules-4", matrix.summary.modules === 4);
  add("checks-6", matrix.summary.checksPerPersonaModule === 6);
  add("rows-720", matrix.summary.rows === 720 && matrix.rows.length === 720);
  add("unique-personas-30", new Set(matrix.rows.map((row) => row.personaId)).size === 30);
  add("unique-modules-4", JSON.stringify([...new Set(matrix.rows.map((row) => row.productId))].sort()) === JSON.stringify(["angel", "market-impact", "risk-indicator", "whale-watch"]));
  add("six-checks-each", [...new Set(matrix.rows.map((row) => `${row.personaId}:${row.productId}`))].every((key) => matrix.rows.filter((row) => `${row.personaId}:${row.productId}` === key).length === 6));
  add("no-customer-credit", matrix.customerProven === false && matrix.summary.realParticipants === 0 && matrix.rows.every((row) => row.customerCredit === false));
  add("dark-patterns-forbidden", matrix.rows.every((row) => row.darkPatternForbidden === true));
  add("acceptance-tests-present", matrix.rows.every((row) => typeof row.acceptanceTest === "string" && row.acceptanceTest.length >= 40));
  add("module-boundaries-present", matrix.rows.every((row) => typeof row.implementedBoundary === "string" && row.implementedBoundary.length >= 30));
}
const failures = rows.filter((row) => !row.passed);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p35.standalone-psychology-test.v1",
  status: failures.length ? "FAIL" : "PASS_R44P35_STANDALONE_PSYCHOLOGY_720",
  checks: rows.length,
  passed: rows.length - failures.length,
  failed: failures.length,
  rows,
}, null, 2));
if (failures.length) process.exit(1);
