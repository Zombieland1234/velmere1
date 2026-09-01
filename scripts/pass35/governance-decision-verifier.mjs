#!/usr/bin/env node
import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HEX_256 = /^[a-f0-9]{64}$/;
const ID_HASH = /^[a-f0-9]{64}$/;
const ALLOWED_CELL_ROLES = new Set(["REQUIRED", "EXPERIMENT", "PARKED", "REMOVE"]);

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositive(value) {
  return Number.isFinite(value) && value > 0;
}

function parseInstant(value) {
  if (!isNonEmpty(value)) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function add(errors, condition, code) {
  if (!condition) errors.push(code);
}

function uniqueNonEmptyStrings(value) {
  return Array.isArray(value) && value.length > 0 && value.every(isNonEmpty) && new Set(value).size === value.length;
}

function validateCommon(packet, policy, nowMs, errors) {
  add(errors, isRecord(packet), "packet_not_object");
  if (!isRecord(packet)) return;
  add(errors, packet.schemaVersion === "velmere.pass35.governance-decision-packet.v1", "schema_version_invalid");
  add(errors, packet.candidateId === policy.candidateId, "candidate_id_mismatch");
  add(errors, packet.gateId === "FG00" || packet.gateId === "ORG00", "gate_id_invalid");
  add(errors, isNonEmpty(packet.decisionId), "decision_id_missing");
  add(errors, HEX_256.test(packet.sourceArchiveSha256 ?? ""), "source_archive_sha256_invalid");
  add(errors, HEX_256.test(packet.evidenceIndexSha256 ?? ""), "evidence_index_sha256_invalid");

  const issuedAt = parseInstant(packet.issuedAt);
  const validUntil = parseInstant(packet.validUntil);
  add(errors, issuedAt !== null, "issued_at_invalid");
  add(errors, validUntil !== null, "valid_until_invalid");
  if (issuedAt !== null && validUntil !== null) {
    add(errors, issuedAt <= nowMs + policy.maxFutureSkewSeconds * 1000, "issued_at_in_future");
    add(errors, validUntil >= nowMs, "packet_expired");
    add(errors, validUntil > issuedAt, "validity_window_invalid");
    add(errors, validUntil - issuedAt <= policy.maxPacketAgeSeconds * 1000, "validity_window_too_long");
  }

  const signer = packet.signer;
  add(errors, isRecord(signer), "signer_missing");
  if (isRecord(signer)) {
    add(errors, isNonEmpty(signer.organizationId), "organization_id_missing");
    add(errors, ID_HASH.test(signer.signerIdHash ?? ""), "signer_id_hash_invalid");
    add(errors, isNonEmpty(signer.publicKeyPem), "signer_public_key_missing");
    add(errors, HEX_256.test(signer.publicKeyFingerprintSha256 ?? ""), "public_key_fingerprint_invalid");
    if (isNonEmpty(signer.publicKeyPem)) {
      try {
        const key = createPublicKey(signer.publicKeyPem);
        const fingerprint = sha256(key.export({ type: "spki", format: "der" }));
        add(errors, fingerprint === signer.publicKeyFingerprintSha256, "public_key_fingerprint_mismatch");
        add(errors, policy.trustedOrganizationalKeyFingerprints.includes(fingerprint), "organizational_trust_anchor_missing");
      } catch {
        errors.push("signer_public_key_invalid");
      }
    }
  }

  const signature = packet.signature;
  add(errors, isRecord(signature), "signature_missing");
  if (isRecord(signature)) {
    add(errors, signature.algorithm === policy.requiredSignatureAlgorithm, "signature_algorithm_invalid");
    add(errors, HEX_256.test(signature.payloadSha256 ?? ""), "signature_payload_sha256_invalid");
    add(errors, isNonEmpty(signature.valueBase64), "signature_value_missing");
    const { signature: _ignored, ...unsignedPacket } = packet;
    const payload = Buffer.from(canonicalJson(unsignedPacket));
    add(errors, sha256(payload) === signature.payloadSha256, "signature_payload_sha256_mismatch");
    if (isRecord(signer) && isNonEmpty(signer.publicKeyPem) && isNonEmpty(signature.valueBase64)) {
      try {
        const valid = verifySignature(null, payload, signer.publicKeyPem, Buffer.from(signature.valueBase64, "base64"));
        add(errors, valid, "signature_invalid");
      } catch {
        errors.push("signature_verification_error");
      }
    }
  }
}

function validateFg00(packet, policy, catalogProductCellIds, errors) {
  add(errors, packet.decision === "SELECT_FLAGSHIP", "fg00_decision_invalid");
  add(errors, policy.allowedFlagshipProductCellIds.includes(packet.productCellId), "fg00_product_cell_not_allowed");

  const scope = packet.scope;
  add(errors, isRecord(scope), "fg00_scope_missing");
  if (isRecord(scope)) {
    for (const field of ["icp", "jtbd", "region", "language", "channel"]) {
      add(errors, isNonEmpty(scope[field]), `fg00_scope_${field}_missing`);
    }
  }

  const workflow = packet.workflowEvidence;
  add(errors, isRecord(workflow), "fg00_workflow_evidence_missing");
  if (isRecord(workflow)) {
    add(errors, workflow.observedCurrentWorkflow === true, "fg00_current_workflow_not_observed");
    add(errors, Number.isInteger(workflow.independentParticipantCount) && workflow.independentParticipantCount >= 2, "fg00_independent_participants_insufficient");
    add(errors, workflow.costOfProblemDocumented === true, "fg00_problem_cost_missing");
    add(errors, HEX_256.test(workflow.evidenceSha256 ?? ""), "fg00_workflow_evidence_sha256_invalid");
  }

  const pilot = packet.pilot;
  add(errors, isRecord(pilot), "fg00_pilot_missing");
  if (isRecord(pilot)) {
    add(errors, pilot.preregistered === true, "fg00_pilot_not_preregistered");
    add(errors, HEX_256.test(pilot.protocolSha256 ?? ""), "fg00_pilot_protocol_sha256_invalid");
    add(errors, isRecord(pilot.paidIntentThreshold), "fg00_paid_intent_threshold_missing");
    if (isRecord(pilot.paidIntentThreshold)) {
      add(errors, /^[A-Z]{3}$/.test(pilot.paidIntentThreshold.currency ?? ""), "fg00_paid_intent_currency_invalid");
      add(errors, Number.isInteger(pilot.paidIntentThreshold.amountMinor) && pilot.paidIntentThreshold.amountMinor > 0, "fg00_paid_intent_amount_invalid");
      add(errors, Number.isInteger(pilot.paidIntentThreshold.minimumQualifiedIntents) && pilot.paidIntentThreshold.minimumQualifiedIntents > 0, "fg00_paid_intent_count_invalid");
    }
  }

  const outcome = packet.primaryOutcome;
  add(errors, isRecord(outcome), "fg00_primary_outcome_missing");
  if (isRecord(outcome)) {
    add(errors, isNonEmpty(outcome.metricId), "fg00_outcome_metric_missing");
    add(errors, ["HIGHER_IS_BETTER", "LOWER_IS_BETTER"].includes(outcome.direction), "fg00_outcome_direction_invalid");
    add(errors, Number.isFinite(outcome.threshold), "fg00_outcome_threshold_invalid");
    add(errors, HEX_256.test(outcome.evidencePlanSha256 ?? ""), "fg00_outcome_plan_sha256_invalid");
  }

  const rule = packet.decisionRule;
  add(errors, isRecord(rule), "fg00_decision_rule_missing");
  if (isRecord(rule)) {
    add(errors, ["CONTINUE", "PIVOT", "KILL"].includes(rule.current), "fg00_current_decision_invalid");
    for (const field of ["continueCriteria", "pivotCriteria", "killCriteria"]) {
      add(errors, uniqueNonEmptyStrings(rule[field]), `fg00_${field}_missing`);
    }
  }

  const execution = packet.execution;
  add(errors, isRecord(execution), "fg00_execution_missing");
  if (isRecord(execution)) {
    add(errors, ID_HASH.test(execution.ownerIdHash ?? ""), "fg00_owner_invalid");
    add(errors, isRecord(execution.budget), "fg00_budget_missing");
    if (isRecord(execution.budget)) {
      add(errors, /^[A-Z]{3}$/.test(execution.budget.currency ?? ""), "fg00_budget_currency_invalid");
      add(errors, Number.isInteger(execution.budget.amountMinor) && execution.budget.amountMinor > 0, "fg00_budget_amount_invalid");
    }
    add(errors, Number.isInteger(execution.runwayDays) && execution.runwayDays > 0, "fg00_runway_invalid");
    add(errors, isPositive(execution.capacityHoursPerWeek), "fg00_capacity_invalid");
  }

  const roles = packet.nonSelectedCells;
  add(errors, Array.isArray(roles), "fg00_non_selected_cells_missing");
  if (Array.isArray(roles)) {
    const expected = new Set(catalogProductCellIds.filter((id) => id !== packet.productCellId));
    const seen = new Set();
    for (const row of roles) {
      if (!isRecord(row) || !isNonEmpty(row.productCellId)) {
        errors.push("fg00_non_selected_cell_invalid");
        continue;
      }
      add(errors, expected.has(row.productCellId), `fg00_non_selected_cell_unknown:${row.productCellId}`);
      add(errors, !seen.has(row.productCellId), `fg00_non_selected_cell_duplicate:${row.productCellId}`);
      add(errors, ALLOWED_CELL_ROLES.has(row.role), `fg00_non_selected_cell_role_invalid:${row.productCellId}`);
      add(errors, isNonEmpty(row.reason), `fg00_non_selected_cell_reason_missing:${row.productCellId}`);
      seen.add(row.productCellId);
    }
    add(errors, seen.size === expected.size && [...expected].every((id) => seen.has(id)), "fg00_non_selected_cell_set_incomplete");
  }
}

function validateControlRecord(record, errors) {
  const id = isNonEmpty(record?.controlId) ? record.controlId : "UNKNOWN";
  add(errors, isRecord(record), `org00_control_invalid:${id}`);
  if (!isRecord(record)) return;
  const hashFields = [
    "responsibleIdHash", "accountableIdHash", "backupResponsibleIdHash", "signerIdHash",
    "evidenceStewardIdHash", "independentReviewerIdHash", "riskAcceptorIdHash",
  ];
  for (const field of hashFields) add(errors, ID_HASH.test(record[field] ?? ""), `org00_${field}_invalid:${id}`);
  add(errors, uniqueNonEmptyStrings(record.consultedIdHashes) && record.consultedIdHashes.every((value) => ID_HASH.test(value)), `org00_consulted_invalid:${id}`);
  add(errors, uniqueNonEmptyStrings(record.informedIdHashes) && record.informedIdHashes.every((value) => ID_HASH.test(value)), `org00_informed_invalid:${id}`);
  add(errors, record.independentReviewerIdHash !== record.responsibleIdHash, `org00_reviewer_responsible_conflict:${id}`);
  add(errors, record.independentReviewerIdHash !== record.accountableIdHash, `org00_reviewer_accountable_conflict:${id}`);
  add(errors, record.independentReviewerIdHash !== record.signerIdHash, `org00_reviewer_signer_conflict:${id}`);
  add(errors, record.backupResponsibleIdHash !== record.responsibleIdHash, `org00_backup_conflict:${id}`);
  add(errors, ["EXTERNAL", "SEPARATE_FUNCTION"].includes(record.reviewerIndependence), `org00_reviewer_independence_invalid:${id}`);
  add(errors, HEX_256.test(record.conflictDeclarationSha256 ?? ""), `org00_conflict_declaration_invalid:${id}`);
  add(errors, isNonEmpty(record.escalationPath), `org00_escalation_path_missing:${id}`);
  add(errors, isPositive(record.responseSlaHours), `org00_response_sla_invalid:${id}`);
  add(errors, parseInstant(record.dueDate) !== null, `org00_due_date_invalid:${id}`);
  add(errors, isRecord(record.budget), `org00_budget_missing:${id}`);
  if (isRecord(record.budget)) {
    add(errors, /^[A-Z]{3}$/.test(record.budget.currency ?? ""), `org00_budget_currency_invalid:${id}`);
    add(errors, Number.isInteger(record.budget.amountMinor) && record.budget.amountMinor > 0, `org00_budget_amount_invalid:${id}`);
  }
  add(errors, isRecord(record.capacity), `org00_capacity_missing:${id}`);
  if (isRecord(record.capacity)) {
    add(errors, isPositive(record.capacity.hoursPerWeek), `org00_capacity_hours_invalid:${id}`);
    add(errors, Number.isInteger(record.capacity.maxConcurrentCases) && record.capacity.maxConcurrentCases > 0, `org00_capacity_cases_invalid:${id}`);
  }
  add(errors, Array.isArray(record.dependencies), `org00_dependencies_invalid:${id}`);
  add(errors, isNonEmpty(record.stopCondition), `org00_stop_condition_missing:${id}`);
  add(errors, isNonEmpty(record.evidenceOutput), `org00_evidence_output_missing:${id}`);
}

function disjoint(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left.every((entry) => !right.includes(entry));
}

function validateOrg00(packet, policy, errors) {
  add(errors, packet.decision === "APPROVE_OPERATING_MODEL", "org00_decision_invalid");
  add(errors, Array.isArray(packet.controlRecords), "org00_control_records_missing");
  if (Array.isArray(packet.controlRecords)) {
    const seen = new Set();
    for (const record of packet.controlRecords) {
      validateControlRecord(record, errors);
      if (isNonEmpty(record?.controlId)) {
        add(errors, !seen.has(record.controlId), `org00_control_duplicate:${record.controlId}`);
        seen.add(record.controlId);
      }
    }
    add(errors, policy.requiredOrganizationControlIds.every((id) => seen.has(id)), "org00_required_control_set_incomplete");
  }

  const payment = packet.paymentSegregation;
  add(errors, isRecord(payment), "org00_payment_segregation_missing");
  if (isRecord(payment)) {
    for (const field of ["chargeCreators", "entitlementGranters", "refundReconcilers"]) {
      add(errors, uniqueNonEmptyStrings(payment[field]) && payment[field].every((value) => ID_HASH.test(value)), `org00_payment_${field}_invalid`);
    }
    add(errors, disjoint(payment.chargeCreators, payment.entitlementGranters), "org00_charge_entitlement_conflict");
    add(errors, disjoint(payment.chargeCreators, payment.refundReconcilers), "org00_charge_refund_conflict");
    add(errors, disjoint(payment.entitlementGranters, payment.refundReconcilers), "org00_entitlement_refund_conflict");
  }

  const benchmark = packet.benchmarkSegregation;
  add(errors, isRecord(benchmark), "org00_benchmark_segregation_missing");
  if (isRecord(benchmark)) {
    add(errors, uniqueNonEmptyStrings(benchmark.modelAuthors) && benchmark.modelAuthors.every((value) => ID_HASH.test(value)), "org00_benchmark_authors_invalid");
    add(errors, uniqueNonEmptyStrings(benchmark.adjudicators) && benchmark.adjudicators.every((value) => ID_HASH.test(value)), "org00_benchmark_adjudicators_invalid");
    add(errors, disjoint(benchmark.modelAuthors, benchmark.adjudicators), "org00_benchmark_author_adjudicator_conflict");
  }
}

export function verifyGovernanceDecision({ packet, policy, catalogProductCellIds, now = new Date() }) {
  const errors = [];
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
  add(errors, Number.isFinite(nowMs), "verification_time_invalid");
  add(errors, policy?.schemaVersion === "velmere.pass35.governance-decision-policy.v1", "policy_schema_invalid");
  add(errors, Array.isArray(policy?.trustedOrganizationalKeyFingerprints), "policy_trust_anchors_invalid");
  add(errors, Array.isArray(catalogProductCellIds) && catalogProductCellIds.length > 0, "catalog_product_cells_missing");
  if (errors.length === 0) {
    validateCommon(packet, policy, nowMs, errors);
    if (packet?.gateId === "FG00") validateFg00(packet, policy, catalogProductCellIds, errors);
    if (packet?.gateId === "ORG00") validateOrg00(packet, policy, errors);
  }
  const verified = errors.length === 0;
  return {
    schemaVersion: "velmere.pass35.governance-decision-verification.v1",
    candidateId: policy?.candidateId ?? null,
    gateId: packet?.gateId ?? null,
    status: verified ? "PASS_TRUSTED_SIGNED_DECISION" : "BLOCKED_NO_TRUSTED_SIGNED_DECISION",
    verified,
    promotionCredit: verified ? 1 : 0,
    externalWorkstreamId: packet?.gateId === "FG00" ? "FG00_SIGNED_SELECTION" : packet?.gateId === "ORG00" ? "ORG00_SIGNED_OPERATING_RECORD" : null,
    errors,
    truthBoundary: "PASS means a current candidate-bound packet matched an externally provisioned organizational trust anchor and passed structural and cryptographic validation. It does not satisfy any other external workstream.",
  };
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? null : process.argv[index + 1] ?? null;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const packetPath = arg("--packet");
  if (!packetPath) throw new Error("usage: governance-decision-verifier.mjs --packet <json> [--policy <json>] [--catalog <json>] [--now <iso>]");
  const policyPath = arg("--policy") ?? path.resolve("config/pass35/governance-decision-policy.json");
  const catalogPath = arg("--catalog") ?? path.resolve("config/pass35/product-cell-catalog.json");
  const packet = JSON.parse(readFileSync(path.resolve(packetPath), "utf8"));
  const policy = JSON.parse(readFileSync(path.resolve(policyPath), "utf8"));
  const catalog = JSON.parse(readFileSync(path.resolve(catalogPath), "utf8"));
  const result = verifyGovernanceDecision({
    packet,
    policy,
    catalogProductCellIds: catalog.productCells.map((cell) => cell.productCellId),
    now: arg("--now") ?? new Date(),
  });
  console.log(JSON.stringify(result, null, 2));
  if (!result.verified) process.exitCode = 2;
}
