#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import hashlib
import importlib.util
import json
import lzma
import re
import sys
from pathlib import Path
from typing import Any

EXPECTED = {
    "base64Bytes": 99_080,
    "base64Sha256": "b8a5b2770d17b894b5622c595a364c55fb2b14eb634b85c82a75b0fa1c3f7806",
    "xzSha256": "3ba14e9e1dc7a7a81661ba0d859c8ba38bf040c1303d3210badd7ef3d42b83f7",
    "tsvSha256": "8f3dbccdaa4f3b8d478b7b6b67e01a1c898efd59824a51758ec84c99c3f6a2ba",
    "fileCount": 1597,
    "payloadBytes": 20_952_834,
    "pathSetSha256": "b8d9b3c2753e3f7f0c0b3a6054cf8c254d2a91b9c9c5d8f37310add478ac3f73",
    "contentAggregateSha256": "83fd00183e9d8a6c5ec1c27dba81ab99679e204b50e8f45f414a45abd2bd21b7",
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fixed_materialize_manifest(checkout_root: Path, output: Path) -> tuple[bytes, bytes, list[dict[str, str]], dict[str, str]]:
    root = checkout_root / "p50-existing-branch" / "manifest-parts"
    required = [
        "part-00.b64",
        "part-01-02.b64",
        "part-03.b64",
        "part-03-suffix-from-9201.b64",
        "part-04.b64",
        "part-05-06.b64",
        "part-07-08.b64",
        "part-09.b64",
    ]
    missing = [name for name in required if not (root / name).is_file()]
    if missing:
        raise FileNotFoundError(f"Missing exact manifest fragments: {missing}")

    part03 = (root / "part-03.b64").read_bytes()[:9201] + (root / "part-03-suffix-from-9201.b64").read_bytes()
    part0506 = bytearray((root / "part-05-06.b64").read_bytes())
    if len(part0506) != 20_000:
        raise ValueError(f"Unexpected part-05-06 length: {len(part0506)}")
    part0506[17052] = 105

    encoded = b"".join(
        [
            (root / "part-00.b64").read_bytes(),
            (root / "part-01-02.b64").read_bytes(),
            part03,
            (root / "part-04.b64").read_bytes()[:10_000],
            bytes(part0506),
            (root / "part-07-08.b64").read_bytes(),
            (root / "part-09.b64").read_bytes(),
        ]
    )
    if len(encoded) != EXPECTED["base64Bytes"] or sha256(encoded) != EXPECTED["base64Sha256"]:
        raise ValueError(f"Exact manifest Base64 identity mismatch: bytes={len(encoded)} sha256={sha256(encoded)}")

    compressed = base64.b64decode(encoded, validate=True)
    if sha256(compressed) != EXPECTED["xzSha256"]:
        raise ValueError(f"Exact manifest XZ identity mismatch: {sha256(compressed)}")
    tsv = lzma.decompress(compressed)
    if sha256(tsv) != EXPECTED["tsvSha256"]:
        raise ValueError(f"Exact manifest TSV identity mismatch: {sha256(tsv)}")

    normalized: list[dict[str, str]] = []
    previous: str | None = None
    total = 0
    for line_number, raw in enumerate(tsv.decode("utf-8").splitlines(), 1):
        if not raw:
            continue
        fields = raw.split("\t")
        if len(fields) != 3:
            raise ValueError(f"Manifest TSV invalid field count at line {line_number}: {len(fields)}")
        relative, byte_length_raw, digest = fields
        relative = relative.replace("\\", "/")
        if not relative or relative.startswith("/") or ".." in Path(relative).parts:
            raise ValueError(f"Unsafe manifest path at line {line_number}: {relative!r}")
        if previous is not None and relative <= previous:
            raise ValueError(f"Manifest path order/duplicate failure at line {line_number}: {relative}")
        if not byte_length_raw.isdigit():
            raise ValueError(f"Manifest byte length invalid at line {line_number}: {byte_length_raw!r}")
        digest = digest.lower()
        if not re.fullmatch(r"[0-9a-f]{64}", digest):
            raise ValueError(f"Manifest SHA-256 invalid at line {line_number}: {digest!r}")
        total += int(byte_length_raw)
        normalized.append({"path": relative, "sha256": digest, "bytes": byte_length_raw})
        previous = relative

    if len(normalized) != EXPECTED["fileCount"]:
        raise ValueError(f"Manifest row count mismatch after headerless parse: {len(normalized)}")
    if total != EXPECTED["payloadBytes"]:
        raise ValueError(f"Manifest payload mismatch: {total}")

    path_set = sha256("\n".join(row["path"] for row in normalized).encode("utf-8"))
    aggregate = hashlib.sha256()
    for row in normalized:
        aggregate.update(f"{row['path']}\0{row['bytes']}\0{row['sha256']}\n".encode("utf-8"))
    content_aggregate = aggregate.hexdigest()
    if path_set != EXPECTED["pathSetSha256"]:
        raise ValueError(f"Manifest path-set mismatch: {path_set}")
    if content_aggregate != EXPECTED["contentAggregateSha256"]:
        raise ValueError(f"Manifest content aggregate mismatch: {content_aggregate}")

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(encoded)
    return encoded, tsv, normalized, {"path": "column0", "bytes": "column1", "sha256": "column2", "header": "absent"}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkout-root", default=".")
    parser.add_argument("--corpus-root", required=True)
    parser.add_argument("--output-root", required=True)
    parser.add_argument("--work-root", required=True)
    parser.add_argument("--receipt", required=True)
    args = parser.parse_args()

    module_path = Path(args.checkout_root).resolve() / "p54-runtime" / "reconstruct-p54-from-corpus.py"
    spec = importlib.util.spec_from_file_location("velmere_p54_reconstructor", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load P54 reconstructor: {module_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.materialize_manifest = fixed_materialize_manifest

    sys.argv = [
        str(module_path),
        "--checkout-root",
        args.checkout_root,
        "--corpus-root",
        args.corpus_root,
        "--output-root",
        args.output_root,
        "--work-root",
        args.work_root,
        "--receipt",
        args.receipt,
    ]
    return int(module.main())


if __name__ == "__main__":
    raise SystemExit(main())
