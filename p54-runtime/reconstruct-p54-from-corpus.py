#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import bz2
import csv
import gzip
import hashlib
import io
import json
import lzma
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import tarfile
from collections import deque
from typing import Any, Iterable
import zipfile

TARGET_FILE_COUNT = 1597
TARGET_PAYLOAD_BYTES = 20_952_834
TARGET_PATH_SET_SHA256 = "b8d9b3c2753e3f7f0c0b3a6054cf8c254d2a91b9c9c5d8f37310add478ac3f73"
TARGET_CONTENT_AGGREGATE_SHA256 = "83fd00183e9d8a6c5ec1c27dba81ab99679e204b50e8f45f414a45abd2bd21b7"
TARGET_MANIFEST_B64_BYTES = 99_080
TARGET_MANIFEST_B64_SHA256 = "b8a5b2770d17b894b5622c595a364c55fb2b14eb634b85c82a75b0fa1c3f7806"
TARGET_MANIFEST_XZ_SHA256 = "3ba14e9e1dc7a7a81661ba0d859c8ba38bf040c1303d3210badd7ef3d42b83f7"
TARGET_MANIFEST_TSV_SHA256 = "8f3dbccdaa4f3b8d478b7b6b67e01a1c898efd59824a51758ec84c99c3f6a2ba"
MAX_EXPANDED_BYTES = 512 * 1024 * 1024
MAX_DEPTH = 7


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")


def safe_relpath(value: str) -> str:
    value = value.replace("\\", "/").lstrip("/")
    path = PurePosixPath(value)
    if not value or path.is_absolute() or ".." in path.parts:
        raise ValueError(f"Unsafe target path: {value!r}")
    return path.as_posix()


def materialize_manifest(checkout_root: Path, output: Path) -> tuple[bytes, bytes, list[dict[str, str]], dict[str, str]]:
    root = checkout_root / "p50-existing-branch" / "manifest-parts"
    required = [
        "part-00.b64", "part-01-02.b64", "part-03.b64",
        "part-03-suffix-from-9201.b64", "part-04.b64",
        "part-05-06.b64", "part-07-08.b64", "part-09.b64",
    ]
    missing = [name for name in required if not (root / name).is_file()]
    if missing:
        raise FileNotFoundError(f"Missing exact manifest fragments: {missing}")

    part03 = (root / "part-03.b64").read_bytes()[:9201] + (root / "part-03-suffix-from-9201.b64").read_bytes()
    part0506 = bytearray((root / "part-05-06.b64").read_bytes())
    if len(part0506) != 20_000:
        raise ValueError(f"Unexpected part-05-06 length: {len(part0506)}")
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
        raise ValueError(f"Exact manifest Base64 identity mismatch: bytes={len(encoded)} sha256={sha256(encoded)}")
    compressed = base64.b64decode(encoded, validate=True)
    if sha256(compressed) != TARGET_MANIFEST_XZ_SHA256:
        raise ValueError(f"Exact manifest XZ identity mismatch: {sha256(compressed)}")
    tsv = lzma.decompress(compressed)
    if sha256(tsv) != TARGET_MANIFEST_TSV_SHA256:
        raise ValueError(f"Exact manifest TSV identity mismatch: {sha256(tsv)}")

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(encoded)

    reader = csv.DictReader(io.StringIO(tsv.decode("utf-8")), delimiter="\t")
    rows = list(reader)
    fields = reader.fieldnames or []
    if len(rows) != TARGET_FILE_COUNT:
        raise ValueError(f"Manifest row count mismatch: {len(rows)}")

    def choose(exact: Iterable[str], contains: Iterable[str]) -> str:
        lowered = {field.lower(): field for field in fields}
        for name in exact:
            if name in lowered:
                return lowered[name]
        for needle in contains:
            for field in fields:
                low = field.lower()
                if needle in low and "aggregate" not in low and "set" not in low:
                    return field
        raise ValueError(f"Cannot infer manifest field from {fields}")

    mapping = {
        "path": choose(("path", "relativepath", "relative_path", "sourcepath"), ("path",)),
        "sha256": choose(("sha256", "source_sha256", "contentsha256", "content_sha256"), ("sha256",)),
        "bytes": choose(("bytelength", "byte_length", "size", "bytes"), ("bytelength", "byte_length")),
    }
    normalized: list[dict[str, str]] = []
    total = 0
    for row in rows:
        rel = safe_relpath(row[mapping["path"]])
        digest = row[mapping["sha256"]].strip().lower()
        size_text = row[mapping["bytes"]].strip()
        if not re.fullmatch(r"[0-9a-f]{64}", digest):
            raise ValueError(f"Invalid SHA-256 for {rel}: {digest}")
        size = int(size_text)
        total += size
        normalized.append({"path": rel, "sha256": digest, "bytes": str(size)})
    if total != TARGET_PAYLOAD_BYTES:
        raise ValueError(f"Manifest payload mismatch: {total}")
    return encoded, tsv, normalized, mapping


class CorpusResolver:
    def __init__(self, expected: set[str], temp_root: Path) -> None:
        self.expected = expected
        self.temp_root = temp_root
        self.found: dict[str, tuple[bytes, str]] = {}
        self.seen: set[tuple[int, str]] = set()
        self.queue: deque[tuple[bytes, str, int]] = deque()
        self.processed = 0
        self.expanded_bytes = 0
        self.git_bundles = 0
        self.git_blobs = 0
        self.errors: list[dict[str, str]] = []

    def enqueue(self, data: bytes, source: str, depth: int) -> None:
        if not data or len(data) > MAX_EXPANDED_BYTES or depth > MAX_DEPTH:
            return
        digest = sha256(data)
        key = (len(data), digest)
        if key in self.seen:
            if digest in self.expected and digest not in self.found:
                self.found[digest] = (data, source)
            return
        self.seen.add(key)
        self.expanded_bytes += len(data)
        if digest in self.expected and digest not in self.found:
            self.found[digest] = (data, source)
        self.queue.append((data, source, depth))

    def _zstd_decompress(self, data: bytes, source: str) -> bytes | None:
        try:
            import zstandard  # type: ignore
            return zstandard.ZstdDecompressor().decompress(data, max_output_size=MAX_EXPANDED_BYTES)
        except Exception as first_error:
            temp_in = self.temp_root / f"zstd-{hashlib.sha256(data).hexdigest()}.zst"
            temp_in.write_bytes(data)
            commands = [
                ["zstd", "-d", "-q", "-c", str(temp_in)],
                ["7z", "x", "-so", str(temp_in)],
                [str(Path(os.environ.get("ProgramFiles", "C:/Program Files")) / "7-Zip" / "7z.exe"), "x", "-so", str(temp_in)],
            ]
            for command in commands:
                try:
                    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
                    if result.returncode == 0 and result.stdout:
                        return result.stdout
                except FileNotFoundError:
                    continue
            self.errors.append({"source": source, "kind": "zstd", "error": str(first_error)})
            return None

    def _scan_git_bundle(self, data: bytes, source: str) -> None:
        self.git_bundles += 1
        bundle = self.temp_root / f"bundle-{self.git_bundles:04d}.bundle"
        bare = self.temp_root / f"bundle-{self.git_bundles:04d}.git"
        bundle.write_bytes(data)
        result = subprocess.run(["git", "clone", "--mirror", str(bundle), str(bare)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if result.returncode != 0:
            self.errors.append({"source": source, "kind": "git-bundle", "error": result.stderr[-4000:]})
            return
        check = subprocess.run(
            ["git", "--git-dir", str(bare), "cat-file", "--batch-all-objects", "--batch-check=%(objectname) %(objecttype) %(objectsize)"],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        )
        if check.returncode != 0:
            self.errors.append({"source": source, "kind": "git-object-list", "error": check.stderr[-4000:]})
            return
        oids = [line.split()[0] for line in check.stdout.splitlines() if len(line.split()) == 3 and line.split()[1] == "blob"]
        if not oids:
            return
        process = subprocess.Popen(
            ["git", "--git-dir", str(bare), "cat-file", "--batch"],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        )
        assert process.stdin is not None and process.stdout is not None
        process.stdin.write("".join(f"{oid}\n" for oid in oids).encode("ascii"))
        process.stdin.close()
        for oid in oids:
            header = process.stdout.readline().decode("utf-8", "replace").strip().split()
            if len(header) < 3 or header[1] != "blob":
                continue
            size = int(header[2])
            blob = process.stdout.read(size)
            process.stdout.read(1)
            self.git_blobs += 1
            digest = sha256(blob)
            if digest in self.expected and digest not in self.found:
                self.found[digest] = (blob, f"{source}!git:{oid}")
        process.wait()

    def seed_directory(self, root: Path) -> None:
        files = sorted(path for path in root.rglob("*") if path.is_file())
        for path in files:
            try:
                self.enqueue(path.read_bytes(), str(path.relative_to(root)).replace(os.sep, "/"), 0)
            except OSError as error:
                self.errors.append({"source": str(path), "kind": "read", "error": str(error)})

        groups: dict[tuple[str, str], list[tuple[int, Path]]] = {}
        pattern = re.compile(r"^(.*?)(?:part[-_.]?|\.part[-_.]?)(\d+)(.*)$", re.IGNORECASE)
        for path in files:
            match = pattern.match(path.name)
            if match:
                groups.setdefault((str(path.parent), match.group(1) + match.group(3)), []).append((int(match.group(2)), path))
        for (_, key), group in groups.items():
            if len(group) < 2:
                continue
            group.sort(key=lambda item: item[0])
            combined = b"".join(path.read_bytes() for _, path in group)
            self.enqueue(combined, f"chunk-group:{key}", 0)
            try:
                text = b"".join(path.read_bytes().strip() for _, path in group)
                self.enqueue(base64.b64decode(text, validate=True), f"chunk-group:{key}!base64", 1)
            except Exception:
                pass

    def run(self) -> None:
        while self.queue and len(self.found) < len(self.expected):
            data, source, depth = self.queue.popleft()
            self.processed += 1
            if depth >= MAX_DEPTH:
                continue

            if data.startswith((b"# v2 git bundle", b"# v3 git bundle")):
                self._scan_git_bundle(data, source)
                continue

            try:
                with zipfile.ZipFile(io.BytesIO(data)) as archive:
                    if archive.namelist():
                        for name in archive.namelist():
                            if name.endswith("/"):
                                continue
                            self.enqueue(archive.read(name), f"{source}!zip:{name}", depth + 1)
                        continue
            except (zipfile.BadZipFile, OSError, RuntimeError):
                pass

            try:
                with tarfile.open(fileobj=io.BytesIO(data), mode="r:*") as archive:
                    members = [member for member in archive.getmembers() if member.isfile()]
                    if members:
                        for member in members:
                            handle = archive.extractfile(member)
                            if handle is not None:
                                self.enqueue(handle.read(), f"{source}!tar:{member.name}", depth + 1)
                        continue
            except (tarfile.TarError, OSError, EOFError):
                pass

            try:
                if data.startswith(b"\x1f\x8b"):
                    self.enqueue(gzip.decompress(data), f"{source}!gzip", depth + 1)
                elif data.startswith(b"BZh"):
                    self.enqueue(bz2.decompress(data), f"{source}!bz2", depth + 1)
                elif data.startswith(b"\xfd7zXZ\x00"):
                    self.enqueue(lzma.decompress(data), f"{source}!xz", depth + 1)
                elif data.startswith(b"\x28\xb5\x2f\xfd"):
                    decoded = self._zstd_decompress(data, source)
                    if decoded:
                        self.enqueue(decoded, f"{source}!zstd", depth + 1)
            except (OSError, EOFError, lzma.LZMAError) as error:
                self.errors.append({"source": source, "kind": "decompress", "error": str(error)})

            if len(data) <= 128 * 1024 * 1024:
                try:
                    text = data.decode("ascii").strip()
                    compact = "".join(text.split())
                    if len(compact) >= 16 and len(compact) % 4 == 0 and re.fullmatch(r"[A-Za-z0-9+/=]+", compact):
                        self.enqueue(base64.b64decode(compact, validate=True), f"{source}!base64", depth + 1)
                except (UnicodeDecodeError, ValueError):
                    pass

            if data[:1] in (b"{", b"["):
                try:
                    self._scan_json(json.loads(data.decode("utf-8-sig")), source, depth)
                except (UnicodeDecodeError, json.JSONDecodeError):
                    pass
            elif b"\n" in data and len(data) <= 64 * 1024 * 1024:
                for index, line in enumerate(data.splitlines()):
                    line = line.strip()
                    if line[:1] not in (b"{", b"["):
                        continue
                    try:
                        self._scan_json(json.loads(line.decode("utf-8-sig")), f"{source}!jsonl:{index}", depth)
                    except Exception:
                        continue

    def _scan_json(self, value: Any, source: str, depth: int) -> None:
        stack: list[tuple[str, Any]] = [("$", value)]
        inspected = 0
        while stack and inspected < 100_000:
            key, current = stack.pop()
            inspected += 1
            if isinstance(current, dict):
                stack.extend((f"{key}.{name}", item) for name, item in current.items())
            elif isinstance(current, list):
                stack.extend((f"{key}[{index}]", item) for index, item in enumerate(current))
            elif isinstance(current, str):
                raw = current.encode("utf-8")
                digest = sha256(raw)
                if digest in self.expected and digest not in self.found:
                    self.found[digest] = (raw, f"{source}!json:{key}")
                compact = "".join(current.split())
                if len(compact) >= 16 and len(compact) % 4 == 0 and re.fullmatch(r"[A-Za-z0-9+/=]+", compact):
                    try:
                        self.enqueue(base64.b64decode(compact, validate=True), f"{source}!json-base64:{key}", depth + 1)
                    except ValueError:
                        pass


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

    result: dict[str, Any] = {
        "schemaVersion": "velmere.p54.exact-p46-corpus-reconstruction.v1",
        "status": "FAIL",
        "target": {
            "fileCount": TARGET_FILE_COUNT,
            "payloadBytes": TARGET_PAYLOAD_BYTES,
            "pathSetSha256": TARGET_PATH_SET_SHA256,
            "sourceContentAggregateSha256": TARGET_CONTENT_AGGREGATE_SHA256,
        },
        "truthBoundary": "Credit is limited to exact P46 1597-file build-relevant projection reconstruction. Browser, PDF, customer outputs, rights, material value, sale eligibility and LIVE remain excluded.",
    }
    try:
        manifest_b64 = work / "P54_EXACT_PROJECTION_MANIFEST.tsv.xz.b64"
        _, _, rows, fields = materialize_manifest(checkout, manifest_b64)
        expected = {row["sha256"] for row in rows}
        resolver = CorpusResolver(expected, work / "corpus-temp")
        resolver.temp_root.mkdir(parents=True, exist_ok=True)
        resolver.seed_directory(corpus)
        resolver.run()

        staging = work / "staging"
        missing: list[dict[str, Any]] = []
        provenance: list[dict[str, Any]] = []
        for row in rows:
            digest = row["sha256"]
            match = resolver.found.get(digest)
            if match is None:
                missing.append(row)
                continue
            data, source = match
            if len(data) != int(row["bytes"]) or sha256(data) != digest:
                raise ValueError(f"Resolved candidate mismatch for {row['path']}")
            destination = staging / row["path"]
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(data)
            provenance.append({"path": row["path"], "sha256": digest, "source": source})

        result["manifest"] = {
            "base64ByteLength": manifest_b64.stat().st_size,
            "base64Sha256": sha256(manifest_b64.read_bytes()),
            "rowCount": len(rows),
            "fields": fields,
        }
        result["corpusScan"] = {
            "expectedUniqueContentHashes": len(expected),
            "resolvedUniqueContentHashes": len(resolver.found),
            "processedCandidates": resolver.processed,
            "expandedBytesObserved": resolver.expanded_bytes,
            "gitBundlesScanned": resolver.git_bundles,
            "gitBlobsScanned": resolver.git_blobs,
            "errorCount": len(resolver.errors),
            "errors": resolver.errors[:100],
        }
        result["staging"] = {
            "writtenRows": len(provenance),
            "missingRows": len(missing),
            "missing": missing[:200],
            "provenanceSample": provenance[:100],
        }
        if missing:
            raise RuntimeError(f"Corpus is incomplete for exact target: {len(missing)} rows missing")

        verifier = checkout / "p50-existing-branch" / "reconstruct-p50-existing-branch-projection.py"
        meta = checkout / "p50-existing-branch" / "P50_EXISTING_BRANCH_PROJECTION_META.json"
        if not verifier.is_file() or not meta.is_file():
            raise FileNotFoundError("Existing exact projection verifier or metadata is missing")
        verifier_receipt = work / "P54_EXISTING_VERIFIER_RECEIPT.json"
        completed = subprocess.run([
            sys.executable, str(verifier),
            "--checkout-root", str(staging),
            "--manifest-b64", str(manifest_b64),
            "--meta", str(meta),
            "--output-root", str(output),
            "--receipt", str(verifier_receipt),
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        result["existingVerifier"] = {
            "exitCode": completed.returncode,
            "stdout": completed.stdout[-20_000:],
            "stderr": completed.stderr[-20_000:],
        }
        if verifier_receipt.is_file():
            result["existingVerifier"]["receipt"] = json.loads(verifier_receipt.read_text(encoding="utf-8-sig"))
        if completed.returncode != 0:
            raise RuntimeError(f"Existing exact projection verifier failed with {completed.returncode}")

        final_receipt = result["existingVerifier"].get("receipt", {})
        expected_identity = final_receipt.get("expectedProjection", {})
        branch_scan = final_receipt.get("branchScan", {})
        if final_receipt.get("status") != "PASS" or branch_scan.get("verifiedFiles") != TARGET_FILE_COUNT:
            raise RuntimeError("Existing verifier did not issue PASS for 1597/1597 files")
        if expected_identity.get("fileCount") != TARGET_FILE_COUNT or expected_identity.get("payloadBytes") != TARGET_PAYLOAD_BYTES:
            raise RuntimeError("Existing verifier target identity changed")
        if expected_identity.get("pathSetSha256") != TARGET_PATH_SET_SHA256:
            raise RuntimeError("Existing verifier path-set identity changed")
        if expected_identity.get("sourceContentAggregateSha256") != TARGET_CONTENT_AGGREGATE_SHA256:
            raise RuntimeError("Existing verifier content aggregate changed")

        result["status"] = "PASS"
        result["decision"] = "EXACT_P46_BUILD_RELEVANT_PROJECTION_RECONSTRUCTED"
        result["credit"] = "PROJECTION_RECONSTRUCTION_ONLY"
    except Exception as error:
        result["decision"] = "FAIL_EXACT_P46_PROJECTION_NOT_RECONSTRUCTED"
        result["credit"] = "WITHHELD"
        result["failure"] = {"type": type(error).__name__, "message": str(error)}
    finally:
        core = json.dumps(result, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
        result["integritySha256"] = sha256(core)
        write_json(receipt_path, result)

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["status"] == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
