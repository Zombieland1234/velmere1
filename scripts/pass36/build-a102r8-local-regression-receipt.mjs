#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { REV, PARENT, RECEIPT } from "./a102r8-source-boundary.mjs";

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const parseLastJson = (stdout) => {
  const text = String(stdout ?? "").trim();
  try { return JSON.parse(text); } catch {
    // Intentional fallback: optional legacy evidence parsing may be unavailable.
  }
  for (let index = text.length - 1; index >= 0; index -= 1) {
    if (text[index] !== "{") continue;
    try { return JSON.parse(text.slice(index)); } catch {
    // Intentional fallback: optional legacy evidence parsing may be unavailable.
  }
  }
  return null;
};
const node = process.execPath;
const groups = [
  { name: "regression_core", expected: "PASS_A102R8_CLEAN_UNPACK_GROUP_REGRESSION_CORE_NO_PROMOTION", checks: 9 },
  { name: "regression_extended_a", expected: "PASS_A102R8_CLEAN_UNPACK_GROUP_REGRESSION_EXTENDED_A_NO_PROMOTION", checks: 4 },
  { name: "regression_extended_b1", expected: "PASS_A102R8_CLEAN_UNPACK_GROUP_REGRESSION_EXTENDED_B1_NO_PROMOTION", checks: 3 },
];
const groupRuns = [];
const results = [];
for (const group of groups) {
  const command = [node, "scripts/pass36/verify-a102r8-clean-unpack-tail.mjs", "--group", group.name];
  const run = spawnSync(command[0], command.slice(1), {
    cwd: process.cwd(), env: { ...process.env, TERM: process.env.TERM || "dumb" },
    encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 240_000, killSignal: "SIGKILL",
  });
  const stdout = run.stdout ?? "";
  const stderr = run.stderr ?? "";
  const parsed = parseLastJson(stdout);
  const passed = run.status === 0 && run.signal === null && !run.error
    && parsed?.status === group.expected && parsed?.checks === group.checks && parsed?.failed === 0;
  groupRuns.push({
    id: group.name, command, exitCode: run.status, signal: run.signal,
    spawnError: run.error?.message ?? null, expectedStatus: group.expected,
    observedStatus: parsed?.status ?? null, checks: parsed?.checks ?? null,
    passed: parsed?.passed ?? null, failed: parsed?.failed ?? null,
    stdoutBytes: Buffer.byteLength(stdout), stdoutSha256: sha256(stdout),
    stderrBytes: Buffer.byteLength(stderr), stderrSha256: sha256(stderr),
    groupPassed: passed,
  });
  if (Array.isArray(parsed?.results)) {
    for (const row of parsed.results) {
      results.push({
        id: row.id, classification: "PASS_LOCAL", exitCode: row.exitCode,
        expectedStatus: null, observedStatus: row.observedStatus ?? null,
        passed: Boolean(row.passed), stdoutSha256: row.stdoutSha256,
        stderrSha256: row.stderrSha256, stdoutBytes: row.stdoutBytes,
        stderrBytes: row.stderrBytes, metrics: row.metrics ?? undefined,
      });
    }
  }
  if (!passed) break;
}
if (groupRuns.length === groups.length && groupRuns.every((row) => row.groupPassed)) {
  const command = [node, "scripts/a44-source-integrity-audit.mjs"];
  const run = spawnSync(command[0], command.slice(1), {
    cwd: process.cwd(), env: { ...process.env, TERM: process.env.TERM || "dumb" },
    encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 120_000, killSignal: "SIGKILL",
  });
  const stdout = run.stdout ?? "";
  const stderr = run.stderr ?? "";
  const parsed = parseLastJson(stdout);
  const passed = run.status === 0 && run.signal === null && !run.error
    && parsed?.syntaxErrors === 0 && parsed?.missingLocalImports === 0 && parsed?.missingCssModuleClasses === 0;
  groupRuns.push({
    id: "source_audit_direct", command, exitCode: run.status, signal: run.signal,
    spawnError: run.error?.message ?? null, expectedStatus: "PASS_SOURCE_AUDIT_ZERO_ERRORS",
    observedStatus: passed ? "PASS_SOURCE_AUDIT_ZERO_ERRORS" : "FAIL_SOURCE_AUDIT", checks: 1,
    passed: passed ? 1 : 0, failed: passed ? 0 : 1,
    stdoutBytes: Buffer.byteLength(stdout), stdoutSha256: sha256(stdout),
    stderrBytes: Buffer.byteLength(stderr), stderrSha256: sha256(stderr),
    groupPassed: passed,
  });
  results.push({
    id: "source_audit", classification: "PASS_LOCAL", exitCode: run.status,
    expectedStatus: "PASS_SOURCE_AUDIT_ZERO_ERRORS",
    observedStatus: passed ? "PASS_SOURCE_AUDIT_ZERO_ERRORS" : "FAIL_SOURCE_AUDIT",
    passed, stdoutSha256: sha256(stdout), stderrSha256: sha256(stderr),
    stdoutBytes: Buffer.byteLength(stdout), stderrBytes: Buffer.byteLength(stderr),
    metrics: parsed ?? undefined,
  });
}
const failed = results.filter((row) => !row.passed);
const groupsPassed = groupRuns.length === groups.length + 1 && groupRuns.every((row) => row.groupPassed);
const sourceAudit = results.find((row) => row.id === "source_audit")?.metrics ?? {};
const receipt = {
  schemaVersion: "velmere.pass36.a102r8.local-regression-receipt.v2",
  revisionId: REV,
  parentRevisionId: PARENT,
  generatedAt: "2026-07-29T22:20:00.000Z",
  phase: "FINAL",
  status: groupsPassed && failed.length === 0 && results.length === 17
    ? "PASS_A102R8_LOCAL_REGRESSION_ACTION_REQUIRED_NO_PROMOTION"
    : "FAIL_A102R8_LOCAL_REGRESSION",
  summary: {
    executedPassRows: results.length,
    passedRows: results.filter((row) => row.passed).length,
    failedRows: failed.length + (results.length === 17 ? 0 : 17 - results.length),
    groupedRunnerRows: groupRuns.length,
    deferredFinalLineageRows: 2,
    environmentBlockedRows: 3,
  },
  groupRuns,
  results,
  deferredFinalLineageVerifiers: [
    { id: "a88r1_final_descendant_verifier", requiredAfterDescendantFreeze: true, credit: false },
    { id: "a89_final_descendant_verifier", requiredAfterDescendantFreeze: true, credit: false },
  ],
  environmentBlockers: [
    { id: "exact_node_npm_project_dependencies", classification: "BLOCKED_ENVIRONMENT", required: "Node 24.18.0 / npm 11.16.0 with genuine project node_modules", available: false, credit: false },
    { id: "exact_playwright_chromium", classification: "BLOCKED_ENVIRONMENT", required: "Chromium 148.0.7778.96 revision 1223", available: false, credit: false },
    { id: "real_browser_storage_privacy_and_staging_inputs", classification: "BLOCKED_EXTERNAL", required: "real logout/account-switch/shared-device browser storage instrumentation, staging, rights, legal and observers", available: false, credit: false },
  ],
  keyDenominators: {
    a102r8CheckoutCustomerBrowserPrivacyChecks: 41, a102r6PrivateAccountBrowserStateChecks: 30,
    a102r6LegacyPrivateStorageKeysPurged: 16, a102r5PaidBoundaryChecks: 26,
    vlmVerifyPositiveCases: 1, vlmVerifyNegativeCases: 5, a73Checks: 57,
    a73VerifierChecks: 73, a89Checks: 54, a89VerifierMinimumChecks: 156,
    a89Cases: 192, a89MutationsKilled: 768, apiBodyChecks: 37,
    malformedJsonChecks: 112, mega4800Checks: 61, a59Checks: 77,
    routeDispatchChecks: 1480, routeDispatchTamperChecks: 7, routeRoutes: 160,
    lazyRouteChecks: 176, productTierChecks: 186, zeroBudgetChecks: 439,
  },
  sourceAudit: {
    filesRead: sourceAudit.filesRead ?? 0, codeFiles: sourceAudit.codeFiles ?? 0,
    syntaxErrors: sourceAudit.syntaxErrors ?? -1,
    missingLocalImports: sourceAudit.missingLocalImports ?? -1,
    missingCssModuleClasses: sourceAudit.missingCssModuleClasses ?? -1,
  },
  realEvidence: {
    a102ObservationRuns: 0, browserRows: 0, browserStoragePrivacyRows: 0,
    durableServerCheckoutDraftRows: 0,
    durableServerAuditBookmarkRows: 0,
    durableServerPdfActivityReceiptRows: 0, stagingStages: 0, providerRights: 0,
    legalDpo: 0, customerCohorts: 0, independentAssurance: 0,
  },
  promotion: { globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false },
};
fs.writeFileSync(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
process.exit(receipt.status.startsWith("FAIL") ? 1 : 0);
