#!/usr/bin/env python3
"""Verify and install the exact @electric-sql/pglite tarball from package-lock.

No package is trusted by filename or version string alone. The npm SRI from the
current lockfile is authoritative. The script never silently downloads a
substitute and never grants runtime credit when the exact bytes are absent.
"""
from __future__ import annotations

import argparse
import base64
import datetime as dt
import hashlib
import json
from pathlib import Path, PurePosixPath
import shutil
import tarfile
import tempfile
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
LOCK_PATH = ROOT / "package-lock.json"
LOCK_KEY = "node_modules/@electric-sql/pglite"
AFFECTED_TESTS = [
    "scripts/current-execution/test-v4-account-data-export-pglite.mjs",
    "scripts/current-execution/test-v4-account-erasure-pglite.mjs",
    "scripts/current-execution/test-v4-audit-verify-producer-pglite.mjs",
    "scripts/current-execution/test-v4-verify-monitor-worker-pglite.mjs",
    "scripts/current-execution/test-v4-verify-pglite.mjs",
]
REQUIRED_PACKAGE_PATHS = [
    "package.json",
    "dist/index.js",
    "dist/index.cjs",
    "dist/pglite.wasm",
    "dist/initdb.wasm",
    "dist/pglite.data",
    "dist/contrib/pgcrypto.js",
    "dist/pgcrypto.tar.gz",
]


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def write_receipt(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def sri_sha512(path: Path) -> str:
    digest = hashlib.sha512(path.read_bytes()).digest()
    return "sha512-" + base64.b64encode(digest).decode("ascii")


def safe_members(archive: tarfile.TarFile) -> list[tarfile.TarInfo]:
    members: list[tarfile.TarInfo] = []
    for member in archive.getmembers():
        posix = PurePosixPath(member.name)
        if posix.is_absolute() or ".." in posix.parts or not posix.parts or posix.parts[0] != "package":
            raise ValueError(f"unsafe tar member: {member.name}")
        if member.issym() or member.islnk() or member.isdev():
            raise ValueError(f"unsupported tar member type: {member.name}")
        members.append(member)
    return members


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tarball")
    parser.add_argument(
        "--receipt",
        default="artifacts/r6/VELMERE_R6_EXACT_PGLITE_PREPARATION.json",
    )
    parser.add_argument(
        "--install-root",
        default="node_modules/@electric-sql/pglite",
    )
    args = parser.parse_args()

    receipt_path = (ROOT / args.receipt).resolve()
    lock = json.loads(LOCK_PATH.read_text(encoding="utf-8"))
    entry = lock.get("packages", {}).get(LOCK_KEY)
    if not isinstance(entry, dict):
        raise SystemExit(f"lock entry missing: {LOCK_KEY}")

    package = {
        "name": "@electric-sql/pglite",
        "version": entry.get("version"),
        "resolved": entry.get("resolved"),
        "integrity": entry.get("integrity"),
        "license": entry.get("license"),
    }
    base: dict[str, Any] = {
        "schemaVersion": "velmere.r6.exact-pglite-preparation.v1",
        "generatedAt": utc_now(),
        "lockfile": {
            "path": "package-lock.json",
            "sha256": hashlib.sha256(LOCK_PATH.read_bytes()).hexdigest(),
            "entry": LOCK_KEY,
        },
        "package": package,
        "affectedTests": AFFECTED_TESTS,
        "concurrencyPolicy": {
            "pgliteTestsSerialized": True,
            "upstreamIssue": "https://github.com/electric-sql/pglite/issues/1053",
        },
        "customerFinalCredit": False,
        "exactWindowsCredit": False,
    }

    if package["version"] != "0.5.4" or not str(package["integrity"]).startswith("sha512-"):
        payload = {
            **base,
            "status": "FAIL_LOCK_IDENTITY",
            "installed": False,
            "reason": "current lockfile does not contain the expected exact PGlite 0.5.4 identity",
        }
        write_receipt(receipt_path, payload)
        return 2

    if not args.tarball:
        payload = {
            **base,
            "status": "WITHHELD_EXACT_PACKAGE_BYTES_UNAVAILABLE",
            "installed": False,
            "reason": "the exact npm tarball bytes were not present in the current execution container",
            "requiredAcquisition": {
                "url": package["resolved"],
                "expectedIntegrity": package["integrity"],
                "automaticPaidAction": False,
            },
        }
        write_receipt(receipt_path, payload)
        print(json.dumps({"status": payload["status"], "receipt": args.receipt}, indent=2))
        return 78

    tarball = Path(args.tarball).expanduser().resolve()
    if not tarball.is_file():
        payload = {
            **base,
            "status": "WITHHELD_EXACT_PACKAGE_BYTES_UNAVAILABLE",
            "installed": False,
            "reason": f"tarball not found: {tarball}",
        }
        write_receipt(receipt_path, payload)
        return 78

    actual_integrity = sri_sha512(tarball)
    if actual_integrity != package["integrity"]:
        payload = {
            **base,
            "status": "FAIL_INTEGRITY_MISMATCH",
            "installed": False,
            "tarball": {
                "path": str(tarball),
                "byteLength": tarball.stat().st_size,
                "actualIntegrity": actual_integrity,
            },
        }
        write_receipt(receipt_path, payload)
        return 2

    install_root = (ROOT / args.install_root).resolve()
    with tempfile.TemporaryDirectory(prefix="velmere-r6-pglite-") as temp_dir:
        temp = Path(temp_dir)
        with tarfile.open(tarball, "r:gz") as archive:
            members = safe_members(archive)
            archive.extractall(temp, members=members, filter="data")
        extracted = temp / "package"
        package_json = json.loads((extracted / "package.json").read_text(encoding="utf-8"))
        if package_json.get("name") != package["name"] or package_json.get("version") != package["version"]:
            raise ValueError("package.json identity mismatch after extraction")
        missing = [path for path in REQUIRED_PACKAGE_PATHS if not (extracted / path).is_file()]
        if missing:
            raise ValueError(f"exact package is missing required runtime files: {missing}")
        if install_root.exists() or install_root.is_symlink():
            if install_root.is_dir() and not install_root.is_symlink():
                shutil.rmtree(install_root)
            else:
                install_root.unlink()
        install_root.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(extracted, install_root)

    installed_files = sorted(path.relative_to(install_root).as_posix() for path in install_root.rglob("*") if path.is_file())
    payload = {
        **base,
        "status": "PASS_EXACT_PACKAGE_INSTALLED_TRANSIENT",
        "installed": True,
        "tarball": {
            "path": str(tarball),
            "byteLength": tarball.stat().st_size,
            "actualIntegrity": actual_integrity,
            "sha256": hashlib.sha256(tarball.read_bytes()).hexdigest(),
        },
        "install": {
            "path": install_root.relative_to(ROOT).as_posix(),
            "fileCount": len(installed_files),
            "requiredRuntimeFiles": REQUIRED_PACKAGE_PATHS,
            "sourceOnlyExcluded": True,
        },
        "truthBoundary": "This prepares an exact transient dependency. The five real migration tests must still execute successfully before any runtime credit exists.",
    }
    write_receipt(receipt_path, payload)
    print(json.dumps({"status": payload["status"], "receipt": args.receipt}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
