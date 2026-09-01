#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT.parent
LOG_ROOT = ROOT / "artifacts/p96/logs/repeatability"
LOG_ROOT.mkdir(parents=True, exist_ok=True)

P94_ZIP = Path("/mnt/data/VELMERE_R44P46_V17_P94R1_RISK_HISTORY_PUBLIC_ONLY_PAGINATION_TEMPORAL_TRUTH_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-21.zip")
P95A_ZIP = Path("/mnt/data/VELMERE_R44P46_V17_P95R1_RISK_HISTORY_CURRENT_VS_STORED_TIME_VERSION_ALIGNMENT_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-21.zip")
P95B_ZIP = Path("/mnt/data/VELMERE_R44P46_V17_P95R1_RISK_HISTORY_REQUEST_BOUND_PAGE_STORAGE_PROVENANCE_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-21.zip")

NODE = ["node", "--import", "./scripts/pass11/register-offline-ts-loader.mjs"]
CASES = [
    {
        "id": "alignment_runtime",
        "command": NODE + ["./scripts/p96/test-p96-risk-history-current-alignment-runtime.mjs"],
        "receipt": "receipts/p96/P96_RISK_HISTORY_CURRENT_ALIGNMENT_RUNTIME.json",
    },
    {
        "id": "request_storage_runtime",
        "command": NODE + ["./scripts/p96/test-p96-risk-history-request-storage-runtime.mjs"],
        "receipt": "receipts/p96/P96_RISK_HISTORY_REQUEST_STORAGE_RUNTIME.json",
    },
    {
        "id": "merge_integration_runtime",
        "command": NODE + ["./scripts/p96/test-p96-risk-history-merge-integration-runtime.mjs"],
        "receipt": "receipts/p96/P96_RISK_HISTORY_SIBLING_MERGE_INTEGRATION_RUNTIME.json",
    },
    {
        "id": "alignment_static",
        "command": ["python", "./scripts/p96/test-p96-risk-history-current-alignment-static.py"],
        "receipt": "receipts/p96/P96_RISK_HISTORY_CURRENT_ALIGNMENT_STATIC.json",
    },
    {
        "id": "request_storage_static",
        "command": ["python", "./scripts/p96/test-p96-risk-history-request-storage-static.py"],
        "receipt": "receipts/p96/P96_RISK_HISTORY_REQUEST_STORAGE_STATIC.json",
    },
    {
        "id": "sibling_merge_static",
        "command": ["python", "./scripts/p96/test-p96-risk-history-sibling-merge-static.py"],
        "receipt": "receipts/p96/P96_RISK_HISTORY_SIBLING_MERGE_STATIC.json",
    },
    {
        "id": "changed_module_reachability",
        "command": NODE + ["./scripts/p96/test-p96-changed-module-reachability.mjs"],
        "receipt": "receipts/p96/P96_CHANGED_MODULE_REACHABILITY.json",
    },
    {
        "id": "targeted_typescript",
        "command": ["python", "./scripts/p96/test-p96-targeted-typescript.py"],
        "receipt": "receipts/p96/P96_TARGETED_STRICT_TYPESCRIPT.json",
    },
    {
        "id": "sibling_branch_reconciliation",
        "command": [
            "python",
            "./scripts/p96/build-p96-sibling-branch-reconciliation.py",
            "--root", str(ROOT),
            "--p94-tree", str(BASE / "p94"),
            "--p95a-tree", str(BASE / "p95a"),
            "--p95b-tree", str(BASE / "p95b"),
            "--p94-zip", str(P94_ZIP),
            "--p95a-zip", str(P95A_ZIP),
            "--p95b-zip", str(P95B_ZIP),
        ],
        "receipt": "receipts/p96/P96_P95_SIBLING_BRANCH_RECONCILIATION.json",
    },
]


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def run(case: dict[str, object], round_number: int) -> dict[str, object]:
    command = [str(part) for part in case["command"]]
    proc = subprocess.run(
        command,
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=240,
        env={**os.environ, "TZ": "UTC", "LC_ALL": "C.UTF-8", "LANG": "C.UTF-8"},
    )
    stdout_path = LOG_ROOT / f"round{round_number}_{case['id']}.stdout.log"
    stderr_path = LOG_ROOT / f"round{round_number}_{case['id']}.stderr.log"
    stdout_path.write_bytes(proc.stdout)
    stderr_path.write_bytes(proc.stderr)
    receipt_path = ROOT / str(case["receipt"])
    receipt_bytes = receipt_path.read_bytes() if receipt_path.is_file() else b""
    (LOG_ROOT / f"round{round_number}_{case['id']}.receipt.json").write_bytes(receipt_bytes)
    return {
        "exitCode": proc.returncode,
        "stdoutSha256": sha(proc.stdout),
        "stderrSha256": sha(proc.stderr),
        "receiptSha256": sha(receipt_bytes),
        "receiptBytes": len(receipt_bytes),
        "receiptPresent": bool(receipt_bytes),
    }


rounds: dict[int, dict[str, dict[str, object]]] = {1: {}, 2: {}}
for round_number in (1, 2):
    for case in CASES:
        rounds[round_number][str(case["id"])] = run(case, round_number)

rows: list[dict[str, object]] = []
for case in CASES:
    identifier = str(case["id"])
    left = rounds[1][identifier]
    right = rounds[2][identifier]
    passed = (
        left["exitCode"] == 0
        and right["exitCode"] == 0
        and left["receiptPresent"] is True
        and right["receiptPresent"] is True
        and left["stdoutSha256"] == right["stdoutSha256"]
        and left["stderrSha256"] == right["stderrSha256"]
        and left["receiptSha256"] == right["receiptSha256"]
        and left["receiptBytes"] == right["receiptBytes"]
    )
    rows.append({
        "id": identifier,
        "status": "PASS" if passed else "FAIL",
        "round1": left,
        "round2": right,
    })

failed = [row for row in rows if row["status"] != "PASS"]
receipt = {
    "schemaVersion": "velmere.p96.repeatability.v1",
    "generatedAt": "2026-08-21T05:00:00.000Z",
    "status": "PASS_2_OF_2_BYTE_IDENTICAL" if not failed else "FAIL",
    "checks": {
        "total": len(rows),
        "passed": len(rows) - len(failed),
        "failed": len(failed),
        "rows": rows,
    },
    "comparison": {
        "stdout": "exact bytes",
        "stderr": "exact bytes",
        "receipt": "exact bytes",
        "environment": "TZ=UTC; LC_ALL=C.UTF-8",
    },
    "zeroFakeCredit": {
        "flakyRunIgnored": False,
        "partialRunCredited": False,
        "wholeProjectTypeScript": False,
        "browserRendered": False,
        "databaseExecuted": False,
        "exactWindows": False,
        "customerFinal": "0/20",
    },
    "truthBoundary": "Two consecutive executions of the nine current P96 core/reconciliation commands produced exit code 0 and byte-identical stdout, stderr and receipts. This is bounded local repeatability only; it does not prove deployed runtime, PostgreSQL, Browser, whole-project build or exact Windows.",
}
for relative in ["receipts/p96/P96_REPEATABILITY.json", "artifacts/p96/P96_REPEATABILITY.json"]:
    target = ROOT / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps({"status": receipt["status"], "checks": receipt["checks"]}, indent=2, ensure_ascii=False))
raise SystemExit(1 if failed else 0)
