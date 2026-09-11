import assert from "node:assert/strict";
import { buildR10CanonicalAuditReport } from "../../lib/security/r10-canonical-report";
import { REAL_MARKET_INSTRUMENT_MASTER } from "../../lib/market-integrity/real-market-instrument-master";
import { verifyReportPki } from "../../lib/security/audit-pki-signature";

const marketCases = [
  { id: "aapl", name: "Apple Inc. Common Stock", symbol: "AAPL", address: "nasdaq:aapl", network: "NASDAQ Stock Market", chainId: "MIC:XNAS" },
  { id: "gold", name: "Physical Gold Bullion Standard", symbol: "XAU", address: "cme:gc-front", network: "Commodity Exchange (COMEX)", chainId: "MIC:XCME" },
  { id: "eur_usd", name: "Euro / US Dollar Currency Pair", symbol: "EURUSD", address: "cme:6e-front", network: "Chicago Mercantile Exchange (CME)", chainId: "MIC:XCME" },
];

assert.equal(REAL_MARKET_INSTRUMENT_MASTER.length, 20);
assert.equal(new Set(REAL_MARKET_INSTRUMENT_MASTER.map((item) => item.identity.instrumentId)).size, 20);

for (const target of marketCases) {
  const identities = [];
  for (const tier of ["basic", "pro", "advanced"] as const) {
    const report = buildR10CanonicalAuditReport({
      reportId: `r10-${target.id}-${tier}`,
      caseRef: `R10-${target.id.toUpperCase()}-${tier.toUpperCase()}`,
      contractName: target.name,
      contractAddress: target.address,
      network: target.network,
      chainId: target.chainId,
      tokenSymbol: target.symbol,
      locale: "en",
      applicationSurface: "real-markets",
    }, tier);

    assert.equal(report.verdict.riskScore, null);
    assert.equal(report.verdict.auditQualityScore, 0);
    assert.equal(report.verdict.confidenceScore, 0);
    assert.equal(report.verdict.evidenceCoverage, 0);
    assert.equal(report.verdict.verificationStatus, "INSUFFICIENT_EVIDENCE");
    assert.equal(report.verdict.releaseDecision, "BLOCKED");
    assert.equal(report.verdict.stopSellActive, true);
    assert.equal(report.auditScopeManifest?.cryptographicManifest.provenanceHash, null);
    assert.equal((report.auditScopeManifest?.cryptographicManifest as any)?.provenanceStatus, "NOT_OBSERVED");
    assert.equal(report.pkiAttestation?.externalTimestampVerified, false);
    assert.equal(report.pkiAttestation?.attestationType, "LOCAL_FILE_INTEGRITY");
    assert.equal(verifyReportPki(report.pkiAttestation!), true);
    assert.doesNotMatch(JSON.stringify(report.pkiAttestation), /Trusted Authority|Root CA|TimeStampToken/i);

    const market = report.auditScopeManifest?.marketSpec as any;
    assert(market?.instrumentId);
    assert(market?.instrumentType);
    assert(Array.isArray(market?.jurisdiction));
    assert.notEqual(market?.regulatoryJurisdiction, "SEC / FINRA / CFTC");
    assert.notEqual(market?.assetClass, "Smart Contract Application");
    identities.push(JSON.stringify({
      instrumentId: market.instrumentId,
      instrumentType: market.instrumentType,
      canonicalSymbol: market.canonicalSymbol,
      providerSymbol: market.providerSymbol,
      venue: market.venue,
      jurisdiction: market.jurisdiction,
    }));
  }
  assert.equal(new Set(identities).size, 1, `${target.id}: identity drifted across tiers`);
}

const gold = buildR10CanonicalAuditReport({
  reportId: "r10-gold",
  contractName: "Physical Gold Bullion Standard",
  contractAddress: "cme:gc-front",
  network: "Commodity Exchange (COMEX)",
  chainId: "MIC:XCME",
  tokenSymbol: "XAU",
  locale: "en",
  applicationSurface: "real-markets",
}, "advanced");
assert.equal(gold.target.contractName, "CME Gold Front-Month Future");
assert.equal((gold.auditScopeManifest?.marketSpec as any)?.instrumentType, "future");
assert.equal((gold.auditScopeManifest?.marketSpec as any)?.canonicalSymbol, "GC");
assert.doesNotMatch(`${gold.target.contractName} ${(gold.auditScopeManifest?.marketSpec as any)?.providerSymbol}`, /Physical Gold.*GC-FRONT/i);

const fx = buildR10CanonicalAuditReport({
  reportId: "r10-eur",
  contractName: "Euro / US Dollar Currency Pair",
  contractAddress: "cme:6e-front",
  network: "Chicago Mercantile Exchange (CME)",
  chainId: "MIC:XCME",
  tokenSymbol: "EURUSD",
  locale: "en",
  applicationSurface: "real-markets",
}, "advanced");
assert.equal(fx.target.contractName, "CME Euro FX Front-Month Future");
assert.equal((fx.auditScopeManifest?.marketSpec as any)?.instrumentType, "future");
assert.equal((fx.auditScopeManifest?.marketSpec as any)?.canonicalSymbol, "6E");

const baseInput = {
  reportId: "r10-aapl-evidence",
  contractName: "Apple Inc. Common Stock",
  contractAddress: "nasdaq:aapl",
  network: "NASDAQ Stock Market",
  chainId: "MIC:XNAS",
  tokenSymbol: "AAPL",
  locale: "en" as const,
  applicationSurface: "real-markets" as const,
};
const receipt = {
  auditId: "r10-aapl-evidence",
  targetIdentifier: "nasdaq:aapl",
  observedAt: "2026-09-12T00:00:00.000Z",
  evidenceCoveragePct: 92,
  contentVerificationStatus: "VERIFIED" as const,
  releaseDecision: "PASS" as const,
  riskScore: 24,
  confidenceScore: 91,
  auditQualityScore: 90,
  provenanceHashSha256: "e".repeat(64),
  providerIdentity: "fixture-provider-receipt",
  freshnessSeconds: 15,
};

const exactScope = buildR10CanonicalAuditReport(baseInput, "advanced", receipt);
assert.equal(exactScope.verdict.riskScore, 24);
assert.equal(exactScope.verdict.auditQualityScore, 90);
assert.equal(exactScope.verdict.evidenceCoverage, 92);
assert.equal(exactScope.verdict.verificationStatus, "VERIFIED");
assert.equal(exactScope.verdict.releaseDecision, "PASS");
assert.equal(exactScope.verdict.stopSellActive, false);
assert.equal(exactScope.auditScopeManifest?.cryptographicManifest.provenanceHash, `sha256:${"e".repeat(64)}`);

const wrongAudit = buildR10CanonicalAuditReport(baseInput, "advanced", { ...receipt, auditId: "r10-other-audit" });
assert.equal(wrongAudit.verdict.riskScore, null);
assert.equal(wrongAudit.verdict.verificationStatus, "INSUFFICIENT_EVIDENCE");
assert.equal(wrongAudit.verdict.releaseDecision, "BLOCKED");

const wrongTarget = buildR10CanonicalAuditReport(baseInput, "advanced", { ...receipt, targetIdentifier: "nasdaq:msft" });
assert.equal(wrongTarget.verdict.riskScore, null);
assert.equal(wrongTarget.verdict.verificationStatus, "INSUFFICIENT_EVIDENCE");
assert.equal(wrongTarget.verdict.releaseDecision, "BLOCKED");

console.log("R10 fail-closed canonical report truth regression: PASS");
