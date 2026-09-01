#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, sys, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE_IDENTITY = ROOT / "artifacts/closure/p34/source-identity.json"
OUT = ROOT / "artifacts/closure/p34/p33-vs-p34-current-diff.json"
EXCLUDED_PREFIXES = (".git/", ".next/", "node_modules/", ".velmere/", "artifacts/closure/", "tmp/", "temp/")
PRODUCT_PREFIXES = ("app/", "components/", "lib/", "public/", "styles/", "middleware", "next.config", "package.json", "package-lock.json", "tsconfig")

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def included(name: str) -> bool:
    name = name.replace("\\", "/")
    if "__pycache__/" in name or name.endswith(".pyc"):
        return False
    return not any(name == prefix.rstrip("/") or name.startswith(prefix) for prefix in EXCLUDED_PREFIXES)

def main() -> int:
    if len(sys.argv) != 2:
        print("usage: build-p34-parent-diff.py P33_SOURCE_ZIP", file=sys.stderr)
        return 2
    parent_path = Path(sys.argv[1]).resolve()
    current = json.loads(SOURCE_IDENTITY.read_text("utf-8"))
    current_map = {row["path"]: row["sha256"] for row in current["files"]}
    parent_map: dict[str, str] = {}
    with zipfile.ZipFile(parent_path) as archive:
        for info in archive.infolist():
            if info.is_dir():
                continue
            name = info.filename.replace("\\", "/")
            if included(name):
                parent_map[name] = sha(archive.read(info))
    parent_names, current_names = set(parent_map), set(current_map)
    only_parent = sorted(parent_names - current_names)
    only_current = sorted(current_names - parent_names)
    changed = sorted(name for name in parent_names & current_names if parent_map[name] != current_map[name])
    all_changes = only_parent + only_current + changed
    product_changes = sorted(name for name in all_changes if name.startswith(PRODUCT_PREFIXES))
    closure_changes = sorted(name for name in all_changes if name not in product_changes)
    result = {
        "schemaVersion": "velmere.p34.parent-current-source-diff.v3",
        "parentArchive": str(parent_path),
        "parentArchiveSha256": sha(parent_path.read_bytes()),
        "comparisonExclusions": list(EXCLUDED_PREFIXES),
        "parentFileCount": len(parent_map),
        "currentSourceIdentity": str(SOURCE_IDENTITY.relative_to(ROOT)),
        "currentSourceAggregateSha256": current["sourceAggregateSha256"],
        "currentFileCount": len(current_map),
        "onlyParentCount": len(only_parent),
        "onlyCurrentCount": len(only_current),
        "changedCount": len(changed),
        "onlyParent": only_parent,
        "onlyCurrent": only_current,
        "changed": [{"path": name, "parentSha256": parent_map[name], "currentSha256": current_map[name]} for name in changed],
        "productSourceChangeCount": len(product_changes),
        "productSourceChanges": product_changes,
        "closureMethodologyChangeCount": len(closure_changes),
        "closureMethodologyChanges": closure_changes,
        "truthBoundary": "P34 is an internal AI methodology/closure pass. Product runtime receives no new credit when productSourceChangeCount is zero."
    }
    OUT.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", "utf-8")
    print(json.dumps({k: result[k] for k in ["parentFileCount", "currentFileCount", "onlyParentCount", "onlyCurrentCount", "changedCount", "productSourceChangeCount", "closureMethodologyChangeCount", "currentSourceAggregateSha256"]}))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
