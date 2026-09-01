#!/usr/bin/env python3
"""Verify P41 closure receipts and NO_GO boundaries before packaging."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import traceback
from typing import Any

V16_SHA = "67816a5a9238668c8080a3a8cc623f078d268c1b78fddf534cb4893bb45490e9"
P40_SOURCE = "81fd077bf390f2b1c6937d02703983ae9714849149a4c492f74f77b2446db9c7"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    root = Path(args.root).resolve()
    output = Path(args.output).resolve()
    receipt: dict[str, Any] = {
        "schemaVersion": "velmere.p41.prepack-closure-verification.v1",
        "revision": "P41_V16_EXACT_WINDOWS_PREFLIGHT_CURRENT_ROOT_BRIDGE_REPAIR",
        "status": "IN_PROGRESS",
        "releaseState": "NO_GO",
        "checks": {},
        "failures": [],
    }
    try:
        paths = {
            "identity": root / "artifacts/closure/p41/source-identity.json",
            "policy": root / "config/p41/p41-exact-windows-current-root-closure-policy.json",
            "bridge": root / "artifacts/closure/p41/P41_CURRENT_ROOT_BRIDGE_VERIFICATION.json",
            "selfTest": root / "artifacts/closure/p41/P41_BRIDGE_SELF_TEST.json",
            "failureTest": root / "artifacts/closure/p41/P41_FAILURE_RECEIPT_SELF_TEST.json",
            "githubAttempt": root / "artifacts/closure/p41/P41_GITHUB_WINDOWS_ATTEMPT_2026-08-14.json",
            "dependency": root / "artifacts/closure/p41/P41_DEPENDENCY_GRAPH_CENSUS.json",
            "differential": root / "artifacts/closure/p41/P41_SOURCE_DIFFERENTIAL.json",
            "status": root / "artifacts/closure/p41/P41_STATUS.json",
            "authority": root / "artifacts/closure/p41/CURRENT_AUTHORITY_P41.json",
            "ledger": root / "artifacts/closure/p41/VELMERE_CURRENT_STATE_AND_PASS_DELTA_LEDGER_P41_V16_2026-08-14.txt",
            "handoff": root / "artifacts/closure/p41/P41_HANDOFF_MANIFEST.json",
            "v16": root / "docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V16_FULL_TOPOLOGY_FREE_LEGAL_CURRENT_WORLD_CLASS_2026-08-14.txt",
        }
        checks = receipt["checks"]
        checks["requiredFiles"] = all(path.is_file() for path in paths.values())
        if not checks["requiredFiles"]:
            raise RuntimeError(f"required_files_missing:{[name for name, path in paths.items() if not path.is_file()]}")

        identity = load(paths["identity"])
        policy = load(paths["policy"])
        bridge = load(paths["bridge"])
        self_test = load(paths["selfTest"])
        failure_test = load(paths["failureTest"])
        github_attempt = load(paths["githubAttempt"])
        dependency = load(paths["dependency"])
        differential = load(paths["differential"])
        status = load(paths["status"])
        authority = load(paths["authority"])
        handoff = load(paths["handoff"])

        checks.update({
            "v16Sha256": sha256_file(paths["v16"]) == V16_SHA,
            "identityParent": identity["parentSourceAggregateSha256"] == P40_SOURCE,
            "policyParent": policy["parentSourceAggregateSha256"] == P40_SOURCE,
            "bridgePass": bridge["status"] == "PASS",
            "selfTestPass": self_test["status"] == "PASS" and self_test["classification"] == "PORTABLE_BRIDGE_SELF_TEST_ONLY",
            "failureReceiptPass": failure_test["expectedNonZeroExitObserved"] is True and failure_test["receiptStatus"] == "FAIL" and failure_test["receiptPreserved"] is True,
            "githubPreflightPass": github_attempt["exactWindowsToolchainPreflight"] is True,
            "githubCurrentRootNoCredit": github_attempt["exactCurrentRootProjectExecution"] is False and github_attempt["npmCiReached"] is False,
            "githubClassification": github_attempt["classification"] == "EXACT_WINDOWS_TOOLCHAIN_PREFLIGHT_PASS_PAYLOAD_IDENTITY_FAIL",
            "dependencyDenominator": dependency["lockPathsWithResolvedIntegrity"] == 661 and dependency["uniqueResolvedIntegrityTarballs"] == 618,
            "differentialNoModified": differential["modified"] == [],
            "differentialNoRemoved": differential["removed"] == [],
            "differentialBridgeOnly": all(row["path"].startswith((".github/workflows/p41-", "config/p41/", "scripts/closure/build-p41", "scripts/closure/package-p41", "scripts/pass41/")) for row in differential["added"]),
            "statusNoGo": status["releaseState"] == "NO_GO" and not any(status["releaseDecision"].values()),
            "authorityNoGo": authority["authorityState"] == "V16_CURRENT_BOUND_AUTHORITY_P41_NO_GO" and not any(authority["releaseDecision"].values()),
            "handoffThreeFiles": len(handoff["requiredUserArtifacts"]) == 3 and [row["order"] for row in handoff["requiredUserArtifacts"]] == [1, 2, 3],
            "ledgerBound": handoff["requiredUserArtifacts"][1]["sha256InsideSource"] == sha256_file(paths["ledger"]),
            "sourceAggregateConsistent": status["sourceAggregateSha256"] == authority["currentSourceAggregateSha256"] == identity["sourceAggregateSha256"],
            "saleStop": status["zeroCredit"]["saleEligibleRows"] == "0/17",
            "exactWindowsCurrentRootStop": status["zeroCredit"]["exactWindowsCurrentRootExecution"] is True,
        })

        with tempfile.TemporaryDirectory(prefix="velmere-p41-prepack-") as directory:
            bridge_output = Path(directory) / "bridge.json"
            process = subprocess.run(
                [sys.executable, str(root / "scripts/pass41/verify-p41-exact-windows-closure.py"), "--root", str(root), "--output", str(bridge_output)],
                cwd=root,
                capture_output=True,
                text=True,
                check=False,
            )
            checks["bridgeVerifierReplay"] = process.returncode == 0 and load(bridge_output)["status"] == "PASS"
            receipt["bridgeVerifierReplay"] = {
                "exitCode": process.returncode,
                "stdoutSha256": hashlib.sha256(process.stdout.encode("utf-8")).hexdigest(),
                "stderrSha256": hashlib.sha256(process.stderr.encode("utf-8")).hexdigest(),
            }

        failed = sorted(name for name, passed in checks.items() if passed is not True)
        if failed:
            raise RuntimeError(f"p41_prepack_checks_failed:{failed}")
        receipt["status"] = "PASS"
        receipt["classification"] = "P41_PREPACK_CLOSURE_RECEIPTS_PASS_NO_GO"
        receipt["sourceAggregateSha256"] = identity["sourceAggregateSha256"]
        receipt["truthBoundary"] = "P41 bridge/source/receipt/package prerequisites pass. Native exact-Windows dependency/build and all downstream product gates remain open."
        write_json(output, receipt)
        print(json.dumps({"status": "PASS", "checks": len(checks), "sourceAggregateSha256": identity["sourceAggregateSha256"], "releaseState": "NO_GO"}, ensure_ascii=False))
        return 0
    except Exception as error:  # noqa: BLE001
        receipt["status"] = "FAIL"
        receipt["classification"] = "P41_PREPACK_CLOSURE_RECEIPTS_FAIL"
        receipt["failures"].append({"error": str(error), "traceback": traceback.format_exc()})
        write_json(output, receipt)
        print(json.dumps({"status": "FAIL", "error": str(error)}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
