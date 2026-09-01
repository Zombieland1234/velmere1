#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { runA30Benchmark, verifyA30Benchmark, verifyA30Policy } from "../../lib/security/pass35-a30-threat-model-runtime.mjs";

const PASS = "PASS35_A30";
const REV = "VELMERE_PASS35_A30_THREAT_MODEL_EVIDENCE_NON_VISUAL";
const A16 = { canonical: 40.7, strict: 9.3, zeroBudget: 80.0 };
const A29 = { canonical: 55.8, strict: 32.6, zeroBudget: 90.9 };
const policyPath = "config/pass35/a30-threat-model-policy.json";
const runtimePath = "artifacts/pass35/PASS35_A30_THREAT_MODEL_BENCHMARK.json";
const receiptPath = "artifacts/pass35/PASS35_A30_THREAT_MODEL_RECEIPT.json";
const contractPath = "config/pass35/a30-threat-model-runtime-contract.json";
const summaryPath = "artifacts/release/PASS35_A30_PRODUCT_ROADMAP_SUMMARY.json";
const boardPath = "artifacts/release/PASS35_A30_THREAT_MODEL.md";
const statusPath = "config/pass35/current-status-register.json";
const zeroPath = "config/pass35/zero-budget-functional-roadmap.json";
const roadmapPath = "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt";
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const write = (p, v) => { mkdirSync(path.dirname(p), { recursive: true }); writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`); };
const hash = (v) => `sha256:${createHash("sha256").update(typeof v === "string" || Buffer.isBuffer(v) ? v : JSON.stringify(v)).digest("hex")}`;

const policy = read(policyPath);
if (!verifyA30Policy(policy)) throw new Error("a30_policy_invalid");
const benchmark = runA30Benchmark(policy);
if (!verifyA30Benchmark(benchmark, policy)) throw new Error("a30_benchmark_invalid");
write(runtimePath, benchmark);
const receiptCore = {
  schemaVersion: "velmere.pass35.a30-threat-model-receipt.v1",
  passId: PASS,
  sourceRevisionId: REV,
  status: "PASS_LOCAL_THREAT_MODEL_NOT_HUMAN_REVIEWED_NOT_FOR_SALE",
  policyPath,
  policySha256: hash(readFileSync(policyPath)),
  runtimePath,
  runtimeIntegritySha256: benchmark.integritySha256,
  denominators: benchmark.denominators,
  frozen: benchmark.frozen,
  mutation: benchmark.mutation,
  caseArchitectureBindingComplete: true,
  componentAssetActorRegistryComplete: true,
  trustBoundaryDataFlowCoverageComplete: true,
  entryPointAccessMappingComplete: true,
  assumptionInvalidationRegistryComplete: true,
  criticalAssetInvariantCoverageComplete: true,
  abuseCaseAttackPathMitigationComplete: true,
  residualRiskLimitationsComplete: true,
  coverageDenominatorsComplete: true,
  deterministicThreatModelReplayComplete: true,
  mutationScoreGateComplete: true,
  protocolSpecificAssumptionsHumanValidated: false,
  businessLogicHumanReviewed: false,
  realArchitectureWorkshopExecuted: false,
  everyRealWorldThreatModeled: false,
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
putCapability({ id: "ZB80_A03_COMPONENT_ASSET_ACTOR_BOUNDARY_REGISTRY", status: "DONE", resourceModel: "Own work only", truth: "A30 binds one exact case to complete component, critical-asset and actor registries, trust boundaries, data flows and entry-point access evidence. Orphan references, duplicate identities and denominator inflation fail closed." });
putCapability({ id: "ZB81_A03_ASSUMPTION_INVARIANT_ABUSE_ATTACK_MODEL", status: "DONE", resourceModel: "Own work only", truth: "A30 requires explicit protocol/market/oracle/governance/dependency assumptions with invalidation triggers, critical-asset invariants, abuse-case preconditions, acyclic attack paths, tested mitigations, residual risk and limitations." });
putCapability({ id: "ZB82_A03_THREAT_MODEL_REPLAY_FROZEN_BENCHMARK", status: "DONE", resourceModel: "Own work only", truth: "A30 executes 192 generated threat-model evidence cases across 12 families with a 72-case frozen split and 2304 fail-closed mutations. Generated evidence grants no manual architecture, protocol-assumption, customer, independent or paid credit." });
const excluded = new Set(zero.zeroBudgetCoreExclusions);
const core = zero.capabilities.filter((row) => !excluded.has(row.id));
const zeroCounts = { DONE: core.filter((row) => row.status === "DONE").length, PARTIAL: core.filter((row) => row.status === "PARTIAL").length, NOT_DONE: core.filter((row) => row.status === "NOT_DONE").length };
const zeroWeighted = Number((((zeroCounts.DONE + zeroCounts.PARTIAL * 0.5) / core.length) * 100).toFixed(1));
if (core.length !== 80 || zeroCounts.DONE !== 67 || zeroCounts.PARTIAL !== 12 || zeroCounts.NOT_DONE !== 1 || zeroWeighted !== 91.3) throw new Error(`a30_zero_math:${JSON.stringify({ core: core.length, zeroCounts, zeroWeighted })}`);
zero.truthBoundary = `PASS35 A30 adds a locally complete case-bound threat-model evidence contract for the declared A03 scope. ZERO-BUDGET planning is ${zeroWeighted}% across ${core.length} capabilities. Human validation of protocol assumptions, manual business-logic adjudication, a real architecture workshop, independent review, staging, sale and customer outcomes remain outside this local claim.`;
write(zeroPath, zero);

const status = read(statusPath);
status.sourceRevisionId = REV;
status.evaluatedAt = "2026-07-23T18:30:00.000Z";
status.statusPrecedence = ["this register", "A30 roadmap current-status section", "machine-generated readiness dashboard", "A29 and earlier addenda as historical implementation notes only", "base roadmap as target requirements"];
const statusRow = status.rows.find((row) => row.id === "AUD03_A03_THREAT_MODEL");
if (!statusRow) throw new Error("a30_status_row_missing");
Object.assign(statusRow, {
  status: "DONE",
  doneEvidence: [
    "case-bound exact chain/block/source/runtime/deployment/architecture/A29 receipt bindings",
    "complete component, critical-asset and actor registries with evidence digests",
    "trust-boundary, data-flow and state-changing entry-point access coverage",
    "protocol/market/oracle/governance/dependency/operations assumption registry with invalidation triggers",
    "critical/high asset invariants bound to component and test receipts",
    "abuse-case preconditions, entry points, affected boundaries and target assets",
    "acyclic attack-step paths, tested mitigations, residual risk and explicit limitations",
    "exact coverage denominators and deterministic local replay",
    "192-case frozen benchmark and 2304 mutation campaign"
  ],
  missing: [],
  blocker: "NONE_LOCAL_FOR_DECLARED_BOUNDED_A03_THREAT_MODEL_EVIDENCE_IMPLEMENTATION",
  nextAction: "Execute the A30 contract against a rights-approved real protocol architecture, conduct a reviewer-led workshop, validate protocol-specific assumptions and independently adjudicate business logic and unmodeled threats.",
  sellImpact: "Completes the declared local A03 evidence-integrity implementation only; Audit Pro/Advanced remain blocked by real architecture evidence, qualified human review and remaining external gates."
});
const statusCounts = { DONE: status.rows.filter((row) => row.status === "DONE").length, PARTIAL: status.rows.filter((row) => row.status === "PARTIAL").length, BLOCKED_EXTERNAL: status.rows.filter((row) => row.status === "BLOCKED_EXTERNAL").length, NOT_DONE: status.rows.filter((row) => row.status === "NOT_DONE").length };
const canonicalWeighted = Number((((statusCounts.DONE + statusCounts.PARTIAL * 0.5) / status.rows.length) * 100).toFixed(1));
const canonicalStrict = Number(((statusCounts.DONE / status.rows.length) * 100).toFixed(1));
if (status.rows.length !== 43 || statusCounts.DONE !== 15 || statusCounts.PARTIAL !== 19 || statusCounts.BLOCKED_EXTERNAL !== 9 || statusCounts.NOT_DONE !== 0 || canonicalWeighted !== 57.0 || canonicalStrict !== 34.9) throw new Error(`a30_canonical_math:${JSON.stringify({ statusCounts, canonicalWeighted, canonicalStrict })}`);
status.zeroBudgetFunctionalTrack = { ...status.zeroBudgetFunctionalTrack, currentWeightedPlanningPercent: zeroWeighted, coreDenominator: core.length, done: zeroCounts.DONE, partial: zeroCounts.PARTIAL, notDone: zeroCounts.NOT_DONE, a30ThreatModelPolicyPath: policyPath, a30ThreatModelContractPath: contractPath };
status.truthBoundary = `PASS35 A30 is the only canonical current status. Canonical roadmap is ${canonicalWeighted}% weighted / ${canonicalStrict}% strict across 43 workstreams, up ${(canonicalWeighted - A29.canonical).toFixed(1)} pp weighted and ${(canonicalStrict - A29.strict).toFixed(1)} pp strict from A29, and ${(canonicalWeighted - A16.canonical).toFixed(1)} pp weighted from A16. Zero-budget functional core is ${zeroWeighted}% across ${core.length} capabilities, up ${(zeroWeighted - A29.zeroBudget).toFixed(1)} pp from A29 and ${(zeroWeighted - A16.zeroBudget).toFixed(1)} pp from A16. A30 locally closes the declared bounded A03 component/asset/actor, trust-boundary, data-flow, entry-point, assumption, invariant, abuse-case, attack-path, mitigation, residual-risk, coverage, replay and mutation-evidence implementation. Human architecture review, real protocol assumptions, business-logic adjudication, staging, sale, outcomes and independent assurance remain unclaimed.`;
write(statusPath, status);

const a01 = read("config/pass35/audit-a01-a05-policy.json");
a01.sourceRevisionId = REV;
a01.controls.A03 = { implementation: "case-bound threat-model evidence with architecture, component/asset/actor, trust-boundary/data-flow, entry-point, assumption/invalidation, invariant, abuse-case, attack-path/mitigation, residual-risk and coverage controls", localState: "IMPLEMENTED_LOCAL_CASE_BOUND_THREAT_MODEL_EVIDENCE_BENCHMARKED_HUMAN_REVIEW_MISSING", paidGateEligible: false, missingForExit: ["rights-approved real protocol architecture", "reviewer-led architecture workshop", "protocol-specific assumption validation", "manual business-logic and unmodeled-threat adjudication"] };
write("config/pass35/audit-a01-a05-policy.json", a01);

const audit = read("config/pass35/audit-program.json");
audit.sourceRevisionId = REV;
const a03 = audit.controls.find((control) => control.id === "A03");
if (a03) a03.status = "IMPLEMENTED_LOCAL_CASE_BOUND_THREAT_MODEL_EVIDENCE_BENCHMARKED_HUMAN_REVIEW_MISSING";
audit.a30ThreatModel = { policyPath, runtimePath, receiptPath, cases: benchmark.denominators.cases, frozen: benchmark.denominators.frozen, mutations: benchmark.denominators.mutations, protocolSpecificAssumptionsHumanValidated: false, businessLogicHumanReviewed: false, realArchitectureWorkshopExecuted: false, independentRerun: false, paidGateEligible: false };
audit.truthBoundary = policy.truthBoundary;
write("config/pass35/audit-program.json", audit);

const a8 = read("config/pass35/audit-a8-execution-policy.json");
a8.sourceRevisionId = REV;
a8.controls.A03_THREAT_MODEL = { evidenceRuntimePath: "lib/security/pass35-a30-threat-model-runtime.mjs", evidencePolicyPath: policyPath, evidenceContractPath: contractPath, evidenceTestPath: "scripts/pass35/test-a30-threat-model.mjs", controlFamilies: 12, benchmarkCases: benchmark.denominators.cases, benchmarkMutations: benchmark.denominators.mutations, localEvidenceContractComplete: true, realExecutionCredit: false, paidGateEligible: false };
a8.truthBoundary = policy.truthBoundary;
write("config/pass35/audit-a8-execution-policy.json", a8);

const envelope = read("config/pass35/audit-execution-envelope.json");
envelope.sourceRevisionId = REV;
let family = envelope.capabilityInventory.find((item) => item.familyId === "architecture_threat_model");
if (!family) {
  family = { familyId: "architecture_threat_model", label: "Architecture and threat model", requiredFor: ["audit_evm_pro", "audit_evm_advanced"], state: "MISSING", activePaths: [], executionClass: "local_contract", mayClaim: [], mayNotClaim: [] };
  envelope.capabilityInventory.push(family);
}
family.state = "IMPLEMENTED_LOCAL_CASE_BOUND_THREAT_MODEL_EVIDENCE_BENCHMARKED_HUMAN_REVIEW_MISSING";
family.activePaths = [...new Set([...(family.activePaths ?? []), "lib/security/pass35-a30-threat-model-runtime.mjs", policyPath, contractPath, "scripts/pass35/test-a30-threat-model.mjs"] )];
family.executionClass = "local_threat_model_evidence_not_human_reviewed_or_real_architecture_workshop";
family.mayClaim = ["case-bound architecture and registry evidence", "trust-boundary/data-flow and entry-point coverage", "assumption/invalidation, invariant and abuse-case evidence", "acyclic attack paths, tested mitigations, residual risk and generated mutation benchmark"];
family.mayNotClaim = ["protocol assumptions validated by a qualified human", "business logic manually adjudicated", "every real-world threat modeled", "independent architecture review", "A03 paid gate passed"];
write("config/pass35/audit-execution-envelope.json", envelope);

const product = read("config/pass35/product-tier-content-contract.json");
product.sourceRevisionId = REV;
const proFields = ["threat_model_case_architecture_binding", "threat_model_component_asset_actor_registry", "threat_model_trust_boundary_and_data_flow_coverage", "threat_model_entry_point_access_mapping", "threat_model_assumption_and_invalidation_registry", "threat_model_critical_asset_invariants", "threat_model_abuse_cases_attack_paths_and_mitigations", "threat_model_residual_risk_coverage_and_replay"];
const advancedFields = ["full_threat_model_evidence_index", "threat_model_assumption_conflicts", "threat_model_unmodeled_scope_and_limitations", "threat_model_invalidation_triggers", "threat_model_no_human_review_no_completeness_claim_boundary"];
product.a30ThreatModel = { policyPath, runtimePath, receiptPath, requiredProFields: proFields, requiredAdvancedFields: advancedFields, protocolSpecificAssumptionsHumanValidated: false, businessLogicHumanReviewed: false, paidGateEligible: false };
const auditSurface = product.surfaces.find((surface) => surface.surfaceId === "audit_evm");
for (const field of proFields) if (!auditSurface.tiers.pro.requiredFields.includes(field)) auditSurface.tiers.pro.requiredFields.push(field);
for (const field of [...proFields, ...advancedFields]) if (!auditSurface.tiers.advanced.requiredFields.includes(field)) auditSurface.tiers.advanced.requiredFields.push(field);
write("config/pass35/product-tier-content-contract.json", product);

const contract = {
  schemaVersion: "velmere.pass35.a30-threat-model-runtime-contract.v1", passId: PASS, sourceRevisionId: REV,
  baselineA16: A16, baselineA29: A29,
  progressDeltaVsA29: { canonicalPercentagePoints: Number((canonicalWeighted - A29.canonical).toFixed(1)), strictPercentagePoints: Number((canonicalStrict - A29.strict).toFixed(1)), zeroBudgetPercentagePoints: Number((zeroWeighted - A29.zeroBudget).toFixed(1)) },
  progressDeltaVsA16: { canonicalPercentagePoints: Number((canonicalWeighted - A16.canonical).toFixed(1)), strictPercentagePoints: Number((canonicalStrict - A16.strict).toFixed(1)), zeroBudgetPercentagePoints: Number((zeroWeighted - A16.zeroBudget).toFixed(1)) },
  canonicalWeightedPlanningPercent: canonicalWeighted, canonicalStrictDonePercent: canonicalStrict, canonicalCounts: statusCounts,
  zeroBudgetWeightedPlanningPercent: zeroWeighted, zeroBudgetCoreDenominator: core.length, zeroBudgetCounts: zeroCounts,
  benchmark: { ...benchmark.denominators, frozen: benchmark.frozen, mutation: benchmark.mutation, runtimeIntegritySha256: benchmark.integritySha256, receiptSha256: receipt.receiptSha256 },
  visualChangesMade: false, sellEnabled: false, chargeAllowed: false, paidDeliveryAllowed: false,
  protocolSpecificAssumptionsHumanValidated: false, businessLogicHumanReviewed: false, realArchitectureWorkshopExecuted: false, everyRealWorldThreatModeled: false, independentRerun: false,
  truthBoundary: status.truthBoundary
};
write(contractPath, contract);

const current = read("config/current-release.json");
current.sourceRevisionId = REV;
current.sourceRevisionStatus = "A30_THREAT_MODEL_IMPLEMENTED_HUMAN_REVIEW_UNCLAIMED";
current.truthBoundary = status.truthBoundary;
current.a30ThreatModelPolicyPath = policyPath;
current.a30ThreatModelRuntimePath = runtimePath;
current.a30ThreatModelReceiptPath = receiptPath;
current.a30ThreatModelContractPath = contractPath;
current.a30ProductRoadmapSummaryPath = summaryPath;
current.a30BoardPath = boardPath;
write("config/current-release.json", current);

for (const name of readdirSync("config/pass35")) {
  const file = path.join("config/pass35", name);
  if (statSync(file).isDirectory() || !name.endsWith(".json")) continue;
  try { const value = read(file); if (value && typeof value === "object" && "sourceRevisionId" in value) { value.sourceRevisionId = REV; write(file, value); } } catch (ignoredError) { void ignoredError; }
}
for (const file of ["README.md", "CLEAN_SAFE_README.md"]) {
  if (!existsSync(file)) continue;
  let text = readFileSync(file, "utf8");
  if (file === "README.md") text = text.replace(/source revision `[^`]+`/u, `source revision \`${REV}\``);
  if (!text.includes("## PASS35 A30 local changes")) text += "\n\n## PASS35 A30 local changes\n\n- Added case-bound A03 threat-model evidence with component/asset/actor registries, trust boundaries, data flows, entry points, assumptions/invalidation, invariants, abuse cases, attack paths, mitigations, residual risk and coverage controls.\n- Added deterministic local threat-model replay and a 192-case / 2304-mutation frozen benchmark.\n- Marked AUD03/A03 DONE locally for the declared bounded evidence-contract scope only.\n- Human architecture review, protocol-assumption validation, business-logic adjudication and paid readiness remain unclaimed.\n- Visual files remain unchanged.\n";
  writeFileSync(file, text);
}

const summary = { schemaVersion: "velmere.pass35.a30-product-roadmap-summary.v1", passId: PASS, sourceRevisionId: REV, globalDecision: status.globalDecision, sellEnabledCount: 0, canonicalWeightedPlanningPercent: canonicalWeighted, canonicalStrictDonePercent: canonicalStrict, canonicalCounts: statusCounts, zeroBudgetWeightedPlanningPercent: zeroWeighted, zeroBudgetCoreDenominator: core.length, zeroBudgetCounts: zeroCounts, baselineA16: A16, baselineA29: A29, benchmark: contract.benchmark, visualChangesMade: false, truthBoundary: status.truthBoundary };
write(summaryPath, summary);
writeFileSync(boardPath, ["# PASS35 A30 — Threat Model Evidence", "", `- Source revision: \`${REV}\``, `- A16 start: **${A16.canonical}% canonical / ${A16.strict}% strict / ${A16.zeroBudget}% ZERO-BUDGET**`, `- A29 baseline: **${A29.canonical}% canonical / ${A29.strict}% strict / ${A29.zeroBudget}% ZERO-BUDGET**`, `- A30 current: **${canonicalWeighted}% canonical / ${canonicalStrict}% strict / ${zeroWeighted}% ZERO-BUDGET**`, `- Change vs A29: **+${(canonicalWeighted - A29.canonical).toFixed(1)} pp canonical / +${(canonicalStrict - A29.strict).toFixed(1)} pp strict / +${(zeroWeighted - A29.zeroBudget).toFixed(1)} pp ZERO-BUDGET**`, `- Benchmark: **${benchmark.denominators.cases} cases / ${benchmark.denominators.frozen} frozen / ${benchmark.mutation.killed}/${benchmark.mutation.total} mutations**`, "- sellEnabled: **0**; decision: **NO_GO**; visual changes: **0**", "", "## Truth boundary", "", status.truthBoundary, ""].join("\n"));

const rows = status.rows.map((row) => `${row.id} | ${row.status} | DONE: ${row.doneEvidence.join("; ")} | MISSING: ${row.missing.join("; ") || "—"} | BLOCKER: ${row.blocker} | NEXT: ${row.nextAction} | SELL: ${row.sellImpact}`);
const zeroRows = zero.capabilities.map((row) => `${row.id} | ${row.status} | ${row.resourceModel} | ${row.truth}`);
const oldRoadmap = readFileSync(roadmapPath, "utf8");
const history = oldRoadmap.replaceAll("PASS35 A29 is the only canonical current status.", "PASS35 A29 was canonical at that historical checkpoint and does not override A30.");
const roadmap = [
  "====================================================================================================", "PASS35 A30 — THREAT MODEL EVIDENCE (NON-VISUAL)", "====================================================================================================",
  "Data rewizji: 2026-07-23, Europe/Berlin", `Source revision ID: ${REV}`, `Decyzja globalna: ${status.globalDecision}`, "Stan sprzedaży: 0 sellEnabled",
  `A16 START: ${A16.canonical}% canonical / ${A16.strict}% strict / ${A16.zeroBudget}% ZERO-BUDGET`,
  `A29 BASELINE: ${A29.canonical}% canonical / ${A29.strict}% strict / ${A29.zeroBudget}% ZERO-BUDGET`,
  `A30 CURRENT: ${canonicalWeighted}% canonical weighted / ${canonicalStrict}% strict; ${zeroWeighted}% ZERO-BUDGET`,
  `ZMIANA VS A29: canonical +${(canonicalWeighted - A29.canonical).toFixed(1)} pp; strict +${(canonicalStrict - A29.strict).toFixed(1)} pp; ZERO-BUDGET +${(zeroWeighted - A29.zeroBudget).toFixed(1)} pp`,
  `ŁĄCZNA ZMIANA VS A16: canonical +${(canonicalWeighted - A16.canonical).toFixed(1)} pp; strict +${(canonicalStrict - A16.strict).toFixed(1)} pp; ZERO-BUDGET +${(zeroWeighted - A16.zeroBudget).toFixed(1)} pp`,
  "Product/tier specification: 100% (7 surfaces x 3 tiers = 21)", "Visual changes: 0; CODEX_FRONTEND_WORKSTREAM remains untouched", "",
  "A30 — LOCAL A03 THREAT MODEL EVIDENCE", "----------------------------------------------------------------------------------------------------",
  "- Exact case and architecture receipts bind components, critical assets, actors, trust boundaries, data flows and entry points.",
  "- Assumptions require evidence and invalidation triggers; critical assets require invariants and abuse-case coverage.",
  "- Abuse cases bind actors, preconditions, entry points, affected boundaries, target assets, acyclic attack steps, tested mitigations, residual risk and limitations.",
  "- Coverage denominators, three deterministic local replay runs and mutation evidence are mandatory.",
  `- Benchmark: ${benchmark.denominators.cases} cases / ${benchmark.denominators.frozen} frozen / ${benchmark.mutation.killed}/${benchmark.mutation.total} mutations.`,
  "- AUD03/A03 moves PARTIAL -> DONE for the declared bounded local evidence-contract implementation only.", "",
  "A30 — POSTĘP", "----------------------------------------------------------------------------------------------------",
  `- Canonical: A16 ${A16.canonical}% -> A29 ${A29.canonical}% -> A30 ${canonicalWeighted}%.`,
  `- Strict: A16 ${A16.strict}% -> A29 ${A29.strict}% -> A30 ${canonicalStrict}%.`,
  `- ZERO-BUDGET: A16 ${A16.zeroBudget}% -> A29 ${A29.zeroBudget}% -> A30 ${zeroWeighted}%.`,
  `- Canonical denominator 43: DONE ${statusCounts.DONE}; PARTIAL ${statusCounts.PARTIAL}; BLOCKED_EXTERNAL ${statusCounts.BLOCKED_EXTERNAL}; NOT_DONE ${statusCounts.NOT_DONE}.`,
  `- Zero-budget denominator ${core.length}: DONE ${zeroCounts.DONE}; PARTIAL ${zeroCounts.PARTIAL}; NOT_DONE ${zeroCounts.NOT_DONE}.`, "",
  "A30 — ZERO-BUDGET FUNCTIONAL CORE", "----------------------------------------------------------------------------------------------------", "ID | STATUS | RESOURCE MODEL | TRUTH", "----------------------------------------------------------------------------------------------------", ...zeroRows, "",
  "A30 — KANONICZNA TABELA 43 WORKSTREAMÓW", "----------------------------------------------------------------------------------------------------", ...rows, "",
  "A30 TRUTH BOUNDARY", "----------------------------------------------------------------------------------------------------", status.truthBoundary, "",
  "HISTORYCZNE PODSUMOWANIE A29 I WCZEŚNIEJSZYCH FAL", "----------------------------------------------------------------------------------------------------", "Everything below is historical implementation context and cannot override A30.", "", history.trimEnd(), ""
].join("\n");
writeFileSync(roadmapPath, roadmap);
const boardResult = spawnSync(process.execPath, ["scripts/pass35/build-current-status-roadmap.mjs"], { encoding: "utf8" });
if (boardResult.status !== 0) throw new Error(`a30_board_failed:${boardResult.stderr || boardResult.stdout}`);
console.log(JSON.stringify({ status: "PASS_A30_ROADMAP_BUILT", sourceRevisionId: REV, canonicalWeightedPlanningPercent: canonicalWeighted, canonicalStrictDonePercent: canonicalStrict, zeroBudgetWeightedPlanningPercent: zeroWeighted, deltaVsA29: contract.progressDeltaVsA29, deltaVsA16: contract.progressDeltaVsA16, cases: benchmark.denominators.cases, mutations: benchmark.denominators.mutations, sellEnabled: false }, null, 2));
