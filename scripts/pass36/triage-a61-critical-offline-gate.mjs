#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const input = path.resolve(process.argv[2] || path.join(root, "artifacts/pass6/PASS6_CRITICAL_OFFLINE_GATE.json"));
const output = path.resolve(process.argv[3] || path.join(root, "config/pass36/a61-critical-offline-gate-triage-receipt.json"));
const gate = JSON.parse(fs.readFileSync(input, "utf8"));
const exactByteBlocked = new Set(["preflight_snapshot_recovery", "retired_preflight_source_registry"]);
const dependencyBlocked = new Set([
  "real_markets_receipt_integrity",
  "market_risk_delivery_gate",
  "legacy_live_publication_truth",
  "control_plane_boundaries",
  "worker_mutation_envelope",
  "production_security_db_hardening",
]);
const failed = gate.results.filter((row) => row.exitCode !== 0);
const rows = failed.map((row) => {
  const tail = row.failureTail ?? "";
  let classification = "SEMANTIC_OR_UNKNOWN_FAILURE";
  let reason = "failure_not_allowlisted";
  if (exactByteBlocked.has(row.id) && /ENOENT|no such file or directory/u.test(tail)) {
    classification = "BLOCKED_EXACT_HISTORICAL_BYTES";
    reason = row.id === "preflight_snapshot_recovery"
      ? "missing_exact_pass6_orphan_quarantine"
      : "missing_exact_vlm_pass5_release_manifest";
  } else if (dependencyBlocked.has(row.id) && /ERR_MODULE_NOT_FOUND|Cannot find package 'zod'|Cannot find package 'typescript'/u.test(tail)) {
    classification = "BLOCKED_RUNTIME_DEPENDENCY";
    reason = /typescript/u.test(tail) ? "typescript_package_unavailable" : "zod_or_genuine_runtime_package_unavailable";
  } else if (row.id === "production_security_db_hardening") {
    const probe = spawnSync(process.execPath, ["scripts/security-hardening/check-soft-rate-limit-migration.mjs"], { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
    if (probe.status !== 0 && /ERR_MODULE_NOT_FOUND|Cannot find package 'typescript'/u.test(`${probe.stdout}\n${probe.stderr}`)) {
      classification = "BLOCKED_RUNTIME_DEPENDENCY";
      reason = "typescript_package_unavailable";
    }
  }
  return { id: row.id, classification, reason, exitCode: row.exitCode, failureTailSha256: row.stderrSha256 ?? null };
});
const summary = {
  suites: gate.suiteCount,
  passed: gate.passedSuiteCount,
  failed: gate.failedSuiteCount,
  exactByteBlocked: rows.filter((row) => row.classification === "BLOCKED_EXACT_HISTORICAL_BYTES").length,
  runtimeDependencyBlocked: rows.filter((row) => row.classification === "BLOCKED_RUNTIME_DEPENDENCY").length,
  semanticOrUnknownFailed: rows.filter((row) => row.classification === "SEMANTIC_OR_UNKNOWN_FAILURE").length,
};
const result = {
  schemaVersion: "velmere.pass36.a61.critical-offline-gate-triage.v1",
  revisionId: "VELMERE_PASS36_A61R0_HISTORICAL_ARTIFACT_RECOVERY_INTAKE_CRITICAL_GATE_TRUTH",
  status: summary.semanticOrUnknownFailed === 0 ? "BLOCKED_NO_SEMANTIC_FAILURE_CREDIT" : "ACTION_REQUIRED_SEMANTIC_OR_UNKNOWN_FAILURE",
  currentEnvironmentRun: {
    generatedAt: gate.generatedAt,
    runtime: gate.runtime,
    sourceImmutable: gate.sourceImmutable,
    gateStatus: gate.status,
  },
  summary,
  failedSuites: rows,
  exactRuntimeCredit: false,
  criticalGate30Of30Credit: false,
  historicalA57R1ResultNotReplayedHere: "28/30 was recorded under exact Node 24.18.0/npm 11.16.0 with genuine packages; this A61 compatibility run is not substituted for that historical result.",
  saleEnabled: false,
  liveProven: false,
  truthBoundary: "A missing dependency or exact historical byte is BLOCKED, not a semantic product PASS or FAIL. Only an exact-runtime rerun with genuine packages and both exact artifacts installed may grant 30/30 credit."
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
if (summary.semanticOrUnknownFailed !== 0) process.exitCode = 1;
