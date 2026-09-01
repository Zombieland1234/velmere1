#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
const REV = "VELMERE_PASS36_A100R0_INCIDENT_KILL_SWITCH_ALERT_ACK_AND_CUSTOMER_COMMUNICATION_TRUTH_BOUNDARY";
const PARENT = "VELMERE_PASS36_A99R0_BACKUP_RESTORE_ROLLBACK_PROVIDER_LOSS_AND_RESTORED_RLS_TRUTH_BOUNDARY";
const policy = JSON.parse(fs.readFileSync("config/pass36/a100-incident-kill-switch-customer-communication-policy.json", "utf8"));
const boundary = fs.readFileSync("scripts/pass36/a100-incident-kill-switch-customer-communication-boundary.mjs", "utf8");
const notice = fs.readFileSync("lib/security/pass36-a100-customer-incident-notice.ts", "utf8");
const test = fs.readFileSync("scripts/pass36/test-a100-incident-kill-switch-customer-communication-boundaries.ts", "utf8");
const checks = [];
const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
add("policy:identity", policy.revisionId === REV && policy.parentRevisionId === PARENT);
add("policy:no-credit", policy.localPassCredit === false && policy.promotion?.stagingCredit === false && policy.promotion?.saleEnabled === false && policy.promotion?.live === false && policy.promotion?.productionApproved === false);
add("policy:denominators", policy.localDenominators?.boundaryAssertions === 110 && policy.localDenominators?.fixtureScenarios === 11 && policy.localDenominators?.realIncidentRuns === 0 && policy.localDenominators?.realClosedIncidents === 0);
add("boundary:state-machine", boundary.includes('const STATES = ["ready", "open", "contained", "recovering", "resolved", "closed"]') && boundary.includes("a100_illegal_state_transition") && boundary.includes("a100_non_monotonic_sequence"));
add("boundary:alert-ack", boundary.includes("ALERT_SLA_MS = 60_000") && boundary.includes("ACK_SLA_MS = 300_000") && boundary.includes("a100_alert_observer_not_independent") && boundary.includes("mfaMethod !== \"webauthn\""));
add("boundary:containment", boundary.includes("paidDeliveryBlocked") && boundary.includes("emergency_hold") && boundary.includes("RECOVERY_REQUIRED_CONTAINMENT_UNCONFIRMED"));
add("boundary:dual-control", boundary.includes("validateA99DualControl") && boundary.includes("incident_kill_switch_release") && boundary.includes("incident_close"));
add("boundary:playbook", boundary.includes("REQUIRED_PLAYBOOK_ACTIONS") && boundary.includes("a100_playbook_incomplete_or_duplicate"));
add("boundary:journal", boundary.includes("createA99Journal") && boundary.includes("final_baseline_verified"));
add("notice:template-owned", notice.includes("const TITLES") && notice.includes("buildA100CustomerIncidentNotice") && notice.includes("Customer-safe incident copy"));
add("notice:cross-locale", boundary.includes("a100_notice_cross_locale_fact_drift") && test.includes('["pl", "en", "de"]'));
add("notice:false-safety", notice.includes("a100_notice_false_safety_claim") && boundary.includes("a100_notice_false_safety_claim"));
let first = null;
for (const iteration of [1, 2]) {
  const result = spawnSync(process.execPath, ["--import", "./scripts/pass11/register-offline-ts-loader.mjs", "scripts/pass36/test-a100-incident-kill-switch-customer-communication-boundaries.ts"], { encoding: "utf8", timeout: 600000 });
  add(`test:iteration-${iteration}`, result.status === 0, { status: result.status, stdout: (result.stdout ?? "").slice(-1600), stderr: (result.stderr ?? "").slice(-1600) });
  if (result.status === 0) {
    try {
      const parsed = JSON.parse(result.stdout);
      add(`test:truth-${iteration}`, parsed.status === "PASS_A100_INCIDENT_KILL_SWITCH_CUSTOMER_COMMUNICATION_BOUNDARY_LOCAL_ONLY" && parsed.assertions === 110 && parsed.fixtureScenarios === 11 && parsed.realIncidentRuns === 0 && parsed.realAlertDeliveries === 0 && parsed.realOnCallAcknowledgements === 0 && parsed.realKillSwitchActivations === 0 && parsed.realCustomerNoticeDeliveries === 0 && parsed.realRecoveryValidations === 0 && parsed.realClosedIncidents === 0 && parsed.stagingCredit === false && parsed.saleEnabled === false, parsed);
      if (iteration === 1) first = parsed;
      else add("test:deterministic-summary", JSON.stringify(parsed) === JSON.stringify(first), { first, second: parsed });
    } catch (error) { add(`test:parse-${iteration}`, false, String(error)); }
  }
}
const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({
  status: failed.length ? "FAIL_A100_INCIDENT_KILL_SWITCH_CUSTOMER_COMMUNICATION_BOUNDARY" : "PASS_A100_INCIDENT_KILL_SWITCH_CUSTOMER_COMMUNICATION_BOUNDARY_LOCAL_ONLY",
  revisionId: REV,
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  results: checks,
  realIncidentRuns: 0,
  realAlertDeliveries: 0,
  realOnCallAcknowledgements: 0,
  realKillSwitchActivations: 0,
  realCustomerNoticeDeliveries: 0,
  realRecoveryValidations: 0,
  realClosedIncidents: 0,
  stagingCredit: false,
  live: false,
  saleEnabled: false
}, null, 2));
process.exit(failed.length ? 1 : 0);
