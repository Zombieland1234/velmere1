#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { migrateCorpus } from "./migrate-corpus-truth-v2.mjs";
import { runReleaseTruthScan } from "./release-truth-lib.mjs";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-r10-corpus-migration-"));
const symbols = [
  "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "BRK.B", "JPM", "V",
  "SPY", "QQQ", "XAU", "XAG", "CL", "NG", "EURUSD", "USDJPY", "VIX", "TLT",
];
const futureAddress = {
  XAU: "cme:gc-front", XAG: "cme:si-front", CL: "nymex:cl-front", NG: "nymex:ng-front",
  EURUSD: "cme:6e-front", USDJPY: "cme:6j-front",
};

function staleReport(id, symbol = "BTC", { realMarkets = false } = {}) {
  const report = {
    schemaVersion: "velmere.canonical-audit-report.v1",
    reportId: id,
    target: {
      contractName: symbol === "XAU" ? "Physical Gold Bullion Standard" : `${symbol} target`,
      contractAddress: futureAddress[symbol] ?? (symbol.includes(".") ? `nyse:${symbol.toLowerCase().replace(".", "-")}` : `nasdaq:${symbol.toLowerCase()}`),
      network: "Legacy market",
      chainId: "MIC:LEGACY",
      tokenSymbol: symbol,
      proxyPattern: "legacy",
    },
    verdict: {
      riskScore: 7,
      riskLabel: "LOW",
      confidenceScore: 100,
      auditQualityScore: 99,
      evidenceCoverage: 100,
      verificationStatus: "AUTOMATED_ONLY",
      releaseDecision: "PASS",
      stopSellActive: false,
      formalProofCoveragePct: 0,
      coverageTuple: { detectorsExecutedPct: 100, formalPropertiesPct: 0 },
      snapshotProvenance: { provenanceHash: "0xprovenance_root" },
    },
    pkiAttestation: {
      signerIdentity: "Velmère Cryptographic Root CA (Ed25519)",
      timestampToken: { tsaName: "Velmère RFC 3161 Trusted Authority" },
    },
  };
  if (realMarkets) {
    report.marketSpec = {
      assetClass: "Smart Contract Application",
      regulatoryJurisdiction: "SEC / FINRA / CFTC",
      description: symbol === "XAU" ? "physical spot gold" : `${symbol} legacy identity`,
    };
  }
  return report;
}

try {
  for (const surface of ["smart_contract", "shield", "real_markets"]) {
    fs.mkdirSync(path.join(tmp, "reports", surface), { recursive: true });
  }
  for (let i = 0; i < 60; i += 1) {
    fs.writeFileSync(path.join(tmp, "reports", "smart_contract", `${String(i + 1).padStart(3, "0")}_smart.json`), JSON.stringify(staleReport(`smart-${i}`), null, 2) + "\n");
    fs.writeFileSync(path.join(tmp, "reports", "shield", `${String(i + 61).padStart(3, "0")}_shield.json`), JSON.stringify(staleReport(`shield-${i}`), null, 2) + "\n");
    const symbol = symbols[Math.floor(i / 3)];
    const tier = ["basic", "pro", "advanced"][i % 3];
    const report = staleReport(`rm-${symbol}-${tier}`, symbol, { realMarkets: true });
    report.clientEntitlementTier = tier;
    fs.writeFileSync(path.join(tmp, "reports", "real_markets", `${String(i + 121).padStart(3, "0")}_${symbol.replaceAll(".", "_").toLowerCase()}_${tier}.json`), JSON.stringify(report, null, 2) + "\n");
  }

  const receipt = migrateCorpus(tmp, { write: true });
  assert.equal(receipt.processedReports, 180);
  assert.deepEqual(receipt.perSurface, { smart_contract: 60, shield: 60, real_markets: 60 });
  assert.equal(receipt.pseudoPkiRemoved, 180);
  assert.equal(receipt.placeholderProvenanceRemoved, 180);
  assert.equal(receipt.realMarketsCanonicalized, 60);
  assert.equal(receipt.failClosedVerdicts, 180);
  assert.equal(receipt.changedFiles, 180);
  assert.notEqual(receipt.beforeDigest, receipt.afterDigest);
  assert.equal(receipt.migrationEngine, "r10-corpus-truth-v2");

  const identityBySymbol = new Map();
  const migratedReports = [];
  for (const name of fs.readdirSync(path.join(tmp, "reports", "real_markets")).filter((x) => x.endsWith(".json")).sort()) {
    const report = JSON.parse(fs.readFileSync(path.join(tmp, "reports", "real_markets", name), "utf8"));
    migratedReports.push(report);
    assert.equal(report.verdict.riskScore, null);
    assert.equal(report.verdict.auditQualityScore, 0);
    assert.equal(report.verdict.evidenceCoverage, 0);
    assert.equal(report.verdict.releaseDecision, "BLOCKED");
    assert.equal(report.verdict.stopSellActive, true);
    assert.equal(report.pkiAttestation, null);
    assert.equal(report.integrityAttestationStatus.externalTimestampVerified, false);
    assert.notEqual(report.marketSpec.assetClass, "Smart Contract Application");
    assert.notEqual(report.marketSpec.regulatoryJurisdiction, "SEC / FINRA / CFTC");
    const alias = report.marketSpec.legacyCustomerAlias ?? report.marketSpec.canonicalSymbol;
    const identity = JSON.stringify({ ...report.marketSpec, asOf: null, freshnessSeconds: null });
    if (!identityBySymbol.has(alias)) identityBySymbol.set(alias, identity);
    else assert.equal(identityBySymbol.get(alias), identity, `tier identity drift for ${alias}`);
  }

  const jpy = migratedReports.filter((report) => report.marketSpec.legacyCustomerAlias === "USDJPY");
  assert.equal(jpy.length, 3);
  for (const report of jpy) {
    assert.equal(report.marketSpec.canonicalSymbol, "6J");
    assert.equal(report.target.tokenSymbol, "6J");
    assert.match(report.marketSpec.underlying, /not USD\/JPY OTC spot/i);
  }

  const p0 = runReleaseTruthScan(tmp).filter((finding) => finding.severity === "P0");
  assert.deepEqual(p0, [], JSON.stringify(p0, null, 2));

  const second = migrateCorpus(tmp, { write: true });
  assert.equal(second.preflightLegacyAliasRestores, 12, "four canonical-symbol-changing futures aliases across three tiers should be restored only for recognition");
  assert.equal(second.changedFiles, 0, "migration must be byte-idempotent after first write");
  assert.equal(second.beforeDigest, second.afterDigest);

  console.log("R10 deterministic 180-report corpus truth migration V2: PASS");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
