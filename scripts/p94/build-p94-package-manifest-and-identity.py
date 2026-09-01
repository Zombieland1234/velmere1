#!/usr/bin/env python3
from __future__ import annotations
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST_REL = "PACKAGE_CONTENT_MANIFEST.tsv"
IDENTITY_REL = "artifacts/closure/p94r1/P94R1_TREE_IDENTITY_EXCLUDING_SELF.json"
SCOPE_REL = "artifacts/closure/p94r1/P94R1_PACKAGE_MANIFEST_SCOPE.json"
FIXED = "2026-08-21T00:25:00.000Z"


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(4 * 1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def row(path: Path) -> dict:
    return {"path": path.relative_to(ROOT).as_posix(), "byteLength": path.stat().st_size, "sha256": sha(path)}


def rows(exclude: set[str]) -> list[dict]:
    result = []
    for path in sorted((item for item in ROOT.rglob("*") if item.is_file()), key=lambda item: item.relative_to(ROOT).as_posix()):
        relative = path.relative_to(ROOT).as_posix()
        if relative in exclude:
            continue
        if path.is_symlink():
            raise RuntimeError(f"symlink:{relative}")
        if relative.endswith((".pyc", ".pyo")) or "/__pycache__/" in f"/{relative}/":
            raise RuntimeError(f"python_cache:{relative}")
        if relative.startswith("node_modules/"):
            raise RuntimeError(f"node_modules:{relative}")
        result.append(row(path))
    return result


def projection(items: list[dict]) -> dict:
    ordered = sorted(items, key=lambda item: item["path"])
    path_hash = hashlib.sha256("\n".join(item["path"] for item in ordered).encode()).hexdigest()
    aggregate = hashlib.sha256()
    for item in ordered:
        aggregate.update(f"{item['path']}\0{item['byteLength']}\0{item['sha256']}\n".encode())
    return {
        "fileCount": len(ordered),
        "payloadBytes": sum(item["byteLength"] for item in ordered),
        "pathSetSha256": path_hash,
        "sourceContentAggregateSha256": aggregate.hexdigest(),
    }


identity = ROOT / IDENTITY_REL
if identity.exists():
    identity.unlink()
scope = {
    "schemaVersion": "velmere.p94r1.package-manifest-scope.v1",
    "generatedAt": FIXED,
    "status": "PASS",
    "manifest": MANIFEST_REL,
    "manifestExcludesExactly": [MANIFEST_REL, IDENTITY_REL],
    "reason": "The TSV cannot include its own digest and intentionally excludes the later self-excluding tree identity. The tree identity includes the finalized TSV and excludes only itself.",
    "ledgerInsideZip": False,
}
scope_path = ROOT / SCOPE_REL
scope_path.parent.mkdir(parents=True, exist_ok=True)
scope_path.write_text(json.dumps(scope, indent=2) + "\n", encoding="utf-8")
manifest_rows = rows({MANIFEST_REL, IDENTITY_REL})
manifest = ROOT / MANIFEST_REL
with manifest.open("w", encoding="utf-8", newline="\n") as handle:
    handle.write("relative_path\tbyte_length\tsha256\n")
    for item in manifest_rows:
        handle.write(f"{item['path']}\t{item['byteLength']}\t{item['sha256']}\n")
identity_rows = rows({IDENTITY_REL})
identity_projection = projection(identity_rows)
payload = {
    "schemaVersion": "velmere.p94r1.tree-identity-excluding-self.v1",
    "generatedAt": FIXED,
    "status": "PASS",
    "excludedOnly": IDENTITY_REL,
    **identity_projection,
    "fullPackageFileCountIncludingThisIdentityFile": identity_projection["fileCount"] + 1,
    "packageContentManifest": {
        "path": MANIFEST_REL,
        "bytes": manifest.stat().st_size,
        "sha256": sha(manifest),
        "listedFiles": len(manifest_rows),
        "excludesExactly": [MANIFEST_REL, IDENTITY_REL],
    },
    "truthBoundary": "Canonical identity of every current SOURCE_ONLY file except this self-referential identity receipt. The finalized package manifest is included in this identity and excludes only itself and the identity file.",
}
identity.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"status": "PASS", "manifestRows": len(manifest_rows), "manifestBytes": manifest.stat().st_size, "manifestSha256": sha(manifest), "identity": payload}, indent=2))
