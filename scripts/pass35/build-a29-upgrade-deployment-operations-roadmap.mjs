#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { runA29Benchmark, verifyA29Benchmark, verifyA29Policy } from "../../lib/security/pass35-a29-upgrade-deployment-operations-runtime.mjs";

const PASS = "PASS35_A29";
const REV = "VELMERE_PASS35_A29_UPGRADE_DEPLOYMENT_OPERATIONS_EVIDENCE_NON_VISUAL";
const A16 = { canonical: 40.7, strict: 9.3, zeroBudget: 80.0 };
const A28 = { canonical: 54.7, strict: 30.2, zeroBudget: 90.5 };
const policyPath = "config/pass35/a29-upgrade-deployment-operations-policy.json";
const runtimePath = "artifacts/pass35/PASS35_A29_UPGRADE_DEPLOYMENT_OPERATIONS_BENCHMARK.json";
const receiptPath = "artifacts/pass35/PASS35_A29_UPGRADE_DEPLOYMENT_OPERATIONS_RECEIPT.json";
const contractPath = "config/pass35/a29-upgrade-deployment-operations-runtime-contract.json";
const summaryPath = "artifacts/release/PASS35_A29_PRODUCT_ROADMAP_SUMMARY.json";
const boardPath = "artifacts/release/PASS35_A29_UPGRADE_DEPLOYMENT_OPERATIONS.md";
const statusPath = "config/pass35/current-status-register.json";
const zeroPath = "config/pass35/zero-budget-functional-roadmap.json";
const roadmapPath = "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt";
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const write = (p, v) => { mkdirSync(path.dirname(p), { recursive: true }); writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`); };
const hash = (v) => `sha256:${createHash("sha256").update(typeof v === "string" || Buffer.isBuffer(v) ? v : JSON.stringify(v)).digest("hex")}`;

const policy = read(policyPath);
if (!verifyA29Policy(policy)) throw new Error("a29_policy_invalid");
const benchmark = runA29Benchmark(policy);
if (!verifyA29Benchmark(benchmark, policy)) throw new Error("a29_benchmark_invalid");
write(runtimePath, benchmark);
const receiptCore = {
  schemaVersion: "velmere.pass35.a29-upgrade-deployment-operations-receipt.v1",
  passId: PASS,
  sourceRevisionId: REV,
  status: "PASS_LOCAL_UPGRADE_DEPLOYMENT_OPERATIONS_NOT_ONCHAIN_NOT_FOR_SALE",
  policyPath,
  policySha256: hash(readFileSync(policyPath)),
  runtimePath,
  runtimeIntegritySha256: benchmark.integritySha256,
  denominators: benchmark.denominators,
  frozen: benchmark.frozen,
  mutation: benchmark.mutation,
  targetProxySlotBindingComplete: true,
  upgradeAuthorizationComplete: true,
  multisigQuorumAndTimelockComplete: true,
  initializerAndStorageLayoutGateComplete: true,
  upgradeSimulationAndRollbackGateComplete: true,
  pauseEmergencyControlsComplete: true,
  keyRotationRecoveryAndCompromiseScenariosComplete: true,
  deterministicOperationsReplayComplete: true,
  mutationScoreGateComplete: true,
  currentOnChainStateVerified: false,
  realMultisigTimelockExecuted: false,
  productionUpgradeExecuted: false,
  qualifiedHumanReviewed: false,
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
putCapability({ id: "ZB77_A11_PROXY_AUTH_MULTISIG_TIMELOCK_BINDINGS", status: "DONE", resourceModel: "Own work only", truth: "A29 binds exact proxy/admin/implementation slots, upgrade authorization, multisig owner/quorum evidence and timelock delay/role receipts to one target. Missing slots, weak quorum, duplicate owners or bypass routes fail closed." });
putCapability({ id: "ZB78_A11_STORAGE_ROLLBACK_EMERGENCY_KEY_CONTROLS", status: "DONE", resourceModel: "Own work only", truth: "A29 enforces initializer protection, UUPS UUID where applicable, storage-layout compatibility, upgrade simulation, bounded rollback limitations, pause/emergency controls, key rotation/recovery and three key-compromise response scenarios. No rollback guarantee or current custody claim is allowed." });
putCapability({ id: "ZB79_A11_OPERATIONS_REPLAY_FROZEN_BENCHMARK", status: "DONE", resourceModel: "Own work only", truth: "A29 executes 192 generated upgrade/deployment-operations evidence cases across 12 families with a 72-case frozen split and 2304 fail-closed mutations. Accuracy and mutation kill rate are 1.00; generated evidence grants no on-chain, production, reviewer, customer, independent or paid credit." });
const excluded = new Set(zero.zeroBudgetCoreExclusions);
const core = zero.capabilities.filter((row) => !excluded.has(row.id));
const zeroCounts = { DONE: core.filter((row) => row.status === "DONE").length, PARTIAL: core.filter((row) => row.status === "PARTIAL").length, NOT_DONE: core.filter((row) => row.status === "NOT_DONE").length };
const zeroWeighted = Number((((zeroCounts.DONE + zeroCounts.PARTIAL * 0.5) / core.length) * 100).toFixed(1));
if (core.length !== 77 || zeroCounts.DONE !== 64 || zeroCounts.PARTIAL !== 12 || zeroCounts.NOT_DONE !== 1 || zeroWeighted !== 90.9) throw new Error(`a29_zero_math:${JSON.stringify({ core: core.length, zeroCounts, zeroWeighted })}`);
zero.truthBoundary = `PASS35 A29 adds a locally complete upgrade/deployment-operations evidence contract for the declared A11 scope. ZERO-BUDGET planning is ${zeroWeighted}% across ${core.length} capabilities. Current on-chain admin/proxy state, real multisig/timelock execution, hardware-key custody, production upgrade/rollback, incident response, qualified review, staging, sale and outcomes remain outside this local claim.`;
write(zeroPath, zero);

const status = read(statusPath);
status.sourceRevisionId = REV;
status.evaluatedAt = "2026-07-23T17:45:00.000Z";
status.statusPrecedence = ["this register", "A29 roadmap current-status section", "machine-generated readiness dashboard", "A28 and earlier addenda as historical implementation notes only", "base roadmap as target requirements"];
const statusRow = status.rows.find((row) => row.id === "AUD13_A11_UPGRADE_DEPLOYMENT_OPS");
if (!statusRow) throw new Error("a29_status_row_missing");
Object.assign(statusRow, {
  status: "DONE",
  doneEvidence: [
    "case-bound exact target, block, source/runtime/deployment, architecture and A28 evidence bindings",
    "proxy/admin/implementation/beacon slot evidence and authorization policy binding",
    "unique-owner multisig quorum and timelock delay/role/bypass gates",
    "initializer protection, UUPS UUID validation and storage-layout compatibility",
    "upgrade simulation, bounded rollback plan and explicit no-guarantee boundary",
    "pause/emergency council, independent unpause approval and incident runbook evidence",
    "key rotation/recovery controls and three compromise-response scenarios",
    "critical/high operations assertion coverage and deterministic local replay",
    "192-case frozen benchmark and 2304 mutation campaign"
  ],
  missing: [],
  blocker: "NONE_LOCAL_FOR_DECLARED_BOUNDED_A11_UPGRADE_DEPLOYMENT_OPERATIONS_EVIDENCE_IMPLEMENTATION",
  nextAction: "Execute the A29 contract against current on-chain proxy/admin slots, real multisig/timelock configuration, hardware-key custody and a controlled staging upgrade/rollback drill; obtain qualified independent review.",
  sellImpact: "Completes the declared local A11 evidence-integrity implementation only; Audit Pro remains blocked by current on-chain evidence, real operational drills, qualified review, staging and remaining external gates."
});
const statusCounts = { DONE: status.rows.filter((row) => row.status === "DONE").length, PARTIAL: status.rows.filter((row) => row.status === "PARTIAL").length, BLOCKED_EXTERNAL: status.rows.filter((row) => row.status === "BLOCKED_EXTERNAL").length, NOT_DONE: status.rows.filter((row) => row.status === "NOT_DONE").length };
const canonicalWeighted = Number((((statusCounts.DONE + statusCounts.PARTIAL * 0.5) / status.rows.length) * 100).toFixed(1));
const canonicalStrict = Number(((statusCounts.DONE / status.rows.length) * 100).toFixed(1));
if (status.rows.length !== 43 || statusCounts.DONE !== 14 || statusCounts.PARTIAL !== 20 || statusCounts.BLOCKED_EXTERNAL !== 9 || statusCounts.NOT_DONE !== 0 || canonicalWeighted !== 55.8 || canonicalStrict !== 32.6) throw new Error(`a29_canonical_math:${JSON.stringify({ statusCounts, canonicalWeighted, canonicalStrict })}`);
status.zeroBudgetFunctionalTrack = { ...status.zeroBudgetFunctionalTrack, currentWeightedPlanningPercent: zeroWeighted, coreDenominator: core.length, done: zeroCounts.DONE, partial: zeroCounts.PARTIAL, notDone: zeroCounts.NOT_DONE, a29UpgradeDeploymentOperationsPolicyPath: policyPath, a29UpgradeDeploymentOperationsContractPath: contractPath };
status.truthBoundary = `PASS35 A29 is the only canonical current status. Canonical roadmap is ${canonicalWeighted}% weighted / ${canonicalStrict}% strict across 43 workstreams, up ${(canonicalWeighted - A28.canonical).toFixed(1)} pp weighted and ${(canonicalStrict - A28.strict).toFixed(1)} pp strict from A28, and ${(canonicalWeighted - A16.canonical).toFixed(1)} pp weighted from A16. Zero-budget functional core is ${zeroWeighted}% across ${core.length} capabilities, up ${(zeroWeighted - A28.zeroBudget).toFixed(1)} pp from A28 and ${(zeroWeighted - A16.zeroBudget).toFixed(1)} pp from A16. A29 locally closes the declared bounded A11 proxy-slot, authorization, multisig, timelock, initializer, storage-layout, upgrade-simulation, rollback-limit, pause/emergency, key-management, compromise-scenario, operations-replay and mutation-evidence implementation. Current on-chain configuration, real custody and operational drills, qualified review, staging, sale, outcomes and independent assurance remain unclaimed.`;
write(statusPath, status);

const a01 = read("config/pass35/audit-a01-a05-policy.json");
a01.sourceRevisionId = REV;
a01.controls.A11 = { implementation: "case-bound upgrade/deployment-operations evidence with exact proxy slots, authorization, multisig/timelock, initializer/storage safety, simulation/rollback, emergency and key-management controls", localState: "IMPLEMENTED_LOCAL_UPGRADE_DEPLOYMENT_OPERATIONS_EVIDENCE_BENCHMARKED_ONCHAIN_DRILL_REVIEW_MISSING", paidGateEligible: false, missingForExit: ["current on-chain proxy/admin and role evidence", "real multisig/timelock and hardware-key custody proof", "controlled staging upgrade/rollback/incident drill", "qualified independent review"] };
write("config/pass35/audit-a01-a05-policy.json", a01);

const audit = read("config/pass35/audit-program.json");
audit.sourceRevisionId = REV;
const a11 = audit.controls.find((control) => control.id === "A11");
if (a11) a11.status = "IMPLEMENTED_LOCAL_UPGRADE_DEPLOYMENT_OPERATIONS_EVIDENCE_BENCHMARKED_ONCHAIN_DRILL_REVIEW_MISSING";
audit.a29UpgradeDeploymentOperations = { policyPath, runtimePath, receiptPath, cases: benchmark.denominators.cases, frozen: benchmark.denominators.frozen, mutations: benchmark.denominators.mutations, currentOnChainStateVerified: false, realMultisigTimelockExecuted: false, productionUpgradeExecuted: false, qualifiedHumanReviewed: false, paidGateEligible: false };
audit.truthBoundary = policy.truthBoundary;
write("config/pass35/audit-program.json", audit);

const a8 = read("config/pass35/audit-a8-execution-policy.json");
a8.sourceRevisionId = REV;
a8.controls.A11_UPGRADE_DEPLOYMENT_OPERATIONS = { evidenceRuntimePath: "lib/security/pass35-a29-upgrade-deployment-operations-runtime.mjs", evidencePolicyPath: policyPath, evidenceContractPath: contractPath, evidenceTestPath: "scripts/pass35/test-a29-upgrade-deployment-operations.mjs", controlFamilies: 12, benchmarkCases: benchmark.denominators.cases, benchmarkMutations: benchmark.denominators.mutations, localEvidenceContractComplete: true, realExecutionCredit: false, paidGateEligible: false };
a8.truthBoundary = policy.truthBoundary;
write("config/pass35/audit-a8-execution-policy.json", a8);

const envelope = read("config/pass35/audit-execution-envelope.json");
envelope.sourceRevisionId = REV;
let family = envelope.capabilityInventory.find((item) => item.familyId === "upgrade_deployment_operations");
if (!family) {
  family = { familyId: "upgrade_deployment_operations", label: "Upgrade and deployment operations", requiredFor: ["audit_evm_pro", "audit_evm_advanced"], state: "MISSING", activePaths: [], executionClass: "local_contract", mayClaim: [], mayNotClaim: [] };
  envelope.capabilityInventory.push(family);
}
family.state = "IMPLEMENTED_LOCAL_UPGRADE_DEPLOYMENT_OPERATIONS_EVIDENCE_BENCHMARKED_ONCHAIN_DRILL_REVIEW_MISSING";
family.activePaths = [...new Set([...(family.activePaths ?? []), "lib/security/pass35-a29-upgrade-deployment-operations-runtime.mjs", policyPath, contractPath, "scripts/pass35/test-a29-upgrade-deployment-operations.mjs"] )];
family.executionClass = "local_upgrade_deployment_operations_evidence_not_current_onchain_or_production_drill";
family.mayClaim = ["case-bound proxy-slot and authorization evidence", "multisig/timelock and storage-layout gates", "upgrade simulation, bounded rollback, emergency and key-compromise evidence", "deterministic local operations replay and generated mutation benchmark"];
family.mayNotClaim = ["current on-chain admin configuration verified", "real multisig/timelock or hardware-key custody proven", "production upgrade or rollback executed", "qualified or independent review", "A11 paid gate passed"];
write("config/pass35/audit-execution-envelope.json", envelope);

const product = read("config/pass35/product-tier-content-contract.json");
product.sourceRevisionId = REV;
const proFields = ["upgrade_proxy_slot_and_authorization_binding", "upgrade_multisig_quorum_and_timelock", "upgrade_initializer_and_storage_layout_safety", "upgrade_simulation_and_rollback_limits", "upgrade_pause_emergency_controls", "upgrade_key_rotation_recovery_and_compromise_scenarios", "upgrade_operations_replay_and_mutation_rate"];
const advancedFields = ["full_upgrade_control_evidence_index", "upgrade_role_and_key_conflicts", "upgrade_failure_and_rollback_limitations", "upgrade_incident_invalidation_triggers", "upgrade_no_current_onchain_no_production_claim_boundary"];
product.a29UpgradeDeploymentOperations = { policyPath, runtimePath, receiptPath, requiredProFields: proFields, requiredAdvancedFields: advancedFields, currentOnChainStateVerified: false, productionUpgradeExecuted: false, paidGateEligible: false };
const auditSurface = product.surfaces.find((surface) => surface.surfaceId === "audit_evm");
for (const field of proFields) if (!auditSurface.tiers.pro.requiredFields.includes(field)) auditSurface.tiers.pro.requiredFields.push(field);
for (const field of [...proFields, ...advancedFields]) if (!auditSurface.tiers.advanced.requiredFields.includes(field)) auditSurface.tiers.advanced.requiredFields.push(field);
write("config/pass35/product-tier-content-contract.json", product);

const contract = {
  schemaVersion: "velmere.pass35.a29-upgrade-deployment-operations-runtime-contract.v1", passId: PASS, sourceRevisionId: REV,
  baselineA16: A16, baselineA28: A28,
  progressDeltaVsA28: { canonicalPercentagePoints: Number((canonicalWeighted - A28.canonical).toFixed(1)), strictPercentagePoints: Number((canonicalStrict - A28.strict).toFixed(1)), zeroBudgetPercentagePoints: Number((zeroWeighted - A28.zeroBudget).toFixed(1)) },
  progressDeltaVsA16: { canonicalPercentagePoints: Number((canonicalWeighted - A16.canonical).toFixed(1)), strictPercentagePoints: Number((canonicalStrict - A16.strict).toFixed(1)), zeroBudgetPercentagePoints: Number((zeroWeighted - A16.zeroBudget).toFixed(1)) },
  canonicalWeightedPlanningPercent: canonicalWeighted, canonicalStrictDonePercent: canonicalStrict, canonicalCounts: statusCounts,
  zeroBudgetWeightedPlanningPercent: zeroWeighted, zeroBudgetCoreDenominator: core.length, zeroBudgetCounts: zeroCounts,
  benchmark: { ...benchmark.denominators, frozen: benchmark.frozen, mutation: benchmark.mutation, runtimeIntegritySha256: benchmark.integritySha256, receiptSha256: receipt.receiptSha256 },
  visualChangesMade: false, sellEnabled: false, chargeAllowed: false, paidDeliveryAllowed: false,
  currentOnChainStateVerified: false, realMultisigTimelockExecuted: false, productionUpgradeExecuted: false, qualifiedHumanReviewed: false, independentRerun: false,
  truthBoundary: status.truthBoundary
};
write(contractPath, contract);

const current = read("config/current-release.json");
current.sourceRevisionId = REV;
current.sourceRevisionStatus = "A29_UPGRADE_DEPLOYMENT_OPERATIONS_IMPLEMENTED_ONCHAIN_DRILL_REVIEW_UNCLAIMED";
current.truthBoundary = status.truthBoundary;
current.a29UpgradeDeploymentOperationsPolicyPath = policyPath;
current.a29UpgradeDeploymentOperationsRuntimePath = runtimePath;
current.a29UpgradeDeploymentOperationsReceiptPath = receiptPath;
current.a29UpgradeDeploymentOperationsContractPath = contractPath;
current.a29ProductRoadmapSummaryPath = summaryPath;
current.a29BoardPath = boardPath;
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
  if (!text.includes("## PASS35 A29 local changes")) text += "\n\n## PASS35 A29 local changes\n\n- Added case-bound A11 upgrade/deployment-operations evidence with proxy-slot, authorization, multisig/timelock, initializer/storage-layout, upgrade-simulation/rollback, emergency and key-management controls.\n- Added deterministic local operations replay and a 192-case / 2304-mutation frozen benchmark.\n- Marked AUD13/A11 DONE locally for the declared bounded evidence-contract scope only.\n- Current on-chain state, real custody, production drills, qualified review and paid readiness remain unclaimed.\n- Visual files remain unchanged.\n";
  writeFileSync(file, text);
}

const summary = { schemaVersion: "velmere.pass35.a29-product-roadmap-summary.v1", passId: PASS, sourceRevisionId: REV, globalDecision: status.globalDecision, sellEnabledCount: 0, canonicalWeightedPlanningPercent: canonicalWeighted, canonicalStrictDonePercent: canonicalStrict, canonicalCounts: statusCounts, zeroBudgetWeightedPlanningPercent: zeroWeighted, zeroBudgetCoreDenominator: core.length, zeroBudgetCounts: zeroCounts, baselineA16: A16, baselineA28: A28, benchmark: contract.benchmark, visualChangesMade: false, truthBoundary: status.truthBoundary };
write(summaryPath, summary);
writeFileSync(boardPath, ["# PASS35 A29 — Upgrade & Deployment Operations", "", `- Source revision: \`${REV}\``, `- A16 start: **${A16.canonical}% canonical / ${A16.strict}% strict / ${A16.zeroBudget}% ZERO-BUDGET**`, `- A28 baseline: **${A28.canonical}% canonical / ${A28.strict}% strict / ${A28.zeroBudget}% ZERO-BUDGET**`, `- A29 current: **${canonicalWeighted}% canonical / ${canonicalStrict}% strict / ${zeroWeighted}% ZERO-BUDGET**`, `- Change vs A28: **+${(canonicalWeighted - A28.canonical).toFixed(1)} pp canonical / +${(canonicalStrict - A28.strict).toFixed(1)} pp strict / +${(zeroWeighted - A28.zeroBudget).toFixed(1)} pp ZERO-BUDGET**`, `- Benchmark: **${benchmark.denominators.cases} cases / ${benchmark.denominators.frozen} frozen / ${benchmark.mutation.killed}/${benchmark.mutation.total} mutations**`, "- sellEnabled: **0**; decision: **NO_GO**; visual changes: **0**", "", "## Truth boundary", "", status.truthBoundary, ""].join("\n"));

const rows = status.rows.map((row) => `${row.id} | ${row.status} | DONE: ${row.doneEvidence.join("; ")} | MISSING: ${row.missing.join("; ") || "—"} | BLOCKER: ${row.blocker} | NEXT: ${row.nextAction} | SELL: ${row.sellImpact}`);
const zeroRows = zero.capabilities.map((row) => `${row.id} | ${row.status} | ${row.resourceModel} | ${row.truth}`);
const oldRoadmap = readFileSync(roadmapPath, "utf8");
const history = oldRoadmap.replaceAll("PASS35 A28 is the only canonical current status.", "PASS35 A28 was canonical at that historical checkpoint and does not override A29.");
const roadmap = [
  "====================================================================================================", "PASS35 A29 — UPGRADE & DEPLOYMENT OPERATIONS EVIDENCE (NON-VISUAL)", "====================================================================================================",
  "Data rewizji: 2026-07-23, Europe/Berlin", `Source revision ID: ${REV}`, `Decyzja globalna: ${status.globalDecision}`, "Stan sprzedaży: 0 sellEnabled",
  `A16 START: ${A16.canonical}% canonical / ${A16.strict}% strict / ${A16.zeroBudget}% ZERO-BUDGET`,
  `A28 BASELINE: ${A28.canonical}% canonical / ${A28.strict}% strict / ${A28.zeroBudget}% ZERO-BUDGET`,
  `A29 CURRENT: ${canonicalWeighted}% canonical weighted / ${canonicalStrict}% strict; ${zeroWeighted}% ZERO-BUDGET`,
  `ZMIANA VS A28: canonical +${(canonicalWeighted - A28.canonical).toFixed(1)} pp; strict +${(canonicalStrict - A28.strict).toFixed(1)} pp; ZERO-BUDGET +${(zeroWeighted - A28.zeroBudget).toFixed(1)} pp`,
  `ŁĄCZNA ZMIANA VS A16: canonical +${(canonicalWeighted - A16.canonical).toFixed(1)} pp; strict +${(canonicalStrict - A16.strict).toFixed(1)} pp; ZERO-BUDGET +${(zeroWeighted - A16.zeroBudget).toFixed(1)} pp`,
  "Product/tier specification: 100% (7 surfaces x 3 tiers = 21)", "Visual changes: 0; CODEX_FRONTEND_WORKSTREAM remains untouched", "",
  "A29 — LOCAL A11 UPGRADE & DEPLOYMENT OPERATIONS EVIDENCE", "----------------------------------------------------------------------------------------------------",
  "- Exact target, proxy/admin/implementation slots, authorization and architecture receipts are bound to one case.",
  "- Multisig owner/quorum and timelock delay/role/bypass controls are mandatory.",
  "- Initializer, UUPS UUID, storage-layout, upgrade-simulation and bounded rollback gates fail closed.",
  "- Pause/emergency, key rotation/recovery and three key-compromise response scenarios are required.",
  "- Critical/high operations assertions and three deterministic local replay runs are required.",
  `- Benchmark: ${benchmark.denominators.cases} cases / ${benchmark.denominators.frozen} frozen / ${benchmark.mutation.killed}/${benchmark.mutation.total} mutations.`,
  "- AUD13/A11 moves PARTIAL -> DONE for the declared bounded local evidence-contract implementation only.", "",
  "A29 — POSTĘP", "----------------------------------------------------------------------------------------------------",
  `- Canonical: A16 ${A16.canonical}% -> A28 ${A28.canonical}% -> A29 ${canonicalWeighted}%.`,
  `- Strict: A16 ${A16.strict}% -> A28 ${A28.strict}% -> A29 ${canonicalStrict}%.`,
  `- ZERO-BUDGET: A16 ${A16.zeroBudget}% -> A28 ${A28.zeroBudget}% -> A29 ${zeroWeighted}%.`,
  `- Canonical denominator 43: DONE ${statusCounts.DONE}; PARTIAL ${statusCounts.PARTIAL}; BLOCKED_EXTERNAL ${statusCounts.BLOCKED_EXTERNAL}; NOT_DONE ${statusCounts.NOT_DONE}.`,
  `- Zero-budget denominator ${core.length}: DONE ${zeroCounts.DONE}; PARTIAL ${zeroCounts.PARTIAL}; NOT_DONE ${zeroCounts.NOT_DONE}.`, "",
  "A29 — ZERO-BUDGET FUNCTIONAL CORE", "----------------------------------------------------------------------------------------------------", "ID | STATUS | RESOURCE MODEL | TRUTH", "----------------------------------------------------------------------------------------------------", ...zeroRows, "",
  "A29 — KANONICZNA TABELA 43 WORKSTREAMÓW", "----------------------------------------------------------------------------------------------------", ...rows, "",
  "A29 TRUTH BOUNDARY", "----------------------------------------------------------------------------------------------------", status.truthBoundary, "",
  "HISTORYCZNE PODSUMOWANIE A28 I WCZEŚNIEJSZYCH FAL", "----------------------------------------------------------------------------------------------------", "Everything below is historical implementation context and cannot override A29.", "", history.trimEnd(), ""
].join("\n");
writeFileSync(roadmapPath, roadmap);
const boardResult = spawnSync(process.execPath, ["scripts/pass35/build-current-status-roadmap.mjs"], { encoding: "utf8" });
if (boardResult.status !== 0) throw new Error(`a29_board_failed:${boardResult.stderr || boardResult.stdout}`);
console.log(JSON.stringify({ status: "PASS_A29_ROADMAP_BUILT", sourceRevisionId: REV, canonicalWeightedPlanningPercent: canonicalWeighted, canonicalStrictDonePercent: canonicalStrict, zeroBudgetWeightedPlanningPercent: zeroWeighted, deltaVsA28: contract.progressDeltaVsA28, deltaVsA16: contract.progressDeltaVsA16, cases: benchmark.denominators.cases, mutations: benchmark.denominators.mutations, sellEnabled: false }, null, 2));
