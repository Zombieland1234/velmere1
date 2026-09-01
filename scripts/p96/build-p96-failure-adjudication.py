#!/usr/bin/env python3
from __future__ import annotations
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

cases = [
    {
        "id": "P96_GOVERNANCE_000_DUPLICATE_P95_CHECKPOINT_ID",
        "classification": "GOVERNANCE_SOURCE_IDENTITY_CONFLICT",
        "firstResult": "FAIL_CLOSED",
        "credit": 0,
        "evidence": "receipts/p96/P96_P95_SIBLING_BRANCH_RECONCILIATION.json",
        "rootCause": "Two different sibling SOURCE_ONLY packages, both direct children of P94, were independently named P95R1 and carried different product/tree/package identities.",
        "adjudication": "Neither P95 was rewritten or silently selected. Both were frozen as P95-A and P95-B; P96 was rebuilt from verified P94 and integrated the exact union of both deltas with fresh tests.",
    },
    {
        "id": "P96_STATIC_000_STALE_ACTIVE_PASS_ASSERTION",
        "classification": "TEST_HARNESS_DEFECT",
        "firstResult": "FAIL_68_OF_69",
        "credit": 0,
        "evidence": "artifacts/p96/logs/alignment_static_first.log",
        "rootCause": "The copied P95-A static harness still required VELMERE_ACTIVE_PASS=P95R1 after the integrated source had correctly moved to P96R1.",
        "adjudication": "Updated only the stale checkpoint assertion to P96R1; product requirements and alignment checks were not weakened; rerun passed 69/69.",
    },
    {
        "id": "P96_INTEGRATION_001_FUTURE_FIXTURE_TIMESTAMP",
        "classification": "TEST_FIXTURE_DEFECT_CORRECT_PRODUCT_REJECTION",
        "firstResult": "FAIL",
        "credit": 0,
        "evidence": "artifacts/p96/logs/failures/P96_INTEGRATION_001_FUTURE_FIXTURE_TIMESTAMP_ZERO_CREDIT.log",
        "rootCause": "The first integration fixture used an observation timestamp later than the route generatedAt boundary. The customer parser correctly rejected the projection.",
        "adjudication": "Moved only the fixture timestamp into the valid deterministic historical window; kept the future-timestamp rejection boundary; rerun passed 17/17.",
    },
    {
        "id": "P96_STATIC_001_SHORTHAND_HISTORY_FALSE_NEGATIVE",
        "classification": "TEST_HARNESS_FALSE_NEGATIVE",
        "firstResult": "FAIL",
        "credit": 0,
        "evidence": "artifacts/p96/logs/failures/P96_STATIC_001_SHORTHAND_HISTORY_FALSE_NEGATIVE_ZERO_CREDIT.log",
        "rootCause": "The static harness searched for the explicit text 'history: history' while the valid TypeScript source used object-property shorthand 'history,'.",
        "adjudication": "Replaced the text-only expectation with a syntax-tolerant source requirement that still proves the canonical history object reaches the alignment call; rerun passed 28/28.",
    },
    {
        "id": "P96_GOVERNANCE_001_MASTER_DIRECTIVE_ANCHOR_MISMATCH",
        "classification": "TOOLING_FAILURE_NON_PRODUCT",
        "firstResult": "NO_OUTPUT",
        "credit": 0,
        "evidence": "artifacts/p96/logs/failures/P96_GOVERNANCE_001_MASTER_DIRECTIVE_ANCHOR_MISMATCH_ZERO_CREDIT.log",
        "rootCause": "The first automated directive edit relied on a formatting anchor that did not match the complete source byte-for-byte.",
        "adjudication": "No old directive was changed. The exact section boundary was re-read, subsection 1.1 was inserted deterministically, and completeness for sections 0–88 plus sentinels was reverified.",
    },
]
for case in cases:
    path = ROOT / case["evidence"]
    case["evidencePresent"] = path.is_file()
    case["evidenceSha256"] = "sha256:" + sha(path) if path.is_file() else None

all_present = all(bool(case["evidencePresent"]) for case in cases)
receipt = {
    "schemaVersion": "velmere.p96.failure-adjudication.v1",
    "generatedAt": "2026-08-21T05:00:00.000Z",
    "status": "PASS_ALL_FAILURES_PRESERVED_AND_ADJUDICATED" if all_present else "FAIL",
    "cases": cases,
    "summary": {
        "total": len(cases),
        "preservedEvidence": sum(1 for case in cases if case["evidencePresent"]),
        "creditedFailures": sum(1 for case in cases if case["credit"] != 0),
        "unresolved": 0 if all_present else sum(1 for case in cases if not case["evidencePresent"]),
    },
    "zeroFakeCredit": {
        "retryUntilGreen": False,
        "failedRunsCounted": False,
        "oldP95HistoryRewritten": False,
        "testRequirementsWeakenedToMatchProduct": False,
        "customerFinal": "0/20",
    },
    "truthBoundary": "This receipt preserves and adjudicates the governance collision and every material first-run P96 failure identified during reconciliation. It does not convert any failed attempt into PASS credit; only later current-byte executions are credited.",
}
for relative in ["receipts/p96/P96_FAILURE_ADJUDICATION.json", "artifacts/p96/P96_FAILURE_ADJUDICATION.json"]:
    target = ROOT / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps({"status": receipt["status"], "summary": receipt["summary"]}, indent=2, ensure_ascii=False))
raise SystemExit(0 if all_present else 1)
