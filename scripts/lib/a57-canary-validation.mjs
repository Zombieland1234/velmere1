export function isFiniteNumber(value) { return typeof value === "number" && Number.isFinite(value); }
export function isNonNegativeNumber(value) { return isFiniteNumber(value) && value >= 0; }
export function validateSnapshotSchemas(snapshot) {
  const errors = [];
  const t = snapshot.telemetry; const s = snapshot.support; const p = snapshot.payment; const o = snapshot.outcome; const sec = snapshot.security;
  if (![t.availabilityPct,t.p50Ms,t.p95Ms,t.p99Ms,t.errorRatePct,t.freshnessSeconds,t.canaryTrafficPct].every(isNonNegativeNumber)) errors.push("telemetry_number_invalid");
  if (!(t.p50Ms <= t.p95Ms && t.p95Ms <= t.p99Ms)) errors.push("telemetry_percentile_order_invalid");
  if (![t.requests,t.successes,t.failures,t.participants].every((value) => Number.isInteger(value) && value >= 0)) errors.push("telemetry_counter_invalid");
  if (t.successes + t.failures !== t.requests) errors.push("telemetry_counter_algebra_invalid");
  if (t.requests > 0) {
    const measuredErrorRatePct = (t.failures / t.requests) * 100;
    const measuredAvailabilityPct = (t.successes / t.requests) * 100;
    if (Math.abs(measuredErrorRatePct - t.errorRatePct) > 0.25) errors.push("telemetry_error_rate_counter_mismatch");
    if (Math.abs(measuredAvailabilityPct - t.availabilityPct) > 0.25) errors.push("telemetry_availability_counter_mismatch");
  }
  if (![s.totalTickets,s.sev1Tickets,s.unresolvedSev2Tickets].every((value) => Number.isInteger(value) && value >= 0) || !isNonNegativeNumber(s.firstResponseP95Seconds)) errors.push("support_schema_invalid");
  if (s.sev1Tickets + s.unresolvedSev2Tickets > s.totalTickets) errors.push("support_severity_counter_algebra_invalid");
  if (![p.testTransactions,p.refundRequests,p.refundsCompleted,p.refundsPending,p.refundsFailed].every((value) => Number.isInteger(value) && value >= 0)) errors.push("payment_schema_invalid");
  if (p.refundsCompleted + p.refundsPending + p.refundsFailed !== p.refundRequests) errors.push("refund_counter_algebra_invalid");
  if (p.refundRequests > p.testTransactions) errors.push("refund_transaction_algebra_invalid");
  if (![o.participants,o.completedJourneys,o.abandonedJourneys,o.customerHarmFlags,o.comprehensionFailures].every((value) => Number.isInteger(value) && value >= 0)) errors.push("outcome_schema_invalid");
  if (o.completedJourneys + o.abandonedJourneys !== o.participants) errors.push("outcome_counter_algebra_invalid");
  if (o.participants !== t.participants) errors.push("cross_plane_participant_mismatch");
  if (p.testTransactions > t.participants) errors.push("cross_plane_transaction_participant_mismatch");
  if (![sec.securityIncidents,sec.authIsolationViolations,sec.entitlementViolations].every((value) => Number.isInteger(value) && value >= 0)) errors.push("security_schema_invalid");
  if (sec.authIsolationViolations + sec.entitlementViolations > sec.securityIncidents) errors.push("security_counter_algebra_invalid");
  return errors;
}
export function stopRuleEvaluationForPlane(kind, row, contract) {
  const reasons = [];
  if (kind === "telemetry") {
    if (row.availabilityPct < contract.stopRules.availabilityMinimumPct) reasons.push("availability_below_floor");
    if (row.p95Ms > contract.stopRules.p95MaximumMs) reasons.push("p95_above_limit");
    if (row.p99Ms > contract.stopRules.p99MaximumMs) reasons.push("p99_above_limit");
    if (row.errorRatePct > contract.stopRules.errorRateMaximumPct) reasons.push("error_rate_above_limit");
    if (row.freshnessSeconds > contract.stopRules.freshnessMaximumSeconds) reasons.push("freshness_above_limit");
    if (row.participants > contract.canary.maximumParticipants) reasons.push("participant_limit_exceeded");
    if (row.canaryTrafficPct > contract.canary.maximumTrafficPct) reasons.push("canary_traffic_limit_exceeded");
  } else if (kind === "support") {
    if (row.sev1Tickets > contract.stopRules.sev1TicketsMaximum) reasons.push("sev1_ticket_present");
    if (row.unresolvedSev2Tickets > contract.stopRules.unresolvedSev2TicketsMaximum) reasons.push("unresolved_sev2_present");
    if (row.firstResponseP95Seconds > contract.stopRules.supportFirstResponseP95MaximumSeconds) reasons.push("support_response_sla_breached");
  } else if (kind === "payment") {
    if (row.paymentMode !== contract.canary.paymentMode) reasons.push("payment_mode_not_test_only");
    if (row.testTransactions > contract.canary.maximumTestTransactions) reasons.push("test_transaction_limit_exceeded");
    if (row.refundsFailed > contract.stopRules.failedRefundsMaximum) reasons.push("refund_failure_present");
    if (row.refundsPending > contract.stopRules.pendingRefundsMaximum) reasons.push("refund_pending_present");
    const completion = row.refundRequests === 0 ? 100 : (row.refundsCompleted / row.refundRequests) * 100;
    if (completion < contract.stopRules.minimumRefundCompletionPct) reasons.push("refund_completion_below_floor");
  } else if (kind === "outcome") {
    if (row.customerHarmFlags > contract.stopRules.customerHarmFlagsMaximum) reasons.push("customer_harm_flag_present");
    if (row.comprehensionFailures > contract.stopRules.maximumComprehensionFailures) reasons.push("comprehension_failure_present");
    const completion = row.participants === 0 ? 100 : (row.completedJourneys / row.participants) * 100;
    if (completion < contract.stopRules.minimumJourneyCompletionPct) reasons.push("journey_completion_below_floor");
  } else if (kind === "security") {
    if (row.securityIncidents > contract.stopRules.securityIncidentsMaximum) reasons.push("security_incident_present");
    if (row.authIsolationViolations > contract.stopRules.authIsolationViolationsMaximum) reasons.push("auth_isolation_violation_present");
    if (row.entitlementViolations > contract.stopRules.entitlementViolationsMaximum) reasons.push("entitlement_violation_present");
  }
  return { reasons };
}
export function stopRuleEvaluation(snapshot, contract) {
  const reasons = [];
  const { telemetry, support, payment, outcome, security } = snapshot;
  if (telemetry.availabilityPct < contract.stopRules.availabilityMinimumPct) reasons.push("availability_below_floor");
  if (telemetry.p95Ms > contract.stopRules.p95MaximumMs) reasons.push("p95_above_limit");
  if (telemetry.p99Ms > contract.stopRules.p99MaximumMs) reasons.push("p99_above_limit");
  if (telemetry.errorRatePct > contract.stopRules.errorRateMaximumPct) reasons.push("error_rate_above_limit");
  if (telemetry.freshnessSeconds > contract.stopRules.freshnessMaximumSeconds) reasons.push("freshness_above_limit");
  if (telemetry.participants > contract.canary.maximumParticipants) reasons.push("participant_limit_exceeded");
  if (telemetry.canaryTrafficPct > contract.canary.maximumTrafficPct) reasons.push("canary_traffic_limit_exceeded");
  if (support.sev1Tickets > contract.stopRules.sev1TicketsMaximum) reasons.push("sev1_ticket_present");
  if (support.unresolvedSev2Tickets > contract.stopRules.unresolvedSev2TicketsMaximum) reasons.push("unresolved_sev2_present");
  if (support.firstResponseP95Seconds > contract.stopRules.supportFirstResponseP95MaximumSeconds) reasons.push("support_response_sla_breached");
  if (payment.paymentMode !== contract.canary.paymentMode) reasons.push("payment_mode_not_test_only");
  if (payment.testTransactions > contract.canary.maximumTestTransactions) reasons.push("test_transaction_limit_exceeded");
  if (payment.refundsFailed > contract.stopRules.failedRefundsMaximum) reasons.push("refund_failure_present");
  if (payment.refundsPending > contract.stopRules.pendingRefundsMaximum) reasons.push("refund_pending_present");
  const refundCompletion = payment.refundRequests === 0 ? 100 : (payment.refundsCompleted / payment.refundRequests) * 100;
  if (refundCompletion < contract.stopRules.minimumRefundCompletionPct) reasons.push("refund_completion_below_floor");
  if (outcome.customerHarmFlags > contract.stopRules.customerHarmFlagsMaximum) reasons.push("customer_harm_flag_present");
  if (outcome.comprehensionFailures > contract.stopRules.maximumComprehensionFailures) reasons.push("comprehension_failure_present");
  const completion = outcome.participants === 0 ? 100 : (outcome.completedJourneys / outcome.participants) * 100;
  if (completion < contract.stopRules.minimumJourneyCompletionPct) reasons.push("journey_completion_below_floor");
  if (security.securityIncidents > contract.stopRules.securityIncidentsMaximum) reasons.push("security_incident_present");
  if (security.authIsolationViolations > contract.stopRules.authIsolationViolationsMaximum) reasons.push("auth_isolation_violation_present");
  if (security.entitlementViolations > contract.stopRules.entitlementViolationsMaximum) reasons.push("entitlement_violation_present");
  return { reasons, refundCompletionPct: refundCompletion, journeyCompletionPct: completion };
}
