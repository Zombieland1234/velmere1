#!/usr/bin/env python3
from __future__ import annotations

import copy
import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "artifacts/closure/p35"
POLICY = ROOT / "config/closure/p35/internal-ai-availability-artifact-ledger-policy.json"
SUMMARY = ART / "internal-ai-availability-artifact-summary.json"
ROWS = ART / "internal-ai-assessments.jsonl"
MATRIX = ART / "current-evidence-availability-matrix.json"
PROGRESS = ART / "P35_PROGRESS_DELTA.json"
DUAL = ART / "internal-external-evidence-dual-ledger.json"
INTERNAL_TABLE = ART / "P35_INTERNAL_AI_PROGRAM_TABLE.json"
PROFILE_TABLE = ART / "P35_INTERNAL_AI_PROFILE_TABLE.json"
EXTERNAL_TABLE = ART / "P35_REAL_EXTERNAL_PROGRAM_TABLE.json"
SOURCE_IDENTITY = ART / "source-identity.json"
METHOD = ROOT / "docs/authority/VELMERE_METODOLOGIA_FINISHOWANIA_CANONICAL_V13_EVIDENCE_AVAILABILITY_ARTIFACT_PARITY_2026-08-13.txt"
GROWTH = ROOT / "docs/authority/VELMERE_GROWTH_INTEL_TOP_WORLD_R11_EVIDENCE_AVAILABILITY_VAULT_2026-08-13.txt"
REQUIREMENT = ROOT / "docs/research/VELMERE_EVIDENCE_AVAILABILITY_DYNAMIC_TIERS_HISTORICAL_INTELLIGENCE_PDF_ACCOUNT_ARTIFACTS_R2_2026-08-13.txt"
REQUIREMENT_R3 = ROOT / "docs/research/VELMERE_EVIDENCE_AVAILABILITY_DYNAMIC_TIERS_HISTORICAL_INTELLIGENCE_PDF_ACCOUNT_ARTIFACTS_R3_CURRENT_SOURCE_MAPPING_2026-08-13.txt"
OUT = ART / "internal-ai-availability-ledger-verifier-receipt.json"

CREDIT_FIELDS = [
    "externalCredit", "realCustomerCredit", "independentReviewerCredit",
    "professionalLegalDecisionCredit", "providerRightsCredit", "customerValueCredit",
    "paidReleaseCredit", "worldClassCredit",
]


def load(path: Path) -> Any:
    return json.loads(path.read_text("utf-8"))


def sha_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def canonical_sha(value: Any) -> str:
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def rows() -> list[dict[str, Any]]:
    return [json.loads(line) for line in ROWS.read_text("utf-8").splitlines() if line.strip()]


def core_checks(policy: dict[str, Any], summary: dict[str, Any], matrix: dict[str, Any], all_rows: list[dict[str, Any]], external: list[dict[str, Any]], method: str, growth: str) -> list[str]:
    errors: list[str] = []
    expected = int(policy.get("expectedTotalRows", -1))
    if policy.get("schemaVersion") != "velmere.p35.internal-ai-availability-artifact-ledger-policy.v1": errors.append("policy_schema")
    if policy.get("revision") != "P35_EVIDENCE_AVAILABILITY_ARTIFACT_PARITY": errors.append("policy_revision")
    if expected != 5147: errors.append("policy_denominator")
    required_truth = policy.get("p35RequiredTruth", {})
    if required_truth.get("availabilityProfileDenominator") != 33: errors.append("policy_availability_denominator")
    if required_truth.get("saleEligibleProfileCount") != 0: errors.append("policy_sale_credit")
    if required_truth.get("analysisEligibleProfileCount") not in (7, 11): errors.append("policy_analysis_count")
    if required_truth.get("finalHoldoutProfilesClosed") != 0: errors.append("policy_final_holdout_credit")
    if any(required_truth.get(field) != 0 for field in ["realCustomerCredit", "paidReleaseCredit", "externalCredit"]): errors.append("policy_false_credit")
    if len(all_rows) != expected: errors.append("row_count")
    counts = Counter(str(row.get("cohortId")) for row in all_rows)
    expected_counts = {str(row["id"]): int(row["denominator"]) for row in policy["cohorts"]}
    if dict(counts) != expected_counts: errors.append("cohort_counts")
    if summary.get("rowDenominator") != expected or summary.get("rowsExecuted") != expected: errors.append("summary_rows")
    if summary.get("executionCoveragePercent") != 100.0: errors.append("summary_coverage")
    if summary.get("profilesCovered") != 33: errors.append("summary_profiles")
    if summary.get("integritySha256") != canonical_sha({k: v for k, v in summary.items() if k != "integritySha256"}): errors.append("summary_integrity")
    authority = summary.get("authority", {}).get("binding", {})
    bindings = {
        "sourceIdentitySha256": sha_file(SOURCE_IDENTITY),
        "methodologySha256": sha_file(METHOD),
        "growthIntelSha256": sha_file(GROWTH),
        "eligibilityMatrixSha256": sha_file(MATRIX),
        "policySha256": sha_file(POLICY),
        "requirementR3Sha256": sha_file(REQUIREMENT_R3),
    }
    for key, expected_hash in bindings.items():
        if authority.get(key) != expected_hash: errors.append(f"authority_{key}")
    row_ids: set[str] = set()
    profile_ids: set[str] = set()
    for row in all_rows:
        rid = str(row.get("rowId"))
        if rid in row_ids: errors.append("duplicate_row_id")
        row_ids.add(rid)
        profile_ids.add(str(row.get("profile", {}).get("profileId")))
        if row.get("rowSha256") != canonical_sha({k: v for k, v in row.items() if k != "rowSha256"}): errors.append("row_integrity")
        for field in CREDIT_FIELDS:
            if row.get(field) is not False: errors.append(f"credit_{field}")
        if row.get("authorityBinding") != authority: errors.append("row_authority_binding")
    if len(profile_ids) != 33: errors.append("row_profile_coverage")
    if matrix.get("denominator") != 33 or matrix.get("products") != 11 or matrix.get("tiersPerProduct") != 3: errors.append("matrix_denominator")
    if matrix.get("analysisEligibleProfileCount") not in (7, 11): errors.append("matrix_analysis_count")
    if matrix.get("saleEligibleProfileCount") != 0: errors.append("matrix_sale_count")
    profiles = matrix.get("profiles", [])
    if len(profiles) != 33: errors.append("matrix_profiles")
    if any(p.get("receipt", {}).get("saleEligible") is not False for p in profiles): errors.append("sale_promotion")
    if any(p.get("receipt", {}).get("estimatedRestorationAt") is not None for p in profiles): errors.append("fake_eta")
    if any(not p.get("receipt", {}).get("receiptHash") for p in profiles): errors.append("missing_eligibility_hash")
    if len(external) != 9 or any(int(row.get("completionPercent", 0)) != 0 for row in external): errors.append("external_table")
    if "M25 — EVIDENCE AVAILABILITY" not in method: errors.append("method_m25")
    if "M26 — CANONICAL CUSTOMER ARTIFACT" not in method: errors.append("method_m26")
    if "P35 ADOPTION DECISION" not in method: errors.append("method_adoption")
    if "[IDEA-09] VELMÈRE EVIDENCE AVAILABILITY ENGINE" not in growth: errors.append("growth_idea09")
    if "[IDEA-10] EVIDENCE VAULT" not in growth: errors.append("growth_idea10")
    requirement = REQUIREMENT.read_text("utf-8")
    if "NOT IMPLEMENTED BY DECLARATION" not in requirement: errors.append("requirement_truth_boundary")
    if "PREVIEW PDF BYTES" not in requirement or "DOWNLOAD PDF BYTES" not in requirement: errors.append("requirement_pdf_parity")
    requirement_r3 = REQUIREMENT_R3.read_text("utf-8")
    if "PARTIAL P0 IMPLEMENTATION / NO FAKE FEATURE CREDIT" not in requirement_r3: errors.append("requirement_r3_truth_boundary")
    if "33/33 profiles executed" not in requirement_r3 or "0/33 saleEligible" not in requirement_r3: errors.append("requirement_r3_current_mapping")
    return sorted(set(errors))


def main() -> int:
    policy = load(POLICY)
    summary = load(SUMMARY)
    matrix = load(MATRIX)
    external = load(EXTERNAL_TABLE)
    all_rows = rows()
    method = METHOD.read_text("utf-8")
    growth = GROWTH.read_text("utf-8")
    base_errors = core_checks(policy, summary, matrix, all_rows, external, method, growth)

    mutations: list[tuple[str, Callable[[], list[str]]]] = []
    def mutated_check(name: str, mutate: Callable[[dict[str, Any], dict[str, Any], list[dict[str, Any]], list[dict[str, Any]], str, str], None]) -> list[str]:
        p, s, m, e = copy.deepcopy(policy), copy.deepcopy(summary), copy.deepcopy(matrix), copy.deepcopy(external)
        md, gr = method, growth
        holder = {"method": md, "growth": gr}
        mutate(p, s, m, e, holder, all_rows)
        return core_checks(p, s, m, all_rows, e, holder["method"], holder["growth"])

    mutation_specs = [
        ("denominator_shrink", lambda p,s,m,e,h,r: p.__setitem__("expectedTotalRows", 5146)),
        ("sale_false_promotion", lambda p,s,m,e,h,r: m.__setitem__("saleEligibleProfileCount", 1)),
        ("analysis_count_promotion", lambda p,s,m,e,h,r: m.__setitem__("analysisEligibleProfileCount", 33)),
        ("fake_eta", lambda p,s,m,e,h,r: m["profiles"][0]["receipt"].__setitem__("estimatedRestorationAt", "2026-08-13T06:00:00Z")),
        ("external_fake_completion", lambda p,s,m,e,h,r: e[0].__setitem__("completionPercent", 100)),
        ("summary_paid_credit", lambda p,s,m,e,h,r: s["creditSummary"].__setitem__("paidReleaseCredit", 1)),
        ("summary_row_shrink", lambda p,s,m,e,h,r: s.__setitem__("rowsExecuted", 5146)),
        ("summary_integrity_tamper", lambda p,s,m,e,h,r: s.__setitem__("integritySha256", "0"*64)),
        ("method_remove_m25", lambda p,s,m,e,h,r: h.__setitem__("method", h["method"].replace("M25 — EVIDENCE AVAILABILITY", "M25_REMOVED"))),
        ("growth_remove_vault", lambda p,s,m,e,h,r: h.__setitem__("growth", h["growth"].replace("[IDEA-10] EVIDENCE VAULT", "IDEA10_REMOVED"))),
        ("requirement_credit_alias_guard", lambda p,s,m,e,h,r: p["p35RequiredTruth"].__setitem__("paidReleaseCredit", 1)),
        ("external_track_delete", lambda p,s,m,e,h,r: e.pop()),
    ]
    mutation_results = []
    for name, mutate in mutation_specs:
        errors = mutated_check(name, mutate)
        detected = bool(errors)
        mutation_results.append({"mutation": name, "detected": detected, "errors": errors[:8]})

    checks = {
        "basePass": not base_errors,
        "rowCount": len(all_rows),
        "cohortCount": len(Counter(row["cohortId"] for row in all_rows)),
        "profileCoverage": len({row["profile"]["profileId"] for row in all_rows}),
        "matrixProfiles": matrix.get("denominator"),
        "analysisEligibleProfiles": matrix.get("analysisEligibleProfileCount"),
        "saleEligibleProfiles": matrix.get("saleEligibleProfileCount"),
        "externalTracksCompleted": sum(1 for row in external if int(row.get("completionPercent", 0)) == 100),
        "mutationsDetected": sum(1 for row in mutation_results if row["detected"]),
        "mutationDenominator": len(mutation_results),
    }
    receipt = {
        "schemaVersion": "velmere.p35.internal-ai-availability-ledger-verifier-receipt.v1",
        "status": "PASS" if not base_errors and checks["mutationsDetected"] == checks["mutationDenominator"] else "FAIL",
        "checks": checks,
        "baseErrors": base_errors,
        "mutations": mutation_results,
        "bindings": {
            "policySha256": sha_file(POLICY), "summarySha256": sha_file(SUMMARY), "rowsSha256": sha_file(ROWS),
            "matrixSha256": sha_file(MATRIX), "methodologySha256": sha_file(METHOD), "growthIntelSha256": sha_file(GROWTH),
            "sourceIdentitySha256": sha_file(SOURCE_IDENTITY), "requirementSha256": sha_file(REQUIREMENT),
            "requirementR3Sha256": sha_file(REQUIREMENT_R3),
        },
        "truthBoundary": "Verifier proves current-source integrity of the 5147-row internal AI denominator and 33-profile eligibility matrix. It grants zero real-customer, independent-review, professional-legal, provider-rights, final-holdout, GO_PAID or world-class credit.",
    }
    receipt["integritySha256"] = canonical_sha(receipt)
    OUT.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", "utf-8")
    print(json.dumps({"status": receipt["status"], **checks, "receiptSha256": sha_file(OUT)}))
    return 0 if receipt["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
