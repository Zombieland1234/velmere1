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
const market = read("evaluation/pass17/market-adapter-simulation-summary.json");
const marketBoundaries = read(".velmere/pass17-diagnostics/market-output-adapter-boundary-tests.json");
const auditLens = read("evaluation/pass18/audit-lens-adapter-simulation-summary.json");
const auditLensBoundaries = read(".velmere/pass18-diagnostics/audit-lens-output-adapter-boundary-tests.json");
const catalog = read("data/real-markets-customer-catalog.json", { rows: [], counts: {} });
const i18n = read(".velmere/pass14-diagnostics/i18n-semantic-parity.json");
const graph = read("config/pass15/lazy-build-surface-profile.json");
const database = read(".velmere/pass14-diagnostics/database-contract-audit.json");
function statusCount(simulation, surface, tier, status) { return Number(simulation?.byStatus?.[`${surface}:${tier}:${status}`] ?? 0); }
function surfaceSummary(simulation, surface) {
  return {
    baseCases: 50,
    simulatedRows: 450,
    passed: ["basic", "pro", "advanced"].reduce((sum, tier) => sum + statusCount(simulation, surface, tier, "passed"), 0),
    safelyBlocked: ["basic", "pro", "advanced"].reduce((sum, tier) => sum + statusCount(simulation, surface, tier, "blocked"), 0),
  };
}
const report = {
  schemaVersion: "velmere.pass18.current-product-readiness.v1",
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
    implementedSurfaces: ["shield", "real_markets", "smart_contract_audit", "lens_pdf"],
    pendingSurfaces: ["vlm_brain", "angel"],
    implementedCount: 4,
    totalCount: 6,
    syntheticRowsExecuted: Number(market?.matrixRowsExecuted ?? 0) + Number(auditLens?.matrixRowsExecuted ?? 0),
    status: market?.ok && auditLens?.ok && marketBoundaries?.ok && auditLensBoundaries?.ok ? "OFFLINE_SYNTHETIC_ADAPTER_CONTRACT_PROVEN_4_OF_6" : "FAIL",
    shield: surfaceSummary(market, "shield"),
    realMarkets: surfaceSummary(market, "real_markets"),
    smartContractAudit: surfaceSummary(auditLens, "smart_contract_audit"),
    lensPdf: surfaceSummary(auditLens, "lens_pdf"),
    smartContractAdvancedWithoutRealHumanReviewSafelyBlocked: auditLens?.advancedAuditSafelyBlockedWithoutRealHumanReview ?? null,
    contractPass: Number(market?.contractPass ?? 0) + Number(auditLens?.contractPass ?? 0),
    deterministicPass: Number(market?.deterministicPass ?? 0) + Number(auditLens?.deterministicPass ?? 0),
    lineagePass: Number(market?.lineagePass ?? 0) + Number(auditLens?.lineagePass ?? 0),
    boundaryTests: {
      market: marketBoundaries ? { tests: marketBoundaries.tests, passed: marketBoundaries.passed, failed: marketBoundaries.failed } : null,
      auditLens: auditLensBoundaries ? { tests: auditLensBoundaries.tests, passed: auditLensBoundaries.passed, failed: auditLensBoundaries.failed } : null,
    },
    truthBoundary: "The 1800 rows are synthetic deterministic adapter simulations. They are not current provider/reviewer/render-bound canonical outputs and do not reduce the 0/2700 execution blocker.",
  },
  smartContractAuditReadiness: {
    fixtures: 50,
    adapter: "IMPLEMENTED_SYNTHETIC_CONTRACT_PROVEN",
    detectorPrecisionRecall: "NOT_MEASURED",
    realHumanReviewReceipts: 0,
    advancedSellReady: false,
    blocker: "Expected fixture labels validate the adapter boundary only. Hidden detector corpus, precision/recall, severity agreement and real-human reviewer authority remain missing.",
  },
  lensPdfReadiness: {
    fixtures: 50,
    adapter: "IMPLEMENTED_SYNTHETIC_CANONICAL_PAYLOAD_PARITY_PROVEN",
    canonicalHashParityRows: auditLens?.matrixRowsExecuted ?? 0,
    renderedBrowserPdfs: 0,
    customerDeliveryTriplets: 0,
    blocker: "Canonical payload parity is not rendered Chromium/WebKit PDF parity or delivery proof. Build, browser rendering and account delivery remain missing.",
  },
  currentDataReadiness: {
    realMarketsCatalogRows: catalog?.counts?.total ?? 0,
    canonicalProviderReviewerRenderBoundOutputs: 0,
    paidTierSellReadyEvidence: 0,
  },
  currentLanguageReadiness: {
    adapterLocalesContractProven: ["pl", "en", "de"],
    applicationTotalKeys: i18n?.summary?.totalKeys ?? i18n?.totalKeys ?? null,
    applicationLikelyUntranslated: i18n?.summary?.likelyUntranslated ?? i18n?.likelyUntranslated ?? null,
    applicationLikelyUntranslatedPercent: i18n?.summary?.likelyUntranslatedPercent ?? i18n?.likelyUntranslatedPercent ?? null,
    blocker: "Adapter copy is locale-distinct, but the wider application translation debt remains open.",
  },
  currentDatabaseReadiness: {
    migrationCount: database?.summary?.migrationFiles ?? database?.migrationFiles ?? null,
    tablesWithRls: database?.summary?.tablesWithRls ?? database?.tablesWithRls ?? null,
    stagingExecution: "NOT_EXECUTED",
    pass18Boundary: "Only redacted hashes and release metadata may be persisted. Raw contract source, provider payloads and PDF blobs are constrained false.",
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
      "0/2700 provider/reviewer/render-bound canonical outputs executed",
      "Only 4/6 output adapters implemented",
      "No hidden detector precision/recall benchmark or real-human Advanced review receipts",
      "No rendered browser PDF triplet parity",
      "No exact-runtime semantic TypeScript/lint/test for the PASS18 SHA",
      "No successful Webpack/Turbopack build, browser, staging or LIVE proof"
    ]
  },
  nextEvidenceOrder: [
    "Implement VLM Brain and Angel adapters against the same output contract",
    "Close application-wide PL/EN/DE translation debt and provider/license cells",
    "Recover exact Node 24.18.0/npm 11.16.0 plus dependency cache",
    "Run one semantic TypeScript/lint/test milestone on the frozen six-adapter SHA",
    "Run one Webpack and one Turbopack build",
    "Run browser/WCAG and rendered PDF preview/download/account parity once",
    "Generate and score all 2700 provider/reviewer/render-bound canonical outputs once",
    "Run hidden smart-contract detector benchmark and independent human-review workflow",
    "Proceed to staging and LIVE only after source-bound offline gates pass"
  ],
  truthBoundary: "Adapter implementation is real code, but synthetic fixtures, expected labels, static SQL and prepared gates never count as detector quality, real human review, rendered PDF, provider, staging, paid-product or LIVE proof."
};
const out = path.join(root, ".velmere/pass18-diagnostics/current-product-readiness.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ adapters: `${report.adapterImplementation.implementedCount}/${report.adapterImplementation.totalCount}`, simulatedRows: report.adapterImplementation.syntheticRowsExecuted, canonicalExecuted: report.sourceBoundCanonicalCorpus.executed, humanReviews: report.smartContractAuditReadiness.realHumanReviewReceipts, renderedPdfs: report.lensPdfReadiness.renderedBrowserPdfs, pro: report.sellReadiness.pro, advanced: report.sellReadiness.advanced }, null, 2));
