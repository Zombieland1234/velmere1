#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GENERATED_AT = "2026-08-20T18:30:00.000Z"
RUNTIME_RECEIPT = ROOT / "receipts/p83/P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_RUNTIME.json"
OUT_RECEIPT = ROOT / "receipts/p83/P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_REPEATABILITY.json"
LOG_DIR = ROOT / "artifacts/p83/logs"
COMMAND = [
    "node",
    "--import",
    "./scripts/pass11/register-offline-ts-loader.mjs",
    "scripts/p83/test-p83-audit-exact-artifact-atomic-publication-runtime.mjs",
]


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def run_once(index: int) -> tuple[subprocess.CompletedProcess[bytes], bytes]:
    result = subprocess.run(COMMAND, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=False)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    (LOG_DIR / f"P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_RUNTIME_REPEAT_{index}.log").write_bytes(result.stdout)
    receipt = RUNTIME_RECEIPT.read_bytes() if RUNTIME_RECEIPT.is_file() else b""
    return result, receipt


first, first_receipt = run_once(1)
second, second_receipt = run_once(2)
try:
    parsed = json.loads(second_receipt)
except Exception:
    parsed = {}
checks = [
    {"id": "p83_repeat_run_1_exit_zero", "status": "PASS" if first.returncode == 0 else "FAIL", "detail": first.returncode},
    {"id": "p83_repeat_run_2_exit_zero", "status": "PASS" if second.returncode == 0 else "FAIL", "detail": second.returncode},
    {"id": "p83_repeat_receipt_byte_identical", "status": "PASS" if first_receipt == second_receipt and bool(first_receipt) else "FAIL", "detail": sha256(second_receipt) if second_receipt else None},
    {"id": "p83_repeat_stdout_byte_identical", "status": "PASS" if first.stdout == second.stdout and bool(first.stdout) else "FAIL", "detail": sha256(second.stdout) if second.stdout else None},
    {
        "id": "p83_repeat_runtime_receipt_closed",
        "status": "PASS" if (
            parsed.get("generatedAt") == GENERATED_AT
            and parsed.get("status") == "PASS_BOUNDED_LOCAL_MOCKED_RPC"
            and (parsed.get("checks") or {}).get("total") == 35
            and (parsed.get("checks") or {}).get("passed") == 35
            and (parsed.get("checks") or {}).get("failed") == 0
        ) else "FAIL",
        "detail": {
            "generatedAt": parsed.get("generatedAt"),
            "status": parsed.get("status"),
            "checks": parsed.get("checks"),
        },
    },
]
failed = [row for row in checks if row["status"] != "PASS"]
payload = {
    "schemaVersion": "velmere.p83.audit-exact-artifact-atomic-publication-repeatability.v1",
    "generatedAt": GENERATED_AT,
    "status": "PASS" if not failed else "FAIL",
    "command": " ".join(COMMAND),
    "runCount": 2,
    "runtimeReceiptSha256": sha256(second_receipt) if second_receipt else None,
    "stdoutSha256": sha256(second.stdout) if second.stdout else None,
    "checks": {
        "total": len(checks),
        "passed": len(checks) - len(failed),
        "failed": len(failed),
        "rows": checks,
    },
    "truthBoundary": "Two byte-identical local mocked-RPC executions prove deterministic fixture/receipt behavior only. PostgreSQL, RLS, deployed HTTP, current chain state and exact Windows remain WITHHELD.",
}
OUT_RECEIPT.parent.mkdir(parents=True, exist_ok=True)
OUT_RECEIPT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
print(json.dumps(payload, indent=2))
raise SystemExit(1 if failed else 0)
