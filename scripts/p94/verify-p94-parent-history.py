#!/usr/bin/env python3
from __future__ import annotations
import hashlib
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PARENT = Path("/mnt/data/VELMERE_R44P46_V17_P93R1_RISK_HISTORY_CANONICAL_IDENTITY_NON_ENUMERATING_SHARED_READER_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-20.zip")
PARENT_SHA = "7e4c70f14ff8648d37e87f5fd8781fa6c64b325607d91bb74d69b45d6b420eaf"
PARENT_BYTES = 217_111_320
PARENT_ENTRIES = 9_100
DECLARED = {
    "VELMERE_ACTIVE_PASS.txt",
    "components/market-integrity/RiskHistoryControl.tsx",
    "lib/db/schema.sql",
    "lib/market-integrity/risk-history-contract.ts",
    "lib/market-integrity/risk-history-customer-client.ts",
    "lib/market-integrity/risk-ledger.ts",
    "lib/server/market-integrity-route-modules/history.ts",
}
OUTS = [ROOT / "receipts/p94/P94_PARENT_HISTORY_IMMUTABILITY.json", ROOT / "artifacts/p94/P94_PARENT_HISTORY_IMMUTABILITY.json"]


def sha_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(4 * 1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def sha_stream(handle) -> str:
    h = hashlib.sha256()
    for chunk in iter(lambda: handle.read(4 * 1024 * 1024), b""):
        h.update(chunk)
    return h.hexdigest()

if not PARENT.is_file() or PARENT.stat().st_size != PARENT_BYTES or sha_file(PARENT) != PARENT_SHA:
    raise RuntimeError("parent_identity_mismatch")
verified = 0
missing = []
differences = []
with zipfile.ZipFile(PARENT) as archive:
    infos = [info for info in archive.infolist() if not info.is_dir()]
    if len(infos) != PARENT_ENTRIES or archive.testzip() is not None:
        raise RuntimeError("parent_zip_invalid")
    for info in infos:
        relative = info.filename
        if relative == "PACKAGE_CONTENT_MANIFEST.tsv" or relative in DECLARED:
            continue
        current = ROOT / relative
        if not current.is_file():
            missing.append(relative)
            continue
        if current.stat().st_size != info.file_size:
            differences.append({"path": relative, "reason": "size", "parent": info.file_size, "current": current.stat().st_size})
            continue
        with archive.open(info) as source:
            parent_sha = sha_stream(source)
        current_sha = sha_file(current)
        if parent_sha != current_sha:
            differences.append({"path": relative, "reason": "sha256", "parent": parent_sha, "current": current_sha})
            continue
        verified += 1
if missing or differences:
    raise RuntimeError(json.dumps({"missing": missing[:20], "differences": differences[:20]}, indent=2))
payload = {
    "schemaVersion": "velmere.p94.parent-history-immutability.v1",
    "generatedAt": "2026-08-21T00:10:00.000Z",
    "status": "PASS_BYTE_IDENTICAL_PARENT_HISTORY_EXCEPT_DECLARED_P94_DELTA",
    "parent": {"path": str(PARENT), "bytes": PARENT_BYTES, "entries": PARENT_ENTRIES, "sha256": PARENT_SHA},
    "parentFilesVerifiedByteIdentical": verified,
    "declaredModifiedParentFiles": sorted(DECLARED),
    "packageManifestExcludedSymmetrically": True,
    "missingParentFiles": 0,
    "unexpectedDifferences": 0,
    "truthBoundary": "Every P93 parent file except the seven declared P94 changes and the self-rebuilt PACKAGE_CONTENT_MANIFEST.tsv remains byte-identical. Added P94 evidence and closure files are not parent history.",
}
for path in OUTS:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"status": payload["status"], "verified": verified, "declared": len(DECLARED)}, indent=2))
