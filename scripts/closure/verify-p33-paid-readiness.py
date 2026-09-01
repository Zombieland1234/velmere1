#!/usr/bin/env python3
from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
POLICY_PATH = ROOT / "config/closure/p33/paid-readiness-policy.json"
MATRIX_PATH = ROOT / "artifacts/closure/p33/paid-readiness-matrix.json"
RECEIPT_PATH = ROOT / "artifacts/closure/p33/paid-readiness-verifier-receipt.json"


def read(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text("utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"object_required:{path}")
    return value


def canonical_without_integrity(value: dict[str, Any]) -> bytes:
    copy_value = dict(value)
    copy_value.pop("integritySha256", None)
    return json.dumps(copy_value, sort_keys=True, separators=(",", ":")).encode()


def validate(policy: dict[str, Any], matrix: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    allowed = set(policy.get("states", []))
    policy_axes = policy.get("axes", [])
    rows = matrix.get("axes", [])
    if not isinstance(policy_axes, list) or not isinstance(rows, list):
        return ["axes_not_array"]
    policy_ids = [row.get("id") for row in policy_axes if isinstance(row, dict)]
    row_ids = [row.get("id") for row in rows if isinstance(row, dict)]
    if len(policy_ids) != len(set(policy_ids)):
        errors.append("duplicate_policy_axis")
    if row_ids != policy_ids:
        errors.append("axis_order_or_denominator_mismatch")
    if matrix.get("axisCount") != len(policy_ids):
        errors.append("axis_count_mismatch")
    for row in rows:
        if not isinstance(row, dict):
            errors.append("axis_not_object")
            continue
        if row.get("state") not in allowed:
            errors.append(f"invalid_state:{row.get('id')}")
    expected_integrity = hashlib.sha256(canonical_without_integrity(matrix)).hexdigest()
    if matrix.get("integritySha256") != expected_integrity:
        errors.append("integrity_mismatch")

    by_id = {row.get("id"): row for row in rows if isinstance(row, dict)}
    provider = by_id.get("provider_data_rights", {})
    provider_detail = ((provider.get("evidence") or [{}])[0].get("detail") or {}) if isinstance(provider, dict) else {}
    if provider.get("state") == "PASS_RELEASE" and (
        int(provider_detail.get("externalRightsVerified", 0) or 0) <= 0
        or int(provider_detail.get("sellEligibleCells", 0) or 0) <= 0
    ):
        errors.append("provider_rights_false_promotion")
    customer = by_id.get("real_customer_wtp_refund", {})
    if customer.get("state") == "PASS_RELEASE" and customer.get("blockers"):
        errors.append("customer_value_false_promotion")
    tier = by_id.get("final_tier_value_holdout", {})
    tier_detail = ((tier.get("evidence") or [{}])[0].get("detail") or {}) if isinstance(tier, dict) else {}
    if tier.get("state") == "PASS_RELEASE" and (
        int(tier_detail.get("customerValueProfilesClosed", 0) or 0) != 33
        or int(tier_detail.get("finalHoldoutsExecuted", 0) or 0) != 33
    ):
        errors.append("tier_value_false_promotion")
    stripe = by_id.get("stripe_webhook_replay_idempotency", {})
    if stripe.get("state") == "PASS_RELEASE":
        boundary = str(stripe.get("creditBoundary", "")).lower()
        if "fixture" in boundary or "no stripe test" in boundary:
            errors.append("local_stripe_aliased_to_release")

    release_ready = bool(rows) and all(row.get("state") == "PASS_RELEASE" for row in rows if isinstance(row, dict))
    if matrix.get("goPaidAllowed") is not release_ready:
        errors.append("go_paid_decision_mismatch")
    if matrix.get("saleEnabled") is not False:
        errors.append("sale_enabled_must_remain_false")
    return errors


def mutate_and_detect(policy: dict[str, Any], matrix: dict[str, Any], mutation: str) -> bool:
    candidate = copy.deepcopy(matrix)
    if mutation == "force_go_paid":
        candidate["goPaidAllowed"] = True
    elif mutation == "drop_axis":
        candidate["axes"] = candidate["axes"][:-1]
    elif mutation == "provider_false_pass":
        next(row for row in candidate["axes"] if row["id"] == "provider_data_rights")["state"] = "PASS_RELEASE"
    elif mutation == "customer_false_pass":
        next(row for row in candidate["axes"] if row["id"] == "real_customer_wtp_refund")["state"] = "PASS_RELEASE"
    elif mutation == "stripe_false_release":
        next(row for row in candidate["axes"] if row["id"] == "stripe_webhook_replay_idempotency")["state"] = "PASS_RELEASE"
    elif mutation == "tier_false_pass":
        next(row for row in candidate["axes"] if row["id"] == "final_tier_value_holdout")["state"] = "PASS_RELEASE"
    elif mutation == "tamper_integrity":
        candidate["truthBoundary"] = "tampered"
    else:
        raise ValueError(mutation)
    if mutation != "tamper_integrity":
        candidate["integritySha256"] = hashlib.sha256(canonical_without_integrity(candidate)).hexdigest()
    # Semantic mutations are re-sealed so the verifier must detect the false promotion itself.
    # The integrity mutation deliberately retains the old digest.
    return bool(validate(policy, candidate))


def main() -> int:
    policy = read(POLICY_PATH)
    matrix = read(MATRIX_PATH)
    errors = validate(policy, matrix)
    mutations = [
        "force_go_paid",
        "drop_axis",
        "provider_false_pass",
        "customer_false_pass",
        "stripe_false_release",
        "tier_false_pass",
        "tamper_integrity",
    ]
    mutation_results = {name: mutate_and_detect(policy, matrix, name) for name in mutations}
    ok = not errors and all(mutation_results.values())
    receipt = {
        "schemaVersion": "velmere.p33.paid-readiness-verifier-receipt.v1",
        "status": "PASS" if ok else "FAIL",
        "axisCount": matrix.get("axisCount"),
        "errors": errors,
        "mutationControls": mutation_results,
        "mutationsDetected": sum(mutation_results.values()),
        "mutationDenominator": len(mutation_results),
        "goPaidAllowed": matrix.get("goPaidAllowed"),
        "truthBoundary": "Verifier proves denominator, integrity and false-promotion resistance of the paid-readiness matrix. It does not grant any missing external, production, legal, provider-rights, customer-value or GO_PAID credit.",
    }
    RECEIPT_PATH.write_text(json.dumps(receipt, indent=2) + "\n", "utf-8")
    print(json.dumps(receipt, ensure_ascii=False))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
