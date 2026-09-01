#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
from typing import Any


def sha_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def canonical_bytes(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def resolve_child(parent: Path, relative_name: str) -> Path:
    if not relative_name or Path(relative_name).is_absolute():
        raise RuntimeError("chunk_path_invalid")
    candidate = (parent / relative_name).resolve()
    try:
        candidate.relative_to(parent.resolve())
    except ValueError as error:
        raise RuntimeError("chunk_path_escape") from error
    return candidate


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    manifest_path = Path(args.manifest).resolve()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    integrity_copy = dict(manifest)
    expected_integrity = integrity_copy.pop("integritySha256", None)
    actual_integrity = hashlib.sha256(canonical_bytes(integrity_copy)).hexdigest()
    if expected_integrity != actual_integrity:
        raise RuntimeError(f"manifest_integrity_mismatch:{expected_integrity}:{actual_integrity}")

    chunks = manifest.get("chunks")
    if not isinstance(chunks, list) or len(chunks) != manifest.get("chunkCount"):
        raise RuntimeError("chunk_denominator_mismatch")
    ordered = sorted(chunks, key=lambda row: row.get("index", -1))
    if [row.get("index") for row in ordered] != list(range(len(ordered))):
        raise RuntimeError("chunk_index_sequence_invalid")

    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_name(f".{output.name}.tmp-{os.getpid()}")
    if temporary.exists():
        temporary.unlink()

    total = 0
    seen_names: set[str] = set()
    try:
        with temporary.open("xb") as target:
            for row in ordered:
                relative_name = row.get("path") or row.get("name")
                if not isinstance(relative_name, str) or relative_name in seen_names:
                    raise RuntimeError("chunk_name_invalid_or_duplicate")
                seen_names.add(relative_name)
                part = resolve_child(manifest_path.parent, relative_name)
                if not part.is_file():
                    raise RuntimeError(f"chunk_missing:{relative_name}")
                if part.stat().st_size != row.get("byteLength") or sha_file(part) != row.get("sha256"):
                    raise RuntimeError(f"chunk_mismatch:{relative_name}")
                data = part.read_bytes()
                target.write(data)
                total += len(data)
            target.flush()
            os.fsync(target.fileno())

        bundle = manifest.get("bundle", {})
        if total != bundle.get("byteLength") or sha_file(temporary) != bundle.get("sha256"):
            raise RuntimeError("assembled_bundle_mismatch")
        temporary.replace(output)
    finally:
        if temporary.exists():
            temporary.unlink()

    print(json.dumps({
        "status": "PASS",
        "outputFileName": output.name,
        "byteLength": total,
        "sha256": sha_file(output),
        "chunks": len(ordered),
        "manifestIntegritySha256": expected_integrity,
    }, sort_keys=True))


if __name__ == "__main__":
    main()
