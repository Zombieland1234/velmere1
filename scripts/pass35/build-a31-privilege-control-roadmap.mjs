#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { runA31Benchmark, verifyA31Benchmark, verifyA31Policy } from "../../lib/security/pass35-a31-privilege-control-runtime.mjs";

const PASS = "PASS35_A31";
const REV = "VELMERE_PASS35_A31_PRIVILEGE_AUTHORIZATION_EVIDENCE_NON_VISUAL";
const A16 = { canonical: 40.7, strict: 9.3, zeroBudget: 80.0 };
const A30 = { canonical: 57.0, strict: 34.9, zeroBudget: 91.3 };
const policyPath = "config/pass35/a31-privilege-control-policy.json";
const runtimePath = "artifacts/pass35/PASS35_A31_PRIVILEGE_CONTROL_BENCHMARK.json";
const receiptPath = "artifacts/pass35/PASS35_A31_PRIVILEGE_CONTROL_RECEIPT.json";
const contractPath = "config/pass35/a31-privilege-control-runtime-contract.json";
const summaryPath = "artifacts/release/PASS35_A31_PRODUCT_ROADMAP_SUMMARY.json";
const boardPath = "artifacts/release/PASS35_A31_PRIVILEGE_CONTROL.md";
const statusPath = "config/pass35/current-status-register.json";
const zeroPath = "config/pass35/zero-budget-functional-roadmap.json";
const roadmapPath = "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt";
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const write = (p, v) => { mkdirSync(path.dirname(p), { recursive: true }); writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`); };
const hash = (v) => `sha256:${createHash("sha256").update(typeof v === "string" || Buffer.isBuffer(v) ? v : JSON.stringify(v)).digest("hex")}`;

const policy = read(policyPath);
if (!verifyA31Policy(policy)) throw new Error("a31_policy_invalid");
const benchmark = runA31Benchmark(policy);
if (!verifyA31Benchmark(benchmark, policy)) throw new Error("a31_benchmark_invalid");
write(runtimePath, benchmark);
const receiptCore = {
  schemaVersion: "velmere.pass35.a31-privilege-control-receipt.v1",
  passId: PASS,
  sourceRevisionId: REV,
  status: "PASS_LOCAL_PRIVILEGE_CONTROL_NOT_ONCHAIN_NOT_HUMAN_REVIEWED_NOT_FOR_SALE",
  policyPath,
  policySha256: hash(readFileSync(policyPath)),
  runtimePath,
  runtimeIntegritySha256: benchmark.integritySha256,
  denominators: benchmark.denominators,
  frozen: benchmark.frozen,
  mutation: benchmark.mutation,
  caseTargetRoleStateBindingComplete: true,
  roleHolderSourceEvidenceComplete: true,
  selectorPermissionCoverageComplete: true,
  roleAdminGraphIntegrityComplete: true,
  proxyAdminAuthorityBindingComplete: true,
  multisigTimelockDelegationComplete: true,
  separationOfDutiesComplete: true,
  privilegeEscalationPathsComplete: true,
  revokeRenounceRecoveryControlsComplete: true,
  hiddenPrivilegedSurfaceDetectionComplete: true,
  deterministicPrivilegeReplayComplete: true,
  mutationScoreGateComplete: true,
  currentOnchainRoleStateProven: false,
  manualAuthorizationReviewed: false,
  allHiddenPrivilegesExcluded: false,
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
putCapability({ id: "ZB83_A04_ROLE_PRINCIPAL_SELECTOR_AUTHORIZATION_BINDINGS", status: "DONE", resourceModel: "Own work only", truth: "A31 binds one exact case to role definitions, current local principal evidence, role-holder receipts, privileged selectors, required permissions and critical authorization coverage. Duplicate roles, missing holder evidence, unknown critical selectors or denominator inflation fail closed." });
putCapability({ id: "ZB84_A04_ROLE_ADMIN_PROXY_DELEGATION_SOD_ESCALATION_CONTROLS", status: "DONE", resourceModel: "Own work only", truth: "A31 enforces an acyclic role-admin graph, proxy/admin authority evidence, multisig/timelock delegation without direct bypass, separation-of-duties rules, bounded escalation scenarios, revoke/renounce/emergency recovery and mapped hidden privileged surfaces." });
putCapability({ id: "ZB85_A04_PRIVILEGE_CONTROL_REPLAY_FROZEN_BENCHMARK", status: "DONE", resourceModel: "Own work only", truth: "A31 executes 192 generated privilege-control evidence cases across 12 families with a 72-case frozen split and 2304 fail-closed mutations. Generated evidence grants no current on-chain role, hidden-privilege completeness, manual reviewer, customer, independent or paid credit." });
const excluded = new Set(zero.zeroBudgetCoreExclusions);
const core = zero.capabilities.filter((row) => !excluded.has(row.id));
const zeroCounts = { DONE: core.filter((row) => row.status === "DONE").length, PARTIAL: core.filter((row) => row.status === "PARTIAL").length, NOT_DONE: core.filter((row) => row.status === "NOT_DONE").length };
const zeroWeighted = Number((((zeroCounts.DONE + zeroCounts.PARTIAL * 0.5) / core.length) * 100).toFixed(1));
if (core.length !== 83 || zeroCounts.DONE !== 70 || zeroCounts.PARTIAL !== 12 || zeroCounts.NOT_DONE !== 1 || zeroWeighted !== 91.6) throw new Error(`a31_zero_math:${JSON.stringify({ core: core.length, zeroCounts, zeroWeighted })}`);
zero.truthBoundary = `PASS35 A31 adds a locally complete privilege and authorization evidence contract for the declared bounded A04 scope. ZERO-BUDGET planning is ${zeroWeighted}% across ${core.length} capabilities. Current on-chain role holders, real proxy/admin slots, multisig/timelock custody, manual authorization review, hidden-business-logic completeness, staging, sale and customer outcomes remain outside this local claim.`;
write(zeroPath, zero);

const status = read(statusPath);
status.sourceRevisionId = REV;
status.evaluatedAt = "2026-07-23T19:15:00.000Z";
status.statusPrecedence = ["this register", "A31 roadmap current-status section", "machine-generated readiness dashboard", "A30 and earlier addenda as historical implementation notes only", "base roadmap as target requirements"];
const statusRow = status.rows.find((row) => row.id === "AUD04_A04_PRIVILEGE_CONTROL");
if (!statusRow) throw new Error("a31_status_row_missing");
Object.assign(statusRow, {
  status: "DONE",
  doneEvidence: [
    "case-bound exact chain/block/source/runtime/deployment/A29/A30/role-state bindings",
    "role definitions and principal identity/current-state evidence with holder receipts",
    "complete privileged selector to required-role and authorization coverage",
    "acyclic role-admin graph with explicit default-admin control",
    "proxy implementation/admin authority and upgrade-role binding",
    "multisig/timelock delegation with direct-bypass prohibition",
    "separation-of-duties rules and runtime conflict evaluation",
    "bounded privilege-escalation paths with prerequisites and mitigations",
    "grant/revoke/renounce/emergency-revoke/admin-recovery lifecycle evidence",
    "hidden delegatecall/arbitrary-call/assembly/fallback privileged surface mapping",
    "deterministic local privilege replay and coverage denominators",
    "192-case frozen benchmark and 2304 mutation campaign"
  ],
  missing: [],
  blocker: "NONE_LOCAL_FOR_DECLARED_BOUNDED_A04_PRIVILEGE_AUTHORIZATION_EVIDENCE_IMPLEMENTATION",
  nextAction: "Execute the A31 contract against current rights-approved on-chain role holders, proxy/admin slots, real multisig/timelock state and operational custody; then obtain qualified manual authorization-path and hidden-business-logic review plus an independent rerun.",
  sellImpact: "Completes the declared local A04 evidence-integrity implementation only; Audit Pro/Advanced remain blocked by real chain state, manual review and external gates."
});
const statusCounts = { DONE: status.rows.filter((row) => row.status === "DONE").length, PARTIAL: status.rows.filter((row) => row.status === "PARTIAL").length, BLOCKED_EXTERNAL: status.rows.filter((row) => row.status === "BLOCKED_EXTERNAL").length, NOT_DONE: status.rows.filter((row) => row.status === "NOT_DONE").length };
const canonicalWeighted = Number((((statusCounts.DONE + statusCounts.PARTIAL * 0.5) / status.rows.length) * 100).toFixed(1));
const canonicalStrict = Number(((statusCounts.DONE / status.rows.length) * 100).toFixed(1));
if (status.rows.length !== 43 || statusCounts.DONE !== 16 || statusCounts.PARTIAL !== 18 || statusCounts.BLOCKED_EXTERNAL !== 9 || statusCounts.NOT_DONE !== 0 || canonicalWeighted !== 58.1 || canonicalStrict !== 37.2) throw new Error(`a31_canonical_math:${JSON.stringify({ statusCounts, canonicalWeighted, canonicalStrict })}`);
status.zeroBudgetFunctionalTrack = { ...status.zeroBudgetFunctionalTrack, currentWeightedPlanningPercent: zeroWeighted, coreDenominator: core.length, done: zeroCounts.DONE, partial: zeroCounts.PARTIAL, notDone: zeroCounts.NOT_DONE, a31PrivilegeControlPolicyPath: policyPath, a31PrivilegeControlContractPath: contractPath };
status.truthBoundary = `PASS35 A31 is the only canonical current status. Canonical roadmap is ${canonicalWeighted}% weighted / ${canonicalStrict}% strict across 43 workstreams, up ${(canonicalWeighted - A30.canonical).toFixed(1)} pp weighted and ${(canonicalStrict - A30.strict).toFixed(1)} pp strict from A30, and ${(canonicalWeighted - A16.canonical).toFixed(1)} pp weighted from A16. Zero-budget functional core is ${zeroWeighted}% across ${core.length} capabilities, up ${(zeroWeighted - A30.zeroBudget).toFixed(1)} pp from A30 and ${(zeroWeighted - A16.zeroBudget).toFixed(1)} pp from A16. A31 locally closes the declared bounded A04 role/principal, selector-permission, role-admin, proxy authority, multisig/timelock delegation, separation-of-duties, escalation, privilege lifecycle, hidden-surface, replay and mutation-evidence implementation. Current on-chain role state, manual authorization review, hidden-business-logic completeness, staging, sale, outcomes and independent assurance remain unclaimed.`;
write(statusPath, status);

const a01 = read("config/pass35/audit-a01-a05-policy.json");
a01.sourceRevisionId = REV;
a01.controls.A04 = { implementation: "case-bound privilege and authorization evidence with role/principal state, selector-permission, role-admin, proxy authority, multisig/timelock delegation, separation-of-duties, escalation, lifecycle, hidden-surface, replay and mutation controls", localState: "IMPLEMENTED_LOCAL_CASE_BOUND_PRIVILEGE_AUTHORIZATION_EVIDENCE_BENCHMARKED_ONCHAIN_REVIEW_MISSING", paidGateEligible: false, missingForExit: ["rights-approved current on-chain role holders", "real proxy/admin slots and operational multisig/timelock state", "qualified manual authorization-path and hidden-business-logic review", "independent rerun"] };
write("config/pass35/audit-a01-a05-policy.json", a01);

const audit = read("config/pass35/audit-program.json");
audit.sourceRevisionId = REV;
const a04 = audit.controls.find((control) => control.id === "A04");
if (a04) a04.status = "IMPLEMENTED_LOCAL_CASE_BOUND_PRIVILEGE_AUTHORIZATION_EVIDENCE_BENCHMARKED_ONCHAIN_REVIEW_MISSING";
audit.a31PrivilegeControl = { policyPath, runtimePath, receiptPath, cases: benchmark.denominators.cases, frozen: benchmark.denominators.frozen, mutations: benchmark.denominators.mutations, currentOnchainRoleStateProven: false, manualAuthorizationReviewed: false, allHiddenPrivilegesExcluded: false, independentRerun: false, paidGateEligible: false };
audit.truthBoundary = policy.truthBoundary;
write("config/pass35/audit-program.json", audit);

const a8 = read("config/pass35/audit-a8-execution-policy.json");
a8.sourceRevisionId = REV;
a8.controls.A04_PRIVILEGE_CONTROL = { evidenceRuntimePath: "lib/security/pass35-a31-privilege-control-runtime.mjs", evidencePolicyPath: policyPath, evidenceContractPath: contractPath, evidenceTestPath: "scripts/pass35/test-a31-privilege-control.mjs", controlFamilies: 12, benchmarkCases: benchmark.denominators.cases, benchmarkMutations: benchmark.denominators.mutations, localEvidenceContractComplete: true, realExecutionCredit: false, paidGateEligible: false };
a8.truthBoundary = policy.truthBoundary;
write("config/pass35/audit-a8-execution-policy.json", a8);

const envelope = read("config/pass35/audit-execution-envelope.json");
envelope.sourceRevisionId = REV;
let family = envelope.capabilityInventory.find((item) => item.familyId === "permission_control_parser");
if (!family) throw new Error("a31_envelope_family_missing");
family.state = "IMPLEMENTED_LOCAL_CASE_BOUND_PRIVILEGE_AUTHORIZATION_EVIDENCE_BENCHMARKED_ONCHAIN_REVIEW_MISSING";
family.activePaths = [...new Set([...(family.activePaths ?? []), "lib/security/pass35-a31-privilege-control-runtime.mjs", policyPath, contractPath, "scripts/pass35/test-a31-privilege-control.mjs"] )];
family.executionClass = "local_privilege_authorization_evidence_not_current_onchain_or_human_reviewed";
family.mayClaim = ["case-bound role/principal and role-holder evidence", "selector-permission and critical authorization coverage", "role-admin/proxy/delegation/separation-of-duties controls", "bounded escalation/lifecycle/hidden-surface/replay and generated mutation benchmark"];
family.mayNotClaim = ["current on-chain role holders proven", "all hidden privileges excluded", "manual authorization and business logic reviewed", "independent chain-state verification", "A04 paid gate passed"];
write("config/pass35/audit-execution-envelope.json", envelope);

const product = read("config/pass35/product-tier-content-contract.json");
product.sourceRevisionId = REV;
const proFields = ["privilege_case_role_state_binding", "privilege_role_principal_holder_registry", "privilege_selector_permission_coverage", "privilege_role_admin_graph", "privilege_proxy_admin_authority_binding", "privilege_multisig_timelock_delegation", "privilege_separation_of_duties", "privilege_escalation_and_lifecycle_controls"];
const advancedFields = ["full_privilege_control_evidence_index", "privilege_hidden_surface_registry", "privilege_escalation_path_receipts", "privilege_conflicts_and_limitations", "privilege_invalidation_triggers", "privilege_no_current_onchain_no_manual_review_claim_boundary"];
product.a31PrivilegeControl = { policyPath, runtimePath, receiptPath, requiredProFields: proFields, requiredAdvancedFields: advancedFields, currentOnchainRoleStateProven: false, manualAuthorizationReviewed: false, paidGateEligible: false };
const auditSurface = product.surfaces.find((surface) => surface.surfaceId === "audit_evm");
for (const field of proFields) if (!auditSurface.tiers.pro.requiredFields.includes(field)) auditSurface.tiers.pro.requiredFields.push(field);
for (const field of [...proFields, ...advancedFields]) if (!auditSurface.tiers.advanced.requiredFields.includes(field)) auditSurface.tiers.advanced.requiredFields.push(field);
write("config/pass35/product-tier-content-contract.json", product);

const contract = {
  schemaVersion: "velmere.pass35.a31-privilege-control-runtime-contract.v1", passId: PASS, sourceRevisionId: REV,
  baselineA16: A16, baselineA30: A30,
  progressDeltaVsA30: { canonicalPercentagePoints: Number((canonicalWeighted - A30.canonical).toFixed(1)), strictPercentagePoints: Number((canonicalStrict - A30.strict).toFixed(1)), zeroBudgetPercentagePoints: Number((zeroWeighted - A30.zeroBudget).toFixed(1)) },
  progressDeltaVsA16: { canonicalPercentagePoints: Number((canonicalWeighted - A16.canonical).toFixed(1)), strictPercentagePoints: Number((canonicalStrict - A16.strict).toFixed(1)), zeroBudgetPercentagePoints: Number((zeroWeighted - A16.zeroBudget).toFixed(1)) },
  canonicalWeightedPlanningPercent: canonicalWeighted, canonicalStrictDonePercent: canonicalStrict, canonicalCounts: statusCounts,
  zeroBudgetWeightedPlanningPercent: zeroWeighted, zeroBudgetCoreDenominator: core.length, zeroBudgetCounts: zeroCounts,
  benchmark: { ...benchmark.denominators, frozen: benchmark.frozen, mutation: benchmark.mutation, runtimeIntegritySha256: benchmark.integritySha256, receiptSha256: receipt.receiptSha256 },
  visualChangesMade: false, sellEnabled: false, chargeAllowed: false, paidDeliveryAllowed: false,
  currentOnchainRoleStateProven: false, manualAuthorizationReviewed: false, allHiddenPrivilegesExcluded: false, independentRerun: false,
  truthBoundary: status.truthBoundary
};
write(contractPath, contract);

const current = read("config/current-release.json");
current.sourceRevisionId = REV;
current.sourceRevisionStatus = "A31_PRIVILEGE_CONTROL_IMPLEMENTED_ONCHAIN_AND_HUMAN_REVIEW_UNCLAIMED";
current.truthBoundary = status.truthBoundary;
current.a31PrivilegeControlPolicyPath = policyPath;
current.a31PrivilegeControlRuntimePath = runtimePath;
current.a31PrivilegeControlReceiptPath = receiptPath;
current.a31PrivilegeControlContractPath = contractPath;
current.a31ProductRoadmapSummaryPath = summaryPath;
current.a31BoardPath = boardPath;
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
  if (!text.includes("## PASS35 A31 local changes")) text += "\n\n## PASS35 A31 local changes\n\n- Added case-bound A04 privilege and authorization evidence covering roles/principals, holder state, selector permissions, role-admin graph, proxy authority, multisig/timelock delegation, separation of duties, escalation paths, role lifecycle, hidden privileged surfaces and deterministic replay.\n- Added a 192-case / 2304-mutation frozen privilege-control benchmark.\n- Marked AUD04/A04 DONE locally for the declared bounded evidence-contract scope only.\n- Current on-chain role state, hidden-business-logic completeness, manual authorization review and paid readiness remain unclaimed.\n- Visual files remain unchanged.\n";
  writeFileSync(file, text);
}

const summary = { schemaVersion: "velmere.pass35.a31-product-roadmap-summary.v1", passId: PASS, sourceRevisionId: REV, globalDecision: status.globalDecision, sellEnabledCount: 0, canonicalWeightedPlanningPercent: canonicalWeighted, canonicalStrictDonePercent: canonicalStrict, canonicalCounts: statusCounts, zeroBudgetWeightedPlanningPercent: zeroWeighted, zeroBudgetCoreDenominator: core.length, zeroBudgetCounts: zeroCounts, baselineA16: A16, baselineA30: A30, benchmark: contract.benchmark, visualChangesMade: false, truthBoundary: status.truthBoundary };
write(summaryPath, summary);
writeFileSync(boardPath, ["# PASS35 A31 — Privilege & Authorization Control Evidence", "", `- Source revision: \`${REV}\``, `- A16 start: **${A16.canonical}% canonical / ${A16.strict}% strict / ${A16.zeroBudget}% ZERO-BUDGET**`, `- A30 baseline: **${A30.canonical}% canonical / ${A30.strict}% strict / ${A30.zeroBudget}% ZERO-BUDGET**`, `- A31 current: **${canonicalWeighted}% canonical / ${canonicalStrict}% strict / ${zeroWeighted}% ZERO-BUDGET**`, `- Change vs A30: **+${(canonicalWeighted - A30.canonical).toFixed(1)} pp canonical / +${(canonicalStrict - A30.strict).toFixed(1)} pp strict / +${(zeroWeighted - A30.zeroBudget).toFixed(1)} pp ZERO-BUDGET**`, `- Benchmark: **${benchmark.denominators.cases} cases / ${benchmark.denominators.frozen} frozen / ${benchmark.mutation.killed}/${benchmark.mutation.total} mutations**`, "- sellEnabled: **0**; decision: **NO_GO**; visual changes: **0**", "", "## Truth boundary", "", status.truthBoundary, ""].join("\n"));

const rows = status.rows.map((row) => `${row.id} | ${row.status} | DONE: ${row.doneEvidence.join("; ")} | MISSING: ${row.missing.join("; ") || "—"} | BLOCKER: ${row.blocker} | NEXT: ${row.nextAction} | SELL: ${row.sellImpact}`);
const zeroRows = zero.capabilities.map((row) => `${row.id} | ${row.status} | ${row.resourceModel} | ${row.truth}`);
const oldRoadmap = readFileSync(roadmapPath, "utf8");
const history = oldRoadmap.replaceAll("PASS35 A30 is the only canonical current status.", "PASS35 A30 was canonical at that historical checkpoint and does not override A31.");
const roadmap = [
  "====================================================================================================", "PASS35 A31 — PRIVILEGE & AUTHORIZATION CONTROL EVIDENCE (NON-VISUAL)", "====================================================================================================",
  "Data rewizji: 2026-07-23, Europe/Berlin", `Source revision ID: ${REV}`, `Decyzja globalna: ${status.globalDecision}`, "Stan sprzedaży: 0 sellEnabled",
  `A16 START: ${A16.canonical}% canonical / ${A16.strict}% strict / ${A16.zeroBudget}% ZERO-BUDGET`,
  `A30 BASELINE: ${A30.canonical}% canonical / ${A30.strict}% strict / ${A30.zeroBudget}% ZERO-BUDGET`,
  `A31 CURRENT: ${canonicalWeighted}% canonical weighted / ${canonicalStrict}% strict; ${zeroWeighted}% ZERO-BUDGET`,
  `ZMIANA VS A30: canonical +${(canonicalWeighted - A30.canonical).toFixed(1)} pp; strict +${(canonicalStrict - A30.strict).toFixed(1)} pp; ZERO-BUDGET +${(zeroWeighted - A30.zeroBudget).toFixed(1)} pp`,
  `ŁĄCZNA ZMIANA VS A16: canonical +${(canonicalWeighted - A16.canonical).toFixed(1)} pp; strict +${(canonicalStrict - A16.strict).toFixed(1)} pp; ZERO-BUDGET +${(zeroWeighted - A16.zeroBudget).toFixed(1)} pp`,
  "Product/tier specification: 100% (7 surfaces x 3 tiers = 21)", "Visual changes: 0; CODEX_FRONTEND_WORKSTREAM remains untouched", "",
  "A31 — LOCAL A04 PRIVILEGE & AUTHORIZATION CONTROL EVIDENCE", "----------------------------------------------------------------------------------------------------",
  "- Exact case and role-state receipts bind principals, roles, holder evidence, selectors, required permissions and critical authorization coverage.",
  "- Role-admin graph, proxy/admin authority, multisig/timelock delegation and separation-of-duties controls are fail-closed.",
  "- Escalation scenarios, grant/revoke/renounce/emergency recovery and hidden privileged surfaces require evidence and deterministic replay.",
  `- Benchmark: ${benchmark.denominators.cases} cases / ${benchmark.denominators.frozen} frozen / ${benchmark.mutation.killed}/${benchmark.mutation.total} mutations.`,
  "- AUD04/A04 moves PARTIAL -> DONE for the declared bounded local evidence-contract implementation only.", "",
  "A31 — POSTĘP", "----------------------------------------------------------------------------------------------------",
  `- Canonical: A16 ${A16.canonical}% -> A30 ${A30.canonical}% -> A31 ${canonicalWeighted}%.`,
  `- Strict: A16 ${A16.strict}% -> A30 ${A30.strict}% -> A31 ${canonicalStrict}%.`,
  `- ZERO-BUDGET: A16 ${A16.zeroBudget}% -> A30 ${A30.zeroBudget}% -> A31 ${zeroWeighted}%.`,
  `- Canonical denominator 43: DONE ${statusCounts.DONE}; PARTIAL ${statusCounts.PARTIAL}; BLOCKED_EXTERNAL ${statusCounts.BLOCKED_EXTERNAL}; NOT_DONE ${statusCounts.NOT_DONE}.`,
  `- Zero-budget denominator ${core.length}: DONE ${zeroCounts.DONE}; PARTIAL ${zeroCounts.PARTIAL}; NOT_DONE ${zeroCounts.NOT_DONE}.`, "",
  "A31 — ZERO-BUDGET FUNCTIONAL CORE", "----------------------------------------------------------------------------------------------------", "ID | STATUS | RESOURCE MODEL | TRUTH", "----------------------------------------------------------------------------------------------------", ...zeroRows, "",
  "A31 — KANONICZNA TABELA 43 WORKSTREAMÓW", "----------------------------------------------------------------------------------------------------", ...rows, "",
  "A31 TRUTH BOUNDARY", "----------------------------------------------------------------------------------------------------", status.truthBoundary, "",
  "HISTORYCZNE PODSUMOWANIE A30 I WCZEŚNIEJSZYCH FAL", "----------------------------------------------------------------------------------------------------", "Everything below is historical implementation context and cannot override A31.", "", history.trimEnd(), ""
].join("\n");
writeFileSync(roadmapPath, roadmap);
const boardResult = spawnSync(process.execPath, ["scripts/pass35/build-current-status-roadmap.mjs"], { encoding: "utf8" });
if (boardResult.status !== 0) throw new Error(`a31_board_failed:${boardResult.stderr || boardResult.stdout}`);
console.log(JSON.stringify({ status: "PASS_A31_ROADMAP_BUILT", sourceRevisionId: REV, canonicalWeightedPlanningPercent: canonicalWeighted, canonicalStrictDonePercent: canonicalStrict, zeroBudgetWeightedPlanningPercent: zeroWeighted, deltaVsA30: contract.progressDeltaVsA30, deltaVsA16: contract.progressDeltaVsA16, cases: benchmark.denominators.cases, mutations: benchmark.denominators.mutations, sellEnabled: false }, null, 2));
