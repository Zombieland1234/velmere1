#!/usr/bin/env python3
"""Build the first V16 all-product current-output and source-rights baseline.

This is a static source-entrypoint/legacy-rights inventory only. It deliberately
records zero current customer-output bytes and zero V16 field-level rights credit
until physical executions and field-by-field terms receipts exist.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "artifacts/closure/p39/P39_CURRENT_OUTPUT_AND_SOURCE_RIGHTS_BASELINE.json"
RECON = ROOT / "config/p39/p39-v16-product-topology-reconciliation.json"
LEGACY_RIGHTS = ROOT / "config/pass21/provider-commercial-rights-registry.json"
OFFICIAL_MATRIX = ROOT / "config/pass36/a102r44p18-official-provider-rights-decision-matrix.json"
FRESHNESS = ROOT / "config/velmere-live-data-freshness.policy.json"
REVISION = "P39_V16_AUTHORITY_TOPOLOGY_AND_EXACT_NODE24_LINUX_RECONCILIATION"
GENERATED_AT = "2026-08-14T05:55:00.000Z"

ENTRYPOINTS: dict[str, list[str]] = {
    "audit": ["app/[locale]/security/audits/page.tsx", "app/api/security/audit-watch/report/route.ts"],
    "pdf": ["app/api/security/audit-watch/pro-pdf/route.ts", "lib/security/pro-audit-pdf/render-pro-audit-pdf.ts"],
    "browser": ["app/[locale]/browser/page.tsx"],
    "shield": ["app/[locale]/shield/page.tsx", "components/market-integrity/AssetDetailModal.tsx"],
    "shield-pro": ["app/[locale]/shield-pro/page.tsx", "components/market-integrity/ShieldProCleanTerminalClient.tsx"],
    "shield-map": ["app/[locale]/shield-map/page.tsx", "components/market-integrity/ShieldMapCommandClient.tsx"],
    "real-markets": ["app/[locale]/real-markets/page.tsx", "app/api/market-integrity/real-markets/[operation]/route.ts"],
    "market-impact": ["components/market-integrity/AssetIntelligenceTabs.tsx", "lib/market-integrity/market-impact-engine.ts"],
    "whale-watch": ["components/market-integrity/AssetIntelligenceTabs.tsx", "lib/market-integrity/whale-watch-engine.ts"],
    "angel": ["app/api/angel/route.ts", "components/angel/AngelPanel.tsx"],
    "risk-indicator": ["lib/market-integrity/risk-engine.ts", "lib/market-integrity/risk-indicator-customer-truth.ts"],
}


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def stable(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: stable(value[key]) for key in sorted(value)}
    if isinstance(value, list):
        return [stable(item) for item in value]
    return value


def integrity(value: dict[str, Any]) -> str:
    return sha256_bytes(json.dumps(stable(value), ensure_ascii=False, separators=(",", ":")).encode("utf-8"))


def bind(relative: str) -> dict[str, Any]:
    path = ROOT / relative
    if not path.is_file():
        raise RuntimeError(f"required_source_entrypoint_missing:{relative}")
    return {"path": relative, "byteLength": path.stat().st_size, "sha256": sha256_file(path)}


def main() -> int:
    for path in (RECON, LEGACY_RIGHTS, OFFICIAL_MATRIX, FRESHNESS):
        if not path.is_file():
            raise RuntimeError(f"required_baseline_input_missing:{path}")
    reconciliation = json.loads(RECON.read_text(encoding="utf-8"))
    legacy = json.loads(LEGACY_RIGHTS.read_text(encoding="utf-8"))
    official = json.loads(OFFICIAL_MATRIX.read_text(encoding="utf-8"))
    freshness = json.loads(FRESHNESS.read_text(encoding="utf-8"))

    families = reconciliation["productFamilies"]
    customer_rows = reconciliation["customerFacingRows"]
    if len(families) != 11 or len(customer_rows) != 17 or set(ENTRYPOINTS) != {row["family"] for row in families}:
        raise RuntimeError("v16_topology_entrypoint_family_set_mismatch")

    family_rows = []
    for family in families:
        family_id = family["family"]
        entrypoints = [bind(value) for value in ENTRYPOINTS[family_id]]
        row_ids = [row["rowId"] for row in customer_rows if row["family"] == family_id]
        family_rows.append({
            "family": family_id,
            "displayName": family["displayName"],
            "customerFacingType": family["customerFacingType"],
            "customerFacingRows": row_ids,
            "entrypoints": entrypoints,
            "reachableSourceEntryPointState": "SOURCE_PRESENT_NOT_RUNTIME_EXECUTED_CURRENT_V16",
            "exactCustomerOutputBytesCaptured": 0,
            "exactCustomerOutputRowsExpected": len(row_ids),
            "currentOutputTruthAuditState": "NOT_EXECUTED_CURRENT_V16",
            "promisedFieldInventoryState": "NOT_EXTRACTED_CURRENT_V16",
            "fieldLevelRightsRowsPassed": 0,
            "fieldLevelRightsDenominator": None,
            "sourceFreshnessExecutionState": "NOT_EXECUTED_CURRENT_V16",
            "saleEligibility": False,
            "nextAction": "Execute the current customer-facing row(s), hash exact bytes, extract every promised field, then bind each field to current rights/freshness evidence.",
        })

    legacy_providers = legacy.get("providers", [])
    official_providers = official.get("providers", [])
    result: dict[str, Any] = {
        "schemaVersion": "velmere.p39.current-output-source-rights-baseline.v1",
        "revision": REVISION,
        "generatedAt": GENERATED_AT,
        "state": "BASELINE_STARTED_NO_CURRENT_OUTPUT_OR_FIELD_RIGHTS_CREDIT",
        "releaseState": "NO_GO",
        "parentRoot": "R44P46",
        "inputs": {
            "topologyReconciliation": bind(RECON.relative_to(ROOT).as_posix()),
            "legacyProviderRegistry": bind(LEGACY_RIGHTS.relative_to(ROOT).as_posix()),
            "officialProviderDecisionMatrix": bind(OFFICIAL_MATRIX.relative_to(ROOT).as_posix()),
            "legacyFreshnessPolicy": bind(FRESHNESS.relative_to(ROOT).as_posix()),
        },
        "families": family_rows,
        "legacyRightsState": {
            "providerRows": len(legacy_providers),
            "unverifiedProviderRows": sum(1 for row in legacy_providers if row.get("rightsState") == "UNVERIFIED"),
            "officialProviderRowsReviewedHistorically": len(official_providers),
            "officialProviderRowsApproved": sum(1 for row in official_providers if row.get("legalApprovalStatus") == "APPROVED"),
            "historicalCustomerDisplayAllowedProviders": official.get("globalTruthBoundary", {}).get("customerDisplayAllowedProviders", 0),
            "historicalCommercialUseAllowedProviders": official.get("globalTruthBoundary", {}).get("commercialUseAllowedProviders", 0),
            "v16FieldLevelRegistryImplemented": False,
            "currentTermsReverifiedForP39": 0,
            "currentRightsCredit": 0,
            "classification": "LEGACY_PROVIDER_LEVEL_FAIL_CLOSED_EVIDENCE_ONLY",
        },
        "legacyFreshnessState": {
            "sourceClasses": len(freshness.get("sourceClasses", [])),
            "currentP39RuntimeExecuted": False,
            "v16ObservationRetrievalProcessingAgeContractVerified": False,
            "currentFreshnessCredit": 0,
        },
        "denominators": {
            "familiesWithSourceEntrypointsPresent": "11/11",
            "customerFacingRowsMappedToSource": "17/17",
            "customerFacingRowsPhysicallyExecutedCurrentV16": "0/17",
            "exactCustomerOutputBytesCaptured": "0/17",
            "internalContextsPhysicallyExecutedAsCustomerOutputs": "0/33",
            "promisedFieldInventoriesCompleted": "0/17",
            "v16FieldLevelRightsRowsPassed": "0/NOT_YET_DEFINED",
            "currentSourceTermsReverified": "0/22_LEGACY_PROVIDER_ROWS",
            "saleEligibleCustomerRows": "0/17",
        },
        "credit": {
            "allProductStaticBaselineStarted": True,
            "sourceEntrypointInventory": True,
            "currentCustomerOutputExecution": False,
            "exactOutputBytes": False,
            "fieldLevelSourceRights": False,
            "freshnessRuntime": False,
            "materialValue": False,
            "saleEligibility": False,
            "goInternal": False,
            "goPaid": False,
            "worldClassProven": False,
        },
        "truthBoundary": (
            "P39 mapped source entrypoints for all 11 V16 families and all 17 customer-facing rows and inventoried legacy fail-closed provider/freshness evidence. It did not execute the customer rows, capture exact customer bytes, extract promised fields, reverify current terms, or create V16 field-level rights receipts. No current output, source-rights, value, sale, GO_INTERNAL, GO_PAID, LIVE or WORLD_CLASS_PROVEN credit is granted."
        ),
    }
    result["integritySha256"] = integrity(result)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": "PASS_P39_ALL_PRODUCT_STATIC_OUTPUT_RIGHTS_BASELINE",
        "families": "11/11",
        "customerRowsMapped": "17/17",
        "currentOutputsExecuted": "0/17",
        "legacyRightsApproved": "0/22",
        "v16FieldRights": "0/NOT_YET_DEFINED",
        "receiptSha256": sha256_file(OUTPUT),
        "releaseState": "NO_GO",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
