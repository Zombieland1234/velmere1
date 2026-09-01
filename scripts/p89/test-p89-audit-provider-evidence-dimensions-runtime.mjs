#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const FIXED_AT = "2026-08-20T18:00:00.000Z";
const RealDate = Date;
globalThis.Date = class FixedDate extends RealDate {
  constructor(...args) { super(...(args.length ? args : [FIXED_AT])); }
  static now() { return RealDate.parse(FIXED_AT); }
};

const checks = [];
function check(id, condition, detail = undefined) {
  const row = { id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) };
  checks.push(row);
  if (!condition) throw new Error(`P89 dimension runtime check failed: ${id}${detail === undefined ? "" : ` (${JSON.stringify(detail)})`}`);
}
function hex(value) { return createHash("sha256").update(String(value)).digest("hex"); }

const [dimensionsModule, readinessModule, tierModule, packetModule, confidenceModule] = await Promise.all([
  import("../../lib/security/audit-provider-evidence-dimensions.ts"),
  import("../../lib/security/audit-paid-evidence-readiness.ts"),
  import("../../lib/security/audit-tier-contract.ts"),
  import("../../lib/security/audit-evidence-receipt-packet.ts"),
  import("../../lib/security/audit-runtime-confidence.ts"),
]);

function lane({
  id,
  providerId = id,
  family = "contract_risk",
  upstream = `https://${providerId}.example`,
  correlation = `independent:${providerId}`,
  state = "confirmed",
  verification = "exact_response",
  matched = true,
  transport = "direct_api",
  independenceEligible = true,
  statusCode = 200,
  bodyBytes = 120,
  observedAt = FIXED_AT,
  bodySeed = `${id}:body`,
  requestSeed = `${id}:request`,
  tiers = ["basic", "pro", "advanced"],
  evidence = [`controlled evidence ${id}`],
} = {}) {
  return {
    id,
    label: id,
    provider: providerId,
    providerFamily: family,
    lineage: { providerId, upstreamRoot: upstream, correlationGroup: correlation, independenceEligible, transport },
    receipt: {
      observedAt,
      statusCode,
      contentType: "application/json",
      bodyBytes,
      bodyDigest: hex(bodySeed),
      requestUrlDigest: hex(requestSeed),
      relatedResponseDigests: [],
    },
    identity: {
      verification,
      requestedAddress: "0x0000000000000000000000000000000000000001",
      resolvedAddress: matched ? "0x0000000000000000000000000000000000000001" : "0x0000000000000000000000000000000000000002",
      requestedChainId: "1",
      resolvedChainId: "1",
      matched,
    },
    state,
    tier: tiers,
    claim: "controlled defensive provider fixture",
    evidence,
    missing: [],
    latencyMs: 12,
    timeoutMs: 1_000,
    noStore: true,
    boundary: "Local deterministic fixture only.",
  };
}

const strictFour = [
  lane({ id: "strict-explorer", providerId: "etherscan", family: "block_explorer" }),
  lane({ id: "strict-dex", providerId: "dexscreener", family: "dex_market" }),
  lane({ id: "strict-risk", providerId: "goplus", family: "contract_risk" }),
  lane({ id: "strict-sim", providerId: "honeypot", family: "contract_simulation" }),
];
const partialFifth = lane({
  id: "partial-market",
  providerId: "coingecko-search",
  family: "market_metadata",
  state: "partial",
  verification: "unverified",
  matched: false,
});
const proLanes = [...strictFour, partialFifth];
const proDimensions = dimensionsModule.buildAuditProviderEvidenceDimensions(proLanes);
check("dimension_schema_current", proDimensions.schemaVersion === dimensionsModule.PASS4809_AUDIT_PROVIDER_EVIDENCE_DIMENSIONS_ID);
check("pro_strict_receipts_four", proDimensions.strictReceiptCount === 4, proDimensions.strictReceiptCount);
check("pro_successful_live_five", proDimensions.successfulLiveLaneCount === 5, proDimensions.successfulLiveLaneCount);
check("partial_not_strict", !proDimensions.strictLanes.some((row) => row.id === partialFifth.id));
check("partial_is_live_execution", proDimensions.successfulLiveLanes.some((row) => row.id === partialFifth.id));
check("strict_families_four", proDimensions.independentProviderFamilies.length === 4, proDimensions.independentProviderFamilies);
check("strict_roots_four", proDimensions.independentUpstreamRoots.length === 4, proDimensions.independentUpstreamRoots);

const proReadiness = readinessModule.evaluateAuditPaidEvidenceReadiness({
  lanes: proLanes,
  tier: "pro",
  tierContract: tierModule.getAuditTierContract("pro"),
  evidenceRows: 6,
  authorityEvidence: null,
});
check("readiness_schema_v2", proReadiness.passId === "pass4819-audit-paid-evidence-readiness-v2");
check("pro_readiness_met_four_strict_five_live", proReadiness.met === true, proReadiness.blockers);
check("pro_readiness_reports_separate_dimensions", proReadiness.strictConfirmedLanes === 4 && proReadiness.successfulLiveProviderLanes === 5, proReadiness);
check("pro_no_strict_live_conflation_blocker", !proReadiness.blockers.some((row) => row.startsWith("strict_live_evidence:")), proReadiness.blockers);

const proWithoutPartial = readinessModule.evaluateAuditPaidEvidenceReadiness({
  lanes: strictFour,
  tier: "pro",
  tierContract: tierModule.getAuditTierContract("pro"),
  evidenceRows: 6,
  authorityEvidence: null,
});
check("pro_four_strict_four_live_blocked", proWithoutPartial.met === false, proWithoutPartial.blockers);
check("pro_live_blocker_precise", proWithoutPartial.blockers.includes("successful_live_provider_lanes:4/5"), proWithoutPartial.blockers);
check("pro_strict_threshold_still_met", !proWithoutPartial.blockers.some((row) => row.startsWith("verified_evidence_receipts:")), proWithoutPartial.blockers);

const advancedWithFour = readinessModule.evaluateAuditPaidEvidenceReadiness({
  lanes: proLanes,
  tier: "advanced",
  tierContract: tierModule.getAuditTierContract("advanced"),
  evidenceRows: 10,
  authorityEvidence: null,
});
check("advanced_four_strict_five_live_blocked", advancedWithFour.met === false, advancedWithFour.blockers);
check("advanced_strict_blocker_four_five", advancedWithFour.blockers.includes("verified_evidence_receipts:4/5"), advancedWithFour.blockers);
check("advanced_live_blocker_five_six", advancedWithFour.blockers.includes("successful_live_provider_lanes:5/6"), advancedWithFour.blockers);

const strictFifth = lane({ id: "strict-metadata", providerId: "sourcify", family: "market_metadata" });
const requestBoundSixth = lane({
  id: "request-bound-sixth",
  providerId: "defillama",
  family: "dex_market",
  state: "confirmed",
  verification: "request_bound",
  matched: false,
});
const advancedLanes = [...strictFour, strictFifth, requestBoundSixth];
const advancedReadiness = readinessModule.evaluateAuditPaidEvidenceReadiness({
  lanes: advancedLanes,
  tier: "advanced",
  tierContract: tierModule.getAuditTierContract("advanced"),
  evidenceRows: 10,
  authorityEvidence: null,
});
check("advanced_five_strict_six_live_met", advancedReadiness.met === true, advancedReadiness.blockers);
check("request_bound_sixth_live_not_strict", advancedReadiness.successfulLiveProviderLanes === 6 && advancedReadiness.strictConfirmedLanes === 5, advancedReadiness);

const duplicateAlias = lane({
  id: "alias-explorer-retry",
  providerId: "etherscan",
  family: "block_explorer",
  upstream: "https://alias.etherscan.example",
  correlation: "alias-other",
  bodySeed: "new-body-cannot-inflate",
  requestSeed: "new-url-cannot-inflate",
});
const duplicateDimensions = dimensionsModule.buildAuditProviderEvidenceDimensions([...proLanes, duplicateAlias]);
check("provider_alias_cannot_inflate_strict", duplicateDimensions.strictReceiptCount === 4, duplicateDimensions);
check("provider_alias_cannot_inflate_live", duplicateDimensions.successfulLiveLaneCount === 5, duplicateDimensions);
check("duplicate_strict_rejected_count", duplicateDimensions.duplicateStrictLanesRejected === 1, duplicateDimensions.duplicateStrictLanesRejected);
check("duplicate_live_rejected_count", duplicateDimensions.duplicateLiveLanesRejected === 1, duplicateDimensions.duplicateLiveLanesRejected);

const submittedLane = lane({
  id: "submitted-docs",
  providerId: "customer-submission",
  family: "submitted_sources",
  state: "partial",
  verification: "unverified",
  matched: false,
  transport: "submitted_source",
});
const humanLane = lane({
  id: "human-review",
  providerId: "human-review",
  family: "human_review",
  state: "blocked",
  verification: "unverified",
  matched: false,
  transport: "human_review",
});
const invalidReceipt = lane({
  id: "bad-receipt",
  providerId: "bad-receipt",
  family: "contract_risk",
  state: "partial",
  verification: "unverified",
  matched: false,
  statusCode: 500,
});
const excludedDimensions = dimensionsModule.buildAuditProviderEvidenceDimensions([...proLanes, submittedLane, humanLane, invalidReceipt]);
check("submitted_lane_never_live", !excludedDimensions.successfulLiveProviderIds.includes("customer-submission"));
check("human_lane_never_live", !excludedDimensions.successfulLiveProviderIds.includes("human-review"));
check("failed_receipt_never_live", !excludedDimensions.successfulLiveProviderIds.includes("bad-receipt"));
check("excluded_lanes_do_not_change_counts", excludedDimensions.strictReceiptCount === 4 && excludedDimensions.successfulLiveLaneCount === 5, excludedDimensions);

const packet = packetModule.buildAuditEvidenceReceiptPacket({
  providerRuntime: {
    passId: "audit-provider-runtime-client-p89-v2",
    generatedAt: FIXED_AT,
    locale: "en",
    target: { contractAddress: "0x0000000000000000000000000000000000000001", chain: "ethereum", chainId: "1" },
    rule: "fixture",
    runtimeMode: "fixture",
    lanes: [...proLanes, duplicateAlias],
    summary: {},
    basicRows: [], proRows: [], advancedRows: [], nextQueue: [],
  },
  publicSources: { receipts: [], summary: { aggregateRoot: `sha256:${hex("public")}` }, missing: [] },
  permissionParser: { signals: [] },
  liquidityHolderRisk: { signals: [] },
});
check("packet_schema_v2", packet.schemaVersion === "pass4809-audit-evidence-receipt-packet-v2");
check("packet_strict_deduped", packet.upstreamTruth.strictLaneCount === 4 && packet.counts.providerReceipts === 4, packet.upstreamTruth);
check("packet_live_deduped", packet.upstreamTruth.successfulLiveLaneCount === 5 && packet.counts.successfulLiveProviderExecutions === 5, packet.upstreamTruth);
check("packet_live_execution_root_bound", /^sha256:[a-f0-9]{64}$/.test(packet.roots.liveExecutionRoot ?? ""), packet.roots.liveExecutionRoot);
check("packet_duplicate_rejections_bound", packet.upstreamTruth.duplicateStrictLanesRejected === 1 && packet.upstreamTruth.duplicateLiveLanesRejected === 1, packet.upstreamTruth);

const confidence = confidenceModule.buildPass2573AuditRuntimeConfidenceReport({
  locale: "en",
  chain: "ethereum",
  contractAddress: "0x0000000000000000000000000000000000000001",
  providerRuntime: {
    passId: "audit-provider-runtime-client-p89-v2",
    generatedAt: FIXED_AT,
    locale: "en",
    target: { contractAddress: "0x0000000000000000000000000000000000000001", chain: "ethereum", chainId: "1" },
    rule: "fixture", runtimeMode: "fixture", lanes: proLanes, summary: {}, basicRows: [], proRows: [], advancedRows: [], nextQueue: [],
  },
});
check("confidence_engine_versioned", confidence.passId === "audit-runtime-confidence-engine-p89-v2");
check("confidence_live_uses_successful_execution", confidence.overall.runtimeLiveLanes === 5, confidence.overall);
check("confidence_dimension_bound", confidence.overall.providerEvidenceDimensionVersion === dimensionsModule.PASS4809_AUDIT_PROVIDER_EVIDENCE_DIMENSIONS_ID);
check("partial_lane_does_not_create_adverse_risk", confidence.overall.observedAdverseSignals === 0 && confidence.overall.riskScore === null, confidence.overall);

const failed = checks.filter((row) => row.status !== "PASS");
const receipt = {
  schemaVersion: "velmere.p89.audit-provider-evidence-dimensions-runtime.v1",
  generatedAt: FIXED_AT,
  status: failed.length ? "FAIL" : "PASS_BOUNDED_LOCAL_DETERMINISTIC_DIMENSION_SEPARATION",
  checks: { total: checks.length, passed: checks.length - failed.length, failed: failed.length, rows: checks },
  controlledResults: {
    pro: { strictReceipts: proReadiness.strictConfirmedLanes, successfulLiveProviders: proReadiness.successfulLiveProviderLanes, met: proReadiness.met },
    advancedCurrentArchitectureShape: { strictReceipts: advancedWithFour.strictConfirmedLanes, successfulLiveProviders: advancedWithFour.successfulLiveProviderLanes, met: advancedWithFour.met, blockers: advancedWithFour.blockers },
    advancedPositiveControl: { strictReceipts: advancedReadiness.strictConfirmedLanes, successfulLiveProviders: advancedReadiness.successfulLiveProviderLanes, met: advancedReadiness.met },
  },
  zeroFakeCredit: {
    realProviderExecution: false,
    providerRights: "WITHHELD",
    currentness: "WITHHELD",
    customerFinal: "0/20",
    auditFinalPdf: "0/3",
    saleEligible: "0/20",
  },
  truthBoundary: "Local deterministic fixtures prove dimensional separation, successful-receipt validation and one-canonical-provider anti-duplication only. They do not prove provider rights, independence in the real world, current data, factual accuracy, deployed runtime, Customer FINAL or sale eligibility.",
};
await mkdir(new URL("../../receipts/p89/", import.meta.url), { recursive: true });
await mkdir(new URL("../../artifacts/p89/", import.meta.url), { recursive: true });
const receiptUrl = new URL("../../receipts/p89/P89_AUDIT_PROVIDER_EVIDENCE_DIMENSIONS_RUNTIME.json", import.meta.url);
await writeFile(receiptUrl, `${JSON.stringify(receipt, null, 2)}\n`);
await writeFile(new URL("../../artifacts/p89/P89_AUDIT_PROVIDER_EVIDENCE_DIMENSIONS_RUNTIME.json", import.meta.url), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks, controlledResults: receipt.controlledResults }, null, 2));
if (failed.length) process.exitCode = 1;
