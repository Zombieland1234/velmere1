#!/usr/bin/env python3
"""Physically replay current A85 and attempt A83 in isolated hardlink worktrees.

A85 is replayed with the canonical repaired policy. The available local runtime is
Node 22.16.0; exact-Node credit is obtained only by byte parity with the existing
P39 Node 24.18.0 campaign. A83 is expected to fail closed because the licensed
external Manrope font is not included or available.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "artifacts/closure/p40/P40_A85_CANONICAL_REPLAY_AND_A83_FAIL_CLOSED_ATTEMPT.json"
CAMPAIGN = ROOT / "artifacts/closure/p39/P39_EXACT_NODE_24_18_0_LINUX_FIXTURE_CAMPAIGN.json"
NODE = Path("/opt/nvm/versions/node/v22.16.0/bin/node")
REVISION = "P40_V16_A85_CANONICAL_REPLAY_SOURCE_DIFFERENTIAL_FIXTURE_PROFILE_BASELINE"
GENERATED_AT = "2026-08-14T06:32:00.000Z"
EXPECTED_A85_POLICY = "99d45a32efe55d4d630a6fcab42c3b4a47a5b54332ed6ddbb23b8af52653bc73"
EXPECTED_A85_RECEIPT = "f72de4db59f4c72202034decbd9c82716056e75295926b6e7fec0cbdef6e69ea"
EXPECTED_A85_RUNTIME = "551b34089a3f901b5919da3684b8bda199ca7d160acafca2e0606b2d210823de"
A85_POLICY = Path("config/pass36/a85-shield-pro-map-full-depth-policy.json")
A85_RECEIPT = Path("config/pass36/a85-test-receipt.json")
A85_RUNTIME = Path("artifacts/pass36/a85/PASS36_A85_SHIELD_PRO_MAP_FULL_DEPTH_RUNTIME.json")
A83_RECEIPT = Path("config/pass36/a83-test-receipt.json")
A83_RUNTIME = Path("artifacts/pass36/a83/PASS36_A83_BROWSER_LENS_PDF_FIXTURE_RUNTIME.json")
A83_MANIFEST = Path("artifacts/pass36/a83/PASS36_A83_BROWSER_LENS_PDF_CORPUS_MANIFEST.json")
PROTECTED = [
    A85_POLICY, A85_RECEIPT, A85_RUNTIME, A83_RECEIPT, A83_RUNTIME, A83_MANIFEST,
    Path("package.json"), Path("package-lock.json"),
]


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def stable(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def break_link(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        return
    data = path.read_bytes()
    mode = path.stat().st_mode
    path.unlink()
    path.write_bytes(data)
    os.chmod(path, mode)


def snapshot(root: Path) -> dict[str, dict[str, Any]]:
    rows: dict[str, dict[str, Any]] = {}
    for rel in PROTECTED:
        path = root / rel
        rows[rel.as_posix()] = {
            "exists": path.is_file(),
            "sha256": sha256_file(path) if path.is_file() else None,
            "byteLength": path.stat().st_size if path.is_file() else None,
        }
    return rows


def run(work: Path, script: str, timeout: int) -> dict[str, Any]:
    env = os.environ.copy()
    env.update({"NODE_NO_WARNINGS": "1", "VELMERE_OFFLINE_TS_FORCE_BUILTIN": "1"})
    command = [str(NODE), "--import", "./scripts/pass11/register-offline-ts-loader.mjs", script]
    started = time.monotonic()
    try:
        result = subprocess.run(command, cwd=work, env=env, capture_output=True, text=True, timeout=timeout, check=False)
        timed_out = False
    except subprocess.TimeoutExpired as exc:
        return {
            "command": command, "exitCode": None, "timedOut": True,
            "durationMs": int((time.monotonic() - started) * 1000),
            "stdout": exc.stdout or "", "stderr": exc.stderr or "",
        }
    return {
        "command": command,
        "exitCode": result.returncode,
        "timedOut": timed_out,
        "durationMs": int((time.monotonic() - started) * 1000),
        "stdout": result.stdout,
        "stderr": result.stderr,
    }


def summarize_process(value: dict[str, Any]) -> dict[str, Any]:
    stdout = value.get("stdout", "")
    stderr = value.get("stderr", "")
    return {
        "command": value["command"],
        "exitCode": value["exitCode"],
        "timedOut": value["timedOut"],
        "durationMs": value["durationMs"],
        "stdoutBytes": len(stdout.encode("utf-8")),
        "stdoutSha256": sha256_bytes(stdout.encode("utf-8")),
        "stdoutTail": stdout[-3000:],
        "stderrBytes": len(stderr.encode("utf-8")),
        "stderrSha256": sha256_bytes(stderr.encode("utf-8")),
        "stderrTail": stderr[-3000:],
    }


def main() -> int:
    if not NODE.is_file():
        raise RuntimeError(f"node_runtime_missing:{NODE}")
    observed = subprocess.run([str(NODE), "--version"], capture_output=True, text=True, check=True).stdout.strip()
    if observed != "v22.16.0":
        raise RuntimeError(f"unexpected_local_node:{observed}")
    campaign = json.loads(CAMPAIGN.read_text(encoding="utf-8"))
    a85_exact = next(row for row in campaign["comparison"] if row["family"] == "A85_SHIELD_PRO_MAP")
    if a85_exact["receiptSha256"] != EXPECTED_A85_RECEIPT or a85_exact["runtimeSha256"] != EXPECTED_A85_RUNTIME:
        raise RuntimeError("p39_exact_node_a85_boundary_changed")
    if sha256_file(ROOT / A85_POLICY) != EXPECTED_A85_POLICY:
        raise RuntimeError("canonical_a85_policy_not_repaired")

    canonical_before = snapshot(ROOT)
    tmp = Path(tempfile.mkdtemp(prefix="p40-replay-", dir="/mnt/data"))
    work = tmp / "source"
    work.mkdir(parents=True)
    try:
        subprocess.run(["cp", "-al", f"{ROOT}/.", str(work)], check=True)
        for rel in (A85_RECEIPT, A85_RUNTIME, A83_RECEIPT, A83_RUNTIME, A83_MANIFEST):
            break_link(work / rel)

        a85_raw = run(work, "scripts/pass36/test-a85-shield-pro-map-full-depth-matrix.ts", 180)
        a85 = summarize_process(a85_raw)
        a85_receipt_sha = sha256_file(work / A85_RECEIPT) if (work / A85_RECEIPT).is_file() else None
        a85_runtime_sha = sha256_file(work / A85_RUNTIME) if (work / A85_RUNTIME).is_file() else None
        a85_pass = (
            a85["exitCode"] == 0 and not a85["timedOut"] and
            a85_receipt_sha == EXPECTED_A85_RECEIPT and
            a85_runtime_sha == EXPECTED_A85_RUNTIME
        )

        a83_raw = run(work, "scripts/pass36/test-a83-browser-lens-pdf-real-packet-matrix.ts", 180)
        a83 = summarize_process(a83_raw)
        combined_error = f"{a83_raw.get('stdout','')}\n{a83_raw.get('stderr','')}"
        missing_font = "lens_pdf_external_font_path_required" in combined_error
        a83_fail_closed = a83["exitCode"] not in (0, None) and not a83["timedOut"] and missing_font

        canonical_after = snapshot(ROOT)
        protected_unchanged = canonical_before == canonical_after
        if not protected_unchanged:
            raise RuntimeError("canonical_source_changed_during_isolated_replay")
        if not a85_pass:
            raise RuntimeError(f"a85_canonical_replay_failed:{a85_receipt_sha}:{a85_runtime_sha}:{a85['exitCode']}")
        if not a83_fail_closed:
            raise RuntimeError(f"a83_expected_fail_closed_boundary_missing:{a83['exitCode']}:{missing_font}")

        payload: dict[str, Any] = {
            "schemaVersion": "velmere.p40.a85-canonical-a83-replay.v1",
            "revision": REVISION,
            "generatedAt": GENERATED_AT,
            "state": "IMPLEMENTED_AND_TESTED_INTERNAL_DIAGNOSTIC",
            "releaseState": "NO_GO",
            "parentRoot": "R44P46",
            "localRuntime": {
                "nodeVersion": observed.removeprefix("v"),
                "exactProjectNode": False,
                "platform": os.uname().sysname.lower(),
                "architecture": os.uname().machine,
            },
            "a85CanonicalReplay": {
                "canonicalPolicyPath": A85_POLICY.as_posix(),
                "canonicalPolicySha256": EXPECTED_A85_POLICY,
                "process": a85,
                "generatedReceiptSha256": a85_receipt_sha,
                "generatedRuntimeSha256": a85_runtime_sha,
                "matchesP39ExactNode24180Receipt": a85_receipt_sha == a85_exact["receiptSha256"],
                "matchesP39ExactNode24180Runtime": a85_runtime_sha == a85_exact["runtimeSha256"],
                "canonicalCurrentPolicyReplayPass": a85_pass,
                "exactNode24180PhysicallyExecutedThisPass": False,
                "exactNode24180TransitiveByteBinding": True,
                "creditClass": "CANONICAL_CURRENT_POLICY_REPLAY_WITH_EXACT_NODE_BYTE_PARITY_FIXTURE_ONLY",
            },
            "a83ReplayAttempt": {
                "process": a83,
                "expectedFailureCode": "lens_pdf_external_font_path_required",
                "expectedFailureObserved": missing_font,
                "failClosedPass": a83_fail_closed,
                "externalFontPresent": False,
                "physicalPdfCorpusRegenerated": False,
                "browserExecuted": False,
                "pdfIndependentReplay": False,
                "creditClass": "CURRENT_PHYSICAL_ATTEMPT_ZERO_PDF_BROWSER_CREDIT",
            },
            "canonicalProtectedPaths": {
                "paths": [rel.as_posix() for rel in PROTECTED],
                "before": canonical_before,
                "after": canonical_after,
                "unchanged": protected_unchanged,
            },
            "credit": {
                "a85CanonicalStaleBindingClosed": True,
                "a85InternalFixtureRuntimeCurrentPolicyBound": True,
                "exactNode24180NewExecution": False,
                "pdfIndependentReplay": False,
                "browserExecution": False,
                "customerOutput": False,
                "sourceRights": False,
                "materialValue": False,
                "goInternal": False,
                "goPaid": False,
                "live": False,
                "worldClassProven": False,
            },
            "truthBoundary": "P40 physically replayed A85 against the repaired canonical current policy under the locally available Node 22.16.0 and reproduced the P39 exact Node 24.18.0 receipt and runtime bytes. This closes the stale canonical A85 source binding for the internal fixture contract, not a new exact-Node product run. A83 was physically attempted and failed closed because the required external font is unavailable; PDF and Browser remain open.",
        }
        payload["integritySha256"] = sha256_bytes(stable({k: v for k, v in payload.items() if k != "integritySha256"}))
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(json.dumps({
            "status": "PASS_P40_A85_CANONICAL_REPLAY_A83_FAIL_CLOSED",
            "a85ReceiptParity": True,
            "a85RuntimeParity": True,
            "a83Failure": "lens_pdf_external_font_path_required",
            "canonicalProtectedPathsUnchanged": len(PROTECTED),
            "receiptSha256": sha256_file(OUT),
            "releaseState": "NO_GO",
        }, ensure_ascii=False))
        return 0
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
