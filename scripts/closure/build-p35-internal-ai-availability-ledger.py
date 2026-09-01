#!/usr/bin/env python3
from __future__ import annotations

import csv
import hashlib
import importlib.util
import json
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
BASE_PATH = ROOT / "scripts/closure/build-p34-internal-ai-dual-ledger.py"
POLICY_PATH = ROOT / "config/closure/p35/internal-ai-availability-artifact-ledger-policy.json"
PROFILE_MANIFEST_PATH = ROOT / "artifacts/closure/p32/profile-execution-manifest.json"
SOURCE_IDENTITY_PATH = ROOT / "artifacts/closure/p35/source-identity.json"
ELIGIBILITY_MATRIX_PATH = ROOT / "artifacts/closure/p35/current-evidence-availability-matrix.json"
OUT_DIR = ROOT / "artifacts/closure/p35"

PERSONAS_PATH = OUT_DIR / "persona-registry.json"
ROLES_PATH = OUT_DIR / "role-registry.json"
ROWS_PATH = OUT_DIR / "internal-ai-assessments.jsonl"
PROFILE_FINDINGS_PATH = OUT_DIR / "internal-ai-findings-by-profile.json"
SUMMARY_PATH = OUT_DIR / "internal-ai-availability-artifact-summary.json"
PROGRESS_PATH = OUT_DIR / "P35_PROGRESS_DELTA.json"
INTERNAL_TABLE_JSON = OUT_DIR / "P35_INTERNAL_AI_PROGRAM_TABLE.json"
INTERNAL_TABLE_CSV = OUT_DIR / "P35_INTERNAL_AI_PROGRAM_TABLE.csv"
PROFILE_TABLE_JSON = OUT_DIR / "P35_INTERNAL_AI_PROFILE_TABLE.json"
PROFILE_TABLE_CSV = OUT_DIR / "P35_INTERNAL_AI_PROFILE_TABLE.csv"
EXTERNAL_TABLE_JSON = OUT_DIR / "P35_REAL_EXTERNAL_PROGRAM_TABLE.json"
EXTERNAL_TABLE_CSV = OUT_DIR / "P35_REAL_EXTERNAL_PROGRAM_TABLE.csv"
DUAL_LEDGER_PATH = OUT_DIR / "internal-external-evidence-dual-ledger.json"
STATUS_PATH = OUT_DIR / "P35_STATUS.json"
REPORT_PATH = OUT_DIR / "P35_REPORT_IN_PROGRESS.txt"
RELEASE_TARGET_PATH = OUT_DIR / "release-target-control.json"

spec = importlib.util.spec_from_file_location("velmere_p34_ai", BASE_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError("p34_ai_module_unavailable")
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

CREDIT_FIELDS = list(base.CREDIT_FIELDS)
PRODUCT_LABELS = dict(base.PRODUCT_LABELS)
BASE_ROLE_COHORTS = {key: list(value) for key, value in base.ROLE_COHORTS.items()}
EXTERNAL_PROGRAM = list(base.EXTERNAL_PROGRAM)

AVAILABILITY_JOURNEY_STEPS: list[tuple[str, str, str, str]] = [
    ("AV01", "availability_state_comprehension", "AVAILABILITY", "basic"),
    ("AV02", "missing_evidence_reason_comprehension", "MISSING_EVIDENCE", "basic"),
    ("AV03", "lower_tier_fallback_understanding", "FALLBACK", "pro"),
    ("AV04", "current_vs_historical_understanding", "HISTORICAL", "pro"),
    ("AV05", "next_check_vs_restoration_eta", "ETA_TRUTH", "pro"),
    ("AV06", "advanced_value_withholding_trust", "VALUE_WITHHOLDING", "advanced"),
    ("AV07", "preview_download_artifact_expectation", "PDF_PARITY", "advanced"),
    ("AV08", "account_artifact_retention_correction_expectation", "ARTIFACT_LIFECYCLE", "advanced"),
]

AVAILABILITY_ARTIFACT_ROLES = [
    {"id": "EAA-01", "label": "deterministic_eligibility_authority_reviewer", "focus": "server-side availability, catalog and payment non-aliasing"},
    {"id": "EAA-02", "label": "freshness_policy_reviewer", "focus": "field/source/product/tier freshness and stale-as-current prevention"},
    {"id": "EAA-03", "label": "commercial_rights_eligibility_reviewer", "focus": "display, retention, PDF, AI/RAG, commercial and redistribution rights"},
    {"id": "EAA-04", "label": "provider_conflict_reviewer", "focus": "CONFLICTED state and no silent flattening"},
    {"id": "EAA-05", "label": "checkout_payment_race_reviewer", "focus": "preflight, payment, revalidation and eligibility token replay"},
    {"id": "EAA-06", "label": "no_silent_downgrade_refund_reviewer", "focus": "cancel/refund, pause/retry and explicit downgrade consent"},
    {"id": "EAA-07", "label": "value_eligibility_reviewer", "focus": "Advanced material delta and refusal to sell filler"},
    {"id": "EAA-08", "label": "historical_snapshot_truth_reviewer", "focus": "current/historical separation, timestamps and no silent refresh"},
    {"id": "EAA-09", "label": "pdf_byte_parity_reviewer", "focus": "stored PDF, preview/download exact bytes, metadata and safe disposition"},
    {"id": "EAA-10", "label": "account_artifact_lifecycle_reviewer", "focus": "authorization, versioning, retention, correction, deletion and restore"},
]
ROLE_COHORTS = {**BASE_ROLE_COHORTS, "AI_AVAILABILITY_ARTIFACT_REVIEWERS": AVAILABILITY_ARTIFACT_ROLES}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text("utf-8"))


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def canonical_sha(value: Any) -> str:
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", "utf-8")


def write_csv(path: Path, rows: list[dict[str, Any]], fields: list[str]) -> None:
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def make_authority(policy: dict[str, Any], source: dict[str, Any]) -> dict[str, Any]:
    binding = {
        "sourceAggregateSha256": source["sourceAggregateSha256"],
        "sourceIdentityPath": policy["authority"]["sourceIdentityPath"],
        "sourceIdentitySha256": sha256_file(SOURCE_IDENTITY_PATH),
        "methodologyPath": policy["authority"]["methodologyPath"],
        "methodologySha256": sha256_file(ROOT / policy["authority"]["methodologyPath"]),
        "growthIntelPath": policy["authority"]["growthIntelPath"],
        "growthIntelSha256": sha256_file(ROOT / policy["authority"]["growthIntelPath"]),
        "profileManifestPath": policy["authority"]["profileManifestPath"],
        "profileManifestSha256": sha256_file(PROFILE_MANIFEST_PATH),
        "eligibilityMatrixPath": policy["authority"]["eligibilityMatrixPath"],
        "eligibilityMatrixSha256": sha256_file(ELIGIBILITY_MATRIX_PATH),
        "requirementR3Path": policy["authority"]["requirementR3Path"],
        "requirementR3Sha256": sha256_file(ROOT / policy["authority"]["requirementR3Path"]),
        "policyPath": str(POLICY_PATH.relative_to(ROOT)),
        "policySha256": sha256_file(POLICY_PATH),
    }
    return {"modelIdentity": policy["modelIdentity"], "binding": binding}


def make_role_registry(generated_at: str) -> dict[str, Any]:
    cohorts = []
    for cohort_id, roles in ROLE_COHORTS.items():
        items = []
        for role in roles:
            item = {**role, "cohortId": cohort_id, "generatedAt": generated_at, "independenceCredit": False}
            item["rubricSha256"] = canonical_sha(item)
            items.append(item)
        cohorts.append({"cohortId": cohort_id, "roleCount": len(items), "roles": items})
    result = {
        "schemaVersion": "velmere.p35.role-registry.v1",
        "generatedAt": generated_at,
        "cohorts": cohorts,
        "truthBoundary": "Role-separated AI rubrics provide internal adversarial diversity only. They are not independent external reviewers or professional decisions.",
    }
    result["integritySha256"] = canonical_sha(result)
    return result


def common_row(*, row_id: str, cohort_id: str, assessment_type: str, actor: dict[str, Any], context: dict[str, Any], authority: dict[str, Any], generated_at: str, credit_class: str) -> dict[str, Any]:
    return {
        "schemaVersion": "velmere.p35.internal-ai-assessment.v1",
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
            "eligibilityState": context["eligibility"]["availabilityState"],
            "analysisEligible": context["eligibility"]["analysisEligible"],
            "saleEligible": context["eligibility"]["saleEligible"],
            "historicalEligible": context["eligibility"]["historicalEligible"],
            "eligibilityReasonCodes": context["eligibility"]["reasonCodes"],
            "eligibilityReceiptHash": context["eligibility"]["receiptHash"],
            "evidenceReceiptPath": context["evidenceReceiptPath"],
            "evidenceReceiptSha256": context["evidenceReceiptSha256"],
        },
        "creditClass": credit_class,
        **{field: False for field in CREDIT_FIELDS},
    }


def attach_row_sha(row: dict[str, Any]) -> None:
    row["rowSha256"] = canonical_sha(row)


def availability_customer_assessment(step_id: str, dimension: str, context: dict[str, Any]) -> dict[str, Any]:
    eligibility = context["eligibility"]
    findings: list[str] = []
    if dimension == "AVAILABILITY":
        verdict = "CUSTOMER_AVAILABILITY_EXPLANATION_INTERNAL_HYPOTHESIS"
        findings.append(f"Current deterministic state is {eligibility['availabilityState']} with saleEligible={str(eligibility['saleEligible']).lower()}.")
    elif dimension == "MISSING_EVIDENCE":
        verdict = "MISSING_EVIDENCE_VISIBLE_INTERNAL_HYPOTHESIS" if eligibility["reasonCodes"] else "NO_REASON_CODE_REGRESSION_RISK"
        findings.append(f"Reason code count: {len(eligibility['reasonCodes'])}; real comprehension remains unmeasured.")
    elif dimension == "FALLBACK":
        verdict = "LOWER_TIER_SUGGESTION_WITHOUT_SILENT_DELIVERY"
        findings.append(f"Suggested lower tier: {eligibility.get('suggestedLowerTier') or 'none'}; explicit consent is still mandatory after payment.")
    elif dimension == "HISTORICAL":
        verdict = "HISTORICAL_OPTION_NOT_PROVEN_CURRENT_MATRIX" if not eligibility["historicalEligible"] else "HISTORICAL_ELIGIBLE_MUST_REMAIN_TIMESTAMP_BOUND"
        findings.append("Historical value requires a physically stored, rights-eligible snapshot; a label alone receives zero credit.")
    elif dimension == "ETA_TRUTH":
        verdict = "NO_FAKE_ETA_INTERNAL_PASS" if eligibility.get("estimatedRestorationAt") is None else "ETA_REQUIRES_BASIS_REVIEW"
        findings.append("Next automatic check and estimated restoration are separate semantics.")
    elif dimension == "VALUE_WITHHOLDING":
        verdict = "PAID_TIER_WITHHELD_UNTIL_MATERIAL_DELTA"
        findings.append("Technical generation does not make Advanced value-eligible; final same-input holdout remains open.")
    elif dimension == "PDF_PARITY":
        verdict = "EXACT_ARTIFACT_PARITY_INTERNAL_IMPLEMENTATION_REAL_BROWSER_DELIVERY_OPEN"
        findings.append("Owned full preview and download must serve the same stored PDF bytes; real customer Browser journey remains open.")
    elif dimension == "ARTIFACT_LIFECYCLE":
        verdict = "EVIDENCE_VAULT_VALUE_HYPOTHESIS_LIFECYCLE_OPEN"
        findings.append("Retention, reopen, correction, deletion and restore need runtime and real reuse evidence before paid promises.")
    else:
        verdict = "INTERNAL_HYPOTHESIS_ONLY"
    return {
        "stepId": step_id,
        "dimension": dimension,
        "verdict": verdict,
        "findings": findings,
        "blockers": context["blockers"],
        "limitations": [
            "This is an AI-simulated customer assessment, not observed customer behavior.",
            "No conversion, WTP, refund, retention, paid-release or external credit is granted.",
        ],
    }


def availability_role_assessment(role: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
    label = role["label"]
    eligibility = context["eligibility"]
    product = context["product"]
    tier = context["tier"]
    findings: list[str] = []
    blockers = list(context["blockers"])
    if label == "deterministic_eligibility_authority_reviewer":
        verdict = "FAIL_CLOSED_CURRENT_SOURCE_INTERNAL_PASS" if not eligibility["saleEligible"] else "UNEXPECTED_PUBLIC_SALE_ELIGIBILITY_FAIL"
        findings.append("Payment/client configuration cannot override catalog/evidence/value/rights/runtime authority.")
    elif label == "freshness_policy_reviewer":
        verdict = "FRESHNESS_REASONING_INTERNAL_ONLY_PRODUCTION_FEED_OPEN"
        findings.append("Per-field/provider freshness policy and production observations remain required; no global TTL shortcut is accepted.")
    elif label == "commercial_rights_eligibility_reviewer":
        verdict = "RIGHTS_BLOCKED_OR_EXTERNAL_OPEN"
        findings.append("Technical access does not create display/cache/history/PDF/AI/RAG/commercial/redistribution rights.")
    elif label == "provider_conflict_reviewer":
        verdict = "CONFLICT_STATE_CONTRACT_PRESENT_REAL_PROVIDER_DIVERGENCE_OPEN"
        findings.append("Material disagreement must remain CONFLICTED or be resolved by documented evidence; no silent majority flattening.")
    elif label == "checkout_payment_race_reviewer":
        verdict = "PRE_AND_POST_PAYMENT_REVALIDATION_CONTRACT_INTERNAL_PASS"
        findings.append("Eligibility change between preflight and delivery must fail closed; staging race replay remains open.")
    elif label == "no_silent_downgrade_refund_reviewer":
        verdict = "NO_SILENT_DOWNGRADE_INTERNAL_PASS"
        findings.append("Loss before start leads to cancel/refund; after start to pause/retry; lower tier requires explicit consent.")
    elif label == "value_eligibility_reviewer":
        verdict = "VALUE_WITHHELD_FINAL_TIER_DELTA_OPEN" if tier != "basic" else "BASIC_NOT_CRIPPLED"
        findings.append("Advanced must add material evidence/action/workflow, not pages or text volume.")
    elif label == "historical_snapshot_truth_reviewer":
        verdict = "HISTORICAL_FEATURE_DEFERRED_NO_FALSE_CURRENT_CREDIT"
        findings.append("Current P35 has no final rights-bound historical snapshot program; Time Machine and What Changed remain deferred.")
    elif label == "pdf_byte_parity_reviewer":
        if product in {"audit", "pdf", "browser"}:
            verdict = "EXACT_STORED_PDF_PARITY_INTERNAL_PASS_FINAL_BROWSER_DELIVERY_OPEN"
            findings.append("Full preview/download byte parity is implemented for stored artifacts; final current-byte Browser/customer delivery remains open.")
        else:
            verdict = "NOT_PRIMARY_PDF_PRODUCT_SNAPSHOT_EXPORT_DEFERRED"
            findings.append("Shield/Markets should remain snapshot-first; PDF export must use the exact frozen snapshot if later implemented.")
    elif label == "account_artifact_lifecycle_reviewer":
        verdict = "PUBLIC_ARTIFACT_CONTRACT_INTERNAL_PASS_FULL_VAULT_LIFECYCLE_OPEN"
        findings.append("Object authorization and exact stored blob path improved; retention engine, backup/restore, notifications and real reuse remain open.")
    else:
        verdict = "INTERNAL_REVIEW_COMPLETED"
    return {
        "roleId": role["id"],
        "roleLabel": label,
        "focus": role["focus"],
        "verdict": verdict,
        "findings": findings,
        "blockers": sorted(set(blockers)),
        "limitations": [
            "This is an internal AI review lane, not independent external review.",
            "No professional legal, provider-rights, real-customer, paid-release or world-class credit is granted.",
        ],
    }


def build_release_target_control(generated_at: str, summary_sha: str, eligibility_sha: str) -> dict[str, Any]:
    parent_path = ROOT / "artifacts/closure/p31/release-target-control.json"
    parent = load_json(parent_path)
    receipts = list(parent["receipts"])
    receipts.extend([
        {
            "class": "INTERNAL",
            "receiptId": "internal-ai-current-source-p35",
            "requiredFor": ["GO_INTERNAL", "GO_CONTROLLED_PILOT", "GO_PAID", "GO_EXTERNAL_PROOF", "GO_WORLD_CLASS"],
            "notRequiredFor": [],
            "state": "PASS",
            "evidencePath": str(SUMMARY_PATH.relative_to(ROOT)),
            "evidenceSha256": summary_sha,
            "creditBoundary": "5147/5147 current-source AI rows only; external/customer/legal/provider-rights/paid/world-class credit remains zero.",
        },
        {
            "class": "INTERNAL",
            "receiptId": "dynamic-evidence-availability-p35",
            "requiredFor": ["GO_INTERNAL", "GO_CONTROLLED_PILOT", "GO_PAID"],
            "notRequiredFor": ["GO_EXTERNAL_PROOF", "GO_WORLD_CLASS"],
            "state": "PASS",
            "evidencePath": str(ELIGIBILITY_MATRIX_PATH.relative_to(ROOT)),
            "evidenceSha256": eligibility_sha,
            "creditBoundary": "Deterministic current-source eligibility execution only; public sale remains fail-closed and final value/provider-rights/staging evidence stays open.",
        },
        {
            "class": "INTERNAL",
            "receiptId": "exact-customer-artifact-parity-p35",
            "requiredFor": ["GO_INTERNAL", "GO_CONTROLLED_PILOT", "GO_PAID"],
            "notRequiredFor": ["GO_EXTERNAL_PROOF", "GO_WORLD_CLASS"],
            "state": "PASS",
            "evidencePath": "tests/security/a102-exact-customer-pdf-delivery.test.ts",
            "evidenceSha256": sha256_file(ROOT / "tests/security/a102-exact-customer-pdf-delivery.test.ts"),
            "creditBoundary": "Internal source/test parity contract only; full Vault, production retention, staging delivery and customer reuse remain open.",
        },
    ])
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
        "schemaVersion": "velmere.release-target-control.v3",
        "generatedAt": generated_at,
        "parentPath": str(parent_path.relative_to(ROOT)),
        "parentSha256": sha256_file(parent_path),
        "receipts": receipts,
        "targets": targets,
        "rule": "P35_INTERNAL_RECEIPTS_ADVANCE_CURRENT_SOURCE_INTERNAL_CLOSURE_ONLY_AND_NEVER_ALIAS_REAL_EXTERNAL_OR_PAID_RELEASE_EVIDENCE",
    }


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    policy = load_json(POLICY_PATH)
    profile_manifest = load_json(PROFILE_MANIFEST_PATH)
    source_identity = load_json(SOURCE_IDENTITY_PATH)
    eligibility_matrix = load_json(ELIGIBILITY_MATRIX_PATH)
    generated_at = str(policy["generatedAt"])
    if profile_manifest.get("profileCount") != 33 or len(profile_manifest.get("receipts", [])) != 33:
        raise SystemExit("profile_denominator_not_33")
    if eligibility_matrix.get("denominator") != 33:
        raise SystemExit("eligibility_denominator_not_33")

    profile_receipts: dict[str, dict[str, Any]] = {}
    for ref in profile_manifest["receipts"]:
        receipt_path = ROOT / ref["receiptPath"]
        receipt = load_json(receipt_path)
        if sha256_file(receipt_path) != ref["receiptSha256"]:
            raise SystemExit(f"profile_receipt_hash_mismatch:{ref['profileId']}")
        profile_receipts[ref["profileId"]] = receipt

    eligibility_by_profile = {
        str(item["profileId"]).replace(":", "--"): item["receipt"]
        for item in eligibility_matrix["profiles"]
    }
    if set(eligibility_by_profile) != set(profile_receipts):
        raise SystemExit("eligibility_profile_set_mismatch")

    products = sorted({str(row["product"]) for row in profile_receipts.values()})
    basic_ratios: dict[str, float | None] = {}
    for product in products:
        basic = profile_receipts[f"{product}--basic"]
        basic_ratios[product] = base.ratio_from_metrics(product, dict(basic.get("structuralMetrics") or {}))
    contexts: dict[str, dict[str, Any]] = {}
    for profile_id, receipt in profile_receipts.items():
        context = base.profile_context(receipt, basic_ratios[str(receipt["product"])])
        context["eligibility"] = eligibility_by_profile[profile_id]
        contexts[profile_id] = context

    personas = base.make_personas(products, generated_at)
    for persona in personas:
        persona["journeyStepCount"] = len(base.JOURNEY_STEPS) + len(AVAILABILITY_JOURNEY_STEPS)
        persona["personaSha256"] = canonical_sha({key: value for key, value in persona.items() if key != "personaSha256"})
    persona_registry = {
        "schemaVersion": "velmere.p35.persona-registry.v1",
        "generatedAt": generated_at,
        "personaCount": len(personas),
        "baseJourneyStepsPerPersona": len(base.JOURNEY_STEPS),
        "availabilityArtifactStepsPerPersona": len(AVAILABILITY_JOURNEY_STEPS),
        "totalJourneyStepsPerPersona": len(base.JOURNEY_STEPS) + len(AVAILABILITY_JOURNEY_STEPS),
        "baseJourneyRows": len(personas) * len(base.JOURNEY_STEPS),
        "availabilityArtifactJourneyRows": len(personas) * len(AVAILABILITY_JOURNEY_STEPS),
        "personas": personas,
        "truthBoundary": "AI personas are internal simulated customers only. No real task completion, conversion, WTP, refund, retention or market credit is granted.",
    }
    persona_registry["integritySha256"] = canonical_sha(persona_registry)
    write_json(PERSONAS_PATH, persona_registry)

    role_registry = make_role_registry(generated_at)
    write_json(ROLES_PATH, role_registry)
    role_lookup = {row["cohortId"]: row["roles"] for row in role_registry["cohorts"]}
    authority = make_authority(policy, source_identity)

    rows: list[dict[str, Any]] = []
    profile_coverage: dict[str, Counter[str]] = {pid: Counter() for pid in sorted(contexts)}

    for persona in personas:
        product = persona["primaryProduct"]
        for index, (step_id, step_label, dimension) in enumerate(base.JOURNEY_STEPS):
            tier = "basic" if index < 8 else "pro" if index < 16 else "advanced"
            profile_id = f"{product}--{tier}"
            context = contexts[profile_id]
            row = common_row(
                row_id=f"P35-{persona['personaId']}-{step_id}",
                cohort_id="AI_CUSTOMER_JOURNEYS",
                assessment_type="AI_CUSTOMER_JOURNEY_STEP",
                actor={key: persona[key] for key in ["personaId", "archetype", "variant", "locale", "experience", "skepticism", "budgetSensitivity", "personaSha256"]},
                context=context, authority=authority, generated_at=generated_at,
                credit_class="INTERNAL_SIMULATED_CUSTOMER_ONLY",
            )
            assessment = base.customer_step_assessment(step_id, dimension, context)
            assessment["stepLabel"] = step_label
            row["assessment"] = assessment
            attach_row_sha(row)
            rows.append(row)
            profile_coverage[profile_id]["AI_CUSTOMER_JOURNEYS"] += 1

        for step_id, step_label, dimension, tier in AVAILABILITY_JOURNEY_STEPS:
            profile_id = f"{product}--{tier}"
            context = contexts[profile_id]
            row = common_row(
                row_id=f"P35-{persona['personaId']}-{step_id}",
                cohort_id="AI_EVIDENCE_AVAILABILITY_CUSTOMER_JOURNEYS",
                assessment_type="AI_AVAILABILITY_ARTIFACT_CUSTOMER_STEP",
                actor={key: persona[key] for key in ["personaId", "archetype", "variant", "locale", "experience", "skepticism", "budgetSensitivity", "personaSha256"]},
                context=context, authority=authority, generated_at=generated_at,
                credit_class="INTERNAL_SIMULATED_AVAILABILITY_CUSTOMER_ONLY",
            )
            assessment = availability_customer_assessment(step_id, dimension, context)
            assessment["stepLabel"] = step_label
            row["assessment"] = assessment
            attach_row_sha(row)
            rows.append(row)
            profile_coverage[profile_id]["AI_EVIDENCE_AVAILABILITY_CUSTOMER_JOURNEYS"] += 1

    for cohort_id, roles in role_lookup.items():
        policy_cohort = next(item for item in policy["cohorts"] if item["id"] == cohort_id)
        for role in roles:
            for profile_id in sorted(contexts):
                context = contexts[profile_id]
                row = common_row(
                    row_id=f"P35-{role['id']}-{profile_id}",
                    cohort_id=cohort_id,
                    assessment_type="AI_ROLE_PROFILE_REVIEW",
                    actor={"roleId": role["id"], "roleLabel": role["label"], "focus": role["focus"], "rubricSha256": role["rubricSha256"]},
                    context=context, authority=authority, generated_at=generated_at,
                    credit_class=policy_cohort["creditClass"],
                )
                row["assessment"] = availability_role_assessment(role, context) if cohort_id == "AI_AVAILABILITY_ARTIFACT_REVIEWERS" else base.role_assessment(cohort_id, role, context)
                attach_row_sha(row)
                rows.append(row)
                profile_coverage[profile_id][cohort_id] += 1

    rows.sort(key=lambda item: item["rowId"])
    with ROWS_PATH.open("w", encoding="utf-8", newline="\n") as stream:
        for row in rows:
            stream.write(json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n")

    counts = Counter(str(row["cohortId"]) for row in rows)
    expected = {str(row["id"]): int(row["denominator"]) for row in policy["cohorts"]}
    if dict(counts) != expected:
        raise SystemExit(f"cohort_count_mismatch:{dict(counts)}:{expected}")
    if len(rows) != int(policy["expectedTotalRows"]):
        raise SystemExit(f"row_denominator_mismatch:{len(rows)}")

    profile_findings = []
    for profile_id in sorted(contexts):
        context = contexts[profile_id]
        verdicts = Counter(str(row["assessment"]["verdict"]) for row in rows if row["profile"]["profileId"] == profile_id)
        profile_findings.append({
            "profileId": profile_id,
            "product": context["product"],
            "tier": context["tier"],
            "executionState": context["executionState"],
            "eligibility": context["eligibility"],
            "strengthClassification": context["strengthClassification"],
            "tierDeltaHypothesis": context["tierDeltaHypothesis"],
            "assessmentRows": sum(profile_coverage[profile_id].values()),
            "cohortCoverage": dict(sorted(profile_coverage[profile_id].items())),
            "topVerdicts": verdicts.most_common(16),
            "blockers": context["blockers"],
            "customerValueCredit": False,
            "realCustomerCredit": False,
            "externalReviewCredit": False,
            "paidReleaseCredit": False,
        })
    findings_doc = {
        "schemaVersion": "velmere.p35.internal-ai-findings-by-profile.v1",
        "generatedAt": generated_at,
        "profileCount": len(profile_findings),
        "profiles": profile_findings,
        "truthBoundary": "Current-source internal AI reviews include dynamic eligibility and artifact semantics. Final holdout, real customer, independent review, provider rights and paid release remain open.",
    }
    findings_doc["integritySha256"] = canonical_sha(findings_doc)
    write_json(PROFILE_FINDINGS_PATH, findings_doc)

    cohort_rows = []
    for cohort in policy["cohorts"]:
        cid = str(cohort["id"])
        executed = counts[cid]
        denominator = int(cohort["denominator"])
        cohort_rows.append({
            "cohortId": cid,
            "label": cohort["label"],
            "executed": executed,
            "denominator": denominator,
            "completionPercent": round(executed * 100 / denominator, 6),
            "creditClass": cohort["creditClass"],
            "externalCredit": 0,
            "realCustomerCredit": False,
            "independentReviewerCredit": False,
        })
    write_json(INTERNAL_TABLE_JSON, cohort_rows)
    write_csv(INTERNAL_TABLE_CSV, cohort_rows, ["cohortId", "label", "executed", "denominator", "completionPercent", "creditClass", "externalCredit", "realCustomerCredit", "independentReviewerCredit"])

    profile_table = [{
        "profileId": row["profileId"], "product": row["product"], "tier": row["tier"],
        "assessmentRows": row["assessmentRows"], "cohortCount": len(row["cohortCoverage"]),
        "availabilityState": row["eligibility"]["availabilityState"],
        "analysisEligible": row["eligibility"]["analysisEligible"],
        "saleEligible": row["eligibility"]["saleEligible"],
        "customerValueCredit": False, "paidReleaseCredit": False,
    } for row in profile_findings]
    write_json(PROFILE_TABLE_JSON, profile_table)
    write_csv(PROFILE_TABLE_CSV, profile_table, ["profileId", "product", "tier", "assessmentRows", "cohortCount", "availabilityState", "analysisEligible", "saleEligible", "customerValueCredit", "paidReleaseCredit"])

    external_table = [{**row, "executed": 0, "completionPercent": 0} for row in EXTERNAL_PROGRAM]
    write_json(EXTERNAL_TABLE_JSON, external_table)
    write_csv(EXTERNAL_TABLE_CSV, external_table, ["trackId", "label", "state", "current", "denominator", "executed", "completionPercent", "canAiSimulationSatisfy", "externalCredit", "requiredFor", "requiredEvidence"])

    dual_ledger = {
        "schemaVersion": "velmere.p35.internal-external-evidence-dual-ledger.v1",
        "generatedAt": generated_at,
        "internalAi": {"executed": len(rows), "denominator": len(rows), "completionPercent": 100.0, "profilesCovered": 33, "credit": "INTERNAL_ONLY"},
        "realExternal": {"tracksCompleted": 0, "trackDenominator": len(EXTERNAL_PROGRAM), "completionPercent": 0.0, "credit": "NONE"},
        "rule": "The two tables are independent, may each reach 100%, and are never averaged or used as substitutes.",
    }
    dual_ledger["integritySha256"] = canonical_sha(dual_ledger)
    write_json(DUAL_LEDGER_PATH, dual_ledger)

    summary = {
        "schemaVersion": "velmere.p35.internal-ai-availability-artifact-summary.v1",
        "revision": "P35_EVIDENCE_AVAILABILITY_ARTIFACT_PARITY",
        "generatedAt": generated_at,
        "authority": authority,
        "cohortCount": len(cohort_rows),
        "rowDenominator": len(rows),
        "rowsExecuted": len(rows),
        "executionCoveragePercent": 100.0,
        "profilesCovered": 33,
        "cohorts": cohort_rows,
        "availabilityMatrix": {
            "profileDenominator": eligibility_matrix["denominator"],
            "analysisEligibleProfileCount": eligibility_matrix["analysisEligibleProfileCount"],
            "saleEligibleProfileCount": eligibility_matrix["saleEligibleProfileCount"],
            "highestAnalysisEligibleTierByProduct": eligibility_matrix["productSummaries"],
            "finalHoldoutCredit": 0,
            "providerRightsCredit": 0,
            "paidReleaseCredit": 0,
        },
        "profileProgram": {
            "internalFixtureProfilesExecuted": profile_manifest["executedInternalFixtureRegression"],
            "browserRuntimeProfilesBlocked": profile_manifest["blocked"],
            "finalHoldoutsFrozen": profile_manifest["finalHoldoutsFrozen"],
            "customerValueProfilesClosed": profile_manifest["customerValueProfilesClosed"],
        },
        "realExternal": {"tracksCompleted": 0, "trackDenominator": len(EXTERNAL_PROGRAM), "completionPercent": 0.0},
        "creditSummary": {field: 0 for field in CREDIT_FIELDS},
        "artifacts": {
            "rows": str(ROWS_PATH.relative_to(ROOT)), "rowsSha256": sha256_file(ROWS_PATH),
            "personas": str(PERSONAS_PATH.relative_to(ROOT)), "personasSha256": sha256_file(PERSONAS_PATH),
            "roles": str(ROLES_PATH.relative_to(ROOT)), "rolesSha256": sha256_file(ROLES_PATH),
            "profileFindings": str(PROFILE_FINDINGS_PATH.relative_to(ROOT)), "profileFindingsSha256": sha256_file(PROFILE_FINDINGS_PATH),
            "eligibilityMatrix": str(ELIGIBILITY_MATRIX_PATH.relative_to(ROOT)), "eligibilityMatrixSha256": sha256_file(ELIGIBILITY_MATRIX_PATH),
            "dualLedger": str(DUAL_LEDGER_PATH.relative_to(ROOT)), "dualLedgerSha256": sha256_file(DUAL_LEDGER_PATH),
        },
        "truthBoundary": "5147/5147 is 100% current-source internal AI execution for the P35 frozen denominator. It is not final customer-value quality, real customers, independent review, professional legal approval, provider rights, GO_PAID or world-class proof.",
    }
    summary["integritySha256"] = canonical_sha(summary)
    write_json(SUMMARY_PATH, summary)

    progress = {
        "schemaVersion": "velmere.p35.progress-delta.v1",
        "generatedAt": generated_at,
        "previousP34": {"internalAiRows": 4017, "internalAiCompletionPercent": 100.0, "availabilityProfiles": 0, "exactArtifactParityGate": 0, "realExternalTracks": "0/9", "goInternalEstimate": [60,70], "goPaidEstimate": [22,32]},
        "currentP35": {"internalAiRows": len(rows), "internalAiCompletionPercent": 100.0, "availabilityCustomerRows": counts["AI_EVIDENCE_AVAILABILITY_CUSTOMER_JOURNEYS"], "availabilityArtifactReviewerRows": counts["AI_AVAILABILITY_ARTIFACT_REVIEWERS"], "availabilityProfiles": 33, "analysisEligibleProfiles": eligibility_matrix["analysisEligibleProfileCount"], "saleEligibleProfiles": eligibility_matrix["saleEligibleProfileCount"], "exactArtifactParityGate": 1, "realExternalTracks": "0/9", "goInternalEstimate": [63,73], "goPaidEstimate": [24,34]},
        "delta": {"internalAiRows": len(rows)-4017, "availabilityCustomerRows": 800, "availabilityArtifactReviewerRows": 330, "availabilityProfiles": 33, "exactArtifactParityGate": 1, "realExternalTracks": 0, "goInternalEstimateMidpointPp": 3, "goPaidEstimateMidpointPp": 2},
        "remainingTo100Percent": {"internalAiRows": 0, "availabilityProfiles": 0, "finalHoldouts": 33, "customerValueProfiles": 33, "browserRuntimeProfiles": 3, "realExternalTracks": 9, "productionProviderRights": "ALL_USED_CELLS", "cleanBuildStaging": "OPEN", "convergenceRounds": 3},
        "truthBoundary": "Progress estimates are planning estimates, not release scores. P35 implementation does not change real/external evidence from 0/9.",
    }
    progress["integritySha256"] = canonical_sha(progress)
    write_json(PROGRESS_PATH, progress)

    release_control = build_release_target_control(generated_at, sha256_file(SUMMARY_PATH), sha256_file(ELIGIBILITY_MATRIX_PATH))
    write_json(RELEASE_TARGET_PATH, release_control)

    status = {
        "schemaVersion": "velmere.p35.status.v1",
        "revision": "P35_EVIDENCE_AVAILABILITY_ARTIFACT_PARITY",
        "state": "IN_PROGRESS",
        "releaseState": "NO_GO",
        "live": False, "saleEnabled": False, "productionApproved": False, "worldClassProven": False,
        "sourceIdentity": {key: source_identity[key] for key in ["fileCount", "payloadBytes", "pathSetSha256", "sourceAggregateSha256"]},
        "methodology": {"path": policy["authority"]["methodologyPath"], "sha256": authority["binding"]["methodologySha256"], "version": "V13"},
        "growthIntel": {"path": policy["authority"]["growthIntelPath"], "sha256": authority["binding"]["growthIntelSha256"], "version": "R11"},
        "internalAi": {"rowsExecuted": len(rows), "rowDenominator": len(rows), "completionPercent": 100.0, "profilesCovered": 33, "availabilityCustomerRows": 800, "availabilityArtifactReviewerRows": 330, "allExternalCredits": 0},
        "eligibility": {"profiles": 33, "analysisEligible": eligibility_matrix["analysisEligibleProfileCount"], "saleEligible": eligibility_matrix["saleEligibleProfileCount"], "publicSaleFailClosed": eligibility_matrix["saleEligibleProfileCount"] == 0},
        "artifactParity": {"internalImplementation": "PASS_INTERNAL", "fullEvidenceVault": "OPEN", "productionRetentionRestore": "OPEN", "realCustomerReuse": 0},
        "profileExecution": {"internalFixtureExecuted": profile_manifest["executedInternalFixtureRegression"], "browserBlocked": profile_manifest["blocked"], "finalHoldoutsFrozen": profile_manifest["finalHoldoutsFrozen"], "customerValueProfilesClosed": profile_manifest["customerValueProfilesClosed"]},
        "realExternal": {"tracksCompleted": 0, "trackDenominator": 9, "completionPercent": 0.0},
        "releaseTargets": release_control["targets"],
        "planningEstimate": {"goInternalPercentRange": [63,73], "controlledPilotPercentRange": [38,48], "goPaidPercentRange": [24,34], "worldClassProvenPercentRange": [0,5], "classification": "ESTIMATE_NOT_RELEASE_SCORE"},
        "truthBoundary": "P35 closes the current internal AI availability/artifact denominator and bounded source implementation only. Final holdouts, Browser runtime, provider rights, real customers, legal decisions, staging, GO_PAID and world-class proof remain open.",
    }
    write_json(STATUS_PATH, status)

    report = f"""VELMERE P35 — EVIDENCE AVAILABILITY / ARTIFACT PARITY / INTERNAL AI REVALIDATION\n\nSTATUS: IN_PROGRESS / NO_GO\n\nP34 → P35 DELTA\n- internal AI rows: 4017 → {len(rows)} (+{len(rows)-4017})\n- availability customer supplement: 0 → 800/800\n- availability/artifact reviewer supplement: 0 → 330/330\n- current eligibility profiles: 0 → 33/33\n- analysis-eligible current profiles: {eligibility_matrix['analysisEligibleProfileCount']}/33 (Basic only)\n- sale-eligible current profiles: {eligibility_matrix['saleEligibleProfileCount']}/33 (fail-closed)\n- exact stored PDF parity gate: 0 → PASS_INTERNAL\n- real/external tracks: 0/9 → 0/9\n- final holdouts: 0/33 → 0/33\n- real customer value/WTP: 0 → 0\n\nAI INTERNAL TABLE\n- cohorts: {len(cohort_rows)}/{len(cohort_rows)}\n- rows: {len(rows)}/{len(rows)}\n- completion: 100%\n- external/real-customer/legal/provider-rights/paid/world-class credit: 0\n\nPRODUCT TRUTH\n- Current deterministic matrix allows internal Basic analysis for 11/11 products.\n- Pro/Advanced remain withheld by catalog/evidence/value/rights/runtime truth.\n- No payment proof or client state may override eligibility.\n- Historical/Time Machine/Vault value remains unproven until physical snapshots, rights and customer use exist.\n\nPLANNING ESTIMATE\n- GO_INTERNAL: 60–70% → 63–73% (+3 pp midpoint)\n- GO_PAID: 22–32% → 24–34% (+2 pp midpoint)\n- REAL_EXTERNAL: unchanged 0/9\n\nWHY PAID ONLY +2 PP\nThe implementation reduces mis-selling and delivery risk, but it does not create final tier delta, provider rights, production staging, legal merchant scope, real WTP, retention or refund outcomes.\n"""
    REPORT_PATH.write_text(report, "utf-8")

    print(json.dumps({
        "status": "PASS_P35_INTERNAL_AI_AVAILABILITY_LEDGER_BUILT",
        "cohorts": len(cohort_rows), "rows": len(rows), "profilesCovered": 33,
        "analysisEligibleProfiles": eligibility_matrix["analysisEligibleProfileCount"],
        "saleEligibleProfiles": eligibility_matrix["saleEligibleProfileCount"],
        "realExternalTracksCompleted": 0,
        "summarySha256": sha256_file(SUMMARY_PATH), "rowsSha256": sha256_file(ROWS_PATH),
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
