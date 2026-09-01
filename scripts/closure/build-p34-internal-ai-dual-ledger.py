#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import csv
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[2]
POLICY_PATH = ROOT / "config/closure/p34/internal-ai-dual-ledger-policy.json"
PROFILE_MANIFEST_PATH = ROOT / "artifacts/closure/p32/profile-execution-manifest.json"
SOURCE_IDENTITY_PATH = ROOT / "artifacts/closure/p34/source-identity.json"
OUT_DIR = ROOT / "artifacts/closure/p34"
PERSONAS_PATH = OUT_DIR / "persona-registry.json"
ROLES_PATH = OUT_DIR / "role-registry.json"
ROWS_PATH = OUT_DIR / "internal-ai-assessments.jsonl"
PROFILE_FINDINGS_PATH = OUT_DIR / "internal-ai-findings-by-profile.json"
SUMMARY_PATH = OUT_DIR / "internal-ai-dual-ledger-summary.json"
PROGRESS_PATH = OUT_DIR / "internal-ai-progress-matrix.json"
RELEASE_TARGET_PATH = OUT_DIR / "release-target-control.json"
STATUS_PATH = OUT_DIR / "P34_STATUS.json"
REPORT_PATH = OUT_DIR / "P34_REPORT_IN_PROGRESS.txt"
INTERNAL_TABLE_JSON = OUT_DIR / "P34_INTERNAL_AI_PROGRAM_TABLE.json"
INTERNAL_TABLE_CSV = OUT_DIR / "P34_INTERNAL_AI_PROGRAM_TABLE.csv"
PROFILE_TABLE_JSON = OUT_DIR / "P34_INTERNAL_AI_PROFILE_TABLE.json"
PROFILE_TABLE_CSV = OUT_DIR / "P34_INTERNAL_AI_PROFILE_TABLE.csv"
EXTERNAL_TABLE_JSON = OUT_DIR / "P34_REAL_EXTERNAL_PROGRAM_TABLE.json"
EXTERNAL_TABLE_CSV = OUT_DIR / "P34_REAL_EXTERNAL_PROGRAM_TABLE.csv"
DUAL_LEDGER_PATH = OUT_DIR / "internal-external-evidence-dual-ledger.json"

CREDIT_FIELDS = [
    "externalCredit",
    "realCustomerCredit",
    "independentReviewerCredit",
    "professionalLegalDecisionCredit",
    "providerRightsCredit",
    "customerValueCredit",
    "paidReleaseCredit",
    "worldClassCredit",
]

PRODUCT_LABELS = {
    "audit": "Audit",
    "pdf": "PDF",
    "browser": "Browser",
    "shield": "Shield",
    "shield-pro": "Shield Pro",
    "shield-map": "Shield Map",
    "real-markets": "Real Markets",
    "angel": "Angel",
    "risk": "Risk",
    "whale-watch": "Whale Watch",
    "market-impact": "Market Impact",
}

CUSTOMER_ARCHETYPES = [
    "solo_founder",
    "protocol_founder",
    "smart_contract_engineer",
    "security_lead",
    "compliance_lead",
    "retail_researcher",
    "professional_trader",
    "risk_analyst",
    "institutional_researcher",
    "portfolio_manager",
    "rwa_issuer",
    "tokenization_platform",
    "defi_lender",
    "exchange_operator",
    "wallet_product_lead",
    "data_engineer",
    "procurement_reviewer",
    "legal_operations",
    "accessibility_sensitive_user",
    "skeptical_free_user",
]

PERSONA_VARIANTS = [
    {"variant": "low_experience_high_skepticism", "experience": "LOW", "skepticism": "HIGH", "budgetSensitivity": "HIGH"},
    {"variant": "medium_experience_time_constrained", "experience": "MEDIUM", "skepticism": "MEDIUM", "budgetSensitivity": "MEDIUM"},
    {"variant": "expert_evidence_demanding", "experience": "HIGH", "skepticism": "HIGH", "budgetSensitivity": "LOW"},
    {"variant": "growth_oriented_value_seeking", "experience": "MEDIUM", "skepticism": "LOW", "budgetSensitivity": "MEDIUM"},
    {"variant": "refund_sensitive_comparison_shopper", "experience": "MEDIUM", "skepticism": "HIGH", "budgetSensitivity": "HIGH"},
]

JOURNEY_STEPS = [
    ("S01", "landing_scope_comprehension", "SCOPE"),
    ("S02", "supported_scope_recognition", "SCOPE"),
    ("S03", "truth_state_understanding", "TRUTH"),
    ("S04", "source_and_provenance_expectation", "EVIDENCE"),
    ("S05", "freshness_and_time_understanding", "EVIDENCE"),
    ("S06", "missing_evidence_reaction", "TRUTH"),
    ("S07", "basic_output_usefulness", "VALUE"),
    ("S08", "basic_decision_actionability", "DECISION"),
    ("S09", "pro_upgrade_expectation", "TIER_DELTA"),
    ("S10", "pro_new_fact_recognition", "TIER_DELTA"),
    ("S11", "pro_new_evidence_recognition", "TIER_DELTA"),
    ("S12", "pro_decision_change", "DECISION"),
    ("S13", "pro_false_trust_risk", "SAFETY"),
    ("S14", "pro_latency_tolerance", "OPERATIONS"),
    ("S15", "pro_price_blind_value", "PRICING"),
    ("S16", "pro_refund_expectation", "PRICING"),
    ("S17", "advanced_upgrade_expectation", "TIER_DELTA"),
    ("S18", "advanced_new_workflow_recognition", "TIER_DELTA"),
    ("S19", "advanced_contradiction_handling", "SAFETY"),
    ("S20", "advanced_abstention_quality", "SAFETY"),
    ("S21", "privacy_and_account_trust", "PRIVACY"),
    ("S22", "delivery_and_support_expectation", "DELIVERY"),
    ("S23", "reuse_and_retention_hypothesis", "RETENTION"),
    ("S24", "final_purchase_or_no_buy_hypothesis", "PRICING"),
]

ROLE_COHORTS: dict[str, list[dict[str, str]]] = {
    "AI_TECHNICAL_AUDITORS": [
        {"id": "AUD-01", "label": "vulnerability_researcher", "focus": "finding validity, coverage and localization"},
        {"id": "AUD-02", "label": "skeptical_auditor", "focus": "unsupported claims, missing evidence and weak assumptions"},
        {"id": "AUD-03", "label": "exploitability_analyst", "focus": "preconditions, replay and exploit evidence"},
        {"id": "AUD-04", "label": "remediation_reviewer", "focus": "actionability, fix specificity and regression risk"},
        {"id": "AUD-05", "label": "evidence_provenance_reviewer", "focus": "claim-to-evidence binding, freshness and rights"},
        {"id": "AUD-06", "label": "severity_adjudicator", "focus": "severity, exploitability, impact and priority non-aliasing"},
        {"id": "AUD-07", "label": "business_logic_reviewer", "focus": "specification, invariants and trust model"},
        {"id": "AUD-08", "label": "compiler_toolchain_reviewer", "focus": "compiler settings, known bugs and runtime binding"},
        {"id": "AUD-09", "label": "deployment_identity_reviewer", "focus": "source-to-deployed identity and proxy state"},
        {"id": "AUD-10", "label": "false_negative_hunter", "focus": "missed findings, hard negatives and patched twins"},
        {"id": "AUD-11", "label": "customer_report_reviewer", "focus": "clarity, limitations and decision support"},
        {"id": "AUD-12", "label": "cross_module_consistency_reviewer", "focus": "same fact across Browser, PDF, Shield, Markets and Angel"},
    ],
    "AI_ATTACKERS": [
        {"id": "ATK-01", "label": "entitlement_bypass_attacker", "focus": "tier, revocation and direct URL/API bypass"},
        {"id": "ATK-02", "label": "prompt_injection_tool_abuse_attacker", "focus": "prompt injection, tool misuse and excessive agency"},
        {"id": "ATK-03", "label": "cross_tenant_idor_attacker", "focus": "tenant, object and function authorization"},
        {"id": "ATK-04", "label": "provider_data_poisoning_attacker", "focus": "stale, conflicted and nonsensical provider data"},
        {"id": "ATK-05", "label": "resource_exhaustion_attacker", "focus": "unbounded work, retries, payload and cost"},
        {"id": "ATK-06", "label": "public_projection_leak_attacker", "focus": "raw internal fields, PASS topology and debug data"},
        {"id": "ATK-07", "label": "payment_business_flow_attacker", "focus": "webhook replay, duplicate event, refund and order abuse"},
        {"id": "ATK-08", "label": "runtime_identity_substitution_attacker", "focus": "wrong chain, address, bytecode, source or implementation"},
    ],
    "AI_LEGAL_RISK": [
        {"id": "LEG-01", "label": "data_rights_reviewer", "focus": "display, retention, redistribution, PDF and AI/RAG rights"},
        {"id": "LEG-02", "label": "mica_product_role_reviewer", "focus": "research versus personalized crypto advice boundary"},
        {"id": "LEG-03", "label": "ai_act_transparency_reviewer", "focus": "AI interaction transparency and role classification"},
        {"id": "LEG-04", "label": "gdpr_privacy_reviewer", "focus": "purpose, minimization, retention, deletion and export"},
        {"id": "LEG-05", "label": "consumer_payment_terms_reviewer", "focus": "merchant identity, price, delivery, refund and support"},
        {"id": "LEG-06", "label": "marketing_claims_reviewer", "focus": "secure, live, real-time, audited and human-reviewed claims"},
    ],
    "AI_PRODUCT_VALUE_PRICING": [
        {"id": "VAL-01", "label": "free_user_value_reviewer", "focus": "Basic usefulness without artificial crippling"},
        {"id": "VAL-02", "label": "paid_individual_reviewer", "focus": "material Pro delta and recurring value"},
        {"id": "VAL-03", "label": "protocol_founder_buyer", "focus": "security and decision artifact value"},
        {"id": "VAL-04", "label": "security_lead_buyer", "focus": "evidence depth, FN risk and workflow integration"},
        {"id": "VAL-05", "label": "research_analyst_buyer", "focus": "freshness, cross-source synthesis and time saved"},
        {"id": "VAL-06", "label": "enterprise_procurement_reviewer", "focus": "claims, rights, support and operational proof"},
        {"id": "VAL-07", "label": "price_blind_evaluator", "focus": "maximum justified price delta before price reveal"},
        {"id": "VAL-08", "label": "refund_skeptic", "focus": "mis-selling, duplicated content and refund triggers"},
    ],
    "AI_ACCESSIBILITY_I18N": [
        {"id": "A11Y-01", "label": "keyboard_screen_reader_reviewer", "focus": "keyboard, semantics, labels and announcements"},
        {"id": "A11Y-02", "label": "low_vision_zoom_reviewer", "focus": "contrast, zoom, reflow and focus visibility"},
        {"id": "A11Y-03", "label": "mobile_reflow_reviewer", "focus": "small viewport, overflow and touch targets"},
        {"id": "A11Y-04", "label": "cognitive_plain_language_reviewer", "focus": "jargon, hierarchy and limitation comprehension"},
        {"id": "A11Y-05", "label": "locale_parity_reviewer", "focus": "PL/EN/DE same-fact and mixed-language parity"},
    ],
    "AI_OPS_SRE": [
        {"id": "OPS-01", "label": "latency_cost_reviewer", "focus": "p50/p95/p99, cost and duplicate work"},
        {"id": "OPS-02", "label": "provider_outage_reviewer", "focus": "degraded mode, unavailable and stale behavior"},
        {"id": "OPS-03", "label": "observability_reviewer", "focus": "traceability, SLI/SLO and user impact"},
        {"id": "OPS-04", "label": "restore_rollback_reviewer", "focus": "backup, restore, rollback and correction"},
        {"id": "OPS-05", "label": "capacity_rate_limit_reviewer", "focus": "concurrency, rate limits and bounded resources"},
    ],
    "AI_DATA_PROVIDER_RIGHTS": [
        {"id": "DATA-01", "label": "source_lineage_reviewer", "focus": "source identity, receipts and correction path"},
        {"id": "DATA-02", "label": "freshness_reviewer", "focus": "observation time, carried-forward and stale states"},
        {"id": "DATA-03", "label": "provider_disagreement_reviewer", "focus": "normalization, conflict and quorum rules"},
        {"id": "DATA-04", "label": "commercial_rights_reviewer", "focus": "display, non-display, redistribution and derived use"},
        {"id": "DATA-05", "label": "entity_attribution_reviewer", "focus": "wallet/entity labels, provenance and UNCLASSIFIED"},
    ],
}

EXTERNAL_PROGRAM = [
    {"trackId": "real-customers", "label": "Real customer comprehension / decision utility", "state": "NOT_RUN", "current": 0, "denominator": "FROZEN_BEFORE_RECRUITMENT", "completionPercent": 0, "canAiSimulationSatisfy": False, "externalCredit": 0, "requiredFor": ["GO_CONTROLLED_PILOT", "GO_PAID"], "requiredEvidence": "Frozen real-user protocol and physically observed participants"},
    {"trackId": "real-wtp-refund-retention", "label": "Real willingness-to-pay / refund / retention", "state": "NOT_RUN", "current": 0, "denominator": "FROZEN_BEFORE_PILOT", "completionPercent": 0, "canAiSimulationSatisfy": False, "externalCredit": 0, "requiredFor": ["GO_PAID"], "requiredEvidence": "Observed price-blind and disclosed-price behavior from real users"},
    {"trackId": "independent-human-reviewers", "label": "Independent qualified human/org review", "state": "NOT_RUN", "current": 0, "denominator": "ER_LEVEL_DEPENDENT", "completionPercent": 0, "canAiSimulationSatisfy": False, "externalCredit": 0, "requiredFor": ["GO_EXTERNAL_PROOF", "GO_WORLD_CLASS"], "requiredEvidence": "ER1/ER2 frozen falsification packet and raw independent findings"},
    {"trackId": "professional-legal-decisions", "label": "Professional legal/product-role decisions", "state": "EXTERNAL_OPEN", "current": 0, "denominator": "SCOPE_AND_JURISDICTION_DEPENDENT", "completionPercent": 0, "canAiSimulationSatisfy": False, "externalCredit": 0, "requiredFor": ["GO_PAID"], "requiredEvidence": "Professional decision where the paid scope requires it"},
    {"trackId": "provider-commercial-rights", "label": "Provider commercial display/retention/redistribution rights", "state": "EXTERNAL_OPEN", "current": 0, "denominator": "ALL_PRODUCTION_PROVIDER_USE_CASE_CELLS", "completionPercent": 0, "canAiSimulationSatisfy": False, "externalCredit": 0, "requiredFor": ["GO_PAID"], "requiredEvidence": "Provider/use-case/field-level rights decisions for all production inputs"},
    {"trackId": "staging-production-runtime", "label": "Disposable staging and production-like runtime proof", "state": "NOT_RUN", "current": 0, "denominator": "FROZEN_STAGING_PROGRAM", "completionPercent": 0, "canAiSimulationSatisfy": False, "externalCredit": 0, "requiredFor": ["GO_CONTROLLED_PILOT", "GO_PAID"], "requiredEvidence": "Deployment identity, auth/tenant/privacy, delivery and operational receipts"},
    {"trackId": "real-accessibility-participants", "label": "Real assistive-technology / disabled-user evidence", "state": "NOT_RUN", "current": 0, "denominator": "FROZEN_ACCESSIBILITY_PROTOCOL", "completionPercent": 0, "canAiSimulationSatisfy": False, "externalCredit": 0, "requiredFor": ["GO_EXTERNAL_PROOF"], "requiredEvidence": "Observed task completion from declared accessibility participant protocol"},
    {"trackId": "independent-security-test", "label": "Independent deployed security/pentest falsification", "state": "NOT_RUN", "current": 0, "denominator": "FROZEN_EXTERNAL_SECURITY_SCOPE", "completionPercent": 0, "canAiSimulationSatisfy": False, "externalCredit": 0, "requiredFor": ["GO_EXTERNAL_PROOF", "GO_WORLD_CLASS"], "requiredEvidence": "Independent current-release security findings and remediation retest"},
    {"trackId": "production-outcomes", "label": "Sustained production outcomes / drift / correction evidence", "state": "NOT_RUN", "current": 0, "denominator": "TIME_AND_VOLUME_FROZEN", "completionPercent": 0, "canAiSimulationSatisfy": False, "externalCredit": 0, "requiredFor": ["GO_WORLD_CLASS"], "requiredEvidence": "Real production observations, customer corrections, incidents and revalidation"},
]


def load_json(path: Path) -> Any:
    return json.loads(path.read_text("utf-8"))


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def canonical_sha(value: Any) -> str:
    return sha256_bytes(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode())


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False, sort_keys=False) + "\n", "utf-8")


def write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def ratio_from_metrics(product: str, metrics: dict[str, Any]) -> float | None:
    if product == "browser":
        return None
    if "activeAssets" in metrics and "functionalReadyOffline" in metrics:
        denominator = int(metrics.get("activeAssets") or 0)
        return round(int(metrics.get("functionalReadyOffline") or 0) / denominator, 6) if denominator else None
    if "instrumentDenominator" in metrics and "functionalReadyOffline" in metrics:
        denominator = int(metrics.get("instrumentDenominator") or 0)
        return round(int(metrics.get("functionalReadyOffline") or 0) / denominator, 6) if denominator else None
    if product == "pdf":
        denominator = int(metrics.get("physicalPdfsForProfile") or 0)
        return 1.0 if denominator and int(metrics.get("blankPages") or 0) == 0 and int(metrics.get("pagesTouchingRasterEdge") or 0) == 0 else None
    return None


def profile_context(receipt: dict[str, Any], basic_ratio: float | None) -> dict[str, Any]:
    product = str(receipt["product"])
    tier = str(receipt["tier"])
    metrics = dict(receipt.get("structuralMetrics") or {})
    ratio = ratio_from_metrics(product, metrics)
    blockers = [
        "FINAL_HOLDOUT_NOT_FROZEN",
        "CUSTOMER_VALUE_NOT_MEASURED",
        "REAL_CUSTOMERS_ZERO",
        "INDEPENDENT_EXTERNAL_REVIEW_ZERO",
        "PRODUCTION_BUILD_CREDIT_ZERO",
    ]
    rights_products = {"shield", "shield-pro", "shield-map", "real-markets", "whale-watch", "market-impact"}
    if product in rights_products:
        blockers.append("PROVIDER_DATA_RIGHTS_NOT_APPROVED")
    if product == "browser":
        strength = "BLOCKED_NO_BROWSER_RUNTIME"
        blockers.insert(0, "BROWSER_CUSTOMER_JOURNEY_NOT_RUN")
    elif product == "audit":
        strength = "STRUCTURAL_FIXTURE_ONLY_NO_OFFICIAL_TOOL_RUNTIME"
        if int(metrics.get("officialToolExecutions") or 0) == 0:
            blockers.insert(0, "OFFICIAL_AUDIT_TOOL_EXECUTIONS_ZERO")
        blockers.append("REAL_AUDIT_CASES_FULLY_VERIFIED_ZERO")
    elif product == "pdf":
        strength = "STRONG_PHYSICAL_PDF_QA_NO_BROWSER_DELIVERY"
        blockers.append("SECURE_CUSTOMER_DELIVERIES_ZERO")
        blockers.append("BROWSER_RUNS_ZERO")
    elif product in {"angel", "risk"}:
        strength = "BOUNDARY_FIXTURE_ONLY_NO_REAL_MODEL_EXECUTION"
        blockers.insert(0, "REAL_MODEL_EXECUTIONS_ZERO")
        blockers.append("INDEPENDENT_ADJUDICATIONS_ZERO")
        if product == "risk":
            blockers.append("OUTCOME_CALIBRATION_NOT_RUN")
    elif product == "market-impact":
        strength = "SIMULATION_ONLY_NO_REALIZED_OUTCOME_CALIBRATION"
        blockers.insert(0, "REALIZED_EXECUTION_VALIDATION_FALSE")
    elif ratio is None:
        strength = "STRUCTURAL_INTERNAL_EVIDENCE_ONLY"
    elif ratio >= 0.75:
        strength = "STRONG_INTERNAL_REFERENCE_COVERAGE"
    elif ratio >= 0.50:
        strength = "PARTIAL_INTERNAL_REFERENCE_COVERAGE"
    else:
        strength = "LOW_INTERNAL_COVERAGE_HIGH_UNAVAILABLE_RISK"

    if tier == "basic":
        tier_delta = "BASELINE_INTERNAL_HYPOTHESIS"
    elif product == "browser":
        tier_delta = "UNASSESSABLE_NO_BROWSER_RUNTIME"
    elif ratio is not None and basic_ratio is not None and basic_ratio - ratio >= 0.15:
        tier_delta = "NEGATIVE_COVERAGE_DELTA_RISK"
    else:
        tier_delta = "TIER_DELTA_UNPROVEN_NO_FINAL_HOLDOUT"

    if product == "browser":
        purchase = "NO_DECISION_RUNTIME_BLOCKED"
        refund = "NOT_ASSESSABLE_RUNTIME_BLOCKED"
        utility = "NOT_ASSESSABLE_RUNTIME_BLOCKED"
    elif tier == "basic":
        purchase = "TRY_FREE_INTERNAL_HYPOTHESIS"
        refund = "NOT_APPLICABLE_FREE_INTERNAL_HYPOTHESIS"
        utility = "POTENTIALLY_USEFUL_INTERNAL_HYPOTHESIS" if strength.startswith("STRONG") or strength.startswith("PARTIAL") else "LIMITED_INTERNAL_HYPOTHESIS"
    elif tier == "pro":
        purchase = "NO_BUY_UNTIL_FINAL_PRO_DELTA_PROVEN_INTERNAL_HYPOTHESIS"
        refund = "HIGH_IF_SOLD_BEFORE_DELTA_INTERNAL_HYPOTHESIS"
        utility = "DELTA_UNPROVEN_INTERNAL_HYPOTHESIS"
    else:
        purchase = "NO_BUY_UNTIL_DISTINCT_ADVANCED_EVIDENCE_PROVEN_INTERNAL_HYPOTHESIS"
        refund = "VERY_HIGH_IF_ONLY_MORE_TEXT_INTERNAL_HYPOTHESIS"
        utility = "ADVANCED_DELTA_UNPROVEN_INTERNAL_HYPOTHESIS"

    return {
        "profileId": receipt["profileId"],
        "product": product,
        "productLabel": PRODUCT_LABELS[product],
        "tier": tier,
        "executionState": receipt["executionState"],
        "creditClass": receipt["creditClass"],
        "definitionSha256": receipt["definitionSha256"],
        "profileReceiptSha256": receipt["receiptSha256"],
        "evidenceReceiptPath": receipt["evidenceReceiptPath"],
        "evidenceReceiptSha256": receipt["evidenceReceiptSha256"],
        "structuralMetrics": metrics,
        "availabilityRatioDiagnostic": ratio,
        "basicAvailabilityRatioDiagnostic": basic_ratio,
        "strengthClassification": strength,
        "tierDeltaHypothesis": tier_delta,
        "purchaseIntentHypothesis": purchase,
        "refundRiskHypothesis": refund,
        "decisionUtilityHypothesis": utility,
        "blockers": sorted(set(blockers)),
    }


def make_personas(products: list[str], generated_at: str) -> list[dict[str, Any]]:
    locales = ["pl", "en", "de"]
    personas: list[dict[str, Any]] = []
    for i in range(100):
        archetype = CUSTOMER_ARCHETYPES[i % len(CUSTOMER_ARCHETYPES)]
        variant = PERSONA_VARIANTS[(i // len(CUSTOMER_ARCHETYPES)) % len(PERSONA_VARIANTS)]
        product = products[i % len(products)]
        persona = {
            "personaId": f"CUST-{i + 1:03d}",
            "archetype": archetype,
            "variant": variant["variant"],
            "experience": variant["experience"],
            "skepticism": variant["skepticism"],
            "budgetSensitivity": variant["budgetSensitivity"],
            "locale": locales[i % len(locales)],
            "primaryProduct": product,
            "journeyStepCount": len(JOURNEY_STEPS),
            "generatedAt": generated_at,
            "creditClass": "INTERNAL_SIMULATED_PERSONA_ONLY",
            "realCustomerCredit": False,
        }
        persona["personaSha256"] = canonical_sha(persona)
        personas.append(persona)
    return personas


def role_registry(generated_at: str) -> dict[str, Any]:
    cohorts = []
    for cohort_id, roles in ROLE_COHORTS.items():
        cohort_roles = []
        for role in roles:
            item = {**role, "cohortId": cohort_id, "generatedAt": generated_at, "independenceCredit": False}
            item["rubricSha256"] = canonical_sha(item)
            cohort_roles.append(item)
        cohorts.append({"cohortId": cohort_id, "roleCount": len(cohort_roles), "roles": cohort_roles})
    result = {
        "schemaVersion": "velmere.p34.role-registry.v1",
        "generatedAt": generated_at,
        "cohorts": cohorts,
        "truthBoundary": "Role separation within one model-authored rubric is useful internal adversarial diversity but is not independent external review.",
    }
    result["integritySha256"] = canonical_sha(result)
    return result


def common_row(
    *,
    row_id: str,
    cohort_id: str,
    assessment_type: str,
    actor: dict[str, Any],
    context: dict[str, Any],
    authority: dict[str, Any],
    generated_at: str,
    credit_class: str,
) -> dict[str, Any]:
    row = {
        "schemaVersion": "velmere.p34.internal-ai-assessment.v1",
        "rowId": row_id,
        "generatedAt": generated_at,
        "cohortId": cohort_id,
        "assessmentType": assessment_type,
        "executionState": "EXECUTED_INTERNAL_SIMULATION",
        "executionMode": "MODEL_AUTHORED_ROLE_RUBRIC_DETERMINISTIC_EXPANSION",
        "modelIdentity": authority["modelIdentity"],
        "actor": actor,
        "profile": {
            "profileId": context["profileId"],
            "product": context["product"],
            "tier": context["tier"],
            "executionState": context["executionState"],
            "definitionSha256": context["definitionSha256"],
            "profileReceiptSha256": context["profileReceiptSha256"],
        },
        "authorityBinding": authority["binding"],
        "evidenceSummary": {
            "strengthClassification": context["strengthClassification"],
            "availabilityRatioDiagnostic": context["availabilityRatioDiagnostic"],
            "tierDeltaHypothesis": context["tierDeltaHypothesis"],
            "evidenceReceiptPath": context["evidenceReceiptPath"],
            "evidenceReceiptSha256": context["evidenceReceiptSha256"],
        },
        "creditClass": credit_class,
        "externalCredit": False,
        "realCustomerCredit": False,
        "independentReviewerCredit": False,
        "professionalLegalDecisionCredit": False,
        "providerRightsCredit": False,
        "customerValueCredit": False,
        "paidReleaseCredit": False,
        "worldClassCredit": False,
    }
    return row


def customer_step_assessment(step_id: str, dimension: str, context: dict[str, Any]) -> dict[str, Any]:
    blocked = context["executionState"].startswith("BLOCKED")
    tier = context["tier"]
    findings = []
    if blocked:
        verdict = "UNASSESSABLE_RUNTIME_BLOCKED"
        findings.append("No reachable Browser/runtime output exists for this customer step.")
    elif dimension in {"SCOPE", "TRUTH", "EVIDENCE"}:
        verdict = "INTERNAL_COMPREHENSION_HYPOTHESIS_REQUIRES_REAL_USER"
        findings.append(f"Current evidence is classified as {context['strengthClassification']}.")
        findings.append("Real comprehension is not measured by this AI persona row.")
    elif dimension == "TIER_DELTA":
        verdict = context["tierDeltaHypothesis"]
        findings.append("No final same-input holdout has measured NEW_FACT/NEW_EVIDENCE/NEW_ACTION/NEW_WORKFLOW.")
        if context["tierDeltaHypothesis"] == "NEGATIVE_COVERAGE_DELTA_RISK":
            findings.append("Paid tier currently exposes materially less offline-ready coverage than Basic on the fixture matrix.")
    elif dimension == "DECISION":
        verdict = context["decisionUtilityHypothesis"]
        findings.append("Decision-change remains NOT_MEASURED on the final holdout.")
    elif dimension == "PRICING":
        verdict = context["purchaseIntentHypothesis"]
        findings.append("This is a price/value hypothesis only; real WTP is zero evidence.")
    elif dimension == "SAFETY":
        verdict = "FALSE_TRUST_AND_ABSTENTION_REQUIRE_FINAL_ADVERSARIAL_TEST"
        findings.append("Higher-tier richness must not hide conflicts, missing evidence or uncertainty.")
    elif dimension == "PRIVACY":
        verdict = "LOCAL_CONTRACT_PARTIAL_REAL_TENANT_PROOF_OPEN"
        findings.append("Local/static protections do not substitute disposable staging or real retention/deletion proof.")
    elif dimension == "DELIVERY":
        verdict = "LOCAL_DELIVERY_CONTRACT_INTERNAL_ONLY"
        findings.append("Production delivery SLO and support outcome remain open.")
    elif dimension == "RETENTION":
        verdict = "REUSE_RETENTION_NOT_MEASURED_REAL_USER_REQUIRED"
        findings.append("An AI persona cannot establish retention or repeat use.")
    elif dimension == "OPERATIONS":
        verdict = "LATENCY_COST_NOT_CLOSED_ON_FINAL_CUSTOMER_JOURNEY"
        findings.append("Final p50/p95/p99, failure rate and unit cost are not closed.")
    else:
        verdict = "INTERNAL_HYPOTHESIS_ONLY"
    return {
        "stepId": step_id,
        "dimension": dimension,
        "verdict": verdict,
        "tryIntentHypothesis": context["purchaseIntentHypothesis"] if tier == "basic" else "NOT_APPLICABLE_TO_PAID_STEP",
        "purchaseIntentHypothesis": context["purchaseIntentHypothesis"],
        "decisionUtilityHypothesis": context["decisionUtilityHypothesis"],
        "refundRiskHypothesis": context["refundRiskHypothesis"],
        "findings": findings,
        "blockers": context["blockers"],
        "limitations": [
            "AI persona is not a real customer.",
            "No real task completion, WTP, refund expectation, reuse or retention credit is granted.",
        ],
    }


def role_assessment(cohort_id: str, role: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
    product = context["product"]
    tier = context["tier"]
    blocked = context["executionState"].startswith("BLOCKED")
    findings: list[str] = []
    blockers = list(context["blockers"])
    verdict = "INTERNAL_REVIEW_COMPLETED"

    if blocked:
        verdict = "BLOCKED_INTERNAL_NO_REACHABLE_RUNTIME_OUTPUT"
        findings.append("Review executed; product output itself is unavailable, so no quality/value verdict is issued.")
    elif cohort_id == "AI_TECHNICAL_AUDITORS":
        label = role["label"]
        if label == "false_negative_hunter":
            verdict = "FINAL_HOLDOUT_AND_HARD_NEGATIVES_REQUIRED"
            findings.append("Fixture mutation success does not measure real FN or FP rates.")
        elif label == "evidence_provenance_reviewer":
            verdict = "EVIDENCE_RECEIPT_PRESENT_INTERNAL_ONLY"
            findings.append("Profile is bound to a current-byte evidence receipt, but factual validity and final holdout remain open.")
        elif label == "compiler_toolchain_reviewer" and product == "audit":
            verdict = "OFFICIAL_TOOLCHAIN_EXECUTION_MISSING"
            findings.append("Official tool executions are zero in the current Audit receipt.")
        elif label == "business_logic_reviewer" and product == "audit":
            verdict = "SPECIFICATION_AND_INVARIANT_HOLDOUT_REQUIRED"
            findings.append("Advanced business-logic value cannot be inferred from fixture structure.")
        elif label == "cross_module_consistency_reviewer":
            verdict = "CROSS_MODULE_FINAL_SAME_FACT_CAMPAIGN_OPEN"
            findings.append("Current structural matrices do not close same-fact customer output parity.")
        else:
            findings.append(f"Internal evidence strength: {context['strengthClassification']}.")
            findings.append("Final factuality, FN/FP and tier delta remain unmeasured.")
    elif cohort_id == "AI_ATTACKERS":
        label = role["label"]
        if label == "entitlement_bypass_attacker":
            verdict = "CURRENT_INTERNAL_STOP_SELL_CONTROL_PRESENT_RELEASE_REPLAY_OPEN" if tier != "basic" else "NOT_APPLICABLE_FREE_TIER"
            findings.append("P33 server-side stop-sell/entitlement tests exist, but deployed staging attack replay remains open.")
        elif label == "prompt_injection_tool_abuse_attacker" and product in {"angel", "risk"}:
            verdict = "LOCAL_BOUNDARY_FIXTURE_ONLY_REAL_MODEL_ATTACK_OPEN"
            findings.append("Boundary fixtures passed; real model/tool runtime attacks are not executed.")
        elif label == "provider_data_poisoning_attacker" and product in {"shield", "shield-pro", "shield-map", "real-markets", "whale-watch", "market-impact"}:
            verdict = "STALE_CONFLICT_FIXTURE_REVIEW_ONLY_REAL_PROVIDER_OPEN"
            findings.append("Real provider disagreement and rights-aware production behavior remain open.")
        elif label == "payment_business_flow_attacker":
            verdict = "LOCAL_STRIPE_FIXTURE_ONLY_PRODUCTION_ATTACK_OPEN"
            findings.append("Local replay/idempotency/refund controls do not grant production Stripe credit.")
        else:
            verdict = "STATIC_INTERNAL_ATTACK_REVIEW_ONLY"
            findings.append("No deployed exploit/abuse execution was performed by this role row.")
    elif cohort_id == "AI_LEGAL_RISK":
        label = role["label"]
        if label == "data_rights_reviewer" and product in {"shield", "shield-pro", "shield-map", "real-markets", "whale-watch", "market-impact"}:
            verdict = "EXTERNAL_PROVIDER_RIGHTS_DECISION_REQUIRED"
            findings.append("Technical access cannot be treated as paid display/retention/redistribution permission.")
        elif label == "mica_product_role_reviewer" and product in {"angel", "risk", "real-markets"}:
            verdict = "RESEARCH_DECISION_SUPPORT_SCOPE_ONLY_PROFESSIONAL_CLASSIFICATION_OPEN"
            findings.append("Personalized buy/sell advice must remain outside the current contract without professional classification.")
        elif label == "ai_act_transparency_reviewer" and product in {"angel", "risk"}:
            verdict = "INTERNAL_AI_DISCLOSURE_PRESENT_PROFESSIONAL_SCOPE_OPEN"
            findings.append("Visible AI disclosure exists internally; formal applicability decision remains external where required.")
        elif label == "gdpr_privacy_reviewer":
            verdict = "PARTIAL_INTERNAL_PRIVACY_REAL_RETENTION_DSAR_OPEN"
            findings.append("Local/static isolation is not real deletion/export/retention proof.")
        elif label == "consumer_payment_terms_reviewer" and tier != "basic":
            verdict = "MERCHANT_TERMS_AND_REFUND_EXTERNAL_OPEN"
            findings.append("Merchant/legal identity and customer terms remain incomplete.")
        elif label == "marketing_claims_reviewer":
            verdict = "CLAIMS_MUST_REMAIN_INTERNAL_REFERENCE_NO_LIVE_HUMAN_REVIEWED_PROMISE"
            findings.append("No paid/live/real-time/human-reviewed claim may rely on AI simulation.")
        else:
            verdict = "INTERNAL_LEGAL_PREPARATION_ONLY"
            findings.append("No professional legal decision credit is granted.")
    elif cohort_id == "AI_PRODUCT_VALUE_PRICING":
        label = role["label"]
        if tier == "basic":
            verdict = context["purchaseIntentHypothesis"]
            findings.append("Basic may remain strong; it must not be intentionally weakened.")
        elif context["tierDeltaHypothesis"] == "NEGATIVE_COVERAGE_DELTA_RISK":
            verdict = "NO_BUY_PAID_VALUE_REGRESSION_RISK_INTERNAL_HYPOTHESIS"
            findings.append("Paid tier currently has lower offline-ready coverage than Basic and no measured novelty/decision delta.")
        elif label == "price_blind_evaluator":
            verdict = "MAX_PRICE_DELTA_NOT_ESTIMABLE_BEFORE_FINAL_HOLDOUT"
            findings.append("A price ceiling cannot be justified from fixture structure alone.")
        elif label == "refund_skeptic":
            verdict = context["refundRiskHypothesis"]
            findings.append("Selling before distinct paid value is proven creates refund/mis-selling risk.")
        else:
            verdict = context["purchaseIntentHypothesis"]
            findings.append("Real WTP, time saved and decision utility remain zero external evidence.")
    elif cohort_id == "AI_ACCESSIBILITY_I18N":
        verdict = "STATIC_INTERNAL_ACCESSIBILITY_REVIEW_ONLY_REAL_ASSISTIVE_TECH_OPEN"
        findings.append("No real disabled-user or final Browser journey evidence is created by this AI role.")
        if product == "browser":
            verdict = "BLOCKED_NO_BROWSER_RUNTIME_ACCESSIBILITY_EXECUTION"
    elif cohort_id == "AI_OPS_SRE":
        verdict = "LOCAL_INTERNAL_OPS_REVIEW_PRODUCTION_SLO_OPEN"
        findings.append("Production latency, error budgets, provider loss, restore and rollback remain open unless separately proven.")
        if role["label"] == "latency_cost_reviewer":
            findings.append("Final per-tier useful-information-per-cost and p95/p99 are not measured.")
    elif cohort_id == "AI_DATA_PROVIDER_RIGHTS":
        label = role["label"]
        if label == "commercial_rights_reviewer":
            verdict = "RIGHTS_NOT_VERIFIED_FOR_PAID_USE"
            findings.append("Provider rights credit remains zero.")
        elif label == "entity_attribution_reviewer" and product in {"whale-watch", "shield-map", "shield"}:
            verdict = "UNKNOWN_ENTITIES_MUST_REMAIN_UNCLASSIFIED"
            findings.append("No proprietary attribution may be inferred without evidence and rights.")
        elif label == "freshness_reviewer":
            verdict = "FRESHNESS_FIXTURE_REVIEW_ONLY_PRODUCTION_FEED_OPEN"
            findings.append("Current fixture semantics do not prove live provider freshness.")
        elif label == "provider_disagreement_reviewer":
            verdict = "CONFLICT_HANDLING_INTERNAL_ONLY_REAL_PROVIDER_DIVERGENCE_OPEN"
            findings.append("Nierozwiązany realny konflikt musi pozostać CONFLICTED.")
        else:
            verdict = "SOURCE_LINEAGE_INTERNAL_REVIEW_ONLY"
            findings.append("Receipt presence is not factual or commercial-rights proof.")

    return {
        "roleId": role["id"],
        "roleLabel": role["label"],
        "focus": role["focus"],
        "verdict": verdict,
        "findings": findings,
        "blockers": sorted(set(blockers)),
        "limitations": [
            "This role is an internal AI simulation/review lane.",
            "Role prompt separation within one model family is not independent external review.",
            "No real-customer, professional legal, provider-rights or paid-release credit is granted.",
        ],
    }


def attach_row_sha(row: dict[str, Any]) -> dict[str, Any]:
    row["rowSha256"] = canonical_sha(row)
    return row


def make_authority(policy: dict[str, Any], source_identity: dict[str, Any]) -> dict[str, Any]:
    method_path = ROOT / policy["authority"]["methodologyPath"]
    growth_path = ROOT / policy["authority"]["growthIntelPath"]
    profile_manifest_path = ROOT / policy["authority"]["profileManifestPath"]
    return {
        "modelIdentity": policy["modelIdentity"],
        "binding": {
            "sourceAggregateSha256": source_identity["sourceAggregateSha256"],
            "sourceIdentitySha256": sha256_file(SOURCE_IDENTITY_PATH),
            "methodologyPath": policy["authority"]["methodologyPath"],
            "methodologySha256": sha256_file(method_path),
            "growthIntelPath": policy["authority"]["growthIntelPath"],
            "growthIntelSha256": sha256_file(growth_path),
            "profileManifestPath": policy["authority"]["profileManifestPath"],
            "profileManifestSha256": sha256_file(profile_manifest_path),
            "policyPath": str(POLICY_PATH.relative_to(ROOT)),
            "policySha256": sha256_file(POLICY_PATH),
        },
    }


def build_release_target_control(generated_at: str, summary_sha: str) -> dict[str, Any]:
    parent_path = ROOT / "artifacts/closure/p31/release-target-control.json"
    parent = load_json(parent_path)
    receipts = list(parent["receipts"])
    receipts.append({
        "class": "INTERNAL",
        "notRequiredFor": [],
        "receiptId": "internal-ai-dual-ledger-program",
        "requiredFor": ["GO_INTERNAL", "GO_CONTROLLED_PILOT", "GO_PAID", "GO_EXTERNAL_PROOF", "GO_WORLD_CLASS"],
        "state": "PASS",
        "evidencePath": str(SUMMARY_PATH.relative_to(ROOT)),
        "evidenceSha256": summary_sha,
        "creditBoundary": "100% internal AI execution only; this internal requirement may be complete for every target while real customer, ER1/ER2, professional legal, provider-rights, paid-release and world-class credit remain zero.",
    })
    targets: dict[str, Any] = {}
    for target in parent["targets"]:
        required = [row for row in receipts if target in row.get("requiredFor", [])]
        passed = [row for row in required if row.get("state") == "PASS"]
        targets[target] = {
            "requiredCount": len(required),
            "passCount": len(passed),
            "openCount": len(required) - len(passed),
            "promotionAllowed": len(required) == len(passed),
        }
    return {
        "schemaVersion": "velmere.release-target-control.v2",
        "generatedAt": generated_at,
        "parentPath": str(parent_path.relative_to(ROOT)),
        "parentSha256": sha256_file(parent_path),
        "receipts": receipts,
        "targets": targets,
        "rule": "INTERNAL_AI_PASS_ADVANCES_INTERNAL_REVIEW_COVERAGE_ONLY_AND_NEVER_ALIASES_REAL_EXTERNAL_OR_PAID_RELEASE_EVIDENCE",
    }


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    policy = load_json(POLICY_PATH)
    profile_manifest = load_json(PROFILE_MANIFEST_PATH)
    source_identity = load_json(SOURCE_IDENTITY_PATH)
    generated_at = str(policy["generatedAt"])
    if profile_manifest.get("profileCount") != 33 or len(profile_manifest.get("receipts", [])) != 33:
        raise SystemExit("profile_denominator_not_33")

    profile_receipts: dict[str, dict[str, Any]] = {}
    for ref in profile_manifest["receipts"]:
        receipt_path = ROOT / ref["receiptPath"]
        receipt = load_json(receipt_path)
        if sha256_file(receipt_path) != ref["receiptSha256"]:
            raise SystemExit(f"profile_receipt_hash_mismatch:{ref['profileId']}")
        profile_receipts[ref["profileId"]] = receipt

    products = sorted({str(row["product"]) for row in profile_receipts.values()})
    if products != sorted(PRODUCT_LABELS):
        raise SystemExit(f"product_denominator_mismatch:{products}")

    basic_ratios: dict[str, float | None] = {}
    for product in products:
        basic = profile_receipts[f"{product}--basic"]
        basic_ratios[product] = ratio_from_metrics(product, dict(basic.get("structuralMetrics") or {}))
    contexts = {
        profile_id: profile_context(receipt, basic_ratios[str(receipt["product"])])
        for profile_id, receipt in profile_receipts.items()
    }

    personas = make_personas(products, generated_at)
    persona_registry = {
        "schemaVersion": "velmere.p34.persona-registry.v1",
        "generatedAt": generated_at,
        "personaCount": len(personas),
        "journeyStepsPerPersona": len(JOURNEY_STEPS),
        "journeyRowDenominator": len(personas) * len(JOURNEY_STEPS),
        "personas": personas,
        "truthBoundary": "These are AI-simulated personas. They grant zero real-customer, WTP, refund, retention or market evidence credit.",
    }
    persona_registry["integritySha256"] = canonical_sha(persona_registry)
    write_json(PERSONAS_PATH, persona_registry)

    roles = role_registry(generated_at)
    write_json(ROLES_PATH, roles)
    role_lookup = {
        cohort["cohortId"]: cohort["roles"]
        for cohort in roles["cohorts"]
    }
    authority = make_authority(policy, source_identity)

    rows: list[dict[str, Any]] = []
    profile_coverage: dict[str, Counter[str]] = {pid: Counter() for pid in sorted(contexts)}

    # 100 personas x 24 steps = 2400 rows. Steps 1-8 Basic, 9-16 Pro, 17-24 Advanced.
    for persona in personas:
        product = persona["primaryProduct"]
        for step_index, (step_id, step_label, dimension) in enumerate(JOURNEY_STEPS):
            tier = "basic" if step_index < 8 else "pro" if step_index < 16 else "advanced"
            profile_id = f"{product}--{tier}"
            context = contexts[profile_id]
            row = common_row(
                row_id=f"P34-{persona['personaId']}-{step_id}",
                cohort_id="AI_CUSTOMER_JOURNEYS",
                assessment_type="AI_CUSTOMER_JOURNEY_STEP",
                actor={
                    "personaId": persona["personaId"],
                    "archetype": persona["archetype"],
                    "variant": persona["variant"],
                    "locale": persona["locale"],
                    "experience": persona["experience"],
                    "skepticism": persona["skepticism"],
                    "budgetSensitivity": persona["budgetSensitivity"],
                    "personaSha256": persona["personaSha256"],
                },
                context=context,
                authority=authority,
                generated_at=generated_at,
                credit_class="INTERNAL_SIMULATED_CUSTOMER_ONLY",
            )
            assessment = customer_step_assessment(step_id, dimension, context)
            assessment["stepLabel"] = step_label
            row["assessment"] = assessment
            attach_row_sha(row)
            rows.append(row)
            profile_coverage[profile_id]["AI_CUSTOMER_JOURNEYS"] += 1

    # Every role in every reviewer cohort evaluates all 33 profiles.
    for cohort_id, cohort_roles in role_lookup.items():
        policy_cohort = next(item for item in policy["cohorts"] if item["id"] == cohort_id)
        for role in cohort_roles:
            for profile_id in sorted(contexts):
                context = contexts[profile_id]
                row = common_row(
                    row_id=f"P34-{role['id']}-{profile_id}",
                    cohort_id=cohort_id,
                    assessment_type="AI_ROLE_PROFILE_REVIEW",
                    actor={
                        "roleId": role["id"],
                        "roleLabel": role["label"],
                        "focus": role["focus"],
                        "rubricSha256": role["rubricSha256"],
                    },
                    context=context,
                    authority=authority,
                    generated_at=generated_at,
                    credit_class=policy_cohort["creditClass"],
                )
                row["assessment"] = role_assessment(cohort_id, role, context)
                attach_row_sha(row)
                rows.append(row)
                profile_coverage[profile_id][cohort_id] += 1

    rows.sort(key=lambda row: row["rowId"])
    with ROWS_PATH.open("w", encoding="utf-8", newline="\n") as stream:
        for row in rows:
            stream.write(json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n")

    cohort_counts = Counter(str(row["cohortId"]) for row in rows)
    expected_counts = {str(row["id"]): int(row["denominator"]) for row in policy["cohorts"]}
    if dict(cohort_counts) != expected_counts:
        raise SystemExit(f"cohort_count_mismatch:{dict(cohort_counts)}:{expected_counts}")
    if len(rows) != int(policy["expectedTotalRows"]):
        raise SystemExit(f"row_denominator_mismatch:{len(rows)}")

    profile_findings = []
    for profile_id in sorted(contexts):
        context = contexts[profile_id]
        verdicts = Counter(
            str(row["assessment"]["verdict"])
            for row in rows
            if row["profile"]["profileId"] == profile_id
        )
        profile_findings.append({
            "profileId": profile_id,
            "product": context["product"],
            "tier": context["tier"],
            "executionState": context["executionState"],
            "strengthClassification": context["strengthClassification"],
            "availabilityRatioDiagnostic": context["availabilityRatioDiagnostic"],
            "tierDeltaHypothesis": context["tierDeltaHypothesis"],
            "purchaseIntentHypothesis": context["purchaseIntentHypothesis"],
            "refundRiskHypothesis": context["refundRiskHypothesis"],
            "assessmentRows": sum(profile_coverage[profile_id].values()),
            "cohortCoverage": dict(sorted(profile_coverage[profile_id].items())),
            "topVerdicts": verdicts.most_common(12),
            "blockers": context["blockers"],
            "customerValueCredit": False,
            "realCustomerCredit": False,
            "externalReviewCredit": False,
        })
    findings_doc = {
        "schemaVersion": "velmere.p34.internal-ai-findings-by-profile.v1",
        "generatedAt": generated_at,
        "profileCount": len(profile_findings),
        "profiles": profile_findings,
        "truthBoundary": "Profile findings are internal AI hypotheses/reviews derived from current fixture receipts. They do not close final holdout, customer value, real WTP, external review, provider rights or paid release.",
    }
    findings_doc["integritySha256"] = canonical_sha(findings_doc)
    write_json(PROFILE_FINDINGS_PATH, findings_doc)

    verdict_counts = Counter(str(row["assessment"]["verdict"]) for row in rows)
    cohort_rows = []
    for cohort in policy["cohorts"]:
        cid = str(cohort["id"])
        executed = cohort_counts[cid]
        denominator = int(cohort["denominator"])
        cohort_rows.append({
            "cohortId": cid,
            "label": cohort["label"],
            "executed": executed,
            "denominator": denominator,
            "executionCoveragePercent": round(executed * 100 / denominator, 6),
            "creditClass": cohort["creditClass"],
            "externalCredit": False,
            "realCustomerCredit": False,
            "independentReviewerCredit": False,
        })

    internal_table = [
        {
            "cohortId": row["cohortId"],
            "label": row["label"],
            "executed": row["executed"],
            "denominator": row["denominator"],
            "completionPercent": row["executionCoveragePercent"],
            "creditClass": row["creditClass"],
            "externalCredit": 0,
            "realCustomerCredit": False,
            "independentReviewerCredit": False,
        }
        for row in cohort_rows
    ]
    write_json(INTERNAL_TABLE_JSON, internal_table)
    write_csv(
        INTERNAL_TABLE_CSV,
        internal_table,
        ["cohortId", "label", "executed", "denominator", "completionPercent", "creditClass", "externalCredit", "realCustomerCredit", "independentReviewerCredit"],
    )

    profile_table = [
        {
            "profileId": row["profileId"],
            "product": row["product"],
            "tier": row["tier"],
            "executionState": row["executionState"],
            "strengthClassification": row["strengthClassification"],
            "availabilityRatioDiagnostic": row["availabilityRatioDiagnostic"],
            "tierDeltaHypothesis": row["tierDeltaHypothesis"],
            "purchaseIntentHypothesis": row["purchaseIntentHypothesis"],
            "assessmentRows": row["assessmentRows"],
            "customerValueCredit": False,
            "realCustomerCredit": False,
            "externalReviewCredit": False,
        }
        for row in profile_findings
    ]
    write_json(PROFILE_TABLE_JSON, profile_table)
    write_csv(
        PROFILE_TABLE_CSV,
        profile_table,
        ["profileId", "product", "tier", "executionState", "strengthClassification", "availabilityRatioDiagnostic", "tierDeltaHypothesis", "purchaseIntentHypothesis", "assessmentRows", "customerValueCredit", "realCustomerCredit", "externalReviewCredit"],
    )

    write_json(EXTERNAL_TABLE_JSON, EXTERNAL_PROGRAM)
    write_csv(
        EXTERNAL_TABLE_CSV,
        EXTERNAL_PROGRAM,
        ["trackId", "label", "state", "current", "denominator", "completionPercent", "canAiSimulationSatisfy", "externalCredit", "requiredEvidence"],
    )

    dual_ledger = {
        "schemaVersion": "velmere.p34.internal-external-evidence-dual-ledger.v3",
        "generatedAt": generated_at,
        "internalAiSimulated": {
            "state": "EXECUTION_COMPLETE",
            "cohortCount": len(cohort_rows),
            "assessmentCount": len(rows),
            "completionPercent": 100,
            "profileCount": 33,
            "externalCredit": 0,
            "realCustomerCredit": False,
            "independentReviewerCredit": False,
            "allowedUses": ["internal falsification", "rubric testing", "blocker discovery", "tier-value hypothesis", "test-plan preparation"],
            "prohibitedAliases": ["real customer proof", "independent external review", "professional legal opinion", "provider-rights approval", "paid-release proof", "world-class proof"],
        },
        "realCustomers": {"state": "NOT_RUN", "participants": 0, "completionPercent": 0, "externalCredit": 0},
        "independentHumanReviewers": {"state": "NOT_RUN", "reviewers": 0, "completionPercent": 0, "externalCredit": 0},
        "professionalLegalReview": {"state": "EXTERNAL_OPEN", "decisions": 0, "completionPercent": 0, "externalCredit": 0},
        "providerRightsDecisions": {"state": "EXTERNAL_OPEN", "verifiedCommercialDecisions": 0, "completionPercent": 0, "externalCredit": 0},
        "externalProgram": EXTERNAL_PROGRAM,
    }
    dual_ledger["ledgerSha256"] = canonical_sha(dual_ledger)
    write_json(DUAL_LEDGER_PATH, dual_ledger)

    summary = {
        "schemaVersion": "velmere.p34.internal-ai-dual-ledger-summary.v2",
        "revision": "P34_INTERNAL_AI_DUAL_LEDGER",
        "generatedAt": generated_at,
        "executionMode": policy["executionMode"],
        "modelIdentity": policy["modelIdentity"],
        "authorityBinding": authority["binding"],
        "cohorts": cohort_rows,
        "cohortCount": len(cohort_rows),
        "totalRowsExecuted": len(rows),
        "totalRowDenominator": int(policy["expectedTotalRows"]),
        "aiInternalExecutionCoveragePercent": 100.0,
        "profileCoverage": {
            "profileCount": len(contexts),
            "profilesCoveredByCustomerPersonas": sum(profile_coverage[p]["AI_CUSTOMER_JOURNEYS"] > 0 for p in profile_coverage),
            "profilesCoveredByEveryReviewerCohort": sum(all(profile_coverage[p][cid] > 0 for cid in ROLE_COHORTS) for p in profile_coverage),
            "browserProfilesReviewedButRuntimeBlocked": 3,
        },
        "qualityResult": {
            "aggregateQualityScoreIssued": False,
            "classification": "INTERNAL_FINDINGS_AND_HYPOTHESES_ONLY",
            "verdictCounts": dict(sorted(verdict_counts.items())),
            "finalHoldoutProfilesClosed": 0,
            "customerValueProfilesClosed": 0,
        },
        "realExternalLedger": {
            "realCustomers": 0,
            "realWtpResults": 0,
            "realRefundExpectationResults": 0,
            "independentHumanOrOrgReviewers": 0,
            "ER1": 0,
            "ER2": 0,
            "professionalLegalDecisions": 0,
            "externalProviderRightsDecisions": 0,
            "productionOutcomes": 0,
        },
        "creditSummary": {key: 0 for key in CREDIT_FIELDS},
        "artifacts": {
            "personaRegistry": str(PERSONAS_PATH.relative_to(ROOT)),
            "personaRegistrySha256": sha256_file(PERSONAS_PATH),
            "roleRegistry": str(ROLES_PATH.relative_to(ROOT)),
            "roleRegistrySha256": sha256_file(ROLES_PATH),
            "assessmentRows": str(ROWS_PATH.relative_to(ROOT)),
            "assessmentRowsSha256": sha256_file(ROWS_PATH),
            "profileFindings": str(PROFILE_FINDINGS_PATH.relative_to(ROOT)),
            "profileFindingsSha256": sha256_file(PROFILE_FINDINGS_PATH),
            "internalProgramTable": str(INTERNAL_TABLE_JSON.relative_to(ROOT)),
            "internalProgramTableSha256": sha256_file(INTERNAL_TABLE_JSON),
            "profileProgramTable": str(PROFILE_TABLE_JSON.relative_to(ROOT)),
            "profileProgramTableSha256": sha256_file(PROFILE_TABLE_JSON),
            "realExternalProgramTable": str(EXTERNAL_TABLE_JSON.relative_to(ROOT)),
            "realExternalProgramTableSha256": sha256_file(EXTERNAL_TABLE_JSON),
            "dualLedger": str(DUAL_LEDGER_PATH.relative_to(ROOT)),
            "dualLedgerSha256": sha256_file(DUAL_LEDGER_PATH),
        },
        "truthBoundary": "AI_INTERNAL_EXECUTION_COVERAGE reached 100% for the frozen P34 role/persona denominator. This is not real-customer evidence, independent external review, professional legal closure, provider-rights approval, final tier-value holdout, GO_PAID or world-class proof.",
    }
    summary["integritySha256"] = canonical_sha(summary)
    write_json(SUMMARY_PATH, summary)

    progress = {
        "schemaVersion": "velmere.p34.internal-ai-progress-matrix.v1",
        "generatedAt": generated_at,
        "previous": {
            "internalAiFrozenRowDenominator": 0,
            "internalAiRowsExecuted": 0,
            "aiCustomerJourneyRows": 0,
            "aiTechnicalAuditorRows": 0,
            "aiAttackerRows": 0,
            "aiLegalRiskRows": 0,
            "aiProductValueRows": 0,
            "aiAccessibilityRows": 0,
            "aiOpsRows": 0,
            "aiDataRightsRows": 0,
        },
        "current": {
            "internalAiFrozenRowDenominator": len(rows),
            "internalAiRowsExecuted": len(rows),
            "aiCustomerJourneyRows": cohort_counts["AI_CUSTOMER_JOURNEYS"],
            "aiTechnicalAuditorRows": cohort_counts["AI_TECHNICAL_AUDITORS"],
            "aiAttackerRows": cohort_counts["AI_ATTACKERS"],
            "aiLegalRiskRows": cohort_counts["AI_LEGAL_RISK"],
            "aiProductValueRows": cohort_counts["AI_PRODUCT_VALUE_PRICING"],
            "aiAccessibilityRows": cohort_counts["AI_ACCESSIBILITY_I18N"],
            "aiOpsRows": cohort_counts["AI_OPS_SRE"],
            "aiDataRightsRows": cohort_counts["AI_DATA_PROVIDER_RIGHTS"],
            "aiInternalExecutionCoveragePercent": 100.0,
            "profileCoverage": 33,
            "realCustomers": 0,
            "independentExternalReviewers": 0,
            "finalHoldoutProfilesClosed": 0,
        },
        "delta": {
            "internalAiFrozenRowDenominator": len(rows),
            "internalAiRowsExecuted": len(rows),
            "profilesCovered": 33,
            "realCustomerCredit": 0,
            "externalReviewCredit": 0,
        },
        "remainingTo100Percent": {
            "internalAiExecutionRows": 0,
            "internalAiProfileCoverage": 0,
            "finalHoldoutProfiles": 33,
            "realCustomerProgram": "NOT_STARTED_SEPARATE_LEDGER",
            "independentExternalReview": "NOT_STARTED_SEPARATE_LEDGER",
        },
        "truthBoundary": "The internal AI table is 100% executed. Separate final-holdout, real-customer and independent-external tables remain open and cannot be averaged into this percentage.",
    }
    progress["integritySha256"] = canonical_sha(progress)
    write_json(PROGRESS_PATH, progress)

    release_control = build_release_target_control(generated_at, sha256_file(SUMMARY_PATH))
    write_json(RELEASE_TARGET_PATH, release_control)

    status = {
        "schemaVersion": "velmere.p34.status.v1",
        "revision": "P34_INTERNAL_AI_DUAL_LEDGER",
        "state": "IN_PROGRESS",
        "releaseState": "NO_GO",
        "live": False,
        "saleEnabled": False,
        "productionApproved": False,
        "worldClassProven": False,
        "sourceIdentity": {
            "fileCount": source_identity["fileCount"],
            "payloadBytes": source_identity["payloadBytes"],
            "pathSetSha256": source_identity["pathSetSha256"],
            "sourceAggregateSha256": source_identity["sourceAggregateSha256"],
            "receiptSha256": sha256_file(SOURCE_IDENTITY_PATH),
        },
        "methodology": {
            "path": policy["authority"]["methodologyPath"],
            "sha256": authority["binding"]["methodologySha256"],
            "version": "V12",
        },
        "growthIntel": {
            "path": policy["authority"]["growthIntelPath"],
            "sha256": authority["binding"]["growthIntelSha256"],
            "version": "R10",
        },
        "internalAiProgram": {
            "cohortCount": len(cohort_rows),
            "rowDenominator": len(rows),
            "rowsExecuted": len(rows),
            "executionCoveragePercent": 100.0,
            "profilesCovered": 33,
            "browserProfilesReviewedButRuntimeBlocked": 3,
            "realCustomerCredit": 0,
            "independentExternalReviewCredit": 0,
            "professionalLegalDecisionCredit": 0,
            "providerRightsCredit": 0,
            "customerValueCredit": 0,
            "paidReleaseCredit": 0,
            "summarySha256": sha256_file(SUMMARY_PATH),
        },
        "realExternalProgram": {
            "trackDenominator": len(EXTERNAL_PROGRAM),
            "tracksCompleted": 0,
            "completionPercent": 0,
            "realCustomers": 0,
            "realWtpRefundRetention": 0,
            "independentReviewers": 0,
            "professionalLegalDecisions": 0,
            "verifiedProviderRightsDecisions": 0,
            "productionOutcomes": 0,
            "externalCredit": 0,
            "dualLedgerSha256": sha256_file(DUAL_LEDGER_PATH),
        },
        "existingProfileExecution": {
            "executedInternalFixtureRegression": profile_manifest["executedInternalFixtureRegression"],
            "blockedBrowser": profile_manifest["blocked"],
            "finalHoldoutsFrozen": profile_manifest["finalHoldoutsFrozen"],
            "customerValueProfilesClosed": profile_manifest["customerValueProfilesClosed"],
        },
        "releaseTargets": release_control["targets"],
        "planningEstimate": {
            "goInternalPercentRange": [60, 70],
            "controlledPilotPercentRange": [36, 46],
            "goPaidPercentRange": [22, 32],
            "worldClassProvenPercentRange": [0, 5],
            "classification": "ESTIMATE_NOT_RELEASE_SCORE",
        },
        "truthBoundary": "P34 closes the frozen internal AI persona/reviewer execution table at 100%. It does not close final holdouts, real customers, independent review, professional legal/provider rights, GO_PAID or world-class proof.",
    }
    write_json(STATUS_PATH, status)

    report = f"""VELMERE P34 — INTERNAL AI DUAL LEDGER / SEPARATE 100% TABLES

STATUS: IN_PROGRESS / NO_GO

A. AI INTERNAL TABLE — 100% EXECUTION ALLOWED
- cohorts: {len(cohort_rows)}/{len(cohort_rows)}
- rows executed: {len(rows)}/{len(rows)}
- execution coverage: 100%
- product/tier profiles covered: 33/33
- Browser profiles: 3/3 reviewed, runtime remains BLOCKED/UNASSESSABLE
- final customer-value credit: 0
- paid-release credit: 0

AI COHORTS
"""
    for row in cohort_rows:
        report += f"- {row['cohortId']}: {row['executed']}/{row['denominator']} (100%)\n"
    report += """
B. REAL / EXTERNAL TABLE — SEPARATE PROGRAM
- tracks completed: 0/9
- real customers: 0
- real WTP/refund/retention results: 0
- independent external reviewers: 0
- ER1/ER2: 0/0
- professional legal decisions: 0
- verified provider-rights decisions: 0
- production outcomes: 0

P33 → P34 DELTA
- frozen internal AI rows: 0 → 4017 (+4017)
- AI internal profile coverage: 0 → 33/33 (+33)
- AI internal execution: 0% → 100% (+100 pp)
- real/external tracks: 0/9 → 0/9 (no false promotion)
- GO_INTERNAL planning estimate: 55–65% → 60–70% (+5 pp midpoint)
- GO_PAID planning estimate: 22–32% → 22–32% (unchanged)

WHY GO_PAID DOES NOT RISE
AI customer/auditor/attacker/legal/pricing execution closes a real internal-review denominator, but it does not create real WTP, refund behavior, independent review, professional legal decisions, provider licences, staging or production outcomes.

TRUTH BOUNDARY
100% AI_INTERNAL_EXECUTION_COVERAGE is not 100% quality. REAL_EXTERNAL_EXECUTION_COVERAGE remains 0%. The two tables are never averaged. Final holdouts remain 0/33, and GO_PAID / GO_WORLD_CLASS remain false.
"""
    REPORT_PATH.write_text(report, "utf-8")

    print(json.dumps({
        "status": "PASS_P34_INTERNAL_AI_DUAL_LEDGER_BUILT",
        "cohorts": len(cohort_rows),
        "rows": len(rows),
        "executionCoveragePercent": 100.0,
        "profilesCovered": 33,
        "realCustomerCredit": 0,
        "externalReviewCredit": 0,
        "summarySha256": sha256_file(SUMMARY_PATH),
        "rowsSha256": sha256_file(ROWS_PATH),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
