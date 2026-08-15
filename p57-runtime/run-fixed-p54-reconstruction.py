#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import csv
import hashlib
import io
import json
import lzma
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import tarfile
from typing import Any
import zipfile

TARGET_FILE_COUNT = 1597
TARGET_PAYLOAD_BYTES = 20_952_834
TARGET_PATH_SET_SHA256 = "b8d9b3c2753e3f7f0c0b3a6054cf8c254d2a91b9c9c5d8f37310add478ac3f73"
TARGET_CONTENT_AGGREGATE_SHA256 = "83fd00183e9d8a6c5ec1c27dba81ab99679e204b50e8f45f414a45abd2bd21b7"
TARGET_MANIFEST_B64_BYTES = 99_080
TARGET_MANIFEST_B64_SHA256 = "b8a5b2770d17b894b5622c595a364c55fb2b14eb634b85c82a75b0fa1c3f7806"
TARGET_MANIFEST_XZ_SHA256 = "3ba14e9e1dc7a7a81661ba0d859c8ba38bf040c1303d3210badd7ef3d42b83f7"
TARGET_MANIFEST_TSV_SHA256 = "8f3dbccdaa4f3b8d478b7b6b67e01a1c898efd59824a51758ec84c99c3f6a2ba"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def stable_sha(value: object) -> str:
    return sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8"))


def safe_relpath(value: str) -> str:
    value = value.replace("\\", "/").lstrip("/")
    path = PurePosixPath(value)
    if not value or path.is_absolute() or ".." in path.parts:
        raise ValueError(f"unsafe target path: {value!r}")
    return path.as_posix()


def materialize_target_manifest(checkout: Path, work: Path) -> list[dict[str, Any]]:
    root = checkout / "p50-existing-branch" / "manifest-parts"
    required = [
        "part-00.b64", "part-01-02.b64", "part-03.b64",
        "part-03-suffix-from-9201.b64", "part-04.b64",
        "part-05-06.b64", "part-07-08.b64", "part-09.b64",
    ]
    missing = [name for name in required if not (root / name).is_file()]
    if missing:
        raise FileNotFoundError(f"missing exact manifest fragments: {missing}")

    part03 = (root / "part-03.b64").read_bytes()[:9201] + (root / "part-03-suffix-from-9201.b64").read_bytes()
    part0506 = bytearray((root / "part-05-06.b64").read_bytes())
    if len(part0506) != 20_000:
        raise ValueError(f"unexpected part-05-06 length: {len(part0506)}")
    part0506[17052] = 105
    encoded = b"".join([
        (root / "part-00.b64").read_bytes(),
        (root / "part-01-02.b64").read_bytes(),
        part03,
        (root / "part-04.b64").read_bytes()[:10_000],
        bytes(part0506),
        (root / "part-07-08.b64").read_bytes(),
        (root / "part-09.b64").read_bytes(),
    ])
    if len(encoded) != TARGET_MANIFEST_B64_BYTES or sha256(encoded) != TARGET_MANIFEST_B64_SHA256:
        raise ValueError("exact manifest Base64 identity mismatch")
    compressed = base64.b64decode(encoded, validate=True)
    if sha256(compressed) != TARGET_MANIFEST_XZ_SHA256:
        raise ValueError("exact manifest XZ identity mismatch")
    tsv = lzma.decompress(compressed)
    if sha256(tsv) != TARGET_MANIFEST_TSV_SHA256:
        raise ValueError("exact manifest TSV identity mismatch")

    work.mkdir(parents=True, exist_ok=True)
    (work / "P57_TARGET_MANIFEST.tsv.xz.b64").write_bytes(encoded)
    (work / "P57_TARGET_MANIFEST.tsv").write_bytes(tsv)

    rows: list[dict[str, Any]] = []
    for line_number, raw in enumerate(tsv.decode("utf-8").splitlines(), 1):
        fields = raw.split("\t")
        if len(fields) != 3:
            raise ValueError(f"manifest line {line_number}: expected 3 fields")
        path, byte_length_text, digest = fields
        path = safe_relpath(path)
        byte_length = int(byte_length_text)
        digest = digest.strip().lower()
        if len(digest) != 64 or any(ch not in "0123456789abcdef" for ch in digest):
            raise ValueError(f"manifest line {line_number}: invalid SHA-256")
        rows.append({"path": path, "byteLength": byte_length, "sha256": digest})

    if len(rows) != TARGET_FILE_COUNT:
        raise ValueError(f"manifest row count mismatch: {len(rows)}")
    if sum(row["byteLength"] for row in rows) != TARGET_PAYLOAD_BYTES:
        raise ValueError("manifest payload mismatch")
    path_set = sha256("\n".join(row["path"] for row in rows).encode("utf-8"))
    aggregate = hashlib.sha256()
    for row in rows:
        aggregate.update(f'{row["path"]}\0{row["byteLength"]}\0{row["sha256"]}\n'.encode("utf-8"))
    if path_set != TARGET_PATH_SET_SHA256 or aggregate.hexdigest() != TARGET_CONTENT_AGGREGATE_SHA256:
        raise ValueError("manifest target identity mismatch")
    return rows


def add_digest(digest: str, source: str, wanted: set[str], found: dict[str, str]) -> None:
    if digest in wanted and digest not in found:
        found[digest] = source


def scan_p51_corpus(artifact_zip: Path, wanted: set[str], found: dict[str, str]) -> dict[str, Any]:
    with zipfile.ZipFile(artifact_zip) as archive:
        name = next(name for name in archive.namelist() if name.endswith("P51_ALL_REFS_BLOB_CORPUS.tsv"))
        payload = archive.read(name).decode("utf-8")
    rows = list(csv.DictReader(io.StringIO(payload), delimiter="\t"))
    before = len(found)
    for row in rows:
        add_digest(row["sha256"].strip().lower(), f"{artifact_zip.name}!{name}", wanted, found)
    return {"artifact": artifact_zip.name, "manifestRows": len(rows), "newUniqueTargetHashes": len(found) - before}


def scan_tar_member(artifact_zip: Path, suffix: str, wanted: set[str], found: dict[str, str]) -> dict[str, Any]:
    with zipfile.ZipFile(artifact_zip) as archive:
        name = next(name for name in archive.namelist() if name.endswith(suffix))
        compressed = archive.read(name)
    members = 0
    before = len(found)
    with tarfile.open(fileobj=io.BytesIO(compressed), mode="r:*") as tar:
        for member in tar:
            if not member.isfile():
                continue
            handle = tar.extractfile(member)
            if handle is None:
                continue
            data = handle.read()
            members += 1
            add_digest(sha256(data), f"{artifact_zip.name}!{name}!{member.name}", wanted, found)
    return {"artifact": artifact_zip.name, "member": name, "filesScanned": members, "newUniqueTargetHashes": len(found) - before}


def scan_all_heads_bundle(artifact_zip: Path, work: Path, wanted: set[str], found: dict[str, str]) -> dict[str, Any]:
    bundle = work / "P53_ALL_HEADS_GIT_BASE.bundle"
    bare = work / "P53_ALL_HEADS_GIT_BASE.git"
    with zipfile.ZipFile(artifact_zip) as archive:
        name = next(name for name in archive.namelist() if name.endswith("P53_ALL_HEADS_GIT_BASE.bundle"))
        bundle.write_bytes(archive.read(name))
    shutil.rmtree(bare, ignore_errors=True)
    clone = subprocess.run(["git", "clone", "--mirror", str(bundle), str(bare)], capture_output=True, text=True)
    if clone.returncode != 0:
        raise RuntimeError(f"bundle clone failed: {clone.stderr[-2000:]}")

    listed = subprocess.run([
        "git", "--git-dir", str(bare), "cat-file", "--batch-all-objects",
        "--batch-check=%(objectname) %(objecttype) %(objectsize)",
    ], capture_output=True, text=True, check=True)
    object_rows = []
    for line in listed.stdout.splitlines():
        fields = line.split()
        if len(fields) == 3 and fields[1] == "blob" and int(fields[2]) <= 5_000_000:
            object_rows.append((fields[0], int(fields[2])))

    input_path = work / "P57_GIT_CAT_FILE_INPUT.txt"
    output_path = work / "P57_GIT_CAT_FILE_OUTPUT.bin"
    input_path.write_text("".join(f"{oid}\n" for oid, _ in object_rows), encoding="ascii")
    with input_path.open("rb") as source, output_path.open("wb") as target:
        completed = subprocess.run(
            ["git", "--git-dir", str(bare), "cat-file", "--batch"],
            stdin=source, stdout=target, stderr=subprocess.PIPE,
        )
    if completed.returncode != 0:
        raise RuntimeError(f"file-backed git cat-file failed: {completed.stderr.decode('utf-8', 'replace')[-2000:]}")

    before = len(found)
    scanned = 0
    with output_path.open("rb") as stream:
        for expected_oid, _ in object_rows:
            header = stream.readline().decode("utf-8", "replace").strip().split()
            if len(header) < 3 or header[0] != expected_oid or header[1] != "blob":
                raise RuntimeError(f"unexpected git batch header at row {scanned}: {header}")
            size = int(header[2])
            data = stream.read(size)
            separator = stream.read(1)
            if len(data) != size or separator != b"\n":
                raise RuntimeError(f"truncated git batch output at {expected_oid}")
            scanned += 1
            add_digest(sha256(data), f"{artifact_zip.name}!git:{expected_oid}", wanted, found)
    return {
        "artifact": artifact_zip.name,
        "bundleBlobCount": len(object_rows),
        "blobsScanned": scanned,
        "transport": "FILE_BACKED_BATCH_NO_PIPE_DEADLOCK",
        "newUniqueTargetHashes": len(found) - before,
    }


def scan_checkout(checkout: Path, target_rows: list[dict[str, Any]], wanted: set[str], found: dict[str, str]) -> dict[str, Any]:
    before = len(found)
    existing = 0
    for row in target_rows:
        path = checkout / row["path"]
        if not path.is_file():
            continue
        existing += 1
        if path.stat().st_size != row["byteLength"]:
            continue
        add_digest(sha256(path.read_bytes()), f"checkout:{row['path']}", wanted, found)
    return {"existingTargetPaths": existing, "newUniqueTargetHashes": len(found) - before}


def write_receipt(path: Path, receipt: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    receipt["integritySha256"] = stable_sha(receipt)
    path.write_text(json.dumps(receipt, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkout-root", default=".")
    parser.add_argument("--corpus-root", required=True)
    parser.add_argument("--output-root", required=True)
    parser.add_argument("--work-root", required=True)
    parser.add_argument("--receipt", required=True)
    args = parser.parse_args()

    checkout = Path(args.checkout_root).resolve()
    corpus = Path(args.corpus_root).resolve()
    output = Path(args.output_root).resolve()
    work = Path(args.work_root).resolve()
    receipt_path = Path(args.receipt).resolve()
    shutil.rmtree(work, ignore_errors=True)
    shutil.rmtree(output, ignore_errors=True)
    work.mkdir(parents=True, exist_ok=True)
    output.mkdir(parents=True, exist_ok=True)

    receipt: dict[str, Any] = {
        "schemaVersion": "velmere.p57.bounded-corpus-gap-proof.v2",
        "status": "FAIL",
        "decision": "FAIL_BOUNDED_CORPUS_NOT_EXACT_P46_PROJECTION",
        "credit": "WITHHELD",
        "target": {
            "fileCount": TARGET_FILE_COUNT,
            "payloadBytes": TARGET_PAYLOAD_BYTES,
            "pathSetSha256": TARGET_PATH_SET_SHA256,
            "sourceContentAggregateSha256": TARGET_CONTENT_AGGREGATE_SHA256,
        },
        "implementationRepair": {
            "previousRisk": "PIPE_DEADLOCK_WRITING_ALL_GIT_OIDS_BEFORE_READING_STDOUT",
            "currentTransport": "FILE_BACKED_GIT_CAT_FILE_BATCH",
        },
        "truthBoundary": "This execution proves bounded corpus coverage only. It grants no exact projection, Windows build, Browser, PDF, customer-output, rights, value, sale, LIVE or WORLD_CLASS credit.",
    }

    try:
        target_rows = materialize_target_manifest(checkout, work)
        wanted = {row["sha256"] for row in target_rows}
        found: dict[str, str] = {}
        scans: list[dict[str, Any]] = []
        scans.append(scan_checkout(checkout, target_rows, wanted, found))
        scans.append(scan_p51_corpus(corpus / "9244498847.zip", wanted, found))
        scans.append(scan_all_heads_bundle(corpus / "9247359383.zip", work, wanted, found))
        scans.append(scan_tar_member(corpus / "9247242322.zip", "R36_FULL_SOURCE_BASE.tar.xz", wanted, found))
        scans.append(scan_tar_member(corpus / "9243844560.zip", "current-branch-tracked.tar.xz", wanted, found))
        scans.append(scan_tar_member(corpus / "9215504066.zip", "branch-source-tracked.tar.gz", wanted, found))

        missing = [row for row in target_rows if row["sha256"] not in found]
        resolved = [row for row in target_rows if row["sha256"] in found]
        receipt["scans"] = scans
        receipt["coverage"] = {
            "targetRows": len(target_rows),
            "targetUniqueContentHashes": len(wanted),
            "resolvedRows": len(resolved),
            "resolvedUniqueContentHashes": len(found),
            "resolvedPayloadBytes": sum(row["byteLength"] for row in resolved),
            "missingRows": len(missing),
            "missingPayloadBytes": sum(row["byteLength"] for row in missing),
            "complete": not missing,
        }
        receipt["missing"] = missing
        receipt["resolvedProvenance"] = found
        if not missing:
            receipt["status"] = "PASS"
            receipt["decision"] = "PASS_BOUNDED_CORPUS_CONTAINS_EXACT_P46_PROJECTION"
            receipt["credit"] = "EXACT_PROJECTION_RECONSTRUCTION_INPUT_ONLY"
        else:
            receipt["failure"] = {
                "type": "BoundedCorpusIncomplete",
                "message": f"bounded corpus resolves {len(resolved)}/{len(target_rows)} rows; {len(missing)} rows and {sum(row['byteLength'] for row in missing)} bytes remain absent",
                "nextHighestValueAction": "Admit the exact hash-bound 15-file P49 self-contained transport payload and execute its Windows workflow; do not continue brute-force corpus mining.",
            }
    except Exception as error:
        receipt["failure"] = {"type": type(error).__name__, "message": str(error)}
    finally:
        write_receipt(receipt_path, receipt)
        print(json.dumps(receipt, ensure_ascii=False, indent=2))

    return 0 if receipt["status"] == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
