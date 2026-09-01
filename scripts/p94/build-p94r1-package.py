#!/usr/bin/env python3
from __future__ import annotations
import argparse
import hashlib
import json
import re
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import Any

FIXED_TIME = (1980, 1, 1, 0, 0, 0)
IDENTITY_REL = "artifacts/closure/p94r1/P94R1_TREE_IDENTITY_EXCLUDING_SELF.json"
MANIFEST_REL = "PACKAGE_CONTENT_MANIFEST.tsv"
PRIVATE_KEY_RE = re.compile(
    rb"-----BEGIN (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----\r?\n(?:[A-Za-z0-9+/=]{16,}\r?\n){2,}-----END (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----"
)
TOKEN_PATTERNS = {
    "aws_access_key_id": re.compile(rb"AKIA[0-9A-Z]{16}"),
    "stripe_live_secret": re.compile(rb"sk_live_[A-Za-z0-9]{16,}"),
    "stripe_webhook_secret": re.compile(rb"whsec_[A-Za-z0-9]{16,}"),
    "github_fine_grained_pat": re.compile(rb"github_pat_[A-Za-z0-9_]{20,}"),
    "github_classic_pat": re.compile(rb"ghp_[A-Za-z0-9]{30,}"),
    "openai_api_key": re.compile(rb"(?<![A-Za-z0-9_-])sk-(?:proj-)?[A-Za-z0-9_-]{24,}"),
    "google_api_key": re.compile(rb"AIza[0-9A-Za-z_-]{30,}"),
}


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(4 * 1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def projection(rows: list[dict[str, Any]]) -> dict[str, Any]:
    ordered = sorted(rows, key=lambda row: row["path"])
    path_hash = hashlib.sha256("\n".join(row["path"] for row in ordered).encode()).hexdigest()
    aggregate = hashlib.sha256()
    for row in ordered:
        aggregate.update(f"{row['path']}\0{row['byteLength']}\0{row['sha256']}\n".encode())
    return {"fileCount": len(ordered), "payloadBytes": sum(row["byteLength"] for row in ordered), "pathSetSha256": path_hash, "sourceContentAggregateSha256": aggregate.hexdigest()}


def source_rows(root: Path) -> list[dict[str, Any]]:
    result = []
    for path in sorted((item for item in root.rglob("*") if item.is_file()), key=lambda item: item.relative_to(root).as_posix()):
        relative = path.relative_to(root).as_posix()
        if path.is_symlink():
            raise RuntimeError(f"symlink:{relative}")
        if relative.endswith((".pyc", ".pyo")) or "/__pycache__/" in f"/{relative}/":
            raise RuntimeError(f"python_cache:{relative}")
        if relative.startswith("node_modules/"):
            raise RuntimeError(f"node_modules:{relative}")
        result.append({"path": relative, "byteLength": path.stat().st_size, "sha256": sha(path)})
    return result


def parse_manifest(root: Path) -> list[dict[str, Any]]:
    lines = (root / MANIFEST_REL).read_text(encoding="utf-8").splitlines()
    if not lines or lines[0] != "relative_path\tbyte_length\tsha256":
        raise RuntimeError("manifest_header")
    result = []
    for line in lines[1:]:
        relative, size, digest = line.split("\t")
        result.append({"path": relative, "byteLength": int(size), "sha256": digest})
    if [row["path"] for row in result] != sorted(row["path"] for row in result):
        raise RuntimeError("manifest_order")
    if len({row["path"] for row in result}) != len(result):
        raise RuntimeError("manifest_duplicate")
    return result


def scan(root: Path, rows: list[dict[str, Any]]) -> list[dict[str, str]]:
    findings = []
    for row in rows:
        data = (root / row["path"]).read_bytes()
        if PRIVATE_KEY_RE.search(data):
            findings.append({"path": row["path"], "pattern": "private_key_block"})
        for name, pattern in TOKEN_PATTERNS.items():
            if pattern.search(data):
                findings.append({"path": row["path"], "pattern": name})
    return findings


def build_zip(root: Path, output: Path, rows: list[dict[str, Any]]) -> None:
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=1, strict_timestamps=False) as archive:
        for row in rows:
            info = zipfile.ZipInfo(row["path"], FIXED_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 0
            info.external_attr = (0o600 & 0xFFFF) << 16
            info.flag_bits = 0
            with (root / row["path"]).open("rb") as source, archive.open(info, "w", force_zip64=True) as destination:
                shutil.copyfileobj(source, destination, length=4 * 1024 * 1024)


def identical(left: Path, right: Path) -> bool:
    if left.stat().st_size != right.stat().st_size:
        return False
    with left.open("rb") as a, right.open("rb") as b:
        while True:
            x = a.read(8 * 1024 * 1024)
            y = b.read(8 * 1024 * 1024)
            if x != y:
                return False
            if not x:
                return True


def verify_zip(path: Path, rows: list[dict[str, Any]]) -> dict[str, Any]:
    expected = [row["path"] for row in rows]
    mapping = {row["path"]: row for row in rows}
    with zipfile.ZipFile(path) as archive:
        infos = archive.infolist()
        names = [info.filename for info in infos]
        if names != expected or names != sorted(names):
            raise RuntimeError("zip_order")
        if any(info.is_dir() or info.filename.endswith("/") for info in infos):
            raise RuntimeError("directory_entry")
        if any(info.date_time != FIXED_TIME for info in infos):
            raise RuntimeError("timestamp")
        if any(info.create_system != 0 for info in infos):
            raise RuntimeError("create_system")
        if any(((info.external_attr >> 16) & 0xFFFF) != 0o600 for info in infos):
            raise RuntimeError("mode")
        if any(info.file_size != mapping[info.filename]["byteLength"] for info in infos):
            raise RuntimeError("size")
        bad = archive.testzip()
        if bad:
            raise RuntimeError(f"crc:{bad}")
    return {"entryCount": len(rows), "bytes": path.stat().st_size, "sha256": sha(path), "crc": "PASS", "ordering": "lexicographic", "timestamp": "1980-01-01T00:00:00Z", "directoryEntries": 0, "createSystem": 0, "externalMode": "0600"}


def clean_unpack(zip_path: Path, rows: list[dict[str, Any]]) -> str:
    with tempfile.TemporaryDirectory(prefix="p94-clean-") as temporary:
        target = Path(temporary)
        with zipfile.ZipFile(zip_path) as archive:
            archive.extractall(target)
        if source_rows(target) != rows:
            raise RuntimeError("clean_unpack")
    return "PASS_PATH_AND_CONTENT_IDENTITY"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--verification", required=True)
    args = parser.parse_args()
    root = Path(args.root).resolve()
    output = Path(args.output).resolve()
    verification = Path(args.verification).resolve()
    rows = source_rows(root)
    identity = json.loads((root / IDENTITY_REL).read_text(encoding="utf-8"))
    if identity["fullPackageFileCountIncludingThisIdentityFile"] != len(rows):
        raise RuntimeError("identity_count")
    nonself = [row for row in rows if row["path"] != IDENTITY_REL]
    identity_projection = {key: identity[key] for key in ("fileCount", "payloadBytes", "pathSetSha256", "sourceContentAggregateSha256")}
    if projection(nonself) != identity_projection:
        raise RuntimeError("identity_projection")
    manifest = parse_manifest(root)
    expected_manifest = [row for row in rows if row["path"] not in (MANIFEST_REL, IDENTITY_REL)]
    if manifest != expected_manifest:
        raise RuntimeError("package_manifest_mismatch")
    findings = scan(root, rows)
    if findings:
        raise RuntimeError(f"secret:{findings[:20]}")
    current_binaries = [
        row["path"] for row in rows
        if row["path"].startswith(("receipts/p94/", "artifacts/p94/", "scripts/p94/", "artifacts/closure/p94r1/"))
        and Path(row["path"]).suffix.lower() in {".pdf", ".zip", ".woff", ".woff2", ".ttf", ".otf", ".exe", ".dll", ".bin", ".pyc", ".pyo"}
    ]
    if current_binaries:
        raise RuntimeError(f"unexpected_current_binary:{current_binaries}")
    with tempfile.TemporaryDirectory(prefix="p94-package-") as temporary:
        build_a = Path(temporary) / "a.zip"
        build_b = Path(temporary) / "b.zip"
        build_zip(root, build_a, rows)
        build_zip(root, build_b, rows)
        if not identical(build_a, build_b):
            raise RuntimeError("not_deterministic")
        verify_a = verify_zip(build_a, rows)
        verify_b = verify_zip(build_b, rows)
        clean = clean_unpack(build_a, rows)
        output.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(build_a, output)
    final = {**verify_a, "sha256": sha(output), "cleanUnpack": clean}
    if final["sha256"] != verify_a["sha256"] or output.stat().st_size != verify_a["bytes"]:
        raise RuntimeError("final_copy_identity")
    payload = {
        "schemaVersion": "velmere.p94r1.package-verification.v1",
        "status": "PASS",
        "root": str(root),
        "output": output.name,
        "deterministicRebuild": "2/2 BYTE_IDENTICAL",
        "buildA": verify_a,
        "buildB": verify_b,
        "final": final,
        "treeIdentity": identity_projection,
        "packageContentManifest": {"path": MANIFEST_REL, "bytes": (root / MANIFEST_REL).stat().st_size, "sha256": sha(root / MANIFEST_REL), "listedFiles": len(manifest), "verifiedExact": True},
        "privateKeySecretScan": {"matches": 0},
        "unexpectedCurrentBinaryScan": {"matches": 0},
        "truthBoundary": "SOURCE_ONLY package identity, determinism, CRC, clean unpack and secret/binary scanning only. It grants no PostgreSQL, Browser, deployment, exact-Windows or Customer FINAL credit.",
    }
    verification.parent.mkdir(parents=True, exist_ok=True)
    verification.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
