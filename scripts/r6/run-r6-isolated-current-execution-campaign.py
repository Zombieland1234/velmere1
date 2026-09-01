#!/usr/bin/env python3
"""Run every current-execution test in an isolated process with bounded concurrency.

This is an evidence runner, not a Customer FINAL grant. It deliberately classifies
missing exact dependencies and exact Windows separately from real regressions.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
CURRENT = ROOT / "scripts" / "current-execution"
LOADER = "./scripts/pass11/register-offline-ts-loader.mjs"
MAX_TAIL = 2400


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8", errors="replace")).hexdigest()


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def selected_tests() -> list[str]:
    return sorted(
        f"scripts/current-execution/{path.name}"
        for path in CURRENT.iterdir()
        if path.is_file()
        and (path.name.startswith("test-") or path.name.startswith("verify-"))
        and path.suffix in {".mjs", ".mts", ".ts"}
    )


def command_for(file: str, env_receipt: str) -> list[str]:
    if file.endswith("test-runtime-env-canonical-example.mjs"):
        return ["node", file, "--receipt", env_receipt]
    if file.endswith((".mts", ".ts")):
        return ["node", "--import", LOADER, file]
    return ["node", file]


def classify(status: int | None, stdout: str, stderr: str, timed_out: bool) -> str:
    text = f"{stdout}\n{stderr}"
    if status == 0:
        return "PASS"
    if "WITHHELD_EXACT_WINDOWS_SERVER_2025_REQUIRED" in text:
        return "WITHHELD_EXACT_WINDOWS_SERVER_2025_REQUIRED"
    if "pass11_offline_supabase_sdk_client_not_available" in text:
        return "WITHHELD_AUTHORIZED_RUNTIME_ENVIRONMENT"
    if any(
        marker in text
        for marker in (
            "ERR_MODULE_NOT_FOUND",
            "Cannot find package",
            "does not provide an export named",
        )
    ):
        return "WITHHELD_DEPENDENCY_ENVIRONMENT"
    if timed_out:
        return "TIMEOUT"
    return "FAIL"


def run_one(file: str, env_receipt: str, timeout_seconds: int) -> dict[str, Any]:
    command = command_for(file, env_receipt)
    started = time.monotonic()
    stdout = ""
    stderr = ""
    status: int | None = None
    timed_out = False
    try:
        process = subprocess.run(
            command,
            cwd=ROOT,
            env={**os.environ, "CI": "1"},
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            check=False,
        )
        stdout = process.stdout
        stderr = process.stderr
        status = process.returncode
    except subprocess.TimeoutExpired as error:
        timed_out = True
        stdout = error.stdout.decode(errors="replace") if isinstance(error.stdout, bytes) else (error.stdout or "")
        stderr = error.stderr.decode(errors="replace") if isinstance(error.stderr, bytes) else (error.stderr or "")
    duration_ms = round((time.monotonic() - started) * 1000)
    return {
        "file": file,
        "command": command,
        "exitCode": status,
        "classification": classify(status, stdout, stderr, timed_out),
        "durationMs": duration_ms,
        "stdoutSha256": sha256_text(stdout),
        "stderrSha256": sha256_text(stderr),
        "stdoutTail": stdout[-MAX_TAIL:],
        "stderrTail": stderr[-MAX_TAIL:],
    }


def version(command: list[str]) -> str | None:
    result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, check=False)
    return result.stdout.strip() if result.returncode == 0 else None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--env-receipt", required=True)
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--timeout-seconds", type=int, default=75)
    args = parser.parse_args()

    output = (ROOT / args.output).resolve()
    env_receipt = Path(args.env_receipt).as_posix()
    output.parent.mkdir(parents=True, exist_ok=True)
    (ROOT / env_receipt).parent.mkdir(parents=True, exist_ok=True)

    tests = selected_tests()
    pglite_tests = [file for file in tests if file.endswith("-pglite.mjs")]
    parallel_tests = [file for file in tests if file not in pglite_tests]
    started_at = utc_now()
    started = time.monotonic()
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, min(args.workers, 8))) as pool:
        futures = [pool.submit(run_one, file, env_receipt, args.timeout_seconds) for file in parallel_tests]
        results = [future.result() for future in futures]
    # PGlite 0.5.4 is deliberately serialized. Concurrent independent Node
    # initializations have a current upstream native-crash report; a test harness
    # must not turn that known substrate risk into nondeterministic product noise.
    results.extend(run_one(file, env_receipt, args.timeout_seconds) for file in pglite_tests)
    results.sort(key=lambda item: item["file"])

    summary: dict[str, int] = {}
    for result in results:
        classification = result["classification"]
        summary[classification] = summary.get(classification, 0) + 1
    summary = dict(sorted(summary.items()))
    failures = [result for result in results if result["classification"] in {"FAIL", "TIMEOUT"}]

    payload = {
        "schemaVersion": "velmere.r6.isolated-current-execution-campaign.v1",
        "generatedAt": utc_now(),
        "startedAt": started_at,
        "durationMs": round((time.monotonic() - started) * 1000),
        "sourceBinding": {
            "packageJsonSha256": sha256_file(ROOT / "package.json"),
            "packageLockSha256": sha256_file(ROOT / "package-lock.json"),
            "criticalFiles": {
                path: sha256_file(ROOT / path)
                for path in (
                    "lib/ai/angel-durable-memory.ts",
                    "lib/network/brokered-egress.ts",
                    "lib/market-integrity/public-proof-page-boundary.ts",
                    "lib/market-integrity/public-verify-record-view-model.ts",
                    "scripts/current-execution/test-angel-durable-memory-delete-fail-closed.mts",
                    "scripts/current-execution/test-public-proof-publication-boundary.ts",
                    "scripts/current-execution/test-runtime-env-canonical-example.mjs",
                    "scripts/current-execution/test-v4-verify-durable-registry-boundary.ts",
                    "config/pass4992-supply-chain-release-policy.json",
                    "scripts/current-execution/test-pass4992-current-workflow-policy.mjs",
                    "scripts/pass11/test-supabase-service-rest.ts",
                    "scripts/r6/run-r6-isolated-current-execution-campaign.py",
                    "scripts/r6/build-r6-repeatability.py",
                    "scripts/r6/prepare-exact-pglite.py",
                    "scripts/r6/verify-r6-exact-windows-workflow.py",
                    ".github/workflows/r6-exact-windows-current-byte-closure.yml",
                )
            },
        },
        "environment": {
            "platform": sys.platform,
            "arch": os.uname().machine if hasattr(os, "uname") else None,
            "node": version(["node", "--version"]),
            "npm": version(["npm", "--version"]),
            "exactAuthorityTarget": {
                "platform": "win32",
                "arch": "x64",
                "node": "v24.18.0",
                "npm": "11.16.0",
                "os": "Windows Server 2025",
            },
        },
        "execution": {
            "workers": max(1, min(args.workers, 8)),
            "perTestTimeoutSeconds": args.timeout_seconds,
            "isolatedProcessPerTest": True,
            "pgliteTestsSerialized": True,
            "pgliteSerializationReason": "upstream electric-sql/pglite issue 1053 reports concurrent Node process initialization SIGSEGV",
            "pgliteUpstreamIssue": "https://github.com/electric-sql/pglite/issues/1053",
            "runtimeEnvironmentReceipt": env_receipt,
        },
        "selectedTests": len(results),
        "summary": summary,
        "actualFailureCount": len(failures),
        "results": results,
        "customerFinalCredit": False,
        "exactWindowsCredit": False,
        "stagingCredit": False,
        "classification": (
            "PASS_LOCAL_CAMPAIGN_WITH_EXPLICIT_WITHHELD_GATES"
            if not failures
            else "FAIL_LOCAL_CAMPAIGN"
        ),
        "truthBoundary": (
            "Local current-source execution only. PASS does not grant a customer row FINAL. "
            "Missing exact PGlite bytes and exact Windows Server 2025 remain explicit WITHHELD gates."
        ),
    }
    output.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({
        "selectedTests": payload["selectedTests"],
        "durationMs": payload["durationMs"],
        "summary": payload["summary"],
        "actualFailureCount": payload["actualFailureCount"],
        "classification": payload["classification"],
        "output": output.relative_to(ROOT).as_posix(),
    }, indent=2, ensure_ascii=False))
    return 2 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
