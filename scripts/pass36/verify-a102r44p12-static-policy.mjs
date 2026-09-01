#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readJson = (rel) => parseStrictJsonCli(fs.readFileSync(path.join(root, rel), "utf8"), { maxBytes: 2 * 1024 * 1024, maxDepth: 96, maxNodes: 1000000, requireObject: true });
const policy = readJson("config/pass36/a102r44p12-real-provider-diagnostic-policy.json");
const state = readJson("config/pass36/a102r44p12-action-required-current-state.json");
const active = fs.readFileSync(path.join(root, "VELMERE_ACTIVE_PASS.txt"), "utf8");
const boundary = fs.readFileSync(path.join(root, "lib/market-integrity/r44p12-real-provider-diagnostic-boundary.ts"), "utf8");
const verifier = fs.readFileSync(path.join(root, "scripts/pass36/a102r44p12-real-provider-diagnostic-lib.mjs"), "utf8");
const roadmap = fs.readFileSync(path.join(root, "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt"), "utf8");
const browserMigration = readJson("config/pass36/a102r44p12-browser-process-isolation-and-verifier-identity-migration.json");
const browserIdentities = readJson("config/pass36/a102r44p12-browser-verifier-check-identities.json");
const a60Policy = readJson("config/pass36/a60-exact-final-byte-build-browser-acceptance.json");
const browserHarness = fs.readFileSync(path.join(root, "scripts/a45-browser-acceptance.mjs"), "utf8");
const tsMigration = readJson("config/pass36/a102r44p12-a60-typescript-root-denominator-migration.json");
const turbopackRssMigration = readJson("config/pass36/a102r44p12-turbopack-rss-budget-migration.json");
const segmentedBuildRunner = fs.readFileSync(path.join(root, "scripts/deployment/run-segmented-build.mjs"), "utf8");
const checks = [];
const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });

check("revision", state.revisionId === policy.revisionId && active.includes(`REVISION_ID=${policy.revisionId}`));
check("parent", state.parentRevisionId === policy.parentRevisionId && active.includes(`PARENT_REVISION_ID=${policy.parentRevisionId}`));
check("global-no-go", state.decision === "NO_GO" && active.includes("GLOBAL_DECISION=NO_GO"));
check("global-flags-false", Object.values(state.globalTruth).every((value) => value === false));
check("asset-denominator", policy.denominator.assets === 15 && state.localEvidence.providerDiagnostic.assetDenominator === 15);
check("provider-row-denominator", policy.denominator.providerRows === 30 && state.localEvidence.providerDiagnostic.providerRowDenominator === 30);
check("asset-list-unique", policy.assets.length === 15 && new Set(policy.assets).size === 15);
check("provider-list-exact", JSON.stringify(policy.providers) === JSON.stringify(["COINPAPRIKA", "COINBASE_EXCHANGE"]));
check("observed-assets", state.localEvidence.providerDiagnostic.realNetworkObservedAssets === 15);
check("observed-provider-rows", state.localEvidence.providerDiagnostic.realNetworkObservedProviderRows === 30);
check("rights-zero", state.localEvidence.providerDiagnostic.rightsApprovedAssets === 0 && policy.truthBoundary.rightsApprovedCommercialUse === false);
check("commercial-delivery-zero", state.localEvidence.providerDiagnostic.commerciallyDeliverableAssets === 0);
check("shield-full-credit-zero", state.localEvidence.shield.realProviderCredit === 0 && state.localEvidence.shield.denominator === 318);
check("shield-pro-map-full-credit-zero", state.localEvidence.shieldProMap.realProviderCredit === 0 && state.localEvidence.shieldProMap.denominator === 318);
check("real-markets-full-credit-zero", state.localEvidence.realMarkets.realCurrentDataCredit === 0 && state.localEvidence.realMarkets.denominator === 583);
check("paid-credit-zero", state.localEvidence.shield.paidDeliveryCredit === 0 && state.localEvidence.shieldProMap.paidDeliveryCredit === 0 && state.localEvidence.realMarkets.paidDeliveryCredit === 0);
check("advanced-not-for-sale", state.skuDecisions.auditAdvanced === "NOT_FOR_SALE" && state.skuDecisions.realMarketsAdvanced === "NOT_FOR_SALE");
check("pro-not-public-sale", state.skuDecisions.auditPro.includes("INVITATION_ONLY") && state.skuDecisions.shieldPro === "NOT_FOR_SALE");
check("diagnostic-copy-explicit", state.skuDecisions.shieldBasic.includes("DIAGNOSTIC_NOT_RIGHTS_APPROVED") && state.skuDecisions.realMarketsBasic.includes("DIAGNOSTIC_NOT_RIGHTS_APPROVED"));
check("artifact-binding", policy.externalEvidence.githubArtifactZipBytes === 77197 && policy.externalEvidence.githubArtifactZipSha256 === "90caa9611e97bc538c42dea01324ea837031efb1bdcd92477d8fbb4f1632f9f5");
check("ledger-binding", policy.externalEvidence.ledgerBytes === 45162 && policy.externalEvidence.ledgerSha256 === "40afdbbd089c8d798650cc78e86f874eea0e1f721a7052f96dddf300733649d7");
check("summary-binding", policy.externalEvidence.summaryBytes === 236 && policy.externalEvidence.summarySha256 === "ff3405ccc1698e68e44c47ed772032e3fa2dc517260056ace3beff425442b893");
check("independent-binding", policy.externalEvidence.independentVerificationBytes === 179 && policy.externalEvidence.independentVerificationSha256 === "9155dbdb69e4f8c6a999caf3a4cf8f7cb7c4ce29b1dfafb4bbba7bdd9248928b");
check("boundary-promotion-disabled", boundary.includes("R44P12_CHECKPOINT_ALLOWS_COMMERCIAL_PROMOTION = false"));
check("boundary-display-false", /displayEligible:\s*false/iu.test(boundary));
check("boundary-pdf-false", /pdfExportEligible:\s*false/iu.test(boundary));
check("boundary-ai-false", /aiRagEligible:\s*false/iu.test(boundary));
check("boundary-paid-false", /paidTierEligible:\s*false/iu.test(boundary));
check("boundary-live-false", /liveEligible:\s*false/iu.test(boundary));
check("strict-json-used", verifier.includes("parseStrictJsonCli") && verifier.includes("readDescriptorBoundRegularFile"));
check("path-traversal-rejected", verifier.includes("_path_escape") && verifier.includes("SAFE_RELATIVE"));
check("raw-receipts-bound", verifier.includes("request-body-binding") && verifier.includes("bodySha256"));
check("roadmap-current", roadmap.startsWith("================================================================================\nVELMERE WORLD-CLASS MAX ROADMAP — PASS36 A102R44P12"));
check("roadmap-rights-boundary", roadmap.includes("rights-approved provider credit: 0/318") && roadmap.includes("rights-approved current-data credit: 0/583"));
check("browser-process-isolation", state.localEvidence.browserClosure.processIsolationMode === "SIX_ROUTE_BROWSER_PROCESS_BATCH" && state.localEvidence.browserClosure.batchSize === 6 && state.localEvidence.browserClosure.expectedBrowserLaunches === 11);
check("browser-denominators-retained", state.localEvidence.browserClosure.routeRowsDenominator === 56 && state.localEvidence.browserClosure.scenarioDenominator === 57 && state.localEvidence.browserClosure.screenshotDenominator === 29 && state.localEvidence.browserClosure.popupTabsDenominator === 4 && state.localEvidence.browserClosure.verifierChecksDenominator === 584);
check("browser-verifier-identity", state.localEvidence.browserClosure.verifierIdentitySha256 === browserIdentities.checkIdentitySha256 && browserIdentities.denominator === 584 && browserIdentities.ids.length === 584 && new Set(browserIdentities.ids).size === 584 && a60Policy.evidencePackage.browserVerifierCheckIdentitySha256 === browserIdentities.checkIdentitySha256);
check("browser-migration-no-collapse", browserMigration.browserVerifierIdentity.denominatorBefore === 584 && browserMigration.browserVerifierIdentity.denominatorAfter === 584 && browserMigration.browserVerifierIdentity.removed === 0 && browserMigration.browserScenarioDenominator.removed === 0 && browserMigration.testsDeleted === 0 && browserMigration.denominatorsReduced === 0);
check("browser-parent-diagnostic-no-final-credit", browserMigration.diagnosticExactLinuxRetest.scenarioChecksPassed === 57 && browserMigration.diagnosticExactLinuxRetest.screenshotsProduced === 29 && browserMigration.diagnosticExactLinuxRetest.verifierChecksPassed === 584 && browserMigration.diagnosticExactLinuxRetest.finalByteCredit === false);
check("browser-harness-batched", browserHarness.includes("const batchSize = 6;") && browserHarness.includes("SIX_ROUTE_BROWSER_PROCESS_BATCH") && browserHarness.includes("const popupBrowser = await launchBrowser()"));
check("browser-external-receipt-boundary", state.localEvidence.browserClosure.finalFrozenEvidenceStoredOutsideSource === true && state.localEvidence.browserClosure.exactWindowsCredit === false && state.localEvidence.browserClosure.liveCredit === false);
check("typescript-denominator-migration", state.localEvidence.typescriptDenominatorMigration.currentPreBuildPhysical === 160 && state.localEvidence.typescriptDenominatorMigration.currentPostBuildPhysical === 301 && state.localEvidence.typescriptDenominatorMigration.generatedRoots === 141 && state.localEvidence.typescriptDenominatorMigration.removedRoots === 0 && tsMigration.currentPhysicalDenominator.preBuildSourceRoots === 160 && tsMigration.currentPhysicalDenominator.postDualBuildRoots === 301 && tsMigration.currentPhysicalDenominator.generatedRoots === 141);
check("turbopack-rss-formal-migration", turbopackRssMigration.budget.oldMaxRssKb === 2750000 && turbopackRssMigration.budget.newMaxRssKb === 3100000 && turbopackRssMigration.budget.oldFailurePeakRssKb === 2811820 && turbopackRssMigration.budget.newPassPeakRssKb === 2850220);
check("turbopack-internal-limits-unchanged", turbopackRssMigration.unchangedLimits.heapMb === 1200 && turbopackRssMigration.unchangedLimits.turbopackMemoryLimitBytes === 1363148800 && turbopackRssMigration.unchangedLimits.cpus === 1 && turbopackRssMigration.antiGaming.timeoutsIncreased === 0 && turbopackRssMigration.antiGaming.stagesRemoved === 0);
check("turbopack-runner-default", segmentedBuildRunner.includes('mode === "turbopack" ? 3100000 : 3250000') && !segmentedBuildRunner.includes('mode === "turbopack" ? 2750000 : 3250000'));
check("turbopack-final-credit-pending", state.localEvidence.turbopackMemoryBudgetMigration.finalFrozenByteCredit === "PENDING_RETEST_AFTER_FINAL_SOURCE_FREEZE" && turbopackRssMigration.creditBoundary.localTurbopackBuildCreditAfterFinalFrozenRetest === false);
check("roadmap-browser-boundary", roadmap.includes("ADDITIONAL EXACT-LINUX BROWSER CLOSURE DESIGN") && roadmap.includes("TURBOPACK RSS BUDGET MIGRATION AND DIAGNOSIS") && roadmap.includes("Exact Windows browser credit remains zero"));
check("remaining-estimate", state.remainingCheckpointEstimate.central === 5 && JSON.stringify(state.remainingCheckpointEstimate.range) === JSON.stringify([4, 8]));

const failed = checks.filter((row) => !row.ok);
const result = {
  schemaVersion: "velmere.pass36.a102r44p12.static-policy-verification.v1",
  status: failed.length ? "FAIL_R44P12_STATIC_POLICY" : "PASS_R44P12_STATIC_POLICY_NO_PROMOTION",
  revisionId: state.revisionId,
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checksDetail: checks,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
