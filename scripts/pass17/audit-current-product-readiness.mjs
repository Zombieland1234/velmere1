#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
function read(relative, fallback = null) {
  const file = path.join(root, relative);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
}
const corpus = read("evaluation/pass16/worldclass-base-corpus.json");
const matrixSummary = read("evaluation/pass16/worldclass-2700-summary.json");
const simulation = read("evaluation/pass17/market-adapter-simulation-summary.json");
const boundaries = read(".velmere/pass17-diagnostics/market-output-adapter-boundary-tests.json");
const catalog = read("data/real-markets-customer-catalog.json", { rows: [], counts: {} });
const i18n = read(".velmere/pass14-diagnostics/i18n-semantic-parity.json");
const graph = read("config/pass15/lazy-build-surface-profile.json");
const database = read(".velmere/pass14-diagnostics/database-contract-audit.json");
const adapterStates = {};
for (const row of catalog.rows ?? []) adapterStates[row.adapterState] = (adapterStates[row.adapterState] ?? 0) + 1;
const byStatus = simulation?.byStatus ?? {};
function count(surface, tier, status) { return Number(byStatus[`${surface}:${tier}:${status}`] ?? 0); }
const report = {
  schemaVersion: "velmere.pass17.current-product-readiness.v1",
  generatedAt: new Date().toISOString(),
  sourceBoundCanonicalCorpus: {
    corpusSha256: corpus?.corpusSha256 ?? null,
    baseCasesPrepared: corpus?.counts?.baseCases ?? 0,
    expandedCasesRequired: corpus?.counts?.expandedCases ?? 0,
    executed: matrixSummary?.executedCanonicalCases ?? 0,
    passed: matrixSummary?.passedCanonicalCases ?? 0,
    status: matrixSummary?.status ?? "UNKNOWN",
  },
  adapterImplementation: {
    implementedSurfaces: ["shield", "real_markets"],
    pendingSurfaces: ["smart_contract_audit", "lens_pdf", "vlm_brain", "angel"],
    implementedCount: 2,
    totalCount: 6,
    status: simulation?.ok && boundaries?.ok ? "OFFLINE_SYNTHETIC_ADAPTER_CONTRACT_PROVEN" : "FAIL",
    shield: {
      baseCases: 50,
      simulatedRows: 450,
      passed: count("shield", "basic", "passed") + count("shield", "pro", "passed") + count("shield", "advanced", "passed"),
      safelyBlocked: count("shield", "basic", "blocked") + count("shield", "pro", "blocked") + count("shield", "advanced", "blocked"),
    },
    realMarkets: {
      baseCases: 50,
      simulatedRows: 450,
      passed: count("real_markets", "basic", "passed") + count("real_markets", "pro", "passed") + count("real_markets", "advanced", "passed"),
      safelyBlocked: count("real_markets", "basic", "blocked") + count("real_markets", "pro", "blocked") + count("real_markets", "advanced", "blocked"),
    },
    contractPass: simulation?.contractPass ?? 0,
    deterministicPass: simulation?.deterministicPass ?? 0,
    lineagePass: simulation?.lineagePass ?? 0,
    tierDifferentiationFailures: simulation?.differentiationFailures ?? null,
    localeFailures: simulation?.localeFailures ?? null,
    boundaryTests: boundaries ? { tests: boundaries.tests, passed: boundaries.passed, failed: boundaries.failed } : null,
    truthBoundary: "The 900 rows are synthetic deterministic simulations. They are not current provider-bound canonical outputs and do not reduce the 0/2700 execution blocker.",
  },
  currentDataReadiness: {
    realMarketsCatalogRows: catalog?.counts?.total ?? 0,
    catalogAdapterStates: adapterStates,
    canonicalProviderBoundMarketOutputs: 0,
    paidTierSellReadyEvidence: 0,
    blocker: "The adapter is ready to consume evidence, but provider/freshness/license/identity packets have not been executed source-bound for the 100 market cases.",
  },
  currentLanguageReadiness: {
    adapterLocalesContractProven: ["pl", "en", "de"],
    adapterLocaleSimulationFailures: simulation?.localeFailures ?? null,
    applicationTotalKeys: i18n?.summary?.totalKeys ?? i18n?.totalKeys ?? null,
    applicationLikelyUntranslated: i18n?.summary?.likelyUntranslated ?? i18n?.likelyUntranslated ?? null,
    applicationLikelyUntranslatedPercent: i18n?.summary?.likelyUntranslatedPercent ?? i18n?.likelyUntranslatedPercent ?? null,
    blocker: "Adapter copy is locale-distinct, but the wider application translation debt remains open.",
  },
  currentDatabaseReadiness: {
    migrationCount: database?.summary?.migrationFiles ?? database?.migrationFiles ?? null,
    tablesWithRls: database?.summary?.tablesWithRls ?? database?.tablesWithRls ?? null,
    stagingExecution: "NOT_EXECUTED",
    newPass17Boundary: "Only redacted adapter receipts and hashes may be persisted; raw licensed payload storage is constrained false.",
  },
  currentBuildGraph: {
    nextEntrypoints: graph?.comparison?.pass15Entrypoints ?? null,
    apiRoutes: graph?.comparison?.pass15ApiRoutes ?? null,
    buildProofForCurrentSource: "MISSING_EXACT_RUNTIME_CACHE_BUNDLE",
  },
  sellReadiness: {
    basic: "NOT_CANONICALLY_PROVEN",
    pro: "NO_GO",
    advanced: "NO_GO",
    reasons: [
      "0/2700 provider-bound canonical outputs executed",
      "Only 2/6 output adapters implemented",
      "No exact-runtime semantic TypeScript/lint/test for the PASS17 SHA",
      "No successful Webpack/Turbopack build for the PASS17 SHA",
      "No browser/PDF parity, staging providers, payments or reviewer SLA proof"
    ]
  },
  nextEvidenceOrder: [
    "Implement smart-contract audit and Lens/PDF adapters against the same output contract",
    "Implement VLM Brain and Angel adapters",
    "Close application-wide PL/EN/DE translation debt and provider/license cells",
    "Recover exact Node 24.18.0/npm 11.16.0 plus dependency cache",
    "Run one semantic TypeScript/lint/test milestone on the frozen implementation SHA",
    "Run one Webpack and one Turbopack build",
    "Run browser/WCAG/PDF parity once",
    "Generate and score all 2700 provider-bound canonical outputs once",
    "Proceed to staging and LIVE only after source-bound offline gates pass"
  ],
  truthBoundary: "Adapter implementation is real code, but synthetic fixtures, static SQL and prepared gates never count as provider, staging, paid-product or LIVE proof."
};
const out = path.join(root, ".velmere/pass17-diagnostics/current-product-readiness.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  adapters: `${report.adapterImplementation.implementedCount}/${report.adapterImplementation.totalCount}`,
  simulatedRows: simulation?.matrixRowsExecuted ?? 0,
  canonicalExecuted: report.sourceBoundCanonicalCorpus.executed,
  pro: report.sellReadiness.pro,
  advanced: report.sellReadiness.advanced,
}, null, 2));
