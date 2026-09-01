#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parents[2]
OUT_ROOT = ROOT / "artifacts/closure/p33/paid-tests-current"
LEDGER = ROOT / "artifacts/closure/p33/paid-test-campaign-current.json"
NODE = Path(os.environ.get("VELMERE_P33_DIAGNOSTIC_NODE", "/opt/pyvenv/lib/python3.13/site-packages/playwright/driver/node"))
LOADER = ROOT / "scripts/pass11/register-offline-ts-loader.mjs"

BASE_LEDGER = ROOT / "artifacts/closure/p33/paid-test-campaign-rerun.json"
STALE_PARENT = {
    "scripts/pass35/test-a49-stripe-fixture.mjs",
    "scripts/pass35/test-a49-stripe-payment-acceptance.mjs",
}
ADDITIONAL = [
    "tests/security/a102-angel-ai-disclosure-and-public-topology.test.ts",
    "tests/security/a102-paid-readiness-decomposition.test.ts",
]


def safe_name(value: str) -> str:
    return value.replace("/", "__").replace("\\", "__")


def main() -> int:
    base = json.loads(BASE_LEDGER.read_text("utf-8"))
    tests = [row["test"] for row in base.get("results", []) if isinstance(row, dict) and isinstance(row.get("test"), str)]
    for test in ADDITIONAL:
        if test not in tests:
            tests.append(test)
    if len(tests) != len(set(tests)):
        raise SystemExit("duplicate_paid_test_denominator")
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    results = []
    env = os.environ.copy()
    env["VELMERE_OFFLINE_TS_FORCE_BUILTIN"] = "1"
    for test in tests:
        start = time.monotonic()
        command = [str(NODE), "--import", str(LOADER), test]
        try:
            completed = subprocess.run(
                command,
                cwd=ROOT,
                env=env,
                capture_output=True,
                text=True,
                timeout=120,
                check=False,
            )
            state = "PASS" if completed.returncode == 0 else "FAIL"
            returncode = completed.returncode
            stdout = completed.stdout
            stderr = completed.stderr
        except subprocess.TimeoutExpired as error:
            state = "TIMEOUT"
            returncode = None
            stdout = error.stdout if isinstance(error.stdout, str) else ""
            stderr = error.stderr if isinstance(error.stderr, str) else ""
        duration_ms = int((time.monotonic() - start) * 1000)
        stem = safe_name(test)
        (OUT_ROOT / f"{stem}.stdout.log").write_text(stdout, "utf-8")
        (OUT_ROOT / f"{stem}.stderr.log").write_text(stderr, "utf-8")
        classification = "STALE_PARENT_RECEIPT_EXPECTED_FAIL" if test in STALE_PARENT else "CURRENT_SOURCE_TEST"
        results.append({
            "test": test,
            "classification": classification,
            "state": state,
            "returncode": returncode,
            "durationMs": duration_ms,
            "stdoutTail": stdout[-2000:],
            "stderrTail": stderr[-2000:],
        })
    summary = {state: sum(row["state"] == state for row in results) for state in ("PASS", "FAIL", "TIMEOUT")}
    current = [row for row in results if row["classification"] == "CURRENT_SOURCE_TEST"]
    current_summary = {state: sum(row["state"] == state for row in current) for state in ("PASS", "FAIL", "TIMEOUT")}
    ledger = {
        "schemaVersion": "velmere.p33.paid-test-campaign.v3",
        "runner": {
            "nodePath": str(NODE),
            "nodeVersion": subprocess.check_output([str(NODE), "--version"], text=True).strip(),
            "loader": str(LOADER.relative_to(ROOT)),
            "credit": "CURRENT_SOURCE_DIAGNOSTIC_NOT_EXACT_PROJECT_BUILD",
        },
        "denominator": len(results),
        "summary": summary,
        "currentSourceDenominator": len(current),
        "currentSourceSummary": current_summary,
        "historicalStaleParentDenominator": len(results) - len(current),
        "results": results,
        "truthBoundary": "Current-source tests must be green. Two historical parent hash/manifest tests are preserved as stale-parent expected failures and receive no current-source failure or release credit. This campaign is local diagnostic evidence, not exact build, staging, real Stripe, real customer or GO_PAID proof.",
    }
    LEDGER.write_text(json.dumps(ledger, indent=2, ensure_ascii=False) + "\n", "utf-8")
    print(json.dumps({
        "status": "PASS" if current_summary["FAIL"] == 0 and current_summary["TIMEOUT"] == 0 else "FAIL",
        "denominator": len(results),
        "summary": summary,
        "currentSourceDenominator": len(current),
        "currentSourceSummary": current_summary,
        "historicalStaleParentDenominator": len(results) - len(current),
        "output": str(LEDGER.relative_to(ROOT)),
    }))
    return 0 if current_summary["FAIL"] == 0 and current_summary["TIMEOUT"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
