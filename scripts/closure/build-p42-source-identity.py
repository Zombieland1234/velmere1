#!/usr/bin/env python3
"""Build the non-circular P42 current-source identity bound to Owner Directive V16.

Generated receipts, dependency trees, build outputs, physical PDF/Browser corpora,
external fonts and MATERIALS are excluded. The result proves current source bytes
only; it is not an exact Windows, build, Browser, PDF, sale or release receipt.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import stat
from typing import Iterable

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT = ROOT / "artifacts/closure/p42/source-identity.json"
V16 = "docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V16_FULL_TOPOLOGY_FREE_LEGAL_CURRENT_WORLD_CLASS_2026-08-14.txt"
V16_SHA = "67816a5a9238668c8080a3a8cc623f078d268c1b78fddf534cb4893bb45490e9"
V16_BYTES = 62609
V15 = "docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V15_FREE_LEGAL_TOP_WORLD_2026-08-13.txt"
V15_SHA = "5cfbbfcbcef7242e30466f18bab3ad29cad859e485a909a4ee8658fb65e2f2c0"
V15_BYTES = 19804
PACKAGE_SHA = "04aa4b393337fffa6e02ef54ad7668fe8136b038b0d924b208158a095b6f70a5"
PACKAGE_BYTES = 135167
LOCK_SHA = "e228adec08801e454ef5559a20f302110b4896a307c364195716218a376c48bb"
LOCK_BYTES = 354803
P41_SOURCE_AGG = "b646ea33ba3c66d163c77bb6df1b1c02d93c883238abacc026b2f949ed6bad68"

EXCLUDED_COMPONENTS = {
    ".git", ".cache", ".mypy_cache", ".npm", ".parcel-cache", ".pnpm-store",
    ".pytest_cache", ".ruff_cache", ".turbo", ".velmere", "__pycache__", "node_modules",
}
EXCLUDED_ROOT_DIRECTORIES = {"artifacts", "coverage", "temp", "tmp", "p42-out"}
EXCLUDED_PREFIXES = (
    "artifacts/closure",
    "artifacts/pass36/a83/browser-lens-pdf-corpus",
    "artifacts/pass36/a83/renders",
    "artifacts/pass35/a45/screenshots",
)
EXCLUDED_EXACT_PATHS = {"artifacts/pass35/a45/A45_DETERMINISTIC_LOCAL_REFERENCE_QA_FIXTURE.json"}
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


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalized_mode(mode: int) -> int:
    return 0o755 if mode & 0o111 else 0o644


def within_root(path: Path) -> str | None:
    try:
        return path.resolve().relative_to(ROOT.resolve()).as_posix()
    except ValueError:
        return None


def reject_output(path: Path) -> None:
    if path.is_symlink():
        raise RuntimeError(f"output_symlink_forbidden:{path}")
    if path.exists() and not path.is_file():
        raise RuntimeError(f"output_non_regular_forbidden:{path}")
    absolute = path.absolute()
    for parent in [absolute.parent, *absolute.parents]:
        if parent.exists() and parent.is_symlink():
            raise RuntimeError(f"output_parent_symlink_forbidden:{parent}")


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
    if pure.name.lower() in EXTERNAL_FONT_NAMES:
        return True
    if any(part.upper() == "MATERIALS" for part in parts):
        return True
    return False


def classify_pem_and_reject_secret(path: Path, rel: str) -> str | None:
    pure = PurePosixPath(rel)
    suffix = pure.suffix.lower()
    if suffix in FORBIDDEN_SECRET_SUFFIXES or pure.name.lower() in FORBIDDEN_SECRET_NAMES:
        raise RuntimeError(f"forbidden_secret_file_in_current_source:{rel}")
    if suffix != ".pem":
        return None
    head = path.read_bytes()[:4096]
    if any(marker in head for marker in PRIVATE_PEM_MARKERS):
        raise RuntimeError(f"private_pem_in_current_source:{rel}")
    if any(marker in head for marker in PUBLIC_PEM_MARKERS):
        return "PUBLIC_PEM_ALLOWED"
    raise RuntimeError(f"ambiguous_pem_in_current_source:{rel}")


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
                raise RuntimeError(f"included_symlink_forbidden:{rel}")
            item_path = Path(entry.path)
            item_stat = entry.stat(follow_symlinks=False)
            if stat.S_ISDIR(item_stat.st_mode):
                yield from walk(item_path, rel_path)
            elif stat.S_ISREG(item_stat.st_mode):
                yield item_path, rel, item_stat, classify_pem_and_reject_secret(item_path, rel)
            else:
                raise RuntimeError(f"included_special_file_forbidden:{rel}:{item_stat.st_mode:o}")
    yield from walk(ROOT, PurePosixPath())


def lock_denominator(lock: dict) -> dict[str, int]:
    rows: list[tuple[str, str]] = []
    count = 0
    for lock_path, entry in lock.get("packages", {}).items():
        if not lock_path or not isinstance(entry, dict):
            continue
        if entry.get("resolved") and entry.get("integrity"):
            count += 1
            rows.append((entry["resolved"], entry["integrity"]))
    return {"lockPathsWithResolvedIntegrity": count, "uniqueResolvedIntegrityTarballs": len(set(rows))}


def runtime_and_lock_contract() -> dict[str, object]:
    package_path = ROOT / "package.json"
    lock_path = ROOT / "package-lock.json"
    if package_path.stat().st_size != PACKAGE_BYTES or sha256_file(package_path) != PACKAGE_SHA:
        raise RuntimeError("package_json_current_root_binding_drift")
    if lock_path.stat().st_size != LOCK_BYTES or sha256_file(lock_path) != LOCK_SHA:
        raise RuntimeError("package_lock_current_root_binding_drift")
    package = json.loads(package_path.read_text(encoding="utf-8"))
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    expected = {"node": "24.18.0", "npm": "11.16.0"}
    observed = {
        "nodeVersionFile": (ROOT / ".node-version").read_text(encoding="utf-8").strip(),
        "nvmrc": (ROOT / ".nvmrc").read_text(encoding="utf-8").strip(),
        "packageEngines": package.get("engines", {}),
        "packageManager": package.get("packageManager"),
        "lockRootEngines": lock.get("packages", {}).get("", {}).get("engines", {}),
        "lockfileVersion": lock.get("lockfileVersion"),
        "packageJsonSha256": PACKAGE_SHA,
        "packageLockSha256": LOCK_SHA,
        **lock_denominator(lock),
    }
    if observed["nodeVersionFile"] != expected["node"] or observed["nvmrc"] != expected["node"]:
        raise RuntimeError(f"runtime_version_file_drift:{observed}")
    if observed["packageEngines"] != expected or observed["lockRootEngines"] != expected:
        raise RuntimeError(f"runtime_engine_drift:{observed}")
    if observed["packageManager"] != f"npm@{expected['npm']}":
        raise RuntimeError(f"package_manager_drift:{observed}")
    if observed["lockfileVersion"] != 3:
        raise RuntimeError(f"lockfile_version_drift:{observed}")
    if observed["lockPathsWithResolvedIntegrity"] != 661 or observed["uniqueResolvedIntegrityTarballs"] != 618:
        raise RuntimeError(f"lock_denominator_drift:{observed}")
    return {"required": expected, "observedSourceContract": observed, "sourceContractPass": True}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    args = parser.parse_args()
    requested_output = Path(args.output)
    reject_output(requested_output)
    output = requested_output.resolve()
    dynamic_exact = {rel for rel in (within_root(output),) if rel is not None}

    rows: list[dict[str, object]] = []
    casefold_paths: dict[str, str] = {}
    public_pems: list[str] = []
    for path, rel, item_stat, classification in iter_files(dynamic_exact):
        folded = rel.casefold()
        previous = casefold_paths.get(folded)
        if previous is not None and previous != rel:
            raise RuntimeError(f"casefold_path_collision:{previous}:{rel}")
        casefold_paths[folded] = rel
        rows.append({
            "path": rel,
            "byteLength": item_stat.st_size,
            "mode": normalized_mode(item_stat.st_mode),
            "sha256": sha256_file(path),
        })
        if classification == "PUBLIC_PEM_ALLOWED":
            public_pems.append(rel)

    rows.sort(key=lambda row: str(row["path"]).encode("utf-8"))
    by_path = {str(row["path"]): row for row in rows}
    for rel, expected_sha, expected_bytes in ((V16, V16_SHA, V16_BYTES), (V15, V15_SHA, V15_BYTES)):
        row = by_path.get(rel)
        if row is None or row["sha256"] != expected_sha or row["byteLength"] != expected_bytes:
            raise RuntimeError(f"authority_binding_drift:{rel}:{row}")

    path_set_sha256 = sha256_bytes("\n".join(str(row["path"]) for row in rows).encode("utf-8"))
    aggregate_sha256 = sha256_bytes(b"".join(
        f'{row["path"]}\0{row["byteLength"]}\0{row["mode"]}\0{row["sha256"]}\n'.encode("utf-8")
        for row in rows
    ))
    result = {
        "schemaVersion": "velmere.p42.source-identity.v1",
        "revision": "P42_V16_EXACT_WINDOWS_DEPENDENCY_CLOSURE_SEMANTIC_DUAL_BUILD_BRIDGE",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "releaseState": "NO_GO",
        "classification": "CURRENT_SOURCE_INPUT_EXCLUDES_GENERATED_AND_PHYSICAL_EVIDENCE",
        "generatedAt": "2026-08-14T09:25:00.000Z",
        "parentRoot": "R44P46",
        "parentCheckpoint": "P41_V16_EXACT_WINDOWS_PREFLIGHT_CURRENT_ROOT_BRIDGE_REPAIR",
        "parentSourceAggregateSha256": P41_SOURCE_AGG,
        "fileCount": len(rows),
        "payloadBytes": sum(int(row["byteLength"]) for row in rows),
        "pathSetSha256": path_set_sha256,
        "sourceAggregateSha256": aggregate_sha256,
        "requiredAuthorityBinding": {
            "path": V16,
            "byteLength": V16_BYTES,
            "sha256": V16_SHA,
            "byteIdenticalToOwnerUpload": True,
            "status": "CURRENT_BOUND_AUTHORITY_UNCHANGED",
        },
        "previousAuthorityRetainedHistorically": {"path": V15, "byteLength": V15_BYTES, "sha256": V15_SHA},
        "runtimeSourceContract": runtime_and_lock_contract(),
        "publicPemPolicy": {
            "allowedPublicPemCount": len(public_pems),
            "allowedPublicPemPaths": public_pems,
            "privatePemCount": 0,
            "ambiguousPemCount": 0,
            "allKeyP12PfxFilesForbidden": True,
        },
        "exclusionPolicy": {
            "components": sorted(EXCLUDED_COMPONENTS),
            "rootDirectories": sorted(EXCLUDED_ROOT_DIRECTORIES),
            "prefixes": list(EXCLUDED_PREFIXES),
            "exactPaths": sorted(EXCLUDED_EXACT_PATHS),
            "suffixes": sorted(EXCLUDED_SUFFIXES),
            "allDotNextComponents": True,
            "allArtifacts": True,
            "generatedClosureReceipts": True,
            "physicalPdfAndBrowserCorpora": True,
            "externalFontAndMaterials": True,
            "dynamicOutputSelfExclusion": True,
        },
        "files": rows,
        "creditBoundary": {
            "sourceIdentityCredit": True,
            "exactWindowsToolchainPreflightCredit": True,
            "currentRootBridgeSourceCredit": True,
            "exactCurrentRootWindowsExecutionCredit": False,
            "dependencyClosureCredit": True,
            "buildCredit": False,
            "browserCredit": False,
            "pdfCredit": False,
            "customerValueCredit": False,
            "providerRightsCredit": False,
            "saleOrGoPaidCredit": False,
            "worldClassCredit": False,
        },
        "truthBoundary": (
            "This identity binds the P42 exact-Windows dependency closure receipt and semantic dual-build bridge, exact unmodified V16, package.json, "
            "package-lock.json and source bytes. It excludes generated receipts, dependencies, builds, physical PDF/Browser "
            "corpora, external fonts and MATERIALS. It proves source binding of the exact-Windows dependency receipt but does not prove a successful exact-Windows current-root application install, "
            "semantic checks, dual build, Browser, PDF, rights, paid value, GO_INTERNAL, GO_PAID, LIVE or WORLD_CLASS_PROVEN."
        ),
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": "PASS_P42_V16_CURRENT_SOURCE_IDENTITY_BUILT",
        "fileCount": result["fileCount"],
        "payloadBytes": result["payloadBytes"],
        "pathSetSha256": path_set_sha256,
        "sourceAggregateSha256": aggregate_sha256,
        "manifestSha256": sha256_file(output),
        "publicPemCount": len(public_pems),
        "output": within_root(output) or str(output),
        "releaseState": "NO_GO",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
