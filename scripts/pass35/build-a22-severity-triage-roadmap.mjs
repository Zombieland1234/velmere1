#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { runA22Benchmark, verifyA22Benchmark, verifyA22Policy } from "../../lib/security/pass35-a22-severity-triage-runtime.mjs";

const PASS = "PASS35_A22";
const REV = "VELMERE_PASS35_A22_EVIDENCE_BOUND_SEVERITY_ATTACK_CHAIN_NON_VISUAL";
const A16_CAN = 40.7, A16_ZERO = 80.0, A21_CAN = 46.5, A21_ZERO = 86.8;
const policyPath = "config/pass35/a22-severity-triage-policy.json";
const runtimePath = "artifacts/pass35/PASS35_A22_SEVERITY_TRIAGE_BENCHMARK.json";
const receiptPath = "artifacts/pass35/PASS35_A22_SEVERITY_TRIAGE_RECEIPT.json";
const contractPath = "config/pass35/a22-severity-triage-runtime-contract.json";
const summaryPath = "artifacts/release/PASS35_A22_PRODUCT_ROADMAP_SUMMARY.json";
const boardPath = "artifacts/release/PASS35_A22_SEVERITY_TRIAGE.md";
const statusPath = "config/pass35/current-status-register.json";
const zeroPath = "config/pass35/zero-budget-functional-roadmap.json";
const roadmapPath = "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt";
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const writeJson = (p, value) => { mkdirSync(path.dirname(p), { recursive: true }); writeFileSync(p, `${JSON.stringify(value, null, 2)}\n`); };
const hash = (value) => `sha256:${createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest("hex")}`;

const policy = readJson(policyPath);
if (!verifyA22Policy(policy)) throw new Error("a22_policy_invalid");
const benchmark = runA22Benchmark(policy);
if (!verifyA22Benchmark(benchmark, policy)) throw new Error(`a22_benchmark_failed:${benchmark.failedGates.join(",")}`);
writeJson(runtimePath, benchmark);
const receiptCore = {
  schemaVersion: "velmere.pass35.a22-severity-triage-receipt.v1",
  passId: PASS,
  sourceRevisionId: REV,
  status: "PASS_LOCAL_EVIDENCE_BOUND_SEVERITY_TRIAGE_NOT_FOR_SALE",
  policyPath,
  policySha256: hash(readFileSync(policyPath)),
  runtimePath,
  runtimeIntegritySha256: benchmark.integritySha256,
  denominators: benchmark.denominators,
  frozen: benchmark.frozen,
  mutation: benchmark.mutation,
  evidenceBoundSeverityTriageComplete: true,
  blastRadiusClassificationComplete: true,
  attackChainAggregationComplete: true,
  independentHumanRatersClaimed: false,
  exploitabilityClaimAllowed: false,
  paidGateEligible: false,
  sellEnabled: false,
  chargeAllowed: false,
  liveClaimed: false,
  truthBoundary: policy.truthBoundary,
};
const receipt = { ...receiptCore, receiptSha256: hash(receiptCore) };
writeJson(receiptPath, receipt);

const zero = readJson(zeroPath); zero.passId = PASS; zero.sourceRevisionId = REV;
const replaceCapability = (row) => { const index = zero.capabilities.findIndex((item) => item.id === row.id); if (index >= 0) zero.capabilities[index] = { ...zero.capabilities[index], ...row }; else zero.capabilities.push(row); };
replaceCapability({ id: "ZB56_EVIDENCE_BOUND_SEVERITY_TRIAGE", status: "DONE", resourceModel: "Own work only", truth: "A22 computes severity from explicit impact, asset-at-risk, blast radius, attacker exposure, exploitability, persistence, path feasibility and evidence-family inputs. Missing asset binding, unknown paths, single-family evidence and conflicts apply hard severity/confidence caps instead of allowing unsupported escalation." });
replaceCapability({ id: "ZB57_ATTACK_CHAIN_BLAST_RADIUS_RUNTIME", status: "DONE", resourceModel: "Own work only", truth: "A22 builds evidence-bound finding enablement graphs, rejects cycles, records two-step and three-plus-step attack chains, classifies single-user through cross-protocol blast radius, and includes chain context in deterministic severity receipts without claiming exploit proof." });
replaceCapability({ id: "ZB58_SEVERITY_UNCERTAINTY_FROZEN_BENCHMARK", status: "DONE", resourceModel: "Own work only", truth: "A22 executes two frozen scoring profiles, exposes disagreement, computes exact agreement and weighted kappa, checks critical-justification invariants and runs a 192-case / 2304-mutation generated benchmark. The profiles are not independent humans and cannot grant paid or real-world quality credit." });
const exclusions = new Set(zero.zeroBudgetCoreExclusions);
const core = zero.capabilities.filter((row) => !exclusions.has(row.id));
const zc = { DONE: core.filter((row) => row.status === "DONE").length, PARTIAL: core.filter((row) => row.status === "PARTIAL").length, NOT_DONE: core.filter((row) => row.status === "NOT_DONE").length };
const zw = Number((((zc.DONE + zc.PARTIAL * 0.5) / core.length) * 100).toFixed(1));
if (core.length !== 56 || zc.DONE !== 43 || zc.PARTIAL !== 12 || zc.NOT_DONE !== 1 || zw !== 87.5) throw new Error(`a22_zero_math:${JSON.stringify({ core: core.length, zc, zw })}`);
zero.truthBoundary = `PASS35 A22 adds locally complete evidence-bound severity triage, blast-radius and attack-chain implementation for the declared A14 scope. ZERO-BUDGET planning is ${zw}% across ${core.length} core capabilities. Real findings, independent human raters, exploitability adjudication, customer outcomes, staging, sale, LIVE and independent assurance remain outside this local completion claim.`;
writeJson(zeroPath, zero);

const status = readJson(statusPath); status.sourceRevisionId = REV; status.candidateId = "VELMERE_PASS35_OFFLINE_CANDIDATE_R3"; status.evaluatedAt = "2026-07-23T09:22:00.000Z";
const severityRow = status.rows.find((row) => row.id === "AUD16_A14_SEVERITY_TRIAGE");
if (!severityRow) throw new Error("a22_severity_row_missing");
Object.assign(severityRow, {
  status: "DONE",
  doneEvidence: [
    "finding schema separates severity, confidence, evidence and limitations",
    "evidence-bound deterministic severity features and hard caps",
    "path-feasibility and critical-justification enforcement",
    "asset-at-risk and single-user to cross-protocol blast-radius classification",
    "evidence-bound attack-chain graph with cycle rejection",
    "two frozen scoring profiles with visible disagreement and uncertainty caps",
    "192-case frozen benchmark and 2304 mutation campaign",
    "zero false or unjustified Critical findings in the generated benchmark"
  ],
  missing: [],
  blocker: "NONE_LOCAL_FOR_DECLARED_BOUNDED_A14_TRIAGE_IMPLEMENTATION",
  nextAction: "Run the A22 triage receipt on blinded real findings, obtain at least two qualified independent adjudicators, measure agreement/confidence intervals and bind exploitability review to exact protocol evidence.",
  sellImpact: "Completes the declared local A14 triage implementation only; paid findings remain blocked by real analyzer receipts, real protocol corpus, qualified adjudication, staging, customer value and independent assurance."
});
const sc = { DONE: status.rows.filter((row) => row.status === "DONE").length, PARTIAL: status.rows.filter((row) => row.status === "PARTIAL").length, BLOCKED_EXTERNAL: status.rows.filter((row) => row.status === "BLOCKED_EXTERNAL").length, NOT_DONE: status.rows.filter((row) => row.status === "NOT_DONE").length };
const cw = Number((((sc.DONE + sc.PARTIAL * 0.5) / status.rows.length) * 100).toFixed(1));
const cs = Number(((sc.DONE / status.rows.length) * 100).toFixed(1));
if (status.rows.length !== 43 || sc.DONE !== 7 || sc.PARTIAL !== 27 || sc.BLOCKED_EXTERNAL !== 9 || sc.NOT_DONE !== 0 || cw !== 47.7 || cs !== 16.3) throw new Error(`a22_canonical_math:${JSON.stringify({ sc, cw, cs })}`);
status.zeroBudgetFunctionalTrack = { ...status.zeroBudgetFunctionalTrack, currentWeightedPlanningPercent: zw, coreDenominator: core.length, done: zc.DONE, partial: zc.PARTIAL, notDone: zc.NOT_DONE, a22SeverityTriagePolicyPath: policyPath, a22SeverityTriageContractPath: contractPath };
status.truthBoundary = `PASS35 A22 is the only canonical current status. Canonical roadmap is ${cw}% weighted / ${cs}% strict across 43 workstreams, up ${Number((cw - A21_CAN).toFixed(1))} pp from A21 and ${Number((cw - A16_CAN).toFixed(1))} pp from A16. Zero-budget functional core is ${zw}% across ${core.length} capabilities, up ${Number((zw - A21_ZERO).toFixed(1))} pp from A21 and ${Number((zw - A16_ZERO).toFixed(1))} pp from A16. A22 locally closes the declared bounded A14 severity, uncertainty, blast-radius and attack-chain implementation. Real findings, independent human raters, exploitability adjudication, official analyzer execution, staging, sale, LIVE, customer outcomes and independent assurance remain unclaimed.`;
writeJson(statusPath, status);

const auditProgram = readJson("config/pass35/audit-program.json");
auditProgram.sourceRevisionId = REV;
auditProgram.status = "A01_A12_A14_A16_LOCAL_EXECUTABLE_WITH_A21_BOUNDED_A06_AND_A22_BOUNDED_A14_REAL_EXTERNAL_PROOF_MISSING";
const control = auditProgram.controls.find((row) => row.id === "A14");
if (control) control.status = "IMPLEMENTED_LOCAL_EVIDENCE_BOUND_SEVERITY_ATTACK_CHAIN_BENCHMARKED_NOT_HUMAN_ADJUDICATED";
auditProgram.a22SeverityTriage = { policyPath, runtimePath, receiptPath, cases: benchmark.denominators.cases, frozen: benchmark.denominators.frozen, mutations: benchmark.denominators.mutations, raterProfiles: policy.raterProfiles.map((profile) => profile.id), paidGateEligible: false, independentHumanRatersClaimed: false, exploitabilityClaimAllowed: false };
auditProgram.truthBoundary = policy.truthBoundary;
writeJson("config/pass35/audit-program.json", auditProgram);

const envelope = readJson("config/pass35/audit-execution-envelope.json"); envelope.sourceRevisionId = REV;
const triageFamily = {
  familyId: "severity_triage_attack_chain",
  state: "IMPLEMENTED_LOCAL_EVIDENCE_BOUND_TRIAGE_BENCHMARKED_REAL_ADJUDICATION_MISSING",
  activePaths: ["lib/security/pass35-a22-severity-triage-runtime.mjs", "config/pass35/a22-severity-triage-policy.json", "scripts/pass35/test-a22-severity-triage.mjs"],
  executionClass: "local_evidence_bound_severity_and_attack_chain_not_human_adjudication",
  mayClaim: ["deterministic severity inputs and caps", "asset-at-risk and blast-radius classification", "evidence-bound attack-chain graph", "generated frozen benchmark for the declared local feature scope"],
  mayNotClaim: ["real exploitability adjudication", "independent human inter-rater agreement", "customer-grade severity calibration", "A14 paid gate passed"]
};
const triageIndex = envelope.capabilityInventory.findIndex((row) => row.familyId === triageFamily.familyId);
if (triageIndex >= 0) envelope.capabilityInventory[triageIndex] = triageFamily; else envelope.capabilityInventory.push(triageFamily);
writeJson("config/pass35/audit-execution-envelope.json", envelope);

const product = readJson("config/pass35/product-tier-content-contract.json"); product.sourceRevisionId = REV;
product.a22SeverityTriage = { policyPath, contractPath, requiredProFields: ["severity_score_and_caps", "exploitability_prerequisites", "blast_radius_and_asset_at_risk", "rater_disagreement_and_uncertainty"], requiredAdvancedFields: ["attack_chain_paths", "cross_finding_enablement_edges", "critical_justification_receipt", "severity_supersession_rules"], paidGateEligible: false, independentHumanRatersClaimed: false };
const auditSurface = product.surfaces.find((row) => row.surfaceId === "audit_evm");
for (const field of product.a22SeverityTriage.requiredProFields) if (!auditSurface.tiers.pro.requiredFields.includes(field)) auditSurface.tiers.pro.requiredFields.push(field);
for (const field of product.a22SeverityTriage.requiredAdvancedFields) if (!auditSurface.tiers.advanced.requiredFields.includes(field)) auditSurface.tiers.advanced.requiredFields.push(field);
writeJson("config/pass35/product-tier-content-contract.json", product);

const contract = {
  schemaVersion: "velmere.pass35.a22-severity-triage-runtime-contract.v1", passId: PASS, sourceRevisionId: REV,
  baselineA16: { canonical: A16_CAN, zeroBudget: A16_ZERO }, baselineA21: { canonical: A21_CAN, zeroBudget: A21_ZERO },
  progressDeltaVsA21: { canonicalPercentagePoints: Number((cw - A21_CAN).toFixed(1)), zeroBudgetPercentagePoints: Number((zw - A21_ZERO).toFixed(1)) },
  progressDeltaVsA16: { canonicalPercentagePoints: Number((cw - A16_CAN).toFixed(1)), zeroBudgetPercentagePoints: Number((zw - A16_ZERO).toFixed(1)) },
  canonicalWeightedPlanningPercent: cw, canonicalStrictDonePercent: cs, canonicalCounts: sc,
  zeroBudgetWeightedPlanningPercent: zw, zeroBudgetCoreDenominator: core.length, zeroBudgetCounts: zc,
  benchmark: { ...benchmark.denominators, frozen: benchmark.frozen, mutation: benchmark.mutation, runtimeIntegritySha256: benchmark.integritySha256, receiptSha256: receipt.receiptSha256 },
  raterProfiles: policy.raterProfiles.map((profile) => profile.id), hardCaps: policy.hardCaps,
  visualChangesMade: false, sellEnabled: false, chargeAllowed: false, paidDeliveryAllowed: false, liveClaimed: false,
  truthBoundary: status.truthBoundary
};
writeJson(contractPath, contract);

const current = readJson("config/current-release.json");
current.sourceRevisionId = REV; current.sourceRevisionStatus = "A22_EVIDENCE_BOUND_SEVERITY_TRIAGE_IMPLEMENTED_REAL_HUMAN_ADJUDICATION_UNCLAIMED"; current.truthBoundary = status.truthBoundary;
current.a22SeverityTriagePolicyPath = policyPath; current.a22SeverityTriageRuntimePath = runtimePath; current.a22SeverityTriageReceiptPath = receiptPath; current.a22SeverityTriageContractPath = contractPath; current.a22ProductRoadmapSummaryPath = summaryPath; current.a22BoardPath = boardPath;
writeJson("config/current-release.json", current);

for (const name of readdirSync("config/pass35")) {
  const p = path.join("config/pass35", name); if (statSync(p).isDirectory() || !name.endsWith(".json")) continue;
  try { const value = readJson(p); if (value && typeof value === "object" && "sourceRevisionId" in value) { value.sourceRevisionId = REV; writeJson(p, value); } } catch (ignoredError) { void ignoredError; }
}
for (const file of ["README.md", "CLEAN_SAFE_README.md"]) {
  if (!existsSync(file)) continue; let text = readFileSync(file, "utf8");
  if (file === "README.md") text = text.replace(/source revision `[^`]+`/u, `source revision \`${REV}\``);
  if (!text.includes("## PASS35 A22 local changes")) text += "\n\n## PASS35 A22 local changes\n\n- Added evidence-bound severity scoring with explicit path, impact, asset-at-risk, blast-radius, exposure, exploitability and persistence inputs.\n- Added hard severity/confidence caps for unknown paths, missing assets, single evidence families and analyzer conflicts.\n- Added evidence-bound attack-chain graphs with cycle rejection and three-step chain receipts.\n- Added two frozen scoring profiles with visible disagreement, weighted kappa and uncertainty handling.\n- Added a 192-case / 2304-mutation benchmark with zero false or unjustified Critical findings in the generated scope.\n- Marked AUD16/A14 DONE locally while keeping real findings, human adjudication, paid and LIVE gates closed.\n- Visual files remain unchanged.\n";
  writeFileSync(file, text);
}

const summary = { schemaVersion: "velmere.pass35.a22-product-roadmap-summary.v1", passId: PASS, sourceRevisionId: REV, globalDecision: status.globalDecision, sellEnabledCount: 0, canonicalWeightedPlanningPercent: cw, canonicalStrictDonePercent: cs, canonicalCounts: sc, zeroBudgetWeightedPlanningPercent: zw, zeroBudgetCoreDenominator: core.length, zeroBudgetCounts: zc, baselineA16: { canonical: A16_CAN, zeroBudget: A16_ZERO }, baselineA21: { canonical: A21_CAN, zeroBudget: A21_ZERO }, benchmark: contract.benchmark, visualChangesMade: false, truthBoundary: status.truthBoundary };
writeJson(summaryPath, summary);
writeFileSync(boardPath, ["# PASS35 A22 — Evidence-Bound Severity and Attack Chains", "", `- Source revision: \`${REV}\``, `- A16 start: **${A16_CAN}% canonical / ${A16_ZERO}% ZERO-BUDGET**`, `- A21 baseline: **${A21_CAN}% canonical / ${A21_ZERO}% ZERO-BUDGET**`, `- A22 current: **${cw}% canonical / ${cs}% strict / ${zw}% ZERO-BUDGET**`, `- Change vs A21: **+${(cw - A21_CAN).toFixed(1)} pp / +${(zw - A21_ZERO).toFixed(1)} pp**`, `- Benchmark: **${benchmark.denominators.cases} cases / ${benchmark.denominators.frozen} frozen / ${benchmark.mutation.killed}/${benchmark.mutation.total} mutations**`, `- Frozen severity accuracy: **${benchmark.frozen.severityAccuracy}**; suppression accuracy: **${benchmark.frozen.suppressionAccuracy}**; weighted kappa: **${benchmark.frozen.weightedKappa}**`, `- sellEnabled: **0**; decision: **NO_GO**; visual changes: **0**`, "", "## Truth boundary", "", status.truthBoundary, ""].join("\n"));

const rows = status.rows.map((row) => `${row.id} | ${row.status} | DONE: ${row.doneEvidence.join("; ")} | MISSING: ${row.missing.join("; ") || "—"} | BLOCKER: ${row.blocker} | NEXT: ${row.nextAction} | SELL: ${row.sellImpact}`);
const zrows = zero.capabilities.map((row) => `${row.id} | ${row.status} | ${row.resourceModel} | ${row.truth}`);
const old = readFileSync(roadmapPath, "utf8");
const historyIndex = old.indexOf("====================================================================================================\nPASS35 A21 —");
if (historyIndex < 0) throw new Error("a22_a21_history_missing");
let history = old.slice(historyIndex).replaceAll("PASS35 A21 is the only canonical current status.", "PASS35 A21 was canonical at that historical checkpoint and does not override A22.");
const roadmap = [
  "====================================================================================================",
  "PASS35 A22 — EVIDENCE-BOUND SEVERITY + ATTACK CHAINS + BLAST RADIUS (NON-VISUAL)",
  "====================================================================================================",
  "Data rewizji: 2026-07-23, Europe/Berlin", `Source revision ID: ${REV}`, `Decyzja globalna: ${status.globalDecision}`, "Stan sprzedaży: 0 sellEnabled",
  `A16 START: ${A16_CAN}% canonical / ${A16_ZERO}% ZERO-BUDGET`, `A21 BASELINE: ${A21_CAN}% canonical / ${A21_ZERO}% ZERO-BUDGET`,
  `A22 CURRENT: ${cw}% canonical weighted / ${cs}% strict; ${zw}% ZERO-BUDGET`,
  `ZMIANA VS A21: canonical +${(cw - A21_CAN).toFixed(1)} pp; ZERO-BUDGET +${(zw - A21_ZERO).toFixed(1)} pp`,
  `ŁĄCZNA ZMIANA VS A16: canonical +${(cw - A16_CAN).toFixed(1)} pp; ZERO-BUDGET +${(zw - A16_ZERO).toFixed(1)} pp`,
  "Product/tier specification: 100% (7 surfaces x 3 tiers = 21)", "Visual changes: 0; CODEX_FRONTEND_WORKSTREAM remains untouched", "",
  "A22 — EVIDENCE-BOUND A14 IMPLEMENTATION", "----------------------------------------------------------------------------------------------------",
  "- Severity is derived from explicit impact, asset-at-risk, blast radius, attacker exposure, exploitability, persistence, path feasibility and evidence families.",
  "- Unknown paths, missing asset binding, single-family evidence, conflicts and missing subject binding apply hard caps instead of allowing unsupported Critical findings.",
  "- Critical requires reachable path, high/systemic assets, protocol/cross-protocol blast, exact subject binding and at least two evidence families.",
  "- Attack-chain edges are evidence-bound, duplicate edges are normalized and cycles fail closed.",
  "- Two frozen profiles expose disagreement; they are not described as independent human raters.",
  `- Benchmark: ${benchmark.denominators.cases} cases / ${benchmark.denominators.frozen} frozen / ${benchmark.mutation.killed}/${benchmark.mutation.total} mutations.`,
  "- AUD16/A14 moves PARTIAL -> DONE for the declared local bounded implementation only.", "",
  "A22 — POSTĘP", "----------------------------------------------------------------------------------------------------",
  `- Canonical: A16 ${A16_CAN}% -> A21 ${A21_CAN}% -> A22 ${cw}%.`, `- ZERO-BUDGET: A16 ${A16_ZERO}% -> A21 ${A21_ZERO}% -> A22 ${zw}%.`,
  `- Canonical denominator 43: DONE ${sc.DONE}; PARTIAL ${sc.PARTIAL}; BLOCKED_EXTERNAL ${sc.BLOCKED_EXTERNAL}; NOT_DONE ${sc.NOT_DONE}.`,
  `- Zero-budget denominator ${core.length}: DONE ${zc.DONE}; PARTIAL ${zc.PARTIAL}; NOT_DONE ${zc.NOT_DONE}.`, "",
  "A22 — ZERO-BUDGET FUNCTIONAL CORE", "----------------------------------------------------------------------------------------------------", "ID | STATUS | RESOURCE MODEL | TRUTH", "----------------------------------------------------------------------------------------------------", ...zrows, "",
  "A22 — KANONICZNA TABELA 43 WORKSTREAMÓW", "----------------------------------------------------------------------------------------------------", ...rows, "",
  "A22 TRUTH BOUNDARY", "----------------------------------------------------------------------------------------------------", status.truthBoundary, "",
  "HISTORYCZNE PODSUMOWANIE A21 I WCZEŚNIEJSZYCH FAL", "----------------------------------------------------------------------------------------------------", "Everything below is historical implementation context and cannot override A22.", "", history.trimEnd(), ""
].join("\n");
writeFileSync(roadmapPath, roadmap);
const board = spawnSync(process.execPath, ["scripts/pass35/build-current-status-roadmap.mjs"], { encoding: "utf8" });
if (board.status !== 0) throw new Error(`a22_board_failed:${board.stderr || board.stdout}`);
console.log(JSON.stringify({ status: "PASS_A22_ROADMAP_BUILT", sourceRevisionId: REV, canonicalWeightedPlanningPercent: cw, canonicalStrictDonePercent: cs, zeroBudgetWeightedPlanningPercent: zw, deltaVsA21: contract.progressDeltaVsA21, deltaVsA16: contract.progressDeltaVsA16, cases: benchmark.denominators.cases, mutations: benchmark.denominators.mutations, sellEnabled: false }, null, 2));
