#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const corpus = JSON.parse(fs.readFileSync(path.join(root, "evaluation/pass16/worldclass-base-corpus.json"), "utf8"));
const matrixSummary = JSON.parse(fs.readFileSync(path.join(root, "evaluation/pass16/worldclass-2700-summary.json"), "utf8"));
const historical = JSON.parse(fs.readFileSync(path.join(root, "evaluation/VELMERE_PASS4640_120_CASE_SUMMARY.json"), "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(root, "data/real-markets-customer-catalog.json"), "utf8"));
const i18nPath = path.join(root, ".velmere/pass14-diagnostics/i18n-semantic-parity.json");
const i18n = fs.existsSync(i18nPath) ? JSON.parse(fs.readFileSync(i18nPath, "utf8")) : null;
const graph = JSON.parse(fs.readFileSync(path.join(root, "config/pass15/lazy-build-surface-profile.json"), "utf8"));

const historicalPaidSuccess = Object.values({
  shieldPro: historical.shield?.statusByDepth?.pro?.["200"] ?? 0,
  shieldAdvanced: historical.shield?.statusByDepth?.advanced?.["200"] ?? 0,
  realPro: historical.realMarkets?.statusByDepth?.pro?.["200"] ?? 0,
  realAdvanced: historical.realMarkets?.statusByDepth?.advanced?.["200"] ?? 0,
  pdfPro: historical.pdf?.proValidPdf ?? 0,
  pdfAdvanced: historical.pdf?.advancedValidPdf ?? 0,
  auditPro: historical.audit?.statusByDepth?.pro?.["200"] ?? 0,
  auditAdvanced: historical.audit?.statusByDepth?.advanced?.["200"] ?? 0,
}).reduce((sum, value) => sum + Number(value || 0), 0);

const adapterStates = {};
for (const row of catalog.rows ?? []) adapterStates[row.adapterState] = (adapterStates[row.adapterState] ?? 0) + 1;
const report = {
  schemaVersion: "velmere.pass16.current-product-readiness.v1",
  generatedAt: new Date().toISOString(),
  sourceBoundCanonicalCorpus: {
    corpusSha256: corpus.corpusSha256,
    baseCasesPrepared: corpus.counts.baseCases,
    expandedCasesRequired: corpus.counts.expandedCases,
    executed: matrixSummary.executedCanonicalCases,
    passed: matrixSummary.passedCanonicalCases,
    status: matrixSummary.status,
  },
  historicalEvidenceNotCanonicalPass16: {
    observations: historical.executed,
    surfaces: ["shield", "real_markets", "lens_pdf", "smart_contract_audit"],
    uniqueInputsPerSurface: 10,
    localesCovered: ["en"],
    paidSuccessfulOutputs: historicalPaidSuccess,
    note: "PASS4640 is retained as historical regression evidence only. It does not satisfy any PASS16 matrix row because case IDs, locale matrix and source SHA are different.",
  },
  currentDataReadiness: {
    realMarketsCatalogRows: catalog.counts?.total ?? 0,
    adapterStates,
    paidTierSellReadyEvidence: 0,
    blocker: "Provider, freshness, license and second-source cells are not source-bound as complete for the PASS16 corpus.",
  },
  currentLanguageReadiness: {
    totalKeys: i18n?.summary?.totalKeys ?? i18n?.totalKeys ?? null,
    likelyUntranslated: i18n?.summary?.likelyUntranslated ?? i18n?.likelyUntranslated ?? null,
    likelyUntranslatedPercent: i18n?.summary?.likelyUntranslatedPercent ?? i18n?.likelyUntranslatedPercent ?? null,
    blocker: "Canonical outputs require PL/EN/DE without silent English fallback.",
  },
  currentBuildGraph: {
    nextEntrypoints: graph.comparison?.pass15Entrypoints,
    apiRoutes: graph.comparison?.pass15ApiRoutes,
    staticEntrypointReductionPercent: graph.comparison?.entrypointReductionPercent,
    buildProofForCurrentSource: "MISSING_EXACT_RUNTIME_CACHE_BUNDLE",
  },
  sellReadiness: {
    basic: "NOT_CANONICALLY_PROVEN",
    pro: "NO_GO",
    advanced: "NO_GO",
    reasons: [
      "0/2700 PASS16 canonical outputs executed",
      "0 historical paid successes in PASS4640",
      "No source-bound full PL/EN/DE matrix",
      "No successful production build for the current source",
      "No browser/PDF parity, staging providers, payments or human-review SLA proof",
    ],
  },
  nextEvidenceOrder: [
    "Implement and freeze all six output adapters against the PASS16 case contract",
    "Recover exact Node 24.18.0/npm 11.16.0 and dependency cache",
    "Run one milestone TypeScript/lint/test on the final implementation SHA",
    "Run one Webpack and one Turbopack build",
    "Run one production browser/WCAG/PDF parity wave",
    "Generate all 2700 canonical outputs once",
    "Score failures, fix product logic, rerun only failed slices, then one final full matrix",
    "Proceed to staging and LIVE only after offline gates are source-bound PASS",
  ],
  truthBoundary: "Prepared corpus and historical tests are not sell-ready, staging-ready or LIVE proof.",
};
const out = path.join(root, ".velmere/pass16-diagnostics/current-product-readiness.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  baseCasesPrepared: report.sourceBoundCanonicalCorpus.baseCasesPrepared,
  expandedCasesRequired: report.sourceBoundCanonicalCorpus.expandedCasesRequired,
  canonicalExecuted: report.sourceBoundCanonicalCorpus.executed,
  historicalObservations: report.historicalEvidenceNotCanonicalPass16.observations,
  historicalPaidSuccess: report.historicalEvidenceNotCanonicalPass16.paidSuccessfulOutputs,
  pro: report.sellReadiness.pro,
  advanced: report.sellReadiness.advanced,
}, null, 2));
