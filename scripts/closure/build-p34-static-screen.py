#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "artifacts/closure/p34"
OUT = ART / "P34_STATIC_SCREEN.json"

EXCLUDED_PARTS = {".git", ".next", "node_modules", ".velmere", "__pycache__"}


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def run(name: str, command: list[str], timeout: int = 300) -> dict[str, Any]:
    proc = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, timeout=timeout, env={**os.environ, "TERM": "dumb"})
    return {
        "name": name,
        "command": command,
        "returnCode": proc.returncode,
        "stdoutTail": proc.stdout[-4000:],
        "stderrTail": proc.stderr[-4000:],
    }


def main() -> int:
    json_errors: list[dict[str, str]] = []
    parsed = 0
    for path in sorted(ROOT.rglob("*.json"), key=lambda p: p.as_posix().encode("utf-8")):
        rel = path.relative_to(ROOT)
        if any(part in EXCLUDED_PARTS for part in rel.parts):
            continue
        if path.name.endswith((".stdout.json", ".stderr.json")) or path.name == "P34_STATIC_SCREEN.json":
            continue
        try:
            json.loads(path.read_text("utf-8"))
            parsed += 1
        except Exception as exc:
            json_errors.append({"path": rel.as_posix(), "error": str(exc)})

    python_files = [
        "scripts/closure/build-p34-source-identity.py",
        "scripts/closure/build-p34-parent-diff.py",
        "scripts/closure/build-p34-internal-ai-dual-ledger.py",
        "scripts/closure/verify-p34-internal-ai-dual-ledger.py",
        "scripts/closure/build-p34-static-screen.py",
        "scripts/closure/build-p34-handoff.py",
        "scripts/closure/package-p34-current-source.py",
    ]
    commands = [
        run("python_compile", [sys.executable, "-m", "py_compile", *python_files]),
        run("node_check", ["node", "--check", "tests/security/a102-internal-ai-dual-ledger.test.mjs"]),
        run("dual_ledger_test", ["node", "tests/security/a102-internal-ai-dual-ledger.test.mjs"]),
        run("p32_profile_verifier", [sys.executable, "scripts/closure/verify-p32-profile-execution-receipts.py"]),
        run("p33_paid_verifier", [sys.executable, "scripts/closure/verify-p33-paid-readiness.py"]),
    ]

    source = json.loads((ART / "source-identity.json").read_text("utf-8"))
    summary = json.loads((ART / "internal-ai-dual-ledger-summary.json").read_text("utf-8"))
    verifier = json.loads((ART / "internal-ai-dual-ledger-verifier-receipt.json").read_text("utf-8"))
    parent_diff = json.loads((ART / "p33-vs-p34-current-diff.json").read_text("utf-8"))

    stale_current_paths = [
        "config/closure/p34/internal-ai-simulation-policy.json",
        "scripts/closure/build-p34-internal-ai-simulation.py",
        "scripts/closure/verify-p34-internal-ai-simulation.py",
        "scripts/closure/build-p34-internal-ai-panel.mjs",
        "scripts/closure/verify-p34-internal-ai-panel.mjs",
        "tests/security/a102-internal-ai-simulation-external-credit-separation.test.mjs",
    ]
    stale_present = [path for path in stale_current_paths if (ROOT / path).exists()]

    status = "PASS" if not json_errors and not stale_present and all(row["returnCode"] == 0 for row in commands) else "FAIL"
    result = {
        "schemaVersion": "velmere.p34.static-screen.v4",
        "status": status,
        "jsonFilesParsed": parsed,
        "jsonParseErrors": json_errors,
        "staleDraftAuthorityFiles": stale_present,
        "pythonFilesCompiled": len(python_files),
        "commands": commands,
        "sourceIdentity": {
            "fileCount": source["fileCount"],
            "payloadBytes": source["payloadBytes"],
            "sourceAggregateSha256": source["sourceAggregateSha256"],
            "receiptSha256": digest(ART / "source-identity.json"),
        },
        "internalAiTable": {
            "cohorts": summary["cohortCount"],
            "rowsExecuted": summary["totalRowsExecuted"],
            "rowDenominator": summary["totalRowDenominator"],
            "coveragePercent": summary["aiInternalExecutionCoveragePercent"],
            "profilesCovered": summary["profileCoverage"]["profileCount"],
        },
        "realExternalTable": {
            "tracksCompleted": 0,
            "trackDenominator": 9,
            "coveragePercent": 0,
        },
        "falsePromotionMutations": {
            "detected": verifier["mutationsDetected"],
            "denominator": verifier["mutationDenominator"],
        },
        "parentDiff": {
            "parentFileCount": parent_diff["parentFileCount"],
            "currentFileCount": parent_diff["currentFileCount"],
            "onlyParentCount": parent_diff["onlyParentCount"],
            "onlyCurrentCount": parent_diff["onlyCurrentCount"],
            "changedCount": parent_diff["changedCount"],
        },
        "truthBoundary": "PASS applies to P34 dual-ledger authority, integrity and static checks only. Production build, Browser runtime, final holdouts, real customers, independent review, professional legal/provider rights and GO_PAID remain open.",
    }
    OUT.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", "utf-8")
    print(json.dumps({"status": status, "jsonFilesParsed": parsed, "commandsPassed": sum(row["returnCode"] == 0 for row in commands), "commandsTotal": len(commands), "staleDraftAuthorityFiles": stale_present}))
    return 0 if status == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
