#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import pathlib
import urllib.request

VERSIONS = [
    "0.4.0", "0.4.2", "0.4.9", "0.4.10", "0.4.11", "0.4.13",
    "0.4.15", "0.4.16", "0.4.18", "0.4.19", "0.4.21", "0.4.22",
    "0.4.23", "0.4.24", "0.4.25", "0.8.24",
]
BASE = "https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/linux-amd64/"

out = pathlib.Path(os.environ["VELMERE_SOLC_BIN_DIR"])
out.mkdir(parents=True, exist_ok=True)
manifest = json.load(urllib.request.urlopen(BASE + "list.json", timeout=60))
by_version = {row["version"]: row for row in manifest["builds"]}
rows: dict[str, dict[str, object]] = {}

for version in VERSIONS:
    build = by_version.get(version)
    if not build:
        rows[version] = {
            "status": "BLOCKED_NATIVE_ARTIFACT_UNAVAILABLE",
            "reason": "version_absent_from_pinned_linux_amd64_manifest",
        }
        continue
    body = urllib.request.urlopen(BASE + build["path"], timeout=120).read()
    actual = hashlib.sha256(body).hexdigest()
    expected = build["sha256"].removeprefix("0x")
    if actual != expected:
        raise SystemExit(f"hash mismatch {version}: {actual} != {expected}")
    binary = out / f"solc-{version}"
    binary.write_bytes(body)
    binary.chmod(0o755)
    rows[version] = {
        "status": "AVAILABLE_NATIVE_HASH_VERIFIED",
        "path": build["path"],
        "longVersion": build["longVersion"],
        "sha256": actual,
        "bytes": len(body),
    }

output = {
    "schemaVersion": "velmere.r44p13.solc-native-binary-manifest.v1",
    "source": BASE + "list.json",
    "versions": rows,
}
(out / "SOLC_BINARY_MANIFEST.json").write_text(
    json.dumps(output, indent=2, sort_keys=True) + "\n", encoding="utf-8"
)
print(json.dumps({
    "available": sum(1 for row in rows.values() if str(row["status"]).startswith("AVAILABLE")),
    "blocked": sum(1 for row in rows.values() if str(row["status"]).startswith("BLOCKED")),
    "versions": rows,
}, indent=2))
