import { canonicalJson } from "./canonical-json";
import { sha256Digest } from "./cryptographic-digest";
import {
  buildCanonicalAuditReport,
  type AuditTier,
  type CanonicalAuditReportModel,
  type FullAuditReportInput,
} from "./audit-canonical-report";
import { signReportWithPki } from "./audit-pki-signature";
import { resolveRealMarketInstrumentMaster } from "../market-integrity/real-market-instrument-master";

export interface R10ExactScopeEvidence {
  auditId: string;
  targetIdentifier: string;
  observedAt: string;
  evidenceCoveragePct: number;
  contentVerificationStatus: "VERIFIED" | "PARTIALLY_VERIFIED";
  releaseDecision: "PASS" | "CONDITIONAL" | "BLOCKED";
  riskScore: number | null;
  confidenceScore: number;
  auditQualityScore: number;
  provenanceHashSha256?: string | null;
  providerIdentity?: string | null;
  freshnessSeconds?: number | null;
}

export type R10CanonicalAuditReport = Omit<CanonicalAuditReportModel, "verdict"> & {
  verdict: Omit<CanonicalAuditReportModel["verdict"], "riskScore" | "auditQualityScore"> & {
    riskScore: number | null;
    auditQualityScore: number;
  };
};

function cleanSha256(value: string | null | undefined): string | null {
  if (!value) return null;
  const clean = value.replace(/^sha256:/, "").toLowerCase();
  return /^[a-f0-9]{64}$/.test(clean) ? clean : null;
}

function evidenceMatchesReport(report: CanonicalAuditReportModel, evidence: R10ExactScopeEvidence | undefined) {
  if (!evidence) return false;
  if (evidence.auditId !== report.reportId) return false;
  const expected = report.target.contractAddress.trim().toLowerCase();
  const actual = evidence.targetIdentifier.trim().toLowerCase();
  return expected === actual;
}

function applyMarketIdentity(report: CanonicalAuditReportModel) {
  if (report.applicationSurface !== "real-markets") return;
  const master = resolveRealMarketInstrumentMaster({
    symbol: report.target.tokenSymbol,
    identifier: report.target.contractAddress,
  });
  if (!master) throw new Error(`r10_real_market_master_missing:${report.target.contractAddress}`);

  const identity = master.identity;
  report.target.contractName = master.displayName;
  report.target.tokenSymbol = identity.canonicalSymbol;
  report.target.network = identity.venue || report.target.network;
  report.target.chainId = identity.mic ? `MIC:${identity.mic}` : report.target.chainId;

  if (!report.auditScopeManifest) throw new Error(`r10_market_scope_manifest_missing:${report.reportId}`);
  report.auditScopeManifest.targetSpec.network = identity.venue || report.auditScopeManifest.targetSpec.network;
  report.auditScopeManifest.targetSpec.chainId = identity.mic ? `MIC:${identity.mic}` : report.auditScopeManifest.targetSpec.chainId;
  report.auditScopeManifest.marketSpec = {
    ...(report.auditScopeManifest.marketSpec ?? {
      exchangeMic: identity.mic ?? "UNKNOWN",
      tickerSymbol: identity.canonicalSymbol,
      assetClass: identity.assetClass,
      pricingSource: "UNVERIFIED_REPORT_INPUT",
      volatilityModel: "NOT_VERIFIED",
      regulatoryJurisdiction: identity.jurisdiction.join(" / "),
    }),
    identifierType: identity.instrumentType === "future" ? "FUTURES_SERIES" : identity.instrumentType === "index" ? "INDEX_CODE" : "TICKER",
    identifierValue: identity.providerSymbol,
    source: identity.dataProvider,
    exchangeMic: identity.mic ?? "UNKNOWN",
    tickerSymbol: identity.canonicalSymbol,
    assetClass: identity.assetClass,
    pricingSource: identity.dataProvider,
    volatilityModel: report.auditScopeManifest.marketSpec?.volatilityModel ?? "NOT_VERIFIED",
    regulatoryJurisdiction: identity.jurisdiction.join(" / "),
    instrumentId: identity.instrumentId,
    instrumentType: identity.instrumentType,
    economicExposure: identity.economicExposure,
    underlying: identity.underlying,
    canonicalSymbol: identity.canonicalSymbol,
    providerSymbol: identity.providerSymbol,
    venue: identity.venue,
    baseCurrency: identity.baseCurrency,
    quoteCurrency: identity.quoteCurrency,
    contractMonth: identity.contractMonth,
    expiry: identity.expiry,
    settlementType: identity.settlementType,
    priceType: identity.priceType,
    timezone: identity.timezone,
    marketCalendar: identity.marketCalendar,
    jurisdiction: identity.jurisdiction,
    dataProvider: identity.dataProvider,
    asOf: identity.asOf,
    freshnessSeconds: identity.freshnessSeconds,
    rollMethodology: identity.rollMethodology,
  } as CanonicalAuditReportModel["auditScopeManifest"] extends { marketSpec?: infer T } ? T : never;
}

function stripUnsupportedProvenance(report: CanonicalAuditReportModel, evidence: R10ExactScopeEvidence | undefined) {
  const manifest = report.auditScopeManifest?.cryptographicManifest as any;
  if (!manifest) return;
  const observed = cleanSha256(evidence?.provenanceHashSha256);
  manifest.provenanceHash = observed ? `sha256:${observed}` : null;
  manifest.provenanceStatus = observed ? "OBSERVED_EXACT_SCOPE" : "NOT_OBSERVED";
}

function applyEvidenceVerdict(report: R10CanonicalAuditReport, evidence: R10ExactScopeEvidence | undefined) {
  const bound = evidenceMatchesReport(report as CanonicalAuditReportModel, evidence);
  if (!bound || !evidence) {
    report.verdict.riskScore = null;
    report.verdict.auditQualityScore = 0;
    report.verdict.confidenceScore = 0;
    report.verdict.evidenceCoverage = 0;
    report.verdict.verificationStatus = "INSUFFICIENT_EVIDENCE";
    report.verdict.releaseDecision = "BLOCKED";
    report.verdict.stopSellActive = true;
    report.verdict.stopSellReason = "INSUFFICIENT_EVIDENCE: no exact-scope R10 evidence receipt bound to this report";
    report.verdict.formalProofCoveragePct = 0;
    if (report.verdict.coverageTuple) {
      report.verdict.coverageTuple.detectorsExecutedPct = 0;
      report.verdict.coverageTuple.formalPropertiesPct = 0;
    }
    return;
  }

  report.verdict.riskScore = evidence.riskScore;
  report.verdict.auditQualityScore = evidence.auditQualityScore;
  report.verdict.confidenceScore = evidence.confidenceScore;
  report.verdict.evidenceCoverage = evidence.evidenceCoveragePct;
  report.verdict.verificationStatus = evidence.contentVerificationStatus;
  report.verdict.releaseDecision = evidence.releaseDecision;
  report.verdict.stopSellActive = evidence.releaseDecision === "BLOCKED";
  report.verdict.stopSellReason = evidence.releaseDecision === "BLOCKED" ? "EXACT_SCOPE_EVIDENCE_BLOCKED_RELEASE" : undefined;
}

function rebindIntegrity(report: R10CanonicalAuditReport) {
  const core: any = structuredClone(report);
  delete core.reportDigest;
  delete core.pkiAttestation;
  const digest = sha256Digest(canonicalJson(core));
  report.reportDigest = digest;
  report.pkiAttestation = signReportWithPki(digest, report.createdAt);
}

/**
 * R10 customer-output entrypoint.
 * Legacy report construction may still populate convenience/profile data, but
 * this boundary strips unsupported authority and makes exact-scope evidence the
 * only path to a positive content-verification/release decision.
 */
export function buildR10CanonicalAuditReport(
  input: FullAuditReportInput,
  entitlementTier: AuditTier = "basic",
  evidence?: R10ExactScopeEvidence,
): R10CanonicalAuditReport {
  const report = structuredClone(buildCanonicalAuditReport(input, entitlementTier)) as R10CanonicalAuditReport;
  applyMarketIdentity(report as CanonicalAuditReportModel);
  stripUnsupportedProvenance(report as CanonicalAuditReportModel, evidence);
  applyEvidenceVerdict(report, evidence);
  rebindIntegrity(report);
  return report;
}
