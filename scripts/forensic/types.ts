/**
 * Forensic Validation Furnace - Type Definitions
 * Exhaustive schemas for 600-execution matrix, field-level audits,
 * provider testing, score recomputations, and cycle outcomes.
 */

export type ForensicSurface = "browser" | "shield" | "shield_pro" | "real_markets";
export type ForensicTier = "basic" | "pro" | "advanced";

export type FieldClassification =
  | "DIRECT_FACT"
  | "DERIVED_FACT"
  | "CALCULATED"
  | "HEURISTIC"
  | "ESTIMATE"
  | "NOT_APPLICABLE"
  | "UNAVAILABLE"
  | "STALE"
  | "CONFLICTING"
  | "UNVERIFIED"
  | "UNKNOWN";

export type DataFreshness = "FRESH" | "AGING" | "STALE" | "UNKNOWN" | "UNAVAILABLE";

export interface MatrixExecution {
  execution_id: string;
  asset: {
    id: string;
    symbol: string;
    name: string;
    class: string;
    address: string;
    network: string;
  };
  surface: ForensicSurface;
  tier: ForensicTier;
  route: string;
  timestamp: string;
  status: "SUCCESS" | "DEGRADED" | "BLOCKED" | "FAILED";
  field_count: number;
  verified_fields: number;
  failed_fields: number;
  uncertain_fields: number;
  missing_fields: number;
  provider_count: number;
  evidence_count: number;
  score: number;
  confidence: number;
  coverage: number;
  freshness: DataFreshness;
  pdf_status: "VERIFIED" | "NOT_APPLICABLE" | "FAILED";
  ui_status: "VERIFIED" | "RENDERED" | "DEGRADED";
  backend_status: "OK_200" | "DEGRADED_200" | "ERROR_500";
  replay_status: "DETERMINISTIC" | "DIVERGENT" | "NOT_REPLAYABLE";
  internet_validation_status: "MATCH" | "WITHIN_TOLERANCE" | "DISCREPANCY" | "UNAVAILABLE";
  final_status: "PASS" | "CONDITIONAL_PASS" | "FAIL";
}

export interface FieldValidationRecord {
  field_id: string;
  field_name: string;
  surface: ForensicSurface;
  tier: ForensicTier;
  asset_symbol: string;
  value: string;
  unit: string;
  source: string;
  provider: string;
  timestamp: string;
  evidence_id: string;
  calculation: string;
  confidence: number;
  freshness: DataFreshness;
  status: FieldClassification;
  verification_method: string;
  external_validation: {
    external_source: string;
    external_value: string;
    delta_or_divergence: string;
    match: boolean;
  };
  result: "PASS" | "FLAG" | "FAIL";
}

export interface ProviderValidationRecord {
  provider_id: string;
  provider_name: string;
  endpoint: string;
  asset_classes_served: string[];
  test_scenarios: {
    scenario: "nominal" | "timeout_sim" | "http_429" | "http_500" | "empty_payload" | "malformed_json" | "stale_timestamp" | "divergent_quote";
    request_url: string;
    response_code: number;
    latency_ms: number;
    fallback_activated: boolean;
    data_integrity: "INTACT" | "CORRUPTED" | "ABSTAINED_SAFELY";
    status: "PASS" | "FAIL";
  }[];
  quorum_weight: number;
  overall_health: "HEALTHY" | "DEGRADED" | "OFFLINE";
}

export interface ScoreRecomputationRecord {
  execution_id: string;
  asset_symbol: string;
  surface: ForensicSurface;
  tier: ForensicTier;
  reported_score: number;
  recomputed_score: number;
  score_match: boolean;
  delta: number;
  formula_applied: string;
  finding_weights_sum: number;
  metric_penalties: number;
  confidence_calibration: {
    reported_confidence: number;
    recomputed_confidence: number;
    delta: number;
    match: boolean;
  };
  coverage_calibration: {
    reported_coverage: number;
    recomputed_coverage: number;
    delta: number;
    match: boolean;
  };
  boundary_tests_passed: boolean;
}

export interface FindingAuditRecord {
  finding_id: string;
  asset_symbol: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "informational";
  owasp_id?: string;
  swc_id?: string;
  cwe_id?: string;
  claim: string;
  evidence: string;
  independent_reproducible: boolean;
  false_positive_assessment: "GENUINE_VULNERABILITY" | "FALSE_POSITIVE" | "BENIGN_DESIGN_CHOICE";
  false_negative_assessment: "NONE_MISSED" | "POTENTIAL_OMISSION_NOTED";
  remediation_advice_soundness: "EXACT_ACTIONABLE" | "GENERIC" | "UNSOUND";
}

export interface PerformanceRecord {
  surface: ForensicSurface;
  tier: ForensicTier;
  asset_symbol: string;
  timing_breakdown: {
    click_to_dispatch_ms: number;
    network_inflight_ms: number;
    backend_auth_and_intake_ms: number;
    provider_quorum_ms: number;
    analysis_engine_ms: number;
    ui_render_ms: number;
    pdf_render_ms: number;
    total_latency_ms: number;
  };
  sla_target_ms: number;
  sla_met: boolean;
  bottleneck_stage: string;
}

export interface RaceConditionTestRecord {
  test_case: string;
  surface: ForensicSurface;
  concurrency_level: number;
  scenario: string;
  result: "PASS_ISOLATED" | "DATA_CORRUPTION" | "DEADLOCK" | "LEAKAGE";
  evidence: string;
}

export interface CrossAssetIsolationRecord {
  pair: [string, string];
  tested_vectors: string[];
  address_leakage_detected: boolean;
  metric_contamination_detected: boolean;
  finding_collision_detected: boolean;
  score_carryover_detected: boolean;
  isolation_score: number;
}

export interface MachineReportSummary {
  total_executions: number;
  total_fields: number;
  verified_fields: number;
  derived_fields: number;
  heuristic_fields: number;
  unverified_fields: number;
  unknown_fields: number;
  stale_fields: number;
  conflicting_fields: number;
  failed_fields: number;
  provider_failures: number;
  fallbacks: number;
  score_mismatches: number;
  finding_mismatches: number;
  ui_backend_mismatches: number;
  pdf_mismatches: number;
  replay_failures: number;
  race_conditions: number;
  cross_asset_leaks: number;
  cross_tier_leaks: number;
  AI_hallucinations: number;
  P0: number;
  P1: number;
  P2: number;
  verdict: "READY" | "CONDITIONALLY READY" | "NOT READY";
}
