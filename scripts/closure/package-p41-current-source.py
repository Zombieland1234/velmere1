#!/usr/bin/env python3
"""Create and verify two byte-identical P41 V16 CURRENT_SOURCE_ONLY archives."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import subprocess
import sys
import tempfile
from typing import Any, Iterable
import zipfile

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "artifacts/closure/p41"
MANIFEST = ART / "P41_SOURCE_ONLY_PACKAGE_MANIFEST.json"
EXCLUSIONS = ART / "P41_PACKAGE_EXCLUSIONS.json"
FIXED_ZIP_TIME = (1980, 1, 1, 0, 0, 0)
REVISION = "P41_V16_EXACT_WINDOWS_PREFLIGHT_CURRENT_ROOT_BRIDGE_REPAIR"
V16_SHA = "67816a5a9238668c8080a3a8cc623f078d268c1b78fddf534cb4893bb45490e9"
V15_SHA = "5cfbbfcbcef7242e30466f18bab3ad29cad859e485a909a4ee8658fb65e2f2c0"
P40_SOURCE = "81fd077bf390f2b1c6937d02703983ae9714849149a4c492f74f77b2446db9c7"
P40_ZIP_SHA = "c9d16106d849308dbd2950c7559259a15f69aee50fb3acd772d03c2b250e918d"
V16 = "docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V16_FULL_TOPOLOGY_FREE_LEGAL_CURRENT_WORLD_CLASS_2026-08-14.txt"
V15 = "docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V15_FREE_LEGAL_TOP_WORLD_2026-08-13.txt"
SOURCE_IDENTITY = "artifacts/closure/p41/source-identity.json"
STATUS = "artifacts/closure/p41/P41_STATUS.json"
AUTHORITY = "artifacts/closure/p41/CURRENT_AUTHORITY_P41.json"
LEDGER = "artifacts/closure/p41/VELMERE_CURRENT_STATE_AND_PASS_DELTA_LEDGER_P41_V16_2026-08-14.txt"
HANDOFF = "artifacts/closure/p41/P41_HANDOFF_MANIFEST.json"
POLICY = "config/p41/p41-exact-windows-current-root-closure-policy.json"
BRIDGE = "artifacts/closure/p41/P41_CURRENT_ROOT_BRIDGE_VERIFICATION.json"
SELF_TEST = "artifacts/closure/p41/P41_BRIDGE_SELF_TEST.json"
FAILURE_TEST = "artifacts/closure/p41/P41_FAILURE_RECEIPT_SELF_TEST.json"
FAILURE_RAW = "artifacts/closure/p41/P41_FAILURE_RECEIPT_SELF_TEST_RAW.json"
GITHUB_ATTEMPT = "artifacts/closure/p41/P41_GITHUB_WINDOWS_ATTEMPT_2026-08-14.json"
DEPENDENCY = "artifacts/closure/p41/P41_DEPENDENCY_GRAPH_CENSUS.json"
DIFFERENTIAL = "artifacts/closure/p41/P41_SOURCE_DIFFERENTIAL.json"
PREPACK = "artifacts/closure/p41/P41_PREPACK_CLOSURE_VERIFICATION.json"
WORKFLOW = ".github/workflows/p41-exact-windows-node24-current-root-closure.yml"
PROFILE_DIR = "artifacts/closure/p40/internal-fixture-profile-bindings"
REQUIRED_FILES = {
    V16, V15, SOURCE_IDENTITY, STATUS, AUTHORITY, LEDGER, HANDOFF, POLICY, BRIDGE,
    SELF_TEST, FAILURE_TEST, FAILURE_RAW, GITHUB_ATTEMPT, DEPENDENCY, DIFFERENTIAL,
    PREPACK, WORKFLOW,
    "scripts/pass41/run-p41-exact-windows-closure.mjs",
    "scripts/pass41/verify-p41-exact-windows-closure.py",
    "scripts/pass41/verify-p41-closure-receipts.py",
    "scripts/closure/build-p41-source-identity.py",
    "scripts/closure/build-p41-current-state.py",
    "scripts/closure/package-p41-current-source.py",
}
EXPECTED_PUBLIC_PEMS = tuple(
    f"config/release-verification/pass{number}-offline-candidate-public.pem"
    for number in range(4734, 4742)
)
EXCLUDED_COMPONENTS = {
    ".git", ".cache", ".mypy_cache", ".npm", ".parcel-cache", ".pnpm-store",
    ".pytest_cache", ".ruff_cache", ".turbo", ".velmere", "__pycache__", "node_modules",
}
EXCLUDED_ROOT_DIRECTORIES = {"coverage", "temp", "tmp", "p41-out"}
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


def canonical_json(value: Any) -> bytes:
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
    lower = pure.name.lower()
    if pure.suffix.lower() in {".log", ".sqlite", ".sqlite3"}:
        return rel not in {
            "artifacts/closure/p39/dependency-baseline/npm-ci-offline.stdout.log",
            "artifacts/closure/p39/dependency-baseline/npm-ci-offline.stderr.log",
        }
    if lower.endswith((".exitcode", ".stdout", ".stderr")) or ".stdout." in lower or ".stderr." in lower:
        return True
    if any(part.lower() in {"logs", "test-logs", "temporary-receipts", "npm-cache", "cas"} for part in pure.parts):
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
    def walk(directory: Path, rel_directory: PurePosixPath):
        with os.scandir(directory) as scan:
            entries = sorted(scan, key=lambda item: item.name.encode("utf-8"))
        for entry in entries:
            rel_path = rel_directory / entry.name
            rel = rel_path.as_posix()
            if excluded(rel, dynamic_exact):
                continue
            if entry.is_symlink():
                raise RuntimeError(f"included_symlink:{rel}")
            path = Path(entry.path)
            item_stat = entry.stat(follow_symlinks=False)
            if stat.S_ISDIR(item_stat.st_mode):
                yield from walk(path, rel_path)
            elif stat.S_ISREG(item_stat.st_mode):
                classification = None
                if PurePosixPath(rel).suffix.lower() == ".pem":
                    classification = pem_class(path.read_bytes())
                    if classification != "PUBLIC_ALLOWED":
                        raise RuntimeError(f"forbidden_pem:{rel}:{classification}")
                yield path, rel, item_stat, classification
            else:
                raise RuntimeError(f"included_special_file:{rel}:{item_stat.st_mode:o}")
    yield from walk(ROOT, PurePosixPath())


def inventory(dynamic_exact: set[str]) -> tuple[list[dict[str, Any]], list[str]]:
    rows: list[dict[str, Any]] = []
    public: list[str] = []
    casefold: dict[str, str] = {}
    for path, rel, item_stat, classification in iter_files(dynamic_exact):
        folded = rel.casefold()
        if folded in casefold and casefold[folded] != rel:
            raise RuntimeError(f"casefold_collision:{casefold[folded]}:{rel}")
        casefold[folded] = rel
        rows.append({"path": rel, "byteLength": item_stat.st_size, "mode": normalized_mode(item_stat.st_mode), "sha256": sha256_file(path)})
        if classification == "PUBLIC_ALLOWED":
            public.append(rel)
    rows.sort(key=lambda row: row["path"].encode("utf-8"))
    return rows, sorted(public, key=lambda value: value.encode("utf-8"))


def validate_secret_boundaries(rows: list[dict[str, Any]]) -> int:
    hits = 0
    for row in rows:
        pure = PurePosixPath(row["path"])
        if not pure.parts or pure.parts[0] not in ACTIVE_SOURCE_ROOTS or pure.suffix.lower() not in ACTIVE_SOURCE_SUFFIXES:
            continue
        if ACTIVE_CREDENTIAL_PATTERN.search((ROOT / row["path"]).read_bytes()):
            hits += 1
    if hits:
        raise RuntimeError(f"active_credential_literal_hits:{hits}")
    return hits


def load_json(rel: str) -> dict[str, Any]:
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def validate_source_identity() -> dict[str, Any]:
    identity = load_json(SOURCE_IDENTITY)
    for row in identity["files"]:
        path = ROOT / row["path"]
        if not path.is_file() or path.stat().st_size != row["byteLength"] or sha256_file(path) != row["sha256"]:
            raise RuntimeError(f"source_identity_row_drift:{row['path']}")
    path_set = sha256_bytes("\n".join(row["path"] for row in identity["files"]).encode("utf-8"))
    aggregate = sha256_bytes(b"".join(
        f'{row["path"]}\0{row["byteLength"]}\0{row["mode"]}\0{row["sha256"]}\n'.encode("utf-8")
        for row in identity["files"]
    ))
    if path_set != identity["pathSetSha256"] or aggregate != identity["sourceAggregateSha256"]:
        raise RuntimeError("source_identity_internal_digest_mismatch")
    if identity["parentSourceAggregateSha256"] != P40_SOURCE:
        raise RuntimeError("source_identity_parent_mismatch")
    return identity


def validate_required(rows: list[dict[str, Any]]) -> None:
    paths = {row["path"] for row in rows}
    missing = sorted(REQUIRED_FILES - paths)
    if missing:
        raise RuntimeError(f"required_package_files_missing:{missing}")
    profiles = sorted(path for path in paths if path.startswith(PROFILE_DIR + "/") and path.endswith(".json"))
    if len(profiles) != 33:
        raise RuntimeError(f"inherited_profile_receipt_count_not_33:{len(profiles)}")
    if sha256_file(ROOT / V16) != V16_SHA or sha256_file(ROOT / V15) != V15_SHA:
        raise RuntimeError("authority_hash_drift")


def row_for(path: Path, rel: str | None = None) -> dict[str, Any]:
    item_stat = path.stat()
    return {"path": rel or path.relative_to(ROOT).as_posix(), "byteLength": item_stat.st_size, "mode": normalized_mode(item_stat.st_mode), "sha256": sha256_file(path)}


def build_manifest(rows: list[dict[str, Any]], public: list[str], identity: dict[str, Any]) -> dict[str, Any]:
    path_set = sha256_bytes("\n".join(row["path"] for row in rows).encode("utf-8"))
    aggregate = sha256_bytes(b"".join(
        f'{row["path"]}\0{row["byteLength"]}\0{row["mode"]}\0{row["sha256"]}\n'.encode("utf-8")
        for row in rows
    ))
    bridge = load_json(BRIDGE)
    self_test = load_json(SELF_TEST)
    failure = load_json(FAILURE_TEST)
    attempt = load_json(GITHUB_ATTEMPT)
    dependency = load_json(DEPENDENCY)
    differential = load_json(DIFFERENTIAL)
    prepack = load_json(PREPACK)
    manifest: dict[str, Any] = {
        "schemaVersion": "velmere.p41.source-only-package-manifest.v1",
        "revision": REVISION,
        "generatedAt": "2026-08-14T10:20:00.000Z",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "releaseState": "NO_GO",
        "manifestEntriesExcludeManifestSelf": True,
        "fileCountExcludingManifestSelf": len(rows),
        "payloadBytesExcludingManifestSelf": sum(row["byteLength"] for row in rows),
        "pathSetSha256ExcludingManifestSelf": path_set,
        "packageAggregateSha256ExcludingManifestSelf": aggregate,
        "currentSourceIdentity": {key: identity[key] for key in ("fileCount", "payloadBytes", "pathSetSha256", "sourceAggregateSha256")},
        "authority": {
            "current": {"path": V16, "sha256": V16_SHA},
            "previousHistorical": {"path": V15, "sha256": V15_SHA},
            "parentRoot": "R44P46",
            "parentP40SourceAggregateSha256": P40_SOURCE,
            "parentP40ZipSha256": P40_ZIP_SHA,
        },
        "p41Closure": {
            "bridgeVerification": bridge["status"],
            "portableBridgeSelfTest": self_test["status"],
            "failureReceiptNegativeControl": failure["status"],
            "exactWindowsToolchainPreflight": attempt["exactWindowsToolchainPreflight"],
            "exactWindowsCurrentRootExecution": attempt["exactCurrentRootProjectExecution"],
            "lockPathsWithResolvedIntegrity": dependency["lockPathsWithResolvedIntegrity"],
            "uniqueResolvedIntegrityTarballs": dependency["uniqueResolvedIntegrityTarballs"],
            "dependencyClosure": False,
            "sourceDifferentialAdded": len(differential["added"]),
            "sourceDifferentialModified": len(differential["modified"]),
            "sourceDifferentialRemoved": len(differential["removed"]),
            "prepackVerification": prepack["status"],
            "inheritedExactNodeBoundInternalFixtureProfiles": "27/33",
            "candidateFieldRows": 176,
            "fieldRightsPassed": "0/176",
            "currentCustomerOutputs": "0/17",
            "saleEligibleRows": "0/17",
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
            "cleanPackage": True,
            "currentRootBridgeSourceAndPortableVerification": True,
            "exactWindowsToolchainPreflight": True,
            "exactWindowsCurrentRootExecution": False,
            "dependencyClosure": False,
            "typecheckLintDualBuild": False,
            "browser": False,
            "pdf": False,
            "customerOutput": False,
            "fieldRights": False,
            "materialValue": False,
            "goInternal": False,
            "goPaid": False,
            "live": False,
            "worldClassProven": False,
        },
        "truthBoundary": "P41 is a deterministic NO_GO handoff that repairs and portably verifies the exact-Windows current-root closure bridge and binds an observed exact Windows/Node/npm setup. Native current-root npm ci, dependency CAS, semantic checks, dual builds and all downstream product gates remain open.",
    }
    manifest["integritySha256"] = sha256_bytes(canonical_json(manifest))
    return manifest


def write_zip(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9, allowZip64=True) as archive:
        for row in rows:
            info = zipfile.ZipInfo(row["path"], FIXED_ZIP_TIME)
            info.create_system = 3
            info.external_attr = (row["mode"] & 0xFFFF) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            info.flag_bits = 0x800
            archive.writestr(info, (ROOT / row["path"]).read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)


def verify_archive(path: Path, rows: list[dict[str, Any]]) -> dict[str, Any]:
    expected = {row["path"]: row for row in rows}
    with zipfile.ZipFile(path) as archive:
        bad = archive.testzip()
        names = archive.namelist()
        if len(names) != len(set(names)):
            raise RuntimeError("duplicate_zip_entry")
        if set(names) != set(expected):
            raise RuntimeError(f"zip_path_set_mismatch:{len(names)}:{len(expected)}")
        total = 0
        for info in archive.infolist():
            data = archive.read(info.filename)
            row = expected[info.filename]
            if len(data) != row["byteLength"] or sha256_bytes(data) != row["sha256"]:
                raise RuntimeError(f"zip_content_mismatch:{info.filename}")
            if info.date_time != FIXED_ZIP_TIME:
                raise RuntimeError(f"zip_timestamp_drift:{info.filename}")
            total += len(data)
    return {"crcPass": bad is None, "entries": len(rows), "uncompressedBytes": total}


def verify_clean_unpack(path: Path, rows: list[dict[str, Any]]) -> dict[str, Any]:
    temporary = Path(tempfile.mkdtemp(prefix="p41-clean-unpack-", dir="/mnt/data"))
    rebuilt = temporary.parent / f"{temporary.name}-source-identity.json"
    verifier_output = temporary.parent / f"{temporary.name}-prepack-verification.json"
    try:
        with zipfile.ZipFile(path) as archive:
            archive.extractall(temporary)
        for row in rows:
            target = temporary / row["path"]
            if not target.is_file() or target.stat().st_size != row["byteLength"] or sha256_file(target) != row["sha256"]:
                raise RuntimeError(f"clean_unpack_content_mismatch:{row['path']}")
            os.chmod(target, int(row["mode"]))
        result = subprocess.run(
            [sys.executable, str(temporary / "scripts/closure/build-p41-source-identity.py"), "--output", str(rebuilt)],
            cwd=temporary, capture_output=True, text=True, check=False,
        )
        if result.returncode != 0:
            raise RuntimeError(f"clean_unpack_source_identity_failed:{result.stdout}:{result.stderr}")
        packaged_identity = json.loads((temporary / SOURCE_IDENTITY).read_text(encoding="utf-8"))
        rebuilt_identity = json.loads(rebuilt.read_text(encoding="utf-8"))
        for key in ("sourceAggregateSha256", "pathSetSha256", "fileCount", "payloadBytes"):
            if rebuilt_identity[key] != packaged_identity[key]:
                raise RuntimeError(f"clean_unpack_source_identity_mismatch:{key}")
        verify = subprocess.run(
            [sys.executable, "scripts/pass41/verify-p41-closure-receipts.py", "--root", ".", "--output", str(verifier_output)],
            cwd=temporary, capture_output=True, text=True, check=False,
        )
        if verify.returncode != 0:
            raise RuntimeError(f"clean_unpack_p41_verifier_failed:{verify.stdout}:{verify.stderr}")
        verifier_receipt = json.loads(verifier_output.read_text(encoding="utf-8"))
        if verifier_receipt.get("status") != "PASS":
            raise RuntimeError("clean_unpack_p41_verifier_receipt_not_pass")
        return {
            "pathContentIdentity": True,
            "sourceIdentity": True,
            "p41Verifier": True,
            "sourceAggregateSha256": rebuilt_identity["sourceAggregateSha256"],
            "fileCount": rebuilt_identity["fileCount"],
            "verifierStdoutSha256": sha256_bytes(verify.stdout.encode("utf-8")),
        }
    finally:
        shutil.rmtree(temporary, ignore_errors=True)
        rebuilt.unlink(missing_ok=True)
        verifier_output.unlink(missing_ok=True)


def files_equal(left_path: Path, right_path: Path) -> bool:
    if left_path.stat().st_size != right_path.stat().st_size:
        return False
    with left_path.open("rb") as left, right_path.open("rb") as right:
        while True:
            left_chunk, right_chunk = left.read(1024 * 1024), right.read(1024 * 1024)
            if left_chunk != right_chunk:
                return False
            if not left_chunk:
                return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--copy-b", required=True)
    parser.add_argument("--receipt", required=True)
    parser.add_argument("--external-ledger", required=True)
    args = parser.parse_args()
    output, copy_b, receipt_path, external_ledger = map(
        lambda value: Path(value).resolve(),
        (args.output, args.copy_b, args.receipt, args.external_ledger),
    )
    for path, label in (
        (output, "output"), (copy_b, "copy_b"), (receipt_path, "receipt"),
        (external_ledger, "external_ledger"), (MANIFEST, "manifest"), (EXCLUSIONS, "exclusions"),
    ):
        reject_output(path, label)
    dynamic_exact = {
        rel for rel in (
            within_root(output), within_root(copy_b), within_root(receipt_path),
            within_root(external_ledger), within_root(MANIFEST),
        ) if rel
    }

    ART.mkdir(parents=True, exist_ok=True)
    exclusions: dict[str, Any] = {
        "schemaVersion": "velmere.p41.source-only-package-exclusions.v1",
        "revision": REVISION,
        "generatedAt": "2026-08-14T10:20:00.000Z",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "releaseState": "NO_GO",
        "excludedComponents": sorted(EXCLUDED_COMPONENTS),
        "excludedRootDirectories": sorted(EXCLUDED_ROOT_DIRECTORIES),
        "excludedPrefixes": list(EXCLUDED_PREFIXES),
        "excludedExactPaths": sorted(EXCLUDED_EXACT_PATHS),
        "dynamicOutputSelfExclusions": sorted(dynamic_exact),
        "externalFontMaterialsIncluded": False,
        "physicalPdfBrowserCorporaIncluded": False,
        "privateOrAmbiguousPemIncluded": False,
    }
    exclusions["integritySha256"] = sha256_bytes(canonical_json(exclusions))
    EXCLUSIONS.write_text(json.dumps(exclusions, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    rows, public = inventory(dynamic_exact)
    active_hits = validate_secret_boundaries(rows)
    identity = validate_source_identity()
    validate_required(rows)
    if set(public) != set(EXPECTED_PUBLIC_PEMS):
        raise RuntimeError(f"public_pem_set_mismatch:{public}")

    manifest = build_manifest(rows, public, identity)
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    package_rows = sorted([*rows, row_for(MANIFEST)], key=lambda row: row["path"].encode("utf-8"))

    write_zip(output, package_rows)
    write_zip(copy_b, package_rows)
    sha_a, sha_b = sha256_file(output), sha256_file(copy_b)
    byte_identical = sha_a == sha_b and files_equal(output, copy_b)
    verify_a, verify_b = verify_archive(output, package_rows), verify_archive(copy_b, package_rows)
    clean_a, clean_b = verify_clean_unpack(output, package_rows), verify_clean_unpack(copy_b, package_rows)
    if not byte_identical or not verify_a["crcPass"] or not verify_b["crcPass"]:
        raise RuntimeError("deterministic_package_verification_failed")

    attempt = load_json(GITHUB_ATTEMPT)
    dependency = load_json(DEPENDENCY)
    differential = load_json(DIFFERENTIAL)
    payload: dict[str, Any] = {
        "schemaVersion": "velmere.p41.deterministic-source-only-package-receipt.v1",
        "revision": REVISION,
        "generatedAt": "2026-08-14T10:25:00.000Z",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "releaseState": "NO_GO",
        "archive": str(output),
        "copyB": str(copy_b),
        "sha256": sha_a,
        "copyBSha256": sha_b,
        "byteIdentical": byte_identical,
        "crcPass": verify_a["crcPass"] and verify_b["crcPass"],
        "entries": verify_a["entries"],
        "uncompressedBytes": verify_a["uncompressedBytes"],
        "zipBytes": output.stat().st_size,
        "sourceIdentitySha256": sha256_file(ROOT / SOURCE_IDENTITY),
        "sourceAggregateSha256": identity["sourceAggregateSha256"],
        "manifestSha256": sha256_file(MANIFEST),
        "cleanUnpackA": clean_a,
        "cleanUnpackB": clean_b,
        "publicPemsIncluded": len(public),
        "privateOrAmbiguousPemsIncluded": 0,
        "activeCredentialLiteralHits": active_hits,
        "authority": {"v16": V16_SHA, "v15Historical": V15_SHA, "parentRoot": "R44P46"},
        "p41": {
            "exactWindowsToolchainPreflight": attempt["exactWindowsToolchainPreflight"],
            "exactWindowsCurrentRootExecution": attempt["exactCurrentRootProjectExecution"],
            "portableBridgeVerification": load_json(BRIDGE)["status"],
            "portableBridgeSelfTest": load_json(SELF_TEST)["status"],
            "failureReceiptNegativeControl": load_json(FAILURE_TEST)["status"],
            "lockPathsWithResolvedIntegrity": dependency["lockPathsWithResolvedIntegrity"],
            "uniqueResolvedIntegrityTarballs": dependency["uniqueResolvedIntegrityTarballs"],
            "dependencyClosure": False,
            "sourceAdded": len(differential["added"]),
            "sourceModified": len(differential["modified"]),
            "sourceRemoved": len(differential["removed"]),
            "inheritedExactNodeBoundInternalFixtureProfiles": "27/33",
            "candidateFieldRows": 176,
            "candidateFieldRightsPassed": "0/176",
            "currentCustomerOutputs": "0/17",
            "saleEligibleRows": "0/17",
        },
        "releaseGates": {
            "exactWindowsCurrentRoot": False,
            "dependencyClosure": False,
            "typecheck": False,
            "lint": False,
            "webpack": False,
            "turbopack": False,
            "browserDistinctSkuExecutions": "0/3",
            "pdfIndependentReplay": "0/1",
            "materialDeltaTransitions": "0/6",
            "convergence": "0/3",
            "goInternal": False,
            "finalAiValidationReady": False,
            "pilotReady": False,
            "goPaid": False,
            "live": False,
            "worldClassProven": False,
        },
        "truthBoundary": "P41 deterministically packages the exact-Windows current-root bridge repair and bounded portable/native-preflight evidence. Successful native current-root dependency, semantic, dual-build and downstream product closure remain open.",
    }
    payload["integritySha256"] = sha256_bytes(canonical_json(payload))
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    internal_ledger = (ROOT / LEDGER).read_text(encoding="utf-8")
    external_append = f"""
======================================================================
FINAL EXTERNAL PACKAGE HANDOFF RECEIPT
======================================================================

Package file:
{output.name}

Package SHA-256:
{sha_a}

Deterministic copy-B SHA-256:
{sha_b}

Package verification:
- 2/2 byte-identical ZIPs: PASS
- CRC A/B: PASS
- clean-unpack path/content identity A/B: PASS
- clean-unpack source identity A/B: PASS
- clean-unpack P41 verifier A/B: PASS
- archive entries: {verify_a['entries']}
- archive bytes: {output.stat().st_size}
- uncompressed bytes: {verify_a['uncompressedBytes']}
- current source identity rows: {identity['fileCount']}
- current source aggregate SHA-256: {identity['sourceAggregateSha256']}
- expected public verification PEMs: {len(public)}/8
- private or ambiguous PEMs: 0
- active credential literal hits: 0
- V16 exact SHA-256: {V16_SHA}
- exact Windows Server 2025 x64 / Node 24.18.0 / npm 11.16.0 toolchain preflight: PASS
- exact Windows current-root product execution: 0/1
- dependency denominator: {dependency['lockPathsWithResolvedIntegrity']} lock paths / {dependency['uniqueResolvedIntegrityTarballs']} unique tarballs
- online/offline npm ci and SRI CAS closure: 0/1
- TypeScript / ESLint / Webpack / Turbopack: 0/4
- current-root bridge portable verification: PASS
- portable bridge self-test: PASS
- failure-receipt negative control: PASS
- exact-Node-bound inherited internal fixture profiles: 27/33
- candidate field rows: 176
- current field-rights rows passed: 0/176
- physical current customer outputs: 0/17
- sale-eligible customer rows: 0/17

FINAL RELEASE BOUNDARY
CURRENT_SOURCE_ONLY_IN_PROGRESS / NO_GO
GO_INTERNAL=false | FINAL_AI_VALIDATION_READY=false | PILOT_READY=false |
GO_PAID=false | LIVE=false | WORLD_CLASS_PROVEN=false
"""
    external_ledger.parent.mkdir(parents=True, exist_ok=True)
    external_ledger.write_text(internal_ledger + external_append.lstrip("\n"), encoding="utf-8")

    print(json.dumps({
        "status": "PASS_P41_DETERMINISTIC_CURRENT_SOURCE_ONLY_PACKAGE",
        "sha256": sha_a,
        "byteIdentical": byte_identical,
        "crcPass": payload["crcPass"],
        "entries": payload["entries"],
        "zipBytes": payload["zipBytes"],
        "sourceAggregateSha256": identity["sourceAggregateSha256"],
        "exactWindowsToolchainPreflight": "1/1",
        "exactWindowsCurrentRootExecution": "0/1",
        "dependencyClosure": "0/1",
        "semanticDualBuild": "0/4",
        "customerOutputs": "0/17",
        "saleEligible": "0/17",
        "externalLedgerSha256": sha256_file(external_ledger),
        "releaseState": "NO_GO",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
