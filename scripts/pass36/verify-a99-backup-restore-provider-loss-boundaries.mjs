#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
const REV = "VELMERE_PASS36_A99R0_BACKUP_RESTORE_ROLLBACK_PROVIDER_LOSS_AND_RESTORED_RLS_TRUTH_BOUNDARY";
const PARENT = "VELMERE_PASS36_A98R0_EMAIL_STORAGE_KMS_ORIGIN_CONTEXT_CLEANUP_AND_DELIVERY_TRUTH_BOUNDARY";
const policy = JSON.parse(fs.readFileSync("config/pass36/a99-backup-restore-rollback-provider-loss-policy.json", "utf8"));
const boundary = fs.readFileSync("scripts/pass36/a99-backup-restore-provider-loss-boundary.mjs", "utf8");
const test = fs.readFileSync("scripts/pass36/test-a99-backup-restore-provider-loss-boundaries.mjs", "utf8");
const checks = [];
const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
add("policy:identity", policy.revisionId === REV && policy.parentRevisionId === PARENT);
add("policy:no-credit", policy.localPassCredit === false && policy.promotion?.stagingCredit === false && policy.promotion?.saleEnabled === false && policy.promotion?.live === false);
add("policy:denominators", policy.localDenominators?.boundaryAssertions === 78 && policy.localDenominators?.fixtureScenarios === 8 && policy.localDenominators?.realBackups === 0 && policy.localDenominators?.realRestores === 0 && policy.localDenominators?.realRestoredRlsCasesPassed === 0 && policy.localDenominators?.realDeploymentRollbacks === 0 && policy.localDenominators?.realProviderOutages === 0 && policy.localDenominators?.realRestoreCleanupConfirmations === 0);
add("boundary:backup-binding", boundary.includes("a99_backup_source_revision_mismatch") && boundary.includes("a99_backup_environment_mismatch") && boundary.includes("a99_backup_verify_not_independent"));
add("boundary:restore-parity", boundary.includes("a99_restore_digest_parity_failed") && boundary.includes("a99_restore_target_not_isolated"));
add("boundary:rls-exact", boundary.includes("EXACT_RLS_CASES = 19") && boundary.includes("EXACT_OWNER_CASES = 13") && boundary.includes("EXACT_OPERATOR_CASES = 6") && boundary.includes("a99_restore_rls_denominator_invalid"));
add("boundary:dual-control", boundary.includes("operations_owner") && boundary.includes("independent_reviewer") && boundary.includes("a99_dual_control_not_independent") && boundary.includes("webauthn"));
add("boundary:provider-independence", boundary.includes("providerId") && boundary.includes("vendorFamily") && boundary.includes("failureDomainDigest") && boundary.includes("controlPlaneDigest") && boundary.includes("credentialDigest") && boundary.includes("a99_provider_failure_domains_not_independent"));
add("boundary:compensation", boundary.includes("emergency_provider_restore") && boundary.includes("emergency_deployment_forward") && boundary.includes("emergency_restore_cleanup"));
add("boundary:journal", boundary.includes("previousDigest") && boundary.includes("sequence") && boundary.includes("finalDigest"));
add("test:fixture-denominator", test.includes("fixtureScenarios: 8") && test.includes("realBackups: 0") && test.includes("realProviderOutages: 0"));
let first = null;
for (const iteration of [1, 2]) {
  const result = spawnSync(process.execPath, ["scripts/pass36/test-a99-backup-restore-provider-loss-boundaries.mjs"], { encoding: "utf8", timeout: 300000 });
  add(`test:iteration-${iteration}`, result.status === 0, { status: result.status, stdout: (result.stdout ?? "").slice(-1200), stderr: (result.stderr ?? "").slice(-1200) });
  if (result.status === 0) {
    try {
      const parsed = JSON.parse(result.stdout);
      add(`test:truth-${iteration}`, parsed.status === "PASS_A99_BACKUP_RESTORE_PROVIDER_LOSS_BOUNDARY_LOCAL_ONLY" && parsed.assertions === 78 && parsed.fixtureScenarios === 8 && parsed.realBackups === 0 && parsed.realRestores === 0 && parsed.realRestoredRlsCasesPassed === 0 && parsed.realDeploymentRollbacks === 0 && parsed.realProviderOutages === 0 && parsed.realRestoreCleanupConfirmations === 0 && parsed.stagingCredit === false && parsed.saleEnabled === false, parsed);
      if (iteration === 1) first = parsed;
      else add("test:deterministic-summary", JSON.stringify(parsed) === JSON.stringify(first), { first, second: parsed });
    } catch (error) { add(`test:parse-${iteration}`, false, String(error)); }
  }
}
const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({ status: failed.length ? "FAIL_A99_BACKUP_RESTORE_PROVIDER_LOSS_BOUNDARY" : "PASS_A99_BACKUP_RESTORE_PROVIDER_LOSS_BOUNDARY_LOCAL_ONLY", revisionId: REV, checks: checks.length, passed: checks.length - failed.length, failed: failed.length, results: checks, realBackups: 0, realRestores: 0, realRestoredRlsCasesPassed: 0, realDeploymentRollbacks: 0, realProviderOutages: 0, realRestoreCleanupConfirmations: 0, stagingCredit: false, live: false, saleEnabled: false }, null, 2));
process.exit(failed.length ? 1 : 0);
