#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";

const FIXED_AT = "2026-08-20T12:30:00.000Z";
const checks = [];
function check(id, condition, detail) {
  const row = { id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) };
  checks.push(row);
  if (!condition) throw new Error(`P90 blocked customer payload failed: ${id} ${JSON.stringify(detail ?? null)}`);
}

const [{ buildPass4820AuditCustomerReportPipeline }, { canonicalJson }, { sha256Digest }] = await Promise.all([
  import("../../lib/security/audit-customer-report-pipeline.ts"),
  import("../../lib/security/canonical-json.ts"),
  import("../../lib/security/cryptographic-digest.ts"),
]);

const sensitiveMarker = "P90_PRIVATE_BLOCKED_PIPELINE_SENTINEL_91C47E2B";
const targetAddress = "0x0000000000000000000000000000000000000090";
const report = {
  schemaVersion: "controlled-report",
  reportId: "p90-controlled-blocked-report",
  generatedAt: FIXED_AT,
  locale: "en",
  target: { projectName: "Controlled P90", contractAddress: targetAddress, chain: "ethereum" },
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
  summary: {
    totalSections: 1,
    ready: 1,
    partial: 0,
    missing: 0,
    blocked: 0,
    manualReview: 0,
    totalEvidence: 12,
    totalMissing: 0,
    proPdfSections: 1,
    advancedActions: 1,
  },
  sections: [{
    id: "claim-ledger",
    tier: "basic",
    title: sensitiveMarker,
    state: "ready",
    evidenceCount: 12,
    missingCount: 0,
    customerSummary: sensitiveMarker,
    proPdfSummary: sensitiveMarker,
    advancedAction: sensitiveMarker,
    sourceFamilies: [sensitiveMarker],
  }],
  basicSections: [],
  proPdfSections: [],
  advancedQueue: [sensitiveMarker],
  topFindings: [{
    id: "p90-private-finding",
    title: sensitiveMarker,
    severity: "critical",
    publicLine: sensitiveMarker,
    proLine: sensitiveMarker,
    advancedAction: sensitiveMarker,
    sourceFamily: sensitiveMarker,
  }],
  proPdfLines: [sensitiveMarker],
  visualMergeContract: { purpose: sensitiveMarker, doNotBreak: [sensitiveMarker], uiSlots: [] },
};

const providerRuntime = {
  schemaVersion: "controlled-runtime",
  generatedAt: FIXED_AT,
  target: { chainId: "1", contractAddress: targetAddress },
  lanes: [],
  summary: { confirmed: 0, partial: 0, error: 0, skipped: 0 },
  confidence: { score: 100, label: "controlled" },
  rule: sensitiveMarker,
};

function run(requestedTier) {
  return buildPass4820AuditCustomerReportPipeline({
    report,
    providerRuntime,
    requestedTier,
    paymentVerified: requestedTier !== "basic",
    evidenceLedgerVerified: true,
    accountBindingHash: "a".repeat(40),
    entitlementId: `controlled-${requestedTier}`,
  });
}

const results = {
  basic: run("basic"),
  pro: run("pro"),
  advanced: run("advanced"),
};

for (const [tier, result] of Object.entries(results)) {
  const customer = result.customerReport;
  check(`${tier}_release_blocked`, result.releaseState === "blocked", result.releaseState);
  check(`${tier}_delivered_tier_null`, result.deliveredTier === null, result.deliveredTier);
  check(`${tier}_layout_absent`, result.customerReportPreviewLayout === null);
  check(`${tier}_blocked_customer_schema`, customer.schemaVersion === "velmere.p90.audit-customer-report-blocked.v1", customer.schemaVersion);
  check(`${tier}_risk_score_withheld`, customer.summary.riskScore === null, customer.summary);
  check(`${tier}_risk_labels_withheld`, customer.summary.riskLabel === "WITHHELD" && customer.summary.gradeLabel === "WITHHELD", customer.summary);
  check(`${tier}_analysis_collections_empty`, customer.pages.length === 0 && customer.decisionSections.length === 0 && customer.receipts.length === 0 && customer.providerConflicts.length === 0);
  check(`${tier}_visible_tier_null`, customer.deliveryPolicy.visibleTier === null && customer.deliveryPolicy.status === "blocked", customer.deliveryPolicy);
  check(`${tier}_private_marker_absent`, !JSON.stringify(result).includes(sensitiveMarker));
  check(`${tier}_internal_topology_absent`, !/strictReceipts|successfulLiveExecutions|independentProviderFamilies|providerResponseRoot|raw_response/i.test(JSON.stringify(customer)));

  const customerUnsigned = Object.fromEntries(Object.entries(customer).filter(([key]) => key !== "customerReportDigest"));
  check(`${tier}_customer_digest_valid`, customer.customerReportDigest === sha256Digest(canonicalJson(customerUnsigned)), customer.customerReportDigest);
  const pipelineUnsigned = Object.fromEntries(Object.entries(result).filter(([key]) => key !== "pipelineDigest"));
  check(`${tier}_pipeline_digest_valid`, result.pipelineDigest === sha256Digest(canonicalJson(pipelineUnsigned)), result.pipelineDigest);
}

const basicAgain = run("basic");
check("blocked_pipeline_repeatable", canonicalJson(basicAgain) === canonicalJson(results.basic));
const tampered = structuredClone(results.basic.customerReport);
tampered.summary.riskScore = 97;
const tamperedUnsigned = Object.fromEntries(Object.entries(tampered).filter(([key]) => key !== "customerReportDigest"));
check("risk_tamper_breaks_customer_digest", sha256Digest(canonicalJson(tamperedUnsigned)) !== results.basic.customerReport.customerReportDigest);
check("canonical_registry_grants_no_rights", results.basic.sourceTruth.providerRightsCommercialUseReady === false);

const failed = checks.filter((row) => row.status !== "PASS");
const receipt = {
  schemaVersion: "velmere.p90.audit-blocked-customer-payload-runtime.v1",
  generatedAt: FIXED_AT,
  status: failed.length ? "FAIL" : "PASS_BOUNDED_LOCAL_DEFENSE_IN_DEPTH",
  checks: { total: checks.length, passed: checks.length - failed.length, failed: failed.length, rows: checks },
  observedBoundary: {
    requestedTiers: ["basic", "pro", "advanced"],
    releaseState: "blocked",
    visibleTier: null,
    riskScore: null,
    providerDerivedAnalysisIncluded: false,
  },
  zeroFakeCredit: {
    realProviderNetwork: false,
    legalApproval: false,
    deployedRoute: false,
    customerFinal: "0/20",
    auditFinalPdf: "0/3",
  },
  truthBoundary: "This proves the local pipeline itself returns a dedicated customer-safe blocked payload when provider rights/currentness is not approved. It does not prove deployed HTTP, database, authorization, provider rights or production behavior.",
};
await mkdir(new URL("../../receipts/p90/", import.meta.url), { recursive: true });
await mkdir(new URL("../../artifacts/p90/", import.meta.url), { recursive: true });
await writeFile(new URL("../../receipts/p90/P90_AUDIT_BLOCKED_CUSTOMER_PAYLOAD_RUNTIME.json", import.meta.url), `${JSON.stringify(receipt, null, 2)}\n`);
await writeFile(new URL("../../artifacts/p90/P90_AUDIT_BLOCKED_CUSTOMER_PAYLOAD_RUNTIME.json", import.meta.url), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks, observedBoundary: receipt.observedBoundary }, null, 2));
if (failed.length) process.exitCode = 1;
