#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import pathlib
import socket
import subprocess
import sys
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent


def reserve_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def wait_ready(url: str, process: subprocess.Popen[bytes], timeout: float = 15.0) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"fixture exited early with code {process.returncode}")
        try:
            with urllib.request.urlopen(url, timeout=0.5) as response:
                if response.status == 200:
                    return
        except Exception:
            pass
        time.sleep(0.1)
    raise TimeoutError("fixture readiness timeout")


def run_checked(command: list[str], env: dict[str, str], stdout_path: pathlib.Path, stderr_path: pathlib.Path) -> None:
    with stdout_path.open("wb") as stdout_file, stderr_path.open("wb") as stderr_file:
        completed = subprocess.run(command, env=env, stdout=stdout_file, stderr=stderr_file, check=False)
    if completed.returncode != 0:
        raise RuntimeError(f"command failed ({completed.returncode}): {' '.join(command)}")
    if stderr_path.stat().st_size != 0:
        raise RuntimeError(f"unexpected stderr: {stderr_path}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--evidence-root", required=True)
    parser.add_argument("--revision", required=True)
    parser.add_argument("--manifest-sha256", required=True)
    parser.add_argument("--aggregate-sha256", required=True)
    parser.add_argument("--run-id", default="local-r44p32")
    args = parser.parse_args()

    evidence_root = pathlib.Path(args.evidence_root).resolve()
    evidence_root.mkdir(parents=True, exist_ok=True)
    port = reserve_port()
    env = os.environ.copy()
    env.update({
        "VELMERE_STRIPE_FIXTURE_HOST": "127.0.0.1",
        "VELMERE_STRIPE_FIXTURE_PORT": str(port),
        "STRIPE_MOCK_URL": f"http://127.0.0.1:{port}",
        "VELMERE_EVIDENCE_DIR": str(evidence_root / "evidence"),
        "VELMERE_VERIFIER_OUTPUT": str(evidence_root / "R44P32_INDEPENDENT_LOCAL_STRIPE_VERIFICATION.json"),
        "VELMERE_SOURCE_REVISION_ID": args.revision,
        "VELMERE_SOURCE_MANIFEST_SHA256": args.manifest_sha256,
        "VELMERE_SOURCE_AGGREGATE_SHA256": args.aggregate_sha256,
        "GITHUB_RUN_ID": args.run_id,
    })
    fixture_stdout = (evidence_root / "R44P32_LOCAL_STRIPE_FIXTURE.stdout.log").open("wb")
    fixture_stderr = (evidence_root / "R44P32_LOCAL_STRIPE_FIXTURE.stderr.log").open("wb")
    fixture = subprocess.Popen(
        [sys.executable, str(ROOT / "local_stripe_api_fixture.py")],
        env=env,
        stdout=fixture_stdout,
        stderr=fixture_stderr,
    )
    try:
        wait_ready(f"http://127.0.0.1:{port}/health", fixture)
        run_checked(
            [sys.executable, str(ROOT / "run_local_stripe_lifecycle.py")],
            env,
            evidence_root / "R44P32_LOCAL_STRIPE_EXECUTION.stdout.json",
            evidence_root / "R44P32_LOCAL_STRIPE_EXECUTION.stderr.log",
        )
        run_checked(
            [sys.executable, str(ROOT / "verify_local_stripe_lifecycle.py")],
            env,
            evidence_root / "R44P32_LOCAL_STRIPE_VERIFIER.stdout.json",
            evidence_root / "R44P32_LOCAL_STRIPE_VERIFIER.stderr.log",
        )
    finally:
        fixture.terminate()
        try:
            fixture.wait(timeout=5.0)
        except subprocess.TimeoutExpired:
            fixture.kill()
            fixture.wait(timeout=5.0)
        fixture_stdout.close()
        fixture_stderr.close()

    summary = json.loads((evidence_root / "evidence" / "R44P32_LOCAL_STRIPE_LIFECYCLE.json").read_text("utf-8"))
    verifier = json.loads((evidence_root / "R44P32_INDEPENDENT_LOCAL_STRIPE_VERIFICATION.json").read_text("utf-8"))
    receipt = {
        "schemaVersion": "velmere.pass36.a102r44p32.local-stripe-suite-execution.v1",
        "status": "PASS" if summary.get("status") == "PASS" and verifier.get("status") == "PASS" else "FAIL",
        "classification": summary.get("classification"),
        "lifecycle": {"required": summary.get("required"), "passed": summary.get("passed"), "failed": summary.get("failed")},
        "independentVerifier": {"checks": verifier.get("checks"), "passed": verifier.get("passed"), "failed": verifier.get("failed")},
        "sourceBinding": summary.get("sourceBinding"),
        "truthBoundary": summary.get("truthBoundary"),
    }
    (evidence_root / "R44P32_LOCAL_STRIPE_SUITE_RECEIPT.json").write_text(json.dumps(receipt, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps(receipt, sort_keys=True))
    return 0 if receipt["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
