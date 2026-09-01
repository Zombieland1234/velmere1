#!/usr/bin/env python3
"""Rebind the historical A85 Shield Pro/Map policy to current source bytes.

This closes only stale policy-to-source hashes and static production assertions.
It deliberately grants no TypeScript runtime, build, Browser, provider, paid,
customer, or release credit.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
BASE_POLICY = ROOT / "config/pass36/a85-shield-pro-map-full-depth-policy.json"
OUTPUT_POLICY = ROOT / "config/p37/a85-shield-pro-map-current-source-binding.json"
OUTPUT_RECEIPT = ROOT / "artifacts/closure/p37/P37_A85_CURRENT_SOURCE_BINDING_RECEIPT.json"
EXPECTED_BASE_POLICY_SHA256 = "6ce6d3c1451744cf3438e10c4f58914eb8808e4cfb7eb9ab720bea72a2d31744"
EXPECTED_STALE_KEYS = {"shieldProClient", "shieldMapClient", "shieldInvestigator"}
EXPECTED_PROJECT_NODE = "v24.18.0"


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def canonical_json(payload: object) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def integrity(payload: dict[str, object]) -> str:
    return sha256_bytes(canonical_json(payload))


def node_version() -> str | None:
    try:
        return subprocess.check_output(["node", "--version"], text=True, timeout=10).strip()
    except Exception:
        return None


def main() -> int:
    base_sha = sha256_file(BASE_POLICY)
    if base_sha != EXPECTED_BASE_POLICY_SHA256:
        raise RuntimeError(f"base_policy_changed:{base_sha}")
    base = json.loads(BASE_POLICY.read_text(encoding="utf-8"))

    input_rows: list[dict[str, object]] = []
    stale_keys: set[str] = set()
    for key, item in base["inputs"].items():
        path = ROOT / item["path"]
        if not path.is_file():
            raise RuntimeError(f"a85_bound_source_missing:{key}:{item['path']}")
        actual = sha256_file(path)
        historical = str(item["sha256"])
        changed = historical != actual
        if changed:
            stale_keys.add(key)
        input_rows.append({
            "key": key,
            "path": item["path"],
            "byteLength": path.stat().st_size,
            "historicalA85Sha256": historical,
            "currentSha256": actual,
            "historicalBindingStale": changed,
            "bindingAction": "REBIND_TO_CURRENT_SOURCE" if changed else "PRESERVE_MATCHING_BINDING",
        })

    if stale_keys != EXPECTED_STALE_KEYS:
        raise RuntimeError(f"unexpected_a85_stale_set:{sorted(stale_keys)}")

    assertion_results: list[dict[str, object]] = []
    for assertion in base.get("productionAssertions", []):
        path = ROOT / assertion["path"]
        text = path.read_text(encoding="utf-8")
        include_results = {token: token in text for token in assertion.get("includes", [])}
        exclude_results = {token: token not in text for token in assertion.get("excludes", [])}
        passed = all(include_results.values()) and all(exclude_results.values())
        assertion_results.append({
            "id": assertion["id"],
            "path": assertion["path"],
            "includes": include_results,
            "excludesAbsent": exclude_results,
            "pass": passed,
        })
    if not all(bool(row["pass"]) for row in assertion_results):
        failed = [row["id"] for row in assertion_results if not row["pass"]]
        raise RuntimeError(f"a85_static_production_assertion_failed:{failed}")

    observed_node = node_version()
    current_policy: dict[str, object] = {
        "schemaVersion": "velmere.p37.a85.current-source-binding.v1",
        "revision": "P37_A85_CURRENT_SOURCE_BINDING_REPAIR",
        "state": "IMPLEMENTED_AND_TESTED_INTERNAL_STATIC_BINDING_ONLY",
        "generatedAt": "2026-08-13T21:31:00.000Z",
        "parentRoot": "R44P46",
        "basePolicy": {
            "path": BASE_POLICY.relative_to(ROOT).as_posix(),
            "sha256": base_sha,
            "revisionId": base.get("revisionId"),
            "historicalPolicyPreservedUnchanged": True,
        },
        "currentBindings": input_rows,
        "staleBindingsDetected": len(stale_keys),
        "staleBindingKeys": sorted(stale_keys),
        "staleBindingsRebound": len(stale_keys),
        "staticProductionAssertions": assertion_results,
        "staticProductionAssertionsPassed": sum(1 for row in assertion_results if row["pass"]),
        "staticProductionAssertionDenominator": len(assertion_results),
        "runtimeBoundary": {
            "observedNode": observed_node,
            "requiredProjectNode": EXPECTED_PROJECT_NODE,
            "exactProjectNodeMatched": observed_node == EXPECTED_PROJECT_NODE,
            "typescriptRuntimeExecuted": False,
            "productionBuildExecuted": False,
            "browserExecuted": False,
        },
        "credit": {
            "stalePolicySourceBindingClosed": True,
            "staticAssertionCredit": True,
            "runtimeBehaviorCredit": False,
            "exactRuntimeCredit": False,
            "buildCredit": False,
            "browserCredit": False,
            "providerRightsCredit": False,
            "customerValueCredit": False,
            "saleOrGoPaidCredit": False,
        },
        "truthBoundary": (
            "The historical A85 policy is preserved. P37 binds its declared source set to current bytes and "
            "rechecks four source-string production assertions. Exact Node 24.18.0 TypeScript runtime, build, "
            "Browser, provider rights, customer value and paid delivery remain unexecuted by this receipt."
        ),
    }
    current_policy["integritySha256"] = integrity(current_policy)
    OUTPUT_POLICY.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_POLICY.write_text(json.dumps(current_policy, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    receipt: dict[str, object] = {
        "schemaVersion": "velmere.p37.a85.current-source-binding-receipt.v1",
        "revision": current_policy["revision"],
        "state": current_policy["state"],
        "generatedAt": current_policy["generatedAt"],
        "policy": {
            "path": OUTPUT_POLICY.relative_to(ROOT).as_posix(),
            "byteLength": OUTPUT_POLICY.stat().st_size,
            "sha256": sha256_file(OUTPUT_POLICY),
            "integritySha256": current_policy["integritySha256"],
        },
        "basePolicySha256": base_sha,
        "inputsChecked": len(input_rows),
        "inputsMatchedCurrentBytes": len(input_rows),
        "staleBindingsDetected": len(stale_keys),
        "staleBindingsRebound": len(stale_keys),
        "staticProductionAssertions": f'{sum(1 for row in assertion_results if row["pass"])}/{len(assertion_results)}',
        "exactProjectNodeMatched": observed_node == EXPECTED_PROJECT_NODE,
        "typescriptRuntimeExecuted": False,
        "releaseState": "NO_GO",
        "truthBoundary": current_policy["truthBoundary"],
    }
    receipt["integritySha256"] = integrity(receipt)
    OUTPUT_RECEIPT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_RECEIPT.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(json.dumps({
        "status": "PASS_P37_A85_CURRENT_SOURCE_BINDING_REPAIR",
        "inputs": len(input_rows),
        "staleDetected": len(stale_keys),
        "staleRebound": len(stale_keys),
        "assertions": f'{sum(1 for row in assertion_results if row["pass"])}/{len(assertion_results)}',
        "observedNode": observed_node,
        "exactProjectNodeMatched": observed_node == EXPECTED_PROJECT_NODE,
        "policySha256": sha256_file(OUTPUT_POLICY),
        "receiptSha256": sha256_file(OUTPUT_RECEIPT),
        "runtimeBehaviorCredit": False,
        "releaseState": "NO_GO",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
