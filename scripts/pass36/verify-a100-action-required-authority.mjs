#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
const REV = "VELMERE_PASS36_A100R0_INCIDENT_KILL_SWITCH_ALERT_ACK_AND_CUSTOMER_COMMUNICATION_TRUTH_BOUNDARY";
const PARENT = "VELMERE_PASS36_A99R0_BACKUP_RESTORE_ROLLBACK_PROVIDER_LOSS_AND_RESTORED_RLS_TRUTH_BOUNDARY";
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const authority = read("config/pass36/current-release-authority.json");
const mirror = read("config/pass35/current-revision.json");
const legacy = read("config/current-release.json");
const state = read("config/pass36/a100-action-required-current-state.json");
const program = read("config/pass36/a100-world-class-completion-program.json");
const policy = read("config/pass36/a100-incident-kill-switch-customer-communication-policy.json");
const staging = read("config/pass35/staging-plan.json");
const active = fs.readFileSync("VELMERE_ACTIVE_PASS.txt", "utf8").trim();
const packageJson = read("package.json");
const checks = [];
const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
add("active:revision", active === REV, active);
add("authority:identity", authority.authorityRevisionId === REV && authority.parentRevisionId === PARENT && authority.currentSource?.revisionId === REV && authority.currentSource?.parentRevisionId === PARENT);
add("authority:program", authority.planes?.roadmapProgram?.revisionId === REV && authority.planes?.roadmapProgram?.path === "config/pass36/a100-world-class-completion-program.json");
add("authority:a100-plane", authority.planes?.incidentKillSwitchCustomerCommunicationBoundary?.revisionId === REV && authority.planes?.incidentKillSwitchCustomerCommunicationBoundary?.boundaryAssertions === 110 && authority.planes?.incidentKillSwitchCustomerCommunicationBoundary?.realIncidentRuns === 0 && authority.planes?.incidentKillSwitchCustomerCommunicationBoundary?.stagingCredit === false);
add("authority:no-promotion", authority.claims?.a90ToA100PassCredit === false && authority.claims?.liveProven === false && authority.claims?.saleEnabled === false && authority.claims?.productionApproved === false);
add("mirror:current", mirror.sourceRevisionId === REV && mirror.parentSourceRevisionId === PARENT && mirror.a100StagingCredit === false && mirror.a90ToA100PassCredit === false);
add("legacy:pointer", legacy.notAuthoritativeCurrentSourcePointer === true && legacy.authoritativeCurrentSourceRevisionId === REV && legacy.authoritativeCurrentSourceParentRevisionId === PARENT && legacy.a90ToA100PassCredit === false);
add("state:truth", state.revisionId === REV && state.passCredit?.A100 === false && state.localVerification?.a100BoundaryAssertions === 110 && state.localVerification?.a100RealIncidentRuns === 0 && state.localVerification?.a100RealClosedIncidents === 0);
add("program:truth", program.revisionId === REV && program.remainingPasses === 31 && program.localA100Summary?.stagingCredit === false && program.localA100Summary?.realIncidentRuns === 0);
add("policy:truth", policy.revisionId === REV && policy.localPassCredit === false && policy.localDenominators?.realIncidentRuns === 0 && policy.localDenominators?.realClosedIncidents === 0);
add("staging:current", staging.currentStagingSubject?.revisionId === REV && staging.a100?.realIncidentRuns === 0 && staging.a100?.stagingCredit === false);
add("package:current", packageJson.velmere?.currentRevisionId === REV && packageJson.velmere?.currentRevisionParentId === PARENT && packageJson.velmere?.worldClassCompletionProgramPath === "config/pass36/a100-world-class-completion-program.json");
for (const [id, script] of [["descendant", "scripts/pass36/verify-a100-current-root-descendant.mjs"], ["boundary", "scripts/pass36/verify-a100-incident-kill-switch-customer-communication-boundaries.mjs"]]) {
  const result = spawnSync(process.execPath, [script], { encoding: "utf8", timeout: 900000 });
  add(`${id}:verified`, result.status === 0, { status: result.status, stdout: (result.stdout ?? "").slice(-1200), stderr: (result.stderr ?? "").slice(-1200) });
}
const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({ status: failed.length ? "FAIL_A100_AUTHORITY" : "PASS_A100_ACTION_REQUIRED_AUTHORITY_NO_STAGING_CREDIT", revisionId: REV, checks: checks.length, passed: checks.length - failed.length, failed: failed.length, results: checks, globalDecision: "NO_GO", realIncidentRuns: 0, realClosedIncidents: 0, stagingCredit: false, live: false, saleEnabled: false, productionApproved: false, worldClassProven: false }, null, 2));
process.exit(failed.length ? 1 : 0);
