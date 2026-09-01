#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  applyPass35A18TierValuePolicy,
  runPass35A18TierValueBenchmarkRuntime,
  verifyPass35A18TierValueBenchmarkRuntime,
  verifyPass35A18TierValuePolicy,
} from "../../lib/market-integrity/pass35-a18-tier-value-benchmark-runtime.mjs";

const PASS = "PASS35_A18";
const REVISION = "VELMERE_PASS35_A18_TIER_VALUE_BENCHMARK_AND_DOWNGRADE_GUARD_NON_VISUAL";
const A16_CANONICAL = 40.7;
const A16_ZERO = 80.0;
const A17_CANONICAL = 41.9;
const A17_ZERO = 82.1;
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file, value) => { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); };
const sha256 = (value) => `sha256:${createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex")}`;
const unique = (rows) => [...new Set(rows)];

const policyPath = "config/pass35/a18-tier-value-benchmark-policy.json";
const productPath = "config/pass35/product-tier-content-contract.json";
const zeroPath = "config/pass35/zero-budget-functional-roadmap.json";
const statusPath = "config/pass35/current-status-register.json";
const roadmapPath = "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt";
const runtimePath = "artifacts/pass35/PASS35_A18_TIER_VALUE_BENCHMARK_RUNTIME.json";
const receiptPath = "artifacts/pass35/PASS35_A18_TIER_VALUE_BENCHMARK_RECEIPT.json";
const boardPath = "artifacts/release/PASS35_A18_TIER_VALUE_BENCHMARK.md";
const summaryPath = "artifacts/release/PASS35_A18_PRODUCT_ROADMAP_SUMMARY.json";
const contractPath = "config/pass35/a18-tier-value-runtime-contract.json";

const policy = readJson(policyPath);
const rawProduct = readJson(productPath);
if (!verifyPass35A18TierValuePolicy(rawProduct, policy)) throw new Error("a18_policy_verification_failed");
const product = applyPass35A18TierValuePolicy(rawProduct, policy);
writeJson(productPath, product);
const runtime = runPass35A18TierValueBenchmarkRuntime({ productContract: product, policy });
if (!verifyPass35A18TierValueBenchmarkRuntime(runtime, policy)) throw new Error("a18_runtime_verification_failed");
writeJson(runtimePath, runtime);

const receiptCore = {
  schemaVersion: "velmere.pass35.a18-tier-value-benchmark-receipt.v1",
  passId: PASS,
  sourceRevisionId: REVISION,
  status: "PASS_FUNCTIONAL_OFFLINE_NOT_FOR_SALE",
  evaluatedAt: runtime.evaluatedAt,
  policyPath,
  policySha256: sha256(readFileSync(policyPath)),
  productContractPath: productPath,
  productContractSha256: sha256(readFileSync(productPath)),
  runtimePath,
  runtimeIntegritySha256: runtime.integrity.digest,
  denominators: {
    surfaces: runtime.surfaceCount,
    cases: runtime.caseDenominator,
    outputs: runtime.outputDenominator,
    comparisons: runtime.comparisonDenominator,
    blindComparisons: runtime.blindComparisonDenominator,
    mutations: runtime.mutationDenominator,
    mutationTypes: runtime.mutationTypeCount,
  },
  results: {
    structuralPassRate: runtime.structuralPassRate,
    structuralPassWilson95: runtime.structuralPassWilson95,
    blindSelectionAccuracy: runtime.blindSelectionAccuracy,
    blindSelectionWilson95: runtime.blindSelectionWilson95,
    mutationKillRate: runtime.mutationKillRate,
    mutationKillWilson95: runtime.mutationKillWilson95,
    noSilentTierDowngrade: runtime.noSilentTierDowngrade,
    noPageCountOnlyUpgrade: runtime.noPageCountOnlyUpgrade,
    cleanOutputsNoCharge: runtime.cleanOutputsNoCharge,
    mutantsNoCharge: runtime.mutantsNoCharge,
  },
  functionalOfflineTierValueReady: true,
  customerPurchaseWorthinessProven: false,
  sellEnabled: false,
  chargeAllowed: false,
  paidDeliveryAllowed: false,
  liveClaimed: false,
  truthBoundary: runtime.truthBoundary,
};
const receipt = { ...receiptCore, receiptSha256: sha256(receiptCore) };
writeJson(receiptPath, receipt);

const zero = readJson(zeroPath);
zero.passId = PASS;
zero.sourceRevisionId = REVISION;
const replaceCapability = (capability) => {
  const index = zero.capabilities.findIndex((row) => row.id === capability.id);
  if (index >= 0) zero.capabilities[index] = { ...zero.capabilities[index], ...capability };
  else zero.capabilities.push(capability);
};
replaceCapability({
  id: "ZB45_TIER_INCREMENTAL_VALUE_BENCHMARK",
  status: "DONE",
  resourceModel: "Own work only",
  truth: "A18 executes a frozen 350-case structural tier-value corpus across all 7 surfaces, producing 1050 Basic/Pro/Advanced outputs and 700 blinded Basic-to-Pro / Pro-to-Advanced comparisons. Every paid upgrade must add at least 8 material fields, 2 new evidence families, 1 new scenario and a positive utility delta with no safety regression. This proves functional differentiation offline, not customer willingness-to-pay.",
});
replaceCapability({
  id: "ZB46_TIER_VALUE_MUTATION_FILLER_DEFENSE",
  status: "DONE",
  resourceModel: "Own work only",
  truth: "A18 runs 5600 controlled tier-value mutations across page-count-only filler, missing incremental fields/evidence/scenarios, unsafe non-abstention, invented claims, silent downgrade and duplicate filler. All mutations are rejected and mutation kill rate is 100% in the frozen synthetic program.",
});
replaceCapability({
  id: "ZB47_NO_SILENT_DOWNGRADE_NO_CHARGE_RUNTIME",
  status: "DONE",
  resourceModel: "Own work only",
  truth: "A18 binds structural tier-value failure to UNAVAILABLE_NOT_FOR_SALE and proves that neither clean offline fixtures nor any rejected mutant may enable charge, paid delivery, LIVE or silent delivery of a lower tier under a higher-tier label.",
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
if (core.length !== 45 || zeroCounts.DONE !== 31 || zeroCounts.PARTIAL !== 13 || zeroCounts.NOT_DONE !== 1 || zeroWeighted !== 83.3) {
  throw new Error(`a18_zero_math_invalid:${JSON.stringify({ denominator: core.length, zeroCounts, zeroWeighted })}`);
}

const status = readJson(statusPath);
status.sourceRevisionId = REVISION;
for (const row of status.rows) {
  if (row.id === "BENCH01_CANONICAL_CORPUS") {
    row.status = "PARTIAL";
    row.doneEvidence = unique([...row.doneEvidence,
      "A18 executable frozen synthetic tier-value corpus: 350 cases / 1050 outputs / 700 blind upgrade comparisons",
      "A18 5600-mutation campaign with 100% kill rate for filler, missing incremental value, unsafe output, invented claims and silent downgrade",
      "A18 Wilson 95% confidence intervals for structural pass, blind selection and mutation kill rates",
    ]);
    row.missing = ["2700 real independently labeled rows", "real disjoint train/validation/test execution", "300 qualified human review cases", "customer outcome and willingness-to-pay labels", "independent adjudication and rerun"];
    row.blocker = "REAL_CORPUS_CUSTOMER_LABELS_AND_INDEPENDENT_ADJUDICATION_REQUIRED";
    row.nextAction = "Run the frozen A18 benchmark contract on real rights-approved cases with blind customer/expert labels, disjoint splits and independent adjudication.";
    row.sellImpact = "A18 closes the executable structural benchmark harness only; real tier-value and top-tier claims remain blocked.";
  }
  if (row.id === "PDF02_REAL_TIER_VALUE") {
    row.doneEvidence = unique([...row.doneEvidence,
      "A18 PDF Delivery Basic-to-Pro and Pro-to-Advanced structural value is included in the blinded 350-case/700-comparison program and page-count-only filler is mutation-killed",
    ]);
    row.nextAction = "Run the same A17 physical PDF delivery and A18 blind value contract on current rights-approved packets with customer comprehension and willingness-to-pay labels.";
  }
  if (row.id === "AI01_BRAIN_ANGEL") {
    row.doneEvidence = unique([...row.doneEvidence,
      "A18 blind tier-ordering and decision-utility benchmark covers all 7 surfaces with no tier labels exposed to the scorer",
      "A18 unsafe non-abstention, invented-claim and silent-downgrade mutations are rejected before any charge or paid delivery",
    ]);
    row.missing = ["frozen unseen real eval", "prompt-injection/RAG/tool red team", "real provider rights", "customer decision-utility labels", "staging and customer outcome"];
    row.nextAction = "Execute the A18 contract on unseen real packet outputs, then add prompt-injection/RAG/tool red-team and customer decision-utility adjudication.";
  }
  if (["MKT01_SHIELD_REAL_DATA", "MKT02_REAL_MARKETS", "MKT03_MARKET_IMPACT", "MKT04_WHALE_WATCH", "AUD18_A16_REPORT_DELIVERY"].includes(row.id)) {
    row.doneEvidence = unique([...row.doneEvidence,
      "A18 surface-specific Basic-to-Pro and Pro-to-Advanced structural value gates require >=8 new material fields, >=2 new evidence families, >=1 new scenario, no filler and no safety regression",
    ]);
  }
}
const statusCounts = Object.fromEntries(status.allowedStatuses.map((state) => [state, status.rows.filter((row) => row.status === state).length]));
const canonicalStrict = Number(((statusCounts.DONE / status.rows.length) * 100).toFixed(1));
const canonicalWeighted = Number((((statusCounts.DONE + statusCounts.PARTIAL * 0.5) / status.rows.length) * 100).toFixed(1));
if (status.rows.length !== 43 || statusCounts.DONE !== 4 || statusCounts.PARTIAL !== 29 || statusCounts.BLOCKED_EXTERNAL !== 9 || statusCounts.NOT_DONE !== 1 || canonicalWeighted !== 43.0 || canonicalStrict !== 9.3) {
  throw new Error(`a18_canonical_math_invalid:${JSON.stringify({ statusCounts, canonicalWeighted, canonicalStrict })}`);
}
status.zeroBudgetFunctionalTrack = {
  ...status.zeroBudgetFunctionalTrack,
  currentWeightedPlanningPercent: zeroWeighted,
  coreDenominator: core.length,
  done: zeroCounts.DONE,
  partial: zeroCounts.PARTIAL,
  notDone: zeroCounts.NOT_DONE,
  a18TierValuePolicyPath: policyPath,
  a18TierValueContractPath: contractPath,
};
status.truthBoundary = `PASS35 A18 is the only canonical current status. Canonical roadmap is ${canonicalWeighted}% weighted / ${canonicalStrict}% strict across 43 workstreams, up ${Number((canonicalWeighted - A17_CANONICAL).toFixed(1))} pp from A17 and ${Number((canonicalWeighted - A16_CANONICAL).toFixed(1))} pp from A16. Zero-budget functional core is ${zeroWeighted}% across 45 capabilities, up ${Number((zeroWeighted - A17_ZERO).toFixed(1))} pp from A17 and ${Number((zeroWeighted - A16_ZERO).toFixed(1))} pp from A16. A18 locally closes executable structural tier-value benchmarking, blind tier ordering, filler/downgrade mutation defense and no-charge enforcement. Real customer labels, willingness-to-pay, current provider evidence, staging, sale, LIVE and independent assurance remain unclaimed.`;
writeJson(statusPath, status);

const contract = {
  schemaVersion: "velmere.pass35.a18-tier-value-runtime-contract.v1",
  passId: PASS,
  sourceRevisionId: REVISION,
  baselineA16: { canonicalWeightedPlanningPercent: A16_CANONICAL, zeroBudgetWeightedPlanningPercent: A16_ZERO },
  baselineA17: { canonicalWeightedPlanningPercent: A17_CANONICAL, zeroBudgetWeightedPlanningPercent: A17_ZERO },
  progressDeltaVsA17: { canonicalPercentagePoints: Number((canonicalWeighted - A17_CANONICAL).toFixed(1)), zeroBudgetPercentagePoints: Number((zeroWeighted - A17_ZERO).toFixed(1)) },
  progressDeltaVsA16: { canonicalPercentagePoints: Number((canonicalWeighted - A16_CANONICAL).toFixed(1)), zeroBudgetPercentagePoints: Number((zeroWeighted - A16_ZERO).toFixed(1)) },
  visualChangesMade: false,
  sellEnabled: false,
  chargeAllowed: false,
  paidDeliveryAllowed: false,
  liveClaimed: false,
  tierValueBenchmark: {
    cases: runtime.caseDenominator,
    outputs: runtime.outputDenominator,
    comparisons: runtime.comparisonDenominator,
    blindComparisons: runtime.blindComparisonDenominator,
    mutations: runtime.mutationDenominator,
    structuralPassRate: runtime.structuralPassRate,
    blindSelectionAccuracy: runtime.blindSelectionAccuracy,
    mutationKillRate: runtime.mutationKillRate,
    noSilentTierDowngrade: runtime.noSilentTierDowngrade,
    noPageCountOnlyUpgrade: runtime.noPageCountOnlyUpgrade,
    customerPurchaseWorthinessProven: false,
    runtimeIntegritySha256: runtime.integrity.digest,
    receiptSha256: receipt.receiptSha256,
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
current.sourceRevisionStatus = "A18_TIER_VALUE_BENCHMARK_DOWNGRADE_GUARD_IMPLEMENTED_LIVE_UNCLAIMED";
current.truthBoundary = status.truthBoundary;
current.a18TierValuePolicyPath = policyPath;
current.a18TierValueContractPath = contractPath;
current.a18TierValueBoardPath = boardPath;
current.a18ProductRoadmapSummaryPath = summaryPath;
current.a18TierValueReceiptPath = receiptPath;
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
  if (file === "README.md") {
    text = text.replace(/source revision `[^`]+`/u, `source revision \`${REVISION}\``);
  }
  if (!text.includes("## PASS35 A18 local changes")) {
    text += `\n\n## PASS35 A18 local changes\n\n- Added a frozen 350-case structural tier-value benchmark across all seven product surfaces.\n- Generated 1050 Basic/Pro/Advanced outputs and 700 blind upgrade comparisons.\n- Enforced at least 8 new material fields, 2 new evidence families and 1 new scenario per paid upgrade.\n- Killed 5600 filler, downgrade, safety and claim-integrity mutations.\n- All clean and mutated outputs remain no-charge, not-for-sale and non-LIVE.\n- This is structural offline evidence only; real customer value and willingness-to-pay remain unproven.\n`;
  }
  writeFileSync(file, text);
}

const board = [
  "# PASS35 A18 — Tier Value Benchmark and Downgrade Guard",
  "",
  `- Source revision: \`${REVISION}\``,
  `- A16 start: **${A16_CANONICAL}% canonical / ${A16_ZERO}% ZERO-BUDGET**`,
  `- A17 baseline: **${A17_CANONICAL}% canonical / ${A17_ZERO}% ZERO-BUDGET**`,
  `- A18 current: **${canonicalWeighted}% canonical / ${canonicalStrict}% strict / ${zeroWeighted}% ZERO-BUDGET**`,
  `- Change vs A17: **+${Number((canonicalWeighted - A17_CANONICAL).toFixed(1))} pp canonical / +${Number((zeroWeighted - A17_ZERO).toFixed(1))} pp ZERO-BUDGET**`,
  `- Total change vs A16: **+${Number((canonicalWeighted - A16_CANONICAL).toFixed(1))} pp canonical / +${Number((zeroWeighted - A16_ZERO).toFixed(1))} pp ZERO-BUDGET**`,
  "- Visual changes: **0**",
  "- sellEnabled: **0**",
  "- Global decision: **NO_GO**",
  "",
  "## Executed structural benchmark",
  "",
  `- ${runtime.surfaceCount} surfaces`,
  `- ${runtime.caseDenominator} frozen synthetic cases`,
  `- ${runtime.outputDenominator} Basic/Pro/Advanced outputs`,
  `- ${runtime.comparisonDenominator} upgrade comparisons`,
  `- ${runtime.blindComparisonDenominator} blind tier-ordering comparisons`,
  `- ${runtime.mutationDenominator} controlled mutations across ${runtime.mutationTypeCount} mutation types`,
  `- Structural pass rate: ${runtime.structuralPassRate}`,
  `- Blind higher-tier selection accuracy: ${runtime.blindSelectionAccuracy}`,
  `- Mutation kill rate: ${runtime.mutationKillRate}`,
  "",
  "## Hard value rules",
  "",
  `- Minimum ${policy.thresholds.minimumIncrementalFieldsPerPaidUpgrade} new material fields per paid upgrade`,
  `- Minimum ${policy.thresholds.minimumNewEvidenceFamiliesPerPaidUpgrade} new evidence families per paid upgrade`,
  `- Minimum ${policy.thresholds.minimumNewScenariosPerPaidUpgrade} new scenario per paid upgrade`,
  "- No page-count-only upgrade",
  "- No invented facts",
  "- No unsafe non-abstention",
  "- No silent downgrade under a higher-tier label",
  "- No charge or paid delivery from local/synthetic evidence",
  "",
  "## Truth boundary",
  "",
  runtime.truthBoundary,
  "",
].join("\n");
writeFileSync(boardPath, board);

const summary = {
  schemaVersion: "velmere.pass35.a18-product-roadmap-summary.v1",
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
  baselineA17: { canonical: A17_CANONICAL, zeroBudget: A17_ZERO },
  tierValueBenchmark: contract.tierValueBenchmark,
  visualChangesMade: false,
  truthBoundary: status.truthBoundary,
};
writeJson(summaryPath, summary);

const statusRows = status.rows.map((row) => `${row.id} | ${row.status} | DONE: ${row.doneEvidence.join("; ")} | MISSING: ${row.missing.join("; ") || "—"} | BLOCKER: ${row.blocker} | NEXT: ${row.nextAction} | SELL: ${row.sellImpact}`);
const zeroRows = zero.capabilities.map((row) => `${row.id} | ${row.status} | ${row.resourceModel} | ${row.truth}`);
let historical = readFileSync(roadmapPath, "utf8");
const a18HistoryMarker = [
  "HISTORYCZNE PODSUMOWANIE A17 I WCZEŚNIEJSZYCH FAL",
  "----------------------------------------------------------------------------------------------------",
  "Everything below is historical implementation context and cannot override A18.",
  "",
].join("\n");
if (historical.startsWith("====================================================================================================\nPASS35 A18") && historical.includes(a18HistoryMarker)) {
  historical = historical.slice(historical.indexOf(a18HistoryMarker) + a18HistoryMarker.length);
  historical = historical.replace(/^(?:PASS35 A17 was canonical at that historical checkpoint and does not override A18\.\n\s*)+/u, "");
}
if (!historical.startsWith("====================================================================================================\nPASS35 A17 —")) {
  throw new Error("a18_historical_a17_checkpoint_missing");
}
historical = historical.replaceAll("PASS35 A17 is the only canonical current status.", "PASS35 A17 was canonical at that historical checkpoint and does not override A18.");
const roadmap = [
  "====================================================================================================",
  "PASS35 A18 — TIER VALUE BENCHMARK + DOWNGRADE/FILLER GUARD (NON-VISUAL)",
  "====================================================================================================",
  "Data rewizji: 2026-07-23, Europe/Berlin",
  `Source revision ID: ${REVISION}`,
  `Decyzja globalna: ${status.globalDecision}`,
  `Stan sprzedaży: ${status.sellEnabledCount} sellEnabled`,
  `A16 START: ${A16_CANONICAL}% canonical / ${A16_ZERO}% ZERO-BUDGET`,
  `A17 BASELINE: ${A17_CANONICAL}% canonical / ${A17_ZERO}% ZERO-BUDGET`,
  `A18 CURRENT: ${canonicalWeighted}% canonical weighted / ${canonicalStrict}% strict; ${zeroWeighted}% ZERO-BUDGET`,
  `ZMIANA VS A17: canonical +${Number((canonicalWeighted - A17_CANONICAL).toFixed(1))} pp; ZERO-BUDGET +${Number((zeroWeighted - A17_ZERO).toFixed(1))} pp`,
  `ŁĄCZNA ZMIANA VS A16: canonical +${Number((canonicalWeighted - A16_CANONICAL).toFixed(1))} pp; ZERO-BUDGET +${Number((zeroWeighted - A16_ZERO).toFixed(1))} pp`,
  "Product/tier specification: 100% (7 surfaces x 3 tiers = 21)",
  "Visual changes: 0; CODEX_FRONTEND_WORKSTREAM remains untouched",
  "",
  "A18 — FROZEN TIER VALUE BENCHMARK",
  "----------------------------------------------------------------------------------------------------",
  `- ${runtime.caseDenominator} cases across ${runtime.surfaceCount} surfaces; ${runtime.outputDenominator} Basic/Pro/Advanced outputs.`,
  `- ${runtime.comparisonDenominator} Basic->Pro / Pro->Advanced evaluations and ${runtime.blindComparisonDenominator} blind pair orderings.`,
  `- Structural pass ${runtime.structuralPassRate}; blind higher-tier selection ${runtime.blindSelectionAccuracy}; Wilson 95% intervals are bound in the receipt.`,
  `- Every paid upgrade adds >=${policy.thresholds.minimumIncrementalFieldsPerPaidUpgrade} material fields, >=${policy.thresholds.minimumNewEvidenceFamiliesPerPaidUpgrade} new evidence families and >=${policy.thresholds.minimumNewScenariosPerPaidUpgrade} new scenario.`,
  "- Tier labels are hidden from the blind scorer; page count is not used as paid value.",
  "",
  "A18 — FILLER / DOWNGRADE / SAFETY MUTATION CAMPAIGN",
  "----------------------------------------------------------------------------------------------------",
  `- ${runtime.mutationDenominator} mutations across ${runtime.mutationTypeCount} families; kill rate ${runtime.mutationKillRate}.`,
  "- Page-count-only filler, missing incremental fields/evidence/scenarios, unsafe non-abstention, invented claims, silent tier downgrade and duplicate filler are rejected.",
  "- Rejected tier output becomes UNAVAILABLE_NOT_FOR_SALE; no lower-tier payload may retain a higher-tier label.",
  "- Clean synthetic outputs also remain not-for-sale because structural value is not customer purchase-worthiness.",
  "",
  "A18 — POSTĘP WZGLĘDEM A17 I A16",
  "----------------------------------------------------------------------------------------------------",
  `- Canonical: A16 ${A16_CANONICAL}% -> A17 ${A17_CANONICAL}% -> A18 ${canonicalWeighted}%.`,
  `- ZERO-BUDGET: A16 ${A16_ZERO}% -> A17 ${A17_ZERO}% -> A18 ${zeroWeighted}%.`,
  `- A18 delta vs A17: canonical +${Number((canonicalWeighted - A17_CANONICAL).toFixed(1))} pp; ZERO-BUDGET +${Number((zeroWeighted - A17_ZERO).toFixed(1))} pp.`,
  `- Total delta vs A16: canonical +${Number((canonicalWeighted - A16_CANONICAL).toFixed(1))} pp; ZERO-BUDGET +${Number((zeroWeighted - A16_ZERO).toFixed(1))} pp.`,
  `- Canonical denominator 43: DONE ${statusCounts.DONE}; PARTIAL ${statusCounts.PARTIAL}; BLOCKED_EXTERNAL ${statusCounts.BLOCKED_EXTERNAL}; NOT_DONE ${statusCounts.NOT_DONE}.`,
  `- Zero-budget denominator ${core.length}: DONE ${zeroCounts.DONE}; PARTIAL ${zeroCounts.PARTIAL}; NOT_DONE ${zeroCounts.NOT_DONE}.`,
  "- Canonical gain is BENCH01 NOT_DONE -> PARTIAL after executable blind benchmark and mutation execution; no real/customer/independent gate is marked DONE.",
  "",
  "A18 — ZERO-BUDGET FUNCTIONAL CORE",
  "----------------------------------------------------------------------------------------------------",
  "ID | STATUS | RESOURCE MODEL | TRUTH",
  "----------------------------------------------------------------------------------------------------",
  ...zeroRows,
  "",
  "A18 — KANONICZNA TABELA 43 WORKSTREAMÓW",
  "----------------------------------------------------------------------------------------------------",
  ...statusRows,
  "",
  "A18 TRUTH BOUNDARY",
  "----------------------------------------------------------------------------------------------------",
  status.truthBoundary,
  "",
  "HISTORYCZNE PODSUMOWANIE A17 I WCZEŚNIEJSZYCH FAL",
  "----------------------------------------------------------------------------------------------------",
  "Everything below is historical implementation context and cannot override A18.",
  "",
  historical.trimEnd(),
  "",
].join("\n");
writeFileSync(roadmapPath, roadmap);

console.log(JSON.stringify({
  status: "PASS_A18_TIER_VALUE_ROADMAP_BUILT",
  sourceRevisionId: REVISION,
  canonicalWeightedPlanningPercent: canonicalWeighted,
  canonicalStrictDonePercent: canonicalStrict,
  zeroBudgetWeightedPlanningPercent: zeroWeighted,
  deltaVsA17: contract.progressDeltaVsA17,
  deltaVsA16: contract.progressDeltaVsA16,
  cases: runtime.caseDenominator,
  outputs: runtime.outputDenominator,
  comparisons: runtime.comparisonDenominator,
  blindComparisons: runtime.blindComparisonDenominator,
  mutations: runtime.mutationDenominator,
  structuralPassRate: runtime.structuralPassRate,
  blindSelectionAccuracy: runtime.blindSelectionAccuracy,
  mutationKillRate: runtime.mutationKillRate,
  sellEnabled: false,
  roadmapPath,
  contractPath,
  receiptPath,
}, null, 2));
