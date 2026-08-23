#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from typing import BinaryIO, Iterator

MAGIC = b"P43I8\0"


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def canonical_hash(value: object) -> str:
    return sha256_bytes(json.dumps(value, sort_keys=True, separators=(",", ":")).encode())


def read_varint(data: bytes, offset: int) -> tuple[int, int]:
    value = 0
    shift = 0
    while True:
        if offset >= len(data):
            raise RuntimeError("truncated_varint")
        byte = data[offset]
        offset += 1
        value |= (byte & 0x7F) << shift
        if not byte & 0x80:
            return value, offset
        shift += 7
        if shift > 63:
            raise RuntimeError("varint_overflow")


def decode_identity(path: Path) -> dict:
    data = path.read_bytes()
    if not data.startswith(MAGIC):
        raise RuntimeError("identity_magic_mismatch")
    offset = len(MAGIC)
    source_aggregate = data[offset : offset + 32].hex()
    offset += 32
    path_set = data[offset : offset + 32].hex()
    offset += 32
    file_count, offset = read_varint(data, offset)
    payload_bytes, offset = read_varint(data, offset)
    rows = []
    previous = ""
    for _ in range(file_count):
        common, offset = read_varint(data, offset)
        suffix_length, offset = read_varint(data, offset)
        suffix = data[offset : offset + suffix_length].decode("utf-8")
        offset += suffix_length
        prefix = data[offset : offset + 4].hex()
        offset += 4
        byte_length, offset = read_varint(data, offset)
        mode = 493 if data[offset] else 420
        offset += 1
        current_path = previous[:common] + suffix
        rows.append(
            {
                "path": current_path,
                "sha256Prefix32": prefix,
                "byteLength": byte_length,
                "mode": mode,
            }
        )
        previous = current_path
    if offset != len(data):
        raise RuntimeError(f"identity_trailing_bytes:{len(data)-offset}")
    return {
        "sourceAggregateSha256": source_aggregate,
        "pathSetSha256": path_set,
        "fileCount": file_count,
        "payloadBytes": payload_bytes,
        "files": rows,
    }


def git(*args: str, cwd: Path, text: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True, text=text)


def parse_batch_stream(stream: BinaryIO, count: int) -> Iterator[tuple[str, str, int, bytes]]:
    for _ in range(count):
        header = stream.readline()
        if not header:
            raise RuntimeError("batch_ended_early")
        parts = header.rstrip(b"\n").split()
        if len(parts) < 3:
            raise RuntimeError(f"invalid_batch_header:{header!r}")
        oid = parts[0].decode()
        obj_type = parts[1].decode()
        size = int(parts[2])
        payload = stream.read(size)
        newline = stream.read(1)
        if len(payload) != size or newline != b"\n":
            raise RuntimeError(f"invalid_batch_payload:{oid}")
        yield oid, obj_type, size, payload
    trailing = stream.read()
    if trailing.strip():
        raise RuntimeError(f"batch_trailing_bytes:{len(trailing)}")


def run_batch_to_file(repo: Path, object_ids: list[str], input_path: Path, output_path: Path) -> None:
    input_path.write_text("\n".join(object_ids) + "\n", encoding="ascii")
    with input_path.open("rb") as stdin, output_path.open("wb") as stdout:
        process = subprocess.run(
            ["git", "cat-file", "--batch"],
            cwd=repo,
            stdin=stdin,
            stdout=stdout,
            stderr=subprocess.PIPE,
            check=False,
        )
    if process.returncode:
        stderr = process.stderr.decode(errors="replace") if process.stderr else ""
        raise RuntimeError(f"git_cat_file_failed:{process.returncode}:{stderr[-4000:]}")


def write_receipts(output: Path, result: dict, missing: list[dict], ambiguous: list[dict], covered: list[dict]) -> None:
    (output / "P43_GITHUB_ALL_REFS_SOURCE_RECONSTRUCTION_COVERAGE.json").write_text(
        json.dumps(result, indent=2) + "\n", encoding="utf-8"
    )
    (output / "P43_GITHUB_ALL_REFS_MISSING_SOURCE_ROWS.json").write_text(
        json.dumps({"missing": missing, "ambiguous": ambiguous}, indent=2) + "\n", encoding="utf-8"
    )
    (output / "P43_GITHUB_ALL_REFS_COVERED_SOURCE_ROWS.json").write_text(
        json.dumps({"covered": covered}, indent=2) + "\n", encoding="utf-8"
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", required=True)
    parser.add_argument("--identity-bin", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--reconstruct", action="store_true")
    args = parser.parse_args()

    repo = Path(args.repo).resolve()
    identity_path = Path(args.identity_bin).resolve()
    output = Path(args.output_dir).resolve()
    output.mkdir(parents=True, exist_ok=True)
    identity = decode_identity(identity_path)
    rows = identity["files"]

    refs = git(
        "for-each-ref",
        "--format=%(refname)",
        "refs/heads",
        "refs/remotes",
        "refs/tags",
        cwd=repo,
    ).stdout.splitlines()
    rev_rows = git("rev-list", "--objects", "--all", cwd=repo).stdout.splitlines()
    object_ids: list[str] = []
    seen: set[str] = set()
    for row in rev_rows:
        oid = row.split(" ", 1)[0]
        if oid not in seen:
            seen.add(oid)
            object_ids.append(oid)

    all_input = output / ".all-objects.in"
    all_batch = output / ".all-objects.batch"
    run_batch_to_file(repo, object_ids, all_input, all_batch)

    candidates: dict[tuple[str, int], dict[str, dict]] = {}
    blob_count = 0
    blob_bytes = 0
    with all_batch.open("rb") as stream:
        for oid, obj_type, size, payload in parse_batch_stream(stream, len(object_ids)):
            if obj_type != "blob":
                continue
            blob_count += 1
            blob_bytes += size
            full_sha = sha256_bytes(payload)
            candidates.setdefault((full_sha[:8], size), {})[full_sha] = {
                "oid": oid,
                "sha256": full_sha,
                "size": size,
            }

    covered: list[dict] = []
    missing: list[dict] = []
    ambiguous: list[dict] = []
    for row in rows:
        matches = list(candidates.get((row["sha256Prefix32"], row["byteLength"]), {}).values())
        if not matches:
            missing.append(row)
        elif len(matches) > 1:
            ambiguous.append({"expected": row, "matches": matches})
        else:
            covered.append({**row, **matches[0]})

    exact_path_set = hashlib.sha256("\n".join(row["path"] for row in rows).encode()).hexdigest()
    reconstructed = None
    exact_aggregate = None

    if args.reconstruct and not missing and not ambiguous:
        root = output / "reconstructed-current-source"
        root.mkdir(parents=True, exist_ok=True)
        reconstruction_oids = [row["oid"] for row in covered]
        reconstruct_input = output / ".reconstruct.in"
        reconstruct_batch = output / ".reconstruct.batch"
        run_batch_to_file(repo, reconstruction_oids, reconstruct_input, reconstruct_batch)

        exact_rows: list[dict] = []
        with reconstruct_batch.open("rb") as stream:
            for expected, (oid, obj_type, size, payload) in zip(
                covered,
                parse_batch_stream(stream, len(reconstruction_oids)),
                strict=True,
            ):
                if obj_type != "blob" or oid != expected["oid"]:
                    raise RuntimeError(f"reconstruction_object_mismatch:{expected['path']}:{oid}:{obj_type}")
                full_sha = sha256_bytes(payload)
                if size != expected["byteLength"] or full_sha != expected["sha256"]:
                    raise RuntimeError(f"reconstruction_drift:{expected['path']}")
                target = root / expected["path"]
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(payload)
                try:
                    os.chmod(target, expected["mode"])
                except OSError:
                    pass
                exact_rows.append(
                    {
                        "path": expected["path"],
                        "byteLength": expected["byteLength"],
                        "mode": expected["mode"],
                        "sha256": full_sha,
                    }
                )

        exact_aggregate = hashlib.sha256(
            b"".join(
                f"{row['path']}\0{row['byteLength']}\0{row['mode']}\0{row['sha256']}\n".encode()
                for row in exact_rows
            )
        ).hexdigest()
        reconstructed = {
            "root": str(root),
            "fileCount": len(exact_rows),
            "payloadBytes": sum(row["byteLength"] for row in exact_rows),
            "pathSetSha256": exact_path_set,
            "sourceAggregateSha256": exact_aggregate,
            "exactIdentityPass": (
                exact_path_set == identity["pathSetSha256"]
                and exact_aggregate == identity["sourceAggregateSha256"]
                and len(exact_rows) == identity["fileCount"]
                and sum(row["byteLength"] for row in exact_rows) == identity["payloadBytes"]
            ),
        }

    complete = not missing and not ambiguous
    exact_reconstruction_pass = bool(not args.reconstruct or reconstructed and reconstructed["exactIdentityPass"])
    status = "PASS" if complete and exact_reconstruction_pass else "FAIL"
    covered_bytes = sum(row["byteLength"] for row in covered)
    missing_bytes = sum(row["byteLength"] for row in missing)
    result = {
        "schemaVersion": "velmere.p43.github-all-refs-source-reconstruction-coverage.v3",
        "status": status,
        "classification": (
            "ALL_CURRENT_SOURCE_BLOBS_FOUND_AND_EXACTLY_RECONSTRUCTED_ACROSS_GITHUB_REFS"
            if status == "PASS" and args.reconstruct
            else "ALL_CURRENT_SOURCE_BLOBS_FOUND_ACROSS_GITHUB_REFS"
            if complete
            else "PARTIAL_CURRENT_SOURCE_BLOB_COVERAGE_ACROSS_GITHUB_REFS"
        ),
        "runtime": {
            "platform": sys.platform,
            "python": sys.version.split()[0],
            "githubSha": os.getenv("GITHUB_SHA"),
            "githubRunId": os.getenv("GITHUB_RUN_ID"),
            "runnerOs": os.getenv("RUNNER_OS"),
            "imageOs": os.getenv("ImageOS"),
        },
        "identityBinding": {
            "compactIdentitySha256": sha256_bytes(identity_path.read_bytes()),
            "expectedFileCount": identity["fileCount"],
            "expectedPayloadBytes": identity["payloadBytes"],
            "expectedPathSetSha256": identity["pathSetSha256"],
            "expectedSourceAggregateSha256": identity["sourceAggregateSha256"],
            "recomputedPathSetSha256": exact_path_set,
            "pathSetPass": exact_path_set == identity["pathSetSha256"],
            "hashPrefixBits": 32,
            "exactAggregateVerifiedAfterReconstruction": exact_aggregate,
        },
        "gitObjectInventory": {
            "refCount": len(refs),
            "refs": refs,
            "revListObjectCount": len(object_ids),
            "blobCount": blob_count,
            "blobBytes": blob_bytes,
            "candidateBuckets": len(candidates),
        },
        "coverage": {
            "coveredFiles": len(covered),
            "missingFiles": len(missing),
            "ambiguousFiles": len(ambiguous),
            "coveredBytes": covered_bytes,
            "missingBytes": missing_bytes,
            "fileCoveragePercent": round(100 * len(covered) / identity["fileCount"], 6),
            "byteCoveragePercent": round(100 * covered_bytes / identity["payloadBytes"], 6),
            "complete": complete,
        },
        "reconstruction": reconstructed,
        "implementation": {
            "catFileTransport": "FILE_BACKED_BATCH_NO_PIPE_DEADLOCK",
            "reconstructionTransport": "SECOND_FILE_BACKED_BATCH",
            "perFileGitProcessSpawns": 0,
        },
        "truthBoundary": "32-bit prefixes are discovery keys only. Exact credit requires reconstructed full SHA-256 rows and the exact P43 source aggregate/path-set match.",
    }
    result["integritySha256"] = canonical_hash(result)
    write_receipts(output, result, missing, ambiguous, covered)

    for temporary in (all_input, all_batch, output / ".reconstruct.in", output / ".reconstruct.batch"):
        try:
            temporary.unlink()
        except FileNotFoundError:
            pass

    print(json.dumps(result, indent=2))
    return 0 if status == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
