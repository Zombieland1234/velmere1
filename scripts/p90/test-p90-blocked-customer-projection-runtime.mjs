#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";

const FIXED_AT = "2026-08-20T12:20:00.000Z";
const checks = [];
function check(id, condition, detail) {
  const row = { id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) };
  checks.push(row);
  if (!condition) throw new Error(`P90 blocked projection failed: ${id} ${JSON.stringify(detail ?? null)}`);
}

const [{ projectBlockedAuditReportForCustomer }, { canonicalJson }, { sha256Digest }] = await Promise.all([
  import("../../lib/security/audit-report-customer-projection.ts"),
  import("../../lib/security/canonical-json.ts"),
  import("../../lib/security/cryptographic-digest.ts"),
]);

const sensitiveMarker = "P90_PRIVATE_PROVIDER_FACT_SENTINEL_2D8B7A91";
const report = {
  schemaVersion: "controlled-report",
  reportId: "controlled-report-id",
  generatedAt: FIXED_AT,
  locale: "en",
  target: { projectName: "Controlled", contractAddress: "0x0000000000000000000000000000000000000001", chain: "ethereum" },
  reportMode: "internal full report",
  rule: sensitiveMarker,
  finalVerdict: {
    riskScore: 97,
    riskLabel: "CRITICAL",
    reviewPriorityScore: 99,
    sourceConfidence: 98,
    readinessScore: 96,
    basicState: "ready",
    proState: "ready",
    advancedState: "ready",
    publicVerdict: sensitiveMarker,
    proVerdict: sensitiveMarker,
    advancedVerdict: sensitiveMarker,
  },
  summary: { totalSections: 2, ready: 2, partial: 0, missing: 0, blocked: 0, manualReview: 0, totalEvidence: 9, totalMissing: 0, proPdfSections: 1, advancedActions: 1 },
  sections: [{ id: "claim-ledger", tier: "basic", title: sensitiveMarker, state: "ready", evidenceCount: 4, missingCount: 0, customerSummary: sensitiveMarker, proPdfSummary: sensitiveMarker, advancedAction: sensitiveMarker, sourceFamilies: [sensitiveMarker] }],
  basicSections: [{ id: "claim-ledger", tier: "basic", title: sensitiveMarker, state: "ready", evidenceCount: 4, missingCount: 0, customerSummary: sensitiveMarker, proPdfSummary: sensitiveMarker, advancedAction: sensitiveMarker, sourceFamilies: [sensitiveMarker] }],
  proPdfSections: [{ id: "claim-ledger", tier: "pro", title: sensitiveMarker, state: "ready", evidenceCount: 4, missingCount: 0, customerSummary: sensitiveMarker, proPdfSummary: sensitiveMarker, advancedAction: sensitiveMarker, sourceFamilies: [sensitiveMarker] }],
  advancedQueue: [sensitiveMarker],
  topFindings: [{ id: "finding-private", title: sensitiveMarker, severity: "critical", publicLine: sensitiveMarker, proLine: sensitiveMarker, advancedAction: sensitiveMarker, sourceFamily: sensitiveMarker }],
  proPdfLines: [sensitiveMarker],
  visualMergeContract: { purpose: sensitiveMarker, doNotBreak: [sensitiveMarker], uiSlots: [{ slot: "private", notes: sensitiveMarker }] },
};

const projected = projectBlockedAuditReportForCustomer({ report, requestedTier: "pro", reasonDigest: `sha256:${"a".repeat(64)}` });
check("blocked_schema", projected.schemaVersion === "pass4829-audit-report-customer-blocked-projection-v1", projected.schemaVersion);
check("risk_score_removed", projected.report.finalVerdict.riskScore === null, projected.report.finalVerdict);
check("risk_label_withheld", projected.report.finalVerdict.riskLabel === "WITHHELD", projected.report.finalVerdict.riskLabel);
check("findings_removed", projected.report.topFindings.length === 0);
check("sections_removed", projected.report.sections.length === 0 && projected.report.basicSections.length === 0 && projected.report.proPdfSections.length === 0);
check("paid_lines_removed", projected.report.proPdfLines.length === 0 && projected.report.advancedQueue.length === 0);
check("evidence_counts_zeroed", projected.report.summary.totalEvidence === 0 && projected.report.summary.ready === 0, projected.report.summary);
check("sensitive_marker_absent", !JSON.stringify(projected).includes(sensitiveMarker));
check("hidden_counts_preserved", projected.hidden.findingsHidden === 1 && projected.hidden.sectionsHidden === 1 && projected.hidden.proPdfLinesHidden === 1, projected.hidden);
const unsigned = Object.fromEntries(Object.entries(projected).filter(([key]) => key !== "projectionDigest"));
check("projection_digest_valid", projected.projectionDigest === sha256Digest(canonicalJson(unsigned)), projected.projectionDigest);
const tampered = structuredClone(projected);
tampered.report.finalVerdict.publicVerdict = sensitiveMarker;
const tamperedUnsigned = Object.fromEntries(Object.entries(tampered).filter(([key]) => key !== "projectionDigest"));
check("tamper_breaks_digest", sha256Digest(canonicalJson(tamperedUnsigned)) !== projected.projectionDigest);

const failed = checks.filter((row) => row.status !== "PASS");
const receipt = {
  schemaVersion: "velmere.p90.audit-blocked-customer-projection-runtime.v1",
  generatedAt: FIXED_AT,
  status: failed.length ? "FAIL" : "PASS_BOUNDED_LOCAL_FAIL_CLOSED_PROJECTION",
  checks: { total: checks.length, passed: checks.length - failed.length, failed: failed.length, rows: checks },
  zeroFakeCredit: { realProviderNetwork: false, legalApproval: false, deployedRoute: false, customerFinal: "0/20", auditFinalPdf: "0/3" },
  truthBoundary: "This proves only that a local rights/currentness block strips provider-derived scores, findings, sections and PDF lines before another route can consume the report. It does not prove deployed handler behavior or authorization.",
};
await mkdir(new URL("../../receipts/p90/", import.meta.url), { recursive: true });
await writeFile(new URL("../../receipts/p90/P90_AUDIT_BLOCKED_CUSTOMER_PROJECTION_RUNTIME.json", import.meta.url), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks }, null, 2));
if (failed.length) process.exitCode = 1;
