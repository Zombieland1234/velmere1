#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath, fallback = {}) => {
  const absolute = path.join(root, relativePath);
  return fs.existsSync(absolute) ? JSON.parse(fs.readFileSync(absolute, "utf8")) : fallback;
};
const count = (value) => Array.isArray(value) ? value.length : Number(value ?? 0);

const corpus = read("evaluation/pass16/worldclass-base-corpus.json");
const canonical = read("evaluation/pass16/worldclass-2700-summary.json");
const market = read("evaluation/pass17/market-adapter-simulation-summary.json");
const auditLens = read("evaluation/pass18/audit-lens-adapter-simulation-summary.json");
const brainAngel = read("evaluation/pass19/brain-angel-adapter-simulation-summary.json");
const dataSummary = read("evaluation/pass20/data-field-provider-license-summary.json");
const dataVerify = read(".velmere/pass20-diagnostics/data-license-matrix-verification.json");
const provider = read(".velmere/pass23-diagnostics/provider-rights-reconciliation.json");
const providerRegistry = read("config/pass21/provider-commercial-rights-registry.json", { providers: [] });
const merchant = read(".velmere/pass23-diagnostics/merchant-legal-intake-audit.json");
const i18n = read(".velmere/pass23-diagnostics/i18n-release-readiness.json");
const nativeReview = read(".velmere/pass23-diagnostics/native-review-overflow-preparation.json");
const rlsStatic = read(".velmere/pass22-diagnostics/owner-operator-rls-audit.json");
const rlsHarness = read(".velmere/pass23-diagnostics/rls-staging-harness-verification.json");
const db = read(".velmere/pass14-diagnostics/database-contract-audit.json");
const syntax = read(".velmere/pass23-diagnostics/typescript-syntax-scan.json");

const deployable = db.planes?.find((row) => row.name === "deployable_migrations") ?? {};
const simulations = [market, auditLens, brainAngel];
const required = Number(corpus.counts?.expandedCases ?? canonical.expandedCases ?? 2700);
const executed = Number(canonical.executedCanonicalCases ?? canonical.executed ?? 0);
const synthetic = simulations.reduce((sum, row) => sum + Number(row.matrixRowsExecuted ?? 0), 0);
const expectedProviderCount = Array.isArray(providerRegistry.providers) ? providerRegistry.providers.length : 0;
const registeredProviderCount = Number(provider.summary?.registered ?? 0);
const nativePrimaryStatus = nativeReview.nativeReviewStatus?.primary ?? "UNKNOWN";
const nativeSupplementalStatus = nativeReview.nativeReviewStatus?.supplemental ?? "UNKNOWN";
const overflowPlanned = Number(nativeReview.overflowPlanned ?? 0);
const overflowExecuted = Number(nativeReview.overflowExecuted ?? 0);

const report = {
  schemaVersion: "velmere.pass23.current-product-readiness.v2",
  generatedAt: new Date().toISOString(),
  truthBoundary: "PASS23 proves only internally consistent static/source preparation against current source-bound denominators. Zero real provider rights, zero canonical runtime outputs, pending native review, zero browser overflow execution and zero RLS staging cases remain explicit NO-GO boundaries. RLS-enabled tables with no policy are reported as default-deny observations and receive no tenant-isolation credit until staging replay.",
  canonical: {
    required,
    executed,
    passed: Number(canonical.passedCanonicalCases ?? 0),
    failed: Number(canonical.failedCanonicalCases ?? 0),
    status: canonical.status ?? "PREPARED_NOT_EXECUTED",
  },
  adapters: {
    implemented: "6/6",
    syntheticRows: synthetic,
    contractPass: simulations.reduce((sum, row) => sum + Number(row.contractPass ?? 0), 0),
    deterministicPass: simulations.reduce((sum, row) => sum + Number(row.deterministicPass ?? 0), 0),
    lineagePass: simulations.reduce((sum, row) => sum + Number(row.lineagePass ?? 0), 0),
    status: simulations.every((row) => row.ok === true) ? "SYNTHETIC_CONTRACT_PASS" : "FAIL",
  },
  dataCommercialization: {
    requirementCells: Number(dataSummary.requirementCells ?? 0),
    providerBoundCells: Number(dataSummary.providerBoundCells ?? 0),
    licenseVerifiedCells: Number(dataSummary.licenseVerifiedCells ?? 0),
    sellEligibleCells: Number(dataSummary.sellEligibleCells ?? 0),
    syntheticEligibilityPass: Number(dataVerify.syntheticEligibleContractPass ?? dataVerify.contractPass ?? 0),
    providersExpectedFromRegistry: expectedProviderCount,
    providersRegistered: registeredProviderCount,
    rightsEvidenceRecords: Number(provider.summary?.evidenceRecords ?? 0),
    externalRightsVerified: Number(provider.summary?.approved ?? 0),
    commerciallyEnabledProviders: Number(provider.summary?.commerciallyEnabled ?? 0),
  },
  legal: {
    merchantIntakeValid: merchant.ok === true,
    merchantMissingFields: Number(merchant.missing?.length ?? 0),
    commercialReady: merchant.commercialReady === true,
    legalReady: false,
  },
  i18n: {
    keyParity: i18n.summary?.keyParity === true,
    criticalStaticPass: i18n.summary?.criticalStaticPass === true,
    effectiveDraftTranslations: Number(i18n.summary?.draftTranslationCount ?? 0),
    identicalNonNeutral: Number(i18n.summary?.identicalNonNeutral ?? -1),
    criticalLeaks: Number(i18n.summary?.criticalEnglishLeakCandidates ?? -1),
    legalPlaceholderBlockers: Number(i18n.summary?.legalPlaceholderBlockers ?? 0),
    nativePrimaryReview: nativePrimaryStatus,
    nativeSupplementalReview: nativeSupplementalStatus,
    overflowCasesPlanned: overflowPlanned,
    overflowCasesExecuted: overflowExecuted,
  },
  database: {
    auditOk: db.ok === true,
    migrationFiles: Number(deployable.files ?? 0),
    tablesDeclared: Number(deployable.tablesDeclared ?? 0),
    tablesWithoutRls: count(deployable.tablesWithoutRls),
    serviceRoleOnlyTables: count(deployable.serviceRoleOnlyTables),
    rlsDefaultDenyNoPolicyTables: count(deployable.rlsWithoutPolicyAndNotServiceRoleOnly),
    ownerOperatorPolicies: `${Number(rlsStatic.policiesFound ?? 0)}/${Number(rlsStatic.expectedPolicies ?? 0)}`,
    multiUserCasesPrepared: Number(rlsHarness.summary?.cases ?? 0),
    multiUserCasesExecuted: Number(rlsHarness.summary?.executed ?? 0),
    multiUserCasesPassed: Number(rlsHarness.summary?.passed ?? 0),
    stagingProven: false,
  },
  syntax: {
    scope: syntax.scope ?? null,
    files: Number(syntax.files ?? 0),
    parseErrors: Number(syntax.parseErrors ?? -1),
    semanticTypecheckProven: false,
  },
  releaseEligibility: {
    basicCanonicalProven: false,
    proSellReady: false,
    advancedSellReady: false,
    providerRightsReady: false,
    merchantLegalReady: false,
    nativeLanguageReady: false,
    rlsStagingReady: false,
    buildProven: false,
    stagingProven: false,
    liveProven: false,
    status: "NO_GO",
  },
  nextRequiredProof: [
    "Run one exact Node 24.18.0/npm 11.16.0 semantic TypeScript/lint/test milestone on this exact source SHA.",
    "Obtain Webpack and Turbopack RC=0 for one exact source SHA.",
    "Execute 19 multi-user RLS cases on disposable staging Postgres/Supabase.",
    `Complete native PL/DE review and all ${overflowPlanned} governed browser overflow cases.`,
    `Attach reviewed external provider documents; rights remain ${Number(provider.summary?.approved ?? 0)}/${expectedProviderCount} until evidence hashes are promoted.`,
    "Complete verified merchant identity and jurisdiction-specific legal approval.",
    `Execute ${required} provider/model/reviewer/renderer-bound canonical outputs, then independent validation and LIVE cohorts.`,
  ],
};

const structuralOk =
  provider.ok === true &&
  expectedProviderCount > 0 &&
  registeredProviderCount === expectedProviderCount &&
  Number(provider.summary?.approved ?? -1) === 0 &&
  merchant.ok === true &&
  merchant.commercialReady === false &&
  report.i18n.keyParity &&
  report.i18n.criticalStaticPass &&
  report.i18n.effectiveDraftTranslations === 659 &&
  report.i18n.identicalNonNeutral === 0 &&
  report.i18n.criticalLeaks === 0 &&
  report.i18n.nativePrimaryReview === "PENDING_NATIVE_REVIEW" &&
  report.i18n.nativeSupplementalReview === "PENDING_NATIVE_REVIEW" &&
  report.i18n.overflowCasesPlanned === 659 &&
  report.i18n.overflowCasesExecuted === 0 &&
  report.database.auditOk &&
  report.database.tablesWithoutRls === 0 &&
  report.database.ownerOperatorPolicies === "19/19" &&
  report.database.multiUserCasesPrepared === 19 &&
  report.database.multiUserCasesExecuted === 0 &&
  report.syntax.scope === "GIT_TRACKED_TYPESCRIPT_RELEASE_SOURCE" &&
  report.syntax.parseErrors === 0 &&
  synthetic === 2700 &&
  required === 2700 &&
  report.dataCommercialization.requirementCells === 7750 &&
  executed === 0;

const output = path.join(root, ".velmere/pass23-diagnostics/current-product-readiness.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  ok: structuralOk,
  providers: `${report.dataCommercialization.externalRightsVerified}/${report.dataCommercialization.providersRegistered}`,
  merchantMissing: report.legal.merchantMissingFields,
  i18nDrafts: report.i18n.effectiveDraftTranslations,
  nativeReview: `${report.i18n.nativePrimaryReview}/${report.i18n.nativeSupplementalReview}`,
  overflow: `${report.i18n.overflowCasesExecuted}/${report.i18n.overflowCasesPlanned}`,
  rlsServiceRoleOnly: report.database.serviceRoleOnlyTables,
  rlsDefaultDenyNoPolicy: report.database.rlsDefaultDenyNoPolicyTables,
  rlsStaging: `${report.database.multiUserCasesExecuted}/${report.database.multiUserCasesPrepared}`,
  syntax: `${report.syntax.parseErrors} errors / ${report.syntax.files} files`,
  canonical: `${executed}/${required}`,
  status: report.releaseEligibility.status,
}, null, 2));
if (!structuralOk) process.exit(1);
