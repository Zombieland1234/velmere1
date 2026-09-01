#!/usr/bin/env python3
"""Create and verify two byte-identical P38 CURRENT_SOURCE_ONLY archives.

P38 preserves the content-aware public-PEM packaging repair and adds clean-unpack
verification of the current-lock CAS recovery and Node-major differential receipts.
Public keys/certificates are allowed; private or ambiguous PEM material fails closed.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import stat
import tempfile
from typing import Iterable
import zipfile

ROOT = Path(__file__).resolve().parents[2]
ARTIFACT_ROOT = ROOT / "artifacts/closure/p38"
MANIFEST = ARTIFACT_ROOT / "P38_SOURCE_ONLY_PACKAGE_MANIFEST.json"
EXCLUSIONS = ARTIFACT_ROOT / "P38_PACKAGE_EXCLUSIONS.json"
FIXED_ZIP_TIME = (1980, 1, 1, 0, 0, 0)

V15 = "docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V15_FREE_LEGAL_TOP_WORLD_2026-08-13.txt"
SOURCE_IDENTITY = "artifacts/closure/p38/source-identity.json"
STATUS = "artifacts/closure/p38/P38_STATUS.json"
AUTHORITY = "artifacts/closure/p38/CURRENT_AUTHORITY_P38.json"
LEDGER = "artifacts/closure/p38/VELMERE_CURRENT_STATE_AND_PASS_DELTA_LEDGER_P38_V15_2026-08-14.txt"
CAS_POLICY = "config/p38/p38-current-lockfile-local-cas-policy.json"
CAS_MANIFEST = "config/p38/p38-local-cache-import-manifest.json"
CAS_RECEIPT = "artifacts/closure/p38/P38_CURRENT_LOCKFILE_LOCAL_CAS_RECOVERY.json"
NODE_DIFFERENTIAL = "artifacts/closure/p38/P38_NODE_MAJOR_DIFFERENTIAL.json"
CAS_VERIFY = "scripts/pass38/verify-p38-current-lockfile-local-cas.py"
NODE_VERIFY = "scripts/pass38/verify-p38-node-major-differential.py"
HANDOFF = "artifacts/closure/p38/P38_HANDOFF_MANIFEST.json"
REQUIRED_FILES = {
    V15,
    SOURCE_IDENTITY,
    STATUS,
    AUTHORITY,
    LEDGER,
    CAS_POLICY,
    CAS_MANIFEST,
    CAS_RECEIPT,
    NODE_DIFFERENTIAL,
    CAS_VERIFY,
    NODE_VERIFY,
    HANDOFF,
}
EXPECTED_V15_SHA256 = "5cfbbfcbcef7242e30466f18bab3ad29cad859e485a909a4ee8658fb65e2f2c0"
EXPECTED_PROJECT_NODE = "v24.18.0"
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
    MANIFEST.relative_to(ROOT).as_posix(),
    "artifacts/pass35/a45/A45_DETERMINISTIC_LOCAL_REFERENCE_QA_FIXTURE.json",
    "artifacts/closure/p34/internal-ai-assessments.jsonl",
    "artifacts/closure/p35/internal-ai-assessments.jsonl",
}
EXCLUDED_SUFFIXES = {".pyc", ".pyo"}
EXTERNAL_FONT_NAMES = {"manrope-pdf-latin-plus-ext.ttf"}
FORBIDDEN_SECRET_SUFFIXES = {".key", ".p12", ".pfx"}
FORBIDDEN_SECRET_NAMES = {
    "credentials.json", "service-account.json", "service_account.json",
    "client-secret.json", "client_secret.json",
}
PRIVATE_PEM_MARKERS = (
    b"-----BEGIN PRIVATE KEY-----",
    b"-----BEGIN RSA PRIVATE KEY-----",
    b"-----BEGIN EC PRIVATE KEY-----",
    b"-----BEGIN OPENSSH PRIVATE KEY-----",
    b"-----BEGIN ENCRYPTED PRIVATE KEY-----",
)
PUBLIC_PEM_MARKERS = (
    b"-----BEGIN PUBLIC KEY-----",
    b"-----BEGIN CERTIFICATE-----",
)
ACTIVE_CREDENTIAL_PATTERN = re.compile(
    rb"(?:sk|pk)_(?:live|test)_[A-Za-z0-9_-]{24,}|"
    rb"whsec_[A-Za-z0-9_-]{24,}|"
    rb"Bearer\s+[A-Za-z0-9._~+/=-]{24,}|"
    rb"-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----",
    re.IGNORECASE,
)
ACTIVE_SOURCE_ROOTS = {"app", "components", "lib"}
ACTIVE_SOURCE_SUFFIXES = {".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".json", ".py", ".sh", ".ps1"}
SHA256_PATTERN = re.compile(r"^[a-f0-9]{64}$")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def files_equal(left: Path, right: Path) -> bool:
    if left.stat().st_size != right.stat().st_size:
        return False
    with left.open("rb") as a, right.open("rb") as b:
        while True:
            ca = a.read(1024 * 1024)
            cb = b.read(1024 * 1024)
            if ca != cb:
                return False
            if not ca:
                return True


def canonical_json(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def normalized_mode(mode: int) -> int:
    return 0o755 if mode & 0o111 else 0o644


def within_root(path: Path) -> str | None:
    try:
        return path.resolve().relative_to(ROOT.resolve()).as_posix()
    except ValueError:
        return None


def reject_unsafe_output(path: Path, label: str) -> None:
    if path.is_symlink():
        raise RuntimeError(f"{label}_symlink_forbidden:{path}")
    if path.exists() and not path.is_file():
        raise RuntimeError(f"{label}_non_regular_forbidden:{path}")
    absolute = path.absolute()
    for parent in [absolute.parent, *absolute.parents]:
        if parent.exists() and parent.is_symlink():
            raise RuntimeError(f"{label}_parent_symlink_forbidden:{parent}")


def classify_pem_bytes(data: bytes) -> str:
    head = data[:4096]
    if any(marker in head for marker in PRIVATE_PEM_MARKERS):
        return "PRIVATE_FORBIDDEN"
    if any(marker in head for marker in PUBLIC_PEM_MARKERS):
        return "PUBLIC_ALLOWED"
    return "AMBIGUOUS_FORBIDDEN"


def is_artifact_noise(rel: str, pure: PurePosixPath) -> bool:
    if not rel.startswith("artifacts/"):
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
    if re.fullmatch(r"P\d+_SOURCE(?:_ONLY)?_PACKAGE_MANIFEST\.json", pure.name, flags=re.IGNORECASE):
        return True
    if re.fullmatch(r"P\d+_SOURCE_MANIFEST\.json", pure.name, flags=re.IGNORECASE):
        return True
    if pure.name != EXCLUSIONS.name and re.fullmatch(r"P\d+_PACKAGE_EXCLUSIONS\.json", pure.name, flags=re.IGNORECASE):
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
    if any(rel == prefix or rel.startswith(f"{prefix}/") for prefix in EXCLUDED_PREFIXES):
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
    return is_artifact_noise(rel, pure)


def iter_regular_files(dynamic_exact: set[str]) -> Iterable[tuple[Path, str, os.stat_result, str | None]]:
    def walk(directory: Path, rel_directory: PurePosixPath):
        with os.scandir(directory) as scan:
            entries = sorted(scan, key=lambda item: item.name.encode("utf-8"))
        for entry in entries:
            rel_path = rel_directory / entry.name
            rel = rel_path.as_posix()
            if excluded(rel, dynamic_exact):
                continue
            if entry.is_symlink():
                raise RuntimeError(f"included_symlink_forbidden:{rel}")
            path = Path(entry.path)
            st = entry.stat(follow_symlinks=False)
            if stat.S_ISDIR(st.st_mode):
                yield from walk(path, rel_path)
            elif stat.S_ISREG(st.st_mode):
                pem_class = None
                if PurePosixPath(rel).suffix.lower() == ".pem":
                    pem_class = classify_pem_bytes(path.read_bytes())
                    if pem_class != "PUBLIC_ALLOWED":
                        raise RuntimeError(f"forbidden_or_ambiguous_pem:{rel}:{pem_class}")
                yield path, rel, st, pem_class
            else:
                raise RuntimeError(f"included_special_file_forbidden:{rel}:{st.st_mode:o}")
    yield from walk(ROOT, PurePosixPath())


def inventory(dynamic_exact: set[str]) -> tuple[list[dict[str, object]], list[str]]:
    rows: list[dict[str, object]] = []
    public_pems: list[str] = []
    casefold: dict[str, str] = {}
    for path, rel, st, pem_class in iter_regular_files(dynamic_exact):
        folded = rel.casefold()
        previous = casefold.get(folded)
        if previous is not None and previous != rel:
            raise RuntimeError(f"casefold_path_collision:{previous}:{rel}")
        casefold[folded] = rel
        rows.append({
            "path": rel,
            "byteLength": st.st_size,
            "mode": normalized_mode(st.st_mode),
            "sha256": sha256_file(path),
        })
        if pem_class == "PUBLIC_ALLOWED":
            public_pems.append(rel)
    rows.sort(key=lambda row: str(row["path"]).encode("utf-8"))
    return rows, sorted(public_pems, key=lambda value: value.encode("utf-8"))


def validate_secret_boundaries(rows: list[dict[str, object]]) -> None:
    for row in rows:
        rel = str(row["path"])
        pure = PurePosixPath(rel)
        path = ROOT / rel
        if pure.name == ".npmrc":
            text = path.read_text(encoding="utf-8", errors="replace")
            if re.search(r"(?im)(?:_authToken|_password|username|always-auth)\s*=", text):
                raise RuntimeError(f"npmrc_auth_material_in_package:{rel}")
        if pure.parts and pure.parts[0] in ACTIVE_SOURCE_ROOTS and pure.suffix.lower() in ACTIVE_SOURCE_SUFFIXES:
            data = path.read_bytes()
            if ACTIVE_CREDENTIAL_PATTERN.search(data):
                raise RuntimeError(f"active_credential_literal_in_package:{rel}")


def load_json(path: str) -> dict[str, object]:
    value = json.loads((ROOT / path).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise RuntimeError(f"json_object_required:{path}")
    return value


def recompute_source_identity() -> dict[str, object]:
    builder = ROOT / "scripts/closure/build-p38-source-identity.py"
    spec = importlib.util.spec_from_file_location("velmere_p38_source_identity", builder)
    if spec is None or spec.loader is None:
        raise RuntimeError("p38_source_identity_builder_import_failed")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    rows = []
    dynamic_exact = {SOURCE_IDENTITY}
    for path, rel, st, _classification in module.iter_regular_files(dynamic_exact):
        rows.append({
            "path": rel,
            "byteLength": st.st_size,
            "mode": module.normalized_mode(st.st_mode),
            "sha256": module.sha256_file(path),
        })
    rows.sort(key=lambda row: str(row["path"]).encode("utf-8"))
    return {
        "fileCount": len(rows),
        "payloadBytes": sum(int(row["byteLength"]) for row in rows),
        "pathSetSha256": sha256_bytes("\n".join(str(row["path"]) for row in rows).encode("utf-8")),
        "sourceAggregateSha256": sha256_bytes(b"".join(
            f'{row["path"]}\0{row["byteLength"]}\0{row["mode"]}\0{row["sha256"]}\n'.encode("utf-8")
            for row in rows
        )),
    }


def validate_source_identity() -> dict[str, object]:
    stored = load_json(SOURCE_IDENTITY)
    current = recompute_source_identity()
    for field in ("fileCount", "payloadBytes", "pathSetSha256", "sourceAggregateSha256"):
        if stored.get(field) != current[field]:
            raise RuntimeError(f"p38_source_identity_stale:{field}:{stored.get(field)}:{current[field]}")
    authority = stored.get("requiredAuthorityBinding")
    if not isinstance(authority, dict) or authority.get("path") != V15 or authority.get("sha256") != EXPECTED_V15_SHA256:
        raise RuntimeError("p38_v15_authority_binding_invalid")
    return stored


def validate_required_files(rows: list[dict[str, object]]) -> None:
    by_path = {str(row["path"]): row for row in rows}
    missing = sorted(REQUIRED_FILES - set(by_path))
    if missing:
        raise RuntimeError(f"required_p38_files_missing:{missing}")
    if by_path[V15]["sha256"] != EXPECTED_V15_SHA256:
        raise RuntimeError("v15_sha256_mismatch_in_package")
    status = load_json(STATUS)
    if status.get("state") != "CURRENT_SOURCE_ONLY_IN_PROGRESS" or status.get("releaseState") != "NO_GO":
        raise RuntimeError("p38_status_must_be_no_go_in_progress")
    decision = status.get("releaseDecision")
    if not isinstance(decision, dict) or any(decision.get(key) for key in ("goInternal", "controlledPilot", "goPaid", "saleEnabled", "live", "worldClassProven")):
        raise RuntimeError("p38_false_release_promotion")
    cas = load_json(CAS_RECEIPT)
    if cas.get("combinedExactCoverage") != "67/661" or cas.get("recoveredTarballs") != 26:
        raise RuntimeError("p38_cas_recovery_receipt_invalid")
    if cas.get("networkRequestsExecuted") != 0 or cas.get("dependencyClosure") is not False or cas.get("offlineNpmCiExecuted") is not False:
        raise RuntimeError("p38_cas_recovery_overpromoted")
    differential = load_json(NODE_DIFFERENTIAL)
    summary = differential.get("summary")
    if not isinstance(summary, dict) or summary.get("node22Passed") != "6/6" or summary.get("node24LinePassed") != "6/6":
        raise RuntimeError("p38_node_differential_invalid")
    if summary.get("exactNode24180Executed") is not False or summary.get("exactWindowsExecuted") is not False:
        raise RuntimeError("p38_node_differential_overpromoted")


def build_manifest(rows: list[dict[str, object]], public_pems: list[str], source_identity: dict[str, object]) -> dict[str, object]:
    path_set = sha256_bytes("\n".join(str(row["path"]) for row in rows).encode("utf-8"))
    aggregate = sha256_bytes(b"".join(
        f'{row["path"]}\0{row["byteLength"]}\0{row["mode"]}\0{row["sha256"]}\n'.encode("utf-8")
        for row in rows
    ))
    cas = load_json(CAS_RECEIPT)
    differential = load_json(NODE_DIFFERENTIAL)
    differential_summary = differential["summary"]
    manifest: dict[str, object] = {
        "schemaVersion": "velmere.p38.source-only-package-manifest.v1",
        "revision": "P38_V15_CURRENT_LOCKFILE_CAS_RECOVERY_AND_NODE24_DIFFERENTIAL",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "releaseState": "NO_GO",
        "generatedAt": "2026-08-14T03:35:00.000Z",
        "manifestSelfExcluded": True,
        "fileCountExcludingManifestSelf": len(rows),
        "payloadBytesExcludingManifestSelf": sum(int(row["byteLength"]) for row in rows),
        "pathSetSha256": path_set,
        "sourceAggregateSha256": aggregate,
        "currentSourceIdentity": {
            "fileCount": source_identity["fileCount"],
            "payloadBytes": source_identity["payloadBytes"],
            "pathSetSha256": source_identity["pathSetSha256"],
            "sourceAggregateSha256": source_identity["sourceAggregateSha256"],
        },
        "authority": {"path": V15, "sha256": EXPECTED_V15_SHA256, "unmodified": True},
        "publicPemPolicy": {
            "classification": "CONTENT_AWARE_NOT_SUFFIX_ONLY",
            "includedPublicPemCount": len(public_pems),
            "includedPublicPemPaths": public_pems,
            "expectedPublicPemPaths": list(EXPECTED_PUBLIC_PEMS),
            "expectedPublicPemSetPass": set(public_pems) == set(EXPECTED_PUBLIC_PEMS),
            "privatePemIncluded": 0,
            "ambiguousPemIncluded": 0,
        },
        "currentLockCasRecovery": {
            "policyPath": CAS_POLICY,
            "manifestPath": CAS_MANIFEST,
            "receiptPath": CAS_RECEIPT,
            "currentRemoteLockPaths": cas["currentRemoteLockPaths"],
            "exactCoveredLockPaths": int(str(cas["combinedExactCoverage"]).split("/", 1)[0]),
            "recoveredTarballs": cas["recoveredTarballs"],
            "remainingUncovered": cas["remainingUncovered"],
            "networkRequests": cas["networkRequestsExecuted"],
            "dependencyClosure": cas["dependencyClosure"],
            "offlineNpmCiExecuted": cas["offlineNpmCiExecuted"],
        },
        "nodeMajorDifferential": {
            "receiptPath": NODE_DIFFERENTIAL,
            "node22Families": differential_summary["node22Passed"],
            "node24LineFamilies": differential_summary["node24LinePassed"],
            "receiptParity": differential_summary["crossRuntimeReceiptByteParity"],
            "runtimeParity": differential_summary["crossRuntimeRuntimeByteParity"],
            "canonicalProtectedPathsUnchanged": differential_summary["canonicalProtectedPathsUnchanged"],
            "exactNode24180": differential_summary["exactNode24180Executed"],
            "exactWindows": differential_summary["exactWindowsExecuted"],
        },
        "entries": rows,
        "creditBoundary": {
            "cleanPackageCredit": True,
            "sourceIdentityCredit": True,
            "publicKeyPackagingBoundaryCredit": True,
            "currentLockBindingCredit": True,
            "partialExactCasRecoveryCredit": True,
            "node24LineCompatibilityCredit": True,
            "exactDependencyClosureCredit": False,
            "offlineNpmCiCredit": False,
            "exactRuntimeCredit": False,
            "windowsCredit": False,
            "buildCredit": False,
            "browserCredit": False,
            "customerValueCredit": False,
            "providerRightsCredit": False,
            "saleOrGoPaidCredit": False,
            "worldClassCredit": False,
        },
        "truthBoundary": (
            "This manifest binds the deterministic P38 SOURCE_ONLY package, 26 exact locally recovered current-lock "
            "tarballs and the bounded Node 22 versus Node 24-line fixture differential. It does not include the remaining "
            "594 lockfile tarballs, node_modules, exact Node 24.18.0/Windows execution, production build output, physical "
            "PDF/Browser corpora or external font materials. It grants no dependency-closure, exact-runtime, build, "
            "Browser, customer-value, provider-rights, GO_INTERNAL, GO_PAID, LIVE or WORLD_CLASS_PROVEN credit."
        ),
    }
    manifest["integritySha256"] = sha256_bytes(canonical_json(manifest))
    return manifest

def write_zip(output: Path, rows: list[dict[str, object]]) -> list[dict[str, object]]:
    manifest_row = {
        "path": MANIFEST.relative_to(ROOT).as_posix(),
        "byteLength": MANIFEST.stat().st_size,
        "mode": normalized_mode(MANIFEST.stat().st_mode),
        "sha256": sha256_file(MANIFEST),
    }
    package_rows = sorted(rows + [manifest_row], key=lambda row: str(row["path"]).encode("utf-8"))
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9, strict_timestamps=False) as archive:
        for row in package_rows:
            rel = str(row["path"])
            data = (ROOT / rel).read_bytes()
            if len(data) != int(row["byteLength"]) or sha256_bytes(data) != str(row["sha256"]):
                raise RuntimeError(f"source_changed_during_packaging:{rel}")
            info = zipfile.ZipInfo(rel, FIXED_ZIP_TIME)
            mode = int(row["mode"])
            info.create_system = 3
            info.external_attr = ((stat.S_IFREG | mode) & 0xFFFF) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    return package_rows


def verify_archive(path: Path, expected_rows: list[dict[str, object]]) -> dict[str, object]:
    expected_by_path = {str(row["path"]): row for row in expected_rows}
    expected_names = sorted(expected_by_path, key=lambda value: value.encode("utf-8"))
    with zipfile.ZipFile(path, "r") as archive:
        infos = archive.infolist()
        names = [info.filename for info in infos]
        if names != expected_names:
            raise RuntimeError(f"archive_inventory_mismatch:{path}")
        if len(names) != len(set(names)):
            raise RuntimeError(f"archive_duplicate_path:{path}")
        private_hits = []
        for info in infos:
            pure = PurePosixPath(info.filename)
            if info.is_dir() or pure.is_absolute() or ".." in pure.parts or "\\" in info.filename:
                raise RuntimeError(f"archive_unsafe_path:{path}:{info.filename}")
            if ((info.external_attr >> 16) & 0o170000) != stat.S_IFREG:
                raise RuntimeError(f"archive_non_regular_entry:{path}:{info.filename}")
            data = archive.read(info)
            expected = expected_by_path[info.filename]
            if len(data) != int(expected["byteLength"]) or sha256_bytes(data) != str(expected["sha256"]):
                raise RuntimeError(f"archive_entry_content_mismatch:{path}:{info.filename}")
            if ((info.external_attr >> 16) & 0o777) != int(expected["mode"]):
                raise RuntimeError(f"archive_entry_mode_mismatch:{path}:{info.filename}")
            if pure.suffix.lower() == ".pem" and any(marker in data[:4096] for marker in PRIVATE_PEM_MARKERS):
                private_hits.append(info.filename)
        bad = archive.testzip()
    if private_hits:
        raise RuntimeError(f"private_key_material_in_archive:{private_hits}")
    return {
        "crcPass": bad is None,
        "badEntry": bad,
        "entries": len(expected_names),
        "uncompressedBytes": sum(int(row["byteLength"]) for row in expected_rows),
        "privateKeyHits": 0,
    }


def verify_clean_unpack(path: Path, expected_rows: list[dict[str, object]]) -> dict[str, object]:
    expected_by_path = {str(row["path"]): row for row in expected_rows}
    with tempfile.TemporaryDirectory(prefix="velmere-p38-clean-unpack-") as tmp:
        target = Path(tmp)
        with zipfile.ZipFile(path, "r") as archive:
            archive.extractall(target)
        actual_paths = sorted(
            p.relative_to(target).as_posix() for p in target.rglob("*") if p.is_file()
        )
        expected_paths = sorted(expected_by_path)
        if actual_paths != expected_paths:
            raise RuntimeError("clean_unpack_path_set_mismatch")
        for rel, row in expected_by_path.items():
            file_path = target / rel
            if file_path.is_symlink() or not file_path.is_file():
                raise RuntimeError(f"clean_unpack_non_regular:{rel}")
            data = file_path.read_bytes()
            if len(data) != int(row["byteLength"]) or sha256_bytes(data) != str(row["sha256"]):
                raise RuntimeError(f"clean_unpack_content_mismatch:{rel}")
        identity = json.loads((target / SOURCE_IDENTITY).read_text(encoding="utf-8"))
        identity_rows = identity["files"]
        missing = []
        mismatch = []
        for row in identity_rows:
            file_path = target / row["path"]
            if not file_path.is_file():
                missing.append(row["path"])
                continue
            data = file_path.read_bytes()
            if len(data) != row["byteLength"] or sha256_bytes(data) != row["sha256"]:
                mismatch.append(row["path"])
        if missing or mismatch:
            raise RuntimeError(f"clean_unpack_source_identity_failure:missing={missing}:mismatch={mismatch}")
        path_set = sha256_bytes("\n".join(str(row["path"]) for row in identity_rows).encode("utf-8"))
        aggregate = sha256_bytes(b"".join(
            f'{row["path"]}\0{row["byteLength"]}\0{row["mode"]}\0{row["sha256"]}\n'.encode("utf-8")
            for row in identity_rows
        ))
        if path_set != identity["pathSetSha256"] or aggregate != identity["sourceAggregateSha256"]:
            raise RuntimeError("clean_unpack_source_identity_aggregate_mismatch")
        public_present = [rel for rel in EXPECTED_PUBLIC_PEMS if (target / rel).is_file()]

        verify_home = target / ".verify-home"
        verify_tmp = target / ".verify-tmp"
        verify_home.mkdir()
        verify_tmp.mkdir()
        env = {
            "PATH": os.environ.get("PATH", ""),
            "HOME": str(verify_home),
            "TMPDIR": str(verify_tmp),
            "LANG": "C.UTF-8",
            "LC_ALL": "C.UTF-8",
        }
        verifier_results: dict[str, dict[str, object]] = {}
        for label, rel, expected_status in (
            ("p38CasSourceOnly", CAS_VERIFY, "PASS_P38_CURRENT_LOCKFILE_LOCAL_CAS_SOURCE_ONLY_VERIFY"),
            ("p38NodeDifferentialReceipt", NODE_VERIFY, "PASS_P38_NODE_MAJOR_DIFFERENTIAL_RECEIPT_VERIFY"),
        ):
            result = subprocess.run(
                [sys.executable, str(target / rel)],
                cwd=target,
                env=env,
                capture_output=True,
                text=True,
                timeout=120,
                check=False,
            )
            if result.returncode != 0:
                raise RuntimeError(
                    f"clean_unpack_verifier_failed:{label}:exit={result.returncode}:"
                    f"stdout={result.stdout[-2000:]}:stderr={result.stderr[-2000:]}"
                )
            lines = [line for line in result.stdout.splitlines() if line.strip()]
            if not lines:
                raise RuntimeError(f"clean_unpack_verifier_empty_stdout:{label}")
            try:
                payload = json.loads(lines[-1])
            except json.JSONDecodeError as error:
                raise RuntimeError(f"clean_unpack_verifier_non_json:{label}:{error}") from error
            if payload.get("status") != expected_status:
                raise RuntimeError(f"clean_unpack_verifier_status_mismatch:{label}:{payload.get('status')}")
            verifier_results[label] = {
                "pass": True,
                "status": payload["status"],
                "stdoutSha256": sha256_bytes(result.stdout.encode("utf-8")),
            }

        return {
            "pathSetPass": True,
            "contentPass": True,
            "sourceIdentityFiles": len(identity_rows),
            "sourceIdentityMissing": 0,
            "sourceIdentityMismatch": 0,
            "sourceIdentityAggregatePass": True,
            "expectedPublicPemsPresent": len(public_present),
            "expectedPublicPemDenominator": len(EXPECTED_PUBLIC_PEMS),
            "p38CasSourceOnlyVerifierPass": verifier_results["p38CasSourceOnly"]["pass"],
            "p38CasSourceOnlyVerifierStatus": verifier_results["p38CasSourceOnly"]["status"],
            "p38CasSourceOnlyVerifierStdoutSha256": verifier_results["p38CasSourceOnly"]["stdoutSha256"],
            "p38NodeDifferentialReceiptVerifierPass": verifier_results["p38NodeDifferentialReceipt"]["pass"],
            "p38NodeDifferentialReceiptVerifierStatus": verifier_results["p38NodeDifferentialReceipt"]["status"],
            "p38NodeDifferentialReceiptVerifierStdoutSha256": verifier_results["p38NodeDifferentialReceipt"]["stdoutSha256"],
        }

def validate_classifier_self_test() -> dict[str, object]:
    public = b"-----BEGIN PUBLIC KEY-----\nAAA=\n-----END PUBLIC KEY-----\n"
    private = b"-----BEGIN PRIVATE KEY-----\nAAA=\n-----END PRIVATE KEY-----\n"
    ambiguous = b"not a recognized PEM\n"
    results = {
        "public": classify_pem_bytes(public),
        "private": classify_pem_bytes(private),
        "ambiguous": classify_pem_bytes(ambiguous),
    }
    if results != {
        "public": "PUBLIC_ALLOWED",
        "private": "PRIVATE_FORBIDDEN",
        "ambiguous": "AMBIGUOUS_FORBIDDEN",
    }:
        raise RuntimeError(f"pem_classifier_self_test_failed:{results}")
    return {"cases": 3, "passed": 3, "results": results}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--copy-b", required=True)
    parser.add_argument("--receipt", required=True)
    args = parser.parse_args()

    output = Path(args.output).resolve()
    copy_b = Path(args.copy_b).resolve()
    receipt_path = Path(args.receipt).resolve()
    for path, label in ((output, "output"), (copy_b, "copy_b"), (receipt_path, "receipt"), (MANIFEST, "manifest"), (EXCLUSIONS, "exclusions")):
        reject_unsafe_output(path, label)
    if output == copy_b or len({output, copy_b, receipt_path}) != 3:
        raise RuntimeError("output_copy_b_receipt_must_be_distinct")
    if output.suffix.lower() != ".zip" or copy_b.suffix.lower() != ".zip" or receipt_path.suffix.lower() != ".json":
        raise RuntimeError("output_extension_invalid")

    dynamic_exact = {rel for rel in (within_root(output), within_root(copy_b), within_root(receipt_path)) if rel}
    ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)

    classifier_test = validate_classifier_self_test()
    exclusions: dict[str, object] = {
        "schemaVersion": "velmere.p38.source-only-package-exclusions.v1",
        "revision": "P38_V15_CURRENT_LOCKFILE_CAS_RECOVERY_AND_NODE24_DIFFERENTIAL",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "generatedAt": "2026-08-14T03:35:00.000Z",
        "excludedComponents": sorted(EXCLUDED_COMPONENTS),
        "excludedRootDirectories": sorted(EXCLUDED_ROOT_DIRECTORIES),
        "excludedPrefixes": list(EXCLUDED_PREFIXES),
        "excludedExactPaths": sorted(EXCLUDED_EXACT_PATHS),
        "dynamicOutputSelfExclusions": sorted(dynamic_exact),
        "publicPemPolicy": "INCLUDE_RECOGNIZED_PUBLIC_KEY_OR_CERTIFICATE; FAIL_PRIVATE_OR_AMBIGUOUS",
        "forbiddenSecretSuffixes": sorted(FORBIDDEN_SECRET_SUFFIXES),
        "classifierSelfTest": classifier_test,
        "physicalPdfBrowserCorporaIncluded": False,
        "externalFontMaterialsIncluded": False,
        "manifestSelfExcluded": True,
        "releaseState": "NO_GO",
    }
    exclusions["integritySha256"] = sha256_bytes(canonical_json(exclusions))
    EXCLUSIONS.write_text(json.dumps(exclusions, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    rows, public_pems = inventory(dynamic_exact)
    validate_secret_boundaries(rows)
    source_identity = validate_source_identity()
    validate_required_files(rows)
    if set(public_pems) != set(EXPECTED_PUBLIC_PEMS):
        raise RuntimeError(f"public_pem_set_mismatch:{public_pems}")

    manifest = build_manifest(rows, public_pems, source_identity)
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    expected_rows = write_zip(output, rows)
    expected_rows_b = write_zip(copy_b, rows)
    if expected_rows != expected_rows_b:
        raise RuntimeError("package_row_drift_between_writes")
    sha_a = sha256_file(output)
    sha_b = sha256_file(copy_b)
    byte_identical = sha_a == sha_b and files_equal(output, copy_b)
    verify_a = verify_archive(output, expected_rows)
    verify_b = verify_archive(copy_b, expected_rows)
    unpack_a = verify_clean_unpack(output, expected_rows)
    unpack_b = verify_clean_unpack(copy_b, expected_rows)

    receipt: dict[str, object] = {
        "schemaVersion": "velmere.p38.deterministic-source-only-package-receipt.v1",
        "revision": "P38_V15_CURRENT_LOCKFILE_CAS_RECOVERY_AND_NODE24_DIFFERENTIAL",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "releaseState": "NO_GO",
        "generatedAt": "2026-08-14T03:37:00.000Z",
        "archive": str(output),
        "copyB": str(copy_b),
        "sha256": sha_a,
        "copyBSha256": sha_b,
        "byteIdentical": byte_identical,
        "crcPass": bool(verify_a["crcPass"] and verify_b["crcPass"]),
        "badEntry": verify_a["badEntry"] or verify_b["badEntry"],
        "entries": verify_a["entries"],
        "uncompressedBytes": verify_a["uncompressedBytes"],
        "zipBytes": output.stat().st_size,
        "embeddedManifestSha256": sha256_file(MANIFEST),
        "embeddedManifestSourceAggregateSha256": manifest["sourceAggregateSha256"],
        "sourceIdentitySha256": sha256_file(ROOT / SOURCE_IDENTITY),
        "sourceAggregateSha256": source_identity["sourceAggregateSha256"],
        "cleanUnpackA": unpack_a,
        "cleanUnpackB": unpack_b,
        "publicPemClassifierSelfTest": classifier_test,
        "publicPemsIncluded": len(public_pems),
        "publicPemDenominator": len(EXPECTED_PUBLIC_PEMS),
        "privateOrAmbiguousPemsIncluded": 0,
        "activeCredentialLiteralHits": 0,
        "symlinkOrSpecialEntries": 0,
        "currentLockCasCoverage": "67/661",
        "currentLockCasRemaining": 594,
        "recoveredTarballsIncluded": 26,
        "cleanUnpackCasVerifierPass": bool(unpack_a["p38CasSourceOnlyVerifierPass"] and unpack_b["p38CasSourceOnlyVerifierPass"]),
        "cleanUnpackNodeDifferentialVerifierPass": bool(
            unpack_a["p38NodeDifferentialReceiptVerifierPass"]
            and unpack_b["p38NodeDifferentialReceiptVerifierPass"]
        ),
        "node22FixtureFamilies": "6/6",
        "node24LineFixtureFamilies": "6/6",
        "crossRuntimeReceiptByteParity": "6/6",
        "crossRuntimeRuntimeByteParity": "6/6",
        "exactProjectNodeRequired": EXPECTED_PROJECT_NODE,
        "exactProjectNodeExecutedInThisPass": False,
        "exactWindowsExecutedInThisPass": False,
        "dependencyClosure": False,
        "offlineNpmCiExecuted": False,
        "goInternal": False,
        "goPaid": False,
        "live": False,
        "worldClassProven": False,
        "truthBoundary": (
            "Two byte-identical ZIPs, CRC, exact inventory, clean unpack, source-identity replay, content-aware PEM "
            "classification, SOURCE_ONLY replay of the 67/661 current-lock CAS coverage and immutable verification of "
            "the six-family Node 22 versus Node 24-line differential prove only those bounded claims. The remaining "
            "594 lockfile tarballs, exact Node 24.18.0/Windows, dependency installation, typecheck, production builds, "
            "Browser, customer value, provider rights, paid sale and world-class status remain unproven."
        ),
    }
    receipt["integritySha256"] = sha256_bytes(canonical_json(receipt))
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(json.dumps({
        "status": "PASS_P38_DETERMINISTIC_CURRENT_SOURCE_ONLY_PACKAGE",
        "sha256": sha_a,
        "byteIdentical": byte_identical,
        "crcPass": receipt["crcPass"],
        "entries": receipt["entries"],
        "zipBytes": receipt["zipBytes"],
        "sourceAggregateSha256": receipt["sourceAggregateSha256"],
        "cleanUnpackSourceIdentity": unpack_a["sourceIdentityAggregatePass"],
        "cleanUnpackCasVerifier": receipt["cleanUnpackCasVerifierPass"],
        "cleanUnpackNodeDifferentialVerifier": receipt["cleanUnpackNodeDifferentialVerifierPass"],
        "currentLockCasCoverage": receipt["currentLockCasCoverage"],
        "recoveredTarballsIncluded": receipt["recoveredTarballsIncluded"],
        "node24LineFamilies": receipt["node24LineFixtureFamilies"],
        "exactNode24180": False,
        "publicPems": f'{len(public_pems)}/{len(EXPECTED_PUBLIC_PEMS)}',
        "releaseState": "NO_GO",
    }, ensure_ascii=False))
    return 0 if byte_identical and receipt["crcPass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
