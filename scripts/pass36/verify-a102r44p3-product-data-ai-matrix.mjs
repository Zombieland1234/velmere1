#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readDescriptorBoundRegularFile } from "./descriptor-bound-regular-file.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";

const REVISION = "VELMERE_PASS36_A102R44P3_ACTION_REQUIRED_CURRENT_BYTE_SHIELD_PRO_REAL_MARKETS_AND_MULTILINGUAL_AI_MATRIX_CLOSURE_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R44P2_ACTION_REQUIRED_AUTOMATED_INFORMATIONAL_SKU_PDF_POSIX_TOOL_BOUNDARY_AND_OFFICIAL_TOOLCHAIN_ADMISSION_NO_LIVE_CREDIT";
const STATE_PATH = "config/pass36/a102r44p3-product-data-ai-matrix-state.json";
const checks = [];
const check = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
const invariant = (condition, code) => { if (!condition) throw new Error(code); };
const expectRejected = (id, fn) => { let rejected = false; try { fn(); } catch { rejected = true; } check(id, rejected); };

const stateFile = readDescriptorBoundRegularFile(STATE_PATH, { maxBytes: 4 * 1024 * 1024, errorPrefix: "a102r44p3_state" });
const state = parseStrictJsonCli(stateFile.bytes.toString("utf8"), { maxBytes: 4 * 1024 * 1024, maxDepth: 128, maxNodes: 500_000, requireObject: true });
check("state:descriptor-bound", stateFile.descriptorBound === true, stateFile.binding);
check("state:schema", state.schemaVersion === "velmere.pass36.a102r44p3.product-data-ai-matrix-state.v1", state.schemaVersion);
check("state:revision", state.revisionId === REVISION && state.parentRevisionId === PARENT, { revisionId: state.revisionId, parentRevisionId: state.parentRevisionId });
check("state:fail-closed", state.globalDecision === "NO_GO" && state.live === false && state.saleEnabled === false && state.productionApproved === false && state.worldClassProven === false, state);
check("state:real-denominators-zero", Object.values(state.realDenominators).every((row) => row.completed === 0 && row.required > 0), state.realDenominators);
check("state:sku-sale-disabled", Object.values(state.skuDecisions).every((row) => row.saleEnabled === false), state.skuDecisions);

const run = spawnSync(process.execPath, ["--import", "./scripts/pass11/register-offline-ts-loader.mjs", "scripts/pass36/test-a102r44p3-product-data-ai-matrix.ts"], {
  cwd: process.cwd(),
  encoding: "utf8",
  shell: false,
  windowsHide: true,
  timeout: 600_000,
  maxBuffer: 128 * 1024 * 1024,
  env: { ...process.env, NODE_NO_WARNINGS: "1", NO_COLOR: "1", TERM: "dumb" },
});
let matrix = null;
let parseError = null;
try {
  matrix = parseStrictJsonCli(String(run.stdout ?? ""), { maxBytes: 16 * 1024 * 1024, maxDepth: 256, maxNodes: 4_000_000, requireObject: true });
} catch (error) {
  parseError = error instanceof Error ? error.message : String(error);
}
check("matrix:exit", run.status === 0, { status: run.status, signal: run.signal, stderr: String(run.stderr ?? "").slice(0, 2000) });
check("matrix:json", matrix !== null, parseError);

function validateMatrix(value) {
  invariant(value.schemaVersion === "velmere.pass36.a102r44p3.product-data-ai-matrix-test-receipt.v1", "schema");
  invariant(value.revisionId === REVISION && value.parentRevisionId === PARENT, "revision");
  invariant(value.status === "PASS_A102R44P3_LOCAL_PRODUCT_DATA_AI_MATRIX_NO_REAL_OR_LIVE_CREDIT", "status");
  invariant(value.summary?.checks === 35 && value.summary?.passed === 35 && value.summary?.failed === 0, "summary");
  invariant(value.sourceBefore?.files === value.sourceAfter?.files && value.sourceBefore?.bytes === value.sourceAfter?.bytes && value.sourceBefore?.pathSetSha256 === value.sourceAfter?.pathSetSha256 && value.sourceBefore?.aggregateSha256 === value.sourceAfter?.aggregateSha256, "source_mutated");
  invariant(value.matrices?.shield?.assets === 318 && value.matrices?.shield?.tierPackets === 954 && value.matrices?.shield?.semanticMutations === 11448, "shield_denominator");
  invariant(Object.values(value.matrices.shield.terminalStates).reduce((sum, count) => sum + count, 0) === 7091, "shield_terminal_rows");
  invariant(value.matrices?.shieldProMap?.assets === 318 && value.matrices?.shieldProMap?.tierPackets === 954 && value.matrices?.shieldProMap?.semanticMutations === 15264, "shield_pro_denominator");
  invariant(Object.values(value.matrices.shieldProMap.depthStates).reduce((sum, count) => sum + count, 0) === 318, "shield_pro_depth_rows");
  invariant(Object.values(value.matrices.shieldProMap.bindings).reduce((sum, count) => sum + count, 0) === 318, "shield_pro_binding_rows");
  invariant(Object.values(value.matrices.shieldProMap.labels).reduce((sum, count) => sum + count, 0) === 318, "shield_pro_label_rows");
  invariant(value.matrices?.realMarkets?.instruments === 583 && value.matrices?.realMarkets?.fieldRows === 5830 && value.matrices?.realMarkets?.tierPackets === 1749 && value.matrices?.realMarkets?.semanticMutations === 31482, "real_markets_denominator");
  invariant(Object.values(value.matrices.realMarkets.assetClasses).reduce((sum, count) => sum + count, 0) === 583, "real_markets_class_rows");
  invariant(Object.values(value.matrices.realMarkets.fieldStates).reduce((sum, count) => sum + count, 0) === 17490, "real_markets_projected_field_rows");
  invariant(value.matrices?.impactWhale?.assets === 318 && value.matrices?.impactWhale?.tierPackets === 1908 && value.matrices?.impactWhale?.semanticMutations === 34344, "impact_whale_denominator");
  invariant(value.matrices?.brainAngelRisk?.cases === 360 && value.matrices?.brainAngelRisk?.projections === 1800 && value.matrices?.brainAngelRisk?.semanticMutations === 5760, "brain_angel_risk_denominator");
  invariant(Object.values(value.matrices.brainAngelRisk.decisions).reduce((sum, count) => sum + count, 0) === 360, "decision_rows");
  invariant(["pl", "en", "de"].every((locale) => value.matrices.brainAngelRisk.locales[locale] === 120), "locale_parity");
  invariant(["basic", "pro", "advanced"].every((tier) => value.matrices.brainAngelRisk.tiers[tier] === 120), "tier_parity");
  invariant(["brain", "angel", "risk"].every((surface) => value.matrices.brainAngelRisk.surfaces[surface] === 120), "surface_parity");
  invariant(Object.entries(value.realCredit).every(([key, item]) => ["saleEnabled", "liveProven"].includes(key) ? item === false : item === 0), "real_credit_promotion");
  invariant(Array.isArray(value.failures) && value.failures.length === 0, "failures");
  return true;
}

if (matrix) {
  let validationError = null;
  try { validateMatrix(matrix); } catch (error) { validationError = error instanceof Error ? error.message : String(error); }
  check("matrix:contract", validationError === null, validationError);
  check("matrix:shield-state-variety", ["AVAILABLE", "STALE", "CONFLICTED", "FAILED", "RATE_LIMITED"].every((stateName) => matrix.matrices.shield.terminalStates[stateName] > 0), matrix.matrices.shield.terminalStates);
  check("matrix:shield-pro-state-variety", Object.values(matrix.matrices.shieldProMap.depthStates).every((count) => count > 0), matrix.matrices.shieldProMap.depthStates);
  check("matrix:real-markets-state-variety", Object.values(matrix.matrices.realMarkets.fieldStates).every((count) => count > 0), matrix.matrices.realMarkets.fieldStates);
  check("matrix:ai-decision-variety", Object.keys(matrix.matrices.brainAngelRisk.decisions).length === 9 && Object.values(matrix.matrices.brainAngelRisk.decisions).every((count) => count > 0), matrix.matrices.brainAngelRisk.decisions);
  check("matrix:truth-boundary", typeof matrix.truthBoundary === "string" && matrix.truthBoundary.includes("real provider data") && matrix.truthBoundary.includes("sale remain unproven"), matrix.truthBoundary);
  expectRejected("negative:shield-denominator-collapse", () => { const clone = structuredClone(matrix); clone.matrices.shield.assets = 317; validateMatrix(clone); });
  expectRejected("negative:real-markets-denominator-collapse", () => { const clone = structuredClone(matrix); clone.matrices.realMarkets.instruments = 582; validateMatrix(clone); });
  expectRejected("negative:ai-denominator-collapse", () => { const clone = structuredClone(matrix); clone.matrices.brainAngelRisk.cases = 359; validateMatrix(clone); });
  expectRejected("negative:source-drift", () => { const clone = structuredClone(matrix); clone.sourceAfter.aggregateSha256 = "0".repeat(64); validateMatrix(clone); });
  expectRejected("negative:sale-promotion", () => { const clone = structuredClone(matrix); clone.realCredit.saleEnabled = true; validateMatrix(clone); });
  expectRejected("negative:live-promotion", () => { const clone = structuredClone(matrix); clone.realCredit.liveProven = true; validateMatrix(clone); });
}

const failed = checks.filter((row) => !row.passed);
const report = {
  schemaVersion: "velmere.pass36.a102r44p3.product-data-ai-matrix-verification.v1",
  revisionId: REVISION,
  status: failed.length ? "FAIL_A102R44P3_PRODUCT_DATA_AI_MATRIX_VERIFICATION" : "PASS_A102R44P3_CURRENT_BYTE_LOCAL_PRODUCT_DATA_AI_MATRIX_NO_REAL_OR_LIVE_CREDIT",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failures: failed,
  matrixSummary: matrix?.summary ?? null,
  matrices: matrix?.matrices ?? null,
  realCredit: matrix?.realCredit ?? null,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
  rows: checks,
  truthBoundary: "This verifier proves exact current-byte local fixture execution and denominator preservation for Shield, Shield Pro/Map, Real Markets, Market Impact/Whale Watch and Brain/Angel/Risk. It grants no real-data, rights, customer, production-browser, paid, LIVE or sale credit.",
};
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
