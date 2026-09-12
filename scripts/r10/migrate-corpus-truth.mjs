#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(HERE, "../..");
export const CORPUS_DIRS = ["smart_contract", "shield", "real_markets"];
export const EXPECTED_JSON_PER_SURFACE = 60;
export const EXPECTED_TOTAL_JSON = 180;

const EQUITIES = new Map([
  ["AAPL", ["Apple Inc. Common Stock", "NASDAQ", "XNAS"]],
  ["MSFT", ["Microsoft Corporation", "NASDAQ", "XNAS"]],
  ["NVDA", ["NVIDIA Corporation", "NASDAQ", "XNAS"]],
  ["AMZN", ["Amazon.com, Inc.", "NASDAQ", "XNAS"]],
  ["GOOGL", ["Alphabet Inc. Class A", "NASDAQ", "XNAS"]],
  ["META", ["Meta Platforms, Inc.", "NASDAQ", "XNAS"]],
  ["TSLA", ["Tesla, Inc.", "NASDAQ", "XNAS"]],
  ["BRK.B", ["Berkshire Hathaway Inc. Class B", "NYSE", "XNYS"]],
  ["JPM", ["JPMorgan Chase & Co.", "NYSE", "XNYS"]],
  ["V", ["Visa Inc. Class A", "NYSE", "XNYS"]],
]);
const ETFS = new Map([
  ["SPY", ["SPDR S&P 500 ETF Trust", "NYSE Arca", "ARCX", "S&P 500 equity basket"]],
  ["QQQ", ["Invesco QQQ Trust Series 1", "NASDAQ", "XNAS", "NASDAQ-100 equity basket"]],
  ["TLT", ["iShares 20+ Year Treasury Bond ETF", "NASDAQ", "XNAS", "US Treasury bonds with 20+ year maturity"]],
]);
const FUTURES = new Map([
  ["XAU", { code: "GC", name: "Gold COMEX Front-Month Futures Proxy", underlying: "Gold futures", venue: "COMEX", mic: "XCEC", providerSymbol: "cme:gc-front", settlementType: "physical" }],
  ["XAG", { code: "SI", name: "Silver COMEX Front-Month Futures Proxy", underlying: "Silver futures", venue: "COMEX", mic: "XCEC", providerSymbol: "cme:si-front", settlementType: "physical" }],
  ["CL", { code: "CL", name: "WTI Crude Oil NYMEX Front-Month Futures Proxy", underlying: "WTI Light Sweet Crude Oil futures", venue: "NYMEX", mic: "XNYM", providerSymbol: "nymex:cl-front", settlementType: "physical" }],
  ["NG", { code: "NG", name: "Henry Hub Natural Gas NYMEX Front-Month Futures Proxy", underlying: "Henry Hub Natural Gas futures", venue: "NYMEX", mic: "XNYM", providerSymbol: "nymex:ng-front", settlementType: "physical" }],
  ["EURUSD", { code: "6E", name: "Euro FX CME Front-Month Futures Proxy", underlying: "Euro FX futures versus US dollar", venue: "CME", mic: "XCME", providerSymbol: "cme:6e-front", settlementType: "physical", baseCurrency: "EUR", quoteCurrency: "USD" }],
  ["USDJPY", { code: "6J", name: "Japanese Yen CME Front-Month Futures Proxy", underlying: "Japanese yen futures versus US dollar; not USD/JPY OTC spot", venue: "CME", mic: "XCME", providerSymbol: "cme:6j-front", settlementType: "physical", baseCurrency: "JPY", quoteCurrency: "USD" }],
]);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function jsonFiles(dir) {
  return fs.readdirSync(dir).filter((name) => name.endsWith(".json")).sort();
}

function replacePlaceholderProvenance(value, stats) {
  if (Array.isArray(value)) {
    for (const item of value) replacePlaceholderProvenance(item, stats);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    if (key === "provenanceHash" && item === "0xprovenance_root") {
      value[key] = null;
      if (!("provenanceStatus" in value)) value.provenanceStatus = "NOT_OBSERVED";
      stats.placeholderProvenanceRemoved += 1;
      continue;
    }
    replacePlaceholderProvenance(item, stats);
  }
}

function forceFailClosed(report, stats) {
  if (!report.verdict || typeof report.verdict !== "object") return;
  const verdict = report.verdict;
  const before = JSON.stringify(verdict);
  verdict.riskScore = null;
  verdict.riskLabel = "INSUFFICIENT_EVIDENCE";
  verdict.confidenceScore = 0;
  verdict.auditQualityScore = 0;
  verdict.evidenceCoverage = 0;
  if ("evidenceCoveragePct" in verdict) verdict.evidenceCoveragePct = 0;
  verdict.verificationStatus = "INSUFFICIENT_EVIDENCE";
  verdict.releaseDecision = "BLOCKED";
  verdict.stopSellActive = true;
  verdict.formalProofCoveragePct = 0;
  if (verdict.coverageTuple && typeof verdict.coverageTuple === "object") {
    for (const key of Object.keys(verdict.coverageTuple)) {
      if (typeof verdict.coverageTuple[key] === "number") verdict.coverageTuple[key] = 0;
    }
  }
  if (JSON.stringify(verdict) !== before) stats.failClosedVerdicts += 1;
}

function removePseudoPki(report, stats) {
  if (!report.pkiAttestation || typeof report.pkiAttestation !== "object") return;
  const serialized = JSON.stringify(report.pkiAttestation);
  const stale = /RFC\s*3161\s+Trusted\s+Authority|Cryptographic\s+Root\s+CA/i.test(serialized);
  if (!stale) return;
  report.pkiAttestation = null;
  report.integrityAttestationStatus = {
    status: "NOT_REISSUED_AFTER_R10_TRUTH_MIGRATION",
    standard: "LOCAL_INTEGRITY_ATTESTATION_V1",
    externalTimestampVerified: false,
    limitation: "Legacy locally synthesized TSA/root-CA semantics removed. A fresh integrity attestation must be generated from the final release artifact.",
  };
  stats.pseudoPkiRemoved += 1;
}

function canonicalMarketIdentity(report) {
  const legacySymbol = String(report?.target?.tokenSymbol ?? report?.marketSpec?.canonicalSymbol ?? "").toUpperCase();
  const targetAddress = String(report?.target?.contractAddress ?? "");
  if (EQUITIES.has(legacySymbol)) {
    const [name, venue, mic] = EQUITIES.get(legacySymbol);
    return {
      instrumentId: `us-equity:${legacySymbol}`,
      assetClass: "equity",
      instrumentType: "equity",
      economicExposure: `Common equity of ${name}`,
      underlying: name,
      canonicalSymbol: legacySymbol,
      providerSymbol: targetAddress || legacySymbol,
      venue,
      mic,
      baseCurrency: null,
      quoteCurrency: "USD",
      contractMonth: null,
      expiry: null,
      settlementType: "unknown",
      priceType: "unknown",
      timezone: "America/New_York",
      marketCalendar: venue === "NYSE" ? "NYSE" : "NASDAQ",
      jurisdiction: ["US_SEC"],
      regulatoryJurisdiction: "US_SEC",
      dataProvider: "TARGET_REGISTRY_ONLY_NO_LIVE_OBSERVATION",
      asOf: null,
      freshnessSeconds: null,
      rollMethodology: null,
    };
  }
  if (ETFS.has(legacySymbol)) {
    const [name, venue, mic, exposure] = ETFS.get(legacySymbol);
    return {
      instrumentId: `us-etf:${legacySymbol}`,
      assetClass: "etf",
      instrumentType: "etf",
      economicExposure: exposure,
      underlying: name,
      canonicalSymbol: legacySymbol,
      providerSymbol: targetAddress || legacySymbol,
      venue,
      mic,
      baseCurrency: null,
      quoteCurrency: "USD",
      contractMonth: null,
      expiry: null,
      settlementType: "unknown",
      priceType: "unknown",
      timezone: "America/New_York",
      marketCalendar: venue === "NYSE Arca" ? "NYSE_ARCA" : "NASDAQ",
      jurisdiction: ["US_SEC"],
      regulatoryJurisdiction: "US_SEC",
      dataProvider: "TARGET_REGISTRY_ONLY_NO_LIVE_OBSERVATION",
      asOf: null,
      freshnessSeconds: null,
      rollMethodology: null,
    };
  }
  if (FUTURES.has(legacySymbol)) {
    const spec = FUTURES.get(legacySymbol);
    return {
      instrumentId: `us-future:${spec.code}:front`,
      assetClass: legacySymbol === "EURUSD" || legacySymbol === "USDJPY" ? "fx" : "commodity",
      instrumentType: "future",
      economicExposure: spec.underlying,
      underlying: spec.underlying,
      canonicalSymbol: spec.code,
      providerSymbol: spec.providerSymbol,
      venue: spec.venue,
      mic: spec.mic,
      baseCurrency: spec.baseCurrency ?? null,
      quoteCurrency: spec.quoteCurrency ?? "USD",
      contractMonth: null,
      expiry: null,
      settlementType: spec.settlementType,
      priceType: "unknown",
      timezone: "America/Chicago",
      marketCalendar: "CME_GLOBEX",
      jurisdiction: ["US_CFTC"],
      regulatoryJurisdiction: "US_CFTC",
      dataProvider: "TARGET_REGISTRY_ONLY_NO_LIVE_OBSERVATION",
      asOf: null,
      freshnessSeconds: null,
      rollMethodology: "FRONT_MONTH_CONTINUOUS_PROXY; contract-specific expiry not observed in this report evidence",
      legacyCustomerAlias: legacySymbol,
    };
  }
  if (legacySymbol === "VIX") {
    return {
      instrumentId: "us-index:VIX",
      assetClass: "index",
      instrumentType: "index",
      economicExposure: "Cboe Volatility Index",
      underlying: "S&P 500 option-implied volatility",
      canonicalSymbol: "VIX",
      providerSymbol: targetAddress || "cboe:vix",
      venue: "CBOE",
      mic: "XCBO",
      baseCurrency: null,
      quoteCurrency: null,
      contractMonth: null,
      expiry: null,
      settlementType: "none",
      priceType: "index",
      timezone: "America/Chicago",
      marketCalendar: "CBOE_INDEX",
      jurisdiction: ["US"],
      regulatoryJurisdiction: "US_CBOE_INDEX",
      dataProvider: "TARGET_REGISTRY_ONLY_NO_LIVE_OBSERVATION",
      asOf: null,
      freshnessSeconds: null,
      rollMethodology: null,
    };
  }
  throw new Error(`r10_unknown_real_markets_symbol:${legacySymbol || "EMPTY"}:${report?.reportId ?? "unknown"}`);
}

function applyCanonicalMarketIdentity(report, stats) {
  const identity = canonicalMarketIdentity(report);
  report.marketSpec = identity;
  if (FUTURES.has(String(report?.target?.tokenSymbol ?? "").toUpperCase())) {
    const legacy = String(report.target.tokenSymbol).toUpperCase();
    const spec = FUTURES.get(legacy);
    report.target.contractName = spec.name;
    report.target.contractAddress = spec.providerSymbol;
    report.target.network = `${spec.venue} futures market`;
    report.target.chainId = `MIC:${spec.mic}`;
    report.target.tokenSymbol = spec.code;
    report.target.proxyPattern = "N/A (regulated exchange-traded futures instrument; front-month proxy)";
  }
  stats.realMarketsCanonicalized += 1;
}

export function migrateReport(report, surface, stats) {
  forceFailClosed(report, stats);
  removePseudoPki(report, stats);
  replacePlaceholderProvenance(report, stats);
  if (surface === "real_markets") applyCanonicalMarketIdentity(report, stats);
  report.r10TruthMigration = {
    schemaVersion: "velmere.r10.corpus-truth-migration.v1",
    failClosed: true,
    customerReleaseDecision: "BLOCKED",
    exactScopeEvidenceCredit: false,
    note: "Truth-preserving migration only. This does not create live/provider/formal/human evidence.",
  };
  return report;
}

export function migrateCorpus(root, { write = false } = {}) {
  const stats = {
    schemaVersion: "velmere.r10.corpus-truth-migration-receipt.v1",
    root,
    expectedReports: EXPECTED_TOTAL_JSON,
    processedReports: 0,
    perSurface: {},
    pseudoPkiRemoved: 0,
    placeholderProvenanceRemoved: 0,
    failClosedVerdicts: 0,
    realMarketsCanonicalized: 0,
    changedFiles: 0,
    beforeDigest: null,
    afterDigest: null,
  };
  const beforeParts = [];
  const afterParts = [];
  for (const surface of CORPUS_DIRS) {
    const dir = path.join(root, "reports", surface);
    if (!fs.existsSync(dir)) throw new Error(`r10_missing_corpus_dir:${surface}`);
    const files = jsonFiles(dir);
    if (files.length !== EXPECTED_JSON_PER_SURFACE) {
      throw new Error(`r10_unexpected_json_count:${surface}:expected=${EXPECTED_JSON_PER_SURFACE}:actual=${files.length}`);
    }
    stats.perSurface[surface] = files.length;
    for (const name of files) {
      const file = path.join(dir, name);
      const raw = fs.readFileSync(file, "utf8");
      beforeParts.push(`${surface}/${name}\n${raw}`);
      const report = JSON.parse(raw);
      migrateReport(report, surface, stats);
      const next = `${JSON.stringify(report, null, 2)}\n`;
      afterParts.push(`${surface}/${name}\n${next}`);
      stats.processedReports += 1;
      if (next !== raw) {
        stats.changedFiles += 1;
        if (write) fs.writeFileSync(file, next, "utf8");
      }
    }
  }
  if (stats.processedReports !== EXPECTED_TOTAL_JSON) throw new Error(`r10_unexpected_total_reports:${stats.processedReports}`);
  if (stats.realMarketsCanonicalized !== EXPECTED_JSON_PER_SURFACE) throw new Error(`r10_real_markets_not_fully_canonicalized:${stats.realMarketsCanonicalized}`);
  stats.beforeDigest = `sha256:${sha256(beforeParts.join("\n--R10--\n"))}`;
  stats.afterDigest = `sha256:${sha256(afterParts.join("\n--R10--\n"))}`;
  return stats;
}

function parseArgs(argv) {
  const rootIndex = argv.indexOf("--root");
  const outputIndex = argv.indexOf("--output");
  return {
    root: rootIndex >= 0 ? path.resolve(argv[rootIndex + 1]) : DEFAULT_ROOT,
    write: argv.includes("--write"),
    output: outputIndex >= 0 ? path.resolve(argv[outputIndex + 1]) : null,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const receipt = migrateCorpus(args.root, { write: args.write });
  const output = args.output ?? path.join(args.root, "artifacts", "r10", "R10_CORPUS_TRUTH_MIGRATION_RECEIPT.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(receipt, null, 2));
}
