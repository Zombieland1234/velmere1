#!/usr/bin/env python3
"""Build the non-circular P37 current-source identity bound to Owner Directive V15.

Generated closure evidence and heavyweight physical evidence are intentionally
excluded. The result identifies current source inputs; it is not a release,
build, Browser, paid, customer, or world-class receipt.
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
DEFAULT_OUTPUT = ROOT / "artifacts/closure/p37/source-identity.json"
OWNER_DIRECTIVE_V15 = (
    "docs/authority/"
    "VELMERE_CANONICAL_OWNER_DIRECTIVE_V15_FREE_LEGAL_TOP_WORLD_2026-08-13.txt"
)
OWNER_DIRECTIVE_V15_SHA256 = "5cfbbfcbcef7242e30466f18bab3ad29cad859e485a909a4ee8658fb65e2f2c0"
OWNER_DIRECTIVE_V15_BYTES = 19804

EXCLUDED_COMPONENTS = {
    ".git", ".cache", ".mypy_cache", ".npm", ".parcel-cache",
    ".pnpm-store", ".pytest_cache", ".ruff_cache", ".turbo", ".velmere",
    "__pycache__", "node_modules",
}
EXCLUDED_ROOT_DIRECTORIES = {"artifacts", "coverage", "temp", "tmp"}
EXCLUDED_PREFIXES = (
    "artifacts/closure",
    "artifacts/pass36/a83/browser-lens-pdf-corpus",
    "artifacts/pass36/a83/renders",
    "artifacts/pass35/a45/screenshots",
)
EXCLUDED_EXACT_PATHS = {
    "artifacts/pass35/a45/A45_DETERMINISTIC_LOCAL_REFERENCE_QA_FIXTURE.json",
}
EXCLUDED_SUFFIXES = {".pyc", ".pyo", ".zip"}
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


def reject_unsafe_output(path: Path) -> None:
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
    if any(rel == prefix or rel.startswith(f"{prefix}/") for prefix in EXCLUDED_PREFIXES):
        return True
    if pure.suffix.lower() in EXCLUDED_SUFFIXES:
        return True
    if pure.name.lower() in EXTERNAL_FONT_NAMES:
        return True
    if any(part.upper() == "MATERIALS" for part in parts):
        return True
    return False


def classify_and_reject_secret(path: Path, rel: str) -> str | None:
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
            entry_path = Path(entry.path)
            entry_stat = entry.stat(follow_symlinks=False)
            if stat.S_ISDIR(entry_stat.st_mode):
                yield from walk(entry_path, rel_path)
            elif stat.S_ISREG(entry_stat.st_mode):
                classification = classify_and_reject_secret(entry_path, rel)
                yield entry_path, rel, entry_stat, classification
            else:
                raise RuntimeError(f"included_special_file_forbidden:{rel}:{entry_stat.st_mode:o}")
    yield from walk(ROOT, PurePosixPath())


def runtime_contract() -> dict[str, object]:
    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    lock = json.loads((ROOT / "package-lock.json").read_text(encoding="utf-8"))
    node_file = (ROOT / ".node-version").read_text(encoding="utf-8").strip()
    nvmrc = (ROOT / ".nvmrc").read_text(encoding="utf-8").strip()
    package_engines = package.get("engines", {})
    lock_engines = lock.get("packages", {}).get("", {}).get("engines", {})
    expected = {"node": "24.18.0", "npm": "11.16.0"}
    observed = {
        "nodeVersionFile": node_file,
        "nvmrc": nvmrc,
        "packageEngines": package_engines,
        "packageManager": package.get("packageManager"),
        "lockRootEngines": lock_engines,
        "lockfileVersion": lock.get("lockfileVersion"),
    }
    if node_file != expected["node"] or nvmrc != expected["node"]:
        raise RuntimeError(f"runtime_version_file_drift:{observed}")
    if package_engines != expected or lock_engines != expected:
        raise RuntimeError(f"runtime_engine_drift:{observed}")
    if package.get("packageManager") != f'npm@{expected["npm"]}':
        raise RuntimeError(f"package_manager_drift:{observed}")
    if lock.get("lockfileVersion") != 3:
        raise RuntimeError(f"lockfile_version_drift:{observed}")
    return {"required": expected, "observedSourceContract": observed, "sourceContractPass": True}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    args = parser.parse_args()

    requested_output = Path(args.output)
    reject_unsafe_output(requested_output)
    output = requested_output.resolve()
    dynamic_exact = {rel for rel in (within_root(output),) if rel is not None}

    rows: list[dict[str, object]] = []
    casefold_paths: dict[str, str] = {}
    public_pems: list[str] = []
    for path, rel, entry_stat, classification in iter_regular_files(dynamic_exact):
        folded = rel.casefold()
        previous = casefold_paths.get(folded)
        if previous is not None and previous != rel:
            raise RuntimeError(f"casefold_path_collision:{previous}:{rel}")
        casefold_paths[folded] = rel
        rows.append({
            "path": rel,
            "byteLength": entry_stat.st_size,
            "mode": normalized_mode(entry_stat.st_mode),
            "sha256": sha256_file(path),
        })
        if classification == "PUBLIC_PEM_ALLOWED":
            public_pems.append(rel)

    rows.sort(key=lambda row: str(row["path"]).encode("utf-8"))
    by_path = {str(row["path"]): row for row in rows}
    authority = by_path.get(OWNER_DIRECTIVE_V15)
    if authority is None:
        raise RuntimeError("required_current_authority_missing:owner_directive_v15")
    if authority["sha256"] != OWNER_DIRECTIVE_V15_SHA256 or authority["byteLength"] != OWNER_DIRECTIVE_V15_BYTES:
        raise RuntimeError(f"owner_directive_v15_bytes_changed:{authority}")

    path_set_sha256 = sha256_bytes("\n".join(str(row["path"]) for row in rows).encode("utf-8"))
    aggregate_sha256 = sha256_bytes(b"".join(
        f'{row["path"]}\0{row["byteLength"]}\0{row["mode"]}\0{row["sha256"]}\n'.encode("utf-8")
        for row in rows
    ))

    result = {
        "schemaVersion": "velmere.p37.source-identity.v1",
        "revision": "P37_V15_PACKAGE_REPRODUCIBILITY_AND_A85_BINDING",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "releaseState": "NO_GO",
        "classification": "CURRENT_SOURCE_INPUT_EXCLUDES_GENERATED_AND_PHYSICAL_EVIDENCE",
        "generatedAt": "2026-08-13T21:30:00.000Z",
        "parentRoot": "R44P46",
        "parentCheckpoint": "P36_CURRENT_SOURCE_EVIDENCE_BINDING",
        "fileCount": len(rows),
        "payloadBytes": sum(int(row["byteLength"]) for row in rows),
        "pathSetSha256": path_set_sha256,
        "sourceAggregateSha256": aggregate_sha256,
        "requiredAuthorityBinding": {
            "path": OWNER_DIRECTIVE_V15,
            "byteLength": OWNER_DIRECTIVE_V15_BYTES,
            "sha256": OWNER_DIRECTIVE_V15_SHA256,
            "byteIdenticalToOwnerUpload": True,
            "replacesV14OnlyAfterThisBinding": True,
            "v14AndR12RetainedHistorically": True,
        },
        "runtimeSourceContract": runtime_contract(),
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
            "exactRuntimeExecutionCredit": False,
            "dependencyClosureCredit": False,
            "buildCredit": False,
            "browserCredit": False,
            "customerValueCredit": False,
            "providerRightsCredit": False,
            "realCustomerCredit": False,
            "saleOrGoPaidCredit": False,
            "worldClassCredit": False,
        },
        "truthBoundary": (
            "This identity binds P37 source inputs and the exact unmodified V15 owner directive. "
            "It excludes generated receipts, dependencies, build/cache trees, physical PDF/Browser corpora, "
            "external fonts and materials. It proves source identity and public-key inclusion policy only; "
            "it does not prove exact Node/Windows execution, build, Browser, paid value, provider rights, "
            "real customers, GO_INTERNAL, GO_PAID, LIVE or WORLD_CLASS_PROVEN."
        ),
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": "PASS_P37_V15_CURRENT_SOURCE_IDENTITY_BUILT",
        "fileCount": result["fileCount"],
        "payloadBytes": result["payloadBytes"],
        "pathSetSha256": path_set_sha256,
        "sourceAggregateSha256": aggregate_sha256,
        "manifestSha256": sha256_file(output),
        "ownerDirectiveV15Sha256": OWNER_DIRECTIVE_V15_SHA256,
        "publicPemCount": len(public_pems),
        "output": within_root(output) or str(output),
        "releaseState": "NO_GO",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
