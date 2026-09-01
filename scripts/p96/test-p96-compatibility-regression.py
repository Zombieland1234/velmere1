#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LOG_ROOT = ROOT / "artifacts/p96/logs/compatibility"
LOG_ROOT.mkdir(parents=True, exist_ok=True)
NODE = ["node", "--import", "./scripts/pass11/register-offline-ts-loader.mjs"]

CASES = [
    {
        "id": "p91_event_contract",
        "command": NODE + ["./scripts/p91/test-p91-risk-history-contract-runtime.mjs"],
        "receipt": "receipts/p91/P91_RISK_HISTORY_CONTRACT_RUNTIME.json",
        "artifact": "artifacts/p91/P91_RISK_HISTORY_CONTRACT_RUNTIME.json",
    },
    {
        "id": "p93_durable_canonical_compatibility",
        "command": NODE + ["./scripts/p93/test-p93-risk-history-durable-canonical-compatibility-runtime.mjs"],
        "receipt": "receipts/p93/P93_RISK_HISTORY_DURABLE_CANONICAL_COMPATIBILITY_RUNTIME.json",
        "artifact": "artifacts/p93/P93_RISK_HISTORY_DURABLE_CANONICAL_COMPATIBILITY_RUNTIME.json",
    },
    {
        "id": "p93_cross_product_propagation",
        "command": ["python", "./scripts/p93/test-p93-cross-product-risk-history-propagation-static.py"],
        "receipt": "receipts/p93/P93_CROSS_PRODUCT_RISK_HISTORY_PROPAGATION_STATIC.json",
        "artifact": "artifacts/p93/P93_CROSS_PRODUCT_RISK_HISTORY_PROPAGATION_STATIC.json",
    },
]


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_optional(path: Path) -> bytes | None:
    return path.read_bytes() if path.is_file() else None


rows: list[dict[str, object]] = []
for case in CASES:
    receipt_path = ROOT / str(case["receipt"])
    artifact_path = ROOT / str(case["artifact"])
    before_receipt = read_optional(receipt_path)
    before_artifact = read_optional(artifact_path)
    proc = subprocess.run(
        [str(part) for part in case["command"]],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=180,
        env={**os.environ, "TZ": "UTC", "LC_ALL": "C.UTF-8", "LANG": "C.UTF-8"},
    )
    identifier = str(case["id"])
    (LOG_ROOT / f"{identifier}.stdout.log").write_bytes(proc.stdout)
    (LOG_ROOT / f"{identifier}.stderr.log").write_bytes(proc.stderr)
    generated = read_optional(receipt_path)
    parsed: dict[str, object] | None = None
    if generated is not None:
        try:
            parsed = json.loads(generated.decode("utf-8"))
        except Exception:
            parsed = None
        (LOG_ROOT / f"{identifier}.generated-receipt.json").write_bytes(generated)

    # Historical P91/P93 receipt paths are frozen. Always restore exact pre-run bytes.
    for target, original in ((receipt_path, before_receipt), (artifact_path, before_artifact)):
        if original is None:
            target.unlink(missing_ok=True)
        else:
            target.write_bytes(original)

    after_receipt = read_optional(receipt_path)
    after_artifact = read_optional(artifact_path)
    restored = after_receipt == before_receipt and after_artifact == before_artifact
    check_block = parsed.get("checks") if isinstance(parsed, dict) else None
    total = int(check_block.get("total", 0)) if isinstance(check_block, dict) else 0
    passed = int(check_block.get("passed", 0)) if isinstance(check_block, dict) else 0
    failed = int(check_block.get("failed", 1)) if isinstance(check_block, dict) else 1
    status = str(parsed.get("status", "MISSING")) if isinstance(parsed, dict) else "MISSING"
    current_pass = proc.returncode == 0 and total > 0 and passed == total and failed == 0 and status.startswith("PASS") and restored
    rows.append({
        "id": identifier,
        "status": "PASS" if current_pass else "FAIL",
        "exitCode": proc.returncode,
        "generatedReceiptStatus": status,
        "checks": {"total": total, "passed": passed, "failed": failed},
        "historicalReceiptRestoredByteIdentical": restored,
        "historicalReceiptBeforeSha256": None if before_receipt is None else sha(before_receipt),
        "historicalReceiptAfterSha256": None if after_receipt is None else sha(after_receipt),
        "stdoutSha256": sha(proc.stdout),
        "stderrSha256": sha(proc.stderr),
    })

failed_rows = [row for row in rows if row["status"] != "PASS"]
check_total = sum(int(row["checks"]["total"]) for row in rows)
check_passed = sum(int(row["checks"]["passed"]) for row in rows)
receipt = {
    "schemaVersion": "velmere.p96.compatibility-regression.v1",
    "generatedAt": "2026-08-21T05:00:00.000Z",
    "status": "PASS_BOUNDED_CURRENT_BYTE_COMPATIBILITY" if not failed_rows else "FAIL",
    "commands": {
        "total": len(rows),
        "passed": len(rows) - len(failed_rows),
        "failed": len(failed_rows),
        "rows": rows,
    },
    "executedChecks": {
        "total": check_total,
        "passed": check_passed,
        "failed": check_total - check_passed,
    },
    "historyPreservation": {
        "policy": "P91/P93 receipt paths were snapshotted before execution and restored byte-for-byte after current-byte compatibility evaluation.",
        "allRestoredByteIdentical": all(bool(row["historicalReceiptRestoredByteIdentical"]) for row in rows),
    },
    "zeroFakeCredit": {
        "supersededP94RouteHarnessCredited": False,
        "historicalReceiptsRewritten": False,
        "browserRendered": False,
        "databaseExecuted": False,
        "wholeProjectBuild": False,
        "exactWindows": False,
        "customerFinal": "0/20",
    },
    "truthBoundary": "Current P96 bytes retain the P91 event contract, P93 durability/canonical compatibility and P93 shared-reader cross-product propagation. The superseded P94/P95 single-branch route contracts are not reused as current integration proof. This does not execute PostgreSQL, deployed HTTP, Browser, accessibility, whole-project build or exact Windows.",
}
for relative in ["receipts/p96/P96_COMPATIBILITY_REGRESSION.json", "artifacts/p96/P96_COMPATIBILITY_REGRESSION.json"]:
    target = ROOT / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps({"status": receipt["status"], "commands": receipt["commands"], "executedChecks": receipt["executedChecks"]}, indent=2, ensure_ascii=False))
raise SystemExit(1 if failed_rows else 0)
