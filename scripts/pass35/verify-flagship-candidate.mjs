#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { canonicalJson } from "./source-inventory.mjs";
import { PASS35_CANDIDATE_ID } from "./release-manifest-set.mjs";

const root = process.cwd();
const readJson = (relativePath) => JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const blockers = [];
const check = (condition, code) => { if (!condition) blockers.push(code); };

const plan = readJson("config/pass35/flagship-candidate-plan.json");
const pre = readJson("config/pass35/pre-gates.json");
const catalog = readJson("config/pass35/product-cell-catalog.json");
const candidateCells = (catalog.productCells ?? []).filter((cell) => cell.engineeringFlagshipCandidate === true);
const cell = candidateCells[0];

check(plan.schemaVersion === "velmere.pass35.flagship-candidate-plan.v1", "flagship_plan_schema_invalid");
check(plan.candidateId === PASS35_CANDIDATE_ID, "flagship_plan_candidate_invalid");
check(plan.status === "ENGINEERING_CANDIDATE_FROZEN_NOT_FG00_APPROVED", "flagship_plan_status_invalid");
check(plan.fg00Approved === false && plan.selectedProductCellId === null, "flagship_plan_must_not_claim_fg00");
check(plan.sellEnabled === false && plan.chargeAllowed === false, "flagship_plan_stop_sell_invalid");
check(plan.engineeringCandidateProductCellId === "audit_evm_pro_automated_review", "flagship_plan_cell_invalid");
check(plan.commercialTruth?.customerFacingNameBeforeFullStack === "Automated Security Evidence Review", "flagship_plan_customer_name_invalid");
check(plan.commercialTruth?.fullAuditClaimAllowed === false && plan.commercialTruth?.humanReviewedClaimAllowed === false, "flagship_plan_claim_boundary_invalid");
check(plan.commercialTruth?.requiredUiState === "UNAVAILABLE_NOT_FOR_SALE", "flagship_plan_ui_state_invalid");
const pwgRows = Object.entries(plan.purchaseWorthinessGates ?? {});
check(pwgRows.length === 10, "flagship_plan_pwg_count_invalid");
check(pwgRows.every(([, gate]) => gate.status === "BLOCKED" || gate.status === "PARTIAL_LOCAL"), "flagship_plan_pwg_must_not_pass");
check((plan.auditMethodExit?.requiredControls ?? []).length === 12, "flagship_plan_a01_a12_invalid");
check(plan.auditMethodExit?.minimumRealCorpus?.contracts === 50
  && plan.auditMethodExit?.minimumRealCorpus?.historicalMaterialFindingsOrReplays === 50
  && plan.auditMethodExit?.minimumRealCorpus?.benignControls === 50
  && plan.auditMethodExit?.minimumRealCorpus?.remediationRetests === 50, "flagship_plan_corpus_invalid");
check(pre.preGates?.FG00?.status === "BLOCKED" && pre.preGates?.FG00?.selectedCell === null, "flagship_pregate_must_remain_blocked");
check(pre.preGates?.FG00?.technicalRecommendation?.productCellId === plan.engineeringCandidateProductCellId, "flagship_pregate_recommendation_mismatch");
check(pre.preGates?.FG00?.technicalRecommendation?.planPath === "config/pass35/flagship-candidate-plan.json", "flagship_pregate_plan_path_invalid");
check(candidateCells.length === 1, "flagship_catalog_candidate_count_invalid");
check(cell?.productCellId === plan.engineeringCandidateProductCellId, "flagship_catalog_cell_mismatch");
check(cell?.sellEnabled === false && cell?.readiness?.flagshipApproved === false, "flagship_catalog_stop_sell_invalid");
check(cell?.commercialTruth?.fullAuditClaimAllowed === false && cell?.commercialTruth?.requiredUiState === "UNAVAILABLE_NOT_FOR_SALE", "flagship_catalog_claim_boundary_invalid");
check((catalog.productCells ?? []).every((item) => item.sellEnabled === false), "flagship_catalog_any_sell_enabled");
check(catalog.catalogPolicy?.flagshipSelected === false
  && catalog.catalogPolicy?.engineeringFlagshipCandidateIsFg00Selection === false
  && catalog.catalogPolicy?.engineeringFlagshipCandidateMayAuthorizeCharge === false, "flagship_catalog_policy_invalid");

const core = {
  schemaVersion: "velmere.pass35.flagship-candidate-verification.v1",
  candidateId: PASS35_CANDIDATE_ID,
  status: blockers.length ? "FAIL_FLAGSHIP_CANDIDATE_CONTRACT" : "PASS_LOCAL_ENGINEERING_FLAGSHIP_CANDIDATE_NO_FG00_NO_SALE",
  promotionAllowed: false,
  sellEnabled: false,
  engineeringCandidateProductCellId: plan.engineeringCandidateProductCellId,
  checks: 22,
  blockers: [...new Set(blockers)].sort(),
  truthBoundary: "This verifies a single fail-closed engineering focus only. It is not signed FG00, demand proof, audit quality proof, staging, LIVE, customer evidence, or authorization to sell.",
};
const result = { ...core, receiptSha256: sha256(canonicalJson(core)) };
console.log(JSON.stringify(result, null, 2));
if (result.blockers.length) process.exitCode = 1;
