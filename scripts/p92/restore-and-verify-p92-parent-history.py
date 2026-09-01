#!/usr/bin/env python3
from __future__ import annotations
import argparse
import hashlib
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CURRENT_PREFIXES = ("receipts/p92/", "artifacts/p92/", "artifacts/closure/p92r1/")

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def aggregate(rows: list[dict]) -> str:
    h = hashlib.sha256()
    for row in rows:
        h.update(row["path"].encode())
        h.update(b"\0")
        h.update(row["sha256"].encode())
        h.update(b"\n")
    return h.hexdigest()

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--parent-zip", required=True)
    parser.add_argument("--restore", action="store_true")
    args = parser.parse_args()
    parent = Path(args.parent_zip)
    parent_sha = sha(parent.read_bytes())
    expected: set[str] = set()
    rows: list[dict] = []
    restored: list[str] = []
    mismatches: list[dict] = []
    missing: list[str] = []
    with zipfile.ZipFile(parent) as archive:
        infos = [info for info in archive.infolist() if not info.is_dir() and info.filename.startswith(("receipts/", "artifacts/"))]
        for info in infos:
            expected.add(info.filename)
            data = archive.read(info)
            expected_sha = sha(data)
            target = ROOT / info.filename
            actual_sha = sha(target.read_bytes()) if target.exists() else None
            if actual_sha != expected_sha:
                if target.exists(): mismatches.append({"path": info.filename, "expected": expected_sha, "actual": actual_sha})
                else: missing.append(info.filename)
                if args.restore:
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(data)
                    restored.append(info.filename)
            rows.append({"path": info.filename, "bytes": len(data), "sha256": expected_sha})
    unexpected: list[str] = []
    for base in (ROOT / "receipts", ROOT / "artifacts"):
        if not base.exists(): continue
        for target in base.rglob("*"):
            if not target.is_file(): continue
            rel = target.relative_to(ROOT).as_posix()
            if rel in expected or rel.startswith(CURRENT_PREFIXES): continue
            unexpected.append(rel)
    post = []
    for row in rows:
        target = ROOT / row["path"]
        if not target.exists() or sha(target.read_bytes()) != row["sha256"]:
            post.append(row["path"])
    receipt = {
        "schemaVersion": "velmere.p92.parent-history-immutability.v1",
        "generatedAt": "2026-08-20T20:00:00.000Z",
        "status": "PASS_BYTE_IDENTICAL" if not post and not unexpected else "FAIL",
        "parent": {
            "zipName": parent.name,
            "zipSha256": parent_sha,
            "historyFiles": len(rows),
            "historyAggregateSha256": aggregate(rows),
        },
        "preRestore": {"mismatchedFiles": len(mismatches), "missingFiles": len(missing)},
        "restoration": {"enabled": args.restore, "restoredFiles": len(restored)},
        "postRestore": {"differences": len(post), "unexpectedHistoricalFiles": len(unexpected)},
        "details": {"restored": restored, "postDifferences": post, "unexpectedHistoricalFiles": unexpected},
        "truthBoundary": "Only parent receipts and artifacts are checked against canonical P91 SOURCE_ONLY. Explicit P92 receipts/artifacts are current additions; source changes are verified by a separate source-delta manifest.",
    }
    for target in [ROOT / "receipts/p92/P92_PARENT_HISTORY_IMMUTABILITY.json", ROOT / "artifacts/p92/P92_PARENT_HISTORY_IMMUTABILITY.json"]:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps({key: receipt[key] for key in ["status", "parent", "preRestore", "restoration", "postRestore"]}, indent=2))
    raise SystemExit(0 if receipt["status"] == "PASS_BYTE_IDENTICAL" else 1)

if __name__ == "__main__":
    main()
