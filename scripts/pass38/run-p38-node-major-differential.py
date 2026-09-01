#!/usr/bin/env python3
"""Run six deterministic core fixture harnesses under Node 22 and Node 24 lines.

The run uses isolated hard-link worktrees with copy-broken mutable outputs. A85
receives the already-proven P37 current-source input hashes only inside the
isolated worktree because the historical pass36 policy is intentionally kept
unchanged. No exact Node 24.18.0, Windows, build, Browser, provider, customer,
or release credit is granted.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "artifacts/closure/p38/P38_NODE_MAJOR_DIFFERENTIAL.json"
P37_A85_BINDING = ROOT / "config/p37/a85-shield-pro-map-current-source-binding.json"
A85_BASE_POLICY = "config/pass36/a85-shield-pro-map-full-depth-policy.json"
REVISION = "P38_V15_CURRENT_LOCKFILE_CAS_RECOVERY_AND_NODE24_DIFFERENTIAL"
GENERATED_AT = "2026-08-14T03:20:00.000Z"
REQUIRED_NODE = "24.18.0"
NODE_A = Path("/opt/nvm/versions/node/v22.16.0/bin/node")
NODE_B = Path("/opt/pyvenv/lib/python3.13/site-packages/playwright/driver/node")

FAMILIES: tuple[dict[str, Any], ...] = (
    {
        "id": "A82_AUDIT",
        "args": ["scripts/pass36/test-a82-audit-real-contract-matrix.mjs"],
        "receipt": "config/pass36/a82-test-receipt.json",
        "runtime": "artifacts/pass36/a82/PASS36_A82_FIXTURE_RUNTIME.json",
    },
    {
        "id": "A84_SHIELD",
        "args": ["--experimental-strip-types", "scripts/pass36/test-a84-shield-full-catalog-tier-matrix.ts"],
        "receipt": "config/pass36/a84-test-receipt.json",
        "runtime": "artifacts/pass36/a84/PASS36_A84_SHIELD_FULL_CATALOG_RUNTIME.json",
    },
    {
        "id": "A85_SHIELD_PRO_MAP",
        "args": ["--import", "./scripts/pass11/register-offline-ts-loader.mjs", "scripts/pass36/test-a85-shield-pro-map-full-depth-matrix.ts", "--write"],
        "receipt": "config/pass36/a85-test-receipt.json",
        "runtime": "artifacts/pass36/a85/PASS36_A85_SHIELD_PRO_MAP_FULL_DEPTH_RUNTIME.json",
        "temporaryA85CurrentBinding": True,
    },
    {
        "id": "A86_REAL_MARKETS",
        "args": ["--experimental-strip-types", "scripts/pass36/test-a86-real-markets-cross-asset-matrix.ts", "--write"],
        "receipt": "config/pass36/a86-test-receipt.json",
        "runtime": "artifacts/pass36/a86/PASS36_A86_REAL_MARKETS_CROSS_ASSET_RUNTIME.json",
    },
    {
        "id": "A87_MARKET_IMPACT_WHALE_WATCH",
        "args": ["--import", "./scripts/pass11/register-offline-ts-loader.mjs", "scripts/pass36/test-a87-market-impact-whale-watch-matrix.ts"],
        "receipt": "config/pass36/a87-test-receipt.json",
        "runtime": "artifacts/pass36/a87/PASS36_A87_MARKET_IMPACT_WHALE_RUNTIME.json",
    },
    {
        "id": "A88_BRAIN_ANGEL_RISK",
        "args": ["--import", "./scripts/pass11/register-offline-ts-loader.mjs", "scripts/pass36/test-a88-brain-angel-risk-eval.ts"],
        "receipt": "config/pass36/a88-test-receipt.json",
        "runtime": "artifacts/pass36/a88/PASS36_A88_BRAIN_ANGEL_RISK_EVAL_RUNTIME.json",
    },
)


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def node_version(path: Path) -> str:
    result = subprocess.run([str(path), "--version"], capture_output=True, text=True, check=True, timeout=15)
    return result.stdout.strip().removeprefix("v")


def copy_break(source_root: Path, clone_root: Path, relative: str) -> None:
    source = source_root / relative
    target = clone_root / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    if source.is_file():
        if target.exists() or target.is_symlink():
            target.unlink()
        shutil.copyfile(source, target)
        shutil.copymode(source, target)
    elif target.exists() or target.is_symlink():
        target.unlink()


def patch_a85(clone_root: Path) -> str:
    base_path = clone_root / A85_BASE_POLICY
    binding = json.loads((clone_root / P37_A85_BINDING.relative_to(ROOT)).read_text(encoding="utf-8"))
    by_key = {row["key"]: row["currentSha256"] for row in binding["currentBindings"]}
    base = json.loads(base_path.read_text(encoding="utf-8"))
    if set(base["inputs"]) != set(by_key):
        raise RuntimeError("a85_binding_key_set_mismatch")
    for key, row in base["inputs"].items():
        row["sha256"] = by_key[key]
    bytes_out = (json.dumps(base, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
    base_path.write_bytes(bytes_out)
    return sha256_bytes(bytes_out)


def protected_paths() -> list[str]:
    values = {A85_BASE_POLICY}
    for family in FAMILIES:
        values.add(family["receipt"])
        values.add(family["runtime"])
    return sorted(values, key=lambda value: value.encode("utf-8"))


def snapshot(paths: list[str]) -> dict[str, str | None]:
    result: dict[str, str | None] = {}
    for relative in paths:
        path = ROOT / relative
        result[relative] = sha256_file(path) if path.is_file() else None
    return result


def run_runtime(node_path: Path, label: str) -> dict[str, Any]:
    version = node_version(node_path)
    with tempfile.TemporaryDirectory(prefix=f"velmere-p38-{label.lower()}-") as tmp:
        clone = Path(tmp) / "source"
        subprocess.run(["cp", "-al", str(ROOT), str(clone)], check=True, timeout=90)
        for relative in protected_paths():
            copy_break(ROOT, clone, relative)

        original_a85_bytes = (clone / A85_BASE_POLICY).read_bytes()
        a85_patch_sha256: str | None = None
        isolated_home = Path(tmp) / "home"
        isolated_temp = Path(tmp) / "tmp"
        isolated_home.mkdir()
        isolated_temp.mkdir()
        env = {
            "PATH": str(node_path.parent),
            "HOME": str(isolated_home),
            "USERPROFILE": str(isolated_home),
            "TMPDIR": str(isolated_temp),
            "TMP": str(isolated_temp),
            "TEMP": str(isolated_temp),
            "LANG": "C.UTF-8",
            "LC_ALL": "C.UTF-8",
            "CI": "1",
            "NODE_ENV": "test",
        }

        results: list[dict[str, Any]] = []
        for family in FAMILIES:
            if family.get("temporaryA85CurrentBinding"):
                a85_patch_sha256 = patch_a85(clone)
            command = [str(node_path), *family["args"]]
            completed = subprocess.run(
                command,
                cwd=clone,
                env=env,
                capture_output=True,
                timeout=240,
            )
            receipt_path = clone / family["receipt"]
            runtime_path = clone / family["runtime"]
            receipt_exists = receipt_path.is_file()
            runtime_exists = runtime_path.is_file()
            result = {
                "family": family["id"],
                "exitCode": completed.returncode,
                "stdoutBytes": len(completed.stdout),
                "stdoutSha256": sha256_bytes(completed.stdout),
                "stderrBytes": len(completed.stderr),
                "stderrSha256": sha256_bytes(completed.stderr),
                "receiptPath": family["receipt"],
                "receiptExists": receipt_exists,
                "receiptSha256": sha256_file(receipt_path) if receipt_exists else None,
                "runtimePath": family["runtime"],
                "runtimeExists": runtime_exists,
                "runtimeSha256": sha256_file(runtime_path) if runtime_exists else None,
                "temporaryA85CurrentBinding": bool(family.get("temporaryA85CurrentBinding")),
                "passed": completed.returncode == 0 and receipt_exists and runtime_exists,
            }
            results.append(result)
            if family.get("temporaryA85CurrentBinding"):
                (clone / A85_BASE_POLICY).write_bytes(original_a85_bytes)
            # Restore/remove generated outputs before the next family so later source-audit
            # harnesses see the unchanged canonical source instead of prior temporary artifacts.
            copy_break(ROOT, clone, family["receipt"])
            copy_break(ROOT, clone, family["runtime"])
            if not result["passed"]:
                tail = completed.stderr[-4000:].decode("utf-8", errors="replace")
                raise RuntimeError(f"family_failed:{label}:{family['id']}:{completed.returncode}:{tail}:receipt={receipt_exists}:runtime={runtime_exists}")

        if a85_patch_sha256 is None:
            raise RuntimeError(f"a85_patch_not_executed:{label}")
        return {
            "label": label,
            "binaryClass": "SYSTEM_NVM_NODE" if label == "NODE_22" else "PLAYWRIGHT_DRIVER_BUNDLED_NODE",
            "version": version,
            "binarySha256": sha256_file(node_path),
            "exactRequiredVersionMatched": version == REQUIRED_NODE,
            "platform": os.uname().sysname.lower(),
            "architecture": os.uname().machine,
            "isolatedEnvironment": True,
            "parentSecretsInherited": False,
            "temporaryA85PolicySha256": a85_patch_sha256,
            "familiesPassed": f"{sum(1 for row in results if row['passed'])}/{len(results)}",
            "results": results,
        }


def main() -> int:
    for path in (NODE_A, NODE_B, P37_A85_BINDING):
        if not path.is_file():
            raise RuntimeError(f"required_input_missing:{path}")

    protected = protected_paths()
    before = snapshot(protected)
    node22 = run_runtime(NODE_A, "NODE_22")
    node24 = run_runtime(NODE_B, "NODE_24_LINE")
    after = snapshot(protected)
    if before != after:
        changed = [path for path in protected if before[path] != after[path]]
        raise RuntimeError(f"canonical_source_mutated:{changed}")

    by22 = {row["family"]: row for row in node22["results"]}
    by24 = {row["family"]: row for row in node24["results"]}
    comparison: list[dict[str, Any]] = []
    for family in [row["id"] for row in FAMILIES]:
        left = by22[family]
        right = by24[family]
        comparison.append({
            "family": family,
            "node22Passed": left["passed"],
            "node24LinePassed": right["passed"],
            "receiptByteIdentical": left["receiptSha256"] == right["receiptSha256"],
            "runtimeByteIdentical": left["runtimeSha256"] == right["runtimeSha256"],
            "receiptSha256": left["receiptSha256"],
            "runtimeSha256": left["runtimeSha256"],
        })

    receipt_parity = sum(1 for row in comparison if row["receiptByteIdentical"])
    runtime_parity = sum(1 for row in comparison if row["runtimeByteIdentical"])
    if receipt_parity != len(FAMILIES) or runtime_parity != len(FAMILIES):
        raise RuntimeError(f"cross_runtime_output_drift:receipt={receipt_parity}:runtime={runtime_parity}")

    payload: dict[str, Any] = {
        "schemaVersion": "velmere.p38.node-major-differential.v1",
        "revision": REVISION,
        "generatedAt": GENERATED_AT,
        "state": "IMPLEMENTED_AND_TESTED_INTERNAL_NODE24_LINE_COMPATIBILITY_ONLY",
        "requiredProjectRuntime": {
            "node": REQUIRED_NODE,
            "npm": "11.16.0",
            "platform": "windows-current-final-by-v15",
        },
        "runtimes": [node22, node24],
        "comparison": comparison,
        "summary": {
            "families": len(FAMILIES),
            "node22Passed": f"{len(FAMILIES)}/{len(FAMILIES)}",
            "node24LinePassed": f"{len(FAMILIES)}/{len(FAMILIES)}",
            "crossRuntimeReceiptByteParity": f"{receipt_parity}/{len(FAMILIES)}",
            "crossRuntimeRuntimeByteParity": f"{runtime_parity}/{len(FAMILIES)}",
            "canonicalProtectedPathsUnchanged": f"{len(protected)}/{len(protected)}",
            "exactNode24180Executed": False,
            "exactWindowsExecuted": False,
            "fullTypecheckExecuted": False,
            "productionBuildExecuted": False,
            "browserExecuted": False,
        },
        "a85Boundary": {
            "historicalPass36PolicyChangedInCanonicalSource": False,
            "p37CurrentBindingAppliedOnlyInsideIsolatedWorktrees": True,
            "temporaryPolicyHashSameAcrossRuntimes": node22["temporaryA85PolicySha256"] == node24["temporaryA85PolicySha256"],
            "canonicalRuntimePolicyRepairStillRequiredBeforeRelease": True,
        },
        "credit": {
            "deterministicFixtureHarnessExecutionCredit": True,
            "node24LineCompatibilityCredit": True,
            "exactNode24180Credit": False,
            "windowsCredit": False,
            "dependencyClosureCredit": False,
            "typecheckOrBuildCredit": False,
            "browserCredit": False,
            "customerValueCredit": False,
            "goInternalCredit": False,
            "saleOrLiveCredit": False,
        },
        "releaseState": "NO_GO",
        "truthBoundary": (
            "P38 physically executed six deterministic core fixture harness families under Node 22.16.0 and a Node "
            "24.11.1 binary, with byte-identical generated receipt/runtime outputs across both lines. A85 used the "
            "already-proven P37 current input hashes only in isolated worktrees. This is Node-24-line compatibility "
            "evidence, not exact Node 24.18.0, Windows, dependency install, typecheck, build, Browser, live data, "
            "customer-value, GO_INTERNAL, paid, LIVE, or world-class proof."
        ),
    }
    payload["integritySha256"] = sha256_bytes(canonical_json(payload))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(json.dumps({
        "status": "PASS_P38_NODE_MAJOR_DIFFERENTIAL",
        "node22": node22["version"],
        "node24Line": node24["version"],
        "families": len(FAMILIES),
        "node22Passed": node22["familiesPassed"],
        "node24LinePassed": node24["familiesPassed"],
        "receiptParity": f"{receipt_parity}/{len(FAMILIES)}",
        "runtimeParity": f"{runtime_parity}/{len(FAMILIES)}",
        "exactNode24180": False,
        "releaseState": "NO_GO",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
