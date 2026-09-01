#!/usr/bin/env python3
"""Source-only verifier for P39 V16 authority/topology/exact-runtime receipts."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
V16 = ROOT / "docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V16_FULL_TOPOLOGY_FREE_LEGAL_CURRENT_WORLD_CLASS_2026-08-14.txt"
V15 = ROOT / "docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V15_FREE_LEGAL_TOP_WORLD_2026-08-13.txt"
POLICY = ROOT / "config/p39/p39-v16-authority-topology-policy.json"
RECONCILIATION = ROOT / "config/p39/p39-v16-product-topology-reconciliation.json"
CONTINUITY = ROOT / "config/p39/p39-v15-to-v16-continuity-audit.json"
RUNTIME = ROOT / "artifacts/closure/p39/P39_V16_AUTHORITY_TOPOLOGY_EXACT_NODE24_LINUX.json"
DEPENDENCY = ROOT / "artifacts/closure/p39/P39_EXACT_TOOLCHAIN_AND_DEPENDENCY_BASELINE.json"
FIXTURE_CAMPAIGN = ROOT / "artifacts/closure/p39/P39_EXACT_NODE_24_18_0_LINUX_FIXTURE_CAMPAIGN.json"
OUTPUT_RIGHTS_BASELINE = ROOT / "artifacts/closure/p39/P39_CURRENT_OUTPUT_AND_SOURCE_RIGHTS_BASELINE.json"
DEPENDENCY_STDOUT = ROOT / "artifacts/closure/p39/dependency-baseline/npm-ci-offline.stdout.log"
DEPENDENCY_STDERR = ROOT / "artifacts/closure/p39/dependency-baseline/npm-ci-offline.stderr.log"
SOURCE_IDENTITY = ROOT / "artifacts/closure/p39/source-identity.json"
STATUS = ROOT / "artifacts/closure/p39/P39_STATUS.json"
AUTHORITY = ROOT / "artifacts/closure/p39/CURRENT_AUTHORITY_P39.json"
LEDGER = ROOT / "artifacts/closure/p39/VELMERE_CURRENT_STATE_AND_PASS_DELTA_LEDGER_P39_V16_2026-08-14.txt"
HANDOFF = ROOT / "artifacts/closure/p39/P39_HANDOFF_MANIFEST.json"
EXPECTED_V16 = "67816a5a9238668c8080a3a8cc623f078d268c1b78fddf534cb4893bb45490e9"
EXPECTED_V15 = "5cfbbfcbcef7242e30466f18bab3ad29cad859e485a909a4ee8658fb65e2f2c0"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


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


def verify_integrity(value: dict[str, Any], label: str) -> None:
    clone = dict(value)
    expected = clone.pop("integritySha256", None)
    observed = sha256_bytes(json.dumps(stable(clone), ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
    if expected != observed:
        raise RuntimeError(f"integrity_mismatch:{label}:{expected}:{observed}")


def load(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise RuntimeError(f"json_object_required:{path}")
    return value


def verify_binding(row: dict[str, Any], label: str) -> None:
    rel = row.get("path")
    if not isinstance(rel, str):
        raise RuntimeError(f"binding_path_missing:{label}")
    path = ROOT / rel
    if not path.is_file():
        raise RuntimeError(f"binding_file_missing:{label}:{rel}")
    if path.stat().st_size != row.get("byteLength") or sha256_file(path) != row.get("sha256"):
        raise RuntimeError(f"binding_mismatch:{label}:{rel}")


def verify_source_identity(value: dict[str, Any]) -> None:
    rows = value.get("files")
    if not isinstance(rows, list):
        raise RuntimeError("source_identity_files_missing")
    if value.get("fileCount") != len(rows):
        raise RuntimeError("source_identity_file_count_mismatch")
    paths: list[str] = []
    aggregate_parts: list[bytes] = []
    payload_bytes = 0
    for row in rows:
        if not isinstance(row, dict):
            raise RuntimeError("source_identity_row_invalid")
        verify_binding(row, f"source:{row.get('path')}")
        rel = row.get("path")
        if not isinstance(rel, str):
            raise RuntimeError("source_identity_path_invalid")
        paths.append(rel)
        payload_bytes += int(row.get("byteLength", -1))
        aggregate_parts.append(
            f'{rel}\0{row.get("byteLength")}\0{row.get("mode")}\0{row.get("sha256")}\n'.encode("utf-8")
        )
    if paths != sorted(paths, key=lambda item: item.encode("utf-8")):
        raise RuntimeError("source_identity_path_order_invalid")
    if len(set(path.casefold() for path in paths)) != len(paths):
        raise RuntimeError("source_identity_casefold_collision")
    if payload_bytes != value.get("payloadBytes"):
        raise RuntimeError("source_identity_payload_mismatch")
    path_set = sha256_bytes("\n".join(paths).encode("utf-8"))
    aggregate = sha256_bytes(b"".join(aggregate_parts))
    if path_set != value.get("pathSetSha256") or aggregate != value.get("sourceAggregateSha256"):
        raise RuntimeError("source_identity_aggregate_mismatch")
    authority = value.get("requiredAuthorityBinding")
    expected_path = V16.relative_to(ROOT).as_posix()
    if not isinstance(authority, dict) or authority.get("path") != expected_path or authority.get("sha256") != EXPECTED_V16:
        raise RuntimeError("source_identity_v16_binding_invalid")


def main() -> int:
    if sha256_file(V16) != EXPECTED_V16:
        raise RuntimeError("v16_hash_mismatch")
    if sha256_file(V15) != EXPECTED_V15:
        raise RuntimeError("v15_hash_mismatch")

    policy = load(POLICY)
    reconciliation = load(RECONCILIATION)
    continuity = load(CONTINUITY)
    runtime = load(RUNTIME)
    dependency = load(DEPENDENCY)
    fixture_campaign = load(FIXTURE_CAMPAIGN)
    output_rights = load(OUTPUT_RIGHTS_BASELINE)
    source_identity = load(SOURCE_IDENTITY)
    status = load(STATUS)
    authority = load(AUTHORITY)
    handoff = load(HANDOFF)
    for label, value in (
        ("policy", policy),
        ("reconciliation", reconciliation),
        ("continuity", continuity),
        ("runtime", runtime),
        ("dependency", dependency),
        ("fixture_campaign", fixture_campaign),
        ("output_rights", output_rights),
        ("status", status),
        ("authority", authority),
        ("handoff", handoff),
    ):
        verify_integrity(value, label)
    verify_source_identity(source_identity)

    denominators = reconciliation.get("denominators")
    expected_denominators = {
        "customerFacingRows": 17,
        "productFamilies": 11,
        "explicitlyTieredRows": 9,
        "standaloneRows": 8,
        "internalExecutionProfiles": 33,
        "contextTransitions": 22,
        "deltaRequiredTransitions": 6,
        "notApplicableNoPaidDeltaClaimTransitions": 16,
    }
    if not isinstance(denominators, dict):
        raise RuntimeError("reconciliation_denominators_missing")
    for key, expected in expected_denominators.items():
        if denominators.get(key) != expected:
            raise RuntimeError(f"denominator_mismatch:{key}:{denominators.get(key)}:{expected}")

    rows = reconciliation.get("customerFacingRows")
    profiles = reconciliation.get("internalExecutionProfiles")
    transitions = reconciliation.get("contextTransitions")
    if not isinstance(rows, list) or len(rows) != 17 or len({row.get("rowId") for row in rows}) != 17:
        raise RuntimeError("customer_rows_invalid")
    if not isinstance(profiles, list) or len(profiles) != 33 or len({row.get("profileId") for row in profiles}) != 33:
        raise RuntimeError("internal_profiles_invalid")
    if not isinstance(transitions, list) or len(transitions) != 22 or len({row.get("transitionId") for row in transitions}) != 22:
        raise RuntimeError("transitions_invalid")
    if sum(bool(row.get("deltaRequiredByCatalog")) for row in transitions) != 6:
        raise RuntimeError("required_transition_count_invalid")
    if sum(row.get("defaultValueResult") == "NOT_APPLICABLE_NO_PAID_DELTA_CLAIM" for row in transitions) != 16:
        raise RuntimeError("not_applicable_transition_count_invalid")
    for required_family in ("market-impact", "whale-watch", "shield-map", "angel", "risk-indicator"):
        if not any(row.get("rowId") == required_family for row in rows):
            raise RuntimeError(f"mandatory_family_missing:{required_family}")

    if continuity.get("result") != "V16_SUBSUMES_V15_NO_OWNER_DIRECTIVE_TEXT_AMENDMENT_REQUIRED":
        raise RuntimeError("continuity_assessment_invalid")
    if continuity.get("textChangesAppliedToV16") is not False:
        raise RuntimeError("v16_text_change_not_allowed")

    runtime_data = runtime.get("runtime")
    if not isinstance(runtime_data, dict):
        raise RuntimeError("runtime_data_missing")
    if runtime_data.get("nodeVersion") != "v24.18.0" or runtime_data.get("npmVersion") != "11.16.0":
        raise RuntimeError("exact_runtime_version_invalid")
    if runtime_data.get("platform") != "linux" or runtime_data.get("architecture") != "x64":
        raise RuntimeError("exact_runtime_platform_invalid")
    if runtime_data.get("exactLinuxExecuted") is not True or runtime_data.get("exactWindowsExecuted") is not False:
        raise RuntimeError("runtime_credit_boundary_invalid")
    repeatability = runtime.get("repeatability")
    if not isinstance(repeatability, dict):
        raise RuntimeError("repeatability_missing")
    if repeatability.get("rounds") != "2/2" or repeatability.get("generatedConfigByteIdentity") is not True or repeatability.get("protectedSourceUnchanged") is not True:
        raise RuntimeError("repeatability_invalid")
    parity = repeatability.get("executionStdoutStderrByteParity")
    if not isinstance(parity, dict) or set(parity) != {"topologyBuild", "topologyVerify", "availabilityMatrix"} or not all(parity.values()):
        raise RuntimeError("execution_parity_invalid")

    for label, row in runtime.get("sourceBindingsBeforeAndAfter", {}).items():
        if not isinstance(row, dict):
            raise RuntimeError(f"source_binding_invalid:{label}")
        verify_binding(row, label)
    for label, row in runtime.get("generatedConfigBindings", {}).items():
        if not isinstance(row, dict):
            raise RuntimeError(f"config_binding_invalid:{label}")
        verify_binding(row, label)

    results = runtime.get("results")
    expected_results = {
        "customerFacingRows": "17/17",
        "productFamilies": "11/11",
        "internalExecutionProfilesDefined": "33/33",
        "transitionsClassified": "22/22",
        "deltaRequiredTransitions": "6/22",
        "notApplicableNoPaidDeltaClaimTransitions": "16/22",
        "availabilityMatrixExecutionProfiles": "33/33",
        "availabilityMatrixSaleDenominator": "17/17",
        "saleEligibleCustomerRows": "0/17",
        "topologyVerifierChecks": "32/32",
        "availabilityMatrixChecks": "32/32",
    }
    if not isinstance(results, dict):
        raise RuntimeError("runtime_results_missing")
    for key, expected in expected_results.items():
        if results.get(key) != expected:
            raise RuntimeError(f"runtime_result_mismatch:{key}:{results.get(key)}:{expected}")

    credit = runtime.get("credit")
    if not isinstance(credit, dict):
        raise RuntimeError("runtime_credit_missing")
    forbidden_true = (
        "exactWindows", "dependencyClosure", "typecheck", "lint", "webpackBuild", "turbopackBuild",
        "browser", "pdfReplay", "currentCustomerOutputs", "sourceRights", "materialValue",
        "goInternal", "goPaid", "live", "worldClassProven",
    )
    if any(credit.get(key) is not False for key in forbidden_true):
        raise RuntimeError("runtime_false_promotion")

    current_lock = dependency.get("currentLock")
    if not isinstance(current_lock, dict):
        raise RuntimeError("dependency_current_lock_missing")
    if current_lock.get("sha256") != "e228adec08801e454ef5559a20f302110b4896a307c364195716218a376c48bb":
        raise RuntimeError("dependency_current_lock_hash_invalid")
    if current_lock.get("remotePackageRows") != 661 or current_lock.get("uniqueRemoteUrls") != 618:
        raise RuntimeError("dependency_current_lock_denominator_invalid")
    if sha256_file(ROOT / "package-lock.json") != current_lock.get("sha256"):
        raise RuntimeError("package_lock_bytes_drift")

    linux = dependency.get("executedLinuxRuntime")
    windows = dependency.get("acquiredWindowsRuntimeArtifact")
    offline = dependency.get("offlineNpmCiAttempt")
    gates = dependency.get("gates")
    if not all(isinstance(value, dict) for value in (linux, windows, offline, gates)):
        raise RuntimeError("dependency_baseline_sections_missing")
    if linux["node"].get("observedVersion") != "24.18.0" or linux["npm"].get("observedVersion") != "11.16.0":
        raise RuntimeError("dependency_exact_linux_runtime_invalid")
    if linux.get("executed") is not True:
        raise RuntimeError("dependency_linux_execution_missing")
    if windows.get("acquired") is not True or windows.get("executed") is not False:
        raise RuntimeError("dependency_windows_artifact_boundary_invalid")
    if windows.get("workflowZipIntegrityPass") is not True or windows.get("member", {}).get("integrityPass") is not True:
        raise RuntimeError("dependency_windows_artifact_integrity_invalid")
    if offline.get("exitCode") != 1 or offline.get("npmCiCompleted") is not False or offline.get("dependencyClosure") is not False:
        raise RuntimeError("dependency_offline_npm_ci_boundary_invalid")
    parsed = offline.get("parsedFailure")
    if not isinstance(parsed, dict) or parsed.get("errorCode") != "ENOTCACHED" or parsed.get("exactFailureClass") != "OFFLINE_CACHE_MISS":
        raise RuntimeError("dependency_offline_failure_invalid")
    if parsed.get("firstMissingOrFailedUrl") != "https://registry.npmjs.org/zustand/-/zustand-4.5.7.tgz":
        raise RuntimeError("dependency_first_missing_url_drift")
    if offline.get("canonicalNodeModulesBefore") is not False or offline.get("canonicalNodeModulesAfter") is not False:
        raise RuntimeError("canonical_node_modules_pollution")
    if offline.get("canonicalPackageJsonUnchanged") is not True or offline.get("canonicalPackageLockUnchanged") is not True:
        raise RuntimeError("canonical_package_or_lock_mutated")
    for key in ("exactWindowsExecuted", "dependencyClosure", "typecheckEligible", "lintEligible", "webpackBuildEligible", "turbopackBuildEligible", "browserEligible", "goInternal"):
        if gates.get(key) is not False:
            raise RuntimeError(f"dependency_false_promotion:{key}")
    for log_path, log_binding, label in (
        (DEPENDENCY_STDOUT, offline.get("stdout"), "dependency_stdout"),
        (DEPENDENCY_STDERR, offline.get("stderr"), "dependency_stderr"),
    ):
        if not isinstance(log_binding, dict):
            raise RuntimeError(f"dependency_log_binding_missing:{label}")
        if not log_path.is_file() or log_path.stat().st_size != log_binding.get("byteLength") or sha256_file(log_path) != log_binding.get("sha256"):
            raise RuntimeError(f"dependency_log_binding_mismatch:{label}")

    fixture_runtime = fixture_campaign.get("runtime")
    fixture_summary = fixture_campaign.get("summary")
    fixture_credit = fixture_campaign.get("credit")
    if fixture_campaign.get("state") != "IMPLEMENTED_AND_TESTED_INTERNAL_EXACT_NODE_LINUX_FIXTURE_CAMPAIGN":
        raise RuntimeError("fixture_campaign_state_invalid")
    if not all(isinstance(value, dict) for value in (fixture_runtime, fixture_summary, fixture_credit)):
        raise RuntimeError("fixture_campaign_shape_invalid")
    if fixture_runtime.get("nodeVersion") != "24.18.0" or fixture_runtime.get("platform") != "linux" or fixture_runtime.get("architecture") != "x86_64":
        raise RuntimeError("fixture_campaign_runtime_invalid")
    if fixture_runtime.get("exactNode24180Executed") is not True or fixture_runtime.get("exactWindowsExecuted") is not False:
        raise RuntimeError("fixture_campaign_runtime_boundary_invalid")
    expected_fixture_summary = {
        "families": 6,
        "exactNodeFamiliesPassed": "6/6",
        "p38Node24LineReceiptParity": "6/6",
        "p38Node24LineRuntimeParity": "6/6",
        "canonicalProtectedPathsUnchanged": "13/13",
    }
    for key, expected in expected_fixture_summary.items():
        if fixture_summary.get(key) != expected:
            raise RuntimeError(f"fixture_campaign_summary_mismatch:{key}:{fixture_summary.get(key)}:{expected}")
    if fixture_credit.get("exactNode24180LinuxFixtureExecution") is not True or fixture_credit.get("isolatedFamilyExecution") is not True or fixture_credit.get("p38Node24LineByteParity") is not True:
        raise RuntimeError("fixture_campaign_positive_credit_missing")
    for key in ("exactWindows", "dependencyClosure", "typecheckOrBuild", "browserOrPdf", "currentCustomerOutput", "customerValue", "sourceRights", "goInternal", "goPaid", "live", "worldClassProven"):
        if fixture_credit.get(key) is not False:
            raise RuntimeError(f"fixture_campaign_false_promotion:{key}")
    rounds = fixture_campaign.get("rounds")
    comparison = fixture_campaign.get("comparison")
    if not isinstance(rounds, list) or len(rounds) != 1 or rounds[0].get("familiesPassed") != "6/6":
        raise RuntimeError("fixture_campaign_round_invalid")
    if not isinstance(comparison, list) or len(comparison) != 6 or not all(row.get("exactNodePassed") is True and row.get("matchesP38Node24LineReceipt") is True and row.get("matchesP38Node24LineRuntime") is True for row in comparison):
        raise RuntimeError("fixture_campaign_comparison_invalid")

    output_denominators = output_rights.get("denominators")
    if not isinstance(output_denominators, dict):
        raise RuntimeError("output_rights_denominators_missing")
    expected_output_denominators = {
        "familiesWithSourceEntrypointsPresent": "11/11",
        "customerFacingRowsMappedToSource": "17/17",
        "customerFacingRowsPhysicallyExecutedCurrentV16": "0/17",
        "exactCustomerOutputBytesCaptured": "0/17",
        "internalContextsPhysicallyExecutedAsCustomerOutputs": "0/33",
        "promisedFieldInventoriesCompleted": "0/17",
        "v16FieldLevelRightsRowsPassed": "0/NOT_YET_DEFINED",
        "currentSourceTermsReverified": "0/22_LEGACY_PROVIDER_ROWS",
        "saleEligibleCustomerRows": "0/17",
    }
    for key, expected in expected_output_denominators.items():
        if output_denominators.get(key) != expected:
            raise RuntimeError(f"output_rights_denominator_mismatch:{key}:{output_denominators.get(key)}:{expected}")
    if output_rights.get("state") != "BASELINE_STARTED_NO_CURRENT_OUTPUT_OR_FIELD_RIGHTS_CREDIT":
        raise RuntimeError("output_rights_state_invalid")
    output_credit = output_rights.get("credit")
    if not isinstance(output_credit, dict) or output_credit.get("allProductStaticBaselineStarted") is not True or output_credit.get("sourceEntrypointInventory") is not True:
        raise RuntimeError("output_rights_baseline_credit_missing")
    for key in ("currentCustomerOutputExecution", "exactOutputBytes", "fieldLevelSourceRights", "freshnessRuntime", "materialValue", "saleEligibility", "goInternal", "goPaid", "worldClassProven"):
        if output_credit.get(key) is not False:
            raise RuntimeError(f"output_rights_false_promotion:{key}")
    families = output_rights.get("families")
    if not isinstance(families, list) or len(families) != 11:
        raise RuntimeError("output_rights_family_count_invalid")
    row_ids: set[str] = set()
    for family in families:
        if not isinstance(family, dict):
            raise RuntimeError("output_rights_family_invalid")
        for binding in family.get("entrypoints", []):
            if not isinstance(binding, dict):
                raise RuntimeError("output_rights_entrypoint_binding_invalid")
            verify_binding(binding, f"output_rights_entrypoint:{binding.get('path')}")
        row_ids.update(str(value) for value in family.get("customerFacingRows", []))
    if len(row_ids) != 17:
        raise RuntimeError("output_rights_customer_row_mapping_invalid")
    for key, binding in output_rights.get("inputs", {}).items():
        if not isinstance(binding, dict):
            raise RuntimeError(f"output_rights_input_binding_missing:{key}")
        verify_binding(binding, f"output_rights_input:{key}")

    decision = status.get("releaseDecision")
    if status.get("state") != "CURRENT_SOURCE_ONLY_IN_PROGRESS" or status.get("releaseState") != "NO_GO" or not isinstance(decision, dict):
        raise RuntimeError("status_release_boundary_invalid")
    if any(decision.get(key) is not False for key in ("goInternal", "finalAiValidationReady", "pilotReady", "goPaid", "saleEnabled", "live", "worldClassProven")):
        raise RuntimeError("status_false_release_promotion")
    completed = status.get("completedThisPass", {})
    if completed.get("exactNode24180LinuxFixtureFamilies") != "6/6" or completed.get("p38Node24LineFixtureReceiptParity") != "6/6" or completed.get("p38Node24LineFixtureRuntimeParity") != "6/6":
        raise RuntimeError("status_fixture_campaign_missing")
    runtime_boundary = status.get("runtimeBoundary", {})
    if runtime_boundary.get("offlineNpmCiExecuted") is not True or runtime_boundary.get("offlineNpmCiFailureCode") != "ENOTCACHED":
        raise RuntimeError("status_dependency_baseline_missing")
    if runtime_boundary.get("exactWindowsArtifactAcquired") is not True or runtime_boundary.get("exactWindowsExecuted") is not False:
        raise RuntimeError("status_windows_artifact_boundary_invalid")
    status_source = status.get("sourceIdentity", {})
    if status_source.get("sourceAggregateSha256") != source_identity.get("sourceAggregateSha256"):
        raise RuntimeError("status_source_identity_mismatch")

    if authority.get("releaseDecision") != decision:
        raise RuntimeError("authority_status_release_decision_mismatch")
    for label, row in (
        ("authority_v16", authority.get("authorityFiles", {}).get("ownerDirectiveV16")),
        ("authority_v15", authority.get("authorityFiles", {}).get("previousOwnerDirectiveV15Historical")),
        ("authority_ledger", authority.get("authorityFiles", {}).get("currentStateLedger")),
        ("authority_source_identity", authority.get("currentSource")),
        ("authority_status", authority.get("currentStatus")),
    ):
        if not isinstance(row, dict):
            raise RuntimeError(f"authority_binding_missing:{label}")
        verify_binding(row, label)
    evidence = authority.get("evidenceBindings", {})
    for key in (
        "authorityTopologyPolicy",
        "productTopologyReconciliation",
        "v15ToV16ContinuityAudit",
        "exactNode24LinuxAuthorityTopology",
        "exactToolchainAndDependencyBaseline",
        "exactNode24180LinuxFixtureCampaign",
        "allProductCurrentOutputAndSourceRightsBaseline",
        "inheritedP38CurrentLockCas",
        "inheritedP38NodeDifferential",
    ):
        row = evidence.get(key)
        if not isinstance(row, dict):
            raise RuntimeError(f"authority_evidence_binding_missing:{key}")
        verify_binding(row, f"authority_evidence:{key}")

    required_artifacts = handoff.get("requiredUserArtifacts")
    if not isinstance(required_artifacts, list) or len(required_artifacts) != 3:
        raise RuntimeError("handoff_artifact_count_invalid")
    for index, label in ((0, "handoff_v16"), (1, "handoff_ledger")):
        row = required_artifacts[index]
        if not isinstance(row, dict):
            raise RuntimeError(f"handoff_binding_missing:{label}")
        verify_binding(row, label)
    zip_row = required_artifacts[2]
    if not isinstance(zip_row, dict) or zip_row.get("sha256") is not None:
        raise RuntimeError("handoff_zip_self_hash_boundary_invalid")
    if not LEDGER.is_file() or sha256_file(LEDGER) != required_artifacts[1].get("sha256"):
        raise RuntimeError("handoff_ledger_hash_mismatch")

    print(json.dumps({
        "status": "PASS_P39_V16_AUTHORITY_TOPOLOGY_SOURCE_ONLY_VERIFY",
        "v16Sha256": EXPECTED_V16,
        "customerFacingRows": "17/17",
        "internalProfiles": "33/33",
        "transitions": "22/22",
        "requiredDeltaTransitions": "6/22",
        "notApplicableTransitions": "16/22",
        "exactNodeLinux": "v24.18.0",
        "exactNpmLinux": "11.16.0",
        "runtimeRounds": "2/2",
        "exactWindowsArtifact": "ACQUIRED_HASH_VERIFIED_NOT_EXECUTED",
        "offlineNpmCi": "EXECUTED_ENOTCACHED_ZUSTAND_4_5_7",
        "dependencyClosure": False,
        "exactNodeFixtureFamilies": "6/6_WITH_P38_RECEIPT_AND_RUNTIME_PARITY",
        "allProductStaticBaseline": "11/11_FAMILIES_17/17_ROWS_0/17_EXECUTED",
        "currentFieldRights": "0/NOT_YET_DEFINED",
        "exactWindows": False,
        "releaseState": "NO_GO",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
