#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";

const checks = [];
function check(id, condition, detail = undefined) {
  const row = { id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) };
  checks.push(row);
  if (!condition) throw new Error(`P98 paid-tier exact-delivery runtime failed: ${id} ${JSON.stringify(detail ?? null)}`);
}
function clone(value) { return structuredClone(value); }
async function rejects(id, fn, expected) {
  let caught = null;
  try { await fn(); } catch (error) { caught = error; }
  const message = caught instanceof Error ? caught.message : String(caught ?? "");
  check(id, caught !== null && (!expected || message.includes(expected)), { message });
}

const policy = await import("../../lib/market-integrity/customer-paid-tier-exact-delivery-policy.ts");
const access = await import("../../lib/market-integrity/top1-entitlement-report-access.ts");
const tierValue = await import("../../lib/market-integrity/customer-report-tier-value.ts");
const commercial = await import("../../lib/market-integrity/worldclass-report-commercial-policy.ts");
const canonical = await import("../../lib/security/canonical-json.ts");
const crypto = await import("../../lib/security/cryptographic-digest.ts");

const policyArgs = {
  basic: {
    requestedTier: "Basic", analyzedTier: "Basic", payloadTier: "Basic",
    deliveryPolicy: { visibleTier: "Basic", status: "ready_basic", paidEvidenceAllowed: false },
  },
  pro: {
    requestedTier: "Pro", analyzedTier: "Pro", payloadTier: "Pro",
    deliveryPolicy: { visibleTier: "Pro", status: "ready_paid", paidEvidenceAllowed: true },
  },
  advanced: {
    requestedTier: "Advanced", analyzedTier: "Advanced", payloadTier: "Advanced",
    deliveryPolicy: { visibleTier: "Advanced", status: "ready_paid", paidEvidenceAllowed: true },
  },
};
const basic = policy.buildP98CustomerPaidTierExactDeliveryDecision(policyArgs.basic);
const pro = policy.buildP98CustomerPaidTierExactDeliveryDecision(policyArgs.pro);
const advanced = policy.buildP98CustomerPaidTierExactDeliveryDecision(policyArgs.advanced);
check("basic_exact_preview_verifies", policy.verifyP98CustomerPaidTierExactDeliveryDecision(basic));
check("basic_is_bounded_preview", basic.state === "BASIC_PREVIEW_ALLOWED" && basic.artifactCreationAllowed === true && basic.accountArtifactAllowed === false);
check("pro_exact_paid_verifies", policy.verifyP98CustomerPaidTierExactDeliveryDecision(pro));
check("pro_exact_paid_allowed", pro.state === "EXACT_PAID_TIER_ALLOWED" && pro.exactTierMatch && pro.accountArtifactAllowed && pro.pdfTokenAllowed);
check("advanced_exact_paid_verifies", policy.verifyP98CustomerPaidTierExactDeliveryDecision(advanced));
check("advanced_exact_paid_allowed_without_human_gate", advanced.state === "EXACT_PAID_TIER_ALLOWED" && advanced.humanReviewRequired === false);

const advancedAnalyzedAsPro = policy.buildP98CustomerPaidTierExactDeliveryDecision({
  requestedTier: "Advanced", analyzedTier: "Pro", payloadTier: "Pro",
  deliveryPolicy: { visibleTier: "Pro", status: "ready_paid", paidEvidenceAllowed: true },
});
check("advanced_analyzed_as_pro_withheld", advancedAnalyzedAsPro.state === "REQUESTED_TIER_WITHHELD");
check("advanced_analyzed_as_pro_detects_implicit_downgrade", advancedAnalyzedAsPro.implicitDowngradeDetected && advancedAnalyzedAsPro.lowerAvailableTier === "Pro");
check("withheld_creates_no_artifact_authority", !advancedAnalyzedAsPro.artifactCreationAllowed && !advancedAnalyzedAsPro.pdfTokenAllowed && !advancedAnalyzedAsPro.accountArtifactAllowed);
check("lower_tier_needs_separate_acceptance", advancedAnalyzedAsPro.explicitDowngradeAcceptanceRequired && advancedAnalyzedAsPro.silentDowngradeAllowed === false);

const payloadMismatch = policy.buildP98CustomerPaidTierExactDeliveryDecision({
  requestedTier: "Advanced", analyzedTier: "Advanced", payloadTier: "Pro",
  deliveryPolicy: { visibleTier: "Advanced", status: "ready_paid", paidEvidenceAllowed: true },
});
check("payload_tier_mismatch_withheld", payloadMismatch.state === "REQUESTED_TIER_WITHHELD" && payloadMismatch.customerReasonCode === "analysis_tier_mismatch");
check("payload_tier_is_bound_in_receipt", payloadMismatch.payloadTier === "Pro" && policy.verifyP98CustomerPaidTierExactDeliveryDecision(payloadMismatch));

const visibleMismatch = policy.buildP98CustomerPaidTierExactDeliveryDecision({
  requestedTier: "Advanced", analyzedTier: "Advanced", payloadTier: "Advanced",
  deliveryPolicy: { visibleTier: "Pro", status: "redacted_to_basic", paidEvidenceAllowed: false },
});
check("visible_tier_mismatch_withheld", visibleMismatch.state === "REQUESTED_TIER_WITHHELD" && visibleMismatch.lowerAvailableTier === "Pro");

const missingPayload = policy.buildP98CustomerPaidTierExactDeliveryDecision({
  requestedTier: "Pro", analyzedTier: "Pro", payloadTier: null,
  deliveryPolicy: { visibleTier: null, status: "unavailable", paidEvidenceAllowed: false },
});
check("missing_customer_payload_withheld", missingPayload.state === "REQUESTED_TIER_WITHHELD" && missingPayload.customerReasonCode === "customer_payload_unavailable");

const withheld = policy.toP98CustomerPaidTierWithheldPayload(advancedAnalyzedAsPro);
const withheldKeys = Object.keys(withheld).sort();
check("withheld_projection_closed_shape", JSON.stringify(withheldKeys) === JSON.stringify([
  "availability", "customerAction", "deliveredTier", "error", "explicitDowngradeRequired", "humanReviewRequired",
  "lowerAvailableTier", "mode", "ok", "requestedTier", "retryable", "silentDowngradeAllowed",
].sort()), withheldKeys);
check("withheld_projection_has_no_artifact_fields", !withheldKeys.some((key) => /report|payload|token|artifact|provider|receipt|topology/i.test(key)), withheldKeys);
check("withheld_projection_has_no_delivered_tier", withheld.deliveredTier === null && withheld.availability === "WITHHELD");

const allowedProjection = policy.toP98CustomerPaidTierDeliveryProjection(pro);
check("allowed_projection_closed_shape", JSON.stringify(Object.keys(allowedProjection).sort()) === JSON.stringify([
  "decisionDigest", "deliveredTier", "exactTierMatch", "humanReviewRequired", "requestedTier", "schemaVersion", "silentDowngradeAllowed", "state",
].sort()));
check("allowed_projection_exact_tier", allowedProjection.requestedTier === "Pro" && allowedProjection.deliveredTier === "Pro" && allowedProjection.exactTierMatch === true);
check("allowed_projection_hides_internal_inputs", !("analyzedTier" in allowedProjection) && !("payloadTier" in allowedProjection) && !("deliveryPolicyStatus" in allowedProjection));
await rejects("withheld_cannot_be_projected_as_delivery", () => policy.toP98CustomerPaidTierDeliveryProjection(advancedAnalyzedAsPro), "requires_exact_allowed_tier");
await rejects("allowed_cannot_be_projected_as_withheld", () => policy.toP98CustomerPaidTierWithheldPayload(pro), "requires_withheld_decision");

function recomputeDigest(value) {
  const unsigned = { ...value };
  delete unsigned.decisionDigest;
  value.decisionDigest = crypto.sha256Digest(canonical.canonicalJson(unsigned));
}
const mutations = [
  ["requested_tier", (v) => { v.requestedTier = "Pro"; }],
  ["analyzed_tier", (v) => { v.analyzedTier = "Pro"; }],
  ["payload_tier", (v) => { v.payloadTier = "Pro"; }],
  ["visible_tier", (v) => { v.visibleTier = "Pro"; }],
  ["delivery_status", (v) => { v.deliveryPolicyStatus = "unavailable"; }],
  ["paid_evidence_flag", (v) => { v.deliveryPolicyPaidEvidenceAllowed = false; }],
  ["state", (v) => { v.state = "REQUESTED_TIER_WITHHELD"; }],
  ["exact_match", (v) => { v.exactTierMatch = false; }],
  ["implicit_downgrade", (v) => { v.implicitDowngradeDetected = true; }],
  ["lower_available", (v) => { v.lowerAvailableTier = "Pro"; }],
  ["artifact_authority", (v) => { v.artifactCreationAllowed = false; }],
  ["pdf_token_authority", (v) => { v.pdfTokenAllowed = false; }],
  ["account_artifact_authority", (v) => { v.accountArtifactAllowed = false; }],
  ["explicit_downgrade", (v) => { v.explicitDowngradeAcceptanceRequired = true; }],
  ["silent_downgrade", (v) => { v.silentDowngradeAllowed = true; }],
  ["human_review", (v) => { v.humanReviewRequired = true; }],
  ["reason_code", (v) => { v.customerReasonCode = "requested_tier_not_ready"; }],
  ["safe_rule", (v) => { v.customerSafeRule = "forged"; }],
];
for (const [name, mutate] of mutations) {
  const value = clone(advanced);
  mutate(value);
  recomputeDigest(value);
  check(`self_consistent_forgery_rejected_${name}`, policy.verifyP98CustomerPaidTierExactDeliveryDecision(value) === false);
}
const extra = clone(pro); extra.extra = true; recomputeDigest(extra);
check("extra_field_rejected", policy.verifyP98CustomerPaidTierExactDeliveryDecision(extra) === false);
const badDigest = clone(pro); badDigest.decisionDigest = `sha256:${"0".repeat(64)}`;
check("bad_digest_rejected", policy.verifyP98CustomerPaidTierExactDeliveryDecision(badDigest) === false);

const accessArgs = {
  tier: "Advanced",
  accountId: "acct_abcdefgh",
  serverReceiptId: "vlm_receipt_abcdefghijklmnop",
  reportToken: "vlm_rpt_abcdefghijklmnopqrstuvwx",
  payloadHash: "a".repeat(64),
  manualReviewReceiptId: null,
  manualReviewRequired: false,
  advancedDeliveryMode: "automated",
  verification: {
    accountBound: true, serverReceiptVerified: true, reportTokenVerified: true, payloadHashBound: true,
    manualReviewVerified: false, source: "server_entitlement",
  },
};
const advancedAccess = access.buildReportAccessDecision(accessArgs);
check("automated_advanced_entitlement_ready", advancedAccess.paidEvidenceAllowed && advancedAccess.status === "paid_evidence_ready");
check("automated_advanced_manual_review_not_required", advancedAccess.requiredSignals.find((entry) => entry.id === "manual_review")?.state === "not_required");
const missingPayloadHashAccess = access.buildReportAccessDecision({ ...accessArgs, payloadHash: null });
check("automated_advanced_missing_payload_hash_locked", !missingPayloadHashAccess.paidEvidenceAllowed && missingPayloadHashAccess.status === "locked_paid_evidence");
const boundary = access.buildPass2812PaymentEntitlementBoundaryV2({ advancedDeliveryMode: "automated" });
check("automated_boundary_rejects_pro_fallback", boundary.advancedBoundary.includes("exact automated evidence") && boundary.acceptanceGates.some((row) => row.includes("Pro fallback")));
check("automated_boundary_optional_human_qa_no_credit", boundary.advancedBoundary.includes("Optional human QA earns no entitlement"));

const sections = [
  { minimumTier: "Basic", state: "ready", evidence: ["b1", "b2"], actions: ["ba"] },
  { minimumTier: "Pro", state: "ready", evidence: ["p1", "p2"], actions: ["pa1"] },
  { minimumTier: "Pro", state: "watch", evidence: ["p3", "p4"], actions: ["pa2"] },
  { minimumTier: "Advanced", state: "ready", evidence: ["a1", "a2", "a3"], actions: ["aa1", "aa2"] },
];
const tierGateArgs = {
  requestedTier: "Advanced", surface: "real_markets", coverageOverall: 90,
  independentContentBoundUpstreams: 3, contentBoundReceiptCount: 5,
  decisionSections: sections,
  executedTests: ["chart_lifecycle", "evidence_ledger", "advanced_automation", "stress_scenarios"],
  manualReviewVerified: false, monitoringConfigured: false,
  advancedDeliveryMode: "automated", advancedAutomationVerified: true,
};
const tierGate = tierValue.buildCustomerReportTierValueGate(tierGateArgs);
check("advanced_automated_value_positive_control", tierGate.readiness.Advanced === true && tierGate.highestValueTier === "Advanced", tierGate);
check("advanced_value_not_bought_by_human_review", tierGate.blockers.Advanced.every((row) => !row.includes("manual_review")));
const noAutomation = tierValue.buildCustomerReportTierValueGate({ ...tierGateArgs, advancedAutomationVerified: false });
check("advanced_missing_automation_withheld", !noAutomation.readiness.Advanced && noAutomation.blockers.Advanced.includes("advanced_automation_not_verified"));
const noStress = tierValue.buildCustomerReportTierValueGate({ ...tierGateArgs, executedTests: ["chart_lifecycle", "evidence_ledger", "advanced_automation"] });
check("advanced_missing_stress_withheld", !noStress.readiness.Advanced && noStress.blockers.Advanced.includes("advanced_stress_scenarios_not_executed"));
const noLedger = tierValue.buildCustomerReportTierValueGate({ ...tierGateArgs, executedTests: ["chart_lifecycle", "advanced_automation", "stress_scenarios"] });
check("advanced_missing_evidence_ledger_withheld", !noLedger.readiness.Advanced && noLedger.blockers.Advanced.includes("advanced_evidence_ledger_not_verified"));

const coverage = commercial.buildReportCoverageScore({
  surface: "real_markets", input: { data: 100, provider: 100, historical: 100, evidence: 100 }, missingCriticalEvidence: 0,
});
const advancedCommercial = commercial.buildReportCommercialDecision({
  tier: "Advanced", coverage, sourceFamilyCount: 4, providerConflictCount: 0,
  stressTestExecuted: true, evidenceLedgerPresent: true, manualReviewVerified: false,
  advancedDeliveryMode: "automated", advancedAutomationVerified: true,
});
check("advanced_remains_not_for_sale", advancedCommercial.status === "unavailable" && advancedCommercial.paidDeliveryAllowed === false);
check("advanced_commercial_has_no_manual_gate", advancedCommercial.blockedReasons.every((row) => !row.toLowerCase().includes("manual-review receipt")));
check("advanced_commercial_no_silent_downgrade", advancedCommercial.customerAction.includes("Do not offer checkout, silently downgrade or create a paid artifact"));

const receipt = {
  schemaVersion: "velmere.p98.paid-tier-exact-delivery-runtime.v1",
  generatedAt: "2026-08-21T12:00:00.000Z",
  status: "PASS_BOUNDED",
  checks: { total: checks.length, passed: checks.filter((row) => row.status === "PASS").length, failed: checks.filter((row) => row.status === "FAIL").length, rows: checks },
  zeroFakeCredit: {
    customerFinal: "0/20", paidValue: "0/10", saleEligible: "0/20", realEntitlement: false,
    realProviderEvidence: false, realDatabase: false, deployedHttp: false, exactWindows: false,
  },
  truthBoundary: "This runtime proves deterministic exact-tier decision semantics, mutation resistance, customer-safe withheld/delivery projections, automated Advanced entitlement semantics and bounded value/commercial controls on local source bytes. It does not prove real entitlement, provider evidence, paid value, sale eligibility, deployed delivery or Customer FINAL.",
};
for (const rel of ["receipts/p98/P98_PAID_TIER_EXACT_DELIVERY_RUNTIME.json", "artifacts/p98/P98_PAID_TIER_EXACT_DELIVERY_RUNTIME.json"]) {
  const target = new URL(`../../${rel}`, import.meta.url);
  await mkdir(new URL(".", target), { recursive: true });
  await writeFile(target, `${JSON.stringify(receipt, null, 2)}\n`);
}
console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks }));
if (receipt.checks.failed) process.exitCode = 1;
