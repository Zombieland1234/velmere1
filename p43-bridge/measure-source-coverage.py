#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from typing import BinaryIO


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def stable_json_hash(value: object) -> str:
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()


def git(*args: str, cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args], cwd=cwd, check=True, capture_output=True, text=True
    )


def parse_batch_stream(stream: BinaryIO, expected_count: int):
    for _ in range(expected_count):
        header = stream.readline()
        if not header:
            raise RuntimeError("git_cat_file_batch_ended_early")
        parts = header.rstrip(b"\n").split()
        if len(parts) < 3:
            raise RuntimeError(f"invalid_batch_header:{header!r}")
        oid = parts[0].decode("ascii")
        obj_type = parts[1].decode("ascii")
        size = int(parts[2])
        data = stream.read(size)
        newline = stream.read(1)
        if len(data) != size or newline != b"\n":
            raise RuntimeError(
                f"invalid_batch_payload:{oid}:{size}:{len(data)}:{newline!r}"
            )
        yield oid, obj_type, size, data


def normalize_identity(identity: dict) -> tuple[list[dict], dict]:
    raw_rows = identity.get("files")
    if not isinstance(raw_rows, list):
        raise RuntimeError("identity_files_missing")
    rows: list[dict] = []
    for raw in raw_rows:
        if isinstance(raw, dict):
            rows.append(
                {
                    "path": raw["path"],
                    "sha256": raw["sha256"],
                    "mode": int(raw.get("mode", 420)),
                    "byteLength": int(raw["byteLength"]),
                }
            )
        elif isinstance(raw, list) and len(raw) == 4:
            rows.append(
                {
                    "path": raw[0],
                    "sha256": raw[1],
                    "mode": int(raw[2]),
                    "byteLength": int(raw[3]),
                }
            )
        else:
            raise RuntimeError("unsupported_identity_row")
    metadata = {
        "revision": identity.get("revision", "P43_V16_FAIL_CLOSED_LIFECYCLE_EXACT_LINUX_SEMANTIC_DUAL_BUILD"),
        "fileCount": int(identity["fileCount"]),
        "payloadBytes": int(identity.get("payloadBytes", sum(r["byteLength"] for r in rows))),
        "pathSetSha256": identity["pathSetSha256"],
        "sourceAggregateSha256": identity["sourceAggregateSha256"],
    }
    return rows, metadata


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", required=True)
    parser.add_argument("--identity", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--reconstruct", action="store_true")
    args = parser.parse_args()

    repo = Path(args.repo).resolve()
    identity_path = Path(args.identity).resolve()
    out = Path(args.output_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)

    identity = json.loads(identity_path.read_text(encoding="utf-8"))
    expected_files, meta = normalize_identity(identity)
    expected_count = meta["fileCount"]
    expected_payload = meta["payloadBytes"]
    expected_path_set = meta["pathSetSha256"]
    expected_aggregate = meta["sourceAggregateSha256"]
    if len(expected_files) != expected_count:
        raise RuntimeError(
            f"identity_count_mismatch:{len(expected_files)}:{expected_count}"
        )

    refs = git(
        "for-each-ref",
        "--format=%(refname)",
        "refs/heads",
        "refs/remotes",
        "refs/tags",
        cwd=repo,
    ).stdout.splitlines()
    rev = git("rev-list", "--objects", "--all", cwd=repo).stdout.splitlines()
    object_ids: list[str] = []
    seen: set[str] = set()
    for line in rev:
        oid = line.split(" ", 1)[0]
        if oid not in seen:
            seen.add(oid)
            object_ids.append(oid)

    proc = subprocess.Popen(
        ["git", "cat-file", "--batch"],
        cwd=repo,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    assert proc.stdin is not None and proc.stdout is not None
    proc.stdin.write(("\n".join(object_ids) + "\n").encode("ascii"))
    proc.stdin.close()

    by_sha256: dict[str, dict[str, object]] = {}
    blob_count = 0
    blob_bytes = 0
    for oid, obj_type, size, data in parse_batch_stream(proc.stdout, len(object_ids)):
        if obj_type != "blob":
            continue
        blob_count += 1
        blob_bytes += size
        digest = hashlib.sha256(data).hexdigest()
        if digest not in by_sha256:
            by_sha256[digest] = {"oid": oid, "size": size}
    stderr = proc.stderr.read().decode("utf-8", errors="replace") if proc.stderr else ""
    code = proc.wait()
    if code != 0:
        raise RuntimeError(f"git_cat_file_batch_failed:{code}:{stderr[-4000:]}")

    covered: list[dict] = []
    missing: list[dict] = []
    size_mismatch: list[dict] = []
    covered_bytes = 0
    missing_bytes = 0
    for row in expected_files:
        found = by_sha256.get(row["sha256"])
        if found is None:
            missing.append(row)
            missing_bytes += row["byteLength"]
            continue
        if int(found["size"]) != row["byteLength"]:
            size_mismatch.append({"expected": row, "found": found})
            missing.append(row)
            missing_bytes += row["byteLength"]
            continue
        covered.append({**row, "gitBlobOid": found["oid"]})
        covered_bytes += row["byteLength"]

    reconstructed = None
    if args.reconstruct:
        root = out / "reconstructed-current-source"
        root.mkdir(parents=True, exist_ok=True)
        for row in covered:
            target = root / row["path"]
            target.parent.mkdir(parents=True, exist_ok=True)
            data = subprocess.run(
                ["git", "cat-file", "blob", row["gitBlobOid"]],
                cwd=repo,
                check=True,
                capture_output=True,
            ).stdout
            if (
                len(data) != row["byteLength"]
                or hashlib.sha256(data).hexdigest() != row["sha256"]
            ):
                raise RuntimeError(f"reconstruction_blob_drift:{row['path']}")
            target.write_bytes(data)
            try:
                os.chmod(target, row["mode"])
            except OSError:
                pass
        reconstructed = {
            "root": str(root),
            "coveredFilesWritten": len(covered),
            "coveredBytesWritten": covered_bytes,
        }

    path_set = hashlib.sha256(
        "\n".join(row["path"] for row in expected_files).encode("utf-8")
    ).hexdigest()
    aggregate = hashlib.sha256(
        b"".join(
            f"{row['path']}\0{row['byteLength']}\0{row['mode']}\0{row['sha256']}\n".encode("utf-8")
            for row in expected_files
        )
    ).hexdigest()

    result = {
        "schemaVersion": "velmere.p43.github-all-refs-source-reconstruction-coverage.v1",
        "status": "PASS" if not size_mismatch else "FAIL",
        "classification": (
            "ALL_CURRENT_SOURCE_BLOBS_FOUND_ACROSS_GITHUB_REFS"
            if not missing
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
            "identityPath": str(identity_path),
            "identitySha256": sha256_file(identity_path),
            "revision": meta["revision"],
            "expectedFileCount": expected_count,
            "expectedPayloadBytes": expected_payload,
            "expectedPathSetSha256": expected_path_set,
            "expectedSourceAggregateSha256": expected_aggregate,
            "recomputedPathSetSha256": path_set,
            "recomputedSourceAggregateSha256": aggregate,
            "identitySelfConsistencyPass": (
                path_set == expected_path_set and aggregate == expected_aggregate
            ),
        },
        "gitObjectInventory": {
            "refCount": len(refs),
            "refs": refs,
            "revListObjectCount": len(object_ids),
            "blobCount": blob_count,
            "blobBytes": blob_bytes,
            "uniqueSha256BlobCount": len(by_sha256),
        },
        "coverage": {
            "coveredFiles": len(covered),
            "missingFiles": len(missing),
            "coveredBytes": covered_bytes,
            "missingBytes": missing_bytes,
            "fileCoveragePercent": round(100 * len(covered) / expected_count, 6),
            "byteCoveragePercent": round(100 * covered_bytes / expected_payload, 6),
            "complete": len(missing) == 0,
            "sizeMismatchCount": len(size_mismatch),
        },
        "reconstruction": reconstructed,
        "truthBoundary": "This receipt measures whether exact P43 source bytes already exist as Git blobs across fetched repository refs. It grants no semantic, build, Browser, PDF, rights, value, sale or GO credit.",
    }
    result["integritySha256"] = stable_json_hash(result)

    (out / "P43_GITHUB_ALL_REFS_SOURCE_RECONSTRUCTION_COVERAGE.json").write_text(
        json.dumps(result, indent=2) + "\n", encoding="utf-8"
    )
    (out / "P43_GITHUB_ALL_REFS_MISSING_SOURCE_ROWS.json").write_text(
        json.dumps(
            {
                "schemaVersion": "velmere.p43.github-all-refs-missing-source-rows.v1",
                "missing": missing,
                "sizeMismatches": size_mismatch,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    (out / "P43_GITHUB_ALL_REFS_COVERED_SOURCE_ROWS.json").write_text(
        json.dumps(
            {
                "schemaVersion": "velmere.p43.github-all-refs-covered-source-rows.v1",
                "covered": covered,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(json.dumps(result, indent=2))
    return 0 if result["status"] == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
