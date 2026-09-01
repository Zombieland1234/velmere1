#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const FIXED_AT = "2026-08-20T12:00:00.000Z";
const checks = [];
function check(id, condition, detail) {
  const row = { id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) };
  checks.push(row);
  if (!condition) throw new Error(`P90 rights/currentness runtime failed: ${id} ${JSON.stringify(detail ?? null)}`);
}
function hex(value) { return createHash("sha256").update(String(value)).digest("hex"); }

const [rights, readiness, dimensions, tiers, { canonicalJson }, { sha256Digest }] = await Promise.all([
  import("../../lib/security/audit-provider-rights-currentness.ts"),
  import("../../lib/security/audit-paid-evidence-readiness.ts"),
  import("../../lib/security/audit-provider-evidence-dimensions.ts"),
  import("../../lib/security/audit-tier-contract.ts"),
  import("../../lib/security/canonical-json.ts"),
  import("../../lib/security/cryptographic-digest.ts"),
]);
const digestBare = (value) => sha256Digest(typeof value === "string" ? value : canonicalJson(value)).replace(/^sha256:/, "");
const omit = (value, key) => Object.fromEntries(Object.entries(value).filter(([candidate]) => candidate !== key));

function lane({ providerId, family, upstream, strict = true, state = strict ? "confirmed" : "partial", sourceProvenance = "retrieval_snapshot", sourceObservedAt = FIXED_AT, bodySeed = providerId, liveExecutionEligible = true }) {
  return {
    id: `runtime-${providerId}`,
    label: providerId,
    provider: providerId,
    providerFamily: family,
    lineage: { providerId, upstreamRoot: upstream, correlationGroup: `independent:${providerId}`, independenceEligible: true, transport: "direct_api" },
    receipt: {
      observedAt: FIXED_AT,
      sourceObservedAt,
      sourceTimestampProvenance: sourceProvenance,
      statusCode: 200,
      contentType: "application/json",
      bodyBytes: 128,
      bodyDigest: hex(`${bodySeed}:body`),
      requestUrlDigest: hex(`${bodySeed}:request`),
      relatedResponseDigests: [],
    },
    identity: {
      verification: strict ? "exact_response" : "unverified",
      requestedAddress: "0x0000000000000000000000000000000000000001",
      resolvedAddress: strict ? "0x0000000000000000000000000000000000000001" : undefined,
      requestedChainId: "1",
      resolvedChainId: strict ? "1" : undefined,
      matched: strict,
    },
    state,
    liveExecutionEligible,
    tier: ["basic", "pro", "advanced"],
    claim: "controlled defensive rights/currentness fixture",
    evidence: [`evidence:${providerId}`],
    missing: [],
    latencyMs: 12,
    timeoutMs: 1000,
    noStore: true,
    boundary: "Local deterministic fixture only.",
  };
}

const lanes = [
  lane({ providerId: "etherscan-v2", family: "block_explorer", upstream: "etherscan" }),
  lane({ providerId: "dexscreener-api", family: "dex_market", upstream: "dexscreener", sourceProvenance: "provider" }),
  lane({ providerId: "goplus-token-security", family: "contract_risk", upstream: "gopluslabs" }),
  lane({ providerId: "honeypot-is", family: "contract_simulation", upstream: "honeypot-is" }),
  lane({ providerId: "coingecko-search", family: "market_metadata", upstream: "coingecko", strict: false }),
  lane({ providerId: "sourcify-v2", family: "source_verification", upstream: "sourcify" }),
];

check("current_dimension_schema_v2", dimensions.PASS4809_AUDIT_PROVIDER_EVIDENCE_DIMENSIONS_ID === "pass4830-audit-provider-evidence-dimensions-v2");
check("p89_dimension_schema_preserved", dimensions.P89_PASS4809_AUDIT_PROVIDER_EVIDENCE_DIMENSIONS_ID === "pass4809-audit-provider-evidence-dimensions-v1");
const wrongTargetHttp200 = lane({ providerId: "sourcify-v2", family: "source_verification", upstream: "sourcify", strict: false, state: "partial", liveExecutionEligible: false, bodySeed: "wrong-target-http-200" });
const wrongTargetDimensions = dimensions.buildAuditProviderEvidenceDimensions([wrongTargetHttp200]);
check("wrong_target_http_200_zero_live_credit", wrongTargetDimensions.successfulLiveLaneCount === 0 && wrongTargetDimensions.strictReceiptCount === 0, wrongTargetDimensions);
check("wrong_target_explicit_rejection_counted", wrongTargetDimensions.explicitLiveExecutionIneligibleLanesRejected === 1, wrongTargetDimensions);

function approveRegistry(source) {
  const registry = structuredClone(source);
  registry.revisionId = "P90_TEST_SYNTHETIC_APPROVED_NOT_CANONICAL";
  registry.reviewClass = "LOCAL_SYNTHETIC_TEST_ONLY";
  registry.truthBoundary = "Synthetic positive-control registry; not a provider permission or legal conclusion.";
  registry.rawTermsDocumentHashAvailable = true;
  registry.globalState = { ...registry.globalState, customerDeliveryApprovedProviders: registry.providers.length, paidTierApprovedProviders: registry.providers.length, pdfExportApprovedProviders: registry.providers.length, derivedRetentionApprovedProviders: registry.providers.length, saleEnabled: false, live: false };
  for (const sourceRow of Object.values(registry.sources)) {
    sourceRow.rawDocumentSha256 = hex(`synthetic:${sourceRow.sourceId}`);
    sourceRow.observationSha256 = digestBare(omit(sourceRow, "observationSha256"));
  }
  for (const provider of registry.providers) {
    provider.legalApprovalStatus = "APPROVED";
    provider.requiredPlanOrConsent = "SYNTHETIC_TEST_ONLY";
    provider.blockers = [];
    for (const purpose of Object.keys(provider.rights)) provider.rights[purpose] = true;
    for (const field of provider.fields) field.customerCurrentnessEligible = true;
    provider.decisionSha256 = digestBare(omit(provider, "decisionSha256"));
  }
  registry.registrySha256 = digestBare(omit(registry, "registrySha256"));
  return registry;
}

const canonical = rights.getCanonicalAuditProviderRightsRegistry();
const canonicalProof = rights.verifyAuditProviderRightsRegistry(canonical, FIXED_AT);
check("canonical_registry_integrity", canonicalProof.valid, canonicalProof.blockers);
check("canonical_registry_has_six_provider_decisions", canonical.providers.length === 6);
check("canonical_registry_grants_zero_customer_approvals", canonical.providers.every((provider) => provider.legalApprovalStatus !== "APPROVED" && Object.entries(provider.rights).filter(([key]) => key !== "internalDiagnosticAllowed").every(([, value]) => value === false)));

const proCanonical = readiness.evaluateAuditPaidEvidenceReadiness({ lanes: lanes.slice(0, 5), tier: "pro", tierContract: tiers.getAuditTierContract("pro"), evidenceRows: 6, authorityEvidence: null, rightsRegistry: canonical, evaluatedAt: FIXED_AT });
check("pro_technical_shape_passes_4_strict_5_live", proCanonical.technicalMet === true, proCanonical.technicalBlockers);
check("pro_canonical_commercial_blocked", proCanonical.commercialMet === false, proCanonical.commercialBlockers);
check("pro_no_rights_credit", proCanonical.rightsCurrentness.rightsCurrentProviderIds.length === 0);

const approved = approveRegistry(canonical);
const approvedProof = rights.verifyAuditProviderRightsRegistry(approved, FIXED_AT);
check("synthetic_registry_integrity", approvedProof.valid, approvedProof.blockers);
const proApproved = readiness.evaluateAuditPaidEvidenceReadiness({ lanes: lanes.slice(0, 5), tier: "pro", tierContract: tiers.getAuditTierContract("pro"), evidenceRows: 6, authorityEvidence: null, rightsRegistry: approved, evaluatedAt: FIXED_AT });
check("synthetic_pro_technical_met", proApproved.technicalMet === true, proApproved.technicalBlockers);
check("synthetic_pro_commercial_met", proApproved.commercialMet === true, proApproved.commercialBlockers);
check("synthetic_pro_counts_separate", proApproved.strictConfirmedLanes === 4 && proApproved.successfulLiveProviderLanes === 5);
check("synthetic_pro_rights_counts", proApproved.rightsCurrentness.rightsCurrentStrictReceiptCount === 4 && proApproved.rightsCurrentness.rightsCurrentSuccessfulLiveLaneCount === 5, proApproved.rightsCurrentness);

const advancedApproved = readiness.evaluateAuditPaidEvidenceReadiness({ lanes, tier: "advanced", tierContract: tiers.getAuditTierContract("advanced"), evidenceRows: 10, authorityEvidence: null, rightsRegistry: approved, evaluatedAt: FIXED_AT });
check("synthetic_advanced_5_strict_6_live", advancedApproved.strictConfirmedLanes === 5 && advancedApproved.successfulLiveProviderLanes === 6, advancedApproved);
check("synthetic_advanced_commercial_met", advancedApproved.commercialMet === true, advancedApproved.commercialBlockers);
check("sourcify_independent_family_present", advancedApproved.rightsCurrentness.rightsCurrentProviderFamilies.includes("source_verification"));

const duplicate = lane({ providerId: "etherscan-v2", family: "block_explorer", upstream: "etherscan-mirror", bodySeed: "duplicate" });
const duplicateReadiness = readiness.evaluateAuditPaidEvidenceReadiness({ lanes: [...lanes, duplicate], tier: "advanced", tierContract: tiers.getAuditTierContract("advanced"), evidenceRows: 10, authorityEvidence: null, rightsRegistry: approved, evaluatedAt: FIXED_AT });
check("duplicate_provider_does_not_inflate_strict", duplicateReadiness.strictConfirmedLanes === 5, duplicateReadiness.strictConfirmedLanes);
check("duplicate_provider_does_not_inflate_live", duplicateReadiness.successfulLiveProviderLanes === 6, duplicateReadiness.successfulLiveProviderLanes);
check("duplicate_provider_blocks_commercial_readiness", duplicateReadiness.commercialMet === false && duplicateReadiness.rightsCurrentness.duplicateSuccessfulProviderIds.includes("etherscan-v2"), duplicateReadiness.commercialBlockers);

const expired = readiness.evaluateAuditPaidEvidenceReadiness({ lanes, tier: "advanced", tierContract: tiers.getAuditTierContract("advanced"), evidenceRows: 10, authorityEvidence: null, rightsRegistry: approved, evaluatedAt: "2026-09-04T00:00:00.000Z" });
check("expired_registry_fails_closed", expired.commercialMet === false && expired.commercialBlockers.some((row) => /currentness|rights/i.test(row)), expired.commercialBlockers);
const staleLanes = lanes.map((item, index) => index === 0 ? lane({ providerId: "etherscan-v2", family: "block_explorer", upstream: "etherscan", sourceObservedAt: "2026-08-18T00:00:00.000Z" }) : item);
const stale = readiness.evaluateAuditPaidEvidenceReadiness({ lanes: staleLanes, tier: "advanced", tierContract: tiers.getAuditTierContract("advanced"), evidenceRows: 10, authorityEvidence: null, rightsRegistry: approved, evaluatedAt: FIXED_AT });
check("stale_source_timestamp_fails_closed", stale.commercialMet === false && stale.rightsCurrentness.blockers.some((row) => /stale|currentness/i.test(row)), stale.rightsCurrentness.blockers);
const futureLanes = lanes.map((item, index) => index === 0 ? lane({ providerId: "etherscan-v2", family: "block_explorer", upstream: "etherscan", sourceObservedAt: "2026-08-20T13:00:00.000Z" }) : item);
const future = readiness.evaluateAuditPaidEvidenceReadiness({ lanes: futureLanes, tier: "advanced", tierContract: tiers.getAuditTierContract("advanced"), evidenceRows: 10, authorityEvidence: null, rightsRegistry: approved, evaluatedAt: FIXED_AT });
check("future_source_timestamp_fails_closed", future.commercialMet === false && future.rightsCurrentness.blockers.some((row) => /future|timestamp/i.test(row)), future.rightsCurrentness.blockers);
const unknown = readiness.evaluateAuditPaidEvidenceReadiness({ lanes: [...lanes.slice(0, 5), lane({ providerId: "unknown-provider", family: "source_verification", upstream: "unknown" })], tier: "advanced", tierContract: tiers.getAuditTierContract("advanced"), evidenceRows: 10, authorityEvidence: null, rightsRegistry: approved, evaluatedAt: FIXED_AT });
check("unknown_provider_rights_fail_closed", unknown.commercialMet === false && unknown.rightsCurrentness.blockers.some((row) => /record_missing/i.test(row)), unknown.rightsCurrentness.blockers);

const tampered = structuredClone(approved);
tampered.providers[0].rights.customerDerivedDisplayAllowed = false;
const tamperedProof = rights.verifyAuditProviderRightsRegistry(tampered, FIXED_AT);
check("provider_tamper_breaks_registry", tamperedProof.valid === false && tamperedProof.blockers.some((row) => row.includes("provider_decision_digest_invalid")), tamperedProof.blockers);

const canonicalSummary = rights.buildCustomerSafeAuditProviderRightsSummary(proCanonical.rightsCurrentness);
const summaryText = JSON.stringify(canonicalSummary);
check("customer_summary_has_digest", /^sha256:[a-f0-9]{64}$/.test(canonicalSummary.summaryDigest));
check("customer_summary_excludes_urls", !/https?:\/\//i.test(summaryText));
check("customer_summary_excludes_provider_ids", !canonical.providers.some((provider) => summaryText.includes(provider.providerId)));
check("customer_summary_excludes_raw_terms", !/rawDocument|facts|sourceIds|decisionSha/i.test(summaryText));
const publicAvailability = rights.buildPublicAuditProviderAvailability(canonicalSummary);
const availabilityText = JSON.stringify(publicAvailability);
check("public_availability_closed_schema", publicAvailability.schemaVersion === rights.PASS4830_AUDIT_PROVIDER_PUBLIC_AVAILABILITY_SCHEMA && publicAvailability.status === "withheld", publicAvailability);
check("public_availability_has_no_topology_counts", !/successfulTechnicalProviders|technicalStrictReceipts|technicalLiveExecutions|rightsCurrentProviders|blockedFields/i.test(availabilityText), availabilityText);
check("public_availability_excludes_provider_identity_and_urls", !/https?:\/\//i.test(availabilityText) && !canonical.providers.some((provider) => availabilityText.includes(provider.providerId)), availabilityText);
check("public_availability_digest_bound", /^sha256:[a-f0-9]{64}$/.test(publicAvailability.availabilityDigest));
const badRawHashFlag = structuredClone(approved);
badRawHashFlag.rawTermsDocumentHashAvailable = "yes";
badRawHashFlag.registrySha256 = digestBare(omit(badRawHashFlag, "registrySha256"));
const badRawHashFlagProof = rights.verifyAuditProviderRightsRegistry(badRawHashFlag, FIXED_AT);
check("raw_terms_hash_availability_type_fail_closed", badRawHashFlagProof.valid === false && badRawHashFlagProof.blockers.includes("raw_terms_document_hash_availability_invalid"), badRawHashFlagProof.blockers);

const failed = checks.filter((row) => row.status !== "PASS");
const receipt = {
  schemaVersion: "velmere.p90.audit-provider-rights-currentness-runtime.v2",
  generatedAt: FIXED_AT,
  status: failed.length ? "FAIL" : "PASS_BOUNDED_LOCAL_FAIL_CLOSED_RIGHTS_CURRENTNESS",
  checks: { total: checks.length, passed: checks.length - failed.length, failed: failed.length, rows: checks },
  canonical: { registrySha256: canonical.registrySha256, providerDecisions: canonical.providers.length, customerApprovedProviders: 0, proTechnicalMet: proCanonical.technicalMet, proCommercialMet: proCanonical.commercialMet },
  syntheticPositiveControl: { explicitlyNonCanonical: true, proCommercialMet: proApproved.commercialMet, advancedCommercialMet: advancedApproved.commercialMet },
  zeroFakeCredit: { realProviderNetworkExecuted: false, legalApprovalGranted: false, rightsNumerator: "2/203 inherited only", customerFinal: "0/20", auditFinalPdf: "0/3", saleEligible: "0/20" },
  truthBoundary: "Canonical P90 rights decisions remain NOT_APPROVED and grant zero new customer/commercial rights. The synthetic approved registry only proves fail-closed arithmetic and cannot be used as permission or product credit.",
};
await mkdir(new URL("../../receipts/p90/", import.meta.url), { recursive: true });
await mkdir(new URL("../../artifacts/p90/", import.meta.url), { recursive: true });
await writeFile(new URL("../../receipts/p90/P90_AUDIT_PROVIDER_RIGHTS_CURRENTNESS_RUNTIME.json", import.meta.url), `${JSON.stringify(receipt, null, 2)}\n`);
await writeFile(new URL("../../artifacts/p90/P90_AUDIT_PROVIDER_RIGHTS_CURRENTNESS_RUNTIME.json", import.meta.url), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks, canonical: receipt.canonical, syntheticPositiveControl: receipt.syntheticPositiveControl }, null, 2));
if (failed.length) process.exitCode = 1;
