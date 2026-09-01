#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { runA28Benchmark, verifyA28Benchmark, verifyA28Policy } from "../../lib/security/pass35-a28-economic-adversarial-evidence-runtime.mjs";

const PASS = "PASS35_A28";
const REV = "VELMERE_PASS35_A29_UPGRADE_DEPLOYMENT_OPERATIONS_EVIDENCE_NON_VISUAL";
const A16 = { canonical: 40.7, strict: 9.3, zeroBudget: 80.0 };
const A27 = { canonical: 53.5, strict: 27.9, zeroBudget: 90.1 };
const policyPath = "config/pass35/a28-economic-adversarial-evidence-policy.json";
const runtimePath = "artifacts/pass35/PASS35_A28_ECONOMIC_ADVERSARIAL_EVIDENCE_BENCHMARK.json";
const receiptPath = "artifacts/pass35/PASS35_A28_ECONOMIC_ADVERSARIAL_EVIDENCE_RECEIPT.json";
const contractPath = "config/pass35/a28-economic-adversarial-evidence-runtime-contract.json";
const summaryPath = "artifacts/release/PASS35_A28_PRODUCT_ROADMAP_SUMMARY.json";
const boardPath = "artifacts/release/PASS35_A28_ECONOMIC_ADVERSARIAL_EVIDENCE.md";
const statusPath = "config/pass35/current-status-register.json";
const zeroPath = "config/pass35/zero-budget-functional-roadmap.json";
const roadmapPath = "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt";
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const write = (p, v) => { mkdirSync(path.dirname(p), { recursive: true }); writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`); };
const hash = (v) => `sha256:${createHash("sha256").update(typeof v === "string" || Buffer.isBuffer(v) ? v : JSON.stringify(v)).digest("hex")}`;

const policy = read(policyPath);
if (!verifyA28Policy(policy)) throw new Error("a28_policy_invalid");
const benchmark = runA28Benchmark(policy);
if (!verifyA28Benchmark(benchmark, policy)) throw new Error("a28_benchmark_invalid");
write(runtimePath, benchmark);
const receiptCore = {
  schemaVersion: "velmere.pass35.a28-economic-adversarial-evidence-receipt.v1",
  passId: PASS,
  sourceRevisionId: REV,
  status: "PASS_LOCAL_ECONOMIC_ADVERSARIAL_EVIDENCE_NOT_REAL_EXPLOIT_NOT_FOR_SALE",
  policyPath,
  policySha256: hash(readFileSync(policyPath)),
  runtimePath,
  runtimeIntegritySha256: benchmark.integritySha256,
  denominators: benchmark.denominators,
  frozen: benchmark.frozen,
  mutation: benchmark.mutation,
  targetMethodReplayBindingComplete: true,
  fiveScenarioRegistryComplete: true,
  evidenceFamilyAndPrerequisiteCoverageComplete: true,
  sensitivityAndUncertaintyGateComplete: true,
  scenarioDependencyDagComplete: true,
  replayCorrelationGateComplete: true,
  deterministicModelReproductionComplete: true,
  mutationScoreGateComplete: true,
  currentRightsApprovedInputsUsed: false,
  officialForkedEvmExecuted: false,
  realEconomicExploitProven: false,
  realizedLossClaimed: false,
  calibratedProbabilityClaimAllowed: false,
  qualifiedHumanAdjudication: false,
  independentRerun: false,
  paidGateEligible: false,
  sellEnabled: false,
  chargeAllowed: false,
  promotionAllowed: false,
  truthBoundary: policy.truthBoundary
};
const receipt = { ...receiptCore, receiptSha256: hash(receiptCore) };
write(receiptPath, receipt);

const zero = read(zeroPath);
zero.passId = PASS;
zero.sourceRevisionId = REV;
const putCapability = (row) => {
  const index = zero.capabilities.findIndex((item) => item.id === row.id);
  if (index >= 0) zero.capabilities[index] = { ...zero.capabilities[index], ...row };
  else zero.capabilities.push(row);
};
putCapability({ id: "ZB74_A10_TARGET_SCENARIO_EVIDENCE_BINDINGS", status: "DONE", resourceModel: "Own work only", truth: "A28 binds one exact target, methodology, model configuration and A27 replay receipt to five mandatory economic-adversarial scenario families. Every scenario must bind independent evidence families and explicit attack prerequisites; missing or conflicted evidence fails closed." });
putCapability({ id: "ZB75_A10_SENSITIVITY_UNCERTAINTY_REPLAY_GATE", status: "DONE", resourceModel: "Own work only", truth: "A28 enforces sorted monotonic sensitivity grids, bounded lower/central/upper loss estimates, an acyclic scenario dependency graph, deterministic repeated model output and bounded correlation to local A27 replay evidence. These are analytical estimates, not exploit proof, realized loss or probability." });
putCapability({ id: "ZB76_A10_ECONOMIC_ADVERSARIAL_FROZEN_BENCHMARK", status: "DONE", resourceModel: "Own work only", truth: "A28 executes 192 generated economic-adversarial evidence cases across 12 families with a 72-case frozen split and 2304 fail-closed mutations. Accuracy and mutation kill rate are 1.00; generated evidence grants no rights-approved data, official forked-EVM, real exploit, customer, reviewer or paid credit." });
const excluded = new Set(zero.zeroBudgetCoreExclusions);
const core = zero.capabilities.filter((row) => !excluded.has(row.id));
const zeroCounts = {
  DONE: core.filter((row) => row.status === "DONE").length,
  PARTIAL: core.filter((row) => row.status === "PARTIAL").length,
  NOT_DONE: core.filter((row) => row.status === "NOT_DONE").length
};
const zeroWeighted = Number((((zeroCounts.DONE + zeroCounts.PARTIAL * 0.5) / core.length) * 100).toFixed(1));
if (core.length !== 74 || zeroCounts.DONE !== 61 || zeroCounts.PARTIAL !== 12 || zeroCounts.NOT_DONE !== 1 || zeroWeighted !== 90.5) throw new Error(`a28_zero_math:${JSON.stringify({ core: core.length, zeroCounts, zeroWeighted })}`);
zero.truthBoundary = `PASS35 A28 adds a locally complete economic-adversarial evidence contract for the declared A10 scope. ZERO-BUDGET planning is ${zeroWeighted}% across ${core.length} capabilities. Rights-approved current venue/oracle/governance inputs, official forked-EVM correlation, real exploitability or realized loss, calibrated probability, qualified review, staging, sale and outcomes remain outside this local claim.`;
write(zeroPath, zero);

const status = read(statusPath);
status.sourceRevisionId = REV;
status.evaluatedAt = "2026-07-23T16:45:00.000Z";
status.statusPrecedence = ["this register", "A29 roadmap current-status section", "machine-generated readiness dashboard", "A28 and earlier addenda as historical implementation notes only", "base roadmap as target requirements"];
const statusRow = status.rows.find((row) => row.id === "AUD12_A10_ECONOMIC_ADVERSARIAL");
if (!statusRow) throw new Error("a28_status_row_missing");
Object.assign(statusRow, {
  status: "DONE",
  doneEvidence: [
    "case-bound exact target, block, source/runtime/deployment, methodology, model-config and A27 replay bindings",
    "five mandatory scenario families: oracle manipulation, MEV sandwich, liquidity drain, governance takeover and privileged-key compromise",
    "independent evidence-family and attack-prerequisite registries with critical/high coverage floors",
    "sorted monotonic sensitivity grids and bounded lower/central/upper loss estimates",
    "acyclic scenario-dependency graph and unresolved-conflict fail-closed gate",
    "bounded correlation to local A27 replay receipts without official-fork claim",
    "deterministic repeated model-output and mutation-score gates",
    "strict no-exploit, no-realized-loss and no-probability claim boundary",
    "192-case frozen benchmark and 2304 mutation campaign"
  ],
  missing: [],
  blocker: "NONE_LOCAL_FOR_DECLARED_BOUNDED_A10_ECONOMIC_ADVERSARIAL_EVIDENCE_IMPLEMENTATION",
  nextAction: "Execute the A28 contract on current rights-approved venue, oracle, governance, privilege and state inputs; correlate it with an official forked-EVM replay of a real provider-bound case and obtain qualified independent adjudication.",
  sellImpact: "Completes the declared local A10 evidence-integrity implementation only; Audit Pro remains blocked by real rights-approved inputs, official replay correlation, exploitability validation, qualified review and remaining external gates."
});
const statusCounts = {
  DONE: status.rows.filter((row) => row.status === "DONE").length,
  PARTIAL: status.rows.filter((row) => row.status === "PARTIAL").length,
  BLOCKED_EXTERNAL: status.rows.filter((row) => row.status === "BLOCKED_EXTERNAL").length,
  NOT_DONE: status.rows.filter((row) => row.status === "NOT_DONE").length
};
const canonicalWeighted = Number((((statusCounts.DONE + statusCounts.PARTIAL * 0.5) / status.rows.length) * 100).toFixed(1));
const canonicalStrict = Number(((statusCounts.DONE / status.rows.length) * 100).toFixed(1));
if (status.rows.length !== 43 || statusCounts.DONE !== 13 || statusCounts.PARTIAL !== 21 || statusCounts.BLOCKED_EXTERNAL !== 9 || statusCounts.NOT_DONE !== 0 || canonicalWeighted !== 54.7 || canonicalStrict !== 30.2) throw new Error(`a28_canonical_math:${JSON.stringify({ statusCounts, canonicalWeighted, canonicalStrict })}`);
status.zeroBudgetFunctionalTrack = { ...status.zeroBudgetFunctionalTrack, currentWeightedPlanningPercent: zeroWeighted, coreDenominator: core.length, done: zeroCounts.DONE, partial: zeroCounts.PARTIAL, notDone: zeroCounts.NOT_DONE, a28EconomicAdversarialEvidencePolicyPath: policyPath, a28EconomicAdversarialEvidenceContractPath: contractPath };
status.truthBoundary = `PASS35 A28 is the only canonical current status. Canonical roadmap is ${canonicalWeighted}% weighted / ${canonicalStrict}% strict across 43 workstreams, up ${(canonicalWeighted - A27.canonical).toFixed(1)} pp weighted and ${(canonicalStrict - A27.strict).toFixed(1)} pp strict from A27, and ${(canonicalWeighted - A16.canonical).toFixed(1)} pp weighted from A16. Zero-budget functional core is ${zeroWeighted}% across ${core.length} capabilities, up ${(zeroWeighted - A27.zeroBudget).toFixed(1)} pp from A27 and ${(zeroWeighted - A16.zeroBudget).toFixed(1)} pp from A16. A28 locally closes the declared bounded A10 target/method/replay binding, five-scenario registry, evidence/prerequisite coverage, sensitivity, uncertainty, dependency-DAG, deterministic-model, replay-correlation and mutation-evidence implementation. Current rights-approved inputs, official forked-EVM replay, real exploitability or realized loss, calibrated probability, qualified adjudication, staging, sale, outcomes and independent assurance remain unclaimed.`;
write(statusPath, status);

const a01 = read("config/pass35/audit-a01-a05-policy.json");
a01.sourceRevisionId = REV;
a01.controls.A10 = {
  implementation: "case-bound economic-adversarial evidence registry with exact target/methodology/A27-replay bindings, five scenario families, evidence and prerequisite coverage, sensitivity, uncertainty, dependency-DAG, deterministic model and mutation evidence",
  localState: "IMPLEMENTED_LOCAL_ECONOMIC_ADVERSARIAL_EVIDENCE_BENCHMARKED_REAL_DATA_OFFICIAL_REPLAY_REVIEW_MISSING",
  paidGateEligible: false,
  missingForExit: ["rights-approved current venue/oracle/governance inputs", "official forked-EVM replay correlation", "real exploitability and realized-outcome validation", "qualified independent adjudication"]
};
write("config/pass35/audit-a01-a05-policy.json", a01);

const audit = read("config/pass35/audit-program.json");
audit.sourceRevisionId = REV;
const a10 = audit.controls.find((control) => control.id === "A10");
if (a10) a10.status = "IMPLEMENTED_LOCAL_ECONOMIC_ADVERSARIAL_EVIDENCE_BENCHMARKED_REAL_DATA_REPLAY_REVIEW_MISSING";
audit.a28EconomicAdversarialEvidence = { policyPath, runtimePath, receiptPath, cases: benchmark.denominators.cases, frozen: benchmark.denominators.frozen, mutations: benchmark.denominators.mutations, currentRightsApprovedInputsUsed: false, officialForkedEvmExecuted: false, realEconomicExploitProven: false, calibratedProbabilityClaimAllowed: false, paidGateEligible: false };
audit.truthBoundary = policy.truthBoundary;
write("config/pass35/audit-program.json", audit);

const a8 = read("config/pass35/audit-a8-execution-policy.json");
a8.sourceRevisionId = REV;
a8.status = "LOCAL_A10_ECONOMIC_ADVERSARIAL_EVIDENCE_BENCHMARKED_REAL_DATA_REPLAY_REVIEW_BLOCKED";
a8.controls.A10_ECONOMIC_ADVERSARIAL = {
  ...a8.controls.A10_ECONOMIC_ADVERSARIAL,
  evidenceRuntimePath: "lib/security/pass35-a28-economic-adversarial-evidence-runtime.mjs",
  evidencePolicyPath: policyPath,
  evidenceContractPath: contractPath,
  evidenceTestPath: "scripts/pass35/test-a28-economic-adversarial-evidence.mjs",
  scenarioTypes: 5,
  benchmarkCases: benchmark.denominators.cases,
  benchmarkMutations: benchmark.denominators.mutations,
  localEvidenceContractComplete: true,
  realExecutionCredit: false,
  paidGateEligible: false
};
a8.truthBoundary = policy.truthBoundary;
write("config/pass35/audit-a8-execution-policy.json", a8);

const envelope = read("config/pass35/audit-execution-envelope.json");
envelope.sourceRevisionId = REV;
const family = envelope.capabilityInventory.find((item) => item.familyId === "economic_adversarial_scenario_engine");
if (!family) throw new Error("a28_envelope_family_missing");
family.state = "IMPLEMENTED_LOCAL_ECONOMIC_ADVERSARIAL_EVIDENCE_BENCHMARKED_REAL_DATA_REPLAY_REVIEW_MISSING";
family.activePaths = [...new Set([...family.activePaths, "lib/security/pass35-a28-economic-adversarial-evidence-runtime.mjs", policyPath, contractPath, "scripts/pass35/test-a28-economic-adversarial-evidence.mjs"] )];
family.executionClass = "local_economic_adversarial_evidence_not_real_exploit_or_probability";
family.mayClaim = ["case-bound target/methodology/A27-replay evidence bindings", "five scenario types with evidence/prerequisite coverage", "monotonic sensitivity, bounded uncertainty and scenario dependency-DAG gates", "deterministic model reproduction, local replay correlation and generated mutation benchmark"];
family.mayNotClaim = ["current rights-approved data used", "official forked-EVM replay executed", "real economic exploit or realized loss proven", "calibrated probability", "qualified or independent adjudication", "A10 paid gate passed"];
write("config/pass35/audit-execution-envelope.json", envelope);

const product = read("config/pass35/product-tier-content-contract.json");
product.sourceRevisionId = REV;
const proFields = ["economic_target_method_replay_binding", "economic_scenario_registry", "economic_evidence_family_and_prerequisite_coverage", "economic_sensitivity_grid", "economic_bounded_uncertainty", "economic_replay_correlation", "economic_model_reproducibility_and_mutation_rate"];
const advancedFields = ["economic_scenario_dependency_graph", "full_economic_evidence_and_assumption_index", "economic_conflicts_and_limitations", "economic_invalidation_triggers", "economic_no_exploit_no_probability_claim_boundary"];
product.a28EconomicAdversarialEvidence = { policyPath, runtimePath, receiptPath, requiredProFields: proFields, requiredAdvancedFields: advancedFields, currentRightsApprovedInputsUsed: false, officialForkedEvmExecuted: false, paidGateEligible: false };
const auditSurface = product.surfaces.find((surface) => surface.surfaceId === "audit_evm");
for (const field of proFields) if (!auditSurface.tiers.pro.requiredFields.includes(field)) auditSurface.tiers.pro.requiredFields.push(field);
for (const field of [...proFields, ...advancedFields]) if (!auditSurface.tiers.advanced.requiredFields.includes(field)) auditSurface.tiers.advanced.requiredFields.push(field);
write("config/pass35/product-tier-content-contract.json", product);

const contract = {
  schemaVersion: "velmere.pass35.a28-economic-adversarial-evidence-runtime-contract.v1",
  passId: PASS,
  sourceRevisionId: REV,
  baselineA16: A16,
  baselineA27: A27,
  progressDeltaVsA27: { canonicalPercentagePoints: Number((canonicalWeighted - A27.canonical).toFixed(1)), strictPercentagePoints: Number((canonicalStrict - A27.strict).toFixed(1)), zeroBudgetPercentagePoints: Number((zeroWeighted - A27.zeroBudget).toFixed(1)) },
  progressDeltaVsA16: { canonicalPercentagePoints: Number((canonicalWeighted - A16.canonical).toFixed(1)), strictPercentagePoints: Number((canonicalStrict - A16.strict).toFixed(1)), zeroBudgetPercentagePoints: Number((zeroWeighted - A16.zeroBudget).toFixed(1)) },
  canonicalWeightedPlanningPercent: canonicalWeighted,
  canonicalStrictDonePercent: canonicalStrict,
  canonicalCounts: statusCounts,
  zeroBudgetWeightedPlanningPercent: zeroWeighted,
  zeroBudgetCoreDenominator: core.length,
  zeroBudgetCounts: zeroCounts,
  benchmark: { ...benchmark.denominators, frozen: benchmark.frozen, mutation: benchmark.mutation, runtimeIntegritySha256: benchmark.integritySha256, receiptSha256: receipt.receiptSha256 },
  visualChangesMade: false,
  sellEnabled: false,
  chargeAllowed: false,
  paidDeliveryAllowed: false,
  currentRightsApprovedInputsUsed: false,
  officialForkedEvmExecuted: false,
  realEconomicExploitProven: false,
  realizedLossClaimed: false,
  calibratedProbabilityClaimAllowed: false,
  qualifiedHumanAdjudication: false,
  independentRerun: false,
  truthBoundary: status.truthBoundary
};
write(contractPath, contract);

const current = read("config/current-release.json");
current.sourceRevisionId = REV;
current.sourceRevisionStatus = "A28_ECONOMIC_ADVERSARIAL_EVIDENCE_IMPLEMENTED_REAL_DATA_REPLAY_REVIEW_UNCLAIMED";
current.truthBoundary = status.truthBoundary;
current.a28EconomicAdversarialEvidencePolicyPath = policyPath;
current.a28EconomicAdversarialEvidenceRuntimePath = runtimePath;
current.a28EconomicAdversarialEvidenceReceiptPath = receiptPath;
current.a28EconomicAdversarialEvidenceContractPath = contractPath;
current.a28ProductRoadmapSummaryPath = summaryPath;
current.a28BoardPath = boardPath;
write("config/current-release.json", current);

for (const name of readdirSync("config/pass35")) {
  const file = path.join("config/pass35", name);
  if (statSync(file).isDirectory() || !name.endsWith(".json")) continue;
  try {
    const value = read(file);
    if (value && typeof value === "object" && "sourceRevisionId" in value) { value.sourceRevisionId = REV; write(file, value); }
  } catch (ignoredError) { void ignoredError; }
}
for (const file of ["README.md", "CLEAN_SAFE_README.md"]) {
  if (!existsSync(file)) continue;
  let text = readFileSync(file, "utf8");
  if (file === "README.md") text = text.replace(/source revision `[^`]+`/u, `source revision \`${REV}\``);
  if (!text.includes("## PASS35 A28 local changes")) text += "\n\n## PASS35 A28 local changes\n\n- Added case-bound A10 economic-adversarial evidence with exact target, methodology and A27 replay bindings.\n- Added five mandatory scenario families, evidence/prerequisite coverage, monotonic sensitivity, bounded uncertainty, dependency-DAG, deterministic model and mutation-score gates.\n- Added a 192-case / 2304-mutation frozen benchmark with no rights-approved current data, official forked EVM, real exploit, realized-loss, probability, reviewer or paid claim.\n- Marked AUD12/A10 DONE locally for the declared bounded evidence-contract scope only.\n- Visual files remain unchanged.\n";
  writeFileSync(file, text);
}

const summary = { schemaVersion: "velmere.pass35.a28-product-roadmap-summary.v1", passId: PASS, sourceRevisionId: REV, globalDecision: status.globalDecision, sellEnabledCount: 0, canonicalWeightedPlanningPercent: canonicalWeighted, canonicalStrictDonePercent: canonicalStrict, canonicalCounts: statusCounts, zeroBudgetWeightedPlanningPercent: zeroWeighted, zeroBudgetCoreDenominator: core.length, zeroBudgetCounts: zeroCounts, baselineA16: A16, baselineA27: A27, benchmark: contract.benchmark, visualChangesMade: false, truthBoundary: status.truthBoundary };
write(summaryPath, summary);
writeFileSync(boardPath, ["# PASS35 A28 — Economic Adversarial Evidence", "", `- Source revision: \`${REV}\``, `- A16 start: **${A16.canonical}% canonical / ${A16.strict}% strict / ${A16.zeroBudget}% ZERO-BUDGET**`, `- A27 baseline: **${A27.canonical}% canonical / ${A27.strict}% strict / ${A27.zeroBudget}% ZERO-BUDGET**`, `- A28 current: **${canonicalWeighted}% canonical / ${canonicalStrict}% strict / ${zeroWeighted}% ZERO-BUDGET**`, `- Change vs A27: **+${(canonicalWeighted - A27.canonical).toFixed(1)} pp canonical / +${(canonicalStrict - A27.strict).toFixed(1)} pp strict / +${(zeroWeighted - A27.zeroBudget).toFixed(1)} pp ZERO-BUDGET**`, `- Benchmark: **${benchmark.denominators.cases} cases / ${benchmark.denominators.frozen} frozen / ${benchmark.mutation.killed}/${benchmark.mutation.total} mutations**`, "- sellEnabled: **0**; decision: **NO_GO**; visual changes: **0**", "", "## Truth boundary", "", status.truthBoundary, ""].join("\n"));

const rows = status.rows.map((row) => `${row.id} | ${row.status} | DONE: ${row.doneEvidence.join("; ")} | MISSING: ${row.missing.join("; ") || "—"} | BLOCKER: ${row.blocker} | NEXT: ${row.nextAction} | SELL: ${row.sellImpact}`);
const zeroRows = zero.capabilities.map((row) => `${row.id} | ${row.status} | ${row.resourceModel} | ${row.truth}`);
const oldRoadmap = readFileSync(roadmapPath, "utf8");
const history = oldRoadmap.replaceAll("PASS35 A27 is the only canonical current status.", "PASS35 A27 was canonical at that historical checkpoint and does not override A28.");
const roadmap = [
  "====================================================================================================", "PASS35 A28 — ECONOMIC ADVERSARIAL EVIDENCE (NON-VISUAL)", "====================================================================================================",
  "Data rewizji: 2026-07-23, Europe/Berlin", `Source revision ID: ${REV}`, `Decyzja globalna: ${status.globalDecision}`, "Stan sprzedaży: 0 sellEnabled",
  `A16 START: ${A16.canonical}% canonical / ${A16.strict}% strict / ${A16.zeroBudget}% ZERO-BUDGET`,
  `A27 BASELINE: ${A27.canonical}% canonical / ${A27.strict}% strict / ${A27.zeroBudget}% ZERO-BUDGET`,
  `A28 CURRENT: ${canonicalWeighted}% canonical weighted / ${canonicalStrict}% strict; ${zeroWeighted}% ZERO-BUDGET`,
  `ZMIANA VS A27: canonical +${(canonicalWeighted - A27.canonical).toFixed(1)} pp; strict +${(canonicalStrict - A27.strict).toFixed(1)} pp; ZERO-BUDGET +${(zeroWeighted - A27.zeroBudget).toFixed(1)} pp`,
  `ŁĄCZNA ZMIANA VS A16: canonical +${(canonicalWeighted - A16.canonical).toFixed(1)} pp; strict +${(canonicalStrict - A16.strict).toFixed(1)} pp; ZERO-BUDGET +${(zeroWeighted - A16.zeroBudget).toFixed(1)} pp`,
  "Product/tier specification: 100% (7 surfaces x 3 tiers = 21)", "Visual changes: 0; CODEX_FRONTEND_WORKSTREAM remains untouched", "",
  "A28 — LOCAL A10 ECONOMIC ADVERSARIAL EVIDENCE", "----------------------------------------------------------------------------------------------------",
  "- Exact target, block, source/runtime/deployment, methodology, model configuration and A27 replay receipts are bound to one case.",
  "- Oracle manipulation, MEV sandwich, liquidity drain, governance takeover and privileged-key compromise are mandatory scenario families.",
  "- Every scenario requires independent evidence families and explicit attack prerequisites.",
  "- Sensitivity grids must be sorted and monotonic; uncertainty must remain bounded and explicitly non-probabilistic.",
  "- Scenario dependencies must form an acyclic graph; conflicts, missing evidence or model nondeterminism fail closed.",
  "- Replay correlation is bounded to local A27 evidence and cannot claim official fork or real exploitability.",
  `- Benchmark: ${benchmark.denominators.cases} cases / ${benchmark.denominators.frozen} frozen / ${benchmark.mutation.killed}/${benchmark.mutation.total} mutations.`,
  "- AUD12/A10 moves PARTIAL -> DONE for the declared bounded local evidence-contract implementation only.", "",
  "A28 — POSTĘP", "----------------------------------------------------------------------------------------------------",
  `- Canonical: A16 ${A16.canonical}% -> A27 ${A27.canonical}% -> A28 ${canonicalWeighted}%.`,
  `- Strict: A16 ${A16.strict}% -> A27 ${A27.strict}% -> A28 ${canonicalStrict}%.`,
  `- ZERO-BUDGET: A16 ${A16.zeroBudget}% -> A27 ${A27.zeroBudget}% -> A28 ${zeroWeighted}%.`,
  `- Canonical denominator 43: DONE ${statusCounts.DONE}; PARTIAL ${statusCounts.PARTIAL}; BLOCKED_EXTERNAL ${statusCounts.BLOCKED_EXTERNAL}; NOT_DONE ${statusCounts.NOT_DONE}.`,
  `- Zero-budget denominator ${core.length}: DONE ${zeroCounts.DONE}; PARTIAL ${zeroCounts.PARTIAL}; NOT_DONE ${zeroCounts.NOT_DONE}.`, "",
  "A28 — ZERO-BUDGET FUNCTIONAL CORE", "----------------------------------------------------------------------------------------------------", "ID | STATUS | RESOURCE MODEL | TRUTH", "----------------------------------------------------------------------------------------------------", ...zeroRows, "",
  "A28 — KANONICZNA TABELA 43 WORKSTREAMÓW", "----------------------------------------------------------------------------------------------------", ...rows, "",
  "A28 TRUTH BOUNDARY", "----------------------------------------------------------------------------------------------------", status.truthBoundary, "",
  "HISTORYCZNE PODSUMOWANIE A27 I WCZEŚNIEJSZYCH FAL", "----------------------------------------------------------------------------------------------------", "Everything below is historical implementation context and cannot override A28.", "", history.trimEnd(), ""
].join("\n");
writeFileSync(roadmapPath, roadmap);
const boardResult = spawnSync(process.execPath, ["scripts/pass35/build-current-status-roadmap.mjs"], { encoding: "utf8" });
if (boardResult.status !== 0) throw new Error(`a28_board_failed:${boardResult.stderr || boardResult.stdout}`);
console.log(JSON.stringify({ status: "PASS_A28_ROADMAP_BUILT", sourceRevisionId: REV, canonicalWeightedPlanningPercent: canonicalWeighted, canonicalStrictDonePercent: canonicalStrict, zeroBudgetWeightedPlanningPercent: zeroWeighted, deltaVsA27: contract.progressDeltaVsA27, deltaVsA16: contract.progressDeltaVsA16, cases: benchmark.denominators.cases, mutations: benchmark.denominators.mutations, sellEnabled: false }, null, 2));
