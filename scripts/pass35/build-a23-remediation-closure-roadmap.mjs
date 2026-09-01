#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { runA23Benchmark, verifyA23Benchmark, verifyA23Policy } from "../../lib/security/pass35-a23-remediation-closure-runtime.mjs";

const PASS = "PASS35_A23";
const REV = "VELMERE_PASS35_A23_EVIDENCE_BOUND_REMEDIATION_CLOSURE_NON_VISUAL";
const A16_CAN = 40.7, A16_ZERO = 80.0, A22_CAN = 47.7, A22_ZERO = 87.5;
const policyPath = "config/pass35/a23-remediation-closure-policy.json";
const a22PolicyPath = "config/pass35/a22-severity-triage-policy.json";
const runtimePath = "artifacts/pass35/PASS35_A23_REMEDIATION_CLOSURE_BENCHMARK.json";
const receiptPath = "artifacts/pass35/PASS35_A23_REMEDIATION_CLOSURE_RECEIPT.json";
const contractPath = "config/pass35/a23-remediation-closure-runtime-contract.json";
const summaryPath = "artifacts/release/PASS35_A23_PRODUCT_ROADMAP_SUMMARY.json";
const boardPath = "artifacts/release/PASS35_A23_REMEDIATION_CLOSURE.md";
const statusPath = "config/pass35/current-status-register.json";
const zeroPath = "config/pass35/zero-budget-functional-roadmap.json";
const roadmapPath = "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt";
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const writeJson = (p, v) => { mkdirSync(path.dirname(p), { recursive: true }); writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`); };
const hash = (v) => `sha256:${createHash("sha256").update(typeof v === "string" || Buffer.isBuffer(v) ? v : JSON.stringify(v)).digest("hex")}`;

const policy = readJson(policyPath), a22Policy = readJson(a22PolicyPath);
if (!verifyA23Policy(policy)) throw new Error("a23_policy_invalid");
const benchmark = runA23Benchmark(policy, a22Policy);
if (!verifyA23Benchmark(benchmark, policy)) throw new Error(`a23_benchmark_failed:${benchmark.failedGates.join(",")}`);
writeJson(runtimePath, benchmark);
const receiptCore = {
  schemaVersion: "velmere.pass35.a23-remediation-closure-receipt.v1", passId: PASS, sourceRevisionId: REV,
  status: "PASS_LOCAL_EVIDENCE_BOUND_REMEDIATION_CLOSURE_NOT_FOR_SALE",
  policyPath, policySha256: hash(readFileSync(policyPath)), runtimePath, runtimeIntegritySha256: benchmark.integritySha256,
  denominators: benchmark.denominators, frozen: benchmark.frozen, mutation: benchmark.mutation,
  exactPrePostBindingComplete: true, patchImpactCoverageComplete: true, familyDerivedRetestMatrixComplete: true,
  regressionFindingGateComplete: true, postPatchSeverityGateComplete: true, supersessionInvalidationComplete: true,
  realFixClaimed: false, signedClosureClaimed: false, qualifiedReviewerClaimed: false, independentRetestClaimed: false,
  paidGateEligible: false, advancedDeliveryAllowed: false, sellEnabled: false, chargeAllowed: false, liveClaimed: false,
  truthBoundary: policy.truthBoundary
};
const receipt = { ...receiptCore, receiptSha256: hash(receiptCore) };
writeJson(receiptPath, receipt);

const zero = readJson(zeroPath); zero.passId = PASS; zero.sourceRevisionId = REV;
const replaceCapability = (row) => { const i = zero.capabilities.findIndex((x) => x.id === row.id); if (i >= 0) zero.capabilities[i] = { ...zero.capabilities[i], ...row }; else zero.capabilities.push(row); };
replaceCapability({ id: "ZB59_PATCH_IMPACT_COVERAGE_GRAPH", status: "DONE", resourceModel: "Own work only", truth: "A23 binds exact original/patched source and runtime bytecode to the same subject, maps every affected component into an acyclic patch-impact graph, and blocks closure when any material component is uncovered or the patch does not change source and bytecode." });
replaceCapability({ id: "ZB60_FAMILY_DERIVED_RETEST_CLOSURE_MATRIX", status: "DONE", resourceModel: "Own work only", truth: "A23 derives required A02-A14 retests from 12 finding families, requires distinct pre/post receipts, evidence-family floors, maintained behavioral coverage, no surviving finding and no new High/Critical regression before a local closure contract can pass." });
replaceCapability({ id: "ZB61_REMEDIATION_CLOSURE_FROZEN_BENCHMARK", status: "DONE", resourceModel: "Own work only", truth: "A23 executes 192 closable/blocked remediation cases with a 72-case frozen split and 2304 mutations covering missing retests, unchanged bytes, uncovered components, regression findings, reopened post-triage, graph cycles, integrity tampering and paired closure flips. Generated labels grant no real-fix or paid credit." });
const exclusions = new Set(zero.zeroBudgetCoreExclusions); const core = zero.capabilities.filter((row) => !exclusions.has(row.id));
const zc = { DONE: core.filter((r) => r.status === "DONE").length, PARTIAL: core.filter((r) => r.status === "PARTIAL").length, NOT_DONE: core.filter((r) => r.status === "NOT_DONE").length };
const zw = Number((((zc.DONE + zc.PARTIAL * 0.5) / core.length) * 100).toFixed(1));
if (core.length !== 59 || zc.DONE !== 46 || zc.PARTIAL !== 12 || zc.NOT_DONE !== 1 || zw !== 88.1) throw new Error(`a23_zero_math:${JSON.stringify({ core: core.length, zc, zw })}`);
zero.truthBoundary = `PASS35 A23 adds a locally complete evidence-bound A15 remediation/retest closure contract for the declared scope. ZERO-BUDGET planning is ${zw}% across ${core.length} capabilities. Real vulnerabilities, real patches, official analyzers, qualified reviewer signatures, independent retests, staging, sale, LIVE and customer outcomes remain outside this local completion claim.`;
writeJson(zeroPath, zero);

const status = readJson(statusPath); status.sourceRevisionId = REV; status.evaluatedAt = "2026-07-23T10:23:00.000Z"; status.statusPrecedence = ["this register", "A23 roadmap current-status section", "machine-generated readiness dashboard", "A22 and earlier addenda as historical implementation notes only", "base roadmap as target requirements"];
const row = status.rows.find((item) => item.id === "AUD17_A15_REMEDIATION_RETEST"); if (!row) throw new Error("a23_status_row_missing");
Object.assign(row, {
  status: "DONE",
  doneEvidence: [
    "fail-closed finding-to-patch evidence-chain adapter",
    "exact original/patched source and runtime-bytecode separation",
    "family-derived A02-A14 retest applicability matrix",
    "patch-impact graph covers every affected component and rejects cycles",
    "distinct pre/post receipt binding and evidence-family floors",
    "behavioral coverage non-regression and surviving-finding rejection",
    "new High/Critical regression finding rejection",
    "post-patch A14 triage must be Suppressed or Informational",
    "supersession and invalidation triggers bound to closure receipt",
    "192-case frozen benchmark and 2304 mutation campaign"
  ],
  missing: [], blocker: "NONE_LOCAL_FOR_DECLARED_BOUNDED_A15_REMEDIATION_CLOSURE_IMPLEMENTATION",
  nextAction: "Execute the A23 closure contract on a real rights-approved finding and exact patch using official applicable analyzers, then obtain qualified reviewer attestation and an independent signed retest.",
  sellImpact: "Completes the declared local A15 closure contract only; customer finding closure and Advanced delivery remain blocked by real execution, reviewer signatures, independent retest, staging and customer proof."
});
const sc = { DONE: status.rows.filter((r) => r.status === "DONE").length, PARTIAL: status.rows.filter((r) => r.status === "PARTIAL").length, BLOCKED_EXTERNAL: status.rows.filter((r) => r.status === "BLOCKED_EXTERNAL").length, NOT_DONE: status.rows.filter((r) => r.status === "NOT_DONE").length };
const cw = Number((((sc.DONE + sc.PARTIAL * 0.5) / status.rows.length) * 100).toFixed(1)); const cs = Number(((sc.DONE / status.rows.length) * 100).toFixed(1));
if (status.rows.length !== 43 || sc.DONE !== 8 || sc.PARTIAL !== 26 || sc.BLOCKED_EXTERNAL !== 9 || sc.NOT_DONE !== 0 || cw !== 48.8 || cs !== 18.6) throw new Error(`a23_canonical_math:${JSON.stringify({ sc, cw, cs })}`);
status.zeroBudgetFunctionalTrack = { ...status.zeroBudgetFunctionalTrack, currentWeightedPlanningPercent: zw, coreDenominator: core.length, done: zc.DONE, partial: zc.PARTIAL, notDone: zc.NOT_DONE, a23RemediationClosurePolicyPath: policyPath, a23RemediationClosureContractPath: contractPath };
status.truthBoundary = `PASS35 A23 is the only canonical current status. Canonical roadmap is ${cw}% weighted / ${cs}% strict across 43 workstreams, up ${(cw - A22_CAN).toFixed(1)} pp from A22 and ${(cw - A16_CAN).toFixed(1)} pp from A16. Zero-budget functional core is ${zw}% across ${core.length} capabilities, up ${(zw - A22_ZERO).toFixed(1)} pp from A22 and ${(zw - A16_ZERO).toFixed(1)} pp from A16. A23 locally closes the declared bounded A15 patch-impact, retest applicability, regression and post-triage closure implementation. Real vulnerabilities, official tool execution, qualified signed closure, staging, sale, LIVE, customer outcomes and independent assurance remain unclaimed.`;
writeJson(statusPath, status);

const audit = readJson("config/pass35/audit-program.json"); audit.sourceRevisionId = REV; audit.status = "A01_A12_A14_A15_A16_LOCAL_EXECUTABLE_BOUNDED_REAL_EXTERNAL_PROOF_MISSING";
const a15 = audit.controls.find((item) => item.id === "A15"); if (a15) a15.status = "IMPLEMENTED_LOCAL_EVIDENCE_BOUND_REMEDIATION_CLOSURE_BENCHMARKED_NOT_SIGNED";
audit.a23RemediationClosure = { policyPath, runtimePath, receiptPath, cases: benchmark.denominators.cases, frozen: benchmark.denominators.frozen, mutations: benchmark.denominators.mutations, paidGateEligible: false, signedClosureClaimed: false, realFixClaimed: false };
audit.truthBoundary = policy.truthBoundary; writeJson("config/pass35/audit-program.json", audit);

const envelope = readJson("config/pass35/audit-execution-envelope.json"); envelope.sourceRevisionId = REV;
const family = {
  familyId: "remediation_retest_local_contract", controls: ["A15"],
  state: "IMPLEMENTED_LOCAL_EVIDENCE_BOUND_CLOSURE_BENCHMARKED_REAL_SIGNED_CLOSURE_MISSING",
  activePaths: ["scripts/pass35/audit-remediation-retest-adapter.mjs", "lib/security/pass35-a23-remediation-closure-runtime.mjs", policyPath, "scripts/pass35/test-a23-remediation-closure.mjs"],
  executionClass: "local_patch_impact_retest_regression_post_triage_closure_not_customer_signed_closure",
  mayClaim: ["exact pre/post subject and bytecode binding", "affected-component patch impact coverage", "family-derived retest applicability", "regression and post-patch severity gates", "generated frozen benchmark passed for declared local scope"],
  mayNotClaim: ["real vulnerability fixed", "qualified reviewer signed closure", "independent retest", "Advanced delivery authorized", "A15 paid gate passed"]
};
const fi = envelope.capabilityInventory.findIndex((item) => item.familyId === family.familyId); if (fi >= 0) envelope.capabilityInventory[fi] = family; else envelope.capabilityInventory.push(family);
envelope.truthBoundary = policy.truthBoundary; writeJson("config/pass35/audit-execution-envelope.json", envelope);

const product = readJson("config/pass35/product-tier-content-contract.json"); product.sourceRevisionId = REV;
const proFields = ["patch_impact_graph", "affected_component_coverage", "family_derived_retest_matrix", "pre_post_retest_receipt_bindings", "regression_finding_delta", "post_patch_severity_state"];
const advancedFields = ["finding_supersession_receipt", "closure_invalidation_triggers", "independent_retest_state", "signed_closure_eligibility", "closure_evidence_capsule"];
product.a23RemediationClosure = { policyPath, runtimePath, receiptPath, requiredProFields: proFields, requiredAdvancedFields: advancedFields, paidGateEligible: false, signedClosureClaimed: false };
const auditSurface = product.surfaces.find((surface) => surface.surfaceId === "audit_evm");
for (const field of proFields) if (!auditSurface.tiers.pro.requiredFields.includes(field)) auditSurface.tiers.pro.requiredFields.push(field);
for (const field of [...proFields, ...advancedFields]) if (!auditSurface.tiers.advanced.requiredFields.includes(field)) auditSurface.tiers.advanced.requiredFields.push(field);
writeJson("config/pass35/product-tier-content-contract.json", product);

const contract = {
  schemaVersion: "velmere.pass35.a23-remediation-closure-runtime-contract.v1", passId: PASS, sourceRevisionId: REV,
  baselineA16: { canonical: A16_CAN, zeroBudget: A16_ZERO }, baselineA22: { canonical: A22_CAN, zeroBudget: A22_ZERO },
  progressDeltaVsA22: { canonicalPercentagePoints: Number((cw - A22_CAN).toFixed(1)), zeroBudgetPercentagePoints: Number((zw - A22_ZERO).toFixed(1)) },
  progressDeltaVsA16: { canonicalPercentagePoints: Number((cw - A16_CAN).toFixed(1)), zeroBudgetPercentagePoints: Number((zw - A16_ZERO).toFixed(1)) },
  canonicalWeightedPlanningPercent: cw, canonicalStrictDonePercent: cs, canonicalCounts: sc,
  zeroBudgetWeightedPlanningPercent: zw, zeroBudgetCoreDenominator: core.length, zeroBudgetCounts: zc,
  benchmark: { ...benchmark.denominators, frozen: benchmark.frozen, mutation: benchmark.mutation, runtimeIntegritySha256: benchmark.integritySha256, receiptSha256: receipt.receiptSha256 },
  visualChangesMade: false, sellEnabled: false, chargeAllowed: false, paidDeliveryAllowed: false, signedClosureClaimed: false, realFixClaimed: false, liveClaimed: false,
  truthBoundary: status.truthBoundary
};
writeJson(contractPath, contract);

const current = readJson("config/current-release.json"); current.sourceRevisionId = REV; current.sourceRevisionStatus = "A23_EVIDENCE_BOUND_REMEDIATION_CLOSURE_IMPLEMENTED_REAL_SIGNED_CLOSURE_UNCLAIMED"; current.truthBoundary = status.truthBoundary;
current.a23RemediationClosurePolicyPath = policyPath; current.a23RemediationClosureRuntimePath = runtimePath; current.a23RemediationClosureReceiptPath = receiptPath; current.a23RemediationClosureContractPath = contractPath; current.a23ProductRoadmapSummaryPath = summaryPath; current.a23BoardPath = boardPath;
writeJson("config/current-release.json", current);

for (const name of readdirSync("config/pass35")) { const p = path.join("config/pass35", name); if (statSync(p).isDirectory() || !name.endsWith(".json")) continue; try { const value = readJson(p); if (value && typeof value === "object" && "sourceRevisionId" in value) { value.sourceRevisionId = REV; writeJson(p, value); } } catch (ignoredError) { void ignoredError; } }
for (const file of ["README.md", "CLEAN_SAFE_README.md"]) { if (!existsSync(file)) continue; let text = readFileSync(file, "utf8"); if (file === "README.md") text = text.replace(/source revision `[^`]+`/u, `source revision \`${REV}\``); if (!text.includes("## PASS35 A23 local changes")) text += "\n\n## PASS35 A23 local changes\n\n- Added an evidence-bound remediation closure engine with exact original/patched source and runtime-bytecode binding.\n- Added an acyclic patch-impact graph and complete affected-component coverage gate.\n- Added family-derived A02-A14 retest applicability, distinct pre/post receipt checks and behavioral coverage non-regression.\n- Added surviving-finding, new High/Critical regression and post-patch A14 severity closure gates.\n- Added supersession and invalidation receipts plus a 192-case / 2304-mutation benchmark.\n- Marked AUD17/A15 DONE locally while keeping real fixes, signed closure, paid and LIVE gates closed.\n- Visual files remain unchanged.\n"; writeFileSync(file, text); }

const summary = { schemaVersion: "velmere.pass35.a23-product-roadmap-summary.v1", passId: PASS, sourceRevisionId: REV, globalDecision: status.globalDecision, sellEnabledCount: 0, canonicalWeightedPlanningPercent: cw, canonicalStrictDonePercent: cs, canonicalCounts: sc, zeroBudgetWeightedPlanningPercent: zw, zeroBudgetCoreDenominator: core.length, zeroBudgetCounts: zc, baselineA16: { canonical: A16_CAN, zeroBudget: A16_ZERO }, baselineA22: { canonical: A22_CAN, zeroBudget: A22_ZERO }, benchmark: contract.benchmark, visualChangesMade: false, truthBoundary: status.truthBoundary };
writeJson(summaryPath, summary);
writeFileSync(boardPath, ["# PASS35 A23 — Evidence-Bound Remediation Closure", "", `- Source revision: \`${REV}\``, `- A16 start: **${A16_CAN}% canonical / ${A16_ZERO}% ZERO-BUDGET**`, `- A22 baseline: **${A22_CAN}% canonical / ${A22_ZERO}% ZERO-BUDGET**`, `- A23 current: **${cw}% canonical / ${cs}% strict / ${zw}% ZERO-BUDGET**`, `- Change vs A22: **+${(cw - A22_CAN).toFixed(1)} pp / +${(zw - A22_ZERO).toFixed(1)} pp**`, `- Benchmark: **${benchmark.denominators.cases} cases / ${benchmark.denominators.frozen} frozen / ${benchmark.mutation.killed}/${benchmark.mutation.total} mutations**`, `- Frozen closure accuracy: **${benchmark.frozen.closureAccuracy}**; unsafe-closure suppression: **${benchmark.frozen.unsafeClosureSuppression}**`, `- sellEnabled: **0**; decision: **NO_GO**; visual changes: **0**`, "", "## Truth boundary", "", status.truthBoundary, ""].join("\n"));

const rows = status.rows.map((r) => `${r.id} | ${r.status} | DONE: ${r.doneEvidence.join("; ")} | MISSING: ${r.missing.join("; ") || "—"} | BLOCKER: ${r.blocker} | NEXT: ${r.nextAction} | SELL: ${r.sellImpact}`);
const zrows = zero.capabilities.map((r) => `${r.id} | ${r.status} | ${r.resourceModel} | ${r.truth}`);
const old = readFileSync(roadmapPath, "utf8"); const historyIndex = old.indexOf("====================================================================================================\nPASS35 A22 —"); if (historyIndex < 0) throw new Error("a23_a22_history_missing");
let history = old.slice(historyIndex).replaceAll("PASS35 A22 is the only canonical current status.", "PASS35 A22 was canonical at that historical checkpoint and does not override A23.");
const roadmap = [
  "====================================================================================================", "PASS35 A23 — EVIDENCE-BOUND REMEDIATION + RETEST CLOSURE (NON-VISUAL)", "====================================================================================================",
  "Data rewizji: 2026-07-23, Europe/Berlin", `Source revision ID: ${REV}`, `Decyzja globalna: ${status.globalDecision}`, "Stan sprzedaży: 0 sellEnabled",
  `A16 START: ${A16_CAN}% canonical / ${A16_ZERO}% ZERO-BUDGET`, `A22 BASELINE: ${A22_CAN}% canonical / ${A22_ZERO}% ZERO-BUDGET`, `A23 CURRENT: ${cw}% canonical weighted / ${cs}% strict; ${zw}% ZERO-BUDGET`,
  `ZMIANA VS A22: canonical +${(cw - A22_CAN).toFixed(1)} pp; ZERO-BUDGET +${(zw - A22_ZERO).toFixed(1)} pp`, `ŁĄCZNA ZMIANA VS A16: canonical +${(cw - A16_CAN).toFixed(1)} pp; ZERO-BUDGET +${(zw - A16_ZERO).toFixed(1)} pp`,
  "Product/tier specification: 100% (7 surfaces x 3 tiers = 21)", "Visual changes: 0; CODEX_FRONTEND_WORKSTREAM remains untouched", "",
  "A23 — EVIDENCE-BOUND A15 IMPLEMENTATION", "----------------------------------------------------------------------------------------------------",
  "- Exact original/patched source and runtime-bytecode hashes are bound to the same chain/address subject.",
  "- An acyclic patch-impact graph must cover every affected component; unrelated or partial patches cannot close a finding.",
  "- Required retests are derived from 12 finding families across A02-A14 rather than accepted from an arbitrary caller list.",
  "- Every required retest needs distinct pre/post receipts, at least two evidence families, maintained behavioral coverage, no surviving finding and no new High/Critical regression.",
  "- Post-patch A14 triage must be Suppressed or Informational; reopened material severity blocks closure.",
  "- Supersession and invalidation triggers are included, while signed customer closure remains false.",
  `- Benchmark: ${benchmark.denominators.cases} cases / ${benchmark.denominators.frozen} frozen / ${benchmark.mutation.killed}/${benchmark.mutation.total} mutations.`,
  "- AUD17/A15 moves PARTIAL -> DONE for the declared local bounded implementation only.", "",
  "A23 — POSTĘP", "----------------------------------------------------------------------------------------------------", `- Canonical: A16 ${A16_CAN}% -> A22 ${A22_CAN}% -> A23 ${cw}%.`, `- ZERO-BUDGET: A16 ${A16_ZERO}% -> A22 ${A22_ZERO}% -> A23 ${zw}%.`,
  `- Canonical denominator 43: DONE ${sc.DONE}; PARTIAL ${sc.PARTIAL}; BLOCKED_EXTERNAL ${sc.BLOCKED_EXTERNAL}; NOT_DONE ${sc.NOT_DONE}.`, `- Zero-budget denominator ${core.length}: DONE ${zc.DONE}; PARTIAL ${zc.PARTIAL}; NOT_DONE ${zc.NOT_DONE}.`, "",
  "A23 — ZERO-BUDGET FUNCTIONAL CORE", "----------------------------------------------------------------------------------------------------", "ID | STATUS | RESOURCE MODEL | TRUTH", "----------------------------------------------------------------------------------------------------", ...zrows, "",
  "A23 — KANONICZNA TABELA 43 WORKSTREAMÓW", "----------------------------------------------------------------------------------------------------", ...rows, "",
  "A23 TRUTH BOUNDARY", "----------------------------------------------------------------------------------------------------", status.truthBoundary, "",
  "HISTORYCZNE PODSUMOWANIE A22 I WCZEŚNIEJSZYCH FAL", "----------------------------------------------------------------------------------------------------", "Everything below is historical implementation context and cannot override A23.", "", history.trimEnd(), ""
].join("\n");
writeFileSync(roadmapPath, roadmap);
const board = spawnSync(process.execPath, ["scripts/pass35/build-current-status-roadmap.mjs"], { encoding: "utf8" }); if (board.status !== 0) throw new Error(`a23_board_failed:${board.stderr || board.stdout}`);
console.log(JSON.stringify({ status: "PASS_A23_ROADMAP_BUILT", sourceRevisionId: REV, canonicalWeightedPlanningPercent: cw, canonicalStrictDonePercent: cs, zeroBudgetWeightedPlanningPercent: zw, deltaVsA22: contract.progressDeltaVsA22, deltaVsA16: contract.progressDeltaVsA16, cases: benchmark.denominators.cases, mutations: benchmark.denominators.mutations, sellEnabled: false }, null, 2));
