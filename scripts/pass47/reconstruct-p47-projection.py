#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import gzip
import hashlib
import json
import shutil
import subprocess
import tarfile
from pathlib import Path, PurePosixPath
from typing import Any


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_file(path: Path, size: int, sha256: str, label: str) -> None:
    if not path.is_file():
        raise RuntimeError(f"{label}_missing:{path}")
    observed_size = path.stat().st_size
    observed_sha = sha256_file(path)
    if observed_size != size or observed_sha != sha256:
        raise RuntimeError(
            f"{label}_integrity_mismatch:size={observed_size}/{size}:sha={observed_sha}/{sha256}"
        )


def safe_extract_tar(tar_path: Path, destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    root = destination.resolve()
    with tarfile.open(tar_path, "r:") as archive:
        for member in archive.getmembers():
            pure = PurePosixPath(member.name)
            if pure.is_absolute() or ".." in pure.parts:
                raise RuntimeError(f"unsafe_tar_path:{member.name}")
            if member.issym() or member.islnk() or member.isdev():
                raise RuntimeError(f"unsupported_tar_member:{member.name}:{member.type!r}")
            target = (root / Path(*pure.parts)).resolve()
            if target != root and root not in target.parents:
                raise RuntimeError(f"tar_path_outside_root:{member.name}")
        archive.extractall(root, filter="data")


def projection_identity(root: Path, manifest: dict[str, Any]) -> dict[str, Any]:
    expected_rows = manifest["files"]
    expected_paths = [row["path"] for row in expected_rows]
    actual_paths = sorted(
        path.relative_to(root).as_posix()
        for path in root.rglob("*")
        if path.is_file()
    )
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
        sha = sha256_file(path)
        rows.append({"path": expected["path"], "byteLength": size, "sha256": sha})
        total += size
        if size != expected["byteLength"] or sha != expected["sha256"]:
            mismatches.append(
                {
                    "path": expected["path"],
                    "expectedByteLength": expected["byteLength"],
                    "actualByteLength": size,
                    "expectedSha256": expected["sha256"],
                    "actualSha256": sha,
                }
            )
    path_set = sha256_bytes("\n".join(row["path"] for row in rows).encode("utf-8"))
    aggregate = hashlib.sha256()
    for row in rows:
        aggregate.update(
            f"{row['path']}\0{row['byteLength']}\0{row['sha256']}\n".encode("utf-8")
        )
    content_aggregate = aggregate.hexdigest()
    expected = manifest["projection"]
    passed = (
        not missing
        and not unexpected
        and not mismatches
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
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--base-gzip", required=True)
    parser.add_argument("--parts-root", required=True)
    parser.add_argument("--work-root", required=True)
    parser.add_argument("--output-root", required=True)
    arguments = parser.parse_args()

    manifest_path = Path(arguments.manifest).resolve()
    base_gzip = Path(arguments.base_gzip).resolve()
    parts_root = Path(arguments.parts_root).resolve()
    work_root = Path(arguments.work_root).resolve()
    output_root = Path(arguments.output_root).resolve()
    output_root.mkdir(parents=True, exist_ok=True)
    receipt_path = output_root / "P47_PROJECTION_RECONSTRUCTION_RECEIPT.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    receipt: dict[str, Any] = {
        "schemaVersion": "velmere.p47.projection-reconstruction-receipt.v1",
        "status": "IN_PROGRESS",
        "classification": manifest["classification"],
        "manifest": {"path": str(manifest_path), "sha256": sha256_file(manifest_path)},
        "fullP46SourceBinding": manifest["fullP46SourceBinding"],
        "truthBoundary": manifest["truthBoundary"],
    }
    try:
        if work_root.exists():
            shutil.rmtree(work_root)
        work_root.mkdir(parents=True)
        base_tar = work_root / "p42-base.tar"
        base_tar.write_bytes(gzip.decompress(base_gzip.read_bytes()))
        base = manifest["baseArtifact"]
        verify_file(
            base_tar,
            base["uncompressedTarByteLength"],
            base["uncompressedTarSha256"],
            "base_tar",
        )
        receipt["baseArtifact"] = {
            "gzipPath": str(base_gzip),
            "gzipByteLength": base_gzip.stat().st_size,
            "gzipSha256": sha256_file(base_gzip),
            "uncompressedTarPath": str(base_tar),
            "uncompressedTarByteLength": base_tar.stat().st_size,
            "uncompressedTarSha256": sha256_file(base_tar),
        }

        patch_bytes = bytearray()
        part_receipts = []
        for expected in manifest["zstdPatch"]["parts"]:
            file_name = PurePosixPath(expected["path"]).name
            path = parts_root / file_name
            verify_file(
                path,
                expected["base64ByteLength"],
                expected["base64Sha256"],
                f"patch_part_base64_{expected['index']:02d}",
            )
            decoded = base64.b64decode(path.read_bytes(), validate=True)
            if len(decoded) != expected["rawByteLength"] or sha256_bytes(decoded) != expected["rawSha256"]:
                raise RuntimeError(f"patch_part_raw_integrity_mismatch:{expected['index']:02d}")
            patch_bytes.extend(decoded)
            part_receipts.append(
                {
                    "index": expected["index"],
                    "path": str(path),
                    "base64ByteLength": path.stat().st_size,
                    "base64Sha256": sha256_file(path),
                    "rawByteLength": len(decoded),
                    "rawSha256": sha256_bytes(decoded),
                }
            )
        patch_path = work_root / "p42-to-p46-projection.zstpatch"
        patch_path.write_bytes(patch_bytes)
        verify_file(
            patch_path,
            manifest["zstdPatch"]["byteLength"],
            manifest["zstdPatch"]["sha256"],
            "zstd_patch",
        )
        receipt["zstdPatch"] = {
            "path": str(patch_path),
            "byteLength": patch_path.stat().st_size,
            "sha256": sha256_file(patch_path),
            "parts": part_receipts,
        }

        zstd = shutil.which("zstd") or shutil.which("zstd.exe")
        if not zstd:
            candidates = [
                Path(r"C:\Program Files\Git\usr\bin\zstd.exe"),
                Path(r"C:\Program Files\Git\mingw64\bin\zstd.exe"),
                Path(r"C:\ProgramData\chocolatey\bin\zstd.exe"),
                Path(r"C:\Program Files\zstd\zstd.exe"),
            ]
            zstd = next((str(path) for path in candidates if path.is_file()), None)
        if not zstd:
            raise RuntimeError("zstd_cli_not_found_on_windows_runner")
        version = subprocess.run(
            [zstd, "--version"], capture_output=True, text=True, check=False
        )
        projection_tar = work_root / "p46-build-projection.tar"
        command = [
            zstd,
            "-d",
            f"--patch-from={base_tar}",
            str(patch_path),
            "-o",
            str(projection_tar),
            "-f",
        ]
        result = subprocess.run(command, capture_output=True, text=True, check=False)
        receipt["zstd"] = {
            "executable": zstd,
            "versionStdout": version.stdout.strip(),
            "versionStderr": version.stderr.strip(),
            "command": command,
            "exitCode": result.returncode,
            "stdout": result.stdout[-8000:],
            "stderr": result.stderr[-8000:],
        }
        if result.returncode != 0:
            raise RuntimeError(f"zstd_patch_reconstruction_failed:{result.returncode}")
        verify_file(
            projection_tar,
            manifest["projectionTar"]["byteLength"],
            manifest["projectionTar"]["sha256"],
            "projection_tar",
        )
        receipt["projectionTar"] = {
            "path": str(projection_tar),
            "byteLength": projection_tar.stat().st_size,
            "sha256": sha256_file(projection_tar),
        }

        source_root = work_root / "source"
        safe_extract_tar(projection_tar, source_root)
        identity = projection_identity(source_root, manifest)
        receipt["projectionIdentity"] = identity
        receipt["sourceRoot"] = str(source_root)
        if not identity["pass"]:
            raise RuntimeError("projection_identity_mismatch_after_extraction")

        receipt["status"] = "PASS"
        receipt["decision"] = "PASS_EXACT_P46_BUILD_RELEVANT_PROJECTION_RECONSTRUCTED"
        receipt["credit"] = {
            "projectionReconstruction": "PASS",
            "nativeWindowsSemanticDualBuild": "PENDING_SEPARATE_RUNNER",
            "fullExactWindowsSource": "WITHHELD_NOT_EXECUTED",
        }
        receipt["integritySha256"] = sha256_bytes(
            json.dumps(receipt, sort_keys=True, separators=(",", ":")).encode("utf-8")
        )
        receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(receipt, indent=2))
        return 0
    except Exception as error:
        receipt["status"] = "FAIL"
        receipt["decision"] = "FAIL_CLOSED_PROJECTION_RECONSTRUCTION"
        receipt["error"] = f"{type(error).__name__}: {error}"
        receipt["credit"] = {
            "projectionReconstruction": "WITHHELD",
            "nativeWindowsSemanticDualBuild": "WITHHELD_NOT_EXECUTED",
            "fullExactWindowsSource": "WITHHELD_NOT_EXECUTED",
        }
        receipt["integritySha256"] = sha256_bytes(
            json.dumps(receipt, sort_keys=True, separators=(",", ":")).encode("utf-8")
        )
        receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(receipt, indent=2))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
