#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const CONFIG_PATH = "config/pass36/a102r44p2-a66-denominator-migration.json";
const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const checks = [];
const check = (id, pass, detail = null) => checks.push({ id, pass: Boolean(pass), detail });

const historicalBytes = readFileSync(config.historicalReceiptPath);
const historical = JSON.parse(historicalBytes.toString("utf8"));
const currentBytes = readFileSync(config.currentTestPath);
const currentSource = currentBytes.toString("utf8");
const declaredIds = [];
const seen = new Set();
for (const match of currentSource.matchAll(/\b(?:check|expectError)\(\s*"([^"]+)"/gu)) {
  const id = match[1];
  if (!seen.has(id)) {
    seen.add(id);
    declaredIds.push(id);
  }
}
const historicalIds = historical.checks.map((row) => row.id);
const added = declaredIds.filter((id) => !historicalIds.includes(id));
const removed = historicalIds.filter((id) => !declaredIds.includes(id));
const executionCommand = config.currentExecutionGate?.command;

check("schema", config.schemaVersion === "velmere.pass36.a102r44p2.a66-denominator-migration.v1");
check("historical_receipt_hash", sha256(historicalBytes) === config.historicalReceiptSha256);
check("current_test_hash", sha256(currentBytes) === config.currentTestSha256);
check("historical_denominator", historical.total === config.oldDenominator && historical.checks.length === config.oldDenominator);
check("current_source_ids_parsed", declaredIds.length > 0 && declaredIds.length === new Set(declaredIds).size, declaredIds);
check("current_denominator_declared", declaredIds.length === config.newDenominator, { declared: declaredIds.length, expected: config.newDenominator });
check("all_historical_ids_retained", removed.length === 0, removed);
check("exact_added_id", JSON.stringify(added) === JSON.stringify(config.addedCheckIds), added);
check("migration_arithmetic", config.oldDenominator + config.addedChecks - config.removedChecks === config.newDenominator);
check("no_official_credit", config.creditBoundary.officialToolExecutionCredit === false && config.creditBoundary.liveCredit === false && config.creditBoundary.saleCredit === false);
check("posix_broker_opt_in_present", currentSource.includes('containmentBroker: process.platform === "win32" ? undefined : "POSIX_PROCESS_GROUP_V1"'));
check("separate_execution_gate_declared", Array.isArray(executionCommand)
  && JSON.stringify(executionCommand) === JSON.stringify(["node", "--experimental-strip-types", config.currentTestPath])
  && config.currentExecutionGate.expectedTotal === config.newDenominator
  && config.currentExecutionGate.expectedPassed === config.newDenominator
  && config.currentExecutionGate.expectedFailed === 0,
config.currentExecutionGate);

const failed = checks.filter((row) => !row.pass);
const output = {
  schemaVersion: "velmere.pass36.a102r44p2.a66-denominator-migration-receipt.v2",
  revisionId: config.revisionId,
  status: failed.length ? "FAIL" : "PASS_A66_DENOMINATOR_26_TO_27_ZERO_REMOVALS",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  oldDenominator: config.oldDenominator,
  newDenominator: config.newDenominator,
  retainedChecks: historicalIds.length - removed.length,
  addedChecks: added.length,
  removedChecks: removed.length,
  currentExecutionVerifiedHere: false,
  currentExecutionRequiredByAggregate: true,
  officialToolExecutionCredit: false,
  live: false,
  saleEnabled: false,
  checks,
};
console.log(JSON.stringify(output, null, 2));
if (failed.length) process.exit(1);
