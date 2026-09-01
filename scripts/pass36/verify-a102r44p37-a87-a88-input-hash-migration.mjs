#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";

const REV = "VELMERE_PASS36_A102R44P37_ACTION_REQUIRED_AUTHORITY_RELEASE_TRUTH_TYPESCRIPT_AND_EVIDENCE_REPAIR_TEST_CYCLE_0_OF_3_NO_LIVE_CREDIT";
const ledger = JSON.parse(fs.readFileSync("config/pass36/r44p37-a87-a88-input-hash-migration.json", "utf8"));
const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const checks = [];
const check = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
check("revision", ledger.revisionId === REV, ledger.revisionId);
check("row-denominator", Array.isArray(ledger.rows) && ledger.rows.length === 4, ledger.rows?.length);
check("no-removal", ledger.removedTests === 0 && ledger.removedAssertions === 0 && ledger.denominatorCollapse === false);
check("no-promotion", ledger.currentProviderEvidenceCredit === false && ledger.realCustomerCredit === false && ledger.saleCredit === false && ledger.liveCredit === false);
check("a87-denominator", ledger.denominators.a87Assets === 318 && ledger.denominators.a87TierPackets === 1908 && ledger.denominators.a87SemanticMutations === 34344);
check("a88-denominator", ledger.denominators.a88Cases === 360 && ledger.denominators.a88ChannelProjections === 1800 && ledger.denominators.a88SemanticMutations === 5760);
for (const row of ledger.rows) {
  const policy = JSON.parse(fs.readFileSync(row.policyPath, "utf8"));
  const binding = policy.inputs?.[row.inputId];
  check(`binding:${row.inputId}`, Boolean(binding) && binding.path === row.inputPath && binding.sha256 === row.currentSha256, row);
  check(`bytes:${row.inputId}`, fs.existsSync(row.inputPath) && sha(row.inputPath) === row.currentSha256, row.inputPath);
  check(`changed:${row.inputId}`, /^[a-f0-9]{64}$/u.test(row.parentSha256) && row.parentSha256 !== row.currentSha256, row);
}
const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p37.a87-a88-input-hash-migration-verification.v1",
  revisionId: REV,
  status: failed.length ? "FAIL_R44P37_A87_A88_INPUT_HASH_MIGRATION" : "PASS_R44P37_A87_A88_INPUT_HASH_MIGRATION_NO_PROMOTION",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  rows: checks,
}, null, 2));
if (failed.length) process.exit(1);
