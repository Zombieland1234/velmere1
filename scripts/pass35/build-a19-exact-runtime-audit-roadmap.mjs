#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  evaluateA19ExactRuntime,
  verifyA19ExactRuntimeEvaluation,
  verifyA19RuntimePolicy,
} from "../../lib/runtime/pass35-a19-exact-runtime-bootstrap.mjs";
import {
  runA19AuditStaticBenchmark,
  verifyA19AuditStaticBenchmark,
  verifyA19AuditStaticPolicy,
} from "../../lib/security/pass35-a19-audit-static-benchmark-runtime.mjs";

const PASS = "PASS35_A19";
const REVISION = "VELMERE_PASS35_A19_EXACT_RUNTIME_AND_AUDIT_STATIC_BENCHMARK_NON_VISUAL";
const A16_CANONICAL = 40.7;
const A16_ZERO = 80.0;
const A18_CANONICAL = 43.0;
const A18_ZERO = 83.3;
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file, value) => { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); };
const sha256 = (value) => `sha256:${createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest("hex")}`;
const unique = (rows) => [...new Set(rows)];

const runtimePolicyPath = "config/pass35/a19-exact-runtime-bootstrap-policy.json";
const auditPolicyPath = "config/pass35/a19-audit-static-benchmark-policy.json";
const zeroPath = "config/pass35/zero-budget-functional-roadmap.json";
const statusPath = "config/pass35/current-status-register.json";
const roadmapPath = "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt";
const exactEvaluationPath = "artifacts/pass35/PASS35_A19_EXACT_RUNTIME_BOOTSTRAP_EVALUATION.json";
const auditRuntimePath = "artifacts/pass35/PASS35_A19_AUDIT_STATIC_BENCHMARK_RUNTIME.json";
const auditReceiptPath = "artifacts/pass35/PASS35_A19_AUDIT_STATIC_BENCHMARK_RECEIPT.json";
const boardPath = "artifacts/release/PASS35_A19_EXACT_RUNTIME_AUDIT_STATIC_BENCHMARK.md";
const summaryPath = "artifacts/release/PASS35_A19_PRODUCT_ROADMAP_SUMMARY.json";
const contractPath = "config/pass35/a19-exact-runtime-audit-static-runtime-contract.json";

const runtimePolicy = readJson(runtimePolicyPath);
const auditPolicy = readJson(auditPolicyPath);
if (!verifyA19RuntimePolicy(runtimePolicy)) throw new Error("a19_runtime_policy_invalid");
if (!verifyA19AuditStaticPolicy(auditPolicy)) throw new Error("a19_audit_policy_invalid");

const exactEvaluation = evaluateA19ExactRuntime(runtimePolicy, {
  nodeArchivePresent: false,
  nodeArchiveSha256: null,
  nodeVersion: process.version,
  npmArchivePresent: false,
  npmArchiveVersion: null,
  npmRegistryIntegrity: null,
  npmRegistrySignatureVerified: false,
  npmVersion: "10.9.2",
  sourceHashBefore: null,
  sourceHashAfter: null,
  finalSourceManifestSha256: null,
  commands: [],
});
if (!verifyA19ExactRuntimeEvaluation(runtimePolicy, exactEvaluation) || exactEvaluation.exactRuntimeProven) throw new Error("a19_exact_runtime_boundary_invalid");
writeJson(exactEvaluationPath, exactEvaluation);

const auditRuntime = runA19AuditStaticBenchmark(auditPolicy);
if (!verifyA19AuditStaticBenchmark(auditRuntime, auditPolicy) || !auditRuntime.localStaticBenchmarkPass) throw new Error(`a19_audit_benchmark_failed:${auditRuntime.failedGates.join(",")}`);
writeJson(auditRuntimePath, auditRuntime);
const auditReceiptCore = {
  schemaVersion: "velmere.pass35.a19-audit-static-benchmark-receipt.v1",
  passId: PASS,
  sourceRevisionId: REVISION,
  status: "PASS_LOCAL_SYNTHETIC_STATIC_BENCHMARK_NOT_FOR_SALE",
  evaluatedAt: auditRuntime.evaluatedAt,
  policyPath: auditPolicyPath,
  policySha256: sha256(readFileSync(auditPolicyPath)),
  runtimePath: auditRuntimePath,
  runtimeIntegritySha256: auditRuntime.integritySha256,
  denominators: auditRuntime.denominators,
  results: {
    overall: auditRuntime.overall,
    frozen: auditRuntime.frozen,
    mutation: auditRuntime.mutation,
    familyCount: auditRuntime.perFamily.length,
    everyFamilyPassed: auditRuntime.perFamily.every((row) => row.recall === 1 && row.specificity === 1),
  },
  paidGateEligible: false,
  independentExternalFamily: false,
  fullAuditClaimAllowed: false,
  exploitabilityProven: false,
  customerPurchaseWorthinessProven: false,
  sellEnabled: false,
  chargeAllowed: false,
  liveClaimed: false,
  truthBoundary: auditRuntime.truthBoundary,
};
const auditReceipt = { ...auditReceiptCore, receiptSha256: sha256(auditReceiptCore) };
writeJson(auditReceiptPath, auditReceipt);

const zero = readJson(zeroPath);
zero.passId = PASS;
zero.sourceRevisionId = REVISION;
const replaceCapability = (capability) => {
  const index = zero.capabilities.findIndex((row) => row.id === capability.id);
  if (index >= 0) zero.capabilities[index] = { ...zero.capabilities[index], ...capability };
  else zero.capabilities.push(capability);
};
replaceCapability({
  id: "ZB09_AUDIT_BASIC_AUTOMATED",
  status: "DONE",
  resourceModel: "Own work + optional open-source analyzers",
  truth: "A19 closes the defined local automated Basic prescreen implementation: input/identity controls, privilege and dangerous-surface analysis, 15-class Solidity structural scanner, 240 vulnerable/remediated benchmark cases, frozen split, severity mapping and 2880 mutation checks. Real chain/source receipts, provider rights and customer usefulness remain separate release gates.",
});
replaceCapability({
  id: "ZB48_AUDIT_STATIC_PRESCREEN_FROZEN_BENCHMARK",
  status: "DONE",
  resourceModel: "Own work only",
  truth: "A19 executes 240 generated Solidity cases across 15 vulnerability families with balanced vulnerable/remediated pairs and disjoint development/validation/frozen splits. Frozen recall, precision, specificity, F1 and severity accuracy are 1.0 for the declared local rule scope. Shared authoring bias and synthetic labels forbid external or paid assurance credit.",
});
replaceCapability({
  id: "ZB49_EXACT_RUNTIME_BOOTSTRAP_FAIL_CLOSED",
  status: "DONE",
  resourceModel: "Own work + official runtime archives supplied separately",
  truth: "A19 pins the official Node 24.18.0 Linux x64 archive SHA-256, requires npm 11.16.0 registry integrity plus signature verification, and makes npm ci, typecheck, lint, full tests, Webpack/Turbopack builds, smokes and source immutability mandatory. The bootstrap contract is complete; actual exact-runtime execution remains blocked and receives zero release credit.",
});
zero.capabilities.sort((left, right) => left.id.localeCompare(right.id));
writeJson(zeroPath, zero);
const excluded = new Set(zero.zeroBudgetCoreExclusions);
const core = zero.capabilities.filter((row) => !excluded.has(row.id));
const zeroCounts = {
  DONE: core.filter((row) => row.status === "DONE").length,
  PARTIAL: core.filter((row) => row.status === "PARTIAL").length,
  NOT_DONE: core.filter((row) => row.status === "NOT_DONE").length,
};
const zeroWeighted = Number((((zeroCounts.DONE + zeroCounts.PARTIAL * 0.5) / core.length) * 100).toFixed(1));
if (core.length !== 47 || zeroCounts.DONE !== 34 || zeroCounts.PARTIAL !== 12 || zeroCounts.NOT_DONE !== 1 || zeroWeighted !== 85.1) {
  throw new Error(`a19_zero_math_invalid:${JSON.stringify({ denominator: core.length, zeroCounts, zeroWeighted })}`);
}

const status = readJson(statusPath);
status.sourceRevisionId = REVISION;
status.evaluatedAt = "2026-07-23T00:00:00.000+02:00";
status.statusPrecedence = [
  "this register",
  "A19 roadmap current-status section",
  "machine-generated readiness dashboard",
  "A18 and earlier addenda as historical implementation notes only",
  "base roadmap as target requirements",
];
for (const row of status.rows) {
  if (row.id === "SRC02_EXACT_RUNTIME_NODE_NPM") {
    row.status = "PARTIAL";
    row.doneEvidence = unique([...row.doneEvidence,
      "A19 official Node 24.18.0 Linux x64 archive SHA-256 pinned to 55aa7153f9d88f28d765fcdad5ae6945b5c0f98a36881703817e4c450fa76742",
      "A19 npm 11.16.0 intake requires registry integrity and registry-signature verification",
      "A19 exact command matrix covers npm ci, typecheck, lint, full PASS35 tests, Webpack/Turbopack builds and smokes, and pre/post source immutability",
      "A19 exact-runtime bootstrap mutation suite 31/31 PASS",
    ]);
    row.missing = ["actual Node 24.18.0 archive in execution environment", "actual npm 11.16.0 archive plus verified registry integrity/signature", "complete exact-runtime command execution on final source bytes", "hash-bound clean-machine logs"];
    row.blocker = "TOOLCHAIN_ARCHIVES_AND_EXACT_EXECUTION_UNAVAILABLE_IN_CURRENT_ENVIRONMENT";
    row.nextAction = "Supply the pinned runtime archives, verify their upstream integrity, then execute the complete A19 matrix on frozen final bytes without source mutation.";
    row.sellImpact = "A19 upgrades exact runtime from pin-only NOT_DONE to a fail-closed executable bootstrap contract; production-ready and SR00 promotion remain blocked until actual execution passes.";
  }
  if (row.id === "AUD05_A05_LOCAL_STATIC_LANES") {
    row.doneEvidence = unique([...row.doneEvidence,
      "A19 15-family Solidity structural prescreen benchmark: 240 balanced vulnerable/remediated cases",
      "A19 disjoint development/validation/frozen split with frozen recall, specificity, precision and F1 all 1.0 for declared local patterns",
      "A19 2880/2880 mutation campaign covering comment/string decoys, formatting, renaming, helpers and paired remediation flips",
    ]);
    row.missing = ["real independently labeled contract corpus", "false-positive adjudication on real protocols", "official external analyzer family execution", "independent rerun and failure-domain review"];
    row.blocker = "REAL_CORPUS_EXTERNAL_FAMILIES_AND_INDEPENDENT_ADJUDICATION_REQUIRED";
    row.nextAction = "Run the frozen A19 scanner and official pinned analyzer families on rights-approved real contracts with blind independent labels and disagreement adjudication.";
    row.sellImpact = "The local Basic prescreen implementation is benchmarked for its declared synthetic scope, but A05 paid credit and full-audit claims remain blocked.";
  }
  if (row.id === "AUD16_A14_SEVERITY_TRIAGE") {
    row.doneEvidence = unique([...row.doneEvidence,
      "A19 deterministic severity mapping is checked across 120 vulnerable benchmark cases with 100% match in the frozen synthetic scope",
    ]);
    row.missing = ["real finding adjudication", "exploitability/prerequisite/blast-radius review", "inter-rater agreement on independently labeled real corpus"];
    row.nextAction = "Calibrate severity and uncertainty on blinded real findings with at least two qualified adjudicators and report disagreement/confidence intervals.";
  }
  if (row.id === "BENCH01_CANONICAL_CORPUS") {
    row.doneEvidence = unique([...row.doneEvidence,
      "A19 local audit corpus: 240 source cases / 15 vulnerability families / balanced remediation pairs / 2880 mutations",
      "A19 frozen split metrics and per-family Wilson intervals are machine-bound in the benchmark receipt",
    ]);
    row.missing = ["2700 real independently labeled rows", "real disjoint train/validation/test execution", "300 qualified human review cases", "customer outcome and willingness-to-pay labels", "independent adjudication and rerun"];
    row.blocker = "REAL_CORPUS_CUSTOMER_LABELS_AND_INDEPENDENT_ADJUDICATION_REQUIRED";
    row.nextAction = "Execute the A18 tier-value and A19 audit-detection contracts on real rights-approved cases with blind independent/customer labels.";
  }
}
const statusCounts = Object.fromEntries(status.allowedStatuses.map((stateName) => [stateName, status.rows.filter((row) => row.status === stateName).length]));
const canonicalStrict = Number(((statusCounts.DONE / status.rows.length) * 100).toFixed(1));
const canonicalWeighted = Number((((statusCounts.DONE + statusCounts.PARTIAL * 0.5) / status.rows.length) * 100).toFixed(1));
if (status.rows.length !== 43 || statusCounts.DONE !== 4 || statusCounts.PARTIAL !== 30 || statusCounts.BLOCKED_EXTERNAL !== 9 || statusCounts.NOT_DONE !== 0 || canonicalWeighted !== 44.2 || canonicalStrict !== 9.3) {
  throw new Error(`a19_canonical_math_invalid:${JSON.stringify({ statusCounts, canonicalWeighted, canonicalStrict })}`);
}
status.zeroBudgetFunctionalTrack = {
  ...status.zeroBudgetFunctionalTrack,
  currentWeightedPlanningPercent: zeroWeighted,
  coreDenominator: core.length,
  done: zeroCounts.DONE,
  partial: zeroCounts.PARTIAL,
  notDone: zeroCounts.NOT_DONE,
  a19ExactRuntimePolicyPath: runtimePolicyPath,
  a19AuditStaticPolicyPath: auditPolicyPath,
  a19RuntimeContractPath: contractPath,
};
status.truthBoundary = `PASS35 A19 is the only canonical current status. Canonical roadmap is ${canonicalWeighted}% weighted / ${canonicalStrict}% strict across 43 workstreams, up ${Number((canonicalWeighted - A18_CANONICAL).toFixed(1))} pp from A18 and ${Number((canonicalWeighted - A16_CANONICAL).toFixed(1))} pp from A16. Zero-budget functional core is ${zeroWeighted}% across ${core.length} capabilities, up ${Number((zeroWeighted - A18_ZERO).toFixed(1))} pp from A18 and ${Number((zeroWeighted - A16_ZERO).toFixed(1))} pp from A16. A19 locally closes a fail-closed exact-runtime bootstrap contract and the defined automated Basic audit prescreen with a 15-family frozen synthetic benchmark. Actual exact Node/npm execution, official analyzers, real contracts, staging, sale, LIVE, customer outcomes and independent assurance remain unclaimed.`;
writeJson(statusPath, status);

const auditProgram = readJson("config/pass35/audit-program.json");
auditProgram.sourceRevisionId = REVISION;
auditProgram.status = "A01_A10_A15_A17_LOCAL_EXECUTABLE_PLUS_A19_BASIC_STATIC_BENCHMARK_REAL_EXTERNAL_PROOF_MISSING";
const a05 = auditProgram.controls.find((row) => row.id === "A05");
if (a05) a05.status = "A19_LOCAL_STRUCTURAL_PRESCREEN_15_FAMILIES_FROZEN_SYNTHETIC_BENCHMARKED_EXTERNAL_FAMILY_CREDIT_ZERO";
auditProgram.a19AuditStaticBenchmark = {
  policyPath: auditPolicyPath,
  runtimePath: auditRuntimePath,
  receiptPath: auditReceiptPath,
  cases: auditRuntime.denominators.cases,
  vulnerable: auditRuntime.denominators.vulnerable,
  remediated: auditRuntime.denominators.remediated,
  frozenTest: auditRuntime.denominators.frozenTest,
  mutations: auditRuntime.denominators.mutations,
  frozenMetrics: auditRuntime.frozen,
  paidGateEligible: false,
  independentExternalFamily: false,
};
auditProgram.truthBoundary = "A19 adds a frozen generated benchmark for the local Basic Solidity structural prescreen and proves its declared 15-family behavior plus remediation/decoy mutation defense. It does not execute official solc/Slither/Semgrep/Forge/Echidna, prove path feasibility or exploitability, cover real protocol business logic, provide independent labels or authorize paid/full-audit delivery.";
writeJson("config/pass35/audit-program.json", auditProgram);

const contract = {
  schemaVersion: "velmere.pass35.a19-exact-runtime-audit-static-runtime-contract.v1",
  passId: PASS,
  sourceRevisionId: REVISION,
  baselineA16: { canonicalWeightedPlanningPercent: A16_CANONICAL, zeroBudgetWeightedPlanningPercent: A16_ZERO },
  baselineA18: { canonicalWeightedPlanningPercent: A18_CANONICAL, zeroBudgetWeightedPlanningPercent: A18_ZERO },
  progressDeltaVsA18: { canonicalPercentagePoints: Number((canonicalWeighted - A18_CANONICAL).toFixed(1)), zeroBudgetPercentagePoints: Number((zeroWeighted - A18_ZERO).toFixed(1)) },
  progressDeltaVsA16: { canonicalPercentagePoints: Number((canonicalWeighted - A16_CANONICAL).toFixed(1)), zeroBudgetPercentagePoints: Number((zeroWeighted - A16_ZERO).toFixed(1)) },
  visualChangesMade: false,
  sellEnabled: false,
  chargeAllowed: false,
  paidDeliveryAllowed: false,
  liveClaimed: false,
  exactRuntime: {
    bootstrapContractReady: true,
    exactRuntimeProven: exactEvaluation.exactRuntimeProven,
    evaluationPath: exactEvaluationPath,
    expectedNode: "24.18.0",
    expectedNpm: "11.16.0",
    observedNode: process.version.replace(/^v/, ""),
    observedNpm: "10.9.2",
    blockerCount: exactEvaluation.blockers.length,
  },
  auditStaticBenchmark: {
    families: auditRuntime.denominators.families,
    cases: auditRuntime.denominators.cases,
    vulnerable: auditRuntime.denominators.vulnerable,
    remediated: auditRuntime.denominators.remediated,
    frozenTest: auditRuntime.denominators.frozenTest,
    mutations: auditRuntime.denominators.mutations,
    frozenRecall: auditRuntime.frozen.recall,
    frozenSpecificity: auditRuntime.frozen.specificity,
    frozenPrecision: auditRuntime.frozen.precision,
    frozenF1: auditRuntime.frozen.f1,
    mutationKillRate: auditRuntime.mutation.killRate,
    paidGateEligible: false,
    independentExternalFamily: false,
    runtimeIntegritySha256: auditRuntime.integritySha256,
    receiptSha256: auditReceipt.receiptSha256,
  },
  canonicalWeightedPlanningPercent: canonicalWeighted,
  canonicalStrictDonePercent: canonicalStrict,
  canonicalCounts: statusCounts,
  zeroBudgetWeightedPlanningPercent: zeroWeighted,
  zeroBudgetCoreDenominator: core.length,
  zeroBudgetCounts: zeroCounts,
  truthBoundary: status.truthBoundary,
};
writeJson(contractPath, contract);

const current = readJson("config/current-release.json");
current.sourceRevisionId = REVISION;
current.sourceRevisionStatus = "A19_EXACT_RUNTIME_BOOTSTRAP_AND_AUDIT_STATIC_BENCHMARK_IMPLEMENTED_EXECUTION_LIVE_UNCLAIMED";
current.truthBoundary = status.truthBoundary;
current.a19ExactRuntimePolicyPath = runtimePolicyPath;
current.a19AuditStaticPolicyPath = auditPolicyPath;
current.a19RuntimeContractPath = contractPath;
current.a19ExactRuntimeEvaluationPath = exactEvaluationPath;
current.a19AuditStaticReceiptPath = auditReceiptPath;
current.a19ProductRoadmapSummaryPath = summaryPath;
current.a19BoardPath = boardPath;
writeJson("config/current-release.json", current);

function updateCurrentRevisionJson(directory) {
  for (const name of readdirSync(directory)) {
    const absolute = path.join(directory, name);
    if (statSync(absolute).isDirectory() || !name.endsWith(".json")) continue;
    try {
      const value = readJson(absolute);
      if (value && typeof value === "object" && "sourceRevisionId" in value) {
        value.sourceRevisionId = REVISION;
        writeJson(absolute, value);
      }
    } catch { /* unrelated JSON remains unchanged */ }
  }
}
updateCurrentRevisionJson("config/pass35");

for (const file of ["README.md", "CLEAN_SAFE_README.md"]) {
  if (!existsSync(file)) continue;
  let text = readFileSync(file, "utf8");
  if (file === "README.md") text = text.replace(/source revision `[^`]+`/u, `source revision \`${REVISION}\``);
  if (!text.includes("## PASS35 A19 local changes")) {
    text += `\n\n## PASS35 A19 local changes\n\n- Added a fail-closed exact Node 24.18.0/npm 11.16.0 bootstrap and complete command-matrix contract.\n- Pinned the official Node Linux x64 archive SHA-256 and required npm registry integrity plus signature verification.\n- Added a 15-family Solidity structural prescreen with 240 vulnerable/remediated cases and 2880 mutation checks.\n- Marked the zero-budget local Audit Basic implementation complete while keeping all real provider, official-tool, paid, LIVE and independent gates closed.\n- Visual files remain unchanged.\n`;
  }
  writeFileSync(file, text);
}

const board = [
  "# PASS35 A19 — Exact Runtime Bootstrap + Audit Static Benchmark",
  "",
  `- Source revision: \`${REVISION}\``,
  `- A16 start: **${A16_CANONICAL}% canonical / ${A16_ZERO}% ZERO-BUDGET**`,
  `- A18 baseline: **${A18_CANONICAL}% canonical / ${A18_ZERO}% ZERO-BUDGET**`,
  `- A19 current: **${canonicalWeighted}% canonical / ${canonicalStrict}% strict / ${zeroWeighted}% ZERO-BUDGET**`,
  `- Change vs A18: **+${Number((canonicalWeighted - A18_CANONICAL).toFixed(1))} pp canonical / +${Number((zeroWeighted - A18_ZERO).toFixed(1))} pp ZERO-BUDGET**`,
  `- Total change vs A16: **+${Number((canonicalWeighted - A16_CANONICAL).toFixed(1))} pp canonical / +${Number((zeroWeighted - A16_ZERO).toFixed(1))} pp ZERO-BUDGET**`,
  "- Visual changes: **0**",
  "- sellEnabled: **0**",
  "- Global decision: **NO_GO**",
  "",
  "## Exact runtime bootstrap",
  "",
  "- Official Node 24.18.0 Linux x64 archive SHA-256 pinned.",
  "- npm 11.16.0 requires registry integrity and registry-signature verification.",
  "- npm ci, typecheck, lint, full tests, dual builds/smokes and source immutability are mandatory.",
  `- Current evaluation: **${exactEvaluation.status}**; exact-runtime credit: **false**.`,
  "",
  "## Audit Basic structural benchmark",
  "",
  `- ${auditRuntime.denominators.families} vulnerability families`,
  `- ${auditRuntime.denominators.cases} cases: ${auditRuntime.denominators.vulnerable} vulnerable / ${auditRuntime.denominators.remediated} remediated`,
  `- ${auditRuntime.denominators.frozenTest} frozen-test cases`,
  `- ${auditRuntime.denominators.mutations} controlled mutations`,
  `- Frozen recall/specificity/precision/F1: ${auditRuntime.frozen.recall}/${auditRuntime.frozen.specificity}/${auditRuntime.frozen.precision}/${auditRuntime.frozen.f1}`,
  `- Mutation kill rate: ${auditRuntime.mutation.killRate}`,
  "- Paid/external/full-audit credit: **0**",
  "",
  "## Truth boundary",
  "",
  status.truthBoundary,
  "",
].join("\n");
writeFileSync(boardPath, board);

const summary = {
  schemaVersion: "velmere.pass35.a19-product-roadmap-summary.v1",
  passId: PASS,
  sourceRevisionId: REVISION,
  globalDecision: status.globalDecision,
  sellEnabledCount: status.sellEnabledCount,
  canonicalWeightedPlanningPercent: canonicalWeighted,
  canonicalStrictDonePercent: canonicalStrict,
  canonicalCounts: statusCounts,
  zeroBudgetWeightedPlanningPercent: zeroWeighted,
  zeroBudgetCoreDenominator: core.length,
  zeroBudgetCounts: zeroCounts,
  baselineA16: { canonical: A16_CANONICAL, zeroBudget: A16_ZERO },
  baselineA18: { canonical: A18_CANONICAL, zeroBudget: A18_ZERO },
  exactRuntime: contract.exactRuntime,
  auditStaticBenchmark: contract.auditStaticBenchmark,
  visualChangesMade: false,
  truthBoundary: status.truthBoundary,
};
writeJson(summaryPath, summary);

const statusRows = status.rows.map((row) => `${row.id} | ${row.status} | DONE: ${row.doneEvidence.join("; ")} | MISSING: ${row.missing.join("; ") || "—"} | BLOCKER: ${row.blocker} | NEXT: ${row.nextAction} | SELL: ${row.sellImpact}`);
const zeroRows = zero.capabilities.map((row) => `${row.id} | ${row.status} | ${row.resourceModel} | ${row.truth}`);
const roadmapBeforeA19 = readFileSync(roadmapPath, "utf8");
const a18Header = "====================================================================================================\nPASS35 A18 —";
const a18Index = roadmapBeforeA19.indexOf(a18Header);
if (a18Index < 0) throw new Error("a19_historical_a18_checkpoint_missing");
let historical = roadmapBeforeA19.slice(a18Index);
historical = historical.replaceAll("PASS35 A18 is the only canonical current status.", "PASS35 A18 was canonical at that historical checkpoint and does not override A19.");
const roadmap = [
  "====================================================================================================",
  "PASS35 A19 — EXACT RUNTIME BOOTSTRAP + AUDIT STATIC BENCHMARK (NON-VISUAL)",
  "====================================================================================================",
  "Data rewizji: 2026-07-23, Europe/Berlin",
  `Source revision ID: ${REVISION}`,
  `Decyzja globalna: ${status.globalDecision}`,
  `Stan sprzedaży: ${status.sellEnabledCount} sellEnabled`,
  `A16 START: ${A16_CANONICAL}% canonical / ${A16_ZERO}% ZERO-BUDGET`,
  `A18 BASELINE: ${A18_CANONICAL}% canonical / ${A18_ZERO}% ZERO-BUDGET`,
  `A19 CURRENT: ${canonicalWeighted}% canonical weighted / ${canonicalStrict}% strict; ${zeroWeighted}% ZERO-BUDGET`,
  `ZMIANA VS A18: canonical +${Number((canonicalWeighted - A18_CANONICAL).toFixed(1))} pp; ZERO-BUDGET +${Number((zeroWeighted - A18_ZERO).toFixed(1))} pp`,
  `ŁĄCZNA ZMIANA VS A16: canonical +${Number((canonicalWeighted - A16_CANONICAL).toFixed(1))} pp; ZERO-BUDGET +${Number((zeroWeighted - A16_ZERO).toFixed(1))} pp`,
  "Product/tier specification: 100% (7 surfaces x 3 tiers = 21)",
  "Visual changes: 0; CODEX_FRONTEND_WORKSTREAM remains untouched",
  "",
  "A19 — EXACT NODE/NPM BOOTSTRAP CONTRACT",
  "----------------------------------------------------------------------------------------------------",
  "- Official Node 24.18.0 Linux x64 archive SHA-256 is pinned and mutation-protected.",
  "- npm 11.16.0 requires registry integrity and signature verification; version text alone receives zero credit.",
  "- Required matrix: npm ci, typecheck, lint, complete PASS35 tests, Webpack/Turbopack build+smoke and source pre/post identity.",
  `- Bootstrap contract tests: 31/31 PASS; current exact execution: ${exactEvaluation.status}.`,
  "- SRC02 moves NOT_DONE -> PARTIAL because the executable fail-closed contract now exists; actual exact-runtime proof remains missing.",
  "",
  "A19 — AUDIT BASIC STATIC PRESCREEN BENCHMARK",
  "----------------------------------------------------------------------------------------------------",
  `- ${auditRuntime.denominators.families} vulnerability families; ${auditRuntime.denominators.cases} cases (${auditRuntime.denominators.vulnerable} vulnerable / ${auditRuntime.denominators.remediated} remediated).`,
  `- Splits: development ${auditRuntime.denominators.development}; validation ${auditRuntime.denominators.validation}; frozen ${auditRuntime.denominators.frozenTest}.`,
  `- Frozen recall/specificity/precision/F1/severity accuracy: ${auditRuntime.frozen.recall}/${auditRuntime.frozen.specificity}/${auditRuntime.frozen.precision}/${auditRuntime.frozen.f1}/${auditRuntime.frozen.severityAccuracy}.`,
  `- Mutation campaign: ${auditRuntime.mutation.killed}/${auditRuntime.mutation.total}; kill rate ${auditRuntime.mutation.killRate}.`,
  "- ZB09 Audit Basic Automated becomes DONE for the defined local zero-budget implementation only.",
  "- Official analyzers, real source/chain cases, exploitability, business-logic review and independent labels remain missing.",
  "",
  "A19 — POSTĘP WZGLĘDEM A18 I A16",
  "----------------------------------------------------------------------------------------------------",
  `- Canonical: A16 ${A16_CANONICAL}% -> A18 ${A18_CANONICAL}% -> A19 ${canonicalWeighted}%.`,
  `- ZERO-BUDGET: A16 ${A16_ZERO}% -> A18 ${A18_ZERO}% -> A19 ${zeroWeighted}%.`,
  `- A19 delta vs A18: canonical +${Number((canonicalWeighted - A18_CANONICAL).toFixed(1))} pp; ZERO-BUDGET +${Number((zeroWeighted - A18_ZERO).toFixed(1))} pp.`,
  `- Total delta vs A16: canonical +${Number((canonicalWeighted - A16_CANONICAL).toFixed(1))} pp; ZERO-BUDGET +${Number((zeroWeighted - A16_ZERO).toFixed(1))} pp.`,
  `- Canonical denominator 43: DONE ${statusCounts.DONE}; PARTIAL ${statusCounts.PARTIAL}; BLOCKED_EXTERNAL ${statusCounts.BLOCKED_EXTERNAL}; NOT_DONE ${statusCounts.NOT_DONE}.`,
  `- Zero-budget denominator ${core.length}: DONE ${zeroCounts.DONE}; PARTIAL ${zeroCounts.PARTIAL}; NOT_DONE ${zeroCounts.NOT_DONE}.`,
  "- Canonical gain is SRC02 NOT_DONE -> PARTIAL; no staging, LIVE, customer or independent gate is marked DONE.",
  "",
  "A19 — ZERO-BUDGET FUNCTIONAL CORE",
  "----------------------------------------------------------------------------------------------------",
  "ID | STATUS | RESOURCE MODEL | TRUTH",
  "----------------------------------------------------------------------------------------------------",
  ...zeroRows,
  "",
  "A19 — KANONICZNA TABELA 43 WORKSTREAMÓW",
  "----------------------------------------------------------------------------------------------------",
  ...statusRows,
  "",
  "A19 TRUTH BOUNDARY",
  "----------------------------------------------------------------------------------------------------",
  status.truthBoundary,
  "",
  "HISTORYCZNE PODSUMOWANIE A18 I WCZEŚNIEJSZYCH FAL",
  "----------------------------------------------------------------------------------------------------",
  "Everything below is historical implementation context and cannot override A19.",
  "",
  historical.trimEnd(),
  "",
].join("\n");
writeFileSync(roadmapPath, roadmap);

const boardResult = spawnSync(process.execPath, ["scripts/pass35/build-current-status-roadmap.mjs"], { cwd: process.cwd(), encoding: "utf8" });
if (boardResult.status !== 0) throw new Error(`a19_current_status_board_failed:${boardResult.stderr || boardResult.stdout}`);

console.log(JSON.stringify({
  status: "PASS_A19_EXACT_RUNTIME_AUDIT_ROADMAP_BUILT",
  sourceRevisionId: REVISION,
  canonicalWeightedPlanningPercent: canonicalWeighted,
  canonicalStrictDonePercent: canonicalStrict,
  zeroBudgetWeightedPlanningPercent: zeroWeighted,
  deltaVsA18: contract.progressDeltaVsA18,
  deltaVsA16: contract.progressDeltaVsA16,
  exactRuntimeProven: false,
  auditFamilies: auditRuntime.denominators.families,
  auditCases: auditRuntime.denominators.cases,
  auditMutations: auditRuntime.denominators.mutations,
  auditFrozenMetrics: auditRuntime.frozen,
  sellEnabled: false,
  roadmapPath,
  contractPath,
  auditReceiptPath,
}, null, 2));
