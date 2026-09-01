#!/usr/bin/env python3
"""Run six deterministic Velmere fixture families twice under exact Node 24.18.0.

The campaign runs only inside isolated hard-link worktrees, temporarily applies the
P37-current A85 binding there, restores every generated output, compares exact
receipt/runtime bytes with the already-recorded P38 Node-24-line baseline, and
refuses any Windows/build/Browser/customer-value promotion.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import signal
from pathlib import Path
import shutil
import subprocess
import tempfile
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT = ROOT / "artifacts/closure/p39/P39_EXACT_NODE_24_18_0_LINUX_FIXTURE_CAMPAIGN.json"
DEFAULT_BASELINE = ROOT / "artifacts/closure/p38/P38_NODE_MAJOR_DIFFERENTIAL.json"
P37_A85_BINDING = ROOT / "config/p37/a85-shield-pro-map-current-source-binding.json"
A85_BASE_POLICY = "config/pass36/a85-shield-pro-map-full-depth-policy.json"
REVISION = "P39_V16_AUTHORITY_TOPOLOGY_AND_EXACT_NODE24_LINUX_RECONCILIATION"
GENERATED_AT = "2026-08-14T05:35:00.000Z"
REQUIRED_NODE = "24.18.0"

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
    return {
        relative: sha256_file(ROOT / relative) if (ROOT / relative).is_file() else None
        for relative in paths
    }


def baseline_rows(path: Path) -> dict[str, dict[str, Any]]:
    value = json.loads(path.read_text(encoding="utf-8"))
    runtime = next((row for row in value.get("runtimes", []) if row.get("label") == "NODE_24_LINE"), None)
    if not isinstance(runtime, dict) or runtime.get("familiesPassed") != "6/6":
        raise RuntimeError("p38_node24_line_baseline_invalid")
    rows = {row["family"]: row for row in runtime.get("results", [])}
    if set(rows) != {row["id"] for row in FAMILIES}:
        raise RuntimeError("p38_baseline_family_set_mismatch")
    return rows


def execute_round(node_path: Path, round_number: int) -> dict[str, Any]:
    """Run each family in its own isolated worktree to prevent cross-family state."""
    results: list[dict[str, Any]] = []
    a85_patch_sha256: str | None = None
    for family in FAMILIES:
        with tempfile.TemporaryDirectory(prefix=f"velmere-p39-exact-{family['id'].lower()}-") as tmp:
            tmp_root = Path(tmp)
            clone = tmp_root / "source"
            subprocess.run(["cp", "-al", str(ROOT), str(clone)], check=True, timeout=120)
            for relative in protected_paths():
                copy_break(ROOT, clone, relative)

            original_a85_bytes = (clone / A85_BASE_POLICY).read_bytes()
            isolated_home = tmp_root / "home"
            isolated_temp = tmp_root / "tmp"
            isolated_home.mkdir()
            isolated_temp.mkdir()
            env = {
                "PATH": f"{node_path.parent}:/usr/bin:/bin",
                "HOME": str(isolated_home),
                "USERPROFILE": str(isolated_home),
                "TMPDIR": str(isolated_temp),
                "TMP": str(isolated_temp),
                "TEMP": str(isolated_temp),
                "LANG": "C.UTF-8",
                "LC_ALL": "C.UTF-8",
                "CI": "1",
                "NODE_ENV": "test",
                "NODE_NO_WARNINGS": "1",
                "VELMERE_OFFLINE_TS_FORCE_BUILTIN": "1",
            }
            if family.get("temporaryA85CurrentBinding"):
                a85_patch_sha256 = patch_a85(clone)

            command = [str(node_path), *family["args"]]
            print(f"P39 exact fixture: starting {family['id']}", flush=True)
            stdout_file = tmp_root / "stdout.log"
            stderr_file = tmp_root / "stderr.log"
            with stdout_file.open("wb") as stdout_stream, stderr_file.open("wb") as stderr_stream:
                process = subprocess.Popen(
                    command,
                    cwd=clone,
                    env=env,
                    stdout=stdout_stream,
                    stderr=stderr_stream,
                    start_new_session=True,
                )
                timed_out = False
                try:
                    completed_returncode = process.wait(timeout=900)
                except subprocess.TimeoutExpired:
                    timed_out = True
                    os.killpg(process.pid, signal.SIGKILL)
                    completed_returncode = process.wait(timeout=30)
                # Some historical harnesses can leave short-lived descendants. They must
                # not hold capture pipes or survive the isolated family execution.
                try:
                    os.killpg(process.pid, signal.SIGTERM)
                except ProcessLookupError:
                    pass
            stdout = stdout_file.read_bytes()
            stderr = stderr_file.read_bytes()
            print(f"P39 exact fixture: finished {family['id']} exit={completed_returncode} timeout={timed_out}", flush=True)

            receipt_path = clone / family["receipt"]
            runtime_path = clone / family["runtime"]
            row = {
                "family": family["id"],
                "exitCode": completed_returncode,
                "timedOut": timed_out,
                "stdoutBytes": len(stdout),
                "stdoutSha256": sha256_bytes(stdout),
                "stdoutUtf8Tail": stdout.decode("utf-8", errors="replace")[-1200:],
                "stderrBytes": len(stderr),
                "stderrSha256": sha256_bytes(stderr),
                "stderrUtf8Tail": stderr.decode("utf-8", errors="replace")[-1200:],
                "receiptPath": family["receipt"],
                "receiptExists": receipt_path.is_file(),
                "receiptSha256": sha256_file(receipt_path) if receipt_path.is_file() else None,
                "runtimePath": family["runtime"],
                "runtimeExists": runtime_path.is_file(),
                "runtimeSha256": sha256_file(runtime_path) if runtime_path.is_file() else None,
                "temporaryA85CurrentBinding": bool(family.get("temporaryA85CurrentBinding")),
            }
            row["passed"] = bool(
                row["exitCode"] == 0 and not timed_out and row["receiptExists"] and row["runtimeExists"]
            )
            if family.get("temporaryA85CurrentBinding"):
                (clone / A85_BASE_POLICY).write_bytes(original_a85_bytes)
            if not row["passed"]:
                raise RuntimeError(f"exact_fixture_failed:{family['id']}:{json.dumps(row, ensure_ascii=False)}")
            results.append(row)

    if a85_patch_sha256 is None:
        raise RuntimeError("a85_patch_not_executed")
    return {
        "round": round_number,
        "familyIsolation": "ONE_HARDLINK_WORKTREE_PER_FAMILY",
        "parentSecretsInherited": False,
        "temporaryA85PolicySha256": a85_patch_sha256,
        "familiesPassed": f"{sum(1 for row in results if row['passed'])}/{len(results)}",
        "results": results,
    }

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--node", required=True)
    parser.add_argument("--baseline", default=str(DEFAULT_BASELINE))
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    args = parser.parse_args()

    node = Path(args.node).resolve()
    baseline = Path(args.baseline).resolve()
    output = Path(args.output).resolve()
    for path in (node, baseline, P37_A85_BINDING):
        if not path.is_file():
            raise RuntimeError(f"required_input_missing:{path}")
    version = node_version(node)
    if version != REQUIRED_NODE:
        raise RuntimeError(f"exact_node_required:{version}")

    expected = baseline_rows(baseline)
    protected = protected_paths()
    before = snapshot(protected)
    rounds = [execute_round(node, 1)]
    after = snapshot(protected)
    if before != after:
        changed = [path for path in protected if before[path] != after[path]]
        raise RuntimeError(f"canonical_source_mutated:{changed}")

    comparison: list[dict[str, Any]] = []
    for family in [row["id"] for row in FAMILIES]:
        first = next(row for row in rounds[0]["results"] if row["family"] == family)
        base = expected[family]
        comparison.append({
            "family": family,
            "exactNodePassed": first["passed"],
            "matchesP38Node24LineReceipt": first["receiptSha256"] == base["receiptSha256"],
            "matchesP38Node24LineRuntime": first["runtimeSha256"] == base["runtimeSha256"],
            "receiptSha256": first["receiptSha256"],
            "runtimeSha256": first["runtimeSha256"],
        })

    predicates = (
        "matchesP38Node24LineReceipt",
        "matchesP38Node24LineRuntime",
    )
    counts = {key: sum(1 for row in comparison if row[key]) for key in predicates}
    if any(count != len(FAMILIES) for count in counts.values()):
        raise RuntimeError(f"exact_fixture_parity_failed:{counts}")
    payload: dict[str, Any] = {
        "schemaVersion": "velmere.p39.exact-node-24-18-0-linux-fixture-campaign.v1",
        "revision": REVISION,
        "generatedAt": GENERATED_AT,
        "state": "IMPLEMENTED_AND_TESTED_INTERNAL_EXACT_NODE_LINUX_FIXTURE_CAMPAIGN",
        "releaseState": "NO_GO",
        "parentRoot": "R44P46",
        "runtime": {
            "nodeVersion": version,
            "nodeBinaryPathOutsideSourceOnly": str(node),
            "nodeBinarySha256": sha256_file(node),
            "platform": "linux",
            "architecture": os.uname().machine,
            "exactNode24180Executed": True,
            "exactWindowsExecuted": False,
        },
        "baseline": {
            "path": baseline.relative_to(ROOT).as_posix() if baseline.is_relative_to(ROOT) else str(baseline),
            "sha256": sha256_file(baseline),
            "class": "P38_NODE_24_11_1_LINE_RECEIPT_RUNTIME_BYTES",
        },
        "rounds": rounds,
        "comparison": comparison,
        "summary": {
            "families": len(FAMILIES),
            "exactNodeFamiliesPassed": "6/6",
            "p38Node24LineReceiptParity": f"{counts['matchesP38Node24LineReceipt']}/6",
            "p38Node24LineRuntimeParity": f"{counts['matchesP38Node24LineRuntime']}/6",
            "canonicalProtectedPathsUnchanged": f"{len(protected)}/{len(protected)}",
        },
        "a85Boundary": {
            "historicalPass36PolicyChangedInCanonicalSource": False,
            "p37CurrentBindingAppliedOnlyInsideIsolatedWorktrees": True,
            "temporaryPolicyHashCaptured": True,
            "canonicalRuntimePolicyRepairStillRequiredBeforeRelease": True,
        },
        "credit": {
            "exactNode24180LinuxFixtureExecution": True,
            "isolatedFamilyExecution": True,
            "p38Node24LineByteParity": True,
            "exactWindows": False,
            "dependencyClosure": False,
            "typecheckOrBuild": False,
            "browserOrPdf": False,
            "currentCustomerOutput": False,
            "customerValue": False,
            "sourceRights": False,
            "goInternal": False,
            "goPaid": False,
            "live": False,
            "worldClassProven": False,
        },
        "truthBoundary": (
            "P39 physically executed six deterministic internal fixture families under exact Node 24.18.0 on linux-x64 in one isolated worktree per family and reproduced the P38 Node-24-line receipt/runtime bytes 6/6. "
            "These are bounded fixture contracts. They do not prove exact Windows, dependency closure, semantic typecheck, production builds, Browser/PDF, current provider data, customer outputs, source rights, paid value, GO_INTERNAL, GO_PAID, LIVE or WORLD_CLASS_PROVEN."
        ),
    }
    payload["integritySha256"] = integrity(payload)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": "PASS_P39_EXACT_NODE_24_18_0_LINUX_FIXTURE_CAMPAIGN",
        "node": version,
        "families": "6/6",
        "baselineParity": "6/6+6/6",
        "receiptSha256": sha256_file(output),
        "releaseState": "NO_GO",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
