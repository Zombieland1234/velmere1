#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
POLICY_PATH = ROOT / "config/closure/p33/paid-readiness-policy.json"
OUT_PATH = ROOT / "artifacts/closure/p33/paid-readiness-matrix.json"


def read_json(path: Path) -> dict[str, Any] | None:
    try:
        value = json.loads(path.read_text("utf-8"))
        return value if isinstance(value, dict) else None
    except Exception:
        return None


def read_text(path: Path) -> str:
    try:
        return path.read_text("utf-8")
    except Exception:
        return ""


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str | None:
    try:
        return sha256_bytes(path.read_bytes())
    except Exception:
        return None


def test_pass(log_name: str, needle: str | None = None) -> bool:
    path = ROOT / "artifacts/closure/p33/paid-tests-current" / f"{log_name}.stdout.log"
    text = read_text(path)
    if not text:
        return False
    if needle is not None:
        return needle in text
    return "PASS" in text and "FAIL" not in text[-800:]


def axis(axis_id: str, label: str, state: str, evidence: list[dict[str, Any]], blockers: list[str], boundary: str) -> dict[str, Any]:
    return {
        "id": axis_id,
        "label": label,
        "state": state,
        "evidence": evidence,
        "blockers": blockers,
        "creditBoundary": boundary,
    }


def ev(path: str, status: str, detail: Any = None) -> dict[str, Any]:
    full = ROOT / path
    return {
        "path": path,
        "status": status,
        "sha256": sha256_file(full),
        "detail": detail,
    }


def main() -> int:
    policy = read_json(POLICY_PATH)
    if not policy:
        raise SystemExit("paid_readiness_policy_missing_or_invalid")
    definitions = {row["id"]: row for row in policy["axes"]}

    paid_campaign = read_json(ROOT / "artifacts/closure/p33/paid-test-campaign-current.json") or {}
    paid_current = paid_campaign.get("currentSourceSummary") if isinstance(paid_campaign.get("currentSourceSummary"), dict) else {}
    current_paid_tests_green = paid_current.get("PASS") == paid_campaign.get("currentSourceDenominator") and paid_current.get("FAIL") == 0

    stripe_receipt_path = ROOT / "artifacts/closure/p33/local-stripe/R44P32_LOCAL_STRIPE_SUITE_RECEIPT.json"
    stripe = read_json(stripe_receipt_path) or {}
    source_identity_path = ROOT / "artifacts/closure/p33/source-identity.json"
    source_identity = read_json(source_identity_path) or {}
    source_manifest_sha = sha256_file(source_identity_path)
    source_aggregate_sha = source_identity.get("sourceAggregateSha256")
    stripe_truth = stripe.get("truthBoundary") if isinstance(stripe.get("truthBoundary"), dict) else {}
    stripe_lifecycle = stripe.get("lifecycle") if isinstance(stripe.get("lifecycle"), dict) else {}
    stripe_verifier = stripe.get("independentVerifier") if isinstance(stripe.get("independentVerifier"), dict) else {}
    stripe_binding = stripe.get("sourceBinding") if isinstance(stripe.get("sourceBinding"), dict) else {}
    stripe_local_green = (
        stripe.get("status") == "PASS"
        and stripe_truth.get("localStripeApiFixtureCredit") is True
        and stripe_lifecycle.get("passed") == stripe_lifecycle.get("required") == 12
        and stripe_verifier.get("passed") == stripe_verifier.get("checks") == 45
        and stripe_binding.get("sourceManifestSha256") == source_manifest_sha
        and stripe_binding.get("sourceAggregateSha256") == source_aggregate_sha
    )

    provider_log = read_text(ROOT / "artifacts/closure/p33/paid-tests-current/scripts__pass21__audit-provider-rights-registry.mjs.stdout.log")
    try:
        provider = json.loads(provider_log) if provider_log else {}
    except Exception:
        provider = {}
    provider_verified = int(provider.get("externalRightsVerified", 0) or 0)
    provider_enabled = int(provider.get("commerciallyEnabledProviders", 0) or 0)
    sell_cells = int(provider.get("sellEligibleCells", 0) or 0)

    merchant_log = read_text(ROOT / "artifacts/closure/p33/paid-tests-current/scripts__pass23__verify-merchant-legal-intake.mjs.stdout.log")
    try:
        merchant = json.loads(merchant_log) if merchant_log else {}
    except Exception:
        merchant = {}
    merchant_ready = merchant.get("commercialReady") is True
    merchant_blockers = int(merchant.get("registryBlockers", 0) or 0)

    profile = read_json(ROOT / "artifacts/closure/p32/profile-execution-manifest.json") or {}
    customer_value_profiles = int(profile.get("customerValueProfilesClosed", 0) or 0)
    final_holdouts = int(profile.get("finalHoldoutsExecuted", 0) or 0)

    exact_build = read_json(ROOT / "artifacts/closure/p29/build/production-build.json") or read_json(ROOT / "artifacts/closure/p33/build/production-build.json") or {}
    exact_build_green = exact_build.get("status") == "PASS"
    staging_identity = read_json(ROOT / "artifacts/closure/p33/staging/deployment-identity.json") or {}
    staging_green = staging_identity.get("status") == "PASS"

    sku_green = (
        test_pass("scripts__pass32__test-paid-surface-truth.ts", "PASS Lens Pro and Advanced PDF choices")
        and test_pass("scripts__pass35__test-paid-ui-stop-sell.mjs", "stop-sell fail closed")
        and test_pass("scripts__pass36__test-a102r44p22-paid-entitlement-current-fail-closed.mjs", '"status": "PASS"')
        and current_paid_tests_green
    )
    entitlement_green = (
        test_pass("scripts__pass32__test-payment-auth-hardening.ts")
        and test_pass("scripts__pass36__test-a102r41-entitlement-revocation-rls-remediation.mjs", "PASS_A102R41")
        and test_pass("scripts__pass36__test-a102r5-paid-entitlement-browser-secret-boundary.ts")
    )
    checkout_green = (
        test_pass("scripts__pass36__test-a97-vlm-paid-handler-preflight.ts")
        and test_pass("scripts__pass36__test-a97-stripe-webhook-ingress.ts")
        and test_pass("scripts__pass36__test-a102r8-checkout-customer-browser-privacy-boundary.ts")
    )
    delivery_green = (
        test_pass("tests__security__a102-paid-account-delivery-public-contract.test.ts", "Paid account delivery public contract: PASS")
        and test_pass("tests__security__audit-account-message-tenant-isolation.test.ts")
    )
    tenant_local_green = (
        test_pass("scripts__pass36__test-a89-account-auth-tenant-privacy-red-team.ts")
        and test_pass("scripts__pass36__test-a96-rls-tenant-isolation.mjs")
    )

    axes = [
        axis(
            "sku_stop_sell_truth", definitions["sku_stop_sell_truth"]["label"],
            "PASS_INTERNAL" if sku_green else "FAIL",
            [ev("artifacts/closure/p33/paid-test-campaign-current.json", "PASS" if current_paid_tests_green else "FAIL", paid_current)],
            [] if sku_green else ["current paid SKU/stop-sell campaign not fully green"],
            "Current-source static/local policy credit only; Pro remains invitation-only and Advanced remains not for sale.",
        ),
        axis(
            "server_entitlement_revocation", definitions["server_entitlement_revocation"]["label"],
            "PASS_INTERNAL" if entitlement_green else "FAIL",
            [ev("lib/commerce/vlm-entitlement-ledger.ts", "CURRENT_SOURCE")],
            [] if entitlement_green else ["entitlement/revocation current-source tests incomplete"],
            "Internal server-policy and local ledger credit; disposable staging tenant proof remains open.",
        ),
        axis(
            "checkout_public_contract_auth", definitions["checkout_public_contract_auth"]["label"],
            "PASS_INTERNAL" if checkout_green else "FAIL",
            [ev("artifacts/closure/p33/paid-test-campaign-current.json", "PASS" if checkout_green else "FAIL")],
            [] if checkout_green else ["checkout/auth public contract tests incomplete"],
            "Current-source local contract credit; no production charging or deployed identity credit.",
        ),
        axis(
            "stripe_webhook_replay_idempotency", definitions["stripe_webhook_replay_idempotency"]["label"],
            "PASS_INTERNAL" if stripe_local_green else "BLOCKED_INTERNAL",
            [ev("artifacts/closure/p33/local-stripe/R44P32_LOCAL_STRIPE_SUITE_RECEIPT.json", "PASS_LOCAL_FIXTURE" if stripe_local_green else "NOT_RUN", stripe.get("lifecycle"))],
            [] if stripe_local_green else ["current-bound local Stripe lifecycle not green"],
            "Local Stripe fixture only. Stripe TEST/staging/production credit is not granted.",
        ),
        axis(
            "refund_cancel_revoke", definitions["refund_cancel_revoke"]["label"],
            "PASS_INTERNAL" if stripe_local_green else "BLOCKED_INTERNAL",
            [ev("artifacts/closure/p33/local-stripe/R44P32_LOCAL_STRIPE_SUITE_RECEIPT.json", "PASS_LOCAL_FIXTURE" if stripe_local_green else "NOT_RUN")],
            [] if stripe_local_green else ["local refund/revoke lifecycle not executed"],
            "Local refund/revoke/reconciliation fixture credit only; no real refund, chargeback or customer-support outcome.",
        ),
        axis(
            "customer_delivery_support_projection", definitions["customer_delivery_support_projection"]["label"],
            "PASS_INTERNAL" if delivery_green else "FAIL",
            [ev("lib/server/lazy-route-modules/account--audit-messages.ts", "CURRENT_SOURCE"), ev("components/account/AuditAccountMessagesClient.tsx", "CURRENT_SOURCE")],
            [] if delivery_green else ["customer delivery/support projection tests incomplete"],
            "Customer-safe local contract and tenant-filtering credit; production delivery SLO/support operations remain open.",
        ),
        axis(
            "tenant_privacy", definitions["tenant_privacy"]["label"],
            "PARTIAL_INTERNAL" if tenant_local_green else "FAIL",
            [ev("artifacts/closure/p33/paid-test-campaign-current.json", "LOCAL_STATIC_PASS" if tenant_local_green else "FAIL")],
            ["disposable staging two-tenant proof not run", "real deletion/export/retention workflow not proven"],
            "Local/static red-team credit only; no deployed tenant, DSAR or processor proof.",
        ),
        axis(
            "provider_data_rights", definitions["provider_data_rights"]["label"],
            "EXTERNAL_OPEN",
            [ev("config/pass21/provider-commercial-rights-registry.json", "REGISTRY_PRESENT", {"providers": provider.get("providers"), "externalRightsVerified": provider_verified, "commerciallyEnabledProviders": provider_enabled, "sellEligibleCells": sell_cells})],
            ["0 external commercial-rights decisions", "0 commercially enabled external providers", "0 sell-eligible provider cells"],
            "Code/API availability is not commercial display, retention, redistribution, PDF, AI/RAG or paid-tier permission.",
        ),
        axis(
            "merchant_legal_identity_terms", definitions["merchant_legal_identity_terms"]["label"],
            "PASS_RELEASE" if merchant_ready else "EXTERNAL_OPEN",
            [ev("config/pass21/merchant-legal-profile.json", "READY" if merchant_ready else "INCOMPLETE", {"registryBlockers": merchant_blockers, "missing": merchant.get("missing", [])})],
            [] if merchant_ready else [f"merchant/legal intake has {merchant_blockers} blockers", "professional product-role/data-rights decisions remain open"],
            "Internal memos prepare the boundary but do not grant professional legal or merchant-registration credit.",
        ),
        axis(
            "final_tier_value_holdout", definitions["final_tier_value_holdout"]["label"],
            "PASS_RELEASE" if customer_value_profiles == 33 and final_holdouts == 33 else "BLOCKED_INTERNAL",
            [ev("artifacts/closure/p32/profile-execution-manifest.json", "FIXTURE_ONLY", {"customerValueProfilesClosed": customer_value_profiles, "finalHoldoutsExecuted": final_holdouts})],
            [f"customer-value profiles closed {customer_value_profiles}/33", f"final holdouts executed {final_holdouts}/33"],
            "Internal fixture execution does not prove paid delta, WTP, factuality or refund risk.",
        ),
        axis(
            "clean_build_staging_operations", definitions["clean_build_staging_operations"]["label"],
            "PASS_RELEASE" if exact_build_green and staging_green else "BLOCKED_INTERNAL",
            [ev("package-lock.json", "CURRENT_INPUT"), ev("artifacts/closure/p33/build/production-build.json", "PASS" if exact_build_green else "NOT_RUN"), ev("artifacts/closure/p33/staging/deployment-identity.json", "PASS" if staging_green else "NOT_RUN")],
            ["clean current lockfile install/typecheck/build not closed", "current staging deployment identity not closed", "restore/rollback/observability final receipts open"],
            "Diagnostic TypeScript and local source tests are not clean build/staging/operations credit.",
        ),
        axis(
            "real_customer_wtp_refund", definitions["real_customer_wtp_refund"]["label"],
            "EXTERNAL_OPEN",
            [],
            ["0 real participants", "0 real WTP results", "0 real refund-expectation results"],
            "AI personas and internal reviewers receive zero real-customer or market-demand credit.",
        ),
    ]

    counts: dict[str, int] = {}
    for row in axes:
        counts[row["state"]] = counts.get(row["state"], 0) + 1
    release_ready = all(row["state"] == "PASS_RELEASE" for row in axes)
    matrix = {
        "schemaVersion": "velmere.p33.paid-readiness-matrix.v1",
        "policySha256": sha256_file(POLICY_PATH),
        "axisCount": len(axes),
        "counts": counts,
        "internalInfrastructurePassCount": sum(row["state"] in {"PASS_INTERNAL", "PASS_RELEASE"} for row in axes),
        "releasePassCount": sum(row["state"] == "PASS_RELEASE" for row in axes),
        "axes": axes,
        "goPaidAllowed": release_ready,
        "saleEnabled": False,
        "productionApproved": False,
        "truthBoundary": "This matrix decomposes paid readiness. PASS_INTERNAL advances internal payment/delivery infrastructure only. GO_PAID requires every applicable axis to reach PASS_RELEASE; internal fixtures, AI review and planning estimates cannot substitute external rights, legal, staging or real-customer evidence.",
    }
    canonical = json.dumps(matrix, sort_keys=True, separators=(",", ":")).encode()
    matrix["integritySha256"] = sha256_bytes(canonical)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(matrix, indent=2, ensure_ascii=False) + "\n", "utf-8")
    print(json.dumps({
        "status": "PASS_P33_PAID_READINESS_MATRIX_BUILT",
        "axisCount": len(axes),
        "counts": counts,
        "internalInfrastructurePassCount": matrix["internalInfrastructurePassCount"],
        "releasePassCount": matrix["releasePassCount"],
        "goPaidAllowed": release_ready,
        "output": str(OUT_PATH.relative_to(ROOT)),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
