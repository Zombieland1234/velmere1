#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const migration = JSON.parse(fs.readFileSync("config/pass36/a102r44p22-community-clipboard-policy-migration.json", "utf8"));
const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const loader = ["--import", "./scripts/pass11/register-offline-ts-loader.mjs"];
const execute = (file) => spawnSync(process.execPath, [...loader, file], { encoding: "utf8", env: process.env, maxBuffer: 8 * 1024 * 1024 });
const historical = execute(migration.historicalTest.path);
const current = execute(migration.currentTest.path);
const rows = [];
const add = (id, passed, detail = null) => rows.push({ id, passed: Boolean(passed), detail });
add("denominator", migration.oldDenominator === 42 && migration.newDenominator === 56 && migration.retainedAssertions === 42 && migration.addedAssertions === 14 && migration.removedAssertions === 0 && migration.denominatorCollapse === false);
for (const [id, descriptor] of [["historical", migration.historicalTest], ["implementation", migration.currentImplementation], ["central-policy", migration.centralPolicy], ["current-test", migration.currentTest]]) {
  add(`${id}-bound`, fs.statSync(descriptor.path).size === descriptor.byteLength && sha(descriptor.path) === descriptor.sha256);
}
add("historical-negative-preserved", historical.status !== 0 && historical.stdout.includes('"assertions": 42') && historical.stdout.includes('"passed": 41') && historical.stdout.includes(migration.historicalTest.expectedLegacyFailureId));
add("current-green", current.status === 0 && current.stderr.length === 0 && current.stdout.includes('"checks": 14') && current.stdout.includes('"failed": 0'));
const impl = fs.readFileSync(migration.currentImplementation.path, "utf8");
const policy = fs.readFileSync(migration.centralPolicy.path, "utf8");
add("central-import", impl.includes('from "@/lib/security/control-character-policy"'));
add("semantic-policy", impl.includes("containsUnsafeControlOrBidi") && policy.includes("isUnsafeControlOrBidi"));
add("history-not-rewritten", migration.historyRewritten === false && migration.creditBoundary.historicalPassRewritten === false);
add("no-promotion", migration.creditBoundary.exactBrowserCredit === false && migration.creditBoundary.stagingCredit === false && migration.creditBoundary.liveCredit === false && migration.creditBoundary.saleCredit === false);
const failed = rows.filter((row) => !row.passed);
console.log(JSON.stringify({ schemaVersion: "velmere.pass36.a102r44p22.community-clipboard-policy-migration-verification.v1", status: failed.length ? "FAIL" : "PASS", checks: rows.length, passed: rows.length - failed.length, failed: failed.length, rows }, null, 2));
process.exit(failed.length ? 1 : 0);
