#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "artifacts/closure/p33/source-identity.json"

EXCLUDED_PREFIXES = (
    ".git/",
    ".next/",
    "node_modules/",
    ".velmere/",
    "artifacts/closure/p33/",
    "tmp/",
    "temp/",
)
EXCLUDED_NAMES = {".DS_Store", "Thumbs.db"}


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def included(rel: str) -> bool:
    if rel in EXCLUDED_NAMES or Path(rel).name in EXCLUDED_NAMES:
        return False
    return not any(rel == prefix.rstrip("/") or rel.startswith(prefix) for prefix in EXCLUDED_PREFIXES)


def main() -> int:
    rows: list[dict[str, object]] = []
    for path in sorted(ROOT.rglob("*"), key=lambda item: item.as_posix()):
        if not path.is_file() or path.is_symlink():
            continue
        rel = path.relative_to(ROOT).as_posix()
        if not included(rel):
            continue
        stat = path.stat()
        rows.append({
            "path": rel,
            "byteLength": stat.st_size,
            "mode": stat.st_mode & 0o777,
            "sha256": digest(path),
        })
    path_set = hashlib.sha256("\n".join(row["path"] for row in rows).encode()).hexdigest()
    aggregate = hashlib.sha256(
        b"".join(
            f'{row["path"]}\0{row["byteLength"]}\0{row["mode"]}\0{row["sha256"]}\n'.encode()
            for row in rows
        )
    ).hexdigest()
    result = {
        "schemaVersion": "velmere.p33.source-identity.v1",
        "classification": "CURRENT_SOURCE_INPUT_EXCLUDES_P33_GENERATED_RECEIPTS",
        "fileCount": len(rows),
        "payloadBytes": sum(int(row["byteLength"]) for row in rows),
        "pathSetSha256": path_set,
        "sourceAggregateSha256": aggregate,
        "exclusions": list(EXCLUDED_PREFIXES),
        "files": rows,
        "truthBoundary": "This identity binds current source inputs while excluding P33 generated receipts to avoid a circular receipt hash. It is not a clean build, deployed runtime, Browser, provider-rights, customer-value or release receipt.",
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", "utf-8")
    print(json.dumps({
        "status": "PASS_P33_SOURCE_IDENTITY_BUILT",
        "fileCount": result["fileCount"],
        "payloadBytes": result["payloadBytes"],
        "pathSetSha256": path_set,
        "sourceAggregateSha256": aggregate,
        "manifestSha256": digest(OUT),
        "output": str(OUT.relative_to(ROOT)),
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
