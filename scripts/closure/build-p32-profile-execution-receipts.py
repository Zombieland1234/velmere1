#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
P31 = ROOT / "artifacts/closure/p31/execution-profiles"
OUT = ROOT / "artifacts/closure/p32/profile-executions"
MANIFEST = ROOT / "artifacts/closure/p32/profile-execution-manifest.json"
SUMMARY = ROOT / "artifacts/closure/p32/same-input-structural-fixture-summary.json"


def load(rel: str) -> Any:
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def canonical_sha(value: Any) -> str:
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(raw).hexdigest()


def tier_row(readiness: dict[str, Any], tier: str) -> dict[str, Any]:
    return readiness.get(tier, {}) if isinstance(readiness, dict) else {}


a82 = load("artifacts/closure/p32/runtime/a82-current-byte-revalidation.json")
a83 = load("artifacts/closure/p32/runtime/a83-current-byte-revalidation.json")
a84 = load("artifacts/closure/p32/runtime/a84-verify.json")
a85 = load("artifacts/closure/p32/runtime/a85-current-byte-revalidation.json")
a86 = load("artifacts/closure/p32/runtime/a86-verify-after-write.json")
a87 = load("artifacts/closure/p32/runtime/a87-verify.json")
a88 = load("artifacts/closure/p32/runtime/a88-verify.json")
a88_runtime = load("artifacts/pass36/a88/PASS36_A88_BRAIN_ANGEL_RISK_EVAL_RUNTIME.json")

sources = {
    "audit": ("artifacts/closure/p32/runtime/a82-current-byte-revalidation.json", a82),
    "pdf": ("artifacts/closure/p32/runtime/a83-current-byte-revalidation.json", a83),
    "browser": ("artifacts/closure/p32/runtime/a83-current-byte-revalidation.json", a83),
    "shield": ("artifacts/closure/p32/runtime/a84-verify.json", a84),
    "shield-pro": ("artifacts/closure/p32/runtime/a85-current-byte-revalidation.json", a85),
    "shield-map": ("artifacts/closure/p32/runtime/a85-current-byte-revalidation.json", a85),
    "real-markets": ("artifacts/closure/p32/runtime/a86-verify-after-write.json", a86),
    "angel": ("artifacts/closure/p32/runtime/a88-verify.json", a88),
    "risk": ("artifacts/closure/p32/runtime/a88-verify.json", a88),
    "whale-watch": ("artifacts/closure/p32/runtime/a87-verify.json", a87),
    "market-impact": ("artifacts/closure/p32/runtime/a87-verify.json", a87),
}


def evidence_for(product: str, tier: str) -> dict[str, Any]:
    if product == "audit":
        return {
            "baseCases": 50,
            "tierOutputsTotal": 150,
            "tierOutputsForProfile": 50,
            "fixtureToolReceiptsTotal": 200,
            "officialToolExecutions": 0,
            "mutationKilled": 1000,
            "realCasesFullyVerified": 0,
        }
    if product == "pdf":
        pages = {"basic": 300, "pro": 600, "advanced": 1200}[tier]
        return {
            "baseCases": 50,
            "locales": 3,
            "physicalPdfsForProfile": 150,
            "renderedPagesForProfile": pages,
            "physicalPdfsTotal": 450,
            "renderedPagesTotal": 2100,
            "blankPages": 0,
            "pagesTouchingRasterEdge": 0,
            "browserRuns": 0,
            "secureDeliveries": 0,
            "mutationKilled": 8100,
        }
    if product == "browser":
        return {
            "baseCases": 50,
            "browserRuns": 0,
            "browserEvidence": 0,
            "reason": "A83 generated and raster-validated PDFs but executed zero production/customer browser journeys.",
        }
    if product == "shield":
        return {**tier_row(a84["readiness"], tier), **a84["fixtureDenominators"], "rightsApprovedAssets": 0, "productionBrowserAssets": 0}
    if product in {"shield-pro", "shield-map"}:
        row = tier_row(a85["runtime"]["readiness"], tier)
        prefix = "shieldPro" if product == "shield-pro" else "shieldMap"
        return {
            "activeAssets": a85["runtime"]["denominators"]["activeAssets"],
            "functionalReadyOffline": row.get(f"{prefix}FunctionalReadyOffline", 0),
            "paidDelivered": row.get("paidDelivered", 0),
            "semanticMutations": a85["runtime"]["denominators"]["semanticMutations"],
            "mutationKilled": a85["runtime"]["denominators"]["mutationKilled"],
            "productionBrowserAssets": 0,
            "serverEntitlementAssets": 0,
            "rightsApprovedAssets": 0,
        }
    if product == "real-markets":
        return {**tier_row(a86["readiness"], tier), "instrumentDenominator": 583, "rightsApproved": 0, "productionBrowserVerified": 0}
    if product in {"angel", "risk"}:
        packets = [p for p in a88_runtime.get("packets", []) if p.get("surface") == product and p.get("tier") == tier]
        return {
            "syntheticCasesForSurfaceTier": len(packets),
            "syntheticCasesTotal": a88_runtime["denominators"]["cases"],
            "locales": a88_runtime["denominators"]["locales"],
            "families": a88_runtime["denominators"]["families"],
            "mutationKilled": a88_runtime["denominators"]["mutationKilled"],
            "decisionMismatches": a88_runtime["invariants"]["decisionMismatches"],
            "realModelExecutions": 0,
            "customerDecisionUtilityLabels": 0,
            "independentAdjudications": 0,
        }
    if product in {"whale-watch", "market-impact"}:
        check = next(row for row in a87["checks"] if row["id"] == "runtime:readiness")
        key = "whale_watch" if product == "whale-watch" else "market_impact"
        row = check["detail"]["runtime"][key][tier]
        return {**row, "activeAssets": 318, "rightsApproved": 0, "realizedExecutionValidated": False, "productionBrowserAssets": 0}
    raise KeyError(product)


OUT.mkdir(parents=True, exist_ok=True)
now = datetime.now(timezone.utc).isoformat()
receipts: list[dict[str, Any]] = []
product_summary: dict[str, dict[str, Any]] = {}

for definition_path in sorted(P31.glob("*.json")):
    definition = json.loads(definition_path.read_text(encoding="utf-8"))
    profile_id = definition["profileId"]
    product = definition["product"]
    tier = definition["tier"]
    evidence_path, evidence_doc = sources[product]
    browser_blocked = product == "browser"
    state = "BLOCKED_BROWSER_EXECUTION_NOT_RUN" if browser_blocked else "EXECUTED_INTERNAL_FIXTURE_REGRESSION"
    credit = "NO_RUNTIME_EXECUTION_CREDIT" if browser_blocked else "INTERNAL_STRUCTURAL_FIXTURE_REGRESSION_ONLY"
    metrics = evidence_for(product, tier)
    receipt = {
        "schemaVersion": "velmere.p32.profile-execution-receipt.v1",
        "generatedAt": now,
        "profileId": profile_id,
        "product": product,
        "tier": tier,
        "definitionPath": definition_path.relative_to(ROOT).as_posix(),
        "definitionSha256": definition["definitionSha256"],
        "definitionFileSha256": sha256_file(definition_path),
        "sameInputGroup": definition["sameInputGroup"],
        "executionState": state,
        "creditClass": credit,
        "evidenceReceiptPath": evidence_path,
        "evidenceReceiptSha256": sha256_file(ROOT / evidence_path),
        "evidenceState": evidence_doc.get("state") or evidence_doc.get("status"),
        "structuralMetrics": metrics,
        "finalHoldoutState": "NOT_FROZEN",
        "finalHoldoutExecution": "NOT_RUN",
        "rawCustomerOutputArchive": "NOT_PRODUCED_FOR_FINAL_CAMPAIGN",
        "publicCustomerOutputArchive": "NOT_PRODUCED_FOR_FINAL_CAMPAIGN",
        "noveltyDelta": "NOT_MEASURED",
        "duplicationDelta": "NOT_MEASURED",
        "decisionChange": "NOT_MEASURED",
        "groundTruthAccuracy": "NOT_MEASURED_ON_FINAL_HOLDOUT",
        "customerValueCredit": False,
        "realCustomerCredit": False,
        "externalReviewCredit": False,
        "providerRightsCredit": False,
        "paidTierCredit": False,
        "productionBuildCredit": False,
        "saleCredit": False,
        "limitations": [
            "This receipt records current-byte internal fixture/regression execution only.",
            "It is not the immutable final holdout and does not close novelty, duplication, decision-change, willingness-to-pay or refund-risk.",
            "It grants no real-customer, independent-review, provider-rights, paid-tier, LIVE, sale or production-build credit.",
        ] if not browser_blocked else [
            "No production/customer browser journey was executed.",
            "PDF generation/raster QA cannot be aliased to Browser runtime execution.",
            "No final holdout, customer-value, paid-tier, LIVE, sale or production-build credit is granted.",
        ],
    }
    receipt["receiptSha256"] = canonical_sha({k: v for k, v in receipt.items() if k != "receiptSha256"})
    out_path = OUT / f"{profile_id}.json"
    out_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    receipts.append(receipt)
    product_summary.setdefault(product, {})[tier] = {
        "executionState": state,
        "creditClass": credit,
        "structuralMetrics": metrics,
        "receiptPath": out_path.relative_to(ROOT).as_posix(),
        "receiptSha256": sha256_file(out_path),
    }

executed = sum(r["executionState"] == "EXECUTED_INTERNAL_FIXTURE_REGRESSION" for r in receipts)
blocked = sum(r["executionState"].startswith("BLOCKED") for r in receipts)
manifest = {
    "schemaVersion": "velmere.p32.profile-execution-manifest.v1",
    "generatedAt": now,
    "profileCount": len(receipts),
    "executedInternalFixtureRegression": executed,
    "blocked": blocked,
    "notRun": len(receipts) - executed - blocked,
    "finalHoldoutsFrozen": 0,
    "finalHoldoutsExecuted": 0,
    "customerValueProfilesClosed": 0,
    "paidProfilesClosed": 0,
    "saleProfilesClosed": 0,
    "state": "PARTIAL_INTERNAL_FIXTURE_EXECUTION_NO_FINAL_HOLDOUT_OR_CUSTOMER_VALUE_CREDIT",
    "receipts": [
        {
            "profileId": r["profileId"],
            "executionState": r["executionState"],
            "definitionSha256": r["definitionSha256"],
            "receiptPath": f"artifacts/closure/p32/profile-executions/{r['profileId']}.json",
            "receiptSha256": sha256_file(OUT / f"{r['profileId']}.json"),
        }
        for r in receipts
    ],
    "truthBoundary": "30/33 profiles have current-byte internal synthetic/fixture regression evidence; Browser remains 0/3. This is not the frozen final same-input tier campaign and grants zero customer-value, rights, paid, sale, LIVE or world-class credit.",
}
manifest["integritySha256"] = canonical_sha({k: v for k, v in manifest.items() if k != "integritySha256"})
MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

summary = {
    "schemaVersion": "velmere.p32.same-input-structural-fixture-summary.v1",
    "generatedAt": now,
    "state": "STRUCTURAL_FIXTURE_DELTA_ONLY_NOT_FINAL_VALUE_CAMPAIGN",
    "products": product_summary,
    "profileCounts": {
        "total": len(receipts),
        "executedInternalFixtureRegression": executed,
        "blockedBrowser": blocked,
        "finalHoldoutsFrozen": 0,
        "finalHoldoutsExecuted": 0,
    },
    "metricsNotYetClosed": [
        "NEW_FACT", "NEW_EVIDENCE", "NEW_REASONING", "NEW_ACTION", "NEW_WORKFLOW",
        "REPHRASE", "DUPLICATE", "decision-change", "ground-truth accuracy on final holdout",
        "blinded customer utility", "willingness-to-pay", "refund-risk", "latency/cost on production runtime",
    ],
    "hardBoundary": "Structural readiness/coverage is not paid-tier value. A larger fixture output, page count or offline-ready row count cannot justify price without final same-input novelty, truth, decision and customer evidence.",
}
summary["integritySha256"] = canonical_sha({k: v for k, v in summary.items() if k != "integritySha256"})
SUMMARY.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print(json.dumps({
    "profileCount": len(receipts),
    "executedInternalFixtureRegression": executed,
    "blocked": blocked,
    "manifest": MANIFEST.relative_to(ROOT).as_posix(),
    "summary": SUMMARY.relative_to(ROOT).as_posix(),
}, ensure_ascii=False, indent=2))
