#!/usr/bin/env python3
"""Acquire exact lifecycle archives into quarantine and inspect them as data only.

This script never imports or executes package code. It verifies package-lock SRI,
keeps downloads outside source, inspects package.json and referenced script bytes,
and emits a receipt that does not itself authorize lifecycle execution.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import importlib.util
import json
import os
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
BUILDER_PATH = ROOT / "scripts/pass42/build-p42-lifecycle-inventory.py"
MAX_ARCHIVE_BYTES = 64 * 1024 * 1024
FIXED_GENERATED_AT = "2026-08-14T10:55:00.000Z"


def load_builder():
    spec = importlib.util.spec_from_file_location("p42_lifecycle_builder", BUILDER_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("builder_import_spec_failed")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


class RegistryOnlyRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        parsed = urllib.parse.urlparse(newurl)
        if parsed.scheme != "https" or parsed.hostname != "registry.npmjs.org":
            raise RuntimeError(f"redirect_outside_registry_blocked:{newurl}")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def download(url: str, destination: Path) -> tuple[int, str]:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or parsed.hostname != "registry.npmjs.org":
        raise RuntimeError(f"non_registry_url_blocked:{url}")
    opener = urllib.request.build_opener(RegistryOnlyRedirect())
    request = urllib.request.Request(url, headers={"User-Agent": "Velmere-P42-Lifecycle-Quarantine/1.0"})
    total = 0
    with opener.open(request, timeout=90) as response, destination.open("wb") as output:
        final = urllib.parse.urlparse(response.geturl())
        if final.scheme != "https" or final.hostname != "registry.npmjs.org":
            raise RuntimeError(f"final_url_outside_registry_blocked:{response.geturl()}")
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_ARCHIVE_BYTES:
                raise RuntimeError(f"archive_size_limit_exceeded:{total}")
            output.write(chunk)
    return total, response.geturl()


def verify_integrity(path: Path, integrity: str) -> tuple[str, bool]:
    algorithm, encoded = integrity.split("-", 1)
    expected = base64.b64decode(encoded, validate=True)
    digest = hashlib.new(algorithm)
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return algorithm, digest.digest() == expected


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--target", choices=("windows-x64", "linux-x64-glibc"), required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--receipt", type=Path, required=True)
    args = parser.parse_args()

    root = args.root.resolve()
    output_dir = args.output_dir if args.output_dir.is_absolute() else root / args.output_dir
    receipt_path = args.receipt if args.receipt.is_absolute() else root / args.receipt
    output_dir.mkdir(parents=True, exist_ok=True)
    receipt_path.parent.mkdir(parents=True, exist_ok=True)

    builder = load_builder()
    inventory = json.loads((root / "config/p42/p42-current-lock-lifecycle-inventory.json").read_text(encoding="utf-8"))
    rows = [row for row in inventory["dependencyLifecycleRows"] if row["targetApplicability"][args.target]]
    evidence: list[dict[str, Any]] = []
    failures: list[dict[str, Any]] = []

    for row in rows:
        safe_name = row["name"].replace("@", "").replace("/", "__")
        archive_path = output_dir / f"{safe_name}-{row['version']}.tgz"
        try:
            byte_length, final_url = download(row["resolved"], archive_path)
            algorithm, sri_ok = verify_integrity(archive_path, row["integrity"])
            if not sri_ok:
                raise RuntimeError("sri_mismatch")
            inspected = builder.inspect_archive(archive_path, row["name"], row["version"])
            if not inspected["manifestMatchesLockTuple"]:
                raise RuntimeError("archive_manifest_tuple_mismatch")
            evidence.append({
                "packagePath": row["packagePath"],
                "name": row["name"],
                "version": row["version"],
                "resolved": row["resolved"],
                "finalUrl": final_url,
                "integrity": row["integrity"],
                "sriAlgorithm": algorithm,
                "sriVerified": True,
                "archivePath": archive_path.relative_to(root).as_posix(),
                "byteLength": byte_length,
                "sha256": sha256_file(archive_path),
                **inspected,
            })
        except Exception as error:  # noqa: BLE001 - receipt must preserve exact failure
            failures.append({
                "packagePath": row["packagePath"],
                "name": row["name"],
                "version": row["version"],
                "error": str(error),
            })

    evidence.sort(key=lambda row: row["packagePath"].encode("utf-8"))
    failures.sort(key=lambda row: row["packagePath"].encode("utf-8"))
    receipt: dict[str, Any] = {
        "schemaVersion": "velmere.p42.lifecycle-archive-quarantine-evidence.v1",
        "revision": "P42_V16_CURRENT_LOCK_LIFECYCLE_QUARANTINE_ACTION_PINNING",
        "generatedAt": FIXED_GENERATED_AT,
        "target": args.target,
        "mode": "NETWORK_ACQUISITION_SRI_VERIFICATION_STATIC_INSPECTION_NO_EXECUTION",
        "expectedApplicableRows": len(rows),
        "acquiredAndVerifiedRows": len(evidence),
        "failures": failures,
        "evidence": evidence,
        "status": "PASS" if not failures and len(evidence) == len(rows) else "FAIL",
        "creditBoundary": {
            "dependencyCodeExecuted": False,
            "lifecycleExecutionAuthorized": False,
            "npmCiWithoutIgnoreScriptsAuthorized": False,
            "dependencyClosure": False,
            "semanticOrBuildClosure": False,
        },
    }
    receipt["integritySha256"] = hashlib.sha256(
        json.dumps(receipt, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({
        "status": receipt["status"],
        "target": args.target,
        "acquired": len(evidence),
        "expected": len(rows),
        "receipt": receipt_path.relative_to(root).as_posix(),
    }, indent=2))
    return 0 if receipt["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
