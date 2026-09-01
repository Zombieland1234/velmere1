#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import lzma
import shutil
import tarfile
from pathlib import Path, PurePosixPath
from typing import Any


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def stable_sha(value: object) -> str:
    return sha256_bytes(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))


def safe_target(root: Path, member_name: str) -> Path:
    pure = PurePosixPath(member_name)
    if not member_name or pure.is_absolute() or ".." in pure.parts or "\\" in member_name:
        raise RuntimeError(f"unsafe_tar_path:{member_name}")
    target = (root / Path(*pure.parts)).resolve()
    if target != root and root not in target.parents:
        raise RuntimeError(f"tar_path_outside_root:{member_name}")
    return target


def safe_extract_tar_bytes(tar_bytes: bytes, destination: Path) -> list[dict[str, Any]]:
    destination.mkdir(parents=True, exist_ok=True)
    root = destination.resolve()
    tar_path = destination.parent / "p46-build-projection.tar"
    tar_path.write_bytes(tar_bytes)
    rows: list[dict[str, Any]] = []
    with tarfile.open(tar_path, "r:") as archive:
        seen: set[str] = set()
        for member in archive.getmembers():
            if member.name in seen:
                raise RuntimeError(f"duplicate_tar_member:{member.name}")
            seen.add(member.name)
            target = safe_target(root, member.name)
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            if not member.isfile():
                raise RuntimeError(f"unsupported_tar_member:{member.name}:{member.type!r}")
            source = archive.extractfile(member)
            if source is None:
                raise RuntimeError(f"tar_member_unreadable:{member.name}")
            data = source.read()
            if len(data) != member.size:
                raise RuntimeError(f"tar_member_size_mismatch:{member.name}:{len(data)}:{member.size}")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            rows.append({"path": member.name, "byteLength": len(data), "sha256": sha256_bytes(data)})
    return rows


def projection_identity(root: Path, projection_manifest: dict[str, Any]) -> dict[str, Any]:
    expected_rows = projection_manifest["files"]
    expected_paths = [row["path"] for row in expected_rows]
    actual_paths = sorted(path.relative_to(root).as_posix() for path in root.rglob("*") if path.is_file())
    missing = sorted(set(expected_paths) - set(actual_paths))
    unexpected = sorted(set(actual_paths) - set(expected_paths))
    mismatches: list[dict[str, Any]] = []
    rows: list[dict[str, Any]] = []
    total = 0
    for expected in expected_rows:
        path = root / Path(*PurePosixPath(expected["path"]).parts)
        if not path.is_file():
            continue
        size = path.stat().st_size
        digest = sha256_file(path)
        row = {"path": expected["path"], "byteLength": size, "sha256": digest}
        rows.append(row)
        total += size
        if size != expected["byteLength"] or digest != expected["sha256"]:
            mismatches.append({
                "path": expected["path"],
                "expectedByteLength": expected["byteLength"],
                "actualByteLength": size,
                "expectedSha256": expected["sha256"],
                "actualSha256": digest,
            })
    path_set = sha256_bytes("\n".join(row["path"] for row in rows).encode("utf-8"))
    aggregate = hashlib.sha256()
    for row in rows:
        aggregate.update(f"{row['path']}\0{row['byteLength']}\0{row['sha256']}\n".encode("utf-8"))
    content_aggregate = aggregate.hexdigest()
    expected = projection_manifest["projection"]
    passed = (
        not missing and not unexpected and not mismatches
        and len(rows) == expected["fileCount"]
        and total == expected["payloadBytes"]
        and path_set == expected["pathSetSha256"]
        and content_aggregate == expected["sourceContentAggregateSha256"]
    )
    return {
        "pass": passed,
        "fileCount": len(rows),
        "payloadBytes": total,
        "pathSetSha256": path_set,
        "sourceContentAggregateSha256": content_aggregate,
        "missing": missing,
        "unexpected": unexpected,
        "mismatches": mismatches,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--transport-manifest", required=True)
    parser.add_argument("--expected-transport-manifest-sha256", required=True)
    parser.add_argument("--projection-manifest", required=True)
    parser.add_argument("--runner", required=True)
    parser.add_argument("--parts-root", required=True)
    parser.add_argument("--work-root", required=True)
    parser.add_argument("--output-root", required=True)
    args = parser.parse_args()

    transport_path = Path(args.transport_manifest).resolve()
    projection_path = Path(args.projection_manifest).resolve()
    runner_path = Path(args.runner).resolve()
    parts_root = Path(args.parts_root).resolve()
    work_root = Path(args.work_root).resolve()
    output_root = Path(args.output_root).resolve()
    output_root.mkdir(parents=True, exist_ok=True)
    receipt_path = output_root / "P49_DIRECT_PROJECTION_RECONSTRUCTION_RECEIPT.json"
    receipt: dict[str, Any] = {
        "schemaVersion": "velmere.p49.direct-projection-reconstruction-receipt.v1",
        "status": "IN_PROGRESS",
        "truthBoundary": "This receipt may credit only deterministic reconstruction of the exact 1597-file P46 build-relevant projection. Native Windows semantic/lint/dual-build and full-source credit remain separate.",
    }
    try:
        observed_transport_sha = sha256_file(transport_path)
        expected_transport_sha = args.expected_transport_manifest_sha256.lower()
        if observed_transport_sha != expected_transport_sha:
            raise RuntimeError(f"transport_manifest_sha_mismatch:{observed_transport_sha}:{expected_transport_sha}")
        transport = json.loads(transport_path.read_text(encoding="utf-8"))
        projection = json.loads(projection_path.read_text(encoding="utf-8"))
        receipt["transportManifest"] = {"path": str(transport_path), "sha256": observed_transport_sha}
        receipt["fullP46SourceBinding"] = transport["fullP46SourceBinding"]

        supports = transport["supportFiles"]
        for key, path in (("projectionManifest", projection_path), ("runner", runner_path)):
            expected = supports[key]
            if not path.is_file() or path.stat().st_size != expected["byteLength"] or sha256_file(path) != expected["sha256"]:
                raise RuntimeError(f"support_file_integrity_mismatch:{key}:{path}")
        if projection["fullP46SourceBinding"] != transport["fullP46SourceBinding"] or projection["projection"] != transport["projection"]:
            raise RuntimeError("projection_manifest_binding_mismatch")

        chunks: list[bytes] = []
        part_receipts: list[dict[str, Any]] = []
        for expected in transport["base64Transport"]["parts"]:
            path = parts_root / PurePosixPath(expected["path"]).name
            if not path.is_file():
                raise RuntimeError(f"transport_part_missing:{expected['index']:02d}:{path}")
            data = path.read_bytes()
            observed = {"index": expected["index"], "path": str(path), "byteLength": len(data), "sha256": sha256_bytes(data)}
            if observed["byteLength"] != expected["byteLength"] or observed["sha256"] != expected["sha256"]:
                raise RuntimeError(f"transport_part_integrity_mismatch:{expected['index']:02d}")
            chunks.append(data)
            part_receipts.append(observed)
        combined = b"".join(chunks)
        b64_contract = transport["base64Transport"]
        if len(combined) != b64_contract["byteLength"] or sha256_bytes(combined) != b64_contract["sha256"]:
            raise RuntimeError("combined_base64_integrity_mismatch")
        try:
            xz_bytes = base64.b64decode(combined, validate=True)
        except Exception as error:
            raise RuntimeError(f"strict_base64_decode_failed:{type(error).__name__}:{error}") from error
        xz_contract = transport["xzArchive"]
        if len(xz_bytes) != xz_contract["byteLength"] or sha256_bytes(xz_bytes) != xz_contract["sha256"]:
            raise RuntimeError("xz_archive_integrity_mismatch")
        try:
            tar_bytes = lzma.decompress(xz_bytes, format=lzma.FORMAT_XZ)
        except Exception as error:
            raise RuntimeError(f"xz_decompression_failed:{type(error).__name__}:{error}") from error
        tar_contract = transport["projectionTar"]
        if len(tar_bytes) != tar_contract["byteLength"] or sha256_bytes(tar_bytes) != tar_contract["sha256"]:
            raise RuntimeError("projection_tar_integrity_mismatch")

        if work_root.exists():
            shutil.rmtree(work_root)
        work_root.mkdir(parents=True)
        source_root = work_root / "source"
        extracted = safe_extract_tar_bytes(tar_bytes, source_root)
        identity = projection_identity(source_root, projection)
        if not identity["pass"]:
            raise RuntimeError("projection_identity_mismatch_after_extraction")
        receipt.update({
            "status": "PASS",
            "decision": "PASS_SELF_CONTAINED_EXACT_P46_BUILD_RELEVANT_PROJECTION_RECONSTRUCTED",
            "parts": part_receipts,
            "combinedBase64": {"byteLength": len(combined), "sha256": sha256_bytes(combined)},
            "xzArchive": {"byteLength": len(xz_bytes), "sha256": sha256_bytes(xz_bytes)},
            "projectionTar": {"path": str(work_root / 'p46-build-projection.tar'), "byteLength": len(tar_bytes), "sha256": sha256_bytes(tar_bytes)},
            "extractedFileCount": len(extracted),
            "projectionIdentity": identity,
            "sourceRoot": str(source_root),
            "credit": {
                "selfContainedProjectionTransport": "PASS",
                "nativeWindowsSemanticLintDualBuild": "PENDING_SEPARATE_RUNNER",
                "fullExactWindowsSource": "WITHHELD_NOT_EXECUTED",
            },
        })
        receipt["integritySha256"] = stable_sha(receipt)
        receipt_path.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(json.dumps(receipt, indent=2, ensure_ascii=False))
        return 0
    except Exception as error:
        receipt.update({
            "status": "FAIL",
            "decision": "FAIL_CLOSED_SELF_CONTAINED_PROJECTION_RECONSTRUCTION",
            "error": f"{type(error).__name__}: {error}",
            "credit": {
                "selfContainedProjectionTransport": "WITHHELD",
                "nativeWindowsSemanticLintDualBuild": "WITHHELD_NOT_EXECUTED",
                "fullExactWindowsSource": "WITHHELD_NOT_EXECUTED",
            },
        })
        receipt["integritySha256"] = stable_sha(receipt)
        receipt_path.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(json.dumps(receipt, indent=2, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
