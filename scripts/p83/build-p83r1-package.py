#!/usr/bin/env python3
"""Build and independently verify deterministic P83R1 SOURCE_ONLY ZIP bytes."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import Any

FIXED_TIME = (1980, 1, 1, 0, 0, 0)
IDENTITY_REL = "artifacts/closure/p83r1/P83R1_TREE_IDENTITY_EXCLUDING_SELF.json"
PRIVATE_KEY_BLOCK_RE = re.compile(
    rb"-----BEGIN (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----\r?\n"
    rb"(?:[A-Za-z0-9+/=]{16,}\r?\n){2,}"
    rb"-----END (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----"
)
TOKEN_PATTERNS = {
    "aws_access_key_id": re.compile(rb"AKIA[0-9A-Z]{16}"),
    "stripe_live_secret": re.compile(rb"sk_live_[A-Za-z0-9]{16,}"),
    "stripe_webhook_secret": re.compile(rb"whsec_[A-Za-z0-9]{16,}"),
    "github_fine_grained_pat": re.compile(rb"github_pat_[A-Za-z0-9_]{20,}"),
    "github_classic_pat": re.compile(rb"ghp_[A-Za-z0-9]{30,}"),
    "openai_api_key": re.compile(rb"(?<![A-Za-z0-9_-])sk-(?:proj-)?[A-Za-z0-9_-]{24,}"),
    "google_api_key": re.compile(rb"AIza[0-9A-Za-z_-]{30,}"),
}


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(4 * 1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def canonical_projection(rows: list[dict[str, Any]]) -> dict[str, Any]:
    rows = sorted(rows, key=lambda row: row["path"])
    path_hash = hashlib.sha256("\n".join(row["path"] for row in rows).encode()).hexdigest()
    aggregate = hashlib.sha256()
    for row in rows:
        aggregate.update(f"{row['path']}\0{row['byteLength']}\0{row['sha256']}\n".encode())
    return {
        "fileCount": len(rows),
        "payloadBytes": sum(row["byteLength"] for row in rows),
        "pathSetSha256": path_hash,
        "sourceContentAggregateSha256": aggregate.hexdigest(),
    }


def source_rows(root: Path) -> list[dict[str, Any]]:
    rows = []
    for path in sorted((p for p in root.rglob("*") if p.is_file()), key=lambda p: p.relative_to(root).as_posix()):
        rel = path.relative_to(root).as_posix()
        if path.is_symlink():
            raise RuntimeError(f"symlink_not_allowed:{rel}")
        if rel.endswith(".pyc") or "/__pycache__/" in f"/{rel}/":
            raise RuntimeError(f"python_cache_not_allowed:{rel}")
        rows.append({"path": rel, "byteLength": path.stat().st_size, "sha256": sha256_file(path)})
    return rows


def scan_private_material(root: Path, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    for row in rows:
        path = root / row["path"]
        overlap = b""
        offset = 0
        seen: set[tuple[str, int]] = set()
        with path.open("rb") as fh:
            while True:
                chunk = fh.read(4 * 1024 * 1024)
                if not chunk:
                    break
                data = overlap + chunk
                base = max(0, offset - len(overlap))
                pem = PRIVATE_KEY_BLOCK_RE.search(data)
                if pem:
                    key = ("private_key_block", base + pem.start())
                    if key not in seen:
                        seen.add(key)
                        findings.append({"path": row["path"], "pattern": key[0], "offsetApprox": key[1]})
                for name, pattern in TOKEN_PATTERNS.items():
                    for match in pattern.finditer(data):
                        key = (name, base + match.start())
                        if key not in seen:
                            seen.add(key)
                            findings.append({"path": row["path"], "pattern": name, "offsetApprox": key[1]})
                overlap = data[-65536:]
                offset += len(chunk)
    return findings


def build_zip(root: Path, output: Path, rows: list[dict[str, Any]]) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=1, strict_timestamps=False) as zf:
        for row in rows:
            rel = row["path"]
            info = zipfile.ZipInfo(rel, FIXED_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 0
            info.external_attr = (0o600 & 0xFFFF) << 16
            info.flag_bits = 0
            with (root / rel).open("rb") as source, zf.open(info, "w", force_zip64=True) as target:
                shutil.copyfileobj(source, target, length=4 * 1024 * 1024)


def validate_metadata_and_crc(path: Path, expected_rows: list[dict[str, Any]]) -> dict[str, Any]:
    expected_names = [row["path"] for row in expected_rows]
    with zipfile.ZipFile(path, "r") as zf:
        infos = zf.infolist()
        names = [info.filename for info in infos]
        if names != expected_names or names != sorted(names):
            raise RuntimeError("zip_path_or_order_mismatch")
        if any(info.is_dir() or info.filename.endswith("/") for info in infos):
            raise RuntimeError("zip_directory_entries_present")
        if any(info.date_time != FIXED_TIME for info in infos):
            raise RuntimeError("zip_timestamp_mismatch")
        if any(info.create_system != 0 for info in infos):
            raise RuntimeError("zip_create_system_mismatch")
        if any(((info.external_attr >> 16) & 0xFFFF) != 0o600 for info in infos):
            raise RuntimeError("zip_external_mode_mismatch")
        expected_map = {row["path"]: row for row in expected_rows}
        for info in infos:
            if info.file_size != expected_map[info.filename]["byteLength"]:
                raise RuntimeError(f"zip_uncompressed_size_mismatch:{info.filename}")
        crc_failure = zf.testzip()
        if crc_failure is not None:
            raise RuntimeError(f"zip_crc_failure:{crc_failure}")
    return {
        "entryCount": len(expected_rows),
        "bytes": path.stat().st_size,
        "sha256": sha256_file(path),
        "crc": "PASS",
        "ordering": "lexicographic",
        "timestamp": "1980-01-01T00:00:00Z",
        "directoryEntries": 0,
        "createSystem": 0,
        "externalMode": "0600",
    }


def files_byte_identical(first: Path, second: Path) -> bool:
    if first.stat().st_size != second.stat().st_size:
        return False
    with first.open("rb") as a, second.open("rb") as b:
        while True:
            ca = a.read(8 * 1024 * 1024)
            cb = b.read(8 * 1024 * 1024)
            if ca != cb:
                return False
            if not ca:
                return True


def verify_one_clean_unpack(zip_path: Path, expected_rows: list[dict[str, Any]]) -> dict[str, Any]:
    with tempfile.TemporaryDirectory(prefix="p83r1-clean-unpack-") as td:
        target = Path(td)
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(target)
        unpacked = source_rows(target)
        if unpacked != expected_rows:
            raise RuntimeError("clean_unpack_identity_mismatch")
    return {"status": "PASS_PATH_AND_CONTENT_IDENTITY", "fileCount": len(expected_rows)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--verification", required=True)
    args = parser.parse_args()
    root = Path(args.root).resolve()
    output = Path(args.output).resolve()
    verification_path = Path(args.verification).resolve()

    rows = source_rows(root)
    identity = json.loads((root / IDENTITY_REL).read_text(encoding="utf-8"))
    if identity["fullPackageFileCountIncludingThisIdentityFile"] != len(rows):
        raise RuntimeError("identity_file_count_mismatch")
    nonself = [row for row in rows if row["path"] != IDENTITY_REL]
    expected_nonself = {key: identity[key] for key in ["fileCount", "payloadBytes", "pathSetSha256", "sourceContentAggregateSha256"]}
    if canonical_projection(nonself) != expected_nonself:
        raise RuntimeError("identity_receipt_mismatch")
    private_findings = scan_private_material(root, rows)
    if private_findings:
        raise RuntimeError(f"private_material_found:{private_findings[:20]}")

    with tempfile.TemporaryDirectory(prefix="p83r1-package-build-") as td:
        first = Path(td) / "build-a.zip"
        second = Path(td) / "build-b.zip"
        build_zip(root, first, rows)
        build_zip(root, second, rows)
        if not files_byte_identical(first, second):
            raise RuntimeError("deterministic_rebuild_not_byte_identical")
        verify_a = validate_metadata_and_crc(first, rows)
        verify_b = validate_metadata_and_crc(second, rows)
        clean_unpack = verify_one_clean_unpack(first, rows)
        shutil.copyfile(first, output)

    final_hash = sha256_file(output)
    if final_hash != verify_a["sha256"] or output.stat().st_size != verify_a["bytes"]:
        raise RuntimeError("final_copy_identity_mismatch")
    payload = {
        "schemaVersion": "velmere.p83r1.deterministic-package-verification.v1",
        "status": "PASS",
        "output": output.name,
        "deterministicRebuild": "2/2 BYTE_IDENTICAL",
        "buildA": verify_a,
        "buildB": verify_b,
        "final": {**verify_a, "sha256": final_hash, "cleanUnpack": clean_unpack["status"]},
        "treeIdentity": canonical_projection(rows),
        "privateKeySecretScan": {"status": "PASS", "matches": 0},
        "ledgerInsideZip": False,
        "identityReceiptExcludesOnlySelf": True,
        "truthBoundary": "External verification binds final ZIP bytes after two independent deterministic builds, CRC of both and one full clean-unpack path/content replay. The package grants no staging PostgreSQL execution, deployed atomicity, current deployment fact, exploitability, rights expansion, Customer FINAL or Audit FINAL PDF credit.",
    }
    verification_path.parent.mkdir(parents=True, exist_ok=True)
    verification_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
