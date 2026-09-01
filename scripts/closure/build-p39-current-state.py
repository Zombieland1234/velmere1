#!/usr/bin/env python3
"""Build P39 V16 status, authority, ledger and handoff manifest."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "artifacts/closure/p39"
V16 = ROOT / "docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V16_FULL_TOPOLOGY_FREE_LEGAL_CURRENT_WORLD_CLASS_2026-08-14.txt"
V15 = ROOT / "docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V15_FREE_LEGAL_TOP_WORLD_2026-08-13.txt"
SOURCE_IDENTITY = ART / "source-identity.json"
TOPOLOGY_POLICY = ROOT / "config/p39/p39-v16-authority-topology-policy.json"
TOPOLOGY = ROOT / "config/p39/p39-v16-product-topology-reconciliation.json"
CONTINUITY = ROOT / "config/p39/p39-v15-to-v16-continuity-audit.json"
EXACT_RUNTIME = ART / "P39_V16_AUTHORITY_TOPOLOGY_EXACT_NODE24_LINUX.json"
DEPENDENCY = ART / "P39_EXACT_TOOLCHAIN_AND_DEPENDENCY_BASELINE.json"
FIXTURE_CAMPAIGN = ART / "P39_EXACT_NODE_24_18_0_LINUX_FIXTURE_CAMPAIGN.json"
OUTPUT_RIGHTS_BASELINE = ART / "P39_CURRENT_OUTPUT_AND_SOURCE_RIGHTS_BASELINE.json"
P38_CAS = ROOT / "artifacts/closure/p38/P38_CURRENT_LOCKFILE_LOCAL_CAS_RECOVERY.json"
P38_NODE = ROOT / "artifacts/closure/p38/P38_NODE_MAJOR_DIFFERENTIAL.json"
STATUS = ART / "P39_STATUS.json"
AUTHORITY = ART / "CURRENT_AUTHORITY_P39.json"
LEDGER = ART / "VELMERE_CURRENT_STATE_AND_PASS_DELTA_LEDGER_P39_V16_2026-08-14.txt"
HANDOFF = ART / "P39_HANDOFF_MANIFEST.json"
REVISION = "P39_V16_AUTHORITY_TOPOLOGY_AND_EXACT_NODE24_LINUX_RECONCILIATION"
GENERATED_STATUS = "2026-08-14T05:32:00.000Z"
GENERATED_AUTHORITY = "2026-08-14T05:33:00.000Z"
GENERATED_HANDOFF = "2026-08-14T05:34:00.000Z"
EXPECTED_V16 = "67816a5a9238668c8080a3a8cc623f078d268c1b78fddf534cb4893bb45490e9"
EXPECTED_V15 = "5cfbbfcbcef7242e30466f18bab3ad29cad859e485a909a4ee8658fb65e2f2c0"
P38_SOURCE_AGGREGATE = "8f14ed39fca6017998350b1a7a359f573f73e6772757d0e9473cf93d551ba6ab"


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


def write_integrity_json(path: Path, payload: dict[str, Any]) -> None:
    payload["integritySha256"] = integrity(payload)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def load(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise RuntimeError(f"json_object_required:{path}")
    return value


def file_binding(path: Path) -> dict[str, Any]:
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "byteLength": path.stat().st_size,
        "sha256": sha256_file(path),
    }


def table(headers: list[str], rows: list[list[str]]) -> str:
    def clean(value: str) -> str:
        return str(value).replace("\n", " ").replace("|", "/")
    lines = ["| " + " | ".join(map(clean, headers)) + " |", "|" + "|".join("---" for _ in headers) + "|"]
    lines.extend("| " + " | ".join(map(clean, row)) + " |" for row in rows)
    return "\n".join(lines)


def main() -> int:
    ART.mkdir(parents=True, exist_ok=True)
    if sha256_file(V16) != EXPECTED_V16 or sha256_file(V15) != EXPECTED_V15:
        raise RuntimeError("owner_authority_hash_mismatch")

    source = load(SOURCE_IDENTITY)
    topology = load(TOPOLOGY)
    policy = load(TOPOLOGY_POLICY)
    continuity = load(CONTINUITY)
    runtime = load(EXACT_RUNTIME)
    dependency = load(DEPENDENCY)
    fixture_campaign = load(FIXTURE_CAMPAIGN)
    output_rights = load(OUTPUT_RIGHTS_BASELINE)
    p38_cas = load(P38_CAS)
    p38_node = load(P38_NODE)

    denominators = topology["denominators"]
    if denominators["customerFacingRows"] != 17 or denominators["internalExecutionProfiles"] != 33:
        raise RuntimeError("v16_topology_denominator_invalid")
    if runtime["runtime"]["nodeVersion"] != "v24.18.0" or runtime["runtime"]["npmVersion"] != "11.16.0":
        raise RuntimeError("exact_runtime_receipt_invalid")
    if dependency["currentLock"]["sha256"] != "e228adec08801e454ef5559a20f302110b4896a307c364195716218a376c48bb":
        raise RuntimeError("dependency_baseline_lock_invalid")
    if dependency["executedLinuxRuntime"]["node"]["observedVersion"] != "24.18.0" or dependency["executedLinuxRuntime"]["npm"]["observedVersion"] != "11.16.0":
        raise RuntimeError("dependency_baseline_runtime_invalid")
    if dependency["acquiredWindowsRuntimeArtifact"]["acquired"] is not True or dependency["acquiredWindowsRuntimeArtifact"]["executed"] is not False:
        raise RuntimeError("windows_artifact_boundary_invalid")
    offline = dependency["offlineNpmCiAttempt"]
    if offline["npmCiCompleted"] is not False or offline["dependencyClosure"] is not False or offline["parsedFailure"]["errorCode"] != "ENOTCACHED":
        raise RuntimeError("dependency_baseline_false_credit_or_failure_drift")
    fixture_runtime = fixture_campaign.get("runtime", {})
    fixture_summary = fixture_campaign.get("summary", {})
    fixture_credit = fixture_campaign.get("credit", {})
    if fixture_campaign.get("state") != "IMPLEMENTED_AND_TESTED_INTERNAL_EXACT_NODE_LINUX_FIXTURE_CAMPAIGN":
        raise RuntimeError("fixture_campaign_state_invalid")
    if fixture_runtime.get("nodeVersion") != "24.18.0" or fixture_runtime.get("platform") != "linux" or fixture_runtime.get("architecture") != "x86_64":
        raise RuntimeError("fixture_campaign_runtime_invalid")
    if fixture_runtime.get("exactNode24180Executed") is not True or fixture_runtime.get("exactWindowsExecuted") is not False:
        raise RuntimeError("fixture_campaign_runtime_credit_boundary_invalid")
    expected_fixture_summary = {
        "families": 6,
        "exactNodeFamiliesPassed": "6/6",
        "p38Node24LineReceiptParity": "6/6",
        "p38Node24LineRuntimeParity": "6/6",
        "canonicalProtectedPathsUnchanged": "13/13",
    }
    if any(fixture_summary.get(key) != value for key, value in expected_fixture_summary.items()):
        raise RuntimeError("fixture_campaign_summary_invalid")
    if fixture_credit.get("exactNode24180LinuxFixtureExecution") is not True or fixture_credit.get("isolatedFamilyExecution") is not True or fixture_credit.get("p38Node24LineByteParity") is not True:
        raise RuntimeError("fixture_campaign_positive_credit_missing")
    for key in ("exactWindows", "dependencyClosure", "typecheckOrBuild", "browserOrPdf", "currentCustomerOutput", "customerValue", "sourceRights", "goInternal", "goPaid", "live", "worldClassProven"):
        if fixture_credit.get(key) is not False:
            raise RuntimeError(f"fixture_campaign_false_promotion:{key}")
    output_denominators = output_rights.get("denominators", {})
    if output_denominators.get("familiesWithSourceEntrypointsPresent") != "11/11" or output_denominators.get("customerFacingRowsMappedToSource") != "17/17":
        raise RuntimeError("all_product_output_rights_baseline_denominator_invalid")
    if output_denominators.get("customerFacingRowsPhysicallyExecutedCurrentV16") != "0/17" or output_rights.get("credit", {}).get("fieldLevelSourceRights") is not False:
        raise RuntimeError("all_product_output_rights_false_credit")

    status: dict[str, Any] = {
        "schemaVersion": "velmere.p39.status.v1",
        "revision": REVISION,
        "generatedAt": GENERATED_STATUS,
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "releaseState": "NO_GO",
        "parentRoot": "R44P46",
        "parentCheckpoint": "P38_V15_CURRENT_LOCKFILE_CAS_RECOVERY_AND_NODE24_DIFFERENTIAL",
        "ownerDirective": file_binding(V16),
        "previousAuthorityRetainedHistorically": file_binding(V15),
        "sourceIdentity": {
            "fileCount": source["fileCount"],
            "payloadBytes": source["payloadBytes"],
            "pathSetSha256": source["pathSetSha256"],
            "sourceAggregateSha256": source["sourceAggregateSha256"],
            "publicPems": source["publicPemPolicy"]["allowedPublicPemCount"],
        },
        "completedThisPass": {
            "v16CopiedByteForByte": True,
            "v16Sha256": EXPECTED_V16,
            "v15ContinuityAudit": continuity["result"],
            "v16TextAmended": False,
            "productFamiliesReconciled": "11/11",
            "customerFacingRowsReconciled": "17/17",
            "internalExecutionProfilesDefined": "33/33",
            "contextTransitionsClassified": "22/22",
            "catalogRequiredDeltaTransitions": "6/22",
            "notApplicableNoPaidDeltaClaimTransitions": "16/22",
            "saleEligibilityDenominatorCorrected": "17_REAL_CUSTOMER_ROWS_ONLY",
            "exactNode24180Linux": True,
            "exactNpm11160Linux": True,
            "exactWindowsArtifactAcquired": True,
            "exactWindowsArtifactIntegrityPass": True,
            "exactWindowsArtifactExecuted": False,
            "offlineNpmCiAttempt": "EXECUTED_FAIL_CLOSED",
            "offlineNpmCiExitCode": offline["exitCode"],
            "offlineNpmCiFailureCode": offline["parsedFailure"]["errorCode"],
            "offlineNpmCiFirstMissingUrl": offline["parsedFailure"]["firstMissingOrFailedUrl"],
            "currentLockRemotePackageRows": dependency["currentLock"]["remotePackageRows"],
            "currentLockUniqueRemoteUrls": dependency["currentLock"]["uniqueRemoteUrls"],
            "dependencyClosure": False,
            "exactRuntimeCampaignRounds": "2/2",
            "exactNode24180LinuxFixtureFamilies": fixture_summary["exactNodeFamiliesPassed"],
            "p38Node24LineFixtureReceiptParity": fixture_summary["p38Node24LineReceiptParity"],
            "p38Node24LineFixtureRuntimeParity": fixture_summary["p38Node24LineRuntimeParity"],
            "fixtureCanonicalProtectedPathsUnchanged": fixture_summary["canonicalProtectedPathsUnchanged"],
            "topologyVerifier": "32/32",
            "availabilityMatrixVerifier": "32/32",
            "availabilityContractProfilesEvaluated": "33/33",
            "availabilityCustomerRowsEvaluated": "17/17",
            "currentSaleEligibleRows": "0/17",
            "allProductStaticOutputRightsBaselineStarted": True,
            "familiesWithSourceEntrypointsMapped": output_denominators["familiesWithSourceEntrypointsPresent"],
            "customerRowsMappedToSourceEntrypoints": output_denominators["customerFacingRowsMappedToSource"],
            "customerRowsPhysicallyExecutedCurrentV16": output_denominators["customerFacingRowsPhysicallyExecutedCurrentV16"],
            "currentTermsReverified": output_denominators["currentSourceTermsReverified"],
            "v16FieldLevelRightsRowsPassed": output_denominators["v16FieldLevelRightsRowsPassed"],
        },
        "inheritedCurrentEvidence": {
            "p38CurrentLockExactCasCoverage": p38_cas["combinedExactCoverage"],
            "p38CurrentLockRemaining": p38_cas["remainingUncovered"],
            "p38Node22FixtureFamilies": p38_node["summary"]["node22Passed"],
            "p38Node24LineFixtureFamilies": p38_node["summary"]["node24LinePassed"],
            "p38EvidenceClass": "HISTORICAL_CURRENT_PARENT_EVIDENCE_NOT_RERUN_P39",
        },
        "runtimeBoundary": {
            "requiredNode": "24.18.0",
            "requiredNpm": "11.16.0",
            "requiredFinalPlatformByV16": "Windows",
            "exactLinuxNodeExecuted": True,
            "exactLinuxNpmExecuted": True,
            "exactWindowsArtifactAcquired": True,
            "exactWindowsArtifactIntegrityPass": True,
            "exactWindowsExecuted": False,
            "dependencyClosure": False,
            "offlineNpmCiExecuted": True,
            "offlineNpmCiExitCode": offline["exitCode"],
            "offlineNpmCiFailureCode": offline["parsedFailure"]["errorCode"],
            "offlineNpmCiFirstMissingUrl": offline["parsedFailure"]["firstMissingOrFailedUrl"],
            "exactNodeFixtureCampaignFamilies": fixture_summary["exactNodeFamiliesPassed"],
            "exactNodeFixtureCampaignP38ByteParity": {
                "receipt": fixture_summary["p38Node24LineReceiptParity"],
                "runtime": fixture_summary["p38Node24LineRuntimeParity"],
            },
            "fullTypecheckExecutedThisPass": False,
            "fullLintExecutedThisPass": False,
            "webpackBuildExecutedThisPass": False,
            "turbopackBuildExecutedThisPass": False,
            "browserExecutedThisPass": False,
            "pdfCorpusReplayedThisPass": False,
        },
        "denominators": {
            "canonicalAuthorityWorkingBinding": "1/1",
            "customerFacingRowsMapped": "17/17",
            "internalProfilesDefined": "33/33",
            "availabilityContractProfilesEvaluated": "33/33",
            "sourceEntrypointFamiliesMapped": output_denominators["familiesWithSourceEntrypointsPresent"],
            "customerRowsMappedToSource": output_denominators["customerFacingRowsMappedToSource"],
            "physicalCurrentProductOutputsExecuted": "0/33",
            "customerFacingOutputsAudited": "0/17",
            "contextTransitionsClassified": "22/22",
            "requiredDeltaTransitionsValuePassed": "0/6",
            "standaloneNoPaidDeltaClaimTransitions": "16/16_NA",
            "fieldLevelLegalSourceRows": "0/CURRENT_PROMISED_FIELD_DENOMINATOR_NOT_YET_FROZEN",
            "exactNode24180Linux": "1/1",
            "exactWindowsArtifactIntegrity": "1/1_ACQUIRED_NOT_EXECUTED",
            "exactWindowsFinal": "0/1",
            "dependencyClosure": "0/1",
            "exactNode24180LinuxFixtureFamilies": fixture_summary["exactNodeFamiliesPassed"],
            "p38Node24LineFixtureByteParity": "6/6_RECEIPTS_AND_6/6_RUNTIME",
            "browserDistinctSkuExecutions": "0/3",
            "pdfIndependentReplay": "0/1",
            "releaseConvergenceRounds": "0/3",
            "saleEligibleCustomerRows": "0/17",
            "finalAiValidation": "NOT_STARTED",
            "realExternalProof": "0/DEFINED_EXTERNAL_DENOMINATOR_PENDING_PILOT_PLAN",
        },
        "releaseDecision": {
            "goInternal": False,
            "finalAiValidationReady": False,
            "pilotReady": False,
            "goPaid": False,
            "saleEnabled": False,
            "live": False,
            "worldClassProven": False,
        },
        "openRequiredForGoInternal": [
            "EXACT_WINDOWS_NODE_24_18_0_NPM_11_16_0_EXECUTION",
            "REMAINING_594_CURRENT_LOCK_PATHS_AND_EXACT_DEPENDENCY_CLOSURE",
            "FULL_TYPECHECK_LINT_WEBPACK_TURBOPACK",
            "THREE_PHYSICAL_BROWSER_SKU_EXECUTIONS",
            "PDF_INDEPENDENT_REPLAY_AND_PREVIEW_DOWNLOAD_BYTE_PARITY",
            "ALL_11_FAMILY_33_CONTEXT_CURRENT_OUTPUT_CAPTURE",
            "FIELD_LEVEL_FREE_LEGAL_CURRENT_SOURCE_REGISTRY",
            "MATCHED_INPUT_GROUND_TRUTH_AND_FINAL_HOLDOUTS",
            "SIX_REQUIRED_PAID_DELTA_TRANSITIONS_MATERIAL_VALUE_PASS",
            "SECURITY_PRIVACY_ACCESSIBILITY_I18N_SUPPLY_CHAIN_OPERATIONS",
            "THREE_CLEAN_RELEASE_CONVERGENCE_ROUNDS",
        ],
        "truthBoundary": (
            "P39 binds exact V16 bytes in working source, corrects the topology to 11 families/17 customer rows/33 internal contexts, classifies 6 required paid transitions and 16 N/A standalone transitions, physically executes the bounded authority/topology/availability contracts twice under exact Node 24.18.0 and npm 11.16.0 on linux-x64, executes six isolated deterministic fixture families under exact Node 24.18.0 with 6/6 P38 Node-24-line receipt and runtime byte parity, verifies the exact Linux and Windows toolcache artifact bytes, and performs a network-forbidden isolated npm ci baseline. "
            "It also maps static source entrypoints for all 11 families and all 17 customer-facing rows and inventories legacy fail-closed provider/freshness evidence. The fixture campaign is bounded internal evidence only. The Windows artifact is acquired but not executed; npm ci fails closed on the first uncached current-lock tarball; customer rows are not physically executed and current field-level terms are not reverified, so dependency closure, full builds, Browser, PDF, current product output bytes, source-rights coverage, ground truth, customer value and release convergence remain open."
        ),
    }
    write_integrity_json(STATUS, status)

    authority: dict[str, Any] = {
        "schemaVersion": "velmere.p39.current-authority.v1",
        "revision": REVISION,
        "generatedAt": GENERATED_AUTHORITY,
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "parent": {
            "root": "R44P46",
            "checkpoint": "P38_V15_CURRENT_LOCKFILE_CAS_RECOVERY_AND_NODE24_DIFFERENTIAL",
            "sourceAggregateSha256": P38_SOURCE_AGGREGATE,
        },
        "currentCheckpoint": REVISION,
        "authorityFiles": {
            "ownerDirectiveV16": file_binding(V16),
            "previousOwnerDirectiveV15Historical": file_binding(V15),
            "currentStateLedger": None,
        },
        "currentSource": file_binding(SOURCE_IDENTITY),
        "currentStatus": file_binding(STATUS),
        "evidenceBindings": {
            "authorityTopologyPolicy": file_binding(TOPOLOGY_POLICY),
            "productTopologyReconciliation": file_binding(TOPOLOGY),
            "v15ToV16ContinuityAudit": file_binding(CONTINUITY),
            "exactNode24LinuxAuthorityTopology": file_binding(EXACT_RUNTIME),
            "exactToolchainAndDependencyBaseline": file_binding(DEPENDENCY),
            "exactNode24180LinuxFixtureCampaign": file_binding(FIXTURE_CAMPAIGN),
            "allProductCurrentOutputAndSourceRightsBaseline": file_binding(OUTPUT_RIGHTS_BASELINE),
            "inheritedP38CurrentLockCas": file_binding(P38_CAS),
            "inheritedP38NodeDifferential": file_binding(P38_NODE),
        },
        "authorityRule": (
            "V16 is byte-bound in P39 working source and becomes the current bound authority when the P39 deterministic SOURCE_ONLY package passes clean unpack, 2/2 byte identity and CRC. V15, V14 and R12 remain historical. Parent root remains R44P46."
        ),
        "releaseDecision": status["releaseDecision"],
        "truthBoundary": status["truthBoundary"],
    }
    write_integrity_json(AUTHORITY, authority)

    customer_rows = topology["customerFacingRows"]
    profiles = topology["internalExecutionProfiles"]
    transitions = topology["contextTransitions"]
    families = topology["productFamilies"]

    table0_rows = []
    for family in families:
        table0_rows.append([
            family["family"],
            family["customerFacingType"],
            str(len(family["customerFacingProductIds"])),
            "3",
            "YES" if family["deltaRequiredByCatalog"] else "NO_CURRENT_CATALOG_CLAIM",
            "YES",
            "P38 denominator ambiguity repaired",
            "P39 topology reconciliation",
        ])

    table1_rows = []
    for row in customer_rows:
        old = "0% (V15)" if row["tier"] is not None else "N/A (V15 compressed)"
        table1_rows.append([
            row["rowId"], old, "0% CURRENT_V16_OUTPUT_CREDIT", "0 pp / baseline reset",
            "SOURCE_ENTRYPOINT_MAPPED; EXACT_CUSTOMER_BYTES_NOT_CAPTURED", "NOT_SCORED_CURRENT_V16",
            "LEGACY_FAIL_CLOSED_ONLY; CURRENT_FIELD_RIGHTS_NOT_REVERIFIED", "physical output + rights + quality + value + release gates",
            "EXACT_WINDOWS/DEPS/OUTPUT", "false", "P39 topology/runtime receipt",
        ])

    table2_rows = []
    required_transition_lookup = {(item["family"], item["toContext"]): item for item in transitions}
    for profile in profiles:
        transition = required_transition_lookup.get((profile["family"], profile["context"]))
        if profile["context"] == "BASIC_CONTEXT":
            applicability = "BASELINE_VALUE_REQUIRED"
            value_result = "NOT_TESTED"
        elif transition and transition["deltaRequiredByCatalog"]:
            applicability = "DELTA_REQUIRED_BY_CATALOG"
            value_result = "0/6 GLOBAL_REQUIRED_TRANSITIONS_PASS"
        else:
            applicability = "NOT_APPLICABLE_NO_PAID_DELTA_CLAIM"
            value_result = "N/A_NOT_FAILURE"
        previous = "P37 working runtime mismatch" if profile["family"] in {"angel", "risk-indicator"} else "historical implementation unbound"
        table2_rows.append([
            profile["family"], profile["context"], previous,
            "AVAILABILITY_CONTRACT_EVALUATED_ONLY", "NO_CURRENT_PRODUCT_OUTPUT_BYTES/HASH",
            "NOT_TESTED_ON_PRODUCT_OUTPUT", applicability, value_result,
            "EXACT_NODE_LINUX_CONTRACT_ONLY; WINDOWS_PRODUCT_RUNTIME_OPEN", "P39 exact-runtime receipt",
        ])

    target_by_family = {
        "audit": "verified findings → exploitability/remediation → attack-path/team handoff",
        "pdf": "professional A4 → provenance/action depth → decision dossier/exact artifact",
        "browser": "reachable evidence view → deeper cross-check → interactive dossier/handoff",
        "shield": "honest risk screen with invariant facts",
        "shield-pro": "real investigator result, provenance, permissions",
        "shield-map": "meaningful sourced nodes/edges and confidence",
        "real-markets": "current/delayed market truth with venue/session/methodology",
        "market-impact": "transparent range/scenario model; no false precision",
        "whale-watch": "verified event, chain/block/finality, no identity overclaim",
        "angel": "bounded evidence-backed assistant with invariant truth/safety",
        "risk-indicator": "descriptive priority signal, method/confidence, no forecast claim",
    }
    table3_rows = []
    for family in families:
        fid = family["family"]
        table3_rows.append([
            fid,
            "Topology/availability contract and static source entrypoint mapped; physical output not captured",
            target_by_family[fid],
            "runtime/dependencies/output/rights/quality/value",
            "V16 topology/delta applicability repaired; static output-rights baseline started",
            "PASS bounded contract + source-entrypoint inventory",
            "capture exact current outputs after Windows/dependency/build closure",
        ])

    table4_rows = [[
        f"PROMISED_FIELDS/{family['family']}", family["family"], "LEGACY_PROVIDER_LEVEL_FAIL_CLOSED_ONLY",
        "0/22 legacy providers currently approved for display/commercial use; field-level V16 status undefined",
        "UNKNOWN_BLOCKED", "FAIL_CLOSED/UNAVAILABLE",
        "SOURCE_ENTRYPOINT_MAPPED_NOT_RUNTIME_EXECUTED", "IMMEDIATE_CURRENT_TERMS_REVERIFY",
        "PROMISED_FIELD_EXTRACTION_AND_FIELD_LEVEL_REGISTRY_OPEN",
    ] for family in families]

    table5_rows = [
        ["V16 exact authority bytes", "0/1 candidate", "1/1 working-source bound", "+1", "final package condition", "CURRENT_SOURCE_AUTHORITY_BINDING"],
        ["V15→V16 continuity audit", "0/1", "1/1", "+1", "0", "IMPLEMENTED_AND_TESTED_INTERNAL"],
        ["Product families mapped", "5 compressed / 11 historical", "11/11", "topology corrected", "0", "IMPLEMENTED_AND_TESTED_INTERNAL"],
        ["Customer-facing rows mapped", "wrong 15-row closure framing", "17/17", "denominator corrected", "0", "IMPLEMENTED_AND_TESTED_INTERNAL"],
        ["Internal profiles defined", "33/33 ambiguously tiered", "33/33 contexts", "semantic correction", "0", "IMPLEMENTED_AND_TESTED_INTERNAL"],
        ["Transitions applicability", "0/22 V16", "22/22", "+22", "0", "IMPLEMENTED_AND_TESTED_INTERNAL"],
        ["Required paid deltas", "old 33-profile fail framing", "6 required / 16 N/A", "false failures removed", "6 value PASS remain", "IMPLEMENTED_POLICY_NOT_VALUE"],
        ["Exact Node 24.18.0 + npm 11.16.0 linux", "0/1 exact", "1/1; 2/2 rounds", "+1", "Windows still open", "IMPLEMENTED_AND_TESTED_INTERNAL_LINUX"],
        ["Exact Windows artifact integrity", "0/1", "1/1 acquired / not executed", "+1 artifact", "Windows execution", "CURRENT_TOOLCHAIN_EVIDENCE_NO_EXECUTION_CREDIT"],
        ["Exact Windows final runtime", "0/1", "0/1", "0", "1", "OPEN_REQUIRED_FOR_GO_INTERNAL"],
        ["Current-lock exact CAS", "67/661", "67/661 inherited", "0", "594", "P38_PARENT_EVIDENCE_NOT_RERUN"],
        ["Dependency closure / npm ci", "0 attempts current P39", "1 bounded offline attempt / 0 closure", "+1 diagnostic; +0 closure", "594 current-lock paths / Windows npm ci", "OPEN_REQUIRED_FOR_GO_INTERNAL"],
        ["Exact Node 24.18.0 fixture families", "6/6 P38 Node-24-line parent", "6/6 P39 exact Node; 6/6 receipt + 6/6 runtime byte parity", "current exact-runtime replay completed", "Windows/product-output execution still open", "IMPLEMENTED_AND_TESTED_INTERNAL_FIXTURE_ONLY"],
        ["All-product static output/rights baseline", "0/11 V16", "11/11 families and 17/17 customer rows mapped to source entrypoints", "+11 families / +17 rows mapping", "physical execution + promised-field extraction + current terms", "BASELINE_STARTED_NO_OUTPUT_OR_RIGHTS_CREDIT"],
        ["Availability contract profiles", "33/33 generic P36", "33/33 V16 semantics", "semantic correction", "0", "IMPLEMENTED_AND_TESTED_INTERNAL_CONTRACT"],
        ["Physical current product outputs", "6/33 working mismatch", "0/33 exact V16", "baseline reset", "33", "OPEN_REQUIRED_FOR_GO_INTERNAL"],
        ["Customer-facing output audits", "0/17 V16", "0/17", "0", "17", "OPEN_REQUIRED_FOR_GO_INTERNAL"],
        ["Required material delta transitions passed", "0/6 V16", "0/6", "0", "6", "OPEN_REQUIRED_FOR_GO_INTERNAL"],
        ["Legal source fields passed", "not frozen", "0/current denominator not frozen", "0", "all promised fields", "OPEN_REQUIRED_FOR_GO_INTERNAL"],
        ["Distinct Browser SKU executions", "0/3", "0/3", "0", "3", "OPEN_REQUIRED_FOR_GO_INTERNAL"],
        ["PDF independent replay", "0/1", "0/1", "0", "1", "OPEN_REQUIRED_FOR_GO_INTERNAL"],
        ["Release convergence rounds", "0/3", "0/3", "0", "3", "OPEN_REQUIRED_FOR_GO_INTERNAL"],
        ["Sale-eligible customer rows", "0/33 wrong denominator", "0/17 correct denominator", "denominator fixed", "17", "STOP_SELL"],
        ["FINAL_AI_VALIDATION", "not started", "not started", "0", "after internal closure", "DEFERRED_BY_V16_RULE"],
        ["REAL_EXTERNAL_PROOF", "0", "0", "0", "after AI closure", "DEFERRED_BY_V16_RULE"],
    ]

    ledger_text = f"""VELMÈRE — CURRENT STATE & PASS DELTA LEDGER
REVISION: {REVISION}
DATE: 14.08.2026
STATUS: CURRENT_SOURCE_ONLY_IN_PROGRESS / NO_GO
PARENT ROOT: R44P46
CURRENT AUTHORITY CANDIDATE: V16 exact SHA-256 {EXPECTED_V16}
PREVIOUS AUTHORITY: V15 historical SHA-256 {EXPECTED_V15}
CURRENT SOURCE: {source['fileCount']} files / {source['sourceAggregateSha256']}

SCORE BOUNDARY
P39 gives current credit for exact V16 binding, topology/denominator repair and a bounded exact
Node 24.18.0/npm 11.16.0 linux-x64 contract campaign, a 6/6 exact-Node isolated fixture-family replay
with P38 Node-24-line byte parity, exact Linux/Windows artifact integrity, and a network-forbidden
isolated npm ci diagnostic. It gives zero product-output, field-rights, ground-truth,
paid-value, Browser/PDF, Windows-execution, dependency-closure, GO_INTERNAL, sale or world-class credit.
"0% CURRENT V16 CREDIT" below does not mean the historical source contains no implementation;
it means no complete current product-output receipt was executed in this pass.

TABLE 0 — PRODUCT TOPOLOGY TRUTH
{table(['Family','Customer-facing type','Current SKU rows','Internal contexts','Delta required by catalog','Truth invariant','Current discrepancy','Evidence'], table0_rows)}

TABLE 1 — CUSTOMER-FACING CLOSURE, 17-ROW DENOMINATOR
{table(['Product/SKU','Previous %','Current %','Delta pp','Exact current output','Customer value today','Rights/freshness','Missing to 100','Hard blocker','Sale eligible','Evidence'], table1_rows)}

TABLE 2 — INTERNAL 33-PROFILE EXECUTION
{table(['Family','Context','Previous execution','Current execution','Exact bytes/hash','Truth consistency','Paid-delta applicability','Value result','Runtime match','Evidence'], table2_rows)}

TABLE 3 — CURRENT → TARGET → GAP
{table(['Family/SKU/context','CURRENT','TARGET','GAP','Action completed this pass','Test result','Next action'], table3_rows)}

TABLE 4 — DATA/RIGHTS/FRESHNESS
{table(['Field/source','Product','Rights state','Commercial/display/derived state','Freshness','Fallback','Current health','Reverify-by','Blocker'], table4_rows)}

TABLE 5 — GLOBAL DENOMINATORS
{table(['Metric','Previous','Current','Delta','Remaining','Credit class'], table5_rows)}

CANONICAL LAST FINAL HANDOFF
P38 / V15 / source aggregate {P38_SOURCE_AGGREGATE}.

CURRENT WORKING STATE
P39 binds V16 byte-for-byte, retains V15 historically, reconciles all 11 families into 17 real
customer-facing rows and 33 internal execution contexts, and corrects sale eligibility to 17 rows.
It classifies 22 context transitions: six Audit/PDF/Browser transitions require material paid value;
16 standalone transitions are NOT_APPLICABLE_NO_PAID_DELTA_CLAIM unless a current catalog claim
is later proven. V16 required no text amendment because the continuity audit found that it already
preserves or expands every material V15 control.

EXECUTION COVERAGE
- V16 exact bytes: 1/1 PASS.
- V15 historical bytes: 1/1 PASS.
- Topology definitions: 11/11 families, 17/17 customer rows, 33/33 internal profiles.
- Transition applicability: 22/22 classified; 6 required, 16 N/A.
- Exact linux runtime: Node 24.18.0 + npm 11.16.0, 2/2 bounded rounds.
- Exact Node 24.18.0 fixture campaign: 6/6 isolated families PASS; P38 Node-24-line parity 6/6 receipts and 6/6 runtime bytes; protected canonical paths 13/13 unchanged.
- Exact Windows workflow artifact: acquired and hash-verified; execution 0/1.
- Isolated network-forbidden npm ci: executed; fail-closed ENOTCACHED on zustand 4.5.7; dependency closure 0/1.
- Topology verifier: 32/32 PASS; availability-matrix verifier: 32/32 PASS.
- Availability contracts evaluated: 33/33 profiles and 17/17 customer rows, all sale fail-closed.
- Static all-product output/rights baseline: 11/11 families and 17/17 customer rows mapped to source entrypoints.
- Legacy provider rights baseline: 22/22 rows unverified; current P39 terms reverified 0/22; approved display/commercial rows 0.
- Physical current product-output executions: 0/33; exact customer-row output bytes 0/17.

QUALITY RESULTS
No product factual-accuracy, precision/recall, calibration, PDF parity or customer-comprehension
metric was executed in P39. Contract-test completeness must not be presented as product quality.

VALUE-PASSED DENOMINATOR
- Required catalog transitions: 0/6 current material-value PASS.
- Standalone no-paid-delta transitions: 16/16 correctly classified N/A, not PASS and not FAIL.
- Basic/standalone independent customer value: not yet current-output tested.

INTERNAL_PRODUCT_CLOSURE
0/17 customer-facing rows have a complete V16 current product-closure receipt. Historical
implementation remains visible separately and was not deleted or scored as current proof.

FINAL_AI_VALIDATION
NOT_STARTED. V16 requires the frozen internal closure candidate first.

REAL_EXTERNAL_PROOF
0 current external credit. AI personas are not real customers, lawyers or independent auditors.

RELEASE STATES
GO_INTERNAL=false | FINAL_AI_VALIDATION_READY=false | PILOT_READY=false | GO_PAID=false |
LIVE=false | WORLD_CLASS_PROVEN=false

PHYSICALLY CHANGED
1. Copied V16 byte-for-byte into current SOURCE_ONLY and bound its exact hash.
2. Kept V15 unchanged as historical authority; produced a V15→V16 continuity/omission audit.
3. Rebuilt canonical topology as 11 families, 17 customer rows and 33 internal contexts.
4. Added 22 explicit transition records with six required deltas and 16 N/A classifications.
5. Upgraded the availability matrix to schema v3 with a 17-row sale denominator.
6. Prevented standalone contexts from becoming invented saleable SKUs.
7. Executed the bounded campaign twice under exact Node 24.18.0/npm 11.16.0 on linux-x64.
8. Acquired and hash-verified the exact Windows Node 24.18.0 x64 workflow artifact without claiming execution.
9. Ran isolated offline npm ci against the exact current lock; it failed closed at the first uncached tarball and preserved canonical source.
10. Executed six deterministic internal fixture families under exact Node 24.18.0 in isolated worktrees and reproduced P38 Node-24-line receipt/runtime bytes 6/6.
11. Began the V16 all-product current-output/source-rights baseline by mapping source entrypoints for all 11 families and 17 customer rows while preserving zero current-output and field-rights credit.

TESTS PHYSICALLY RUN
- V16/V15 exact-byte authority checks: PASS.
- Topology build: 2/2 byte-identical bounded outputs.
- V16 topology verifier: 32/32 PASS in each round.
- V16 availability matrix test: 32/32 PASS in each round.
- Protected source immutability during runtime campaign: PASS.
- Exact Linux/Windows workflow artifact integrity checks: PASS.
- Isolated offline npm ci diagnostic: EXECUTED / expected fail-closed ENOTCACHED; canonical package and lock unchanged.
- Exact Node 24.18.0 isolated fixture-family campaign: 6/6 PASS; P38 receipt parity 6/6; runtime parity 6/6; no Windows/build/Browser/customer-output/value/rights credit.
- All-product static output/source-rights baseline builder: PASS (11/11 families, 17/17 rows mapped; 0/17 executed).
- P39 source-only receipt verifier: PASS.
- P39 source identity: {source['fileCount']}/{source['fileCount']} rows; aggregate {source['sourceAggregateSha256']}.

NOT PASSED / NOT EXECUTED
- Exact Windows execution (artifact acquired and verified only).
- Remaining 594 current-lock paths and successful npm ci/dependency closure; first current failure is zustand 4.5.7 ENOTCACHED.
- Full semantic TypeScript, ESLint, Webpack and Turbopack.
- Three physical Browser Basic/Pro/Advanced executions.
- PDF independent replay and exact preview/download/account bytes.
- Current output capture for all 11 families/33 contexts.
- Promised-field extraction, current terms re-verification and field-level free/legal/current rights registry (0/22 legacy provider terms reverified in P39).
- Ground truth, unseen holdouts and six material paid-delta validations.
- Security/privacy/accessibility/i18n/supply-chain/operations closure.
- Three clean release convergence rounds.

NEXT HIGHEST-VALUE TASK
Recover the remaining current-lock tarballs into a hash/SRI-verified local cache and obtain an executable
exact Windows Node 24.18.0/npm 11.16.0 environment. Rerun npm ci there, then full typecheck, lint,
Webpack and Turbopack before three physical Browser
SKU executions. In parallel only begin the all-product current-output/source-rights baseline; do not
add new customer-facing features.

HANDOFF HASH BOUNDARY
The final archive hash is appended only to the external ledger copy after deterministic packaging.
Embedding the ZIP hash inside the same ZIP would create circular mutation.
"""
    LEDGER.write_text(ledger_text, encoding="utf-8")

    authority = load(AUTHORITY)
    authority["authorityFiles"]["currentStateLedger"] = file_binding(LEDGER)
    authority.pop("integritySha256", None)
    write_integrity_json(AUTHORITY, authority)

    handoff: dict[str, Any] = {
        "schemaVersion": "velmere.p39.handoff-manifest.v1",
        "revision": REVISION,
        "generatedAt": GENERATED_HANDOFF,
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "requiredUserArtifacts": [
            file_binding(V16),
            file_binding(LEDGER),
            {
                "path": "VELMERE_R44P46_V16_P39_AUTHORITY_TOPOLOGY_EXACT_TOOLCHAIN_DEPENDENCY_BASELINE_CURRENT_SOURCE_ONLY_IN_PROGRESS.zip",
                "sha256": None,
                "status": "FINAL_HASH_RECORDED_IN_EXTERNAL_HANDOFF_LEDGER_AFTER_DETERMINISTIC_PACKAGE",
            },
        ],
        "currentAuthority": file_binding(AUTHORITY),
        "currentStatus": file_binding(STATUS),
        "rule": "Return exactly the unchanged V16 instruction, P39 current-state/pass-delta ledger, and newest complete P39 SOURCE_ONLY ZIP as the final link.",
        "releaseDecision": status["releaseDecision"],
        "selfHashBoundary": "The archive SHA cannot be embedded inside itself without circular mutation. The external ledger copy records the final ZIP hash.",
        "truthBoundary": status["truthBoundary"],
    }
    write_integrity_json(HANDOFF, handoff)

    print(json.dumps({
        "status": "PASS_P39_CURRENT_STATE_AUTHORITY_LEDGER_HANDOFF_BUILT",
        "sourceAggregateSha256": source["sourceAggregateSha256"],
        "v16Sha256": EXPECTED_V16,
        "statusSha256": sha256_file(STATUS),
        "authoritySha256": sha256_file(AUTHORITY),
        "ledgerSha256": sha256_file(LEDGER),
        "handoffSha256": sha256_file(HANDOFF),
        "topology": "17_ROWS_33_CONTEXTS_22_TRANSITIONS",
        "exactNodeLinux": "v24.18.0",
        "releaseState": "NO_GO",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
