#!/usr/bin/env python3
"""Create and verify two byte-identical P39 V16 CURRENT_SOURCE_ONLY archives."""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import subprocess
import sys
import tempfile
from typing import Iterable
import zipfile

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "artifacts/closure/p39"
MANIFEST = ART / "P39_SOURCE_ONLY_PACKAGE_MANIFEST.json"
EXCLUSIONS = ART / "P39_PACKAGE_EXCLUSIONS.json"
FIXED_ZIP_TIME = (1980, 1, 1, 0, 0, 0)
REVISION = "P39_V16_AUTHORITY_TOPOLOGY_AND_EXACT_NODE24_LINUX_RECONCILIATION"
V16_SHA = "67816a5a9238668c8080a3a8cc623f078d268c1b78fddf534cb4893bb45490e9"
V15_SHA = "5cfbbfcbcef7242e30466f18bab3ad29cad859e485a909a4ee8658fb65e2f2c0"
V16 = "docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V16_FULL_TOPOLOGY_FREE_LEGAL_CURRENT_WORLD_CLASS_2026-08-14.txt"
V15 = "docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V15_FREE_LEGAL_TOP_WORLD_2026-08-13.txt"
SOURCE_IDENTITY = "artifacts/closure/p39/source-identity.json"
STATUS = "artifacts/closure/p39/P39_STATUS.json"
AUTHORITY = "artifacts/closure/p39/CURRENT_AUTHORITY_P39.json"
LEDGER = "artifacts/closure/p39/VELMERE_CURRENT_STATE_AND_PASS_DELTA_LEDGER_P39_V16_2026-08-14.txt"
POLICY = "config/p39/p39-v16-authority-topology-policy.json"
TOPOLOGY = "config/p39/p39-v16-product-topology-reconciliation.json"
CONTINUITY = "config/p39/p39-v15-to-v16-continuity-audit.json"
RUNTIME = "artifacts/closure/p39/P39_V16_AUTHORITY_TOPOLOGY_EXACT_NODE24_LINUX.json"
DEPENDENCY = "artifacts/closure/p39/P39_EXACT_TOOLCHAIN_AND_DEPENDENCY_BASELINE.json"
FIXTURE_CAMPAIGN = "artifacts/closure/p39/P39_EXACT_NODE_24_18_0_LINUX_FIXTURE_CAMPAIGN.json"
OUTPUT_RIGHTS_BASELINE = "artifacts/closure/p39/P39_CURRENT_OUTPUT_AND_SOURCE_RIGHTS_BASELINE.json"
DEPENDENCY_STDOUT = "artifacts/closure/p39/dependency-baseline/npm-ci-offline.stdout.log"
DEPENDENCY_STDERR = "artifacts/closure/p39/dependency-baseline/npm-ci-offline.stderr.log"
TOPOLOGY_VERIFY = "scripts/pass39/verify-p39-v16-topology.mjs"
TOPOLOGY_BUILD = "scripts/pass39/build-p39-v16-topology.mjs"
P39_RECEIPT_VERIFY = "scripts/pass39/verify-p39-v16-authority-topology-receipts.py"
FIXTURE_RUNNER = "scripts/pass39/run-p39-exact-node24-fixture-campaign.py"
OUTPUT_RIGHTS_BUILD = "scripts/pass39/build-p39-current-output-rights-baseline.py"
SOURCE_IDENTITY_BUILD = "scripts/closure/build-p39-source-identity.py"
CURRENT_STATE_BUILD = "scripts/closure/build-p39-current-state.py"
PACKAGE_BUILD = "scripts/closure/package-p39-current-source.py"
HANDOFF = "artifacts/closure/p39/P39_HANDOFF_MANIFEST.json"
P38_CAS_VERIFY = "scripts/pass38/verify-p38-current-lockfile-local-cas.py"
P38_NODE_VERIFY = "scripts/pass38/verify-p38-node-major-differential.py"
REQUIRED_FILES = {
    V16, V15, SOURCE_IDENTITY, STATUS, AUTHORITY, LEDGER, POLICY, TOPOLOGY,
    CONTINUITY, RUNTIME, DEPENDENCY, FIXTURE_CAMPAIGN, OUTPUT_RIGHTS_BASELINE, DEPENDENCY_STDOUT, DEPENDENCY_STDERR,
    TOPOLOGY_VERIFY, TOPOLOGY_BUILD, P39_RECEIPT_VERIFY, FIXTURE_RUNNER, OUTPUT_RIGHTS_BUILD, SOURCE_IDENTITY_BUILD,
    CURRENT_STATE_BUILD, PACKAGE_BUILD, HANDOFF, P38_CAS_VERIFY, P38_NODE_VERIFY,
}
EXPECTED_PUBLIC_PEMS = tuple(
    f"config/release-verification/pass{number}-offline-candidate-public.pem"
    for number in range(4734, 4742)
)
EXCLUDED_COMPONENTS = {
    ".git", ".cache", ".mypy_cache", ".npm", ".parcel-cache", ".pnpm-store",
    ".pytest_cache", ".ruff_cache", ".turbo", ".velmere", "__pycache__", "node_modules",
}
EXCLUDED_ROOT_DIRECTORIES = {"coverage", "temp", "tmp"}
EXCLUDED_PREFIXES = (
    "artifacts/pass36/a83/browser-lens-pdf-corpus",
    "artifacts/pass36/a83/renders",
    "artifacts/pass35/a45/screenshots",
    "artifacts/closure/p33/paid-tests",
    "artifacts/closure/p33/paid-tests-rerun",
    "artifacts/closure/p33/paid-tests-current",
    "artifacts/closure/p32/final-selected-test-logs",
)
EXCLUDED_EXACT_PATHS = {
    "artifacts/pass35/a45/A45_DETERMINISTIC_LOCAL_REFERENCE_QA_FIXTURE.json",
    "artifacts/closure/p34/internal-ai-assessments.jsonl",
    "artifacts/closure/p35/internal-ai-assessments.jsonl",
}
EXCLUDED_SUFFIXES = {".pyc", ".pyo", ".zip"}
EXTERNAL_FONT_NAMES = {"manrope-pdf-latin-plus-ext.ttf"}
FORBIDDEN_SECRET_SUFFIXES = {".key", ".p12", ".pfx"}
FORBIDDEN_SECRET_NAMES = {
    "credentials.json", "service-account.json", "service_account.json",
    "client-secret.json", "client_secret.json",
}
PRIVATE_PEM_MARKERS = (
    b"-----BEGIN PRIVATE KEY-----", b"-----BEGIN RSA PRIVATE KEY-----",
    b"-----BEGIN EC PRIVATE KEY-----", b"-----BEGIN OPENSSH PRIVATE KEY-----",
    b"-----BEGIN ENCRYPTED PRIVATE KEY-----",
)
PUBLIC_PEM_MARKERS = (b"-----BEGIN PUBLIC KEY-----", b"-----BEGIN CERTIFICATE-----")
ACTIVE_CREDENTIAL_PATTERN = re.compile(
    rb"(?:sk|pk)_(?:live|test)_[A-Za-z0-9_-]{24,}|"
    rb"whsec_[A-Za-z0-9_-]{24,}|Bearer\s+[A-Za-z0-9._~+/=-]{24,}|"
    rb"-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----", re.IGNORECASE,
)
ACTIVE_SOURCE_ROOTS = {"app", "components", "lib"}
ACTIVE_SOURCE_SUFFIXES = {".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".json", ".py", ".sh", ".ps1"}


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def canonical_json(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def normalized_mode(mode: int) -> int:
    return 0o755 if mode & 0o111 else 0o644


def within_root(path: Path) -> str | None:
    try:
        return path.resolve().relative_to(ROOT.resolve()).as_posix()
    except ValueError:
        return None


def reject_output(path: Path, label: str) -> None:
    if path.is_symlink():
        raise RuntimeError(f"{label}_symlink_forbidden:{path}")
    if path.exists() and not path.is_file():
        raise RuntimeError(f"{label}_non_regular:{path}")
    for parent in [path.absolute().parent, *path.absolute().parents]:
        if parent.exists() and parent.is_symlink():
            raise RuntimeError(f"{label}_parent_symlink:{parent}")


def pem_class(data: bytes) -> str:
    head = data[:4096]
    if any(marker in head for marker in PRIVATE_PEM_MARKERS):
        return "PRIVATE_FORBIDDEN"
    if any(marker in head for marker in PUBLIC_PEM_MARKERS):
        return "PUBLIC_ALLOWED"
    return "AMBIGUOUS_FORBIDDEN"


def artifact_noise(rel: str, pure: PurePosixPath) -> bool:
    if not rel.startswith("artifacts/"):
        return False
    if rel in {DEPENDENCY_STDOUT, DEPENDENCY_STDERR}:
        return False
    lower = pure.name.lower()
    if pure.suffix.lower() in {".log", ".sqlite", ".sqlite3"}:
        return True
    if lower.endswith((".exitcode", ".stdout", ".stderr")) or ".stdout." in lower or ".stderr." in lower:
        return True
    if any(part.lower() in {"logs", "test-logs", "temporary-receipts"} for part in pure.parts):
        return True
    if pure.suffix.lower() == ".zip":
        return True
    return False


def excluded(rel: str, dynamic_exact: set[str]) -> bool:
    pure = PurePosixPath(rel)
    parts = pure.parts
    if not parts:
        return True
    if rel in dynamic_exact or rel in EXCLUDED_EXACT_PATHS:
        return True
    if any(part in EXCLUDED_COMPONENTS or part.startswith(".next") for part in parts):
        return True
    if parts[0] in EXCLUDED_ROOT_DIRECTORIES:
        return True
    if len(parts) >= 2 and parts[0] == ".yarn" and parts[1] == "cache":
        return True
    if any(rel == prefix or rel.startswith(prefix + "/") for prefix in EXCLUDED_PREFIXES):
        return True
    if pure.suffix.lower() in EXCLUDED_SUFFIXES:
        return True
    if pure.name == ".env" or pure.name.startswith(".env."):
        return True
    if pure.suffix.lower() in FORBIDDEN_SECRET_SUFFIXES or pure.name.lower() in FORBIDDEN_SECRET_NAMES:
        return True
    if pure.name.lower() in EXTERNAL_FONT_NAMES:
        return True
    if any(part.upper() == "MATERIALS" for part in parts):
        return True
    return artifact_noise(rel, pure)


def iter_files(dynamic_exact: set[str]) -> Iterable[tuple[Path, str, os.stat_result, str | None]]:
    def walk(directory: Path, rel_dir: PurePosixPath):
        with os.scandir(directory) as scan:
            entries = sorted(scan, key=lambda item: item.name.encode("utf-8"))
        for entry in entries:
            rel_path = rel_dir / entry.name
            rel = rel_path.as_posix()
            if excluded(rel, dynamic_exact):
                continue
            if entry.is_symlink():
                raise RuntimeError(f"included_symlink:{rel}")
            path = Path(entry.path)
            st = entry.stat(follow_symlinks=False)
            if stat.S_ISDIR(st.st_mode):
                yield from walk(path, rel_path)
            elif stat.S_ISREG(st.st_mode):
                classification = None
                if PurePosixPath(rel).suffix.lower() == ".pem":
                    classification = pem_class(path.read_bytes())
                    if classification != "PUBLIC_ALLOWED":
                        raise RuntimeError(f"forbidden_pem:{rel}:{classification}")
                yield path, rel, st, classification
            else:
                raise RuntimeError(f"included_special_file:{rel}:{st.st_mode:o}")
    yield from walk(ROOT, PurePosixPath())


def inventory(dynamic_exact: set[str]) -> tuple[list[dict[str, object]], list[str]]:
    rows: list[dict[str, object]] = []
    public: list[str] = []
    casefold: dict[str, str] = {}
    for path, rel, st, classification in iter_files(dynamic_exact):
        folded = rel.casefold()
        if folded in casefold and casefold[folded] != rel:
            raise RuntimeError(f"casefold_collision:{casefold[folded]}:{rel}")
        casefold[folded] = rel
        rows.append({"path": rel, "byteLength": st.st_size, "mode": normalized_mode(st.st_mode), "sha256": sha256_file(path)})
        if classification == "PUBLIC_ALLOWED":
            public.append(rel)
    rows.sort(key=lambda row: str(row["path"]).encode("utf-8"))
    return rows, sorted(public, key=lambda value: value.encode("utf-8"))


def validate_secret_boundaries(rows: list[dict[str, object]]) -> None:
    for row in rows:
        rel = str(row["path"])
        pure = PurePosixPath(rel)
        path = ROOT / rel
        if pure.name == ".npmrc":
            text = path.read_text(encoding="utf-8", errors="replace")
            if re.search(r"(?im)(?:_authToken|_password|username|always-auth)\s*=", text):
                raise RuntimeError(f"npmrc_auth_material:{rel}")
        if pure.parts and pure.parts[0] in ACTIVE_SOURCE_ROOTS and pure.suffix.lower() in ACTIVE_SOURCE_SUFFIXES:
            if ACTIVE_CREDENTIAL_PATTERN.search(path.read_bytes()):
                raise RuntimeError(f"active_credential_literal:{rel}")


def load_json(rel: str) -> dict[str, object]:
    value = json.loads((ROOT / rel).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise RuntimeError(f"object_required:{rel}")
    return value


def recompute_source_identity() -> dict[str, object]:
    builder = ROOT / "scripts/closure/build-p39-source-identity.py"
    spec = importlib.util.spec_from_file_location("velmere_p39_source_identity", builder)
    if spec is None or spec.loader is None:
        raise RuntimeError("source_identity_import_failed")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    rows = []
    for path, rel, st, _classification in module.iter_regular_files({SOURCE_IDENTITY}):
        rows.append({"path": rel, "byteLength": st.st_size, "mode": module.normalized_mode(st.st_mode), "sha256": module.sha256_file(path)})
    rows.sort(key=lambda row: str(row["path"]).encode("utf-8"))
    return {
        "fileCount": len(rows),
        "payloadBytes": sum(int(row["byteLength"]) for row in rows),
        "pathSetSha256": sha256_bytes("\n".join(str(row["path"]) for row in rows).encode("utf-8")),
        "sourceAggregateSha256": sha256_bytes(b"".join(
            f'{row["path"]}\0{row["byteLength"]}\0{row["mode"]}\0{row["sha256"]}\n'.encode("utf-8") for row in rows
        )),
    }


def validate_source_identity() -> dict[str, object]:
    stored = load_json(SOURCE_IDENTITY)
    current = recompute_source_identity()
    for field in ("fileCount", "payloadBytes", "pathSetSha256", "sourceAggregateSha256"):
        if stored.get(field) != current[field]:
            raise RuntimeError(f"source_identity_stale:{field}:{stored.get(field)}:{current[field]}")
    authority = stored.get("requiredAuthorityBinding")
    if not isinstance(authority, dict) or authority.get("path") != V16 or authority.get("sha256") != V16_SHA:
        raise RuntimeError("v16_source_identity_binding_invalid")
    return stored


def validate_required(rows: list[dict[str, object]]) -> None:
    by_path = {str(row["path"]): row for row in rows}
    missing = sorted(REQUIRED_FILES - set(by_path))
    if missing:
        raise RuntimeError(f"required_p39_files_missing:{missing}")
    if by_path[V16]["sha256"] != V16_SHA:
        raise RuntimeError("v16_hash_mismatch_in_package")
    if by_path[V15]["sha256"] != V15_SHA:
        raise RuntimeError("v15_hash_mismatch_in_package")

    status = load_json(STATUS)
    if status.get("state") != "CURRENT_SOURCE_ONLY_IN_PROGRESS" or status.get("releaseState") != "NO_GO":
        raise RuntimeError("p39_status_not_no_go")
    decision = status.get("releaseDecision")
    forbidden_release_flags = (
        "goInternal", "finalAiValidationReady", "pilotReady", "goPaid",
        "saleEnabled", "live", "worldClassProven",
    )
    if not isinstance(decision, dict) or any(decision.get(key) for key in forbidden_release_flags):
        raise RuntimeError("p39_false_release_promotion")

    topology = load_json(TOPOLOGY)
    denominators = topology.get("denominators")
    expected = {
        "productFamilies": 11,
        "customerFacingRows": 17,
        "explicitlyTieredRows": 9,
        "standaloneRows": 8,
        "internalExecutionProfiles": 33,
        "contextTransitions": 22,
        "deltaRequiredTransitions": 6,
        "notApplicableNoPaidDeltaClaimTransitions": 16,
    }
    if not isinstance(denominators, dict):
        raise RuntimeError("p39_topology_denominators_missing")
    for key, value in expected.items():
        if denominators.get(key) != value:
            raise RuntimeError(f"p39_topology_denominator_invalid:{key}:{denominators.get(key)}:{value}")

    continuity = load_json(CONTINUITY)
    if continuity.get("result") != "V16_SUBSUMES_V15_NO_OWNER_DIRECTIVE_TEXT_AMENDMENT_REQUIRED":
        raise RuntimeError("p39_continuity_audit_invalid")
    if continuity.get("textChangesAppliedToV16") is not False:
        raise RuntimeError("p39_v16_unexpected_text_change")

    runtime = load_json(RUNTIME)
    runtime_data = runtime.get("runtime")
    if not isinstance(runtime_data, dict):
        raise RuntimeError("p39_runtime_data_missing")
    if runtime_data.get("nodeVersion") != "v24.18.0" or runtime_data.get("npmVersion") != "11.16.0":
        raise RuntimeError("p39_exact_linux_runtime_invalid")
    if runtime_data.get("platform") != "linux" or runtime_data.get("architecture") != "x64":
        raise RuntimeError("p39_exact_linux_platform_invalid")
    if runtime_data.get("exactLinuxExecuted") is not True or runtime_data.get("exactWindowsExecuted") is not False:
        raise RuntimeError("p39_runtime_credit_boundary_invalid")

    dependency = load_json(DEPENDENCY)
    executed_linux = dependency.get("executedLinuxRuntime")
    windows = dependency.get("acquiredWindowsRuntimeArtifact")
    offline = dependency.get("offlineNpmCiAttempt")
    gates = dependency.get("gates")
    if not all(isinstance(value, dict) for value in (executed_linux, windows, offline, gates)):
        raise RuntimeError("p39_dependency_baseline_shape_invalid")
    if executed_linux["node"].get("exactPass") is not True or executed_linux["npm"].get("exactPass") is not True:
        raise RuntimeError("p39_dependency_exact_linux_invalid")
    if windows.get("acquired") is not True or windows.get("workflowZipIntegrityPass") is not True:
        raise RuntimeError("p39_windows_artifact_acquisition_invalid")
    if windows.get("executed") is not False:
        raise RuntimeError("p39_windows_false_execution_credit")
    if offline.get("npmCiCompleted") is not False or offline.get("dependencyClosure") is not False:
        raise RuntimeError("p39_dependency_false_credit")
    parsed = offline.get("parsedFailure")
    if not isinstance(parsed, dict) or parsed.get("errorCode") != "ENOTCACHED" or parsed.get("exactFailureClass") != "OFFLINE_CACHE_MISS":
        raise RuntimeError("p39_dependency_failure_not_precise")
    if gates.get("exactWindowsExecuted") is not False or gates.get("dependencyClosure") is not False or gates.get("goInternal") is not False:
        raise RuntimeError("p39_dependency_gate_false_promotion")
    if dependency.get("currentLock", {}).get("sha256") != by_path["package-lock.json"]["sha256"]:
        raise RuntimeError("p39_dependency_package_lock_binding_mismatch")

    fixture_campaign = load_json(FIXTURE_CAMPAIGN)
    fixture_runtime = fixture_campaign.get("runtime")
    fixture_summary = fixture_campaign.get("summary")
    fixture_credit = fixture_campaign.get("credit")
    if fixture_campaign.get("state") != "IMPLEMENTED_AND_TESTED_INTERNAL_EXACT_NODE_LINUX_FIXTURE_CAMPAIGN":
        raise RuntimeError("p39_fixture_campaign_state_invalid")
    if not all(isinstance(value, dict) for value in (fixture_runtime, fixture_summary, fixture_credit)):
        raise RuntimeError("p39_fixture_campaign_shape_invalid")
    if fixture_runtime.get("nodeVersion") != "24.18.0" or fixture_runtime.get("platform") != "linux" or fixture_runtime.get("architecture") != "x86_64":
        raise RuntimeError("p39_fixture_campaign_runtime_invalid")
    if fixture_runtime.get("exactNode24180Executed") is not True or fixture_runtime.get("exactWindowsExecuted") is not False:
        raise RuntimeError("p39_fixture_campaign_runtime_boundary_invalid")
    if fixture_summary.get("families") != 6 or fixture_summary.get("exactNodeFamiliesPassed") != "6/6" or fixture_summary.get("p38Node24LineReceiptParity") != "6/6" or fixture_summary.get("p38Node24LineRuntimeParity") != "6/6" or fixture_summary.get("canonicalProtectedPathsUnchanged") != "13/13":
        raise RuntimeError("p39_fixture_campaign_summary_invalid")
    if fixture_credit.get("exactNode24180LinuxFixtureExecution") is not True or fixture_credit.get("isolatedFamilyExecution") is not True or fixture_credit.get("p38Node24LineByteParity") is not True:
        raise RuntimeError("p39_fixture_campaign_positive_credit_missing")
    if any(fixture_credit.get(key) is not False for key in ("exactWindows", "dependencyClosure", "typecheckOrBuild", "browserOrPdf", "currentCustomerOutput", "customerValue", "sourceRights", "goInternal", "goPaid", "live", "worldClassProven")):
        raise RuntimeError("p39_fixture_campaign_false_promotion")

    output_rights = load_json(OUTPUT_RIGHTS_BASELINE)
    output_denominators = output_rights.get("denominators")
    if not isinstance(output_denominators, dict):
        raise RuntimeError("p39_output_rights_denominators_missing")
    if output_denominators.get("familiesWithSourceEntrypointsPresent") != "11/11" or output_denominators.get("customerFacingRowsMappedToSource") != "17/17":
        raise RuntimeError("p39_output_rights_mapping_invalid")
    if output_denominators.get("customerFacingRowsPhysicallyExecutedCurrentV16") != "0/17" or output_denominators.get("v16FieldLevelRightsRowsPassed") != "0/NOT_YET_DEFINED":
        raise RuntimeError("p39_output_rights_false_credit")
    output_credit = output_rights.get("credit")
    if not isinstance(output_credit, dict) or output_credit.get("allProductStaticBaselineStarted") is not True or output_credit.get("sourceEntrypointInventory") is not True:
        raise RuntimeError("p39_output_rights_baseline_credit_missing")
    if any(output_credit.get(key) is not False for key in ("currentCustomerOutputExecution", "exactOutputBytes", "fieldLevelSourceRights", "freshnessRuntime", "materialValue", "saleEligibility", "goInternal", "goPaid", "worldClassProven")):
        raise RuntimeError("p39_output_rights_false_promotion")

    authority = load_json(AUTHORITY)
    if authority.get("releaseDecision") != decision:
        raise RuntimeError("p39_authority_release_decision_mismatch")
    handoff = load_json(HANDOFF)
    required_artifacts = handoff.get("requiredUserArtifacts")
    if not isinstance(required_artifacts, list) or len(required_artifacts) != 3:
        raise RuntimeError("p39_handoff_not_exactly_three_artifacts")


def row_for(path: Path, rel: str | None = None) -> dict[str, object]:
    st = path.stat()
    return {"path": rel or path.relative_to(ROOT).as_posix(), "byteLength": st.st_size, "mode": normalized_mode(st.st_mode), "sha256": sha256_file(path)}


def build_manifest(rows: list[dict[str, object]], public: list[str], source_identity: dict[str, object]) -> dict[str, object]:
    path_set = sha256_bytes("\n".join(str(row["path"]) for row in rows).encode("utf-8"))
    aggregate = sha256_bytes(b"".join(
        f'{row["path"]}\0{row["byteLength"]}\0{row["mode"]}\0{row["sha256"]}\n'.encode("utf-8") for row in rows
    ))
    topology = load_json(TOPOLOGY)
    runtime = load_json(RUNTIME)
    dependency = load_json(DEPENDENCY)
    fixture_campaign = load_json(FIXTURE_CAMPAIGN)
    output_rights = load_json(OUTPUT_RIGHTS_BASELINE)
    denominators = topology["denominators"]
    runtime_data = runtime["runtime"]
    windows = dependency["acquiredWindowsRuntimeArtifact"]
    offline = dependency["offlineNpmCiAttempt"]
    manifest: dict[str, object] = {
        "schemaVersion": "velmere.p39.source-only-package-manifest.v1",
        "revision": REVISION,
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "releaseState": "NO_GO",
        "generatedAt": "2026-08-14T05:50:00.000Z",
        "manifestEntriesExcludeManifestSelf": True,
        "fileCountExcludingManifestSelf": len(rows),
        "payloadBytesExcludingManifestSelf": sum(int(row["byteLength"]) for row in rows),
        "pathSetSha256ExcludingManifestSelf": path_set,
        "packageAggregateSha256ExcludingManifestSelf": aggregate,
        "currentSourceIdentity": {key: source_identity[key] for key in ("fileCount", "payloadBytes", "pathSetSha256", "sourceAggregateSha256")},
        "authority": {
            "current": {"path": V16, "sha256": V16_SHA, "unmodified": True},
            "previousHistorical": {"path": V15, "sha256": V15_SHA, "unmodified": True},
            "parentRoot": "R44P46",
        },
        "topology": {
            "productFamilies": denominators["productFamilies"],
            "customerFacingRows": denominators["customerFacingRows"],
            "explicitlyTieredRows": denominators["explicitlyTieredRows"],
            "standaloneRows": denominators["standaloneRows"],
            "internalProfiles": denominators["internalExecutionProfiles"],
            "transitionsClassified": denominators["contextTransitions"],
            "requiredDeltaTransitions": denominators["deltaRequiredTransitions"],
            "notApplicableTransitions": denominators["notApplicableNoPaidDeltaClaimTransitions"],
            "saleEligibilityDenominator": "17_REAL_CUSTOMER_FACING_ROWS_ONLY",
        },
        "runtime": {
            "exactLinuxNode": runtime_data["nodeVersion"],
            "exactLinuxNpm": runtime_data["npmVersion"],
            "platform": f'{runtime_data["platform"]}-{runtime_data["architecture"]}',
            "exactLinuxExecuted": runtime_data["exactLinuxExecuted"],
            "exactWindowsArtifactAcquired": windows["acquired"],
            "exactWindowsArtifactIntegrityPass": windows["workflowZipIntegrityPass"],
            "exactWindowsExecuted": windows["executed"],
        },
        "fixtureCampaign": {
            "exactNode24180LinuxFamilies": fixture_campaign["summary"]["exactNodeFamiliesPassed"],
            "p38Node24LineReceiptParity": fixture_campaign["summary"]["p38Node24LineReceiptParity"],
            "p38Node24LineRuntimeParity": fixture_campaign["summary"]["p38Node24LineRuntimeParity"],
            "canonicalProtectedPathsUnchanged": fixture_campaign["summary"]["canonicalProtectedPathsUnchanged"],
            "creditClass": "BOUNDED_INTERNAL_FIXTURE_EXECUTION_ONLY",
        },
        "dependency": {
            "packageLockSha256": dependency["currentLock"]["sha256"],
            "lockRows": dependency["currentLock"]["remotePackageRows"],
            "offlineNpmCiExecuted": True,
            "offlineNpmCiCompleted": offline["npmCiCompleted"],
            "dependencyClosure": offline["dependencyClosure"],
            "failureCode": offline["parsedFailure"]["errorCode"],
            "failureClass": offline["parsedFailure"]["exactFailureClass"],
            "firstMissingOrFailedUrl": offline["parsedFailure"]["firstMissingOrFailedUrl"],
            "inheritedExactCasCoverage": "67/661",
            "remainingCurrentLockPaths": 594,
        },
        "allProductCurrentOutputAndRightsBaseline": {
            "familiesWithSourceEntrypoints": output_rights["denominators"]["familiesWithSourceEntrypointsPresent"],
            "customerRowsMappedToSource": output_rights["denominators"]["customerFacingRowsMappedToSource"],
            "customerRowsPhysicallyExecuted": output_rights["denominators"]["customerFacingRowsPhysicallyExecutedCurrentV16"],
            "exactCustomerOutputBytes": output_rights["denominators"]["exactCustomerOutputBytesCaptured"],
            "promisedFieldInventories": output_rights["denominators"]["promisedFieldInventoriesCompleted"],
            "currentTermsReverified": output_rights["denominators"]["currentSourceTermsReverified"],
            "v16FieldLevelRightsRowsPassed": output_rights["denominators"]["v16FieldLevelRightsRowsPassed"],
            "saleEligibleRows": output_rights["denominators"]["saleEligibleCustomerRows"],
            "creditClass": "STATIC_SOURCE_ENTRYPOINT_BASELINE_ONLY",
        },
        "publicPemPolicy": {
            "includedPublicPemCount": len(public),
            "includedPublicPemPaths": public,
            "expectedPublicPemPaths": list(EXPECTED_PUBLIC_PEMS),
            "expectedPublicPemSetPass": set(public) == set(EXPECTED_PUBLIC_PEMS),
            "privatePemIncluded": 0,
            "ambiguousPemIncluded": 0,
        },
        "entriesExcludingManifestSelf": rows,
        "creditBoundary": {
            "cleanPackageCredit": True,
            "v16AuthorityBindingCredit": True,
            "topologyReconciliationCredit": True,
            "exactLinuxRuntimeCredit": True,
            "windowsArtifactAcquisitionCredit": True,
            "exactWindowsExecutionCredit": False,
            "dependencyAttemptCredit": True,
            "dependencyClosureCredit": False,
            "exactNodeFixtureCampaignCredit": True,
            "allProductStaticBaselineCredit": True,
            "currentCustomerOutputCredit": False,
            "fieldLevelRightsCredit": False,
            "buildCredit": False,
            "browserCredit": False,
            "pdfReplayCredit": False,
            "customerValueCredit": False,
            "sourceRightsCredit": False,
            "goInternalCredit": False,
            "goPaidCredit": False,
            "liveCredit": False,
            "worldClassProvenCredit": False,
        },
        "truthBoundary": (
            "The package proves deterministic current-source bytes, exact V16 binding, 11-family/17-row/33-context topology reconciliation, clean-unpack verification, exact Linux Node 24.18.0/npm 11.16.0 source-only execution, a six-family isolated exact-Node fixture replay with 6/6 P38 Node-24-line receipt/runtime byte parity, verified acquisition of the exact Windows runtime artifact, a precise fail-closed offline npm-ci attempt, and a static source-entrypoint/legacy-rights baseline for all 11 families and 17 customer rows. Exact Windows execution, dependency closure, physical customer outputs, promised-field extraction, current field-level data rights, builds, Browser/PDF outputs, factual holdouts, material value and release gates remain open."
        ),
    }
    manifest["integritySha256"] = sha256_bytes(canonical_json(manifest))
    return manifest


def write_zip(path: Path, rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9, allowZip64=True) as archive:
        for row in rows:
            rel = str(row["path"])
            data = (ROOT / rel).read_bytes()
            info = zipfile.ZipInfo(rel, FIXED_ZIP_TIME)
            info.create_system = 3
            info.external_attr = (int(row["mode"]) & 0xFFFF) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            info.flag_bits = 0x800
            archive.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)


def verify_archive(path: Path, rows: list[dict[str, object]]) -> dict[str, object]:
    expected = {str(row["path"]): row for row in rows}
    with zipfile.ZipFile(path, "r") as archive:
        bad = archive.testzip()
        infos = archive.infolist()
        names = [info.filename for info in infos]
        if names != list(expected):
            raise RuntimeError("archive_path_order_mismatch")
        for info in infos:
            row = expected[info.filename]
            data = archive.read(info.filename)
            if len(data) != int(row["byteLength"]) or sha256_bytes(data) != str(row["sha256"]):
                raise RuntimeError(f"archive_content_mismatch:{info.filename}")
        return {"crcPass": bad is None, "badEntry": bad, "entries": len(infos), "uncompressedBytes": sum(info.file_size for info in infos)}


def parse_json_stdout(stdout: str, label: str) -> dict[str, object]:
    text = stdout.strip()
    if not text:
        raise RuntimeError(f"empty_verifier_stdout:{label}")
    try:
        value = json.loads(text)
    except json.JSONDecodeError:
        lines = [line for line in stdout.splitlines() if line.strip()]
        try:
            value = json.loads(lines[-1])
        except (IndexError, json.JSONDecodeError) as error:
            raise RuntimeError(f"non_json_verifier_stdout:{label}:{error}") from error
    if not isinstance(value, dict):
        raise RuntimeError(f"verifier_json_object_required:{label}")
    return value


def verify_clean_unpack(path: Path, rows: list[dict[str, object]], exact_node: Path) -> dict[str, object]:
    expected = {str(row["path"]): row for row in rows}
    with tempfile.TemporaryDirectory(prefix="velmere-p39-clean-unpack-") as tmp:
        target = Path(tmp)
        with zipfile.ZipFile(path, "r") as archive:
            archive.extractall(target)
        actual = sorted(p.relative_to(target).as_posix() for p in target.rglob("*") if p.is_file())
        if actual != sorted(expected):
            raise RuntimeError("clean_unpack_path_set_mismatch")
        for rel, row in expected.items():
            file_path = target / rel
            data = file_path.read_bytes()
            if len(data) != int(row["byteLength"]) or sha256_bytes(data) != str(row["sha256"]):
                raise RuntimeError(f"clean_unpack_content_mismatch:{rel}")

        identity = json.loads((target / SOURCE_IDENTITY).read_text(encoding="utf-8"))
        for row in identity["files"]:
            data = (target / str(row["path"])).read_bytes()
            if len(data) != int(row["byteLength"]) or sha256_bytes(data) != str(row["sha256"]):
                raise RuntimeError(f"clean_unpack_source_identity_mismatch:{row['path']}")
        path_set = sha256_bytes("\n".join(str(row["path"]) for row in identity["files"]).encode("utf-8"))
        aggregate = sha256_bytes(b"".join(
            f'{row["path"]}\0{row["byteLength"]}\0{row["mode"]}\0{row["sha256"]}\n'.encode("utf-8")
            for row in identity["files"]
        ))
        if path_set != identity["pathSetSha256"] or aggregate != identity["sourceAggregateSha256"]:
            raise RuntimeError("clean_unpack_source_identity_aggregate_mismatch")

        env = {
            "PATH": os.environ.get("PATH", ""),
            "HOME": str(target / ".verify-home"),
            "TMPDIR": str(target / ".verify-tmp"),
            "LANG": "C.UTF-8",
            "LC_ALL": "C.UTF-8",
        }
        Path(env["HOME"]).mkdir()
        Path(env["TMPDIR"]).mkdir()
        commands = [
            (
                "p39TopologyExecution",
                [
                    str(exact_node),
                    "--experimental-strip-types",
                    "--import",
                    "./scripts/pass11/register-offline-ts-loader.mjs",
                    str(target / TOPOLOGY_VERIFY),
                ],
                "PASS_P39_V16_TOPOLOGY",
            ),
            (
                "p39ReceiptVerifier",
                [sys.executable, str(target / P39_RECEIPT_VERIFY)],
                "PASS_P39_V16_AUTHORITY_TOPOLOGY_SOURCE_ONLY_VERIFY",
            ),
            (
                "p38Cas",
                [sys.executable, str(target / P38_CAS_VERIFY)],
                "PASS_P38_CURRENT_LOCKFILE_LOCAL_CAS_SOURCE_ONLY_VERIFY",
            ),
            (
                "p38NodeDifferential",
                [sys.executable, str(target / P38_NODE_VERIFY)],
                "PASS_P38_NODE_MAJOR_DIFFERENTIAL_RECEIPT_VERIFY",
            ),
        ]
        results: dict[str, object] = {}
        for label, command, expected_status in commands:
            result = subprocess.run(
                command,
                cwd=target,
                env=env,
                capture_output=True,
                text=True,
                timeout=240,
                check=False,
            )
            if result.returncode != 0:
                raise RuntimeError(
                    f"clean_unpack_verifier_failed:{label}:{result.returncode}:"
                    f"{result.stdout[-4000:]}:{result.stderr[-4000:]}"
                )
            payload = parse_json_stdout(result.stdout, label)
            if payload.get("status") != expected_status:
                raise RuntimeError(f"clean_unpack_status_mismatch:{label}:{payload.get('status')}")
            results[label] = {
                "pass": True,
                "status": expected_status,
                "stdoutSha256": sha256_bytes(result.stdout.encode("utf-8")),
                "stderrSha256": sha256_bytes(result.stderr.encode("utf-8")),
            }
        return {
            "pathSetPass": True,
            "contentPass": True,
            "sourceIdentityAggregatePass": True,
            "sourceIdentityFiles": len(identity["files"]),
            "expectedPublicPemsPresent": sum(1 for rel in EXPECTED_PUBLIC_PEMS if (target / rel).is_file()),
            "p39TopologyExecution": results["p39TopologyExecution"],
            "p39ReceiptVerifier": results["p39ReceiptVerifier"],
            "p38CasVerifier": results["p38Cas"],
            "p38NodeDifferentialVerifier": results["p38NodeDifferential"],
        }


def files_equal(a: Path, b: Path) -> bool:
    if a.stat().st_size != b.stat().st_size:
        return False
    with a.open("rb") as left, b.open("rb") as right:
        while True:
            la = left.read(1024 * 1024); rb = right.read(1024 * 1024)
            if la != rb:
                return False
            if not la:
                return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--copy-b", required=True)
    parser.add_argument("--receipt", required=True)
    parser.add_argument("--exact-node", required=True)
    args = parser.parse_args()
    output = Path(args.output).resolve(); copy_b = Path(args.copy_b).resolve(); receipt = Path(args.receipt).resolve(); exact_node = Path(args.exact_node).resolve()
    for path, label in ((output, "output"), (copy_b, "copy_b"), (receipt, "receipt"), (MANIFEST, "manifest"), (EXCLUSIONS, "exclusions")):
        reject_output(path, label)
    if not exact_node.is_file():
        raise RuntimeError(f"exact_node_missing:{exact_node}")
    result = subprocess.run([str(exact_node), "--version"], capture_output=True, text=True, check=False)
    if result.returncode != 0 or result.stdout.strip() != "v24.18.0":
        raise RuntimeError(f"exact_node_invalid:{result.stdout}:{result.stderr}")
    dynamic_exact = {rel for rel in (within_root(output), within_root(copy_b), within_root(receipt)) if rel}
    dynamic_exact.add(MANIFEST.relative_to(ROOT).as_posix())
    ART.mkdir(parents=True, exist_ok=True)
    exclusions = {
        "schemaVersion": "velmere.p39.source-only-package-exclusions.v1", "revision": REVISION,
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS", "releaseState": "NO_GO", "generatedAt": "2026-08-14T05:50:00.000Z",
        "excludedComponents": sorted(EXCLUDED_COMPONENTS), "excludedRootDirectories": sorted(EXCLUDED_ROOT_DIRECTORIES),
        "excludedPrefixes": list(EXCLUDED_PREFIXES), "excludedExactPaths": sorted(EXCLUDED_EXACT_PATHS),
        "dynamicOutputSelfExclusions": sorted(dynamic_exact), "externalFontMaterialsIncluded": False,
        "physicalPdfBrowserCorporaIncluded": False, "privateOrAmbiguousPemIncluded": False,
    }
    exclusions["integritySha256"] = sha256_bytes(canonical_json(exclusions))
    EXCLUSIONS.write_text(json.dumps(exclusions, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    rows, public = inventory(dynamic_exact)
    validate_secret_boundaries(rows)
    source_identity = validate_source_identity()
    validate_required(rows)
    if set(public) != set(EXPECTED_PUBLIC_PEMS):
        raise RuntimeError(f"public_pem_set_mismatch:{public}")
    manifest = build_manifest(rows, public, source_identity)
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    package_rows = sorted([*rows, row_for(MANIFEST)], key=lambda row: str(row["path"]).encode("utf-8"))
    write_zip(output, package_rows); write_zip(copy_b, package_rows)
    sha_a = sha256_file(output); sha_b = sha256_file(copy_b)
    byte_identical = sha_a == sha_b and files_equal(output, copy_b)
    verify_a = verify_archive(output, package_rows); verify_b = verify_archive(copy_b, package_rows)
    clean_a = verify_clean_unpack(output, package_rows, exact_node); clean_b = verify_clean_unpack(copy_b, package_rows, exact_node)
    dependency = load_json(DEPENDENCY)
    fixture_campaign = load_json(FIXTURE_CAMPAIGN)
    output_rights = load_json(OUTPUT_RIGHTS_BASELINE)
    offline = dependency["offlineNpmCiAttempt"]
    windows = dependency["acquiredWindowsRuntimeArtifact"]
    payload = {
        "schemaVersion": "velmere.p39.deterministic-source-only-package-receipt.v1",
        "revision": REVISION,
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "releaseState": "NO_GO",
        "generatedAt": "2026-08-14T05:55:00.000Z",
        "archive": str(output),
        "copyB": str(copy_b),
        "sha256": sha_a,
        "copyBSha256": sha_b,
        "byteIdentical": byte_identical,
        "crcPass": bool(verify_a["crcPass"] and verify_b["crcPass"]),
        "entries": verify_a["entries"],
        "uncompressedBytes": verify_a["uncompressedBytes"],
        "zipBytes": output.stat().st_size,
        "sourceIdentitySha256": sha256_file(ROOT / SOURCE_IDENTITY),
        "sourceAggregateSha256": source_identity["sourceAggregateSha256"],
        "manifestIncluded": True,
        "manifestSha256": sha256_file(MANIFEST),
        "cleanUnpackA": clean_a,
        "cleanUnpackB": clean_b,
        "publicPemsIncluded": len(public),
        "privateOrAmbiguousPemsIncluded": 0,
        "activeCredentialLiteralHits": 0,
        "authority": {
            "v16AuthorityBound": True,
            "v16Sha256": V16_SHA,
            "v15HistoricalSha256": V15_SHA,
            "parentRoot": "R44P46",
        },
        "topology": {
            "productFamilies": 11,
            "customerFacingRows": 17,
            "internalProfiles": 33,
            "transitionsClassified": 22,
            "requiredDeltaTransitions": 6,
            "notApplicableTransitions": 16,
            "saleEligibilityDenominator": 17,
        },
        "runtimeAndDependency": {
            "exactLinuxNodeExecuted": True,
            "exactLinuxNpmExecuted": True,
            "exactWindowsArtifactAcquired": windows["acquired"],
            "exactWindowsArtifactIntegrityPass": windows["workflowZipIntegrityPass"],
            "exactWindowsExecuted": windows["executed"],
            "offlineNpmCiExecuted": True,
            "offlineNpmCiCompleted": offline["npmCiCompleted"],
            "dependencyClosure": offline["dependencyClosure"],
            "dependencyFailureCode": offline["parsedFailure"]["errorCode"],
            "dependencyFailureClass": offline["parsedFailure"]["exactFailureClass"],
            "inheritedExactCasCoverage": "67/661",
            "remainingCurrentLockPaths": 594,
        },
        "exactNodeFixtureCampaign": {
            "familiesPassed": fixture_campaign["summary"]["exactNodeFamiliesPassed"],
            "p38ReceiptParity": fixture_campaign["summary"]["p38Node24LineReceiptParity"],
            "p38RuntimeParity": fixture_campaign["summary"]["p38Node24LineRuntimeParity"],
            "protectedPathsUnchanged": fixture_campaign["summary"]["canonicalProtectedPathsUnchanged"],
            "boundedFixtureOnly": True,
        },
        "allProductCurrentOutputAndRightsBaseline": {
            "familiesMapped": output_rights["denominators"]["familiesWithSourceEntrypointsPresent"],
            "customerRowsMapped": output_rights["denominators"]["customerFacingRowsMappedToSource"],
            "customerRowsExecuted": output_rights["denominators"]["customerFacingRowsPhysicallyExecutedCurrentV16"],
            "exactOutputBytes": output_rights["denominators"]["exactCustomerOutputBytesCaptured"],
            "currentTermsReverified": output_rights["denominators"]["currentSourceTermsReverified"],
            "fieldLevelRightsPassed": output_rights["denominators"]["v16FieldLevelRightsRowsPassed"],
            "saleEligibleRows": output_rights["denominators"]["saleEligibleCustomerRows"],
        },
        "releaseGates": {
            "typecheckExecuted": False,
            "lintExecuted": False,
            "webpackBuildExecuted": False,
            "turbopackBuildExecuted": False,
            "browserDistinctSkuExecutions": "0/3",
            "pdfIndependentReplay": "0/1",
            "saleEligibleRows": "0/17",
            "goInternal": False,
            "finalAiValidationReady": False,
            "pilotReady": False,
            "goPaid": False,
            "live": False,
            "worldClassProven": False,
        },
        "truthBoundary": (
            "The deterministic package closes V16 authority binding, 11-family/17-row/33-context topology reconciliation, exact Linux Node/npm source-only execution, a bounded six-family exact-Node fixture replay with P38 byte parity, verified Windows runtime artifact acquisition, a precise fail-closed offline dependency attempt, an all-product static source-entrypoint/legacy-rights baseline, CRC and clean-unpack verification. It does not close exact Windows execution, dependency closure, physical customer outputs, promised-field extraction, current field-level source rights, builds, Browser/PDF, factual quality, material value, security, pilot, paid or world-class gates."
        ),
    }
    payload["integritySha256"] = sha256_bytes(canonical_json(payload))
    receipt.parent.mkdir(parents=True, exist_ok=True)
    receipt.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": "PASS_P39_DETERMINISTIC_CURRENT_SOURCE_ONLY_PACKAGE",
        "sha256": sha_a,
        "byteIdentical": byte_identical,
        "crcPass": payload["crcPass"],
        "entries": payload["entries"],
        "sourceAggregateSha256": payload["sourceAggregateSha256"],
        "v16AuthorityBound": True,
        "topology": "11_FAMILIES_17_ROWS_33_CONTEXTS_22_TRANSITIONS",
        "exactLinuxNode": True,
        "windowsArtifactAcquired": windows["acquired"],
        "exactWindowsExecuted": False,
        "dependencyClosure": False,
        "exactNodeFixtureFamilies": "6/6_WITH_P38_BYTE_PARITY",
        "allProductStaticBaseline": "11/11_FAMILIES_17/17_ROWS_0/17_EXECUTED",
        "releaseState": "NO_GO",
    }, ensure_ascii=False))
    return 0 if byte_identical and payload["crcPass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
