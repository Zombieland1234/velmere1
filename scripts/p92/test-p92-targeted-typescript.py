#!/usr/bin/env python3
from __future__ import annotations
import hashlib
import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPECS = [
    ("customer_client_semantic", "tsconfig.p92-risk-history-customer-client.json", "artifacts/p92/logs/typescript/P92_CUSTOMER_CLIENT_TYPESCRIPT.log"),
    ("customer_ui_semantic_with_closed_ambient", "tsconfig.p92-risk-history-ui-targeted.json", "artifacts/p92/logs/typescript/P92_CUSTOMER_UI_TYPESCRIPT.log"),
]
rows = []
env = dict(os.environ)
env.setdefault("TERM", "dumb")
for ident, config, log_rel in SPECS:
    process = subprocess.run(["tsc", "-p", config, "--pretty", "false"], cwd=ROOT, env=env, capture_output=True)
    log = ROOT / log_rel
    log.parent.mkdir(parents=True, exist_ok=True)
    log.write_bytes(process.stdout + (b"\n--- STDERR ---\n" + process.stderr if process.stderr else b""))
    rows.append({
        "id": ident,
        "status": "PASS" if process.returncode == 0 else "FAIL",
        "returnCode": process.returncode,
        "config": config,
        "log": log_rel,
        "logSha256": hashlib.sha256(log.read_bytes()).hexdigest(),
    })
failed = [row for row in rows if row["status"] != "PASS"]
receipt = {
    "schemaVersion": "velmere.p92.targeted-strict-typescript.v1",
    "generatedAt": "2026-08-20T20:00:00.000Z",
    "status": "PASS_BOUNDED_TARGETED_STRICT_TYPESCRIPT" if not failed else "FAIL",
    "checks": {"total": len(rows), "passed": len(rows)-len(failed), "failed": len(failed), "rows": rows},
    "zeroFakeCredit": {
        "wholeProjectSemanticTypeScript": False,
        "realReactDependencyGraph": False,
        "eslint": False,
        "webpack": False,
        "turbopack": False,
        "exactWindows": False,
        "customerFinal": "0/20",
    },
    "truthBoundary": "The pure client compiles against its real transitive source graph. The TSX control compiles strictly against closed ambient declarations because the SOURCE_ONLY environment has no installed React/Next dependency graph. Whole-project semantic TypeScript remains WITHHELD, not PASS or FAIL.",
}
for target in [ROOT / "receipts/p92/P92_TARGETED_STRICT_TYPESCRIPT.json", ROOT / "artifacts/p92/P92_TARGETED_STRICT_TYPESCRIPT.json"]:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(receipt, indent=2) + "\n")
print(json.dumps({"status": receipt["status"], "checks": receipt["checks"]}, indent=2))
raise SystemExit(0 if not failed else 1)
