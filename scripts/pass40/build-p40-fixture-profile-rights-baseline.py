#!/usr/bin/env python3
"""Build the P40 exact-fixture-profile binding and candidate field/rights baseline.

This pass deliberately distinguishes exact Node-bound internal fixture evidence from
customer-facing output, current data, field rights, value and release credit.
The generated config files are deterministic source inputs; artifact receipts are
non-circular closure evidence.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "artifacts/closure/p40"
PROFILE_DIR = ART / "internal-fixture-profile-bindings"
TOPOLOGY = ROOT / "config/p39/p39-v16-product-topology-reconciliation.json"
CAMPAIGN = ROOT / "artifacts/closure/p39/P39_EXACT_NODE_24_18_0_LINUX_FIXTURE_CAMPAIGN.json"
A83_RUNTIME = ROOT / "artifacts/pass36/a83/PASS36_A83_BROWSER_LENS_PDF_FIXTURE_RUNTIME.json"
A83_MANIFEST = ROOT / "artifacts/pass36/a83/PASS36_A83_BROWSER_LENS_PDF_CORPUS_MANIFEST.json"
A85_POLICY = ROOT / "config/pass36/a85-shield-pro-map-full-depth-policy.json"
A85_RECEIPT = ROOT / "config/pass36/a85-test-receipt.json"
SOURCE_IDENTITY = ART / "source-identity.json"

POLICY_OUT = ROOT / "config/p40/p40-fixture-profile-binding-policy.json"
REGISTRY_OUT = ROOT / "config/p40/p40-candidate-field-use-case-registry.json"
BASELINE_OUT = ART / "P40_EXACT_FIXTURE_PROFILE_AND_CANDIDATE_FIELD_BASELINE.json"

REVISION = "P40_V16_A85_CANONICAL_REPLAY_SOURCE_DIFFERENTIAL_FIXTURE_PROFILE_BASELINE"
GENERATED_AT = "2026-08-14T06:30:00.000Z"
V16_SHA = "67816a5a9238668c8080a3a8cc623f078d268c1b78fddf534cb4893bb45490e9"
P39_SOURCE_AGGREGATE = "f8caeb6d43dcc509d234d58c5e98780babe476755046fc6a92e13e2b44a79968"
A85_CURRENT_POLICY_SHA = "99d45a32efe55d4d630a6fcab42c3b4a47a5b54332ed6ddbb23b8af52653bc73"
A85_EXPECTED_RECEIPT_SHA = "f72de4db59f4c72202034decbd9c82716056e75295926b6e7fec0cbdef6e69ea"
A85_EXPECTED_RUNTIME_SHA = "551b34089a3f901b5919da3684b8bda199ca7d160acafca2e0606b2d210823de"

FAMILY_RUNTIME: dict[str, dict[str, str]] = {
    "audit": {
        "campaignFamily": "A82_AUDIT",
        "path": "artifacts/pass36/a82/PASS36_A82_FIXTURE_RUNTIME.json",
        "selector": "cases[].tiers[tier]",
    },
    "shield": {
        "campaignFamily": "A84_SHIELD",
        "path": "artifacts/pass36/a84/PASS36_A84_SHIELD_FULL_CATALOG_RUNTIME.json",
        "selector": "packets[tier]",
    },
    "shield-pro": {
        "campaignFamily": "A85_SHIELD_PRO_MAP",
        "path": "artifacts/pass36/a85/PASS36_A85_SHIELD_PRO_MAP_FULL_DEPTH_RUNTIME.json",
        "selector": "packets[tier].terminal+entitlement",
    },
    "shield-map": {
        "campaignFamily": "A85_SHIELD_PRO_MAP",
        "path": "artifacts/pass36/a85/PASS36_A85_SHIELD_PRO_MAP_FULL_DEPTH_RUNTIME.json",
        "selector": "packets[tier].map+entitlement",
    },
    "real-markets": {
        "campaignFamily": "A86_REAL_MARKETS",
        "path": "artifacts/pass36/a86/PASS36_A86_REAL_MARKETS_CROSS_ASSET_RUNTIME.json",
        "selector": "packets[tier]",
    },
    "market-impact": {
        "campaignFamily": "A87_MARKET_IMPACT_WHALE_WATCH",
        "path": "artifacts/pass36/a87/PASS36_A87_MARKET_IMPACT_WHALE_RUNTIME.json",
        "selector": "packets[surface=market_impact,tier]",
    },
    "whale-watch": {
        "campaignFamily": "A87_MARKET_IMPACT_WHALE_WATCH",
        "path": "artifacts/pass36/a87/PASS36_A87_MARKET_IMPACT_WHALE_RUNTIME.json",
        "selector": "packets[surface=whale_watch,tier]",
    },
    "angel": {
        "campaignFamily": "A88_BRAIN_ANGEL_RISK",
        "path": "artifacts/pass36/a88/PASS36_A88_BRAIN_ANGEL_RISK_EVAL_RUNTIME.json",
        "selector": "packets[surface=angel,tier]",
    },
    "risk-indicator": {
        "campaignFamily": "A88_BRAIN_ANGEL_RISK",
        "path": "artifacts/pass36/a88/PASS36_A88_BRAIN_ANGEL_RISK_EVAL_RUNTIME.json",
        "selector": "packets[surface=risk,tier]",
    },
}

CONTEXT_TO_TIER = {
    "BASIC_CONTEXT": "basic",
    "PRO_CONTEXT": "pro",
    "ADVANCED_CONTEXT": "advanced",
}


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def stable_bytes(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def stable_integrity(value: dict[str, Any]) -> str:
    clone = dict(value)
    clone.pop("integritySha256", None)
    return sha256_bytes(stable_bytes(clone))


def load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: dict[str, Any]) -> None:
    value["integritySha256"] = stable_integrity(value)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def bind(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise RuntimeError(f"required_file_missing:{path}")
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "byteLength": path.stat().st_size,
        "sha256": sha256_file(path),
    }


def campaign_result_map(campaign: dict[str, Any]) -> dict[str, dict[str, Any]]:
    rows: dict[str, dict[str, Any]] = {}
    for round_row in campaign.get("rounds", []):
        for result in round_row.get("results", []):
            family = result.get("family")
            if family and family not in rows:
                rows[family] = result
    if set(rows) != {item["campaignFamily"] for item in FAMILY_RUNTIME.values()}:
        raise RuntimeError(f"unexpected_campaign_family_set:{sorted(rows)}")
    return rows


def selected_outputs(family: str, tier: str, runtime: dict[str, Any]) -> list[Any]:
    if family == "audit":
        out: list[Any] = []
        for case in runtime["cases"]:
            match = next(row for row in case["tiers"] if row["tier"] == tier)
            out.append({
                "caseId": case["caseId"],
                "caseClass": case["caseClass"],
                "targetDigest": case["targetDigest"],
                "sourceBytecodeMatch": case["sourceBytecodeMatch"],
                "tierOutput": match,
            })
        return out
    packets = runtime.get("packets", [])
    if family == "shield":
        return [row for row in packets if row.get("tier") == tier]
    if family == "shield-pro":
        return [{
            "packetId": row["packetId"], "canonicalAssetId": row["canonicalAssetId"],
            "tier": row["tier"], "terminal": row["terminal"], "entitlement": row["entitlement"],
            "blockers": row["blockers"], "saleEnabled": row["saleEnabled"],
        } for row in packets if row.get("tier") == tier]
    if family == "shield-map":
        return [{
            "packetId": row["packetId"], "canonicalAssetId": row["canonicalAssetId"],
            "tier": row["tier"], "map": row["map"], "entitlement": row["entitlement"],
            "blockers": row["blockers"], "saleEnabled": row["saleEnabled"],
        } for row in packets if row.get("tier") == tier]
    if family == "real-markets":
        return [row for row in packets if row.get("tier") == tier]
    if family == "market-impact":
        return [row for row in packets if row.get("surface") == "market_impact" and row.get("tier") == tier]
    if family == "whale-watch":
        return [row for row in packets if row.get("surface") == "whale_watch" and row.get("tier") == tier]
    if family == "angel":
        return [row for row in packets if row.get("surface") == "angel" and row.get("tier") == tier]
    if family == "risk-indicator":
        return [row for row in packets if row.get("surface") == "risk" and row.get("tier") == tier]
    raise RuntimeError(f"unknown_family:{family}")


def unique_field_ids(packets: Iterable[dict[str, Any]]) -> list[str]:
    values: set[str] = set()
    for packet in packets:
        for row in packet.get("fields", []):
            field_id = row.get("fieldId")
            if isinstance(field_id, str):
                values.add(field_id)
    return sorted(values)


def nested_leaf_paths(value: Any, prefix: str = "") -> set[str]:
    out: set[str] = set()
    if isinstance(value, dict):
        for key in sorted(value):
            if key.lower().endswith(("sha256", "digest", "id")) or key in {
                "schemaVersion", "revisionId", "packetId", "caseId", "generatedAt",
                "liveProven", "saleEnabled", "paidGateEligible", "worldClassProven",
            }:
                continue
            child = f"{prefix}.{key}" if prefix else key
            out.update(nested_leaf_paths(value[key], child))
    elif isinstance(value, list):
        child = f"{prefix}[]"
        if value:
            for item in value[:3]:
                out.update(nested_leaf_paths(item, child))
        else:
            out.add(child)
    else:
        if prefix:
            out.add(prefix)
    return out


def candidate_fields(family: str, runtimes: dict[str, dict[str, Any]], a83_manifest: dict[str, Any]) -> list[str]:
    if family == "audit":
        case = runtimes["audit"]["cases"][0]
        tier = case["tiers"][0]
        base = nested_leaf_paths({"target": case["target"], "sourceBytecodeMatch": case["sourceBytecodeMatch"], "rights": case["rights"], "labels": case["labels"], "tier": tier})
        return sorted(base)
    if family in {"pdf", "browser"}:
        entry = a83_manifest["entries"][0]
        common = {
            "locale": entry["locale"], "tier": entry["tier"], "pageCount": entry["pageCount"],
            "sourceMode": entry["sourceMode"], "sourceConfidence": entry["sourceConfidence"],
            "projections": entry["projections"], "rightsApproved": entry["rightsApproved"],
            "browserExecuted": entry["browserExecuted"], "secureDeliveryExecuted": entry["secureDeliveryExecuted"],
            "accessibilityExternallyValidated": entry["accessibilityExternallyValidated"],
            "customerComprehensionLabels": entry["customerComprehensionLabels"],
        }
        prefix = "pdf" if family == "pdf" else "browser"
        return sorted(f"{prefix}.{path}" for path in nested_leaf_paths(common))
    runtime = runtimes[family]
    if family == "shield":
        fields = [f"fields.{field_id}" for field_id in unique_field_ids(runtime["packets"])]
        return sorted(set(fields) | {
            "decision", "requiredProviderFamilies", "observedProviderFamilies", "evidenceFamilyCount",
            "materialFieldCount", "blockers", "popupSections", "providerRightsApproved",
        })
    if family in {"shield-pro", "shield-map"}:
        packet = runtime["packets"][0]
        key = "terminal" if family == "shield-pro" else "map"
        fields = nested_leaf_paths({key: packet[key], "entitlement": packet["entitlement"], "blockers": packet["blockers"]})
        return sorted(fields)
    if family == "real-markets":
        fields = [f"fields.{field_id}" for field_id in unique_field_ids(runtime["packets"])]
        return sorted(set(fields) | {
            "providerFamilies", "evidenceFamilyCount", "materialFieldCount", "blockers",
            "analysisDecision", "deliveryDecision", "httpStatus", "corporateActionMeaning", "cryptoScope",
        })
    if family in {"market-impact", "whale-watch"}:
        surface = "market_impact" if family == "market-impact" else "whale_watch"
        packet = next(row for row in runtime["packets"] if row["surface"] == surface)
        return sorted(nested_leaf_paths({"evidence": packet["evidence"], "analysisDecision": packet["analysisDecision"], "deliveryDecision": packet["deliveryDecision"], "blockers": packet["blockers"]}))
    if family in {"angel", "risk-indicator"}:
        surface = "angel" if family == "angel" else "risk"
        packet = next(row for row in runtime["packets"] if row["surface"] == surface)
        subset = {key: packet.get(key) for key in (
            "decision", "promptSecurity", "sourceSecurity", "adviceBoundary", "inputBoundary",
            "evidenceState", "entitlementVerified", "addsFacts", "calibratedProbabilityPublished",
            "individualizedAdvicePublished", "legalConclusionPublished",
        )}
        return sorted(nested_leaf_paths(subset))
    raise RuntimeError(f"unknown_candidate_family:{family}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--prepare-only", action="store_true")
    args = parser.parse_args()

    topology = load(TOPOLOGY)
    campaign = load(CAMPAIGN)
    campaign_rows = campaign_result_map(campaign)
    a83_runtime = load(A83_RUNTIME)
    a83_manifest = load(A83_MANIFEST)

    if sha256_file(A85_POLICY) != A85_CURRENT_POLICY_SHA:
        raise RuntimeError("a85_current_policy_sha_mismatch")
    if sha256_file(A85_RECEIPT) != A85_EXPECTED_RECEIPT_SHA:
        raise RuntimeError("a85_current_receipt_sha_mismatch")
    if sha256_file(ROOT / FAMILY_RUNTIME["shield-pro"]["path"]) != A85_EXPECTED_RUNTIME_SHA:
        raise RuntimeError("a85_current_runtime_sha_mismatch")

    runtimes: dict[str, dict[str, Any]] = {}
    runtime_bindings: dict[str, dict[str, Any]] = {}
    for family, spec in FAMILY_RUNTIME.items():
        path = ROOT / spec["path"]
        runtimes[family] = load(path)
        campaign_row = campaign_rows[spec["campaignFamily"]]
        runtime_sha = sha256_file(path)
        if runtime_sha != campaign_row["runtimeSha256"]:
            raise RuntimeError(f"exact_node_runtime_hash_mismatch:{family}:{runtime_sha}:{campaign_row['runtimeSha256']}")
        runtime_bindings[family] = {
            "campaignFamily": spec["campaignFamily"],
            "runtime": bind(path),
            "exactNodeCampaignRuntimeSha256": campaign_row["runtimeSha256"],
            "exactNodeCampaignReceiptSha256": campaign_row["receiptSha256"],
            "selector": spec["selector"],
            "canonicalA85PolicyBound": family not in {"shield-pro", "shield-map"} or sha256_file(A85_POLICY) == A85_CURRENT_POLICY_SHA,
        }

    policy: dict[str, Any] = {
        "schemaVersion": "velmere.p40.fixture-profile-binding-policy.v1",
        "revision": REVISION,
        "generatedAt": GENERATED_AT,
        "state": "IMPLEMENTED_SOURCE_POLICY_FAIL_CLOSED",
        "releaseState": "NO_GO",
        "parentRoot": "R44P46",
        "authorityV16Sha256": V16_SHA,
        "parentP39SourceAggregateSha256": P39_SOURCE_AGGREGATE,
        "topology": {
            "productFamilies": 11,
            "customerFacingRows": 17,
            "internalProfiles": 33,
            "exactNodeBoundFixtureProfilesTarget": 27,
            "browserPdfOpenProfiles": 6,
        },
        "runtimeBindings": runtime_bindings,
        "browserPdfBoundary": {
            "a83Runtime": bind(A83_RUNTIME),
            "a83Manifest": bind(A83_MANIFEST),
            "manifestEntries": len(a83_manifest["entries"]),
            "historicalSyntheticPhysicalPdfs": a83_runtime["totals"]["physicalPdfs"],
            "currentP40IndependentReplay": False,
            "currentP40BrowserRuns": 0,
            "externalFontRequiredAndUnavailable": True,
            "profileCredit": "NO_CONTEXT_SPECIFIC_PHYSICAL_FIXTURE_OUTPUT",
        },
        "creditRules": {
            "exactNodeBoundInternalFixtureProfile": "Requires exact P39 Node 24.18.0 runtime hash parity and a deterministic family/context subset digest.",
            "customerOutput": "Never inferred from an internal fixture runtime.",
            "sourceRights": "Never inferred from source presence or fixture provider names.",
            "materialValue": "Never inferred from field count or context execution.",
            "release": "Requires exact Windows/dependency/build/Browser/PDF and all V16 gates.",
        },
        "truthBoundary": "P40 may bind exact Node 24.18.0 internal fixture runtime bytes to individual V16 execution contexts. It must not call those receipts customer outputs, current data, rights approval, material value, Browser/PDF closure, GO_INTERNAL or sale readiness.",
    }
    write_json(POLICY_OUT, policy)

    registry_rows: list[dict[str, Any]] = []
    all_families = [row["family"] for row in topology["productFamilies"]]
    for family in all_families:
        source_artifact = A83_MANIFEST if family in {"pdf", "browser"} else ROOT / FAMILY_RUNTIME[family]["path"]
        fields = candidate_fields(family, runtimes, a83_manifest)
        for field_name in fields:
            registry_rows.append({
                "registryRowId": f"{family}:{field_name}",
                "sourceId": f"INTERNAL_FIXTURE_SCHEMA_{family.upper().replace('-', '_')}",
                "ownerOperator": "VELMERE_INTERNAL_FIXTURE_PIPELINE",
                "jurisdiction": "NOT_APPLICABLE_INTERNAL_FIXTURE",
                "officialDomain": None,
                "endpointMethod": source_artifact.relative_to(ROOT).as_posix(),
                "productFamily": family,
                "customerFieldCandidate": field_name,
                "promisedFieldState": "DISCOVERED_FROM_INTERNAL_FIXTURE_SCHEMA_NOT_CONFIRMED_CUSTOMER_PROMISE",
                "rawOrDerived": "UNADJUDICATED_CANDIDATE",
                "criticality": "UNCLASSIFIED",
                "requiredOrOptional": "UNCLASSIFIED",
                "licenseOrTermsUrl": None,
                "licenseOrTermsVersion": None,
                "termsCheckedAt": None,
                "termsEvidenceSha256": None,
                "commercialUseAllowed": False,
                "displayAllowed": False,
                "derivedUseAllowed": False,
                "rawRedistributionAllowed": False,
                "cacheAllowed": False,
                "retentionAllowed": False,
                "attributionRequired": None,
                "databaseRightsState": "NOT_REVIEWED",
                "copyrightState": "NOT_REVIEWED",
                "personalDataState": "NOT_REVIEWED",
                "specialCategoryDataState": "NOT_REVIEWED",
                "geographicRestrictions": "NOT_REVIEWED",
                "rateLimit": None,
                "fairUsePolicy": None,
                "observationFreshnessTarget": None,
                "staleAfter": None,
                "fallbackSource": None,
                "parserVersion": None,
                "parserTests": "INTERNAL_FIXTURE_ONLY",
                "currentHealth": "FIXTURE_INTERNAL_ONLY_NOT_CURRENT_SOURCE_OBSERVATION",
                "rightsStatus": "EXPIRED_REVERIFY_REQUIRED",
                "freshnessClass": "UNKNOWN_BLOCKED",
                "reverifyBy": "IMMEDIATE_BEFORE_CUSTOMER_OUTPUT_CREDIT",
                "evidenceSha256": sha256_file(source_artifact),
                "saleEligible": False,
                "notesAndNegativeEvidence": "Candidate denominator row only. No current terms, lawful display, current observation, customer visibility or sale credit.",
            })
    registry_rows.sort(key=lambda row: row["registryRowId"].encode("utf-8"))
    by_family: dict[str, int] = {}
    for row in registry_rows:
        by_family[row["productFamily"]] = by_family.get(row["productFamily"], 0) + 1
    registry: dict[str, Any] = {
        "schemaVersion": "velmere.p40.candidate-field-use-case-registry.v1",
        "revision": REVISION,
        "generatedAt": GENERATED_AT,
        "state": "CANDIDATE_DENOMINATOR_FROZEN_ZERO_RIGHTS_CREDIT",
        "releaseState": "NO_GO",
        "authorityV16Sha256": V16_SHA,
        "candidateRows": len(registry_rows),
        "candidateRowsByFamily": by_family,
        "promisedCustomerFieldsConfirmed": 0,
        "currentTermsReverified": 0,
        "rightsPassed": 0,
        "freshnessPassed": 0,
        "saleEligibleRows": 0,
        "rows": registry_rows,
        "truthBoundary": "This registry freezes candidate field/use-case rows discovered in internal fixture schemas. It is not the final promised-field registry and gives zero field-rights, freshness, customer-output or sale credit until each row is adjudicated against actual customer output and current terms evidence.",
    }
    write_json(REGISTRY_OUT, registry)

    if args.prepare_only:
        print(json.dumps({
            "status": "PASS_P40_PROFILE_POLICY_AND_CANDIDATE_REGISTRY_PREPARED",
            "candidateRows": len(registry_rows),
            "candidateRowsByFamily": by_family,
            "policySha256": sha256_file(POLICY_OUT),
            "registrySha256": sha256_file(REGISTRY_OUT),
        }, ensure_ascii=False))
        return 0

    source_identity = load(SOURCE_IDENTITY) if SOURCE_IDENTITY.is_file() else None
    PROFILE_DIR.mkdir(parents=True, exist_ok=True)
    for old in PROFILE_DIR.glob("*.json"):
        old.unlink()

    profile_rows: list[dict[str, Any]] = []
    for profile in topology["internalExecutionProfiles"]:
        family = profile["family"]
        context = profile["context"]
        tier = CONTEXT_TO_TIER[context]
        if family in FAMILY_RUNTIME:
            selected = selected_outputs(family, tier, runtimes[family])
            runtime_binding = runtime_bindings[family]
            receipt: dict[str, Any] = {
                "schemaVersion": "velmere.p40.internal-fixture-profile-binding.v1",
                "revision": REVISION,
                "generatedAt": GENERATED_AT,
                "profileId": profile["profileId"],
                "family": family,
                "context": context,
                "contextTier": tier,
                "executionClass": "EXACT_NODE_24_18_0_BOUND_INTERNAL_FIXTURE_PROFILE",
                "runtimeArtifact": runtime_binding["runtime"],
                "exactNodeCampaign": bind(CAMPAIGN),
                "exactNodeCampaignFamily": runtime_binding["campaignFamily"],
                "exactNodeCampaignReceiptSha256": runtime_binding["exactNodeCampaignReceiptSha256"],
                "selectedOutputCount": len(selected),
                "selectedOutputCanonicalSha256": sha256_bytes(stable_bytes(selected)),
                "selector": runtime_binding["selector"],
                "truthConsistencyTestRequired": True,
                "truthConsistencyResult": "NOT_ADJUDICATED_AS_CUSTOMER_OUTPUT",
                "paidDeltaApplicability": "DELTA_REQUIRED_BY_CATALOG" if profile["deltaRequiredByCatalog"] else ("BASELINE_VALUE_REQUIRED" if context == "BASIC_CONTEXT" else "NOT_APPLICABLE_NO_PAID_DELTA_CLAIM"),
                "materialValueResult": "NOT_TESTED",
                "sourceRightsResult": "NOT_TESTED",
                "customerOutputResult": "NOT_TESTED",
                "currentDataResult": "FIXTURE_INTERNAL_ONLY",
                "saleEligible": False,
                "credit": {
                    "internalExecutionProfileBound": True,
                    "exactNodeRuntimeArtifactBound": True,
                    "customerOutput": False,
                    "currentData": False,
                    "fieldRights": False,
                    "materialValue": False,
                    "browserOrPdf": False,
                    "goInternal": False,
                    "sale": False,
                },
                "truthBoundary": "This receipt binds a V16 context to exact Node 24.18.0 internal fixture runtime bytes and a deterministic selected-output digest. It does not prove current customer output, current external data, rights, value, Browser/PDF, release or sale readiness.",
            }
        else:
            entries = [row for row in a83_manifest["entries"] if row["tier"] == tier]
            receipt = {
                "schemaVersion": "velmere.p40.internal-fixture-profile-binding.v1",
                "revision": REVISION,
                "generatedAt": GENERATED_AT,
                "profileId": profile["profileId"],
                "family": family,
                "context": context,
                "contextTier": tier,
                "executionClass": "NO_CONTEXT_SPECIFIC_PHYSICAL_FIXTURE_OUTPUT",
                "a83Manifest": bind(A83_MANIFEST),
                "historicalManifestEntryCountForTier": len(entries),
                "historicalManifestTierSubsetSha256": sha256_bytes(stable_bytes(entries)),
                "physicalCorpusIncluded": False,
                "independentReplayP40": False,
                "browserExecutionP40": False,
                "externalFontRequiredAndUnavailable": True,
                "paidDeltaApplicability": "DELTA_REQUIRED_BY_CATALOG",
                "materialValueResult": "NOT_TESTED",
                "sourceRightsResult": "NOT_TESTED",
                "customerOutputResult": "NOT_TESTED",
                "currentDataResult": "NOT_TESTED",
                "saleEligible": False,
                "credit": {
                    "internalExecutionProfileBound": False,
                    "historicalManifestBoundDiagnosticOnly": True,
                    "customerOutput": False,
                    "currentData": False,
                    "fieldRights": False,
                    "materialValue": False,
                    "browserOrPdf": False,
                    "goInternal": False,
                    "sale": False,
                },
                "truthBoundary": "The A83 manifest is bound only as historical synthetic diagnostic evidence. The physical PDF corpus is excluded, the required external font is unavailable, and no current Browser execution exists. No P40 profile-execution, PDF, Browser, customer-output, value or sale credit is granted.",
            }
        receipt["sourceIdentityBinding"] = None if source_identity is None else {
            "path": SOURCE_IDENTITY.relative_to(ROOT).as_posix(),
            "sourceAggregateSha256": source_identity["sourceAggregateSha256"],
        }
        filename = profile["profileId"].replace("@", "__").replace("-", "_") + ".json"
        write_json(PROFILE_DIR / filename, receipt)
        profile_rows.append({
            "profileId": profile["profileId"],
            "family": family,
            "context": context,
            "executionClass": receipt["executionClass"],
            "selectedOutputCount": receipt.get("selectedOutputCount", 0),
            "profileReceiptPath": (PROFILE_DIR / filename).relative_to(ROOT).as_posix(),
            "profileReceiptSha256": sha256_file(PROFILE_DIR / filename),
            "saleEligible": False,
        })

    exact_bound = sum(row["executionClass"] == "EXACT_NODE_24_18_0_BOUND_INTERNAL_FIXTURE_PROFILE" for row in profile_rows)
    open_profiles = len(profile_rows) - exact_bound
    baseline: dict[str, Any] = {
        "schemaVersion": "velmere.p40.exact-fixture-profile-candidate-field-baseline.v1",
        "revision": REVISION,
        "generatedAt": GENERATED_AT,
        "state": "IMPLEMENTED_AND_TESTED_INTERNAL_FIXTURE_PROFILE_BASELINE",
        "releaseState": "NO_GO",
        "parentRoot": "R44P46",
        "authorityV16Sha256": V16_SHA,
        "sourceIdentity": None if source_identity is None else bind(SOURCE_IDENTITY),
        "inputs": {
            "topology": bind(TOPOLOGY),
            "exactNodeCampaign": bind(CAMPAIGN),
            "profileBindingPolicy": bind(POLICY_OUT),
            "candidateFieldRegistry": bind(REGISTRY_OUT),
            "a83Runtime": bind(A83_RUNTIME),
            "a83Manifest": bind(A83_MANIFEST),
            "a85CanonicalPolicy": bind(A85_POLICY),
            "a85CanonicalReceipt": bind(A85_RECEIPT),
        },
        "denominators": {
            "productFamilies": "11/11",
            "customerFacingRows": "17/17_STATIC_SOURCE_MAPPING_ONLY",
            "internalProfilesDefined": "33/33",
            "exactNodeBoundInternalFixtureProfiles": f"{exact_bound}/33",
            "browserPdfProfilesWithoutPhysicalCurrentExecution": f"{open_profiles}/33",
            "candidateFieldRowsFrozen": len(registry_rows),
            "candidateFieldRightsPassed": f"0/{len(registry_rows)}",
            "candidateFieldFreshnessPassed": f"0/{len(registry_rows)}",
            "currentCustomerOutputs": "0/17",
            "saleEligibleCustomerRows": "0/17",
        },
        "profileRows": profile_rows,
        "candidateRowsByFamily": by_family,
        "credit": {
            "exactNodeBoundInternalFixtureProfiles": exact_bound,
            "candidateFieldDenominatorFrozen": True,
            "currentCustomerOutput": False,
            "promisedFieldConfirmation": False,
            "fieldRights": False,
            "freshness": False,
            "factualQuality": False,
            "materialValue": False,
            "browser": False,
            "pdf": False,
            "goInternal": False,
            "goPaid": False,
            "live": False,
            "worldClassProven": False,
        },
        "truthBoundary": "P40 maps 27 of 33 V16 internal contexts to exact Node 24.18.0 internal fixture runtime bytes and freezes a fail-closed candidate field/use-case denominator. PDF and Browser remain without current physical context execution. Candidate rows are not confirmed customer promises and all rights/freshness/customer-output/value/sale gates remain zero.",
    }
    write_json(BASELINE_OUT, baseline)
    print(json.dumps({
        "status": "PASS_P40_EXACT_FIXTURE_PROFILE_AND_CANDIDATE_FIELD_BASELINE",
        "exactNodeBoundProfiles": f"{exact_bound}/33",
        "browserPdfOpenProfiles": f"{open_profiles}/33",
        "candidateFieldRows": len(registry_rows),
        "rightsPassed": f"0/{len(registry_rows)}",
        "currentCustomerOutputs": "0/17",
        "saleEligible": "0/17",
        "receiptSha256": sha256_file(BASELINE_OUT),
        "releaseState": "NO_GO",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
