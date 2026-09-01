import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const DIGEST = /^(?:sha256:)?[a-f0-9]{64}$/i;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonical = (value) => JSON.stringify(value, Object.keys(value ?? {}).sort());

export function loadAuditExecutionPolicy(root = process.cwd()) {
  return JSON.parse(readFileSync(path.join(root, "config/pass35/audit-execution-envelope.json"), "utf8"));
}

export function validateAuditExecutionPolicy(policy, root = process.cwd()) {
  const blockers = [];
  const add = (ok, code) => { if (!ok) blockers.push(code); };
  add(policy?.schemaVersion === "velmere.pass35.audit-execution-envelope-policy.v1", "policy_schema_invalid");
  add(policy?.productCellId === "audit_evm_pro_automated_review", "policy_cell_invalid");
  add(policy?.fullAuditClaimAllowed === false && policy?.sellEnabled === false, "policy_stop_sell_invalid");
  add(policy?.fixtureOrSyntheticMaySatisfyExecution === false, "policy_fixture_credit_invalid");
  const inventory = policy?.capabilityInventory ?? [];
  add(inventory.length === 20, "policy_inventory_count_invalid");
  add(new Set(inventory.map((row) => row.familyId)).size === inventory.length, "policy_inventory_duplicate_family");
  for (const row of inventory) {
    for (const relative of row.activePaths ?? []) add(existsSync(path.join(root, relative)), `policy_active_path_missing:${row.familyId}:${relative}`);
    if (/^MISSING_/u.test(row.state)) add((row.activePaths ?? []).length === 0, `policy_missing_family_has_active_path:${row.familyId}`);
  }
  const missing = new Set(inventory.filter((row) => /^MISSING_/u.test(row.state)).map((row) => row.familyId));
  add(missing.size === 0, "policy_unexpected_missing_runner_family");
  for (const family of ["static_semantic_family_1", "static_semantic_family_2"]) {
    const row = inventory.find((candidate) => candidate.familyId === family);
    add(row?.state === "IMPLEMENTED_LOCAL_HEURISTIC_NOT_BENCHMARKED", `policy_local_static_state_invalid:${family}`);
    add((row?.activePaths ?? []).includes("lib/security/audit-a01-a05-engine.ts"), `policy_local_static_engine_missing:${family}`);
    add((row?.mayNotClaim ?? []).includes("A05 paid gate passed"), `policy_local_static_claim_boundary_missing:${family}`);
  }
  const slither = inventory.find((row) => row.familyId === "slither_external_static_family");
  add(slither?.state === "ADAPTER_IMPLEMENTED_FIXTURE_CONTRACT_PROVEN_REAL_TOOL_MISSING", "policy_slither_adapter_state_invalid");
  add((slither?.activePaths ?? []).includes("scripts/pass35/audit-slither-adapter.mjs"), "policy_slither_adapter_path_missing");
  add((slither?.mayNotClaim ?? []).includes("A05 paid gate passed"), "policy_slither_claim_boundary_missing");
  const semgrep = inventory.find((row) => row.familyId === "semgrep_external_static_family");
  add(semgrep?.state === "ADAPTER_IMPLEMENTED_FIXTURE_CONTRACT_PROVEN_REAL_TOOL_MISSING", "policy_semgrep_adapter_state_invalid");
  add((semgrep?.activePaths ?? []).includes("scripts/pass35/audit-semgrep-adapter.mjs"), "policy_semgrep_adapter_path_missing");
  add((semgrep?.mayNotClaim ?? []).includes("A05 paid gate passed"), "policy_semgrep_claim_boundary_missing");
  const a06 = inventory.find((row) => row.familyId === "symbolic_path_analysis");
  add(a06?.state === "IMPLEMENTED_LOCAL_BOUNDED_ABSTRACT_FEASIBILITY_BENCHMARKED", "policy_a06_state_invalid");
  add((a06?.activePaths ?? []).includes("lib/security/audit-a06-bounded-path-analysis.ts") && (a06?.activePaths ?? []).includes("lib/security/pass35-a21-abstract-path-runtime.mjs"), "policy_a06_engine_missing");
  add((a06?.mayNotClaim ?? []).includes("A06 paid gate passed"), "policy_a06_claim_boundary_missing");
  const a07 = inventory.find((row) => row.familyId === "exact_unit_integration_tests");
  add(a07?.state === "IMPLEMENTED_LOCAL_EXACT_TEST_EVIDENCE_BENCHMARKED_OFFICIAL_FORGE_MISSING", "policy_a07_state_invalid");
  add((a07?.activePaths ?? []).includes("scripts/pass35/audit-forge-adapter.mjs") && (a07?.activePaths ?? []).includes("lib/security/pass35-a25-exact-test-evidence-runtime.mjs"), "policy_a07_adapter_missing");
  add((a07?.mayNotClaim ?? []).includes("A07 paid gate passed"), "policy_a07_claim_boundary_missing");
  const a08 = inventory.find((row) => row.familyId === "property_fuzz_invariant");
  add(a08?.state === "IMPLEMENTED_LOCAL_FUZZ_INVARIANT_EVIDENCE_BENCHMARKED_OFFICIAL_ENGINES_MISSING", "policy_a08_state_invalid");
  add((a08?.activePaths ?? []).includes("lib/security/audit-a08-model-fuzz.ts"), "policy_a08_engine_missing");
  add((a08?.activePaths ?? []).includes("config/pass35/a08-foundry-invariant-plan.json"), "policy_a08_foundry_plan_missing");
  add((a08?.mayNotClaim ?? []).includes("A08 paid gate passed"), "policy_a08_claim_boundary_missing");
  const a09 = inventory.find((row) => row.familyId === "fork_replay_exact_state");
  add(a09?.state === "IMPLEMENTED_LOCAL_FORK_REPLAY_EVIDENCE_BENCHMARKED_NATIVE_FORK_REAL_PROVIDER_MISSING", "policy_a09_state_invalid");
  add((a09?.activePaths ?? []).includes("scripts/pass35/audit-fork-replay-adapter.mjs"), "policy_a09_adapter_missing");
  add((a09?.mayNotClaim ?? []).includes("A09 paid gate passed"), "policy_a09_claim_boundary_missing");

  const a10 = inventory.find((row) => row.familyId === "economic_adversarial_scenario_engine");
  add(a10?.state === "IMPLEMENTED_LOCAL_ECONOMIC_ADVERSARIAL_EVIDENCE_BENCHMARKED_REAL_DATA_REPLAY_REVIEW_MISSING", "policy_a10_state_invalid");
  add((a10?.activePaths ?? []).includes("scripts/pass35/audit-economic-adversarial-engine.mjs"), "policy_a10_engine_missing");
  add((a10?.mayNotClaim ?? []).includes("A10 paid gate passed"), "policy_a10_claim_boundary_missing");
  const a11 = inventory.find((row) => row.familyId === "upgrade_deployment_operations");
  add(a11?.state === "IMPLEMENTED_LOCAL_UPGRADE_DEPLOYMENT_OPERATIONS_EVIDENCE_BENCHMARKED_ONCHAIN_DRILL_REVIEW_MISSING", "policy_a11_state_invalid");
  add((a11?.activePaths ?? []).includes("lib/security/pass35-a29-upgrade-deployment-operations-runtime.mjs"), "policy_a11_engine_missing");
  add((a11?.mayNotClaim ?? []).includes("A11 paid gate passed"), "policy_a11_claim_boundary_missing");
  const a15 = inventory.find((row) => row.familyId === "remediation_retest_local_contract");
  add(a15?.state === "IMPLEMENTED_LOCAL_EVIDENCE_BOUND_CLOSURE_BENCHMARKED_REAL_SIGNED_CLOSURE_MISSING", "policy_a15_state_invalid");
  add((a15?.activePaths ?? []).includes("scripts/pass35/audit-remediation-retest-adapter.mjs"), "policy_a15_adapter_missing");
  add((a15?.mayNotClaim ?? []).includes("A15 paid gate passed"), "policy_a15_claim_boundary_missing");
  const a17 = inventory.find((row) => row.familyId === "post_audit_monitoring_handoff");
  add(a17?.state === "IMPLEMENTED_LOCAL_EVENT_INCIDENT_LIFECYCLE_BENCHMARKED_LIVE_PROVIDER_MISSING", "policy_a17_state_invalid");
  add((a17?.activePaths ?? []).includes("scripts/pass35/audit-monitoring-handoff-adapter.mjs") && (a17?.activePaths ?? []).includes("lib/security/pass35-a24-monitoring-lifecycle-runtime.mjs"), "policy_a17_adapter_missing");
  add((a17?.mayNotClaim ?? []).includes("A17 paid gate passed"), "policy_a17_claim_boundary_missing");
  const a14 = inventory.find((row) => row.familyId === "severity_triage_attack_chain");
  add(a14?.state === "IMPLEMENTED_LOCAL_EVIDENCE_BOUND_TRIAGE_BENCHMARKED_REAL_ADJUDICATION_MISSING", "policy_a14_state_invalid");
  add((a14?.activePaths ?? []).includes("lib/security/pass35-a22-severity-triage-runtime.mjs"), "policy_a14_engine_missing");
  add((a14?.activePaths ?? []).includes("config/pass35/a22-severity-triage-policy.json"), "policy_a14_policy_missing");
  add((a14?.mayNotClaim ?? []).includes("A14 paid gate passed"), "policy_a14_claim_boundary_missing");
  add(policy?.paidDeliveryGate?.noRealExecutionMeans === "UNAVAILABLE_NOT_FOR_SALE", "policy_delivery_boundary_invalid");
  add(policy?.paidDeliveryGate?.currentPaidDeliveryPossible === false, "policy_current_stop_sell_invalid");
  return [...new Set(blockers)].sort();
}

export function validateAuditCaseExecutionEnvelope(envelope, policy) {
  const blockers = [];
  const add = (ok, code) => { if (!ok) blockers.push(code); };
  add(envelope?.schemaVersion === "velmere.pass35.audit-case-execution-envelope.v1", "envelope_schema_invalid");
  add(envelope?.productCellId === policy?.productCellId, "envelope_product_cell_invalid");
  add(envelope?.tier === "pro", "envelope_tier_invalid");
  add(/^AUD-[A-Z0-9-]{8,40}$/u.test(String(envelope?.caseRef ?? "")), "envelope_case_ref_invalid");
  add(/^0x[a-f0-9]{40}$/iu.test(String(envelope?.contractAddress ?? "")), "envelope_contract_address_invalid");
  add(/^\d+$/u.test(String(envelope?.chainId ?? "")), "envelope_chain_id_invalid");
  add(ISO.test(String(envelope?.createdAt ?? "")), "envelope_created_at_invalid");
  for (const field of policy?.requiredInputBindings ?? []) add(DIGEST.test(String(envelope?.inputBindings?.[field] ?? "")), `envelope_input_digest_invalid:${field}`);
  const receipts = Array.isArray(envelope?.analyzerReceipts) ? envelope.analyzerReceipts : [];
  const byFamily = new Map(receipts.map((receipt) => [receipt.familyId, receipt]));
  for (const receipt of receipts) {
    for (const field of ["binaryOrImageSha256", "configurationSha256", "inputBundleSha256", "rawOutputSha256"]) add(DIGEST.test(String(receipt?.[field] ?? "")), `envelope_analyzer_digest_invalid:${receipt?.familyId}:${field}`);
    add(ISO.test(String(receipt?.startedAt ?? "")) && ISO.test(String(receipt?.completedAt ?? "")), `envelope_analyzer_time_invalid:${receipt?.familyId}`);
    add(Number.isInteger(receipt?.exitCode), `envelope_analyzer_exit_invalid:${receipt?.familyId}`);
    add(["VERIFIED", "FAILED", "BLOCKED", "NOT_APPLICABLE_SIGNED"].includes(receipt?.status), `envelope_analyzer_status_invalid:${receipt?.familyId}`);
    add(["LOCAL_CONTRACT", "LOCAL_HEURISTIC_NOT_BENCHMARKED", "PROVIDER_BOUND_REAL_CASE", "EXTERNAL_INDEPENDENT"].includes(receipt?.assuranceClass), `envelope_analyzer_assurance_invalid:${receipt?.familyId}`);
    add(typeof receipt?.realCaseExecution === "boolean", `envelope_analyzer_real_case_flag_invalid:${receipt?.familyId}`);
    add(typeof receipt?.paidGateEligible === "boolean", `envelope_analyzer_paid_gate_flag_invalid:${receipt?.familyId}`);
    if (receipt?.paidGateEligible === true) {
      add(receipt?.realCaseExecution === true, `envelope_paid_eligible_without_real_case:${receipt?.familyId}`);
      add(!String(receipt?.assuranceClass ?? "").startsWith("LOCAL_"), `envelope_local_assurance_cannot_be_paid_eligible:${receipt?.familyId}`);
    }
    add(Array.isArray(receipt?.limitations), `envelope_analyzer_limitations_invalid:${receipt?.familyId}`);
  }
  const requiredFamilies = policy?.capabilityInventory?.filter((row) => !/^MISSING_/u.test(row.state)).map((row) => row.familyId) ?? [];
  for (const family of requiredFamilies) add(byFamily.has(family), `envelope_required_receipt_missing:${family}`);
  const missingPolicyFamilies = policy?.capabilityInventory?.filter((row) => /^MISSING_/u.test(row.state)).map((row) => row.familyId) ?? [];
  for (const family of missingPolicyFamilies) add(!byFamily.has(family) || byFamily.get(family)?.status !== "VERIFIED", `envelope_missing_runner_cannot_verify:${family}`);
  const blockedPolicyFamilies = new Set((policy?.capabilityInventory ?? [])
    .filter((row) => /BLOCKED_EXTERNAL|NOT_CASE_BOUND|REAL_EXECUTION_BLOCKED|REAL_TOOL_MISSING|REAL_PROVIDER_MISSING|FIXTURE_CONTRACT_PROVEN|REAL_SIGNED_CLOSURE_MISSING/u.test(String(row.state)))
    .map((row) => row.familyId));
  for (const family of blockedPolicyFamilies) {
    add(byFamily.get(family)?.status !== "VERIFIED", `envelope_blocked_policy_family_cannot_verify:${family}`);
  }
  const allVerified = blockers.length === 0
    && receipts.length > 0
    && receipts.every((receipt) => (receipt.status === "VERIFIED" || receipt.status === "NOT_APPLICABLE_SIGNED") && receipt.realCaseExecution === true && receipt.paidGateEligible === true)
    && policy?.paidDeliveryGate?.currentPaidDeliveryPossible === true;
  add(envelope?.fullAuditClaimAllowed === false, "envelope_full_audit_claim_forbidden");
  add(envelope?.paidDeliveryAllowed === false || allVerified, "envelope_paid_delivery_without_verified_execution");
  add(envelope?.paidDeliveryAllowed === false || policy?.paidDeliveryGate?.currentPaidDeliveryPossible === true, "envelope_policy_stop_sell_active");
  if (envelope?.paidDeliveryAllowed === true) add(DIGEST.test(String(envelope?.finalPacketSha256 ?? "")), "envelope_final_packet_digest_invalid");
  return [...new Set(blockers)].sort();
}

export function buildAuditEnvelopeVerificationReceipt({ policy, envelope, blockers }) {
  const core = {
    schemaVersion: "velmere.pass35.audit-execution-envelope-verification.v1",
    candidateId: policy.candidateId,
    productCellId: policy.productCellId,
    status: blockers.length ? "FAIL_AUDIT_EXECUTION_ENVELOPE" : "PASS_AUDIT_EXECUTION_ENVELOPE_CONTRACT",
    promotionAllowed: false,
    sellEnabled: false,
    paidDeliveryAllowed: envelope?.paidDeliveryAllowed === true && blockers.length === 0,
    blockers: [...new Set(blockers)].sort(),
    truthBoundary: "A passing schema receipt proves only fail-closed binding and field integrity. It does not prove that missing analyzer families exist, that a real case was executed, or that the paid tier is ready to sell."
  };
  return { ...core, receiptSha256: sha256(canonical(core)) };
}
