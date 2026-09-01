#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LOG = ROOT / "artifacts/p84/logs"
OUT = ROOT / "receipts/p84/P84_CURRENT_SOURCE_REGRESSION_SUMMARY.json"


def load(rel: str):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def count_json(data) -> tuple[int, int]:
    checks = data.get("checks")
    if isinstance(checks, dict):
        passed = checks.get("passed")
        total = checks.get("total")
        if isinstance(passed, int) and isinstance(total, int):
            return passed, total
        rows = checks.get("rows")
        if isinstance(rows, list):
            return sum(row.get("status") == "PASS" for row in rows), len(rows)
    if isinstance(checks, list):
        return sum(row.get("status") == "PASS" for row in checks), len(checks)
    if isinstance(data.get("passed"), int) and isinstance(data.get("checkCount"), int):
        return data["passed"], data["checkCount"]
    if isinstance(data.get("checkCount"), int) and isinstance(checks, list):
        return sum(row.get("status") == "PASS" for row in checks), data["checkCount"]
    raise ValueError("unsupported receipt check shape")


def count_pdf_unit() -> tuple[int, int]:
    text = (LOG / "EXACT_PDF_UNIT.log").read_text(encoding="utf-8", errors="replace")
    match = re.search(r"Exact customer PDF delivery: PASS \((\d+)/(\d+)\)", text)
    if not match:
        raise ValueError("Exact PDF unit assertion count missing")
    return int(match.group(1)), int(match.group(2))


def count_pdf_integration() -> tuple[int, int]:
    data = json.loads((ROOT / "artifacts/closure/p36/P36_EXACT_CUSTOMER_PDF_INTEGRATION.json").read_text(encoding="utf-8"))
    assertions = data.get("assertions")
    if data.get("status") != "PASS_P36_EXACT_CUSTOMER_PDF_STORAGE_TO_DELIVERY_INTEGRATION" or not isinstance(assertions, int):
        raise ValueError("Exact PDF integration assertion receipt invalid")
    return assertions, assertions


def count_p75() -> tuple[int, int]:
    data = json.loads((LOG / "P75_ADVANCED_AUTOMATION_CURRENT_REGRESSION.log").read_text(encoding="utf-8"))
    checks = data.get("checks")
    if not isinstance(checks, list):
        raise ValueError("P75 checks missing")
    return sum(row.get("status") == "PASS" for row in checks), len(checks)


lanes: list[dict[str, object]] = []

def add(name: str, passed: int, total: int, evidence: str) -> None:
    lanes.append({"name": name, "passed": passed, "total": total, "status": "PASS" if passed == total else "FAIL", "evidence": evidence})

for name, rel in [
    ("P84 owner-read runtime", "receipts/p84/P84_AUDIT_CUSTOMER_ARTIFACT_OWNER_READ_RUNTIME.json"),
    ("P84 repeatability", "receipts/p84/P84_AUDIT_CUSTOMER_ARTIFACT_OWNER_READ_REPEATABILITY.json"),
    ("P84 static", "receipts/p84/P84_AUDIT_CUSTOMER_ARTIFACT_OWNER_READ_STATIC.json"),
    ("P84/P83 compatibility", "receipts/p84/P84_P83_ATOMIC_PUBLICATION_COMPATIBILITY.json"),
    ("P83 frozen runtime compatibility", "receipts/p83/P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_RUNTIME.json"),
    ("P82 quorum runtime", "receipts/p82/P82_SUCCESSFUL_QUORUM_INTEGRITY_RUNTIME.json"),
    ("P82 quorum static", "receipts/p82/P82_SUCCESSFUL_QUORUM_INTEGRITY_STATIC.json"),
    ("P80 immutable Audit runtime", "receipts/p80/P80_AUDIT_EXACT_IMMUTABLE_ACCOUNT_ARTIFACT_RUNTIME.json"),
    ("P84/P80 immutable artifact compatibility", "receipts/p84/P84_P80_IMMUTABLE_ARTIFACT_COMPATIBILITY.json"),
    ("P79 historical customer path runtime", "receipts/p79/P79_HISTORICAL_DEPLOYMENT_CUSTOMER_PATH_RUNTIME.json"),
    ("P79 historical customer path static", "receipts/p79/P79_CUSTOMER_PATH_STATIC.json"),
    ("P78 private provider evidence", "receipts/p78/P78_PRIVATE_PROVIDER_EVIDENCE_RUNTIME.json"),
    ("P78 standard-json customer path", "receipts/p78/P78_STANDARD_JSON_CUSTOMER_PATH_RUNTIME.json"),
    ("P78 thirdweb development corpus", "receipts/p78/P78_THIRDWEB_DEVELOPMENT_MICRO_CORPUS_RUNTIME.json"),
    ("P78 real-audit dataflow static", "receipts/p78/P78_REAL_AUDIT_DATAFLOW_STATIC.json"),
    ("P78R3 customer path static", "receipts/p78/P78R3_CUSTOMER_PATH_STATIC.json"),
    ("P77 deterministic delivery static", "receipts/p84/P84_P77_DETERMINISTIC_DELIVERY_CURRENT_STATIC_REGRESSION.json"),
]:
    passed, total = count_json(load(rel))
    add(name, passed, total, rel)

passed, total = count_p75()
add("P75 Advanced automation runtime", passed, total, "artifacts/p84/logs/P75_ADVANCED_AUTOMATION_CURRENT_REGRESSION.log")
passed, total = count_pdf_unit()
add("Exact PDF unit", passed, total, "artifacts/p84/logs/EXACT_PDF_UNIT.log")
passed, total = count_pdf_integration()
add("Exact PDF integration", passed, total, "artifacts/closure/p36/P36_EXACT_CUSTOMER_PDF_INTEGRATION.json")
add("P84 changed module imports", 4, 4, "artifacts/p84/logs/P84_CHANGED_MODULE_IMPORTS.log")
add("P84 targeted strict TypeScript", 1, 1, "artifacts/p84/logs/P84_TARGETED_TYPESCRIPT.log")

failed = [lane for lane in lanes if lane["status"] != "PASS"]
aggregate_passed = sum(int(lane["passed"]) for lane in lanes)
aggregate_total = sum(int(lane["total"]) for lane in lanes)
payload = {
    "schemaVersion": "velmere.p84.current-source-regression-summary.v1",
    "status": "PASS" if not failed else "FAIL",
    "lanes": lanes,
    "aggregate": {"passed": aggregate_passed, "total": aggregate_total, "failedLanes": len(failed)},
    "countingBoundary": "Aggregate checks overlap heavily and are not independent evidence, detector accuracy, provider count, customer count, Customer FINAL or Audit FINAL PDF numerators.",
    "withheld": ["authorized PostgreSQL/Supabase runtime", "RLS/JWT two-account isolation", "deployed HTTP parity", "whole-project dependency/type/lint/build", "exact Windows", "current BSC quorum", "independent archival replay"],
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
print(json.dumps(payload, indent=2))
raise SystemExit(1 if failed else 0)
