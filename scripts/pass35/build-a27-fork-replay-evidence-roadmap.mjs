#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { runA27Benchmark, verifyA27Benchmark, verifyA27Policy } from "../../lib/security/pass35-a27-fork-replay-evidence-runtime.mjs";

const PASS = "PASS35_A27";
const REV = "VELMERE_PASS35_A27_FORK_REPLAY_EVIDENCE_NON_VISUAL";
const A16 = { canonical: 40.7, strict: 9.3, zeroBudget: 80.0 };
const A26 = { canonical: 52.3, strict: 25.6, zeroBudget: 89.7 };
const policyPath = "config/pass35/a27-fork-replay-evidence-policy.json";
const runtimePath = "artifacts/pass35/PASS35_A27_FORK_REPLAY_EVIDENCE_BENCHMARK.json";
const receiptPath = "artifacts/pass35/PASS35_A27_FORK_REPLAY_EVIDENCE_RECEIPT.json";
const contractPath = "config/pass35/a27-fork-replay-evidence-runtime-contract.json";
const summaryPath = "artifacts/release/PASS35_A27_PRODUCT_ROADMAP_SUMMARY.json";
const boardPath = "artifacts/release/PASS35_A27_FORK_REPLAY_EVIDENCE.md";
const statusPath = "config/pass35/current-status-register.json";
const zeroPath = "config/pass35/zero-budget-functional-roadmap.json";
const roadmapPath = "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt";
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const write = (p, v) => { mkdirSync(path.dirname(p), { recursive: true }); writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`); };
const hash = (v) => `sha256:${createHash("sha256").update(typeof v === "string" || Buffer.isBuffer(v) ? v : JSON.stringify(v)).digest("hex")}`;

const policy = read(policyPath);
if (!verifyA27Policy(policy)) throw new Error("a27_policy_invalid");
const benchmark = runA27Benchmark(policy);
if (!verifyA27Benchmark(benchmark, policy)) throw new Error("a27_benchmark_invalid");
write(runtimePath, benchmark);
const receiptCore = {
  schemaVersion: "velmere.pass35.a27-fork-replay-evidence-receipt.v1",
  passId: PASS,
  sourceRevisionId: REV,
  status: "PASS_LOCAL_FORK_REPLAY_EVIDENCE_NOT_NATIVE_FORK_NOT_PUBLIC_NETWORK_NOT_FOR_SALE",
  policyPath,
  policySha256: hash(readFileSync(policyPath)),
  runtimePath,
  runtimeIntegritySha256: benchmark.integritySha256,
  denominators: benchmark.denominators,
  frozen: benchmark.frozen,
  mutation: benchmark.mutation,
  exactChainBlockSnapshotBindingComplete: true,
  transactionSequenceAndStateRootContinuityComplete: true,
  assertionAndStateDiffCoverageGateComplete: true,
  dependencySnapshotBindingGateComplete: true,
  logReturnAndRunnerBindingGateComplete: true,
  isolatedDeterministicReplayGateComplete: true,
  mutationScoreGateComplete: true,
  officialNativeForkRunnerExecuted: false,
  publicNetworkProviderUsed: false,
  realHistoricalExploitReplayed: false,
  realCustomerWorkflowReplayed: false,
  commercialProviderRightsProven: false,
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
putCapability({ id: "ZB71_A09_CHAIN_BLOCK_STATE_TRANSACTION_BINDINGS", status: "DONE", resourceModel: "Own work only", truth: "A27 binds one exact chain, block, target, source/runtime/deployment identity, snapshot roots and ordered transaction sequence. Every transaction must preserve pre-to-post state-root continuity and exact status, log, return-data and state-diff digests." });
putCapability({ id: "ZB72_A09_ASSERTION_DEPENDENCY_ISOLATED_REPLAY_GATE", status: "DONE", resourceModel: "Own work only", truth: "A27 enforces critical/high assertion and state-key coverage, complete dependency snapshot coverage, runner binding, isolated reset receipts and deterministic repeated replay results. Any missing dependency, sequence gap, state drift or flaky replay fails closed." });
putCapability({ id: "ZB73_A09_FORK_REPLAY_FROZEN_BENCHMARK", status: "DONE", resourceModel: "Own work only", truth: "A27 executes 192 generated fork/replay evidence cases across 12 families with a 72-case frozen split and 2304 fail-closed mutations. Accuracy and mutation kill rate are 1.00; generated local evidence grants no native fork, public-provider, historical-exploit, customer or paid credit." });
const excluded = new Set(zero.zeroBudgetCoreExclusions);
const core = zero.capabilities.filter((row) => !excluded.has(row.id));
const zeroCounts = {
  DONE: core.filter((row) => row.status === "DONE").length,
  PARTIAL: core.filter((row) => row.status === "PARTIAL").length,
  NOT_DONE: core.filter((row) => row.status === "NOT_DONE").length
};
const zeroWeighted = Number((((zeroCounts.DONE + zeroCounts.PARTIAL * 0.5) / core.length) * 100).toFixed(1));
if (core.length !== 71 || zeroCounts.DONE !== 58 || zeroCounts.PARTIAL !== 12 || zeroCounts.NOT_DONE !== 1 || zeroWeighted !== 90.1) throw new Error(`a27_zero_math:${JSON.stringify({ core: core.length, zeroCounts, zeroWeighted })}`);
zero.truthBoundary = `PASS35 A27 adds a locally complete fork/replay evidence contract for the declared A09 scope. ZERO-BUDGET planning is ${zeroWeighted}% across ${core.length} capabilities. Official native fork execution, real public-network providers, commercial rights, historical exploit/customer replay, independent adjudication, staging, sale and outcomes remain outside this local claim.`;
write(zeroPath, zero);

const status = read(statusPath);
status.sourceRevisionId = REV;
status.evaluatedAt = "2026-07-23T16:15:00.000Z";
status.statusPrecedence = ["this register", "A27 roadmap current-status section", "machine-generated readiness dashboard", "A26 and earlier addenda as historical implementation notes only", "base roadmap as target requirements"];
const statusRow = status.rows.find((row) => row.id === "AUD11_A09_FORK_REPLAY");
if (!statusRow) throw new Error("a27_status_row_missing");
Object.assign(statusRow, {
  status: "DONE",
  doneEvidence: [
    "case-bound exact chain, block, contract, source/runtime/deployment and provider-rights receipt bindings",
    "snapshot pre/post state-root and isolation receipt binding",
    "ordered transaction sequence with status, return-data, log and state-diff digests",
    "pre-to-post state-root continuity for every transaction",
    "critical/high assertion and state-key coverage floors",
    "complete dependency code/state/balance snapshot coverage",
    "minimum isolated replay-run floor and deterministic repeated results",
    "mutation registry and mutation kill-rate gate",
    "192-case frozen benchmark and 2304 mutation campaign"
  ],
  missing: [],
  blocker: "NONE_LOCAL_FOR_DECLARED_BOUNDED_A09_FORK_REPLAY_EVIDENCE_IMPLEMENTATION",
  nextAction: "Execute the A27 evidence contract with a pinned official native fork runner against one rights-approved provider-bound verified deployment, replay a historical exploit or real customer workflow, preserve exact raw receipts and obtain an independent rerun.",
  sellImpact: "Completes the declared local A09 evidence-integrity implementation only; Audit Pro remains blocked by official native fork execution, real provider rights/data, historical or customer replay, independent adjudication and remaining external gates."
});
const statusCounts = {
  DONE: status.rows.filter((row) => row.status === "DONE").length,
  PARTIAL: status.rows.filter((row) => row.status === "PARTIAL").length,
  BLOCKED_EXTERNAL: status.rows.filter((row) => row.status === "BLOCKED_EXTERNAL").length,
  NOT_DONE: status.rows.filter((row) => row.status === "NOT_DONE").length
};
const canonicalWeighted = Number((((statusCounts.DONE + statusCounts.PARTIAL * 0.5) / status.rows.length) * 100).toFixed(1));
const canonicalStrict = Number(((statusCounts.DONE / status.rows.length) * 100).toFixed(1));
if (status.rows.length !== 43 || statusCounts.DONE !== 12 || statusCounts.PARTIAL !== 22 || statusCounts.BLOCKED_EXTERNAL !== 9 || statusCounts.NOT_DONE !== 0 || canonicalWeighted !== 53.5 || canonicalStrict !== 27.9) throw new Error(`a27_canonical_math:${JSON.stringify({ statusCounts, canonicalWeighted, canonicalStrict })}`);
status.zeroBudgetFunctionalTrack = { ...status.zeroBudgetFunctionalTrack, currentWeightedPlanningPercent: zeroWeighted, coreDenominator: core.length, done: zeroCounts.DONE, partial: zeroCounts.PARTIAL, notDone: zeroCounts.NOT_DONE, a27ForkReplayEvidencePolicyPath: policyPath, a27ForkReplayEvidenceContractPath: contractPath };
status.truthBoundary = `PASS35 A27 is the only canonical current status. Canonical roadmap is ${canonicalWeighted}% weighted / ${canonicalStrict}% strict across 43 workstreams, up ${(canonicalWeighted - A26.canonical).toFixed(1)} pp weighted and ${(canonicalStrict - A26.strict).toFixed(1)} pp strict from A26, and ${(canonicalWeighted - A16.canonical).toFixed(1)} pp weighted from A16. Zero-budget functional core is ${zeroWeighted}% across ${core.length} capabilities, up ${(zeroWeighted - A26.zeroBudget).toFixed(1)} pp from A26 and ${(zeroWeighted - A16.zeroBudget).toFixed(1)} pp from A16. A27 locally closes the declared bounded A09 chain/block/snapshot binding, transaction/state-root continuity, assertion/state-diff/dependency coverage, isolated deterministic replay and mutation evidence implementation. Official native fork execution, real providers/rights, historical exploit or customer replay, staging, sale, outcomes and independent assurance remain unclaimed.`;
write(statusPath, status);

const a01 = read("config/pass35/audit-a01-a05-policy.json");
a01.sourceRevisionId = REV;
a01.controls.A09 = {
  implementation: "case-bound fork/replay evidence registry with exact chain/block/snapshot/transaction/dependency bindings, state-root continuity, assertion/state-diff coverage, isolated deterministic replay and mutation evidence",
  localState: "IMPLEMENTED_LOCAL_FORK_REPLAY_EVIDENCE_BENCHMARKED_NATIVE_FORK_REAL_PROVIDER_NOT_RUN",
  paidGateEligible: false,
  missingForExit: ["official native fork runner execution", "real non-loopback provider and commercial rights", "real verified deployment/source chain", "historical exploit or customer workflow replay", "independent rerun and adjudication"]
};
write("config/pass35/audit-a01-a05-policy.json", a01);

const audit = read("config/pass35/audit-program.json");
audit.sourceRevisionId = REV;
const a09 = audit.controls.find((control) => control.id === "A09");
if (a09) a09.status = "IMPLEMENTED_LOCAL_FORK_REPLAY_EVIDENCE_BENCHMARKED_NATIVE_FORK_REAL_PROVIDER_MISSING";
audit.a27ForkReplayEvidence = { policyPath, runtimePath, receiptPath, cases: benchmark.denominators.cases, frozen: benchmark.denominators.frozen, mutations: benchmark.denominators.mutations, officialNativeForkRunnerExecuted: false, publicNetworkProviderUsed: false, realHistoricalExploitReplayed: false, realCustomerWorkflowReplayed: false, paidGateEligible: false };
audit.truthBoundary = policy.truthBoundary;
write("config/pass35/audit-program.json", audit);

const a7 = read("config/pass35/audit-a7-execution-policy.json");
a7.sourceRevisionId = REV;
a7.status = "LOCAL_FORK_REPLAY_EVIDENCE_BENCHMARKED_NATIVE_FORK_REAL_PROVIDER_BLOCKED";
const a7Control = a7.controls.A09_FORK_REPLAY_EXACT_STATE_ADAPTER;
a7Control.state = "IMPLEMENTED_LOCAL_FORK_REPLAY_EVIDENCE_BENCHMARKED_NATIVE_FORK_REAL_PROVIDER_MISSING";
a7Control.paths = [...new Set([...a7Control.paths, "lib/security/pass35-a27-fork-replay-evidence-runtime.mjs", policyPath, contractPath, "scripts/pass35/test-a27-fork-replay-evidence.mjs"] )];
a7Control.capabilities = ["exact chain/block/target/source/runtime/deployment binding", "snapshot pre/post state roots and isolation binding", "ordered transaction sequence and state-root continuity", "status/log/return/state-diff assertions", "critical/high assertion and state-key coverage", "dependency code/state/balance snapshot coverage", "isolated deterministic repeated replay", "192-case frozen benchmark and 2304-mutation gate"];
a7Control.missing = ["official native fork runner", "real non-loopback provider and commercial rights", "real verified source/deployment receipt chain", "historical exploit or customer workflow replay", "independent rerun and benchmark adjudication"];
a7.truthBoundary = policy.truthBoundary;
write("config/pass35/audit-a7-execution-policy.json", a7);

const envelope = read("config/pass35/audit-execution-envelope.json");
envelope.sourceRevisionId = REV;
const family = envelope.capabilityInventory.find((item) => item.familyId === "fork_replay_exact_state");
if (!family) throw new Error("a27_envelope_family_missing");
family.state = "IMPLEMENTED_LOCAL_FORK_REPLAY_EVIDENCE_BENCHMARKED_NATIVE_FORK_REAL_PROVIDER_MISSING";
family.activePaths = [...new Set([...family.activePaths, "lib/security/pass35-a27-fork-replay-evidence-runtime.mjs", policyPath, contractPath, "scripts/pass35/test-a27-fork-replay-evidence.mjs"] )];
family.executionClass = "local_fork_replay_evidence_not_native_public_network_assurance";
family.mayClaim = ["case-bound chain/block/snapshot and transaction evidence bindings", "pre/post state-root continuity and assertion/state-diff coverage", "dependency snapshot and isolated deterministic replay gates", "generated frozen benchmark and mutation campaign"];
family.mayNotClaim = ["official native fork runner executed", "real public-network provider or commercial rights", "historical exploit or customer workflow replayed", "independent rerun", "A09 paid gate passed"];
write("config/pass35/audit-execution-envelope.json", envelope);

const product = read("config/pass35/product-tier-content-contract.json");
product.sourceRevisionId = REV;
const proFields = ["fork_replay_target_and_snapshot_binding", "fork_transaction_sequence_receipts", "fork_pre_post_state_root_continuity", "fork_assertion_and_state_diff_coverage", "fork_dependency_snapshot_bindings", "fork_isolation_and_replay_determinism", "fork_replay_mutation_kill_rate"];
const advancedFields = ["full_fork_replay_receipt_index", "all_transaction_state_diff_hashes", "dependency_snapshot_lineage", "replay_conflicts_and_limitations", "fork_replay_invalidation_triggers"];
product.a27ForkReplayEvidence = { policyPath, runtimePath, receiptPath, requiredProFields: proFields, requiredAdvancedFields: advancedFields, officialNativeForkRunnerExecuted: false, publicNetworkProviderUsed: false, paidGateEligible: false };
const auditSurface = product.surfaces.find((surface) => surface.surfaceId === "audit_evm");
for (const field of proFields) if (!auditSurface.tiers.pro.requiredFields.includes(field)) auditSurface.tiers.pro.requiredFields.push(field);
for (const field of [...proFields, ...advancedFields]) if (!auditSurface.tiers.advanced.requiredFields.includes(field)) auditSurface.tiers.advanced.requiredFields.push(field);
write("config/pass35/product-tier-content-contract.json", product);

const contract = {
  schemaVersion: "velmere.pass35.a27-fork-replay-evidence-runtime-contract.v1",
  passId: PASS,
  sourceRevisionId: REV,
  baselineA16: A16,
  baselineA26: A26,
  progressDeltaVsA26: { canonicalPercentagePoints: Number((canonicalWeighted - A26.canonical).toFixed(1)), strictPercentagePoints: Number((canonicalStrict - A26.strict).toFixed(1)), zeroBudgetPercentagePoints: Number((zeroWeighted - A26.zeroBudget).toFixed(1)) },
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
  officialNativeForkRunnerExecuted: false,
  publicNetworkProviderUsed: false,
  realHistoricalExploitReplayed: false,
  realCustomerWorkflowReplayed: false,
  commercialProviderRightsProven: false,
  independentRerun: false,
  truthBoundary: status.truthBoundary
};
write(contractPath, contract);

const current = read("config/current-release.json");
current.sourceRevisionId = REV;
current.sourceRevisionStatus = "A27_FORK_REPLAY_EVIDENCE_IMPLEMENTED_NATIVE_FORK_REAL_PROVIDER_UNCLAIMED";
current.truthBoundary = status.truthBoundary;
current.a27ForkReplayEvidencePolicyPath = policyPath;
current.a27ForkReplayEvidenceRuntimePath = runtimePath;
current.a27ForkReplayEvidenceReceiptPath = receiptPath;
current.a27ForkReplayEvidenceContractPath = contractPath;
current.a27ProductRoadmapSummaryPath = summaryPath;
current.a27BoardPath = boardPath;
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
  if (!text.includes("## PASS35 A27 local changes")) text += "\n\n## PASS35 A27 local changes\n\n- Added case-bound A09 fork/replay evidence with exact chain/block/snapshot/transaction/dependency bindings.\n- Added state-root continuity, critical assertion/state-key coverage, isolated deterministic replay and mutation-score gates.\n- Added a 192-case / 2304-mutation frozen benchmark with no native fork, real provider, historical exploit, customer or paid claim.\n- Marked AUD11/A09 DONE locally for the declared bounded evidence-contract scope only.\n- Visual files remain unchanged.\n";
  writeFileSync(file, text);
}

const summary = { schemaVersion: "velmere.pass35.a27-product-roadmap-summary.v1", passId: PASS, sourceRevisionId: REV, globalDecision: status.globalDecision, sellEnabledCount: 0, canonicalWeightedPlanningPercent: canonicalWeighted, canonicalStrictDonePercent: canonicalStrict, canonicalCounts: statusCounts, zeroBudgetWeightedPlanningPercent: zeroWeighted, zeroBudgetCoreDenominator: core.length, zeroBudgetCounts: zeroCounts, baselineA16: A16, baselineA26: A26, benchmark: contract.benchmark, visualChangesMade: false, truthBoundary: status.truthBoundary };
write(summaryPath, summary);
writeFileSync(boardPath, ["# PASS35 A27 — Fork & Replay Evidence", "", `- Source revision: \`${REV}\``, `- A16 start: **${A16.canonical}% canonical / ${A16.strict}% strict / ${A16.zeroBudget}% ZERO-BUDGET**`, `- A26 baseline: **${A26.canonical}% canonical / ${A26.strict}% strict / ${A26.zeroBudget}% ZERO-BUDGET**`, `- A27 current: **${canonicalWeighted}% canonical / ${canonicalStrict}% strict / ${zeroWeighted}% ZERO-BUDGET**`, `- Change vs A26: **+${(canonicalWeighted - A26.canonical).toFixed(1)} pp canonical / +${(canonicalStrict - A26.strict).toFixed(1)} pp strict / +${(zeroWeighted - A26.zeroBudget).toFixed(1)} pp ZERO-BUDGET**`, `- Benchmark: **${benchmark.denominators.cases} cases / ${benchmark.denominators.frozen} frozen / ${benchmark.mutation.killed}/${benchmark.mutation.total} mutations**`, "- sellEnabled: **0**; decision: **NO_GO**; visual changes: **0**", "", "## Truth boundary", "", status.truthBoundary, ""].join("\n"));

const rows = status.rows.map((row) => `${row.id} | ${row.status} | DONE: ${row.doneEvidence.join("; ")} | MISSING: ${row.missing.join("; ") || "—"} | BLOCKER: ${row.blocker} | NEXT: ${row.nextAction} | SELL: ${row.sellImpact}`);
const zeroRows = zero.capabilities.map((row) => `${row.id} | ${row.status} | ${row.resourceModel} | ${row.truth}`);
const oldRoadmap = readFileSync(roadmapPath, "utf8");
const history = oldRoadmap.replaceAll("PASS35 A26 is the only canonical current status.", "PASS35 A26 was canonical at that historical checkpoint and does not override A27.");
const roadmap = [
  "====================================================================================================", "PASS35 A27 — FORK + REPLAY EVIDENCE (NON-VISUAL)", "====================================================================================================",
  "Data rewizji: 2026-07-23, Europe/Berlin", `Source revision ID: ${REV}`, `Decyzja globalna: ${status.globalDecision}`, "Stan sprzedaży: 0 sellEnabled",
  `A16 START: ${A16.canonical}% canonical / ${A16.strict}% strict / ${A16.zeroBudget}% ZERO-BUDGET`,
  `A26 BASELINE: ${A26.canonical}% canonical / ${A26.strict}% strict / ${A26.zeroBudget}% ZERO-BUDGET`,
  `A27 CURRENT: ${canonicalWeighted}% canonical weighted / ${canonicalStrict}% strict; ${zeroWeighted}% ZERO-BUDGET`,
  `ZMIANA VS A26: canonical +${(canonicalWeighted - A26.canonical).toFixed(1)} pp; strict +${(canonicalStrict - A26.strict).toFixed(1)} pp; ZERO-BUDGET +${(zeroWeighted - A26.zeroBudget).toFixed(1)} pp`,
  `ŁĄCZNA ZMIANA VS A16: canonical +${(canonicalWeighted - A16.canonical).toFixed(1)} pp; strict +${(canonicalStrict - A16.strict).toFixed(1)} pp; ZERO-BUDGET +${(zeroWeighted - A16.zeroBudget).toFixed(1)} pp`,
  "Product/tier specification: 100% (7 surfaces x 3 tiers = 21)", "Visual changes: 0; CODEX_FRONTEND_WORKSTREAM remains untouched", "",
  "A27 — LOCAL A09 FORK/REPLAY EVIDENCE", "----------------------------------------------------------------------------------------------------",
  "- Exact chain, block, target, source/runtime/deployment and provider-rights receipts are bound to one case.",
  "- Snapshot pre/post roots and isolation receipts are mandatory.",
  "- Every transaction must preserve ordered pre-to-post state-root continuity and exact status/log/return/state-diff evidence.",
  "- Critical/high assertions, state keys and all declared dependencies require complete coverage.",
  "- Replays must start from the same isolated snapshot and repeat deterministically.",
  "- Official native fork execution, public-network data, historical exploit/customer replay and independent rerun remain false.",
  `- Benchmark: ${benchmark.denominators.cases} cases / ${benchmark.denominators.frozen} frozen / ${benchmark.mutation.killed}/${benchmark.mutation.total} mutations.`,
  "- AUD11/A09 moves PARTIAL -> DONE for the declared bounded local evidence-contract implementation only.", "",
  "A27 — POSTĘP", "----------------------------------------------------------------------------------------------------",
  `- Canonical: A16 ${A16.canonical}% -> A26 ${A26.canonical}% -> A27 ${canonicalWeighted}%.`,
  `- Strict: A16 ${A16.strict}% -> A26 ${A26.strict}% -> A27 ${canonicalStrict}%.`,
  `- ZERO-BUDGET: A16 ${A16.zeroBudget}% -> A26 ${A26.zeroBudget}% -> A27 ${zeroWeighted}%.`,
  `- Canonical denominator 43: DONE ${statusCounts.DONE}; PARTIAL ${statusCounts.PARTIAL}; BLOCKED_EXTERNAL ${statusCounts.BLOCKED_EXTERNAL}; NOT_DONE ${statusCounts.NOT_DONE}.`,
  `- Zero-budget denominator ${core.length}: DONE ${zeroCounts.DONE}; PARTIAL ${zeroCounts.PARTIAL}; NOT_DONE ${zeroCounts.NOT_DONE}.`, "",
  "A27 — ZERO-BUDGET FUNCTIONAL CORE", "----------------------------------------------------------------------------------------------------", "ID | STATUS | RESOURCE MODEL | TRUTH", "----------------------------------------------------------------------------------------------------", ...zeroRows, "",
  "A27 — KANONICZNA TABELA 43 WORKSTREAMÓW", "----------------------------------------------------------------------------------------------------", ...rows, "",
  "A27 TRUTH BOUNDARY", "----------------------------------------------------------------------------------------------------", status.truthBoundary, "",
  "HISTORYCZNE PODSUMOWANIE A26 I WCZEŚNIEJSZYCH FAL", "----------------------------------------------------------------------------------------------------", "Everything below is historical implementation context and cannot override A27.", "", history.trimEnd(), ""
].join("\n");
writeFileSync(roadmapPath, roadmap);
const boardResult = spawnSync(process.execPath, ["scripts/pass35/build-current-status-roadmap.mjs"], { encoding: "utf8" });
if (boardResult.status !== 0) throw new Error(`a27_board_failed:${boardResult.stderr || boardResult.stdout}`);
console.log(JSON.stringify({ status: "PASS_A27_ROADMAP_BUILT", sourceRevisionId: REV, canonicalWeightedPlanningPercent: canonicalWeighted, canonicalStrictDonePercent: canonicalStrict, zeroBudgetWeightedPlanningPercent: zeroWeighted, deltaVsA26: contract.progressDeltaVsA26, deltaVsA16: contract.progressDeltaVsA16, cases: benchmark.denominators.cases, mutations: benchmark.denominators.mutations, sellEnabled: false }, null, 2));
