#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const tsRoot = process.env.VELMERE_TYPESCRIPT_ROOT;
if (!tsRoot) throw new Error("VELMERE_TYPESCRIPT_ROOT_REQUIRED");
const require = createRequire(import.meta.url);
const ts = require(path.join(tsRoot, "lib/typescript.js"));
if (ts.version !== "5.9.3") throw new Error(`TYPESCRIPT_VERSION_MISMATCH:${ts.version}`);
const sourcePath = path.join(ROOT, "lib/intelligence/vlm-standalone-decision-support.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, strict: true },
  fileName: sourcePath,
  reportDiagnostics: true,
});
if (transpiled.diagnostics?.length) {
  throw new Error(`TRANSPILE_DIAGNOSTICS:${JSON.stringify(transpiled.diagnostics.map((d) => d.code))}`);
}
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-r44p35-decision-"));
const modulePath = path.join(temp, "decision.mjs");
fs.writeFileSync(modulePath, transpiled.outputText);
const mod = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
const checks = [];
const check = (id, fn) => {
  try { fn(); checks.push({ id, passed: true }); }
  catch (error) { checks.push({ id, passed: false, error: error instanceof Error ? error.message : String(error) }); }
};

const verifiedImpact = mod.buildMarketImpactDecisionSupport({ locale: "en", evidenceStatus: "verified_live", generatedAt: "2026-08-08T00:00:00.000Z", venueCount: 2, providerFamilyCount: 2, representativeScenarioCount: 4, missingEvidence: [], blockers: [] });
check("impact-verified", () => assert.equal(verifiedImpact.state, "VERIFIED"));
check("impact-not-realized", () => assert.ok(verifiedImpact.limitations.includes("realized_slippage_not_observed")));
check("impact-truth-boundary", () => assert.match(verifiedImpact.truthBoundary, /not realized slippage/i));
const fixtureImpact = mod.buildMarketImpactDecisionSupport({ locale: "pl", evidenceStatus: "fixture_only", venueCount: 1, providerFamilyCount: 1, representativeScenarioCount: 2 });
check("impact-fixture-simulation", () => assert.equal(fixtureImpact.state, "SIMULATION_ONLY"));
check("impact-polish-simulation", () => assert.match(fixtureImpact.headline, /symulacja/i));
const withheldImpact = mod.buildMarketImpactDecisionSupport({ locale: "de", evidenceStatus: "unavailable", venueCount: 0, providerFamilyCount: 0, representativeScenarioCount: 0, blockers: ["provider_missing"] });
check("impact-withheld", () => assert.equal(withheldImpact.state, "WITHHELD"));
check("impact-next-safe-action", () => assert.ok(withheldImpact.nextSafeAction.length > 20));

const verifiedWhale = mod.buildWhaleWatchDecisionSupport({ locale: "en", evidenceStatus: "verified_live", transferCount: 12, holderCount: 100, verifiedLabelCoveragePercent: 90, providerFamilies: ["explorer", "signed_labels"], missingEvidence: [], blockers: [] });
check("whale-verified", () => assert.equal(verifiedWhale.state, "VERIFIED"));
check("whale-transfer-not-trade", () => assert.match(verifiedWhale.truthBoundary, /transfer does not automatically mean/i));
check("whale-label-provenance", () => assert.ok(verifiedWhale.assumptions.includes("entity_label_requires_provenance")));
const fixtureWhale = mod.buildWhaleWatchDecisionSupport({ locale: "pl", evidenceStatus: "fixture_only", transferCount: 10, holderCount: 20, verifiedLabelCoveragePercent: 0, providerFamilies: [] });
check("whale-unclassified", () => assert.equal(fixtureWhale.state, "UNCLASSIFIED"));
check("whale-no-buy-sell-inference", () => assert.ok(fixtureWhale.limitations.includes("buy_sell_not_inferred")));

const riskArgs = { locale: "en", technicalRisk: "high", marketRisk: "moderate", dataQualityRisk: "low", factorsIncreasingRisk: ["admin_key"], factorsReducingRisk: ["multisig"], missingProof: ["independent_review"], calibratedProbabilityAvailable: false };
const riskBasic = mod.buildRiskIndicatorDecision({ ...riskArgs, reportContextDepth: "basic" });
const riskPro = mod.buildRiskIndicatorDecision({ ...riskArgs, reportContextDepth: "pro" });
const riskAdvanced = mod.buildRiskIndicatorDecision({ ...riskArgs, reportContextDepth: "advanced" });
check("risk-value-invariant", () => assert.equal(riskBasic.indicator, riskPro.indicator));
check("risk-value-invariant-advanced", () => assert.equal(riskBasic.indicator, riskAdvanced.indicator));
check("risk-invariant-key", () => assert.equal(riskBasic.invariantKey, riskAdvanced.invariantKey));
check("risk-probability-null", () => assert.equal(riskAdvanced.probabilityPercent, null));
check("risk-leverage-null", () => assert.equal(riskAdvanced.leverageRecommendation, null));
check("risk-position-sizing-null", () => assert.equal(riskAdvanced.positionSizingRecommendation, null));
check("risk-explanation-depth-only", () => assert.notEqual(riskBasic.explanationDepth, riskAdvanced.explanationDepth));
const riskUnknown = mod.buildRiskIndicatorDecision({ locale: "pl", reportContextDepth: "basic", technicalRisk: "unknown", marketRisk: "unknown", dataQualityRisk: "unknown", missingProof: ["a", "b", "c", "d"] });
check("risk-refusal", () => assert.equal(riskUnknown.indicator, "unknown"));
check("risk-refusal-reason", () => assert.ok(riskUnknown.refusalReason));

const angelNoFacts = mod.buildAngelStandaloneAnswerContract({ locale: "en", reportContextDepth: "basic", confirmedFactCount: 0, providerFamilyCount: 0, unresolvedSourceConflict: false, missingProof: ["price"] });
check("angel-abstains-no-facts", () => assert.equal(angelNoFacts.mustAbstain, true));
const angelConflict = mod.buildAngelStandaloneAnswerContract({ locale: "de", reportContextDepth: "pro", confirmedFactCount: 4, providerFamilyCount: 2, unresolvedSourceConflict: true, missingProof: [] });
check("angel-abstains-conflict", () => assert.equal(angelConflict.mustAbstain, true));
const angelGoodBasic = mod.buildAngelStandaloneAnswerContract({ locale: "pl", reportContextDepth: "basic", confirmedFactCount: 4, providerFamilyCount: 2, unresolvedSourceConflict: false, missingProof: [], nextSafeChecks: ["verify block"] });
const angelGoodAdvanced = mod.buildAngelStandaloneAnswerContract({ locale: "pl", reportContextDepth: "advanced", confirmedFactCount: 4, providerFamilyCount: 2, unresolvedSourceConflict: false, missingProof: [], nextSafeChecks: ["verify block"] });
check("angel-no-abstention-with-proof", () => assert.equal(angelGoodBasic.mustAbstain, false));
check("angel-order-nine-sections", () => assert.equal(angelGoodBasic.orderedSections.length, 9));
check("angel-truth-standard-invariant", () => assert.equal(angelGoodBasic.truthBoundary, angelGoodAdvanced.truthBoundary));
check("angel-depth-only-evidence-items", () => assert.ok(angelGoodAdvanced.maxEvidenceItems > angelGoodBasic.maxEvidenceItems));
check("angel-forbids-leverage", () => assert.ok(angelGoodAdvanced.forbiddenClaims.includes("leverage_instruction")));
check("angel-forbids-tier-truth", () => assert.ok(angelGoodAdvanced.forbiddenClaims.includes("paid_tier_increases_truth_standard")));

for (let index = 0; index < 30; index += 1) {
  const depth = ["basic", "pro", "advanced"][index % 3];
  const risk = mod.buildRiskIndicatorDecision({ locale: ["pl", "en", "de"][index % 3], reportContextDepth: depth, technicalRisk: index % 2 ? "moderate" : "high", marketRisk: "low", dataQualityRisk: index % 5 === 0 ? "unknown" : "moderate", missingProof: index % 5 === 0 ? ["freshness"] : [] });
  check(`persona-${index + 1}-no-probability`, () => assert.equal(risk.probabilityPercent, null));
  check(`persona-${index + 1}-no-leverage`, () => assert.equal(risk.leverageRecommendation, null));
  const whale = mod.buildWhaleWatchDecisionSupport({ locale: ["pl", "en", "de"][index % 3], evidenceStatus: index % 4 === 0 ? "fixture_only" : "verified_staging", transferCount: index, holderCount: 100 + index, verifiedLabelCoveragePercent: index % 4 === 0 ? 0 : 50, providerFamilies: index % 4 === 0 ? [] : ["explorer"], missingEvidence: index % 4 === 0 ? ["verified_label"] : [] });
  check(`persona-${index + 1}-transfer-not-trade`, () => assert.ok(whale.assumptions.includes("transfer_is_not_trade")));
  const impact = mod.buildMarketImpactDecisionSupport({ locale: ["pl", "en", "de"][index % 3], evidenceStatus: index % 3 === 0 ? "fixture_only" : "verified_staging", venueCount: 1, providerFamilyCount: 1, representativeScenarioCount: 2 });
  check(`persona-${index + 1}-impact-not-realized`, () => assert.ok(impact.limitations.includes("realized_slippage_not_observed")));
  const angel = mod.buildAngelStandaloneAnswerContract({
    locale: ["pl", "en", "de"][index % 3],
    reportContextDepth: depth,
    confirmedFactCount: index % 5 === 0 ? 0 : 3,
    providerFamilyCount: index % 4 === 0 ? 1 : 2,
    unresolvedSourceConflict: index % 7 === 0,
    missingProof: index % 5 === 0 ? ["fresh_market_evidence"] : [],
    nextSafeChecks: ["verify source timestamp and evidence binding"],
  });
  const expectedAbstention = index % 5 === 0 || index % 7 === 0;
  check(`persona-${index + 1}-angel-abstention-correct`, () => assert.equal(angel.mustAbstain, expectedAbstention));
  check(`persona-${index + 1}-angel-no-paid-truth-or-leverage`, () => assert.ok(angel.forbiddenClaims.includes("paid_tier_increases_truth_standard") && angel.forbiddenClaims.includes("leverage_instruction")));
}

const failures = checks.filter((row) => !row.passed);
const result = {
  schemaVersion: "velmere.pass36.a102r44p35.standalone-decision-support-test.v1",
  status: failures.length ? "FAIL" : "PASS_R44P35_STANDALONE_DECISION_SUPPORT",
  typescriptVersion: ts.version,
  checks: checks.length,
  passed: checks.length - failures.length,
  failed: failures.length,
  rows: checks,
};
console.log(JSON.stringify(result, null, 2));
fs.rmSync(temp, { recursive: true, force: true });
if (failures.length) process.exit(1);
