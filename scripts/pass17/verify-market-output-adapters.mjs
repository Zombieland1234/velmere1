#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { buildWorldclassMarketOutput, buildMarketAdapterEvidenceReceipt } from "../../lib/worldclass/market-output-adapter.mjs";
import { scoreWorldclassOutput } from "../../lib/worldclass/output-scorer.mjs";
import { commonImplementationDigest } from "../worldclass/common-implementation-digest.mjs";

const root = process.cwd();
const NOW = "2026-07-20T08:00:00.000Z";
const NOW_MS = Date.parse(NOW);
const writeOutputs = process.argv.includes("--write");
const corpus = JSON.parse(fs.readFileSync(path.join(root, "evaluation/pass16/worldclass-base-corpus.json"), "utf8"));
const contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass16/worldclass-output-contract.json"), "utf8"));
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass17/market-output-adapter-policy.json"), "utf8"));
const matrixRows = fs.readFileSync(path.join(root, "evaluation/pass16/worldclass-2700-matrix.jsonl"), "utf8").trim().split(/\r?\n/u).map((line) => JSON.parse(line));
const marketCases = corpus.cases.filter((row) => row.surface === "shield" || row.surface === "real_markets");
const caseById = new Map(marketCases.map((row) => [row.id, row]));

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function sha256(value) { return createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : canonical(value)).digest("hex"); }
function sourceTreeDigest() { return commonImplementationDigest(root); }
function numberFromHash(text, min, max, decimals = 2) {
  const value = Number.parseInt(sha256(text).slice(0, 12), 16) / 0xffffffffffff;
  return Number((min + value * (max - min)).toFixed(decimals));
}
function identity(caseRow) {
  const symbol = String(caseRow.input.symbol ?? "").trim();
  const assetClass = String(caseRow.input.assetClass ?? "unknown").trim().toLowerCase();
  return `${assetClass}:${symbol.toLowerCase().replaceAll(" ", "-")}`;
}
function oldTimestamp(assetClass, multiplier = 5) {
  const seconds = Number(policy.freshnessSecondsByAssetClass[assetClass] ?? 300) * multiplier;
  return new Date(NOW_MS - Math.max(seconds, 3600) * 1000).toISOString();
}
function valuesFor(caseRow, sourceIndex, conflict = false) {
  const key = `${caseRow.id}:${sourceIndex}`;
  const basePrice = numberFromHash(`${caseRow.id}:price`, 5, 5000, 4);
  const priceNoise = sourceIndex === 0 ? 0 : sourceIndex === 1 ? 0.002 : -0.0015;
  const price = Number((basePrice * (1 + (conflict && sourceIndex === 1 ? 0.09 : priceNoise))).toFixed(6));
  const risk = numberFromHash(`${caseRow.id}:risk`, 8, 88, 2);
  const returns = numberFromHash(`${caseRow.id}:returns`, -12, 12, 3) + (conflict && sourceIndex === 1 ? 6 : 0);
  const volume = numberFromHash(`${caseRow.id}:volume`, 100_000, 25_000_000_000, 0) * (sourceIndex === 1 ? 1.03 : sourceIndex === 2 ? 0.98 : 1);
  const marketCap = numberFromHash(`${caseRow.id}:notional`, 10_000_000, 2_500_000_000_000, 0) * (sourceIndex === 1 ? 1.01 : sourceIndex === 2 ? 0.995 : 1);
  return {
    price,
    returns_24h: Number(returns.toFixed(3)),
    volume_24h: Math.round(volume),
    market_cap_or_notional: Math.round(marketCap),
    liquidity_usd: Math.round(numberFromHash(`${key}:liquidity`, 500_000, 3_000_000_000, 0)),
    spread_bps: numberFromHash(`${key}:spread`, 1, 180, 2),
    risk_signal: Number((risk + (sourceIndex === 1 ? 1.5 : sourceIndex === 2 ? -1 : 0)).toFixed(2)),
    official_signal: sourceIndex === 2 ? `source_bound_${caseRow.category}` : null,
    session_status: caseRow.surface === "real_markets" ? "observed_session" : null,
  };
}

function fixtureFor(caseRow) {
  const assetClass = String(caseRow.input.assetClass ?? "unknown").toLowerCase();
  const canonicalIdentity = identity(caseRow);
  const conflicting = caseRow.adversarialFlags.includes("conflicting_sources") || caseRow.adversarialFlags.includes("identity_or_source_conflict");
  const identityConflict = caseRow.adversarialFlags.includes("identity_or_source_conflict") || caseRow.category === "identity_unresolved";
  const missingOrStale = caseRow.adversarialFlags.includes("missing_or_stale_evidence") || /stale|publication_delay|deprecated/u.test(caseRow.category);
  const noSources = caseRow.category === "unknown_asset_no_sources";
  const commercialGap = caseRow.category === "licensed_data_missing" || caseRow.category === "deprecated_instrument";
  const families = caseRow.surface === "shield"
    ? ["primary_market", "independent_market", "onchain_or_issuer"]
    : ["primary_market", "independent_market", "issuer_or_official"];
  const providers = caseRow.surface === "shield"
    ? ["fixture-primary-crypto", "fixture-independent-crypto", "fixture-onchain-issuer"]
    : ["fixture-primary-market", "fixture-independent-market", "fixture-issuer-official"];
  const sources = noSources ? [] : families.map((family, index) => {
    const values = valuesFor(caseRow, index, conflicting);
    if (missingOrStale) {
      if (index === 0) {
        values.official_signal = null;
        values.liquidity_usd = null;
        values.market_cap_or_notional = null;
      }
      if (index >= 1) {
        values.volume_24h = null;
        values.official_signal = index === 2 ? null : values.official_signal;
        values.session_status = index === 2 ? null : values.session_status;
      }
    }
    if (commercialGap) {
      values.official_signal = index === 2 ? null : values.official_signal;
      if (index === 2) values.market_cap_or_notional = null;
    }
    const row = {
      sourceId: `${caseRow.id}-source-${index + 1}`,
      providerId: providers[index],
      family,
      canonicalIdentity: identityConflict && index === 1 ? `conflict:${caseRow.input.symbol}`.toLowerCase() : canonicalIdentity,
      observedAt: commercialGap && index === 0 ? NOW : missingOrStale && index !== 1 ? oldTimestamp(assetClass, 8 + index) : NOW,
      licenseStatus: commercialGap ? (index === 0 ? "display_only" : "restricted") : "verified",
      values,
    };
    row.payloadSha256 = sha256(row.values);
    return row;
  });
  const fixture = {
    schemaVersion: "velmere.pass17.market-evidence-fixture.v1",
    caseId: caseRow.id,
    surface: caseRow.surface,
    asOf: NOW,
    asset: {
      canonicalIdentity: caseRow.category === "identity_unresolved" ? "" : canonicalIdentity,
      symbol: caseRow.input.symbol,
      name: caseRow.input.name,
      assetClass,
      venue: caseRow.surface === "real_markets" ? "fixture_canonical_venue" : "multi_venue",
      currency: caseRow.surface === "real_markets" ? "USD" : "USD",
    },
    sources,
    fixtureFlags: { conflicting, identityConflict, missingOrStale, noSources, commercialGap },
    truthBoundary: "Synthetic deterministic adapter fixture. It is not current market data and must never be shown to customers or counted as provider/staging/LIVE proof.",
  };
  fixture.provenanceReceiptSha256 = buildMarketAdapterEvidenceReceipt(fixture);
  return fixture;
}

const sourceTree = sourceTreeDigest();
const fixtures = marketCases.map(fixtureFor);
const fixtureByCase = new Map(fixtures.map((row) => [row.caseId, row]));
const rows = matrixRows.filter((row) => row.surface === "shield" || row.surface === "real_markets");
const results = [];
const failures = [];
const outputsByCaseLocale = new Map();

for (const matrixRow of rows) {
  const corpusCase = caseById.get(matrixRow.caseId);
  const evidencePacket = fixtureByCase.get(matrixRow.caseId);
  const args = {
    matrixRow,
    corpusCase,
    evidencePacket,
    sourceSha256: sourceTree.sha256,
    corpusSha256: corpus.corpusSha256,
    entitlementStatus: matrixRow.tier === "basic" ? "unverified" : "verified",
    rightsMode: "synthetic_fixture",
    policy,
  };
  const output = buildWorldclassMarketOutput(args);
  const repeated = buildWorldclassMarketOutput(args);
  const score = scoreWorldclassOutput({ matrixRow, output, contract, corpusSha256: corpus.corpusSha256 });
  const deterministic = canonical(output) === canonical(repeated);
  const sourceFields = new Set(evidencePacket.sources.flatMap((source) => Object.keys(source.values ?? {})));
  const lineageChecks = [
    ["price", output.marketSnapshot?.price],
    ["returns_24h", output.marketSnapshot?.returns24h],
    ["volume_24h", output.marketSnapshot?.volume24h],
    ["market_cap_or_notional", output.marketSnapshot?.marketCapOrNotional],
  ].filter(([, value]) => value !== null && value !== undefined).every(([field]) => sourceFields.has(field));
  const record = {
    matrixId: matrixRow.matrixId,
    caseId: matrixRow.caseId,
    surface: matrixRow.surface,
    tier: matrixRow.tier,
    locale: matrixRow.locale,
    status: output.status,
    contractOk: score.ok,
    contractScore: score.score,
    deterministic,
    lineageChecks,
    evidenceFamilies: score.evidenceFamilyCount,
    outputSha256: score.outputSha256,
    outputReceiptSha256: output.outputReceiptSha256,
    blockers: output.blockers ?? [],
    failureCodes: score.failures.map((failure) => failure.code),
  };
  results.push(record);
  if (!score.ok || !deterministic || !lineageChecks) failures.push(record);
  const key = `${matrixRow.caseId}::${matrixRow.locale}`;
  const group = outputsByCaseLocale.get(key) ?? {};
  group[matrixRow.tier] = output;
  outputsByCaseLocale.set(key, group);
}

const differentiationFailures = [];
for (const [key, group] of outputsByCaseLocale.entries()) {
  if (!group.basic || !group.pro || !group.advanced) {
    differentiationFailures.push({ key, code: "tier_group_incomplete" });
    continue;
  }
  const hashes = new Set([sha256(group.basic), sha256(group.pro), sha256(group.advanced)]);
  if (hashes.size !== 3) differentiationFailures.push({ key, code: "tier_outputs_not_distinct" });
  if (group.basic.status === "passed" && Object.prototype.hasOwnProperty.call(group.basic, "evidenceTable")) differentiationFailures.push({ key, code: "basic_leaks_paid_evidence_table" });
  if (group.pro.status === "passed" && Object.prototype.hasOwnProperty.call(group.pro, "provenanceReceipt")) differentiationFailures.push({ key, code: "pro_leaks_advanced_provenance" });
  if (group.advanced.status === "passed" && !Object.prototype.hasOwnProperty.call(group.advanced, "provenanceReceipt")) differentiationFailures.push({ key, code: "advanced_missing_provenance" });
}

const localeFailures = [];
for (const caseRow of marketCases) {
  for (const tier of ["basic", "pro", "advanced"]) {
    const translations = ["pl", "en", "de"].map((locale) => {
      const matrixRow = rows.find((row) => row.caseId === caseRow.id && row.tier === tier && row.locale === locale);
      const output = buildWorldclassMarketOutput({
        matrixRow,
        corpusCase: caseRow,
        evidencePacket: fixtureByCase.get(caseRow.id),
        sourceSha256: sourceTree.sha256,
        corpusSha256: corpus.corpusSha256,
        entitlementStatus: tier === "basic" ? "unverified" : "verified",
        rightsMode: "synthetic_fixture",
        policy,
      });
      return `${output.scope}\n${output.customerVerdict}\n${output.nextSafeCheck}`;
    });
    if (new Set(translations).size !== 3) localeFailures.push({ caseId: caseRow.id, tier, code: "locale_copy_not_distinct" });
  }
}

const byStatus = results.reduce((acc, row) => {
  const key = `${row.surface}:${row.tier}:${row.status}`;
  acc[key] = (acc[key] ?? 0) + 1;
  return acc;
}, {});
const summary = {
  schemaVersion: "velmere.pass17.market-adapter-verification.v1",
  generatedAt: NOW,
  sourceTree,
  corpusSha256: corpus.corpusSha256,
  fixtures: fixtures.length,
  matrixRowsExecuted: results.length,
  contractPass: results.filter((row) => row.contractOk).length,
  deterministicPass: results.filter((row) => row.deterministic).length,
  lineagePass: results.filter((row) => row.lineageChecks).length,
  differentiationGroups: outputsByCaseLocale.size,
  differentiationFailures: differentiationFailures.length,
  localeChecks: marketCases.length * 3,
  localeFailures: localeFailures.length,
  failures: failures.length,
  byStatus,
  ok: failures.length === 0 && differentiationFailures.length === 0 && localeFailures.length === 0,
  truthBoundary: "All 900 outputs are deterministic synthetic adapter simulations. They prove adapter contracts and fail-closed behavior only; they are not the 900 canonical provider-bound product outputs and do not change 0/2700 canonical execution status.",
};

if (writeOutputs) {
  fs.mkdirSync(path.join(root, "evaluation/pass17"), { recursive: true });
  fs.mkdirSync(path.join(root, ".velmere/pass17-diagnostics"), { recursive: true });
  fs.writeFileSync(path.join(root, "evaluation/pass17/market-evidence-fixtures.json"), `${JSON.stringify({
    schemaVersion: "velmere.pass17.market-evidence-fixture-corpus.v1",
    generatedAt: NOW,
    sourceCorpusSha256: corpus.corpusSha256,
    count: fixtures.length,
    fixtures,
    truthBoundary: summary.truthBoundary,
  }, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(root, "evaluation/pass17/market-adapter-output-index.jsonl"), `${results.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  fs.writeFileSync(path.join(root, "evaluation/pass17/market-adapter-simulation-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(root, ".velmere/pass17-diagnostics/market-adapter-verification.json"), `${JSON.stringify({ summary, failures, differentiationFailures, localeFailures }, null, 2)}\n`, "utf8");
}
console.log(JSON.stringify(summary, null, 2));
if (!summary.ok) process.exit(1);
