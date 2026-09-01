#!/usr/bin/env python3
from __future__ import annotations

import argparse
import fnmatch
import hashlib
import json
from pathlib import Path
import stat
import zipfile

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "artifacts/closure/p34"
MANIFEST = ART / "P34_SOURCE_MANIFEST.json"
EXCLUSIONS = ART / "P34_PACKAGE_EXCLUSIONS.json"
FIXED_TIME = (1980, 1, 1, 0, 0, 0)

EXCLUDE_PATTERNS = [
    ".git/**", ".next/**", "node_modules/**", ".velmere/**", "tmp/**", "temp/**",
    "**/__pycache__/**", "**/*.pyc", "**/.DS_Store", "**/Thumbs.db",
    "artifacts/pass36/a83/browser-lens-pdf-corpus/**",
    "artifacts/pass36/a83/renders/**",
    "artifacts/closure/p33/paid-tests/**",
    "artifacts/closure/p33/paid-tests-rerun/**",
    "artifacts/closure/p33/paid-tests-current/**",
    "artifacts/closure/p33/local-stripe/*.log",
    "artifacts/closure/p33/local-stripe/*.stdout.json",
    "artifacts/closure/p33/local-stripe/*.stderr.json",
    "artifacts/closure/p33/local-stripe/evidence/*.sqlite3",
    "artifacts/closure/p33/local-stripe/evidence/*.snapshot.sqlite3",
    "artifacts/closure/p33/source-identity-build.stdout.json",
    "artifacts/closure/p33/paid-readiness-build.stdout.json",
    "artifacts/closure/p33/paid-readiness-verify.stdout.json",
    "artifacts/closure/p33/paid-test-campaign-current.stdout.json",
    "artifacts/closure/p33/local-stripe-suite.stdout.json",
    "artifacts/closure/p33/P33_SOURCE_MANIFEST.json",
    "artifacts/closure/p34/internal-ai-dual-ledger-build.stdout.json",
    "artifacts/closure/p34/internal-ai-dual-ledger-verify.stdout.json",
    "artifacts/closure/p34/a102-internal-ai-dual-ledger.stdout.json",
    "artifacts/closure/p34/source-identity-build.stdout.json",
    "artifacts/closure/p34/report-build.stdout.json",
    "artifacts/closure/p34/package.stdout.json",
    "artifacts/closure/p34/P34_SOURCE_MANIFEST.json",
]


def digest_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def digest_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def excluded(rel: str) -> bool:
    rel = rel.replace("\\", "/")
    return any(fnmatch.fnmatch(rel, pattern) for pattern in EXCLUDE_PATTERNS)


def inventory() -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for path in sorted(ROOT.rglob("*"), key=lambda item: item.as_posix().encode("utf-8")):
        if not path.is_file() or path.is_symlink():
            continue
        rel = path.relative_to(ROOT).as_posix()
        if excluded(rel):
            continue
        mode = path.stat().st_mode & 0o777
        rows.append({"path": rel, "byteLength": path.stat().st_size, "mode": mode, "sha256": digest_file(path)})
    return rows


def build_manifest(rows: list[dict[str, object]]) -> dict[str, object]:
    path_set = digest_bytes("\n".join(str(row["path"]) for row in rows).encode())
    aggregate = digest_bytes(b"".join(
        f'{row["path"]}\0{row["byteLength"]}\0{row["mode"]}\0{row["sha256"]}\n'.encode()
        for row in rows
    ))
    return {
        "schemaVersion": "velmere.p34.source-only-package-manifest.v1",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "fileCountExcludingManifestSelf": len(rows),
        "payloadBytesExcludingManifestSelf": sum(int(row["byteLength"]) for row in rows),
        "pathSetSha256": path_set,
        "sourceAggregateSha256": aggregate,
        "entries": rows,
        "truthBoundary": "The embedded manifest excludes itself. SOURCE_ONLY includes current code/configs, methodology, Growth Intel, P34 internal AI raw assessment archive and compact receipts. It excludes dependencies, build outputs, repeated raw logs, generated PDF/raster corpora and external QA inputs. 100% internal AI execution grants zero external/customer/human/legal/provider-rights/GO_PAID/world-class credit.",
    }


def write_zip(output: Path, rows: list[dict[str, object]]) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9, strict_timestamps=False) as archive:
        package_rows = rows + [{"path": MANIFEST.relative_to(ROOT).as_posix(), "mode": MANIFEST.stat().st_mode & 0o777}]
        for row in sorted(package_rows, key=lambda value: str(value["path"]).encode("utf-8")):
            rel = str(row["path"])
            data = (ROOT / rel).read_bytes()
            info = zipfile.ZipInfo(rel, FIXED_TIME)
            mode = int(row.get("mode", 0o644))
            info.create_system = 3
            info.external_attr = ((stat.S_IFREG | mode) & 0xFFFF) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--copy-b", required=True)
    parser.add_argument("--receipt", required=True)
    args = parser.parse_args()
    ART.mkdir(parents=True, exist_ok=True)
    EXCLUSIONS.write_text(json.dumps({
        "schemaVersion": "velmere.p34.source-only-package-exclusions.v1",
        "excluded": EXCLUDE_PATTERNS,
        "reason": "Keep current code and compact receipts while excluding dependencies, generated build/browser/PDF corpora, repeated test logs, SQLite fixture state and external QA inputs.",
        "internalAiAssessmentArchiveIncluded": True,
        "externalExactFontShipped": False,
    }, indent=2) + "\n", "utf-8")
    rows = inventory()
    manifest = build_manifest(rows)
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", "utf-8")
    rows = inventory()
    manifest = build_manifest(rows)
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", "utf-8")

    out = Path(args.output).resolve()
    copy_b = Path(args.copy_b).resolve()
    write_zip(out, rows)
    write_zip(copy_b, rows)
    sha_a = digest_file(out)
    sha_b = digest_file(copy_b)
    with zipfile.ZipFile(out) as archive:
        bad = archive.testzip()
        entries = len([i for i in archive.infolist() if not i.is_dir()])
        uncompressed = sum(i.file_size for i in archive.infolist() if not i.is_dir())
    receipt = {
        "schemaVersion": "velmere.p34.deterministic-package-receipt.v1",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "archive": str(out),
        "copyB": str(copy_b),
        "sha256": sha_a,
        "copyBSha256": sha_b,
        "byteIdentical": sha_a == sha_b and out.read_bytes() == copy_b.read_bytes(),
        "crcPass": bad is None,
        "badEntry": bad,
        "entries": entries,
        "uncompressedBytes": uncompressed,
        "zipBytes": out.stat().st_size,
        "embeddedManifestSha256": digest_file(MANIFEST),
        "embeddedManifestSourceAggregateSha256": manifest["sourceAggregateSha256"],
        "truthBoundary": "Deterministic source packaging and CRC do not grant clean build, Browser, final holdout, real customer, independent review, provider rights, GO_PAID or external proof credit.",
    }
    receipt_path = Path(args.receipt).resolve()
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", "utf-8")
    print(json.dumps(receipt))
    return 0 if receipt["byteIdentical"] and receipt["crcPass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
