from __future__ import annotations

import argparse
import base64
import hashlib
import json
import lzma
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tarfile
import zipfile
from collections import defaultdict

EXPECTED_COUNT = 1597
EXPECTED_BYTES = 20952834
EXPECTED_PATH_SET = "b8d9b3c2753e3f7f0c0b3a6054cf8c254d2a91b9c9c5d8f37310add478ac3f73"
EXPECTED_CONTENT_AGGREGATE = "83fd00183e9d8a6c5ec1c27dba81ab99679e204b50e8f45f414a45abd2bd21b7"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def write_json(path: pathlib.Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def safe_target(root: pathlib.Path, name: str) -> pathlib.Path:
    normalized = name.replace("\\", "/")
    pure = pathlib.PurePosixPath(normalized)
    if normalized.startswith("/") or ".." in pure.parts:
        raise ValueError(f"unsafe path: {name}")
    return root / pure


def unpack_zip(src: pathlib.Path, dest: pathlib.Path) -> bool:
    try:
        with zipfile.ZipFile(src) as archive:
            for info in archive.infolist():
                if info.is_dir():
                    continue
                target = safe_target(dest, info.filename)
                target.parent.mkdir(parents=True, exist_ok=True)
                with archive.open(info) as reader, target.open("wb") as writer:
                    shutil.copyfileobj(reader, writer)
        return True
    except Exception:
        return False


def unpack_tar(src: pathlib.Path, dest: pathlib.Path) -> bool:
    try:
        with tarfile.open(src, "r:*") as archive:
            for member in archive.getmembers():
                if not member.isfile():
                    continue
                target = safe_target(dest, member.name)
                target.parent.mkdir(parents=True, exist_ok=True)
                reader = archive.extractfile(member)
                if reader is None:
                    continue
                with reader, target.open("wb") as writer:
                    shutil.copyfileobj(reader, writer)
        return True
    except Exception:
        return False


def recursively_unpack(pool: pathlib.Path, max_rounds: int = 6) -> dict[str, int]:
    seen: set[tuple[str, int]] = set()
    counters = {"zip": 0, "tar": 0, "xz": 0, "zstd": 0}
    for _ in range(max_rounds):
        changed = False
        for src in sorted(p for p in pool.rglob("*") if p.is_file()):
            key = (str(src), src.stat().st_size)
            if key in seen:
                continue
            seen.add(key)
            lower = src.name.lower()
            dest = src.parent / (src.name + ".unpacked")
            ok = False
            if zipfile.is_zipfile(src):
                dest.mkdir(parents=True, exist_ok=True)
                ok = unpack_zip(src, dest)
                if ok:
                    counters["zip"] += 1
            elif tarfile.is_tarfile(src):
                dest.mkdir(parents=True, exist_ok=True)
                ok = unpack_tar(src, dest)
                if ok:
                    counters["tar"] += 1
            elif lower.endswith(".xz") and not lower.endswith(".tar.xz"):
                try:
                    dest.write_bytes(lzma.decompress(src.read_bytes()))
                    counters["xz"] += 1
                    ok = True
                except Exception:
                    ok = False
            elif lower.endswith(".zst") or src.read_bytes()[:4] == b"\x28\xb5\x2f\xfd":
                try:
                    import zstandard as zstd

                    with src.open("rb") as reader, dest.open("wb") as writer:
                        zstd.ZstdDecompressor().copy_stream(reader, writer)
                    counters["zstd"] += 1
                    ok = True
                except Exception:
                    ok = False
            if ok:
                changed = True
        if not changed:
            break
    return counters


def materialize_manifest(repo: pathlib.Path, out: pathlib.Path) -> list[dict[str, object]]:
    root = repo / "p50-existing-branch" / "manifest-parts"
    p3 = (root / "part-03.b64").read_bytes()[:9201] + (root / "part-03-suffix-from-9201.b64").read_bytes()
    p56 = bytearray((root / "part-05-06.b64").read_bytes())
    if len(p56) != 20000:
        raise RuntimeError(f"unexpected part-05-06 length: {len(p56)}")
    p56[17052] = 105
    base64_bytes = b"".join(
        [
            (root / "part-00.b64").read_bytes(),
            (root / "part-01-02.b64").read_bytes(),
            p3,
            (root / "part-04.b64").read_bytes()[:10000],
            bytes(p56),
            (root / "part-07-08.b64").read_bytes(),
            (root / "part-09.b64").read_bytes(),
        ]
    )
    if len(base64_bytes) != 99080:
        raise RuntimeError(f"manifest base64 length mismatch: {len(base64_bytes)}")
    if sha256(base64_bytes) != "b8a5b2770d17b894b5622c595a364c55fb2b14eb634b85c82a75b0fa1c3f7806":
        raise RuntimeError("manifest base64 SHA mismatch")
    tsv = lzma.decompress(base64.b64decode(base64_bytes, validate=True))
    out.write_bytes(tsv)
    rows: list[dict[str, object]] = []
    for line in tsv.decode("utf-8").splitlines():
        if not line.strip():
            continue
        fields = line.split("\t")
        digest = next((f.lower() for f in fields if re.fullmatch(r"[0-9a-fA-F]{64}", f)), None)
        number = next((int(f) for f in fields if f.isdigit()), None)
        path_value = next((f for f in fields if "/" in f or f.startswith(".")), fields[0] if fields else None)
        if digest and number is not None and path_value:
            rows.append({"path": path_value.replace("\\", "/"), "byteLength": number, "sha256": digest})
    if len(rows) != EXPECTED_COUNT:
        raise RuntimeError(f"manifest row mismatch: {len(rows)}")
    if sum(int(row["byteLength"]) for row in rows) != EXPECTED_BYTES:
        raise RuntimeError("manifest payload-byte mismatch")
    return rows


def git_blob_sources(repo: pathlib.Path, wanted: set[str], cache: pathlib.Path) -> tuple[dict[str, pathlib.Path], int]:
    found: dict[str, pathlib.Path] = {}
    count = 0
    try:
        listing = subprocess.check_output(["git", "-C", str(repo), "rev-list", "--objects", "--all"], text=True, errors="replace")
    except Exception:
        return found, count
    for line in listing.splitlines():
        oid = line.split(" ", 1)[0].strip()
        if not oid:
            continue
        try:
            kind = subprocess.check_output(["git", "-C", str(repo), "cat-file", "-t", oid], text=True, stderr=subprocess.DEVNULL).strip()
            if kind != "blob":
                continue
            size = int(subprocess.check_output(["git", "-C", str(repo), "cat-file", "-s", oid], text=True, stderr=subprocess.DEVNULL).strip())
            if size > 250_000_000:
                continue
            data = subprocess.check_output(["git", "-C", str(repo), "cat-file", "blob", oid], stderr=subprocess.DEVNULL)
        except Exception:
            continue
        count += 1
        digest = sha256(data)
        if digest in wanted and digest not in found:
            target = cache / digest
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            found[digest] = target
    return found, count


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=".")
    parser.add_argument("--artifacts", required=True)
    parser.add_argument("--work", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    repo = pathlib.Path(args.repo).resolve()
    artifacts = pathlib.Path(args.artifacts).resolve()
    work = pathlib.Path(args.work).resolve()
    output = pathlib.Path(args.output).resolve()
    pool = work / "pool"
    target = work / "source"
    pool.mkdir(parents=True, exist_ok=True)
    target.mkdir(parents=True, exist_ok=True)
    output.mkdir(parents=True, exist_ok=True)

    artifact_rows = []
    for archive in sorted(artifacts.glob("*.zip")):
        dest = pool / archive.stem
        dest.mkdir(parents=True, exist_ok=True)
        ok = unpack_zip(archive, dest)
        artifact_rows.append({"name": archive.name, "byteLength": archive.stat().st_size, "sha256": sha256(archive.read_bytes()), "unpacked": ok})
    unpack_counts = recursively_unpack(pool)

    rows = materialize_manifest(repo, output / "P55_TARGET_MANIFEST.tsv")
    wanted = {str(row["sha256"]) for row in rows}
    by_hash: dict[str, pathlib.Path] = {}
    path_candidates: dict[str, list[pathlib.Path]] = defaultdict(list)
    scanned_files = 0
    scanned_bytes = 0

    targets_by_basename: dict[str, list[str]] = defaultdict(list)
    for row in rows:
        targets_by_basename[pathlib.PurePosixPath(str(row["path"])).name].append(str(row["path"]))

    for candidate in sorted(p for p in pool.rglob("*") if p.is_file()):
        try:
            size = candidate.stat().st_size
            if size > 250_000_000:
                continue
            data = candidate.read_bytes()
        except Exception:
            continue
        scanned_files += 1
        scanned_bytes += size
        digest = sha256(data)
        if digest in wanted and digest not in by_hash:
            by_hash[digest] = candidate
        for logical in targets_by_basename.get(candidate.name, []):
            normalized = candidate.as_posix()
            if normalized.endswith("/" + logical) or normalized.endswith(logical):
                path_candidates[logical].append(candidate)

    git_repos = [repo]
    for bundle in sorted(pool.rglob("*.bundle")):
        mirror = work / "git-mirrors" / (bundle.stem + "-" + sha256(bundle.read_bytes())[:12] + ".git")
        mirror.parent.mkdir(parents=True, exist_ok=True)
        if mirror.exists():
            shutil.rmtree(mirror)
        result = subprocess.run(["git", "clone", "--mirror", str(bundle), str(mirror)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if result.returncode == 0:
            git_repos.append(mirror)

    git_blob_count = 0
    for git_repo in git_repos:
        found, count = git_blob_sources(git_repo, wanted, output / "git-blobs")
        git_blob_count += count
        for digest, path_value in found.items():
            by_hash.setdefault(digest, path_value)

    resolved = []
    missing = []
    for row in rows:
        logical = str(row["path"])
        expected_length = int(row["byteLength"])
        expected_digest = str(row["sha256"])
        source = None
        for candidate in path_candidates.get(logical, []):
            try:
                data = candidate.read_bytes()
            except Exception:
                continue
            if len(data) == expected_length and sha256(data) == expected_digest:
                source = candidate
                break
        if source is None:
            source = by_hash.get(expected_digest)
        if source is None:
            missing.append(row)
            continue
        data = source.read_bytes()
        if len(data) != expected_length or sha256(data) != expected_digest:
            missing.append(row)
            continue
        dest = safe_target(target, logical)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        resolved.append({**row, "source": str(source)})

    receipt = {
        "schemaVersion": "velmere.p55.expanded-artifact-atlas-reconstruction.v1",
        "status": "PASS" if not missing else "FAIL",
        "expected": {
            "fileCount": EXPECTED_COUNT,
            "payloadBytes": EXPECTED_BYTES,
            "pathSetSha256": EXPECTED_PATH_SET,
            "contentAggregateSha256": EXPECTED_CONTENT_AGGREGATE,
        },
        "actual": {
            "resolvedFileCount": len(resolved),
            "resolvedPayloadBytes": sum(int(row["byteLength"]) for row in resolved),
            "missingFileCount": len(missing),
            "missingPayloadBytes": sum(int(row["byteLength"]) for row in missing),
            "scannedRegularFileCount": scanned_files,
            "scannedRegularBytes": scanned_bytes,
            "scannedGitBlobCount": git_blob_count,
            "gitRepositoryCount": len(git_repos),
            "downloadedArtifactCount": len(artifact_rows),
        },
        "archiveInputs": artifact_rows,
        "nestedArchiveCounts": unpack_counts,
        "missing": missing,
        "resolved": resolved,
        "truthBoundary": "PASS can credit only exact reconstruction of the 1597-file P46 build-relevant projection. Full P46 source, Browser, PDF, customer outputs, provider rights, material value and sale remain excluded.",
    }
    core = json.dumps(receipt, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    receipt["integritySha256"] = sha256(core)
    write_json(output / "P55_ARTIFACT_ATLAS_RECONSTRUCTION_RECEIPT.json", receipt)
    (output / "P55_MISSING_SHA256.tsv").write_text(
        "".join(f'{row["sha256"]}\t{row["byteLength"]}\t{row["path"]}\n' for row in missing),
        encoding="utf-8",
    )

    if missing:
        return 2

    archive = output / "P55_EXACT_P46_BUILD_RELEVANT_PROJECTION.tar.xz"
    with tarfile.open(archive, "w:xz", preset=9) as tar:
        for row in sorted(rows, key=lambda item: str(item["path"])):
            tar.add(target / str(row["path"]), arcname=str(row["path"]), recursive=False)
    archive_meta = {"byteLength": archive.stat().st_size, "sha256": sha256(archive.read_bytes())}
    write_json(output / "P55_EXACT_PROJECTION_ARCHIVE_RECEIPT.json", archive_meta)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
