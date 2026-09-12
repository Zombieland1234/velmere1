#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrateCorpus as migrateCorpusV2 } from "./migrate-corpus-truth-v2.mjs";
import { runReleaseTruthScan } from "./release-truth-lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(HERE, "../..");
const CORPUS_DIRS = ["smart_contract", "shield", "real_markets"];
const EXPECTED_TOTAL = 180;
const EXPECTED_REAL_MARKETS = 60;
const EXPECTED_INSTRUMENTS = 20;
const TIERS = ["basic", "pro", "advanced"];

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function snapshotCorpus(root) {
  const entries = [];
  for (const surface of CORPUS_DIRS) {
    const dir = path.join(root, "reports", surface);
    for (const name of fs.readdirSync(dir).filter((entry) => entry.endsWith(".json")).sort()) {
      const file = path.join(dir, name);
      entries.push({ key: `${surface}/${name}`, file, raw: fs.readFileSync(file, "utf8") });
    }
  }
  return entries;
}

function digestSnapshot(entries) {
  return `sha256:${sha256(entries.map((entry) => `${entry.key}\n${entry.raw}`).join("\n--R10-V3--\n"))}`;
}

function nestedMarketProjection(identity) {
  return {
    schemaVersion: "velmere.real-markets-canonical-identity.v1",
    instrumentId: identity.instrumentId,
    identifierType: identity.instrumentType === "future" ? "FUTURES_CODE" : identity.instrumentType === "index" ? "INDEX_CODE" : "TICKER",
    identifierValue: identity.canonicalSymbol,
    canonicalSymbol: identity.canonicalSymbol,
    legacyCustomerAlias: identity.legacyCustomerAlias ?? null,
    assetClass: identity.assetClass,
    instrumentType: identity.instrumentType,
    economicExposure: identity.economicExposure,
    underlying: identity.underlying,
    providerIdentifier: identity.providerSymbol,
    source: "R10_TARGET_REGISTRY_ONLY_NO_LIVE_OBSERVATION",
    tradingVenue: identity.venue,
    exchangeMic: identity.mic,
    figi: null,
    isin: null,
    identifierEvidenceStatus: "NOT_OBSERVED",
    baseCurrency: identity.baseCurrency,
    quoteCurrency: identity.quoteCurrency,
    contractMonth: identity.contractMonth,
    expiry: identity.expiry,
    settlementType: identity.settlementType,
    priceType: identity.priceType,
    timezone: identity.timezone,
    marketCalendar: identity.marketCalendar,
    jurisdiction: identity.jurisdiction,
    regulatoryJurisdiction: identity.regulatoryJurisdiction,
    dataProvider: identity.dataProvider,
    asOf: identity.asOf,
    freshnessSeconds: identity.freshnessSeconds,
    rollMethodology: identity.rollMethodology,
    externalIdentityVerified: false,
    liveObservationCredit: false,
  };
}

function normalizedIdentityForTierComparison(identity) {
  const clone = structuredClone(identity);
  delete clone.asOf;
  delete clone.freshnessSeconds;
  return JSON.stringify(clone);
}

function syncRealMarkets(root) {
  const dir = path.join(root, "reports", "real_markets");
  const files = fs.readdirSync(dir).filter((entry) => entry.endsWith(".json")).sort();
  if (files.length !== EXPECTED_REAL_MARKETS) {
    throw new Error(`r10_v3_real_markets_count:expected=${EXPECTED_REAL_MARKETS}:actual=${files.length}`);
  }

  const groups = new Map();
  let changedFiles = 0;
  let nestedManifestsSynced = 0;
  let staleIdentifiersRemoved = 0;

  for (const name of files) {
    const file = path.join(dir, name);
    const raw = fs.readFileSync(file, "utf8");
    const report = JSON.parse(raw);
    const identity = report.marketSpec;
    if (!identity || typeof identity !== "object" || !identity.instrumentId) {
      throw new Error(`r10_v3_missing_canonical_market_spec:${name}`);
    }
    if (!report.auditScopeManifest || typeof report.auditScopeManifest !== "object") {
      report.auditScopeManifest = {};
    }

    const previousNested = JSON.stringify(report.auditScopeManifest.marketSpec ?? null);
    if (/"figi"\s*:\s*"[^\"]+"|"isin"\s*:\s*"[^\"]+"/.test(previousNested)) staleIdentifiersRemoved += 1;
    report.auditScopeManifest.marketSpec = nestedMarketProjection(identity);
    nestedManifestsSynced += 1;

    report.auditScopeManifest.targetSpec = {
      ...(report.auditScopeManifest.targetSpec && typeof report.auditScopeManifest.targetSpec === "object" ? report.auditScopeManifest.targetSpec : {}),
      chainId: report.target?.chainId ?? null,
      contractAddress: report.target?.contractAddress ?? null,
      network: report.target?.network ?? null,
      proxyType: report.target?.proxyPattern ?? "N/A",
      identitySource: "R10_CANONICAL_MARKET_SPEC",
      liveObservationCredit: false,
    };

    const alias = String(identity.legacyCustomerAlias ?? identity.canonicalSymbol).toUpperCase();
    const tier = String(report.clientEntitlementTier ?? "").toLowerCase();
    if (!TIERS.includes(tier)) throw new Error(`r10_v3_unknown_tier:${name}:${tier || "EMPTY"}`);
    const list = groups.get(alias) ?? [];
    list.push({ name, tier, identity: normalizedIdentityForTierComparison(identity) });
    groups.set(alias, list);

    const next = `${JSON.stringify(report, null, 2)}\n`;
    if (next !== raw) {
      fs.writeFileSync(file, next, "utf8");
      changedFiles += 1;
    }
  }

  if (groups.size !== EXPECTED_INSTRUMENTS) {
    throw new Error(`r10_v3_instrument_count:expected=${EXPECTED_INSTRUMENTS}:actual=${groups.size}`);
  }
  for (const [alias, entries] of groups) {
    if (entries.length !== 3) throw new Error(`r10_v3_tier_count:${alias}:${entries.length}`);
    const tiers = entries.map((entry) => entry.tier).sort();
    if (JSON.stringify(tiers) !== JSON.stringify([...TIERS].sort())) {
      throw new Error(`r10_v3_tier_set:${alias}:${tiers.join(",")}`);
    }
    const baseline = entries[0].identity;
    for (const entry of entries.slice(1)) {
      if (entry.identity !== baseline) throw new Error(`r10_v3_identity_drift:${alias}:${entries[0].name}:${entry.name}`);
    }
  }

  const realMarketP0 = runReleaseTruthScan(root).filter((finding) =>
    finding.severity === "P0" && finding.path.startsWith("reports/real_markets/"),
  );
  if (realMarketP0.length) {
    throw new Error(`r10_v3_real_markets_truth_blockers:${realMarketP0.length}:${realMarketP0.slice(0, 8).map((f) => `${f.id}:${f.path}`).join("|")}`);
  }

  return {
    realMarketsReports: files.length,
    instrumentGroups: groups.size,
    nestedManifestsSynced,
    staleIdentifiersRemoved,
    changedFiles,
    realMarketsP0: realMarketP0.length,
  };
}

export function migrateCorpus(root, { write = false } = {}) {
  const original = snapshotCorpus(root);
  if (original.length !== EXPECTED_TOTAL) throw new Error(`r10_v3_total_count:${original.length}`);
  const beforeDigest = digestSnapshot(original);
  let baseReceipt;
  let realMarkets;
  let after;
  try {
    // v2 is executed in write mode inside this controlled wrapper so validation can
    // inspect the real transformed tree. Dry-run restores the exact original bytes below.
    baseReceipt = migrateCorpusV2(root, { write: true });
    realMarkets = syncRealMarkets(root);
    after = snapshotCorpus(root);
  } finally {
    if (!write) {
      for (const entry of original) fs.writeFileSync(entry.file, entry.raw, "utf8");
    }
  }

  if (!after) throw new Error("r10_v3_after_snapshot_missing");
  const afterDigest = digestSnapshot(after);
  const changedFiles = after.reduce((count, entry, index) => count + (entry.raw === original[index].raw ? 0 : 1), 0);
  return {
    schemaVersion: "velmere.r10.corpus-truth-migration.v3",
    migrationEngine: "r10-corpus-truth-v3",
    context: "R10_CANDIDATE_NO_RELEASE_CREDIT",
    beforeDigest,
    afterDigest,
    changedFiles,
    baseReceipt,
    realMarkets,
    passed: baseReceipt.processedReports === EXPECTED_TOTAL && realMarkets.realMarketsP0 === 0 && realMarkets.instrumentGroups === EXPECTED_INSTRUMENTS,
    limitations: [
      "Canonical identity is based on the reviewed R10 target registry mapping; no live market observation credit is created.",
      "FIGI/ISIN values previously present without exact evidence are cleared to null in the nested compatibility manifest.",
      "This migration does not prove provider licensing, live prices, freshness, formal verification, human review, or production readiness.",
    ],
  };
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
  const output = args.output ?? path.join(args.root, "artifacts", "r10", "R10_CORPUS_TRUTH_MIGRATION_V3_RECEIPT.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(receipt, null, 2));
  if (!receipt.passed) process.exitCode = 1;
}
