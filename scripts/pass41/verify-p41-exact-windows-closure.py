#!/usr/bin/env python3
"""Verify the P41 exact-Windows current-root bridge and source bindings.

This verifier is platform-neutral. Passing it proves bridge/source contract integrity,
not exact Windows execution, dependency closure, semantic checks or production builds.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import traceback
from typing import Any

V16_SHA = "67816a5a9238668c8080a3a8cc623f078d268c1b78fddf534cb4893bb45490e9"
PACKAGE_SHA = "04aa4b393337fffa6e02ef54ad7668fe8136b038b0d924b208158a095b6f70a5"
LOCK_SHA = "e228adec08801e454ef5559a20f302110b4896a307c364195716218a376c48bb"
P40_SOURCE_AGG = "81fd077bf390f2b1c6937d02703983ae9714849149a4c492f74f77b2446db9c7"
EXPECTED_PUBLIC_PEMS = {
    f"config/release-verification/pass{number}-offline-candidate-public.pem"
    for number in range(4734, 4742)
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def derive_lock_denominator(lock: dict[str, Any]) -> dict[str, int]:
    rows: list[tuple[str, str]] = []
    lock_paths = 0
    for lock_path, entry in lock.get("packages", {}).items():
        if not lock_path or not isinstance(entry, dict):
            continue
        if entry.get("resolved") and entry.get("integrity"):
            lock_paths += 1
            rows.append((entry["resolved"], entry["integrity"]))
    return {"lockPathsWithResolvedIntegrity": lock_paths, "uniqueResolvedIntegrityTarballs": len(set(rows))}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    root = Path(args.root).resolve()
    output = Path(args.output).resolve()
    receipt: dict[str, Any] = {
        "schemaVersion": "velmere.p41.current-root-bridge-verification.v1",
        "revision": "P41_V16_EXACT_WINDOWS_PREFLIGHT_CURRENT_ROOT_BRIDGE_REPAIR",
        "status": "IN_PROGRESS",
        "classification": "PORTABLE_CURRENT_ROOT_BRIDGE_VERIFICATION_ONLY",
        "checks": {},
        "failures": [],
        "creditBoundary": {
            "sourceAndBridgeContract": True,
            "exactWindowsExecution": False,
            "dependencyClosure": False,
            "typecheckLintDualBuild": False,
            "browser": False,
            "pdf": False,
            "customerOutput": False,
            "saleOrRelease": False,
        },
    }
    try:
        policy_path = root / "config/p41/p41-exact-windows-current-root-closure-policy.json"
        workflow_path = root / ".github/workflows/p41-exact-windows-node24-current-root-closure.yml"
        runner_path = root / "scripts/pass41/run-p41-exact-windows-closure.mjs"
        identity_builder = root / "scripts/closure/build-p41-source-identity.py"
        identity_path = root / "artifacts/closure/p41/source-identity.json"
        authority_path = root / "docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V16_FULL_TOPOLOGY_FREE_LEGAL_CURRENT_WORLD_CLASS_2026-08-14.txt"
        package_path = root / "package.json"
        lock_path = root / "package-lock.json"

        required = [policy_path, workflow_path, runner_path, identity_builder, identity_path, authority_path, package_path, lock_path]
        receipt["checks"]["requiredFiles"] = all(path.is_file() for path in required)
        if not receipt["checks"]["requiredFiles"]:
            raise RuntimeError(f"required_files_missing:{[str(path) for path in required if not path.is_file()]}")

        policy = load_json(policy_path)
        lock = load_json(lock_path)
        workflow = workflow_path.read_text(encoding="utf-8")
        runner = runner_path.read_text(encoding="utf-8")
        identity = load_json(identity_path)
        denominator = derive_lock_denominator(lock)

        checks = receipt["checks"]
        checks.update({
            "authoritySha256": sha256_file(authority_path) == V16_SHA == policy["authority"]["sha256"],
            "packageJsonSha256": sha256_file(package_path) == PACKAGE_SHA == policy["currentRootBindings"]["packageJson"]["sha256"],
            "packageLockSha256": sha256_file(lock_path) == LOCK_SHA == policy["currentRootBindings"]["packageLock"]["sha256"],
            "packageJsonByteLength": package_path.stat().st_size == policy["currentRootBindings"]["packageJson"]["byteLength"] == 135167,
            "packageLockByteLength": lock_path.stat().st_size == policy["currentRootBindings"]["packageLock"]["byteLength"] == 354803,
            "lockfileVersion": lock.get("lockfileVersion") == 3,
            "lockPathDenominator": denominator["lockPathsWithResolvedIntegrity"] == policy["currentRootBindings"]["packageLock"]["lockPathsWithResolvedIntegrity"] == 661,
            "uniqueTarballDenominator": denominator["uniqueResolvedIntegrityTarballs"] == policy["currentRootBindings"]["packageLock"]["uniqueResolvedIntegrityTarballs"] == 618,
            "parentSourceAggregate": policy["parentSourceAggregateSha256"] == P40_SOURCE_AGG,
            "identityParentSourceAggregate": identity["parentSourceAggregateSha256"] == P40_SOURCE_AGG,
            "identityCurrentAuthority": identity["requiredAuthorityBinding"]["sha256"] == V16_SHA,
            "identityPackageBinding": identity["runtimeSourceContract"]["observedSourceContract"]["packageJsonSha256"] == PACKAGE_SHA,
            "identityLockBinding": identity["runtimeSourceContract"]["observedSourceContract"]["packageLockSha256"] == LOCK_SHA,
            "identityLockDenominator": identity["runtimeSourceContract"]["observedSourceContract"]["lockPathsWithResolvedIntegrity"] == 661 and identity["runtimeSourceContract"]["observedSourceContract"]["uniqueResolvedIntegrityTarballs"] == 618,
            "publicPemSet": set(identity["publicPemPolicy"]["allowedPublicPemPaths"]) == EXPECTED_PUBLIC_PEMS,
            "workflowWindows2025": bool(re.search(r"runs-on:\s*windows-2025", workflow)),
            "workflowExactNode": bool(re.search(r"node-version:\s*24\.18\.0", workflow)),
            "workflowExactNpm": "npm@11.16.0" in workflow,
            "workflowReadOnlyPermissions": bool(re.search(r"permissions:\s*\n\s+contents:\s*read", workflow)),
            "workflowCheckoutNoPersistCredentials": "persist-credentials: false" in workflow,
            "workflowUploadAlways": bool(re.search(r"if:\s*always\(\)", workflow)),
            "workflowUploadsP41Out": "path: p41-out" in workflow,
            "workflowCurrentRootRunner": "scripts/pass41/run-p41-exact-windows-closure.mjs" in workflow,
            "workflowCurrentRootVerifier": "scripts/pass41/verify-p41-exact-windows-closure.py" in workflow,
            "noEmbeddedPayloadInWorkflow": not bool(re.search(r"payload\.part|package\.full|brotliDecompress|Buffer\.from\([^\n]*base64", workflow, re.I)),
            "noEmbeddedPayloadInRunner": not bool(re.search(r"payload\.part|package\.full|brotliDecompress|Buffer\.from\([^\n]*base64", runner, re.I)),
            "runnerWritesCheckpoints": "function checkpoint()" in runner and "function fail(" in runner,
            "runnerWritesFailureBeforeExit": "console.error(fail(error, failureStage))" in runner and "process.exitCode = 1" in runner,
            "runnerPortableSelfTest": "--self-test" in runner and "PORTABLE_BRIDGE_SELF_TEST_ONLY" in runner,
            "runnerSimulatedFailure": "--simulate-failure" in runner,
            "runnerNormalExactRuntime": "EXACT_RUNTIME_ASSERTION" in runner and "process.platform !== policy.exactTarget.platform" in runner,
            "runnerSemanticCommands": all(token in runner for token in ("SEMANTIC_TYPESCRIPT", "ESLINT", "WEBPACK_PRODUCTION_BUILD", "TURBOPACK_PRODUCTION_BUILD")),
        })

        with tempfile.TemporaryDirectory(prefix="velmere-p41-identity-") as directory:
            rebuilt_path = Path(directory) / "source-identity.json"
            process = subprocess.run(
                [sys.executable, str(identity_builder), "--output", str(rebuilt_path)],
                cwd=root,
                capture_output=True,
                text=True,
                check=False,
            )
            checks["sourceIdentityRebuildExitZero"] = process.returncode == 0
            if process.returncode != 0:
                receipt["sourceIdentityRebuild"] = {"stdout": process.stdout, "stderr": process.stderr}
                raise RuntimeError("source_identity_rebuild_failed")
            rebuilt = load_json(rebuilt_path)
            checks["sourceIdentityFileCount"] = rebuilt["fileCount"] == identity["fileCount"]
            checks["sourceIdentityPathSet"] = rebuilt["pathSetSha256"] == identity["pathSetSha256"]
            checks["sourceIdentityAggregate"] = rebuilt["sourceAggregateSha256"] == identity["sourceAggregateSha256"]
            checks["sourceIdentityPayloadBytes"] = rebuilt["payloadBytes"] == identity["payloadBytes"]
            receipt["rebuiltSourceIdentity"] = {
                "fileCount": rebuilt["fileCount"],
                "payloadBytes": rebuilt["payloadBytes"],
                "pathSetSha256": rebuilt["pathSetSha256"],
                "sourceAggregateSha256": rebuilt["sourceAggregateSha256"],
            }

        failed_checks = sorted(name for name, passed in checks.items() if passed is not True)
        if failed_checks:
            raise RuntimeError(f"verification_checks_failed:{failed_checks}")
        receipt["status"] = "PASS"
        receipt["classification"] = "PORTABLE_CURRENT_ROOT_BRIDGE_VERIFICATION_PASS"
        receipt["denominator"] = denominator
        receipt["truthBoundary"] = (
            "The source, current-root package/lock bindings, workflow, failure-receipt contract and source identity replay pass. "
            "Exact Windows current-root dependency, semantic and dual-build execution still requires a successful native workflow run."
        )
        write_json(output, receipt)
        print(json.dumps({
            "status": receipt["status"],
            "classification": receipt["classification"],
            "sourceAggregateSha256": receipt["rebuiltSourceIdentity"]["sourceAggregateSha256"],
            "checks": len(checks),
            "lockPaths": denominator["lockPathsWithResolvedIntegrity"],
            "uniqueTarballs": denominator["uniqueResolvedIntegrityTarballs"],
        }, ensure_ascii=False))
        return 0
    except Exception as error:  # noqa: BLE001
        receipt["status"] = "FAIL"
        receipt["classification"] = "PORTABLE_CURRENT_ROOT_BRIDGE_VERIFICATION_FAIL"
        receipt["failures"].append({"error": str(error), "traceback": traceback.format_exc()})
        write_json(output, receipt)
        print(json.dumps({"status": "FAIL", "error": str(error), "output": str(output)}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
