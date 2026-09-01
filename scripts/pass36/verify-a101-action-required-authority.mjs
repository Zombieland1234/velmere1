#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
const REV = "VELMERE_PASS36_A101R0_MEASURED_SLO_ERROR_BUDGET_VENDOR_EXIT_AND_RECOVERY_TRUTH_BOUNDARY";
const PARENT = "VELMERE_PASS36_A100R0_INCIDENT_KILL_SWITCH_ALERT_ACK_AND_CUSTOMER_COMMUNICATION_TRUTH_BOUNDARY";
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const authority = read("config/pass36/current-release-authority.json");
const mirror = read("config/pass35/current-revision.json");
const legacy = read("config/current-release.json");
const state = read("config/pass36/a101-action-required-current-state.json");
const program = read("config/pass36/a101-world-class-completion-program.json");
const policy = read("config/pass36/a101-slo-error-budget-vendor-exit-recovery-policy.json");
const staging = read("config/pass35/staging-plan.json");
const active = fs.readFileSync("VELMERE_ACTIVE_PASS.txt", "utf8").trim();
const packageJson = read("package.json");
const checks = [];
const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
add("active:revision", active === REV, active);
add("authority:identity", authority.authorityRevisionId === REV && authority.parentRevisionId === PARENT && authority.currentSource?.revisionId === REV && authority.currentSource?.parentRevisionId === PARENT);
add("authority:top-level-pointers", authority.currentRootDescendantManifestPath === "config/pass36/a101-current-root-descendant-manifest.json" && authority.currentRootDescendantManifestRevisionId === REV && authority.worldClassCompletionProgramPath === "config/pass36/a101-world-class-completion-program.json" && authority.worldClassCompletionProgramRevisionId === REV);
add("authority:program-plane", authority.planes?.roadmapProgram?.revisionId === REV && authority.planes?.roadmapProgram?.path === "config/pass36/a101-world-class-completion-program.json" && authority.planes?.roadmapProgram?.remainingPasses === 31);
add("authority:a101-plane", authority.planes?.measuredSloVendorExitRecoveryBoundary?.revisionId === REV && authority.planes?.measuredSloVendorExitRecoveryBoundary?.boundaryAssertions === 94 && authority.planes?.measuredSloVendorExitRecoveryBoundary?.realSloWindows === 0 && authority.planes?.measuredSloVendorExitRecoveryBoundary?.stagingCredit === false);
add("authority:no-promotion", authority.claims?.a90ToA101PassCredit === false && authority.claims?.realMeasuredSloVendorExitRecoveryExecuted === false && authority.claims?.liveProven === false && authority.claims?.saleEnabled === false && authority.claims?.productionApproved === false);
add("authority:compatibility-pointers", authority.compatibilityPointers?.filter((row) => ["config/pass35/current-revision.json", "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt"].includes(row.path)).every((row) => row.declaredRevisionId === REV));
add("mirror:current", mirror.sourceRevisionId === REV && mirror.parentSourceRevisionId === PARENT && mirror.currentRootDescendantManifestPath === "config/pass36/a101-current-root-descendant-manifest.json" && mirror.worldClassCompletionProgramPath === "config/pass36/a101-world-class-completion-program.json" && mirror.a101StagingCredit === false && mirror.a90ToA101PassCredit === false);
add("legacy:pointer", legacy.notAuthoritativeCurrentSourcePointer === true && legacy.authoritativeCurrentSourceRevisionId === REV && legacy.authoritativeCurrentSourceParentRevisionId === PARENT && legacy.currentSloVendorExitRecoveryRevisionId === REV && legacy.a90ToA101PassCredit === false);
add("state:truth", state.revisionId === REV && state.passCredit?.A101 === false && state.localVerification?.a101BoundaryAssertions === 94 && state.localVerification?.a101RealSloWindows === 0 && state.localVerification?.a101RealVendorExitRuns === 0);
add("program:truth", program.revisionId === REV && program.remainingPasses === 31 && program.localA101Summary?.stagingCredit === false && program.localA101Summary?.realSloWindows === 0 && program.localA101Summary?.realVendorExitRuns === 0);
add("policy:truth", policy.revisionId === REV && policy.localPassCredit === false && policy.localDenominators?.realSloWindows === 0 && policy.localDenominators?.realPrimaryRestoreConfirmations === 0);
add("staging:current", staging.currentStagingSubject?.revisionId === REV && staging.currentStagingSubject?.sloVendorExitRecoveryPolicyPath === "config/pass36/a101-slo-error-budget-vendor-exit-recovery-policy.json" && staging.a101?.realSloWindows === 0 && staging.a101?.stagingCredit === false);
add("package:current", packageJson.velmere?.currentRevisionId === REV && packageJson.velmere?.currentRevisionParentId === PARENT && packageJson.velmere?.worldClassCompletionProgramPath === "config/pass36/a101-world-class-completion-program.json");
for (const [id, script] of [["descendant", "scripts/pass36/verify-a101-current-root-descendant.mjs"], ["boundary", "scripts/pass36/verify-a101-slo-vendor-exit-recovery-boundaries.mjs"]]) {
  const result = spawnSync(process.execPath, [script], { encoding: "utf8", timeout: 900000 });
  add(`${id}:verified`, result.status === 0, { status: result.status, stdout: (result.stdout ?? "").slice(-1600), stderr: (result.stderr ?? "").slice(-1600) });
}
const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({ status: failed.length ? "FAIL_A101_AUTHORITY" : "PASS_A101_ACTION_REQUIRED_AUTHORITY_NO_STAGING_CREDIT", revisionId: REV, checks: checks.length, passed: checks.length - failed.length, failed: failed.length, results: checks, globalDecision: "NO_GO", realSloWindows: 0, realVendorExitRuns: 0, productionSloProven: false, continuousMonitoringProven: false, stagingCredit: false, live: false, saleEnabled: false, productionApproved: false, worldClassProven: false }, null, 2));
process.exit(failed.length ? 1 : 0);
