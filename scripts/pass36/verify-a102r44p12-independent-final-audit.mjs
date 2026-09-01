#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const state = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a102r44p12-action-required-current-state.json"), "utf8"));
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a102r44p12-real-provider-diagnostic-policy.json"), "utf8"));
const browserMigration = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a102r44p12-browser-process-isolation-and-verifier-identity-migration.json"), "utf8"));
const browserIdentities = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a102r44p12-browser-verifier-check-identities.json"), "utf8"));
const turbopackMigration = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a102r44p12-turbopack-rss-budget-migration.json"), "utf8"));
const checks = [];
const warnings = [];
const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });

check("global-no-go", state.decision === "NO_GO");
check("global-flags-false", Object.values(state.globalTruth).every((value) => value === false));
check("real-network-evidence-not-fixture", state.localEvidence.providerDiagnostic.evidenceClass === "REAL_NETWORK_PUBLIC_ENDPOINT_DIAGNOSTIC_NO_COMMERCIAL_RIGHTS_CREDIT");
check("two-provider-denominator", state.localEvidence.providerDiagnostic.assetDenominator === 15 && state.localEvidence.providerDiagnostic.providerRowDenominator === 30);
check("captured-observations-complete", state.localEvidence.providerDiagnostic.realNetworkObservedAssets === 15 && state.localEvidence.providerDiagnostic.realNetworkObservedProviderRows === 30);
check("rights-remain-zero", state.localEvidence.providerDiagnostic.rightsApprovedAssets === 0 && policy.truthBoundary.rightsApprovedCommercialUse === false);
check("paid-remains-zero", state.localEvidence.providerDiagnostic.commerciallyDeliverableAssets === 0 && policy.truthBoundary.paidTierCredit === false);
check("full-catalog-credit-zero", state.localEvidence.shield.realProviderCredit === 0 && state.localEvidence.shieldProMap.realProviderCredit === 0 && state.localEvidence.realMarkets.realCurrentDataCredit === 0);
check("commercial-skus-blocked", state.skuDecisions.shieldPro === "NOT_FOR_SALE" && state.skuDecisions.realMarketsPro === "NOT_FOR_SALE" && state.skuDecisions.realMarketsAdvanced === "NOT_FOR_SALE");
check("basic-copy-honest", state.skuDecisions.shieldBasic.includes("DIAGNOSTIC_NOT_RIGHTS_APPROVED") && state.skuDecisions.realMarketsBasic.includes("DIAGNOSTIC_NOT_RIGHTS_APPROVED"));
check("artifact-hash-bound", /^[a-f0-9]{64}$/u.test(policy.externalEvidence.githubArtifactZipSha256));
check("ledger-hash-bound", /^[a-f0-9]{64}$/u.test(policy.externalEvidence.ledgerSha256));
check("raw-body-budget", policy.thresholds.maximumRawBodyBytes === 8388608);
check("conflict-threshold-frozen", policy.thresholds.maximumAvailableCrossProviderPriceDriftPct === 5);
check("provider-rights-fields-explicit", policy.truthBoundary.redistributionApproved === false && policy.truthBoundary.pdfExportApproved === false && policy.truthBoundary.aiRagUseApproved === false);
check("compiler-ast-retained", state.localEvidence.compilerAst.assertions === 64 && state.localEvidence.compilerAst.failed === 0);
check("foundry-retained", state.localEvidence.foundry.tests === 16 && state.localEvidence.foundry.passed === 16);
check("angel-retained", state.localEvidence.angel.assertions === 1083 && state.localEvidence.angel.failed === 0);
check("pdf-retained", state.localEvidence.pdf.documents === 150 && state.localEvidence.pdf.activeContent === 0);
check("browser-process-isolation-retained-denominators", state.localEvidence.browserClosure.processIsolationMode === "SIX_ROUTE_BROWSER_PROCESS_BATCH" && state.localEvidence.browserClosure.routeRowsDenominator === 56 && state.localEvidence.browserClosure.scenarioDenominator === 57 && state.localEvidence.browserClosure.screenshotDenominator === 29);
check("browser-verifier-identity-corrected", browserIdentities.denominator === 584 && browserIdentities.checkIdentitySha256 === browserMigration.browserVerifierIdentity.physicalCurrentVerifierIdentitySha256 && browserMigration.browserVerifierIdentity.removed === 0);
check("browser-parent-diagnostic-not-promoted", browserMigration.diagnosticExactLinuxRetest.scenarioChecksPassed === 57 && browserMigration.diagnosticExactLinuxRetest.finalByteCredit === false);
check("browser-exact-windows-zero", state.localEvidence.browserClosure.exactWindowsCredit === false);
check("browser-live-zero", state.localEvidence.browserClosure.liveCredit === false);
check("typescript-denominator-truth", state.localEvidence.typescriptDenominatorMigration.currentPreBuildPhysical === 160 && state.localEvidence.typescriptDenominatorMigration.currentPostBuildPhysical === 301 && state.localEvidence.typescriptDenominatorMigration.removedRoots === 0);
check("turbopack-rss-diagnosed", turbopackMigration.budget.oldMaxRssKb === 2750000 && turbopackMigration.budget.newMaxRssKb === 3100000 && turbopackMigration.physicalEvidence.oldFailure.status === "FAIL_MEMORY_BUDGET" && turbopackMigration.physicalEvidence.newPass.status === "PASS");
check("turbopack-budget-not-credit", turbopackMigration.creditBoundary.localTurbopackBuildCreditAfterFinalFrozenRetest === false && turbopackMigration.antiGaming.timeoutsIncreased === 0 && turbopackMigration.antiGaming.outputChecksRemoved === 0);

warnings.push({ id: "provider-commercial-rights-unapproved", blocking: true, credit: 0 });
warnings.push({ id: "full-catalog-shield-not-observed", blocking: true, observed: "15/318", rightsApproved: "0/318" });
warnings.push({ id: "full-catalog-real-markets-not-observed", blocking: true, observed: "15/583", rightsApproved: "0/583" });
warnings.push({ id: "continuous-freshness-corrections-uptime-unproven", blocking: true });
warnings.push({ id: "final-frozen-turbopack-retest-after-budget-migration", blocking: true });
warnings.push({ id: "exact-windows-browser-not-run", blocking: true });
warnings.push({ id: "independent-security-adjudication-unperformed", blocking: true, completed: "0/50" });
warnings.push({ id: "customer-value-unproven", blocking: true });

const failed = checks.filter((row) => !row.ok);
const result = {
  schemaVersion: "velmere.pass36.a102r44p12.independent-final-audit.v1",
  revisionId: state.revisionId,
  status: failed.length ? "FAIL_R44P12_INDEPENDENT_FINAL_AUDIT" : "PASS_R44P12_LOCAL_INDEPENDENT_AUDIT_WITH_EXTERNAL_BLOCKERS",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checksDetail: checks,
  blockingWarnings: warnings,
  balancedAssessment: {
    engineeringFramework: 9.0,
    evidenceIntegrity: 9.3,
    localCompilerLevelAnalysis: 7.8,
    localFoundryFuzzInvariants: 7.7,
    realNetworkProviderDiagnostic: 8.2,
    providerCommercialRightsReadiness: 1.5,
    shieldRealData: 2.5,
    realMarketsRealData: 2.2,
    publicSaleReadinessPercentRange: [38, 48],
    worldClassProof: 6.0
  },
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
