#!/usr/bin/env python3
from __future__ import annotations
import hashlib
import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NODE = ["node", "--import", "./scripts/pass11/register-offline-ts-loader.mjs"]
SPECS = [
    {
        "id": "customer_client_runtime",
        "command": NODE + ["scripts/p92/test-p92-risk-history-customer-client-runtime.mjs"],
        "receipt": "receipts/p92/P92_RISK_HISTORY_CUSTOMER_CLIENT_RUNTIME.json",
    },
    {
        "id": "customer_ui_static",
        "command": ["python3", "scripts/p92/test-p92-risk-history-ui-static.py"],
        "receipt": "receipts/p92/P92_RISK_HISTORY_UI_STATIC.json",
    },
    {
        "id": "changed_module_reachability",
        "command": NODE + ["scripts/p92/test-p92-changed-module-reachability.mjs"],
        "receipt": "receipts/p92/P92_CHANGED_MODULE_REACHABILITY.json",
    },
    {
        "id": "targeted_typescript",
        "command": ["python3", "scripts/p92/test-p92-targeted-typescript.py"],
        "receipt": "receipts/p92/P92_TARGETED_STRICT_TYPESCRIPT.json",
    },
]

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

env = dict(os.environ)
env.setdefault("TERM", "dumb")
rows = []
for spec in SPECS:
    attempts = []
    for iteration in (1, 2):
        result = subprocess.run(spec["command"], cwd=ROOT, env=env, capture_output=True)
        receipt_path = ROOT / spec["receipt"]
        receipt_bytes = receipt_path.read_bytes() if receipt_path.exists() else b""
        log = ROOT / f"artifacts/p92/logs/repeatability/{spec['id']}_{iteration}.log"
        log.parent.mkdir(parents=True, exist_ok=True)
        log.write_bytes(result.stdout + (b"\n--- STDERR ---\n" + result.stderr if result.stderr else b""))
        attempts.append({
            "iteration": iteration,
            "returnCode": result.returncode,
            "stdoutSha256": sha(result.stdout),
            "stderrSha256": sha(result.stderr),
            "receiptSha256": sha(receipt_bytes),
            "log": log.relative_to(ROOT).as_posix(),
            "logSha256": sha(log.read_bytes()),
        })
    equal = all(attempts[0][key] == attempts[1][key] for key in ["returnCode", "stdoutSha256", "stderrSha256", "receiptSha256"])
    passed = equal and attempts[0]["returnCode"] == 0
    rows.append({"id": spec["id"], "status": "PASS" if passed else "FAIL", "byteIdentical": equal, "attempts": attempts})

failed = [row for row in rows if row["status"] != "PASS"]
checks = []
for row in rows:
    checks.extend([
        {"id": f"{row['id']}_return_code", "status": row["status"]},
        {"id": f"{row['id']}_stdout_identical", "status": "PASS" if row["byteIdentical"] else "FAIL"},
        {"id": f"{row['id']}_stderr_identical", "status": "PASS" if row["byteIdentical"] else "FAIL"},
        {"id": f"{row['id']}_receipt_identical", "status": "PASS" if row["byteIdentical"] else "FAIL"},
    ])
receipt = {
    "schemaVersion": "velmere.p92.runtime-repeatability.v1",
    "generatedAt": "2026-08-20T20:00:00.000Z",
    "status": "PASS_BOUNDED_2_OF_2_BYTE_IDENTICAL" if not failed else "FAIL",
    "checks": {"total": len(checks), "passed": sum(row["status"] == "PASS" for row in checks), "failed": sum(row["status"] != "PASS" for row in checks), "rows": checks},
    "executions": rows,
    "zeroFakeCredit": {
        "browserRendered": False,
        "deployedRouteExecuted": False,
        "wholeProjectBuild": False,
        "customerFinal": "0/20",
    },
    "truthBoundary": "Two local executions of each P92 bounded harness produced identical return codes, stdout, stderr and receipt bytes. This does not make static or ambient TypeScript proof into Browser, staging, build or Customer FINAL evidence.",
}
for target in [ROOT / "receipts/p92/P92_RUNTIME_REPEATABILITY.json", ROOT / "artifacts/p92/P92_RUNTIME_REPEATABILITY.json"]:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(receipt, indent=2) + "\n")
print(json.dumps({"status": receipt["status"], "checks": receipt["checks"], "executions": rows}, indent=2))
raise SystemExit(0 if not failed else 1)
