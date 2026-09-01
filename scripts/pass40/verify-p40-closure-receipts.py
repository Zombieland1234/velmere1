#!/usr/bin/env python3
"""Verify P40 source, A85/A83 replay, differential and profile/rights receipts."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "artifacts/closure/p40"
EXPECTED_V16 = "67816a5a9238668c8080a3a8cc623f078d268c1b78fddf534cb4893bb45490e9"
EXPECTED_A85_POLICY = "99d45a32efe55d4d630a6fcab42c3b4a47a5b54332ed6ddbb23b8af52653bc73"
EXPECTED_A85_RECEIPT = "f72de4db59f4c72202034decbd9c82716056e75295926b6e7fec0cbdef6e69ea"
EXPECTED_A85_RUNTIME = "551b34089a3f901b5919da3684b8bda199ca7d160acafca2e0606b2d210823de"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise RuntimeError(f"required_receipt_missing:{path}")
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    v16 = ROOT / "docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V16_FULL_TOPOLOGY_FREE_LEGAL_CURRENT_WORLD_CLASS_2026-08-14.txt"
    if sha256_file(v16) != EXPECTED_V16:
        raise RuntimeError("v16_authority_drift")
    if sha256_file(ROOT / "config/pass36/a85-shield-pro-map-full-depth-policy.json") != EXPECTED_A85_POLICY:
        raise RuntimeError("a85_policy_drift")
    if sha256_file(ROOT / "config/pass36/a85-test-receipt.json") != EXPECTED_A85_RECEIPT:
        raise RuntimeError("a85_receipt_drift")
    if sha256_file(ROOT / "artifacts/pass36/a85/PASS36_A85_SHIELD_PRO_MAP_FULL_DEPTH_RUNTIME.json") != EXPECTED_A85_RUNTIME:
        raise RuntimeError("a85_runtime_drift")

    identity = load(ART / "source-identity.json")
    replay = load(ART / "P40_A85_CANONICAL_REPLAY_AND_A83_FAIL_CLOSED_ATTEMPT.json")
    baseline = load(ART / "P40_EXACT_FIXTURE_PROFILE_AND_CANDIDATE_FIELD_BASELINE.json")
    differential = load(ART / "P40_SOURCE_DIFFERENTIAL.json")
    registry = load(ROOT / "config/p40/p40-candidate-field-use-case-registry.json")
    policy = load(ROOT / "config/p40/p40-fixture-profile-binding-policy.json")

    if identity["parentSourceAggregateSha256"] != "f8caeb6d43dcc509d234d58c5e98780babe476755046fc6a92e13e2b44a79968":
        raise RuntimeError("p40_parent_source_aggregate_mismatch")
    if replay["a85CanonicalReplay"]["canonicalCurrentPolicyReplayPass"] is not True:
        raise RuntimeError("a85_canonical_replay_not_pass")
    if replay["a85CanonicalReplay"]["matchesP39ExactNode24180Receipt"] is not True or replay["a85CanonicalReplay"]["matchesP39ExactNode24180Runtime"] is not True:
        raise RuntimeError("a85_exact_node_byte_parity_missing")
    if replay["a85CanonicalReplay"]["exactNode24180PhysicallyExecutedThisPass"] is not False:
        raise RuntimeError("a85_exact_node_false_promotion")
    if replay["a83ReplayAttempt"]["failClosedPass"] is not True or replay["a83ReplayAttempt"]["pdfIndependentReplay"] is not False or replay["a83ReplayAttempt"]["browserExecuted"] is not False:
        raise RuntimeError("a83_fail_closed_boundary_invalid")

    den = baseline["denominators"]
    if den["exactNodeBoundInternalFixtureProfiles"] != "27/33" or den["browserPdfProfilesWithoutPhysicalCurrentExecution"] != "6/33":
        raise RuntimeError("profile_denominator_invalid")
    if den["candidateFieldRowsFrozen"] != 176 or den["candidateFieldRightsPassed"] != "0/176" or den["currentCustomerOutputs"] != "0/17":
        raise RuntimeError("candidate_registry_denominator_invalid")
    if len(baseline["profileRows"]) != 33:
        raise RuntimeError("profile_rows_not_33")
    if sum(row["executionClass"] == "EXACT_NODE_24_18_0_BOUND_INTERNAL_FIXTURE_PROFILE" for row in baseline["profileRows"]) != 27:
        raise RuntimeError("exact_fixture_profile_count_invalid")
    if registry["candidateRows"] != 176 or registry["rightsPassed"] != 0 or registry["saleEligibleRows"] != 0:
        raise RuntimeError("candidate_registry_false_credit")
    if policy["topology"]["internalProfiles"] != 33 or policy["topology"]["exactNodeBoundFixtureProfilesTarget"] != 27:
        raise RuntimeError("profile_policy_topology_invalid")

    d39 = differential["p39ToP40"]
    if "config/pass36/a85-shield-pro-map-full-depth-policy.json" not in d39["changed"]:
        raise RuntimeError("a85_change_missing_from_differential")
    if differential["p36ToP40BuildSensitive"]["packageLockIdentical"] is not True:
        raise RuntimeError("package_lock_continuity_missing")
    if any(differential["credit"].get(key) is not False for key in (
        "currentDependencyClosure", "currentTypecheck", "currentLint", "currentWebpack",
        "currentTurbopack", "currentBrowser", "currentPdf", "goInternal",
    )):
        raise RuntimeError("differential_false_promotion")

    print(json.dumps({
        "status": "PASS_P40_CLOSURE_RECEIPTS",
        "sourceAggregateSha256": identity["sourceAggregateSha256"],
        "a85CanonicalReplay": "PASS_WITH_EXACT_NODE_BYTE_PARITY",
        "a83Replay": "FAIL_CLOSED_FONT_REQUIRED",
        "exactNodeBoundInternalFixtureProfiles": "27/33",
        "candidateFieldRows": 176,
        "candidateRightsPassed": "0/176",
        "customerOutputs": "0/17",
        "saleEligible": "0/17",
        "releaseState": "NO_GO",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
