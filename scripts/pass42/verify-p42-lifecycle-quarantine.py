#!/usr/bin/env python3
"""Verify the P42 lifecycle quarantine, action pins, and fail-closed build boundary."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
FIXED_GENERATED_AT = "2026-08-14T11:00:00.000Z"
PIN_RE = re.compile(r"^[0-9a-f]{40}$")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def canonical_sha256(value: Any) -> str:
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def verify_self_integrity(value: dict[str, Any], label: str, blockers: list[str]) -> None:
    expected = value.get("integritySha256")
    copy = dict(value)
    copy.pop("integritySha256", None)
    actual = canonical_sha256(copy)
    if expected != actual:
        blockers.append(f"{label}_integrity_mismatch:{expected}:{actual}")


def parse_action_refs(workflow: str) -> dict[str, str]:
    refs: dict[str, str] = {}
    for match in re.finditer(r"^\s*uses:\s*([^@\s]+)@([^\s#]+)\s*$", workflow, re.M):
        refs[match.group(1)] = match.group(2)
    return refs


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--output", type=Path, default=Path("artifacts/closure/p42/P42_LIFECYCLE_QUARANTINE_VERIFICATION.json"))
    parser.add_argument("--require-windows", action="store_true")
    args = parser.parse_args()
    root = args.root.resolve()
    output = args.output if args.output.is_absolute() else root / args.output
    output.parent.mkdir(parents=True, exist_ok=True)

    blockers: list[str] = []
    checks: dict[str, Any] = {}
    package_path = root / "package.json"
    lock_path = root / "package-lock.json"
    inventory_path = root / "config/p42/p42-current-lock-lifecycle-inventory.json"
    allowlist_path = root / "config/p42/p42-lifecycle-execution-allowlist.json"
    pins_path = root / "config/p42/p42-github-action-pins.json"
    p42_policy_path = root / "config/p42/p42-lifecycle-quarantine-policy.json"
    generic_policy_path = root / "config/supply-chain-quarantine-policy.json"
    workflow_path = root / ".github/workflows/p42-exact-windows-node24-lifecycle-quarantine.yml"
    semantic_workflow_path = root / ".github/workflows/p42-exact-windows-semantic-dual-build.yml"
    p41_workflow_path = root / ".github/workflows/p41-exact-windows-node24-current-root-closure.yml"
    source_contract_path = root / "scripts/pass4823/typecheck-source-contract.mjs"
    control_builder_path = root / "scripts/pass42/build-p42-lifecycle-quarantine-controls.py"
    semantic_policy_builder_path = root / "scripts/pass42/build-p42-semantic-dual-build-policy.py"
    semantic_policy_path = root / "config/p42/p42-exact-windows-semantic-dual-build-policy.json"
    semantic_runner_path = root / "scripts/pass42/run-p42-exact-windows-semantic-dual-build.mjs"
    native_probe_path = root / "scripts/pass42/verify-p42-native-platform-availability.mjs"
    trusted_guard_path = root / "scripts/runtime/rebuild-trusted-native.mjs"

    required_paths = [package_path, lock_path, inventory_path, allowlist_path, pins_path, p42_policy_path, generic_policy_path, workflow_path, semantic_workflow_path, p41_workflow_path, source_contract_path, control_builder_path, semantic_policy_builder_path, semantic_policy_path, semantic_runner_path, native_probe_path, trusted_guard_path]
    for path in required_paths:
        if not path.is_file():
            blockers.append(f"required_file_missing:{path.relative_to(root).as_posix()}")
    if blockers:
        receipt = {"schemaVersion": "velmere.p42.lifecycle-quarantine-verification.v1", "status": "FAIL", "blockers": blockers}
        output.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
        return 1

    package = load_json(package_path)
    lock = load_json(lock_path)
    inventory = load_json(inventory_path)
    allowlist = load_json(allowlist_path)
    pins = load_json(pins_path)
    p42_policy = load_json(p42_policy_path)
    generic_policy = load_json(generic_policy_path)
    semantic_policy = load_json(semantic_policy_path)
    policy_bindings = p42_policy.get("bindings", {})
    binding_paths = {
        "packageJson": package_path,
        "packageLock": lock_path,
        "inventory": inventory_path,
        "allowlist": allowlist_path,
        "actionPins": pins_path,
        "genericQuarantinePolicy": generic_policy_path,
        "p42Workflow": workflow_path,
        "supersededP41Workflow": p41_workflow_path,
        "sourceContract": source_contract_path,
        "inventoryBuilder": root / "scripts/pass42/build-p42-lifecycle-inventory.py",
        "archiveAcquirer": root / "scripts/pass42/acquire-p42-lifecycle-evidence.py",
        "controlBuilder": control_builder_path,
        "quarantineVerifier": root / "scripts/pass42/verify-p42-lifecycle-quarantine.py",
        "trustedNativeGuard": trusted_guard_path,
        "nativePlatformProbe": native_probe_path,
        "semanticWorkflow": semantic_workflow_path,
        "semanticRunner": semantic_runner_path,
    }
    for binding_name, bound_path in binding_paths.items():
        binding = policy_bindings.get(binding_name)
        relative = bound_path.relative_to(root).as_posix()
        if not isinstance(binding, dict):
            blockers.append(f"p42_policy_binding_missing:{binding_name}")
            continue
        if binding.get("path") != relative:
            blockers.append(f"p42_policy_binding_path_mismatch:{binding_name}:{binding.get('path')}:{relative}")
        if binding.get("sha256") != sha256_file(bound_path):
            blockers.append(f"p42_policy_binding_sha_mismatch:{binding_name}")
        if binding.get("byteLength") != bound_path.stat().st_size:
            blockers.append(f"p42_policy_binding_size_mismatch:{binding_name}")
    if p42_policy.get("expectedGate", {}).get("semanticTypecheckLintBuildAllowed") is not False:
        blockers.append("p42_policy_expected_build_gate_not_blocked")
    if p42_policy.get("exactTarget") != {"os": "windows-2025", "platform": "win32", "arch": "x64", "node": "v24.18.0", "npm": "11.16.0"}:
        blockers.append("p42_policy_exact_target_mismatch")

    workflow = workflow_path.read_text(encoding="utf-8")
    semantic_workflow = semantic_workflow_path.read_text(encoding="utf-8")
    p41_workflow = p41_workflow_path.read_text(encoding="utf-8")
    source_contract = source_contract_path.read_text(encoding="utf-8")
    semantic_runner = semantic_runner_path.read_text(encoding="utf-8")
    trusted_guard = trusted_guard_path.read_text(encoding="utf-8")

    verify_self_integrity(inventory, "inventory", blockers)
    verify_self_integrity(allowlist, "allowlist", blockers)
    verify_self_integrity(pins, "action_pins", blockers)
    verify_self_integrity(p42_policy, "lifecycle_policy", blockers)
    verify_self_integrity(semantic_policy, "semantic_policy", blockers)

    checks["packageJsonSha256"] = sha256_file(package_path)
    checks["packageLockSha256"] = sha256_file(lock_path)
    checks["lockfileVersion"] = lock.get("lockfileVersion")
    if inventory["bindings"]["packageJson"]["sha256"] != checks["packageJsonSha256"]:
        blockers.append("inventory_package_binding_mismatch")
    if inventory["bindings"]["packageLock"]["sha256"] != checks["packageLockSha256"]:
        blockers.append("inventory_lock_binding_mismatch")
    if allowlist["bindings"]["packageJson"]["sha256"] != checks["packageJsonSha256"]:
        blockers.append("allowlist_package_binding_mismatch")
    if allowlist["bindings"]["packageLock"]["sha256"] != checks["packageLockSha256"]:
        blockers.append("allowlist_lock_binding_mismatch")
    if allowlist["bindings"]["inventory"]["sha256"] != sha256_file(inventory_path):
        blockers.append("allowlist_inventory_file_binding_mismatch")
    if allowlist["bindings"]["inventory"]["integritySha256"] != inventory.get("integritySha256"):
        blockers.append("allowlist_inventory_integrity_binding_mismatch")

    with tempfile.TemporaryDirectory(prefix="velmere-p42-inventory-") as temporary:
        observed = Path(temporary) / "inventory.json"
        result = subprocess.run(
            [sys.executable, str(root / "scripts/pass42/build-p42-lifecycle-inventory.py"), "--root", str(root), "--output", str(observed)],
            cwd=root,
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
        checks["inventoryReplayExitCode"] = result.returncode
        if result.returncode != 0:
            blockers.append(f"inventory_replay_failed:{result.stderr[-500:]}")
        elif observed.read_bytes() != inventory_path.read_bytes():
            blockers.append("inventory_replay_not_byte_identical")
        else:
            checks["inventoryReplayByteIdentical"] = True

    with tempfile.TemporaryDirectory(prefix="velmere-p42-controls-") as temporary:
        temp = Path(temporary)
        observed_allowlist = temp / "allowlist.json"
        observed_pins = temp / "pins.json"
        observed_policy = temp / "policy.json"
        result = subprocess.run(
            [sys.executable, str(control_builder_path), "--root", str(root), "--allowlist-output", str(observed_allowlist), "--pins-output", str(observed_pins), "--policy-output", str(observed_policy)],
            cwd=root, capture_output=True, text=True, timeout=120, check=False,
        )
        checks["controlBuilderReplayExitCode"] = result.returncode
        replay_pairs = [(observed_allowlist, allowlist_path, "allowlist"), (observed_pins, pins_path, "pins"), (observed_policy, p42_policy_path, "policy")]
        if result.returncode != 0:
            blockers.append(f"control_builder_replay_failed:{result.stderr[-1000:]}")
        else:
            for observed, canonical, label in replay_pairs:
                if observed.read_bytes() != canonical.read_bytes():
                    blockers.append(f"control_builder_replay_not_byte_identical:{label}")
                else:
                    checks[f"controlBuilderReplayByteIdentical:{label}"] = True

    with tempfile.TemporaryDirectory(prefix="velmere-p42-semantic-policy-") as temporary:
        observed = Path(temporary) / "semantic-policy.json"
        result = subprocess.run(
            [sys.executable, str(semantic_policy_builder_path), "--root", str(root), "--output", str(observed)],
            cwd=root, capture_output=True, text=True, timeout=120, check=False,
        )
        checks["semanticPolicyReplayExitCode"] = result.returncode
        if result.returncode != 0:
            blockers.append(f"semantic_policy_replay_failed:{result.stderr[-1000:]}")
        elif observed.read_bytes() != semantic_policy_path.read_bytes():
            blockers.append("semantic_policy_replay_not_byte_identical")
        else:
            checks["semanticPolicyReplayByteIdentical"] = True

    dependency_rows = inventory["dependencyLifecycleRows"]
    allowlist_rows = allowlist["dependencyLifecycleRows"]
    inventory_keys = [(row["packagePath"], row["name"], row["version"], row["integrity"]) for row in dependency_rows]
    allowlist_keys = [(row["packagePath"], row["name"], row["version"], row["integrity"]) for row in allowlist_rows]
    if inventory_keys != allowlist_keys:
        blockers.append("allowlist_exact_tuple_coverage_or_order_mismatch")

    expected_allow_scripts = allowlist["packageJsonAllowScriptsExpected"]
    if package.get("allowScripts") != expected_allow_scripts:
        blockers.append("package_json_allow_scripts_not_exact_current_fail_closed_map")
    if any(value is not False for value in expected_allow_scripts.values()):
        blockers.append("dependency_allow_scripts_must_remain_false_until_controlled_execution_evidence")

    target_applicable = [row for row in allowlist_rows if any(row["targetApplicability"].values())]
    approved_applicable = [row for row in target_applicable if row["executionApproved"]]
    checks["lifecycleDenominators"] = {
        "dependencyRowsTotal": len(dependency_rows),
        "targetApplicableDependencyRows": len(target_applicable),
        "targetApplicableDependencyRowsWithExactCurrentArchiveEvidence": sum(1 for row in dependency_rows if row["applicableToAnyRequiredTarget"] and row["exactCurrentArchiveEvidence"]),
        "targetApplicableDependencyExecutionApproved": len(approved_applicable),
        "rootLifecycleApproved": bool(allowlist["rootLifecycle"]["executionApproved"]),
    }
    if checks["lifecycleDenominators"] != {
        "dependencyRowsTotal": 6,
        "targetApplicableDependencyRows": 4,
        "targetApplicableDependencyRowsWithExactCurrentArchiveEvidence": 4,
        "targetApplicableDependencyExecutionApproved": 0,
        "rootLifecycleApproved": True,
    }:
        blockers.append(f"unexpected_lifecycle_denominator:{checks['lifecycleDenominators']}")
    if allowlist["gate"]["dependencyLifecycleExecutionAllowed"] is not False:
        blockers.append("dependency_lifecycle_gate_not_blocked")
    if allowlist["gate"]["npmCiWithoutIgnoreScriptsAllowed"] is not False:
        blockers.append("npm_ci_script_execution_gate_not_blocked")
    if allowlist["gate"]["semanticTypecheckLintBuildAllowed"] is not False:
        blockers.append("semantic_build_gate_not_blocked")

    bound = generic_policy.get("boundFiles", {})
    if bound.get("lifecycleInventory") != "config/p42/p42-current-lock-lifecycle-inventory.json":
        blockers.append("generic_policy_inventory_path_stale")
    if bound.get("installScriptAllowlist") != "config/p42/p42-lifecycle-execution-allowlist.json":
        blockers.append("generic_policy_allowlist_path_stale")
    if ".velmere/install-script-allowlist.json" in json.dumps(generic_policy):
        blockers.append("generic_policy_missing_velmere_allowlist_reference_remains")
    if ".velmere/install-script-allowlist.json" in source_contract:
        blockers.append("typecheck_source_contract_missing_velmere_allowlist_reference_remains")
    if "config/p42/p42-lifecycle-execution-allowlist.json" not in source_contract:
        blockers.append("typecheck_source_contract_current_allowlist_missing")

    expected_pins = {name: row["sha"] for name, row in pins["pins"].items()}
    action_refs = parse_action_refs(workflow)
    semantic_action_refs = parse_action_refs(semantic_workflow)
    checks["workflowActionRefs"] = action_refs
    checks["semanticWorkflowActionRefs"] = semantic_action_refs
    for label, refs in (("lifecycle", action_refs), ("semantic", semantic_action_refs)):
        if refs != expected_pins:
            blockers.append(f"{label}_workflow_action_pin_mismatch:{refs}:{expected_pins}")
        for name, ref in refs.items():
            if not PIN_RE.fullmatch(ref):
                blockers.append(f"{label}_workflow_action_not_full_sha:{name}:{ref}")
    for label, text in (("lifecycle", workflow), ("semantic", semantic_workflow)):
        if re.search(r"^\s+(?:push|pull_request|pull_request_target|schedule):", text, re.M):
            blockers.append(f"{label}_workflow_unapproved_automatic_trigger")
        if not re.search(r"^on:\s*\n\s+workflow_dispatch:", text, re.M):
            blockers.append(f"{label}_workflow_dispatch_only_contract_missing")
        if "persist-credentials: false" not in text:
            blockers.append(f"{label}_checkout_credentials_not_disabled")
        if not re.search(r"permissions:\s*\n\s+contents:\s*read", text, re.M):
            blockers.append(f"{label}_workflow_permissions_not_read_only")
        if "if: always()" not in text:
            blockers.append(f"{label}_workflow_failure_evidence_upload_not_always")
        if "npm ci" in text and "--ignore-scripts" not in text:
            blockers.append(f"{label}_workflow_contains_uncontrolled_npm_ci")
    if "install:trusted-native" in semantic_workflow or "npm rebuild" in semantic_workflow:
        blockers.append("semantic_workflow_dependency_lifecycle_execution_present")
    if re.search(r"run\(\s*[\'\"]npm[\'\"]\s*,\s*\[[^\]]*[\'\"]rebuild[\'\"]", semantic_runner, re.S) or "policy.commands.trustedNative" in semantic_runner:
        blockers.append("semantic_runner_dependency_lifecycle_execution_present")
    if "--ignore-scripts" not in json.dumps(semantic_policy.get("commands", {}).get("npmCi", [])):
        blockers.append("semantic_policy_npm_ci_ignore_scripts_missing")
    if any(token in json.dumps(semantic_policy.get("commands", {})) for token in ("install:trusted-native", "npm rebuild")):
        blockers.append("semantic_policy_forbidden_dependency_lifecycle_command")
    if "DEPENDENCY_LIFECYCLE_EXECUTION_WITHHELD_BY_CURRENT_ALLOWLIST" not in trusted_guard:
        blockers.append("trusted_native_guard_fail_closed_classification_missing")
    if "child_process" in trusted_guard or "npm rebuild" in trusted_guard:
        blockers.append("trusted_native_guard_must_not_execute_dependency_code")
    semantic_bindings = semantic_policy.get("currentRootBindings", {})
    for name, row in semantic_bindings.items():
        bound_path = root / row.get("path", "")
        if not bound_path.is_file() or row.get("sha256") != sha256_file(bound_path) or row.get("byteLength") != bound_path.stat().st_size:
            blockers.append(f"semantic_policy_binding_drift:{name}")

    if re.search(r"^\s+(?:push|pull_request|pull_request_target|schedule):", p41_workflow, re.M):
        blockers.append("superseded_p41_workflow_still_automatic")
    if "superseded" not in p41_workflow.lower() or "exit 1" not in p41_workflow:
        blockers.append("p41_supersession_fail_closed_contract_missing")
    if "uses:" in p41_workflow:
        blockers.append("p41_superseded_workflow_should_not_invoke_external_actions")

    checks["runtime"] = {
        "platform": sys.platform,
        "osName": os.name,
        "requireWindows": args.require_windows,
    }
    if args.require_windows and os.name != "nt":
        blockers.append(f"exact_windows_required_but_observed:{os.name}/{sys.platform}")

    status = "PASS" if not blockers else "FAIL"
    receipt: dict[str, Any] = {
        "schemaVersion": "velmere.p42.lifecycle-quarantine-verification.v1",
        "revision": "P42_V16_CURRENT_LOCK_LIFECYCLE_QUARANTINE_ACTION_PINNING_V2",
        "generatedAt": FIXED_GENERATED_AT,
        "status": status,
        "classification": "FAIL_CLOSED_LIFECYCLE_QUARANTINE_ENFORCED_BUILD_WITHHELD" if status == "PASS" else "LIFECYCLE_QUARANTINE_CONTRACT_FAILURE",
        "checks": checks,
        "blockers": blockers,
        "credit": {
            "currentLockLifecycleInventory": status == "PASS",
            "targetApplicabilityClassification": status == "PASS",
            "staleAllowlistRepair": status == "PASS",
            "githubActionFullCommitPins": status == "PASS",
            "semanticWorkflowFailClosed": status == "PASS",
            "trustedNativeGuardFailClosed": status == "PASS",
            "p41UnsafePathSuperseded": status == "PASS",
            "exactWindowsCurrentProjectExecution": False,
            "dependencyLifecycleExecution": False,
            "dependencyClosure": False,
            "typecheckLintDualBuild": False,
            "browser": False,
            "pdf": False,
            "goInternal": False,
            "goPaid": False,
        },
    }
    receipt["integritySha256"] = canonical_sha256(receipt)
    output.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": status, "classification": receipt["classification"], "blockers": blockers, "output": output.relative_to(root).as_posix()}, ensure_ascii=False, indent=2))
    return 0 if status == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
