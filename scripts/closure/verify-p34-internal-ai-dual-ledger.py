#!/usr/bin/env python3
from __future__ import annotations

import copy
import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "artifacts/closure/p34"
POLICY_PATH = ROOT / "config/closure/p34/internal-ai-dual-ledger-policy.json"
SUMMARY_PATH = ART / "internal-ai-dual-ledger-summary.json"
ROWS_PATH = ART / "internal-ai-assessments.jsonl"
PROGRESS_PATH = ART / "internal-ai-progress-matrix.json"
DUAL_PATH = ART / "internal-external-evidence-dual-ledger.json"
PERSONAS_PATH = ART / "persona-registry.json"
ROLES_PATH = ART / "role-registry.json"
PROFILE_FINDINGS_PATH = ART / "internal-ai-findings-by-profile.json"
INTERNAL_TABLE_PATH = ART / "P34_INTERNAL_AI_PROGRAM_TABLE.json"
PROFILE_TABLE_PATH = ART / "P34_INTERNAL_AI_PROFILE_TABLE.json"
EXTERNAL_TABLE_PATH = ART / "P34_REAL_EXTERNAL_PROGRAM_TABLE.json"
OUT_PATH = ART / "internal-ai-dual-ledger-verifier-receipt.json"
METHODOLOGY_PATH = ROOT / "docs/authority/VELMERE_METODOLOGIA_FINISHOWANIA_CANONICAL_V12_INTERNAL_AI_DUAL_LEDGER_2026-08-13.txt"
GROWTH_PATH = ROOT / "docs/authority/VELMERE_GROWTH_INTEL_TOP_WORLD_R10_INTERNAL_AI_DUAL_LEDGER_2026-08-13.txt"

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

EXPECTED_COUNTS = {
    "AI_CUSTOMER_JOURNEYS": 2400,
    "AI_TECHNICAL_AUDITORS": 396,
    "AI_ATTACKERS": 264,
    "AI_LEGAL_RISK": 198,
    "AI_PRODUCT_VALUE_PRICING": 264,
    "AI_ACCESSIBILITY_I18N": 165,
    "AI_OPS_SRE": 165,
    "AI_DATA_PROVIDER_RIGHTS": 165,
}


def read_json(path: Path) -> Any:
    return json.loads(path.read_text("utf-8"))


def read_rows() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with ROWS_PATH.open("r", encoding="utf-8") as stream:
        for line_no, line in enumerate(stream, 1):
            if not line.strip():
                continue
            value = json.loads(line)
            if not isinstance(value, dict):
                raise ValueError(f"row_not_object:{line_no}")
            rows.append(value)
    return rows


def canonical_sha(value: Any) -> str:
    return hashlib.sha256(
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def check_integrity(obj: dict[str, Any], field: str) -> bool:
    core = copy.deepcopy(obj)
    actual = core.pop(field, None)
    return actual == canonical_sha(core)


def validate(
    policy: dict[str, Any],
    summary: dict[str, Any],
    progress: dict[str, Any],
    dual: dict[str, Any],
    personas: dict[str, Any],
    roles: dict[str, Any],
    profile_findings: dict[str, Any],
    internal_table: list[dict[str, Any]],
    profile_table: list[dict[str, Any]],
    external_table: list[dict[str, Any]],
    rows: list[dict[str, Any]],
) -> list[str]:
    errors: list[str] = []

    if policy.get("schemaVersion") != "velmere.p34.internal-ai-dual-ledger-policy.v2":
        errors.append("policy_schema")
    if policy.get("revision") != "P34_INTERNAL_AI_DUAL_LEDGER":
        errors.append("policy_revision")
    if policy.get("executionMode") != "MODEL_AUTHORED_ROLE_RUBRIC_DETERMINISTIC_EXPANSION":
        errors.append("execution_mode")
    model = policy.get("modelIdentity") or {}
    if model.get("liveModelCallsForRows") != 0 or model.get("independenceCredit") is not False:
        errors.append("model_identity_credit_boundary")

    policy_counts = {str(item["id"]): int(item["denominator"]) for item in policy.get("cohorts", [])}
    if policy_counts != EXPECTED_COUNTS:
        errors.append(f"policy_cohorts:{policy_counts}")
    if int(policy.get("expectedTotalRows", -1)) != 4017:
        errors.append("policy_total")
    external_policy = policy.get("externalTracks") or []
    if len(external_policy) != 9:
        errors.append(f"policy_external_tracks:{len(external_policy)}")
    if any(item.get("canAiSimulationSatisfy") is not False for item in external_policy):
        errors.append("policy_external_ai_satisfy")

    if len(rows) != 4017:
        errors.append(f"row_count:{len(rows)}")
    counts = Counter(str(row.get("cohortId")) for row in rows)
    if dict(counts) != EXPECTED_COUNTS:
        errors.append(f"row_cohort_counts:{dict(counts)}")

    row_ids: set[str] = set()
    profile_ids: set[str] = set()
    cohort_profiles: dict[str, set[str]] = {key: set() for key in EXPECTED_COUNTS}
    for row in rows:
        row_id = str(row.get("rowId", ""))
        if not row_id:
            errors.append("empty_row_id")
        elif row_id in row_ids:
            errors.append(f"duplicate_row_id:{row_id}")
        row_ids.add(row_id)
        cohort = str(row.get("cohortId", ""))
        profile = row.get("profile") or {}
        profile_id = str(profile.get("profileId", ""))
        profile_ids.add(profile_id)
        if cohort in cohort_profiles:
            cohort_profiles[cohort].add(profile_id)
        if row.get("executionState") != "EXECUTED_INTERNAL_SIMULATION":
            errors.append(f"execution_state:{row_id}")
        for field in CREDIT_FIELDS:
            if row.get(field) is not False:
                errors.append(f"false_credit:{field}:{row_id}")
        if not check_integrity(row, "rowSha256"):
            errors.append(f"row_integrity:{row_id}")
        verdict = str((row.get("assessment") or {}).get("verdict", ""))
        if profile_id.startswith("browser--") and "BLOCKED" not in verdict and "UNASSESSABLE" not in verdict:
            errors.append(f"browser_false_promotion:{row_id}:{verdict}")

    if len(profile_ids) != 33:
        errors.append(f"profile_count:{len(profile_ids)}")
    for cohort, covered in cohort_profiles.items():
        if len(covered) != 33:
            errors.append(f"cohort_profile_coverage:{cohort}:{len(covered)}")

    if personas.get("personaCount") != 100 or personas.get("journeyStepsPerPersona") != 24 or personas.get("journeyRowDenominator") != 2400:
        errors.append("persona_denominator")
    if len(personas.get("personas") or []) != 100:
        errors.append("persona_rows")
    if not check_integrity(personas, "integritySha256"):
        errors.append("persona_integrity")

    role_cohorts = roles.get("cohorts") or []
    role_count = sum(len(item.get("roles") or []) for item in role_cohorts)
    if role_count != 49 or len(role_cohorts) != 7:
        errors.append(f"role_denominator:{len(role_cohorts)}:{role_count}")
    if not check_integrity(roles, "integritySha256"):
        errors.append("role_integrity")

    if profile_findings.get("profileCount") != 33 or len(profile_findings.get("profiles") or []) != 33:
        errors.append("profile_findings_denominator")
    if not check_integrity(profile_findings, "integritySha256"):
        errors.append("profile_findings_integrity")

    if not check_integrity(summary, "integritySha256"):
        errors.append("summary_integrity")
    if summary.get("schemaVersion") != "velmere.p34.internal-ai-dual-ledger-summary.v2":
        errors.append("summary_schema")
    if summary.get("revision") != "P34_INTERNAL_AI_DUAL_LEDGER":
        errors.append("summary_revision")
    if summary.get("totalRowsExecuted") != 4017 or summary.get("totalRowDenominator") != 4017:
        errors.append("summary_rows")
    if summary.get("aiInternalExecutionCoveragePercent") != 100.0:
        errors.append("summary_internal_coverage")
    pc = summary.get("profileCoverage") or {}
    if pc.get("profileCount") != 33 or pc.get("profilesCoveredByCustomerPersonas") != 33 or pc.get("profilesCoveredByEveryReviewerCohort") != 33:
        errors.append("summary_profile_coverage")
    if pc.get("browserProfilesReviewedButRuntimeBlocked") != 3:
        errors.append("summary_browser_boundary")
    qr = summary.get("qualityResult") or {}
    if qr.get("finalHoldoutProfilesClosed") != 0 or qr.get("customerValueProfilesClosed") != 0:
        errors.append("summary_false_quality_promotion")
    if any(int(value or 0) != 0 for value in (summary.get("creditSummary") or {}).values()):
        errors.append("summary_credit_leak")
    if any(int(value or 0) != 0 for value in (summary.get("realExternalLedger") or {}).values()):
        errors.append("summary_external_leak")
    artifacts = summary.get("artifacts") or {}
    if artifacts.get("assessmentRowsSha256") != sha256_file(ROWS_PATH):
        errors.append("summary_rows_hash")

    if not check_integrity(progress, "integritySha256"):
        errors.append("progress_integrity")
    current = progress.get("current") or {}
    if current.get("internalAiRowsExecuted") != 4017 or current.get("aiInternalExecutionCoveragePercent") != 100.0 or current.get("profileCoverage") != 33:
        errors.append("progress_internal")
    if current.get("realCustomers") != 0 or current.get("independentExternalReviewers") != 0 or current.get("finalHoldoutProfilesClosed") != 0:
        errors.append("progress_external_false_credit")

    if not check_integrity(dual, "ledgerSha256"):
        errors.append("dual_integrity")
    internal = dual.get("internalAiSimulated") or {}
    if internal.get("completionPercent") != 100 or internal.get("assessmentCount") != 4017 or internal.get("profileCount") != 33:
        errors.append("dual_internal")
    if internal.get("externalCredit") != 0 or internal.get("realCustomerCredit") is not False or internal.get("independentReviewerCredit") is not False:
        errors.append("dual_internal_credit")
    if (dual.get("realCustomers") or {}).get("participants") != 0 or (dual.get("independentHumanReviewers") or {}).get("reviewers") != 0:
        errors.append("dual_external_false_credit")
    if len(dual.get("externalProgram") or []) != 9:
        errors.append("dual_external_program_denominator")

    if len(internal_table) != 8 or sum(int(item.get("executed", 0)) for item in internal_table) != 4017:
        errors.append("internal_table_denominator")
    if any(item.get("completionPercent") != 100.0 for item in internal_table):
        errors.append("internal_table_completion")
    if any(item.get("externalCredit") != 0 or item.get("realCustomerCredit") is not False or item.get("independentReviewerCredit") is not False for item in internal_table):
        errors.append("internal_table_credit")

    if len(profile_table) != 33:
        errors.append("profile_table_denominator")
    if any(item.get("customerValueCredit") is not False or item.get("realCustomerCredit") is not False or item.get("externalReviewCredit") is not False for item in profile_table):
        errors.append("profile_table_credit")
    browser_rows = [item for item in profile_table if str(item.get("profileId", "")).startswith("browser--")]
    if len(browser_rows) != 3 or any("BLOCKED" not in str(item.get("executionState", "")) for item in browser_rows):
        errors.append("profile_table_browser_boundary")

    if len(external_table) != 9:
        errors.append("external_table_denominator")
    if any(item.get("current") != 0 or item.get("completionPercent") != 0 or item.get("canAiSimulationSatisfy") is not False or item.get("externalCredit") != 0 for item in external_table):
        errors.append("external_table_false_completion")
    if {item.get("trackId") for item in external_table} != {item.get("trackId") for item in external_policy}:
        errors.append("external_table_policy_mismatch")

    methodology = METHODOLOGY_PATH.read_text("utf-8")
    for phrase in [
        "M24 — INTERNAL AI SIMULATION / DUAL EVIDENCE LEDGER / EXTERNAL CREDIT SEPARATION",
        "M24-A — P34 FROZEN INTERNAL AI DENOMINATOR",
        "M24-B — TWO INDEPENDENT 100% TABLES / NO AVERAGING",
        "4017/4017 rows",
        "0 real-customer credit",
    ]:
        if phrase not in methodology:
            errors.append(f"methodology_missing:{phrase}")
    growth = GROWTH_PATH.read_text("utf-8")
    if "P34 — INTERNAL AI DUAL LEDGER / GROWTH TRUTH" not in growth:
        errors.append("growth_missing_dual_table")

    return errors


def recalc_row(row: dict[str, Any]) -> None:
    row["rowSha256"] = canonical_sha({key: value for key, value in row.items() if key != "rowSha256"})


def recalc_summary(summary: dict[str, Any]) -> None:
    summary["integritySha256"] = canonical_sha({key: value for key, value in summary.items() if key != "integritySha256"})


def recalc_dual(dual: dict[str, Any]) -> None:
    dual["ledgerSha256"] = canonical_sha({key: value for key, value in dual.items() if key != "ledgerSha256"})


def mutation_detected(name: str, base: dict[str, Any]) -> bool:
    data = copy.deepcopy(base)
    p = data["policy"]
    s = data["summary"]
    pr = data["progress"]
    d = data["dual"]
    personas = data["personas"]
    roles = data["roles"]
    findings = data["findings"]
    it = data["internal_table"]
    pt = data["profile_table"]
    et = data["external_table"]
    rows = data["rows"]

    if name == "row_external_credit":
        rows[0]["externalCredit"] = True; recalc_row(rows[0])
    elif name == "row_real_customer_credit":
        rows[0]["realCustomerCredit"] = True; recalc_row(rows[0])
    elif name == "row_independent_reviewer_credit":
        rows[-1]["independentReviewerCredit"] = True; recalc_row(rows[-1])
    elif name == "row_professional_legal_credit":
        rows[-2]["professionalLegalDecisionCredit"] = True; recalc_row(rows[-2])
    elif name == "row_provider_rights_credit":
        rows[-3]["providerRightsCredit"] = True; recalc_row(rows[-3])
    elif name == "row_paid_release_credit":
        rows[-4]["paidReleaseCredit"] = True; recalc_row(rows[-4])
    elif name == "row_world_class_credit":
        rows[-5]["worldClassCredit"] = True; recalc_row(rows[-5])
    elif name == "shrink_denominator":
        rows.pop()
    elif name == "duplicate_row_id":
        rows[1]["rowId"] = rows[0]["rowId"]; recalc_row(rows[1])
    elif name == "browser_false_promotion":
        row = next(item for item in rows if str((item.get("profile") or {}).get("profileId", "")).startswith("browser--"))
        row["assessment"]["verdict"] = "PASS_RUNTIME_AND_CUSTOMER_VALUE"; recalc_row(row)
    elif name == "final_holdout_false_credit":
        s["qualityResult"]["finalHoldoutProfilesClosed"] = 33; recalc_summary(s)
    elif name == "customer_value_false_credit":
        s["qualityResult"]["customerValueProfilesClosed"] = 33; recalc_summary(s)
    elif name == "row_hash_tamper":
        rows[10]["assessment"]["verdict"] = "TAMPERED_WITHOUT_HASH_UPDATE"
    elif name == "summary_integrity_tamper":
        s["truthBoundary"] = "tampered"
    elif name == "external_track_false_completion":
        et[0]["current"] = 1; et[0]["completionPercent"] = 100
    elif name == "external_track_ai_satisfies":
        et[1]["canAiSimulationSatisfy"] = True
    elif name == "external_track_missing":
        et.pop()
    elif name == "cohort_missing":
        p["cohorts"].pop()
    elif name == "dual_external_false_credit":
        d["realCustomers"]["participants"] = 1; recalc_dual(d)
    else:
        raise ValueError(name)

    return bool(validate(p, s, pr, d, personas, roles, findings, it, pt, et, rows))


def main() -> int:
    base = {
        "policy": read_json(POLICY_PATH),
        "summary": read_json(SUMMARY_PATH),
        "progress": read_json(PROGRESS_PATH),
        "dual": read_json(DUAL_PATH),
        "personas": read_json(PERSONAS_PATH),
        "roles": read_json(ROLES_PATH),
        "findings": read_json(PROFILE_FINDINGS_PATH),
        "internal_table": read_json(INTERNAL_TABLE_PATH),
        "profile_table": read_json(PROFILE_TABLE_PATH),
        "external_table": read_json(EXTERNAL_TABLE_PATH),
        "rows": read_rows(),
    }
    errors = validate(
        base["policy"], base["summary"], base["progress"], base["dual"],
        base["personas"], base["roles"], base["findings"], base["internal_table"],
        base["profile_table"], base["external_table"], base["rows"],
    )
    mutations = [
        "row_external_credit",
        "row_real_customer_credit",
        "row_independent_reviewer_credit",
        "row_professional_legal_credit",
        "row_provider_rights_credit",
        "row_paid_release_credit",
        "row_world_class_credit",
        "shrink_denominator",
        "duplicate_row_id",
        "browser_false_promotion",
        "final_holdout_false_credit",
        "customer_value_false_credit",
        "row_hash_tamper",
        "summary_integrity_tamper",
        "external_track_false_completion",
        "external_track_ai_satisfies",
        "external_track_missing",
        "cohort_missing",
        "dual_external_false_credit",
    ]
    results = {name: mutation_detected(name, base) for name in mutations}
    ok = not errors and all(results.values())
    receipt = {
        "schemaVersion": "velmere.p34.internal-ai-dual-ledger-verifier-receipt.v2",
        "status": "PASS" if ok else "FAIL",
        "cohortCount": 8,
        "internalRowDenominator": 4017,
        "internalRowsExecuted": len(base["rows"]),
        "aiInternalExecutionCoveragePercent": 100.0 if len(base["rows"]) == 4017 else 0.0,
        "profileCoverage": 33,
        "externalTrackDenominator": 9,
        "externalTracksCompleted": 0,
        "realExternalExecutionCoveragePercent": 0.0,
        "errors": errors,
        "mutationControls": results,
        "mutationsDetected": sum(results.values()),
        "mutationDenominator": len(results),
        "creditSummary": {field: 0 for field in CREDIT_FIELDS},
        "truthBoundary": "Verifier proves two separate completion tables: AI_INTERNAL 4017/4017 and REAL_EXTERNAL 0/9. It detects cross-table false promotion and grants zero real/external/paid/world-class credit.",
    }
    OUT_PATH.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", "utf-8")
    print(json.dumps(receipt, ensure_ascii=False))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
