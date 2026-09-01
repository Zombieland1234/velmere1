#!/usr/bin/env python3
"""Verify the immutable P38 Node-major differential receipt and no-promotion bounds."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
RECEIPT = ROOT / "artifacts/closure/p38/P38_NODE_MAJOR_DIFFERENTIAL.json"
EXPECTED_FAMILIES = {
    "A82_AUDIT",
    "A84_SHIELD",
    "A85_SHIELD_PRO_MAP",
    "A86_REAL_MARKETS",
    "A87_MARKET_IMPACT_WHALE_WATCH",
    "A88_BRAIN_ANGEL_RISK",
}


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def main() -> int:
    payload = json.loads(RECEIPT.read_text(encoding="utf-8"))
    expected_integrity = payload.get("integritySha256")
    core = dict(payload)
    core.pop("integritySha256", None)
    actual_integrity = sha256_bytes(canonical_json(core))
    if expected_integrity != actual_integrity:
        raise RuntimeError("node_differential_integrity_mismatch")

    runtimes = {row["label"]: row for row in payload.get("runtimes", [])}
    if set(runtimes) != {"NODE_22", "NODE_24_LINE"}:
        raise RuntimeError("runtime_set_mismatch")
    if runtimes["NODE_22"]["version"] != "22.16.0":
        raise RuntimeError("node22_version_mismatch")
    if runtimes["NODE_24_LINE"]["version"] != "24.11.1":
        raise RuntimeError("node24_line_version_mismatch")
    if any(row.get("exactRequiredVersionMatched") for row in runtimes.values()):
        raise RuntimeError("false_exact_runtime_promotion")

    comparison = payload.get("comparison", [])
    if {row["family"] for row in comparison} != EXPECTED_FAMILIES:
        raise RuntimeError("family_set_mismatch")
    if not all(
        row.get("node22Passed") is True
        and row.get("node24LinePassed") is True
        and row.get("receiptByteIdentical") is True
        and row.get("runtimeByteIdentical") is True
        for row in comparison
    ):
        raise RuntimeError("node_differential_family_or_parity_failure")

    summary = payload.get("summary", {})
    required_summary = {
        "node22Passed": "6/6",
        "node24LinePassed": "6/6",
        "crossRuntimeReceiptByteParity": "6/6",
        "crossRuntimeRuntimeByteParity": "6/6",
        "canonicalProtectedPathsUnchanged": "13/13",
    }
    for key, value in required_summary.items():
        if summary.get(key) != value:
            raise RuntimeError(f"summary_mismatch:{key}")
    if summary.get("exactNode24180Executed") is not False or summary.get("exactWindowsExecuted") is not False:
        raise RuntimeError("false_exact_runtime_or_windows_promotion")

    credit = payload.get("credit", {})
    for key in (
        "exactNode24180Credit", "windowsCredit", "dependencyClosureCredit",
        "typecheckOrBuildCredit", "browserCredit", "customerValueCredit",
        "goInternalCredit", "saleOrLiveCredit",
    ):
        if credit.get(key) is not False:
            raise RuntimeError(f"false_credit:{key}")
    if payload.get("releaseState") != "NO_GO":
        raise RuntimeError("false_release_state")

    print(json.dumps({
        "status": "PASS_P38_NODE_MAJOR_DIFFERENTIAL_RECEIPT_VERIFY",
        "families": "6/6",
        "node22": "22.16.0",
        "node24Line": "24.11.1",
        "receiptParity": "6/6",
        "runtimeParity": "6/6",
        "exactNode24180": False,
        "releaseState": "NO_GO",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
