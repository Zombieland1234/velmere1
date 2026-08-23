#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import lzma
import os
import tarfile
from pathlib import Path, PurePosixPath
from typing import Any

PARTS = [
    {"name": "payload.part-00.b64", "byteLength": 14800, "sha256": "97a79683f603abef0b24bd07641dc99e39d24b2bd4dcd4f6050d8ee31245ee85"},
    {"name": "payload.part-01.b64", "byteLength": 14800, "sha256": "b8569887ef4130d7f52cc3463359454c99d2be1e6a597b204cf7a4d26521ec6a"},
    {"name": "payload.part-02.b64", "byteLength": 14704, "sha256": "8ffb8e450afaec5cceeec2674f3da817b7a02237bfc8066d1232b7db15d47d2c"},
]
EXPECTED = {
    "combinedBase64ByteLength": 44304,
    "combinedBase64Sha256": "83589c64224e0aac63fb90db81b8cd1cf12cba16485ec8d25b18f9ee1374d7d0",
    "xzByteLength": 33228,
    "xzSha256": "a233c925f10071d5eed50fe3861a76c943d856780a3176e3ea3c6abd772e4efe",
    "tarByteLength": 174080,
    "tarSha256": "e18bd9065377bea85ed64e50a634aca430f7824f28d6c9589e73a0e23b471799",
}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def stable_sha256(value: object) -> str:
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return sha256_bytes(encoded)


def safe_member_target(root: Path, member_name: str) -> Path:
    posix = PurePosixPath(member_name)
    if not member_name or posix.is_absolute() or ".." in posix.parts or "\\" in member_name:
        raise RuntimeError(f"unsafe_tar_member:{member_name}")
    target = (root / Path(*posix.parts)).resolve()
    if target != root and root not in target.parents:
        raise RuntimeError(f"tar_member_outside_root:{member_name}")
    return target


def extract_regular_tar(tar_bytes: bytes, destination: Path) -> list[dict[str, Any]]:
    destination.mkdir(parents=True, exist_ok=True)
    tar_path = destination.parent / "P47_A79_CONTROL_PLANE_PAYLOAD.tar"
    tar_path.write_bytes(tar_bytes)
    rows: list[dict[str, Any]] = []
    with tarfile.open(tar_path, mode="r:") as archive:
        for member in archive.getmembers():
            target = safe_member_target(destination, member.name)
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
                rows.append({"path": member.name.rstrip("/"), "type": "directory"})
                continue
            if not member.isfile():
                raise RuntimeError(f"tar_non_regular_member_forbidden:{member.name}:{member.type!r}")
            source = archive.extractfile(member)
            if source is None:
                raise RuntimeError(f"tar_member_unreadable:{member.name}")
            data = source.read()
            if len(data) != member.size:
                raise RuntimeError(f"tar_member_size_mismatch:{member.name}:{len(data)}:{member.size}")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            try:
                os.chmod(target, member.mode & 0o777)
            except OSError:
                pass
            rows.append({"path": member.name, "type": "file", "byteLength": len(data), "sha256": sha256_bytes(data)})
    return rows


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--parts-dir", required=True)
    parser.add_argument("--output-root", required=True)
    parser.add_argument("--receipt", required=True)
    parser.add_argument("--npm-cli", required=True)
    args = parser.parse_args()

    parts_dir = Path(args.parts_dir).resolve()
    output_root = Path(args.output_root).resolve()
    receipt_path = Path(args.receipt).resolve()
    npm_cli = Path(args.npm_cli).resolve()
    receipt_path.parent.mkdir(parents=True, exist_ok=True)

    part_rows: list[dict[str, Any]] = []
    chunks: list[bytes] = []
    for expected in PARTS:
        path = parts_dir / expected["name"]
        if not path.is_file():
            raise RuntimeError(f"missing_transport_part:{path}")
        data = path.read_bytes()
        observed = {"name": expected["name"], "byteLength": len(data), "sha256": sha256_bytes(data)}
        if observed["byteLength"] != expected["byteLength"] or observed["sha256"] != expected["sha256"]:
            raise RuntimeError(f"transport_part_integrity_mismatch:{observed}:{expected}")
        part_rows.append(observed)
        chunks.append(data)

    combined = b"".join(chunks)
    if len(combined) != EXPECTED["combinedBase64ByteLength"] or sha256_bytes(combined) != EXPECTED["combinedBase64Sha256"]:
        raise RuntimeError("combined_base64_integrity_mismatch")
    try:
        xz_bytes = base64.b64decode(combined, validate=True)
    except Exception as error:
        raise RuntimeError(f"strict_base64_decode_failed:{type(error).__name__}:{error}") from error
    if len(xz_bytes) != EXPECTED["xzByteLength"] or sha256_bytes(xz_bytes) != EXPECTED["xzSha256"]:
        raise RuntimeError("xz_integrity_mismatch")
    try:
        tar_bytes = lzma.decompress(xz_bytes, format=lzma.FORMAT_XZ)
    except Exception as error:
        raise RuntimeError(f"xz_decompression_failed:{type(error).__name__}:{error}") from error
    if len(tar_bytes) != EXPECTED["tarByteLength"] or sha256_bytes(tar_bytes) != EXPECTED["tarSha256"]:
        raise RuntimeError("tar_integrity_mismatch")

    if output_root.exists():
        import shutil
        shutil.rmtree(output_root)
    extracted = extract_regular_tar(tar_bytes, output_root)

    manifest_path = output_root / "p47" / "P47_A79_CONTROL_PLANE_MANIFEST.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    verified_files: list[dict[str, Any]] = []
    for row in manifest["files"]:
        relative = PurePosixPath(row["path"])
        file_path = output_root / Path(*relative.parts)
        if not file_path.is_file():
            raise RuntimeError(f"payload_file_missing:{row['path']}")
        observed = {"path": row["path"], "byteLength": file_path.stat().st_size, "sha256": sha256_file(file_path)}
        if observed["byteLength"] != row["byteLength"] or observed["sha256"] != row["sha256"]:
            raise RuntimeError(f"payload_file_integrity_mismatch:{observed}:{row}")
        verified_files.append(observed)

    if not npm_cli.is_file():
        raise RuntimeError(f"npm_cli_missing:{npm_cli}")
    # The P47 harness reads this injected runtime-only value. It is not part of the exact P46 source bytes.
    manifest["npmCliPath"] = str(npm_cli)
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    receipt: dict[str, Any] = {
        "schemaVersion": "velmere.p47.a79-control-plane-transport-reconstruction.v1",
        "status": "PASS",
        "decision": "PASS_EXACT_P46_A79_CONTROL_PLANE_PAYLOAD_RECONSTRUCTED",
        "parts": part_rows,
        "combinedBase64": {"byteLength": len(combined), "sha256": sha256_bytes(combined)},
        "xz": {"byteLength": len(xz_bytes), "sha256": sha256_bytes(xz_bytes)},
        "tar": {"byteLength": len(tar_bytes), "sha256": sha256_bytes(tar_bytes)},
        "extractedEntries": len(extracted),
        "verifiedFiles": verified_files,
        "runtimeInjection": {"npmCliPath": str(npm_cli), "manifestPath": str(manifest_path)},
        "sourceBinding": manifest["fullP46SourceBinding"],
        "truthBoundary": "PASS proves deterministic transport and exact byte identity only for the P46 A60/A79 control-plane projection payload. It is not full P46 source or full Windows build credit.",
    }
    receipt["integritySha256"] = stable_sha256(receipt)
    receipt_path.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
