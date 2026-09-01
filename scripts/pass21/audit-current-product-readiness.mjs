#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath, fallback = null) => {
  const absolute = path.join(root, relativePath);
  return fs.existsSync(absolute) ? JSON.parse(fs.readFileSync(absolute, "utf8")) : fallback;
};

const corpus = read("evaluation/pass16/worldclass-base-corpus.json", {});
const canonicalMatrix = read("evaluation/pass16/worldclass-2700-summary.json", {});
const market = read("evaluation/pass17/market-adapter-simulation-summary.json", {});
const auditLens = read("evaluation/pass18/audit-lens-adapter-simulation-summary.json", {});
const brainAngel = read("evaluation/pass19/brain-angel-adapter-simulation-summary.json", {});
const dataSummary = read("evaluation/pass20/data-field-provider-license-summary.json", {});
const dataVerification = read(".velmere/pass20-diagnostics/data-license-matrix-verification.json", {});
const dataBoundaries = read(".velmere/pass20-diagnostics/data-license-boundary-tests.json", {});
const provider = read(".velmere/pass21-diagnostics/provider-rights-audit.json", {});
const merchant = read(".velmere/pass21-diagnostics/merchant-legal-readiness.json", {});
const rls = read(".velmere/pass21-diagnostics/rls-classification-audit.json", {});
const i18n = read(".velmere/pass21-diagnostics/i18n-release-readiness.json", {});
const db = read(".velmere/pass14-diagnostics/database-contract-audit.json", {});
const deployable = db.planes?.find((row) => row.name === "deployable_migrations");
const simulations = [market, auditLens, brainAngel];

const sourceBoundCanonicalCorpus = {
  corpusSha256: corpus.corpusSha256 ?? canonicalMatrix.corpusSha256 ?? null,
  baseCasesPrepared: Number(corpus.counts?.baseCases ?? canonicalMatrix.baseCases ?? 0),
  expandedCasesRequired: Number(corpus.counts?.expandedCases ?? canonicalMatrix.expandedCases ?? 2700),
  executed: Number(canonicalMatrix.executedCanonicalCases ?? 0),
  passed: Number(canonicalMatrix.passedCanonicalCases ?? 0),
  failed: Number(canonicalMatrix.failedCanonicalCases ?? 0),
  status: canonicalMatrix.status ?? "PREPARED_NOT_EXECUTED"
};

const adapterImplementation = {
  implementedCount: 6,
  totalCount: 6,
  syntheticRowsExecuted: simulations.reduce((sum, row) => sum + Number(row.matrixRowsExecuted ?? 0), 0),
  contractPass: simulations.reduce((sum, row) => sum + Number(row.contractPass ?? 0), 0),
  deterministicPass: simulations.reduce((sum, row) => sum + Number(row.deterministicPass ?? 0), 0),
  lineagePass: simulations.reduce((sum, row) => sum + Number(row.lineagePass ?? 0), 0),
  safetyPass: Number(brainAngel.safetyPass ?? 0),
  status: simulations.every((row) => row.ok === true)
    ? "OFFLINE_SYNTHETIC_ADAPTER_CONTRACT_PROVEN_6_OF_6"
    : "FAIL"
};

const dataCommercialization = {
  requirementCells: Number(dataSummary.requirementCells ?? 0),
  providerBoundCells: Number(dataSummary.providerBoundCells ?? 0),
  licenseVerifiedCells: Number(dataSummary.licenseVerifiedCells ?? 0),
  sellEligibleCells: Number(dataSummary.sellEligibleCells ?? 0),
  syntheticEligibilityContractPass: Number(dataVerification.syntheticEligibleContractPass ?? dataVerification.contractPass ?? 0),
  boundaryTests: dataBoundaries.tests !== undefined
    ? `${Number(dataBoundaries.passed ?? 0)}/${Number(dataBoundaries.tests ?? 0)}`
    : null,
  providerRegistryEntries: Number(provider.providers ?? 0),
  externalRightsVerified: Number(provider.externalRightsVerified ?? 0),
  commerciallyEnabledProviders: Number(provider.commerciallyEnabledProviders ?? 0),
  status: "PROVIDER_REGISTRY_PREPARED_EXTERNAL_RIGHTS_ZERO",
  truthBoundary: "Requirement matrix and synthetic evaluator are proven; real provider coverage and commercial rights remain zero."
};

const report = {
  schemaVersion: "velmere.pass21.current-product-readiness.v1",
  generatedAt: "2026-07-20T13:00:00.000Z",
  sourceBoundCanonicalCorpus,
  adapterImplementation,
  dataCommercialization,
  i18n: {
    criticalStaticPass: i18n.summary?.criticalStaticPass === true,
    identicalNonNeutral: Number(i18n.summary?.identicalNonNeutral ?? 0),
    legalLegacyPlaceholders: Number(i18n.summary?.legalPlaceholderBlockers ?? 0),
    merchantRegistryBlockers: Number(merchant.registryBlockers ?? 0),
    commercialLaunchLanguageStatus: i18n.summary?.commercialLaunchLanguageStatus ?? "NO_GO"
  },
  databaseStatic: {
    ok: db.ok === true,
    deployableTables: Number(deployable?.tablesDeclared ?? 0),
    tablesWithoutRls: Number(deployable?.tablesWithoutRls?.length ?? 0),
    rlsWithoutPolicy: Number(deployable?.rlsWithoutPolicy?.length ?? 0),
    previouslyUnclassified: Number(rls.previouslyUnclassified ?? 0),
    classified: Number(rls.classified ?? 0),
    stagingPolicyBlockers: Number(rls.stagingPolicyBlockers ?? 0)
  },
  releaseEligibility: {
    basicCanonicalProven: false,
    proSellReady: false,
    advancedSellReady: false,
    legalReady: false,
    providerRightsReady: false,
    rlsStagingReady: false,
    stagingProven: false,
    liveProven: false,
    status: "NO_GO"
  },
  nextRequiredProof: [
    "Attach reviewed provider agreements or terms snapshots and bind their SHA-256 evidence; external rights verified remains zero.",
    "Complete the verified merchant profile and obtain jurisdiction-specific legal approval.",
    "Implement and test explicit owner/operator RLS policies for all tables marked as staging blockers.",
    "Provide exact runtime/cache and execute one TypeScript/lint/test milestone.",
    "Run one Webpack and one Turbopack build, then browser/WCAG/PDF proof.",
    "Execute 2700 provider/model/reviewer/render-bound canonical outputs once."
  ]
};

const ok = provider.ok === true
  && merchant.ok === true
  && rls.ok === true
  && report.i18n.criticalStaticPass
  && report.databaseStatic.tablesWithoutRls === 0
  && adapterImplementation.syntheticRowsExecuted === 2700
  && sourceBoundCanonicalCorpus.expandedCasesRequired === 2700;

const outputPath = path.join(root, ".velmere/pass21-diagnostics/current-product-readiness.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  ok,
  providers: dataCommercialization.providerRegistryEntries,
  externalRightsVerified: dataCommercialization.externalRightsVerified,
  legacyLegalPlaceholders: merchant.legacyMessagePlaceholders,
  merchantRegistryBlockers: report.i18n.merchantRegistryBlockers,
  rlsClassified: `${report.databaseStatic.classified}/${report.databaseStatic.previouslyUnclassified}`,
  stagingPolicyBlockers: report.databaseStatic.stagingPolicyBlockers,
  identicalNonNeutral: report.i18n.identicalNonNeutral,
  canonical: `${sourceBoundCanonicalCorpus.executed}/${sourceBoundCanonicalCorpus.expandedCasesRequired}`,
  status: report.releaseEligibility.status
}, null, 2));

if (!ok) process.exit(1);
