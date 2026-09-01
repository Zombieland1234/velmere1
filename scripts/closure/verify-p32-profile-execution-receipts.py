#!/usr/bin/env python3
from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = ROOT / "artifacts/closure/p32/profile-execution-manifest.json"
SUMMARY_PATH = ROOT / "artifacts/closure/p32/same-input-structural-fixture-summary.json"
OUT_PATH = ROOT / "artifacts/closure/p32/profile-execution-verifier-receipt.json"


def load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def canonical_sha(value: Any) -> str:
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(raw).hexdigest()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def check_manifest(manifest: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    core = {k: v for k, v in manifest.items() if k != "integritySha256"}
    if manifest.get("integritySha256") != canonical_sha(core): errors.append("manifest_integrity")
    rows = manifest.get("receipts", [])
    if manifest.get("profileCount") != 33 or len(rows) != 33: errors.append("profile_denominator")
    if manifest.get("executedInternalFixtureRegression") != 30: errors.append("executed_denominator")
    if manifest.get("blocked") != 3: errors.append("blocked_denominator")
    if manifest.get("finalHoldoutsFrozen") != 0 or manifest.get("finalHoldoutsExecuted") != 0: errors.append("final_holdout_false_credit")
    if manifest.get("customerValueProfilesClosed") != 0 or manifest.get("paidProfilesClosed") != 0 or manifest.get("saleProfilesClosed") != 0: errors.append("commercial_false_credit")
    ids = [r.get("profileId") for r in rows]
    if len(set(ids)) != 33: errors.append("duplicate_profile_ids")
    row_executed = sum(r.get("executionState") == "EXECUTED_INTERNAL_FIXTURE_REGRESSION" for r in rows)
    row_blocked = sum(str(r.get("executionState", "")).startswith("BLOCKED") for r in rows)
    if row_executed != manifest.get("executedInternalFixtureRegression"): errors.append("row_executed_count_mismatch")
    if row_blocked != manifest.get("blocked"): errors.append("row_blocked_count_mismatch")
    for row in rows:
        p = ROOT / row["receiptPath"]
        if not p.exists():
            errors.append(f"missing_receipt:{row.get('profileId')}")
            continue
        if sha256_file(p) != row.get("receiptSha256"): errors.append(f"receipt_hash:{row.get('profileId')}")
        receipt = load(p)
        if row.get("executionState") != receipt.get("executionState"): errors.append(f"row_receipt_state_mismatch:{row.get('profileId')}")
        core_receipt = {k: v for k, v in receipt.items() if k != "receiptSha256"}
        if receipt.get("receiptSha256") != canonical_sha(core_receipt): errors.append(f"receipt_integrity:{row.get('profileId')}")
        if any(receipt.get(k) is not False for k in ["customerValueCredit", "realCustomerCredit", "externalReviewCredit", "providerRightsCredit", "paidTierCredit", "productionBuildCredit", "saleCredit"]):
            errors.append(f"false_credit:{row.get('profileId')}")
        product = receipt.get("product")
        state = receipt.get("executionState")
        if product == "browser" and state != "BLOCKED_BROWSER_EXECUTION_NOT_RUN": errors.append(f"browser_promotion:{row.get('profileId')}")
        if product != "browser" and state != "EXECUTED_INTERNAL_FIXTURE_REGRESSION": errors.append(f"execution_state:{row.get('profileId')}")
        if receipt.get("finalHoldoutState") != "NOT_FROZEN" or receipt.get("finalHoldoutExecution") != "NOT_RUN": errors.append(f"holdout_false_credit:{row.get('profileId')}")
    return errors


manifest = load(MANIFEST_PATH)
summary = load(SUMMARY_PATH)
checks = []

def add(name: str, passed: bool, detail: Any = None) -> None:
    checks.append({"id": name, "passed": bool(passed), "detail": detail})

errors = check_manifest(manifest)
add("manifest:valid", not errors, errors)
add("summary:state", summary.get("state") == "STRUCTURAL_FIXTURE_DELTA_ONLY_NOT_FINAL_VALUE_CAMPAIGN", summary.get("state"))
add("summary:profile-counts", summary.get("profileCounts", {}).get("executedInternalFixtureRegression") == 30 and summary.get("profileCounts", {}).get("blockedBrowser") == 3 and summary.get("profileCounts", {}).get("finalHoldoutsFrozen") == 0, summary.get("profileCounts"))
add("summary:no-value-metrics", all(metric in summary.get("metricsNotYetClosed", []) for metric in ["NEW_FACT", "DUPLICATE", "decision-change", "willingness-to-pay"]), summary.get("metricsNotYetClosed"))

# Mutation controls prove the verifier rejects the most dangerous false promotions.
mutations: list[dict[str, Any]] = []

def mutate(mid: str, fn) -> None:
    candidate = copy.deepcopy(manifest)
    fn(candidate)
    # Recompute integrity so the semantic mutation cannot be rejected only by the checksum.
    candidate["integritySha256"] = canonical_sha({k: v for k, v in candidate.items() if k != "integritySha256"})
    detected = bool(check_manifest(candidate))
    mutations.append({"mutationId": mid, "detected": detected})

mutate("promote_browser_execution", lambda x: x["receipts"].__setitem__(next(i for i,r in enumerate(x["receipts"]) if r["profileId"] == "browser--basic"), {**next(r for r in x["receipts"] if r["profileId"] == "browser--basic"), "executionState": "EXECUTED_INTERNAL_FIXTURE_REGRESSION"}))
mutate("claim_final_holdout", lambda x: x.__setitem__("finalHoldoutsFrozen", 33))
mutate("claim_customer_value", lambda x: x.__setitem__("customerValueProfilesClosed", 30))
mutate("shrink_profile_denominator", lambda x: x["receipts"].pop())
add("mutations:detected", all(row["detected"] for row in mutations), mutations)

failed = [row for row in checks if not row["passed"]]
receipt = {
    "schemaVersion": "velmere.p32.profile-execution-verifier-receipt.v1",
    "state": "PASS_PROFILE_EXECUTION_RECEIPTS_FAIL_CLOSED" if not failed else "FAIL_PROFILE_EXECUTION_RECEIPTS",
    "summary": {"checks": len(checks), "passed": len(checks) - len(failed), "failed": len(failed)},
    "profileCounts": manifest.get("profileCount"),
    "executedInternalFixtureRegression": manifest.get("executedInternalFixtureRegression"),
    "blockedBrowser": manifest.get("blocked"),
    "finalHoldoutsFrozen": manifest.get("finalHoldoutsFrozen"),
    "mutations": mutations,
    "truthBoundary": "This verifier protects against converting internal fixture execution into Browser, final-holdout, customer-value, paid or sale credit.",
    "failures": failed,
    "checks": checks,
}
OUT_PATH.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(receipt, ensure_ascii=False, indent=2))
raise SystemExit(1 if failed else 0)
