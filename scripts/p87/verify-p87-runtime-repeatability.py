#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, platform, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TARGET = ROOT / "receipts/p87/P87_REAL_MARKETS_EXACT_PDF_RUNTIME.json"
OUT = ROOT / "receipts/p87/P87_REAL_MARKETS_EXACT_PDF_REPEATABILITY.json"
CMD = [
    "node",
    "--import",
    "./scripts/pass11/register-offline-ts-loader.mjs",
    "scripts/p87/test-p87-real-markets-exact-pdf-runtime.mjs",
]

def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()

runs: list[tuple[bytes, bytes, bytes]] = []
for index in range(2):
    completed = subprocess.run(CMD, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if completed.returncode != 0:
        raise SystemExit(
            f"P87 repeatability run {index + 1} failed: "
            f"{completed.stderr.decode(errors='replace')}"
        )
    if not TARGET.is_file():
        raise SystemExit(f"P87 repeatability run {index + 1} did not produce runtime receipt")
    runs.append((completed.stdout, completed.stderr, TARGET.read_bytes()))

checks = [
    {"id": "p87_repeat_run1_exit_zero", "status": "PASS"},
    {"id": "p87_repeat_run2_exit_zero", "status": "PASS"},
    {"id": "p87_repeat_stdout_byte_identical", "status": "PASS" if runs[0][0] == runs[1][0] else "FAIL"},
    {"id": "p87_repeat_receipt_byte_identical", "status": "PASS" if runs[0][2] == runs[1][2] else "FAIL"},
    {"id": "p87_repeat_stderr_empty", "status": "PASS" if runs[0][1] == b"" and runs[1][1] == b"" else "FAIL"},
]

payload = {
    "schemaVersion": "velmere.p87.real-markets-exact-pdf-repeatability.v1",
    "generatedAt": "2026-08-20T12:00:00.000Z",
    "status": "PASS" if all(row["status"] == "PASS" for row in checks) else "FAIL",
    "runtime": {
        "python": platform.python_version(),
        "nodeCommand": " ".join(CMD),
    },
    "runs": [
        {
            "stdoutBytes": len(stdout),
            "stdoutSha256": digest(stdout),
            "stderrBytes": len(stderr),
            "receiptBytes": len(receipt),
            "receiptSha256": digest(receipt),
        }
        for stdout, stderr, receipt in runs
    ],
    "checks": {
        "total": len(checks),
        "passed": sum(row["status"] == "PASS" for row in checks),
        "failed": sum(row["status"] == "FAIL" for row in checks),
        "rows": checks,
    },
    "truthBoundary": (
        "Byte-identical local controlled-fixture execution only. It does not establish deployed HTTP, "
        "authorized database/JWT/RLS, current external provider evidence, rights, Customer FINAL, sale eligibility, "
        "whole-project build or exact Windows."
    ),
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
print(json.dumps(payload, indent=2))
raise SystemExit(0 if payload["status"] == "PASS" else 1)
