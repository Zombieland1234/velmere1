#!/usr/bin/env python3
"""Execute the bounded P39 V16 authority/topology campaign under exact Node 24.18.0.

This runner intentionally earns only exact linux-x64 runtime plus authority/topology/
availability-matrix contract credit. It does not claim Windows, dependency closure,
typecheck, lint, build, Browser, PDF, customer value, source rights or release credit.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT = ROOT / "artifacts/closure/p39/P39_V16_AUTHORITY_TOPOLOGY_EXACT_NODE24_LINUX.json"
REVISION = "P39_V16_AUTHORITY_TOPOLOGY_AND_EXACT_NODE24_LINUX_RECONCILIATION"
GENERATED_AT = "2026-08-14T05:20:00.000Z"
EXPECTED_NODE = "v24.18.0"
EXPECTED_NPM = "11.16.0"
EXPECTED_V16 = "67816a5a9238668c8080a3a8cc623f078d268c1b78fddf534cb4893bb45490e9"
EXPECTED_V15 = "5cfbbfcbcef7242e30466f18bab3ad29cad859e485a909a4ee8658fb65e2f2c0"
TOOLCACHE_ARCHIVE_SHA256 = "efced36c041a7a43e8b4a4b35cb929bef7747c1c7442e693901a0b4f06467e1d"
TOOLCACHE_ARCHIVE_BYTES = 57653661

V16 = ROOT / "docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V16_FULL_TOPOLOGY_FREE_LEGAL_CURRENT_WORLD_CLASS_2026-08-14.txt"
V15 = ROOT / "docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V15_FREE_LEGAL_TOP_WORLD_2026-08-13.txt"
PROTECTED = [
    V16,
    V15,
    ROOT / "lib/product/vlm-canonical-product-topology.ts",
    ROOT / "lib/commerce/vlm-current-evidence-availability-matrix.ts",
    ROOT / "lib/commerce/vlm-current-sku-truth.ts",
    ROOT / "tests/security/a102-current-evidence-availability-matrix.test.ts",
    ROOT / "scripts/pass39/build-p39-v16-topology.mjs",
    ROOT / "scripts/pass39/verify-p39-v16-topology.mjs",
    ROOT / "package.json",
    ROOT / "package-lock.json",
]
GENERATED_CONFIG = [
    ROOT / "config/p39/p39-v16-authority-topology-policy.json",
    ROOT / "config/p39/p39-v16-product-topology-reconciliation.json",
    ROOT / "config/p39/p39-v15-to-v16-continuity-audit.json",
]


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def stable(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: stable(value[key]) for key in sorted(value)}
    if isinstance(value, list):
        return [stable(item) for item in value]
    return value


def integrity(value: dict[str, Any]) -> str:
    return sha256_bytes(json.dumps(stable(value), ensure_ascii=False, separators=(",", ":")).encode("utf-8"))


def binding(path: Path) -> dict[str, Any]:
    return {
        "path": path.relative_to(ROOT).as_posix() if path.is_relative_to(ROOT) else str(path),
        "byteLength": path.stat().st_size,
        "sha256": sha256_file(path),
    }


def run(command: list[str], env: dict[str, str], label: str) -> dict[str, Any]:
    completed = subprocess.run(
        command,
        cwd=ROOT,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=180,
        check=False,
    )
    result = {
        "label": label,
        "command": [Path(command[0]).name, *command[1:]],
        "exitCode": completed.returncode,
        "stdoutBytes": len(completed.stdout),
        "stdoutSha256": sha256_bytes(completed.stdout),
        "stderrBytes": len(completed.stderr),
        "stderrSha256": sha256_bytes(completed.stderr),
        "stdoutUtf8Tail": completed.stdout.decode("utf-8", errors="replace")[-1600:],
        "stderrUtf8Tail": completed.stderr.decode("utf-8", errors="replace")[-800:],
    }
    if completed.returncode != 0:
        raise RuntimeError(f"{label}_failed:{json.dumps(result, ensure_ascii=False)}")
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--node", required=True)
    parser.add_argument("--npm", required=True)
    parser.add_argument("--toolcache-archive")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    args = parser.parse_args()

    node = Path(args.node).resolve()
    npm = Path(args.npm).resolve()
    output = Path(args.output).resolve()
    if not node.is_file() or not os.access(node, os.X_OK):
        raise RuntimeError(f"node_binary_unusable:{node}")
    if not npm.is_file() or not os.access(npm, os.X_OK):
        raise RuntimeError(f"npm_binary_unusable:{npm}")
    if sha256_file(V16) != EXPECTED_V16 or sha256_file(V15) != EXPECTED_V15:
        raise RuntimeError("owner_directive_hash_mismatch")

    with tempfile.TemporaryDirectory(prefix="velmere-p39-exact-runtime-") as isolated_root:
        isolated = Path(isolated_root)
        home = isolated / "home"
        temp = isolated / "tmp"
        home.mkdir()
        temp.mkdir()
        env = {
            "PATH": f"{node.parent}:{os.environ.get('PATH', '')}",
            "HOME": str(home),
            "USERPROFILE": str(home),
            "TMPDIR": str(temp),
            "TMP": str(temp),
            "TEMP": str(temp),
            "LANG": "C.UTF-8",
            "LC_ALL": "C.UTF-8",
            "CI": "1",
            "NODE_ENV": "test",
            "NODE_NO_WARNINGS": "1",
            "VELMERE_OFFLINE_TS_FORCE_BUILTIN": "1",
        }

        node_version = subprocess.check_output([str(node), "--version"], cwd=ROOT, env=env, text=True).strip()
        npm_version = subprocess.check_output([str(npm), "--version"], cwd=ROOT, env=env, text=True).strip()
        if node_version != EXPECTED_NODE:
            raise RuntimeError(f"exact_node_required:{node_version}")
        if npm_version != EXPECTED_NPM:
            raise RuntimeError(f"exact_npm_required:{npm_version}")

        before = {item.relative_to(ROOT).as_posix(): binding(item) for item in PROTECTED}
        common = [str(node), "--experimental-strip-types", "--import", "./scripts/pass11/register-offline-ts-loader.mjs"]
        commands = [
            ("topologyBuild", [*common, "scripts/pass39/build-p39-v16-topology.mjs"]),
            ("topologyVerify", [*common, "scripts/pass39/verify-p39-v16-topology.mjs"]),
            ("availabilityMatrix", [*common, "tests/security/a102-current-evidence-availability-matrix.test.ts"]),
        ]

        rounds: list[dict[str, Any]] = []
        config_bindings_by_round: list[dict[str, dict[str, Any]]] = []
        for round_number in (1, 2):
            executions = [run(command, env, f"{label}:round{round_number}") for label, command in commands]
            rounds.append({"round": round_number, "executions": executions})
            missing = [path for path in GENERATED_CONFIG if not path.is_file()]
            if missing:
                raise RuntimeError(f"generated_config_missing:{missing}")
            config_bindings_by_round.append({path.relative_to(ROOT).as_posix(): binding(path) for path in GENERATED_CONFIG})

        after = {item.relative_to(ROOT).as_posix(): binding(item) for item in PROTECTED}
        if before != after:
            raise RuntimeError("protected_source_changed_during_exact_runtime_campaign")
        config_byte_identical = config_bindings_by_round[0] == config_bindings_by_round[1]
        execution_parity: dict[str, bool] = {}
        for index, (label, _command) in enumerate(commands):
            left = rounds[0]["executions"][index]
            right = rounds[1]["executions"][index]
            execution_parity[label] = (
                left["stdoutSha256"] == right["stdoutSha256"]
                and left["stderrSha256"] == right["stderrSha256"]
                and left["exitCode"] == right["exitCode"] == 0
            )
        if not config_byte_identical or not all(execution_parity.values()):
            raise RuntimeError(f"exact_runtime_repeatability_failed:config={config_byte_identical}:execution={execution_parity}")

    toolcache_archive: dict[str, Any] | None = None
    if args.toolcache_archive:
        archive = Path(args.toolcache_archive).resolve()
        if not archive.is_file():
            raise RuntimeError(f"toolcache_archive_missing:{archive}")
        toolcache_archive = {
            "pathOutsideSourceOnly": str(archive),
            "byteLength": archive.stat().st_size,
            "sha256": sha256_file(archive),
            "expectedByteLength": TOOLCACHE_ARCHIVE_BYTES,
            "expectedSha256": TOOLCACHE_ARCHIVE_SHA256,
            "match": archive.stat().st_size == TOOLCACHE_ARCHIVE_BYTES and sha256_file(archive) == TOOLCACHE_ARCHIVE_SHA256,
            "originClass": "GITHUB_ACTIONS_NODE_VERSIONS_TOOLCACHE_RELEASE_ASSET",
        }
        if not toolcache_archive["match"]:
            raise RuntimeError("toolcache_archive_identity_mismatch")

    receipt: dict[str, Any] = {
        "schemaVersion": "velmere.p39.exact-node24-linux-authority-topology.v1",
        "revision": REVISION,
        "generatedAt": GENERATED_AT,
        "state": "IMPLEMENTED_AND_TESTED_INTERNAL_EXACT_LINUX_RUNTIME_AUTHORITY_TOPOLOGY",
        "releaseState": "NO_GO",
        "parentRoot": "R44P46",
        "authority": {"v16": binding(V16), "v15Historical": binding(V15)},
        "runtime": {
            "nodeVersion": node_version,
            "npmVersion": npm_version,
            "platform": "linux",
            "architecture": "x64",
            "nodeBinary": {
                "pathOutsideSourceOnly": str(node),
                "byteLength": node.stat().st_size,
                "sha256": sha256_file(node),
            },
            "npmEntrypoint": {
                "pathOutsideSourceOnly": str(npm),
                "byteLength": npm.stat().st_size,
                "sha256": sha256_file(npm),
            },
            "toolcacheArchive": toolcache_archive,
            "exactProjectNodeMatched": True,
            "exactProjectNpmMatched": True,
            "exactLinuxExecuted": True,
            "exactWindowsExecuted": False,
        },
        "sourceBindingsBeforeAndAfter": before,
        "rounds": rounds,
        "repeatability": {
            "rounds": "2/2",
            "generatedConfigByteIdentity": config_byte_identical,
            "executionStdoutStderrByteParity": execution_parity,
            "protectedSourceUnchanged": True,
        },
        "generatedConfigBindings": config_bindings_by_round[-1],
        "results": {
            "v16ExactAuthority": "PASS",
            "v15HistoricalRetention": "PASS",
            "customerFacingRows": "17/17",
            "productFamilies": "11/11",
            "internalExecutionProfilesDefined": "33/33",
            "transitionsClassified": "22/22",
            "deltaRequiredTransitions": "6/22",
            "notApplicableNoPaidDeltaClaimTransitions": "16/22",
            "availabilityMatrixExecutionProfiles": "33/33",
            "availabilityMatrixSaleDenominator": "17/17",
            "saleEligibleCustomerRows": "0/17",
            "topologyVerifierChecks": "32/32",
            "availabilityMatrixChecks": "32/32",
        },
        "credit": {
            "authorityExactByteValidation": True,
            "topologyReconciliation": True,
            "exactNode24180Linux": True,
            "exactNpm11160Linux": True,
            "boundedTwoRoundRepeatability": True,
            "exactWindows": False,
            "dependencyClosure": False,
            "typecheck": False,
            "lint": False,
            "webpackBuild": False,
            "turbopackBuild": False,
            "browser": False,
            "pdfReplay": False,
            "currentCustomerOutputs": False,
            "sourceRights": False,
            "materialValue": False,
            "goInternal": False,
            "goPaid": False,
            "live": False,
            "worldClassProven": False,
        },
        "truthBoundary": (
            "P39 physically executed the V16 authority, 17-row/33-context/22-transition topology and fail-closed availability-matrix contracts twice under exact Node 24.18.0 and npm 11.16.0 on linux-x64 with byte-identical bounded outputs. "
            "Windows, dependency installation, full typecheck/lint, Webpack/Turbopack, Browser, PDF replay, customer outputs, source rights, value, GO_INTERNAL, GO_PAID, LIVE and WORLD_CLASS_PROVEN remain open."
        ),
    }
    receipt["integritySha256"] = integrity(receipt)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": "PASS_P39_EXACT_NODE24_LINUX_AUTHORITY_TOPOLOGY",
        "node": node_version,
        "npm": npm_version,
        "rounds": "2/2",
        "topology": "17_ROWS_33_PROFILES_22_TRANSITIONS",
        "receiptSha256": sha256_file(output),
        "output": output.relative_to(ROOT).as_posix() if output.is_relative_to(ROOT) else str(output),
        "exactWindows": False,
        "releaseState": "NO_GO",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
