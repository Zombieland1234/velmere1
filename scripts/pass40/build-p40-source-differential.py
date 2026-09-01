#!/usr/bin/env python3
"""Build exact P39→P40 and informative P36→P40 source differentials.

The differential limits the blast radius and proves what changed. It never
substitutes for a current dependency install, typecheck, build, Browser or PDF run.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
P36 = ROOT / "artifacts/closure/p36/source-identity.json"
P39 = ROOT / "artifacts/closure/p39/source-identity.json"
P40 = ROOT / "artifacts/closure/p40/source-identity.json"
P36_BUILD = ROOT / "artifacts/closure/p36/P36_CURRENT_BYTE_BUILD_GATES.json"
OUT = ROOT / "artifacts/closure/p40/P40_SOURCE_DIFFERENTIAL.json"
REVISION = "P40_V16_A85_CANONICAL_REPLAY_SOURCE_DIFFERENTIAL_FIXTURE_PROFILE_BASELINE"
GENERATED_AT = "2026-08-14T06:37:00.000Z"


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def file_map(identity: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {row["path"]: row for row in identity["files"]}


def diff(base: dict[str, Any], current: dict[str, Any]) -> dict[str, Any]:
    a, b = file_map(base), file_map(current)
    added = sorted(set(b) - set(a), key=lambda x: x.encode("utf-8"))
    removed = sorted(set(a) - set(b), key=lambda x: x.encode("utf-8"))
    changed = sorted((path for path in set(a) & set(b) if a[path]["sha256"] != b[path]["sha256"] or a[path]["mode"] != b[path]["mode"]), key=lambda x: x.encode("utf-8"))
    unchanged = len(set(a) & set(b)) - len(changed)
    return {
        "baseSourceAggregateSha256": base["sourceAggregateSha256"],
        "currentSourceAggregateSha256": current["sourceAggregateSha256"],
        "baseFileCount": base["fileCount"],
        "currentFileCount": current["fileCount"],
        "unchanged": unchanged,
        "changed": changed,
        "changedRows": [{"path": path, "before": a[path], "after": b[path]} for path in changed],
        "added": added,
        "addedRows": [b[path] for path in added],
        "removed": removed,
        "removedRows": [a[path] for path in removed],
    }


def main() -> int:
    p36, p39, p40, p36_build = map(load, (P36, P39, P40, P36_BUILD))
    d39 = diff(p39, p40)
    d36 = diff(p36, p40)
    product_prefixes = ("app/", "components/", "lib/")
    build_sensitive_exact = {"package.json", "package-lock.json", "next.config.ts", "tsconfig.json"}
    product_changed = [p for p in d36["changed"] if p.startswith(product_prefixes) or p in build_sensitive_exact]
    product_added = [p for p in d36["added"] if p.startswith(product_prefixes) or p in build_sensitive_exact]
    product_removed = [p for p in d36["removed"] if p.startswith(product_prefixes) or p in build_sensitive_exact]

    p36_lock = file_map(p36).get("package-lock.json")
    p40_lock = file_map(p40).get("package-lock.json")
    lock_identical = bool(p36_lock and p40_lock and p36_lock["sha256"] == p40_lock["sha256"])
    p36_package = file_map(p36).get("package.json")
    p40_package = file_map(p40).get("package.json")

    canonical_a85 = next((row for row in d39["changedRows"] if row["path"] == "config/pass36/a85-shield-pro-map-full-depth-policy.json"), None)
    if canonical_a85 is None:
        raise RuntimeError("required_p39_to_p40_a85_policy_change_missing")
    if canonical_a85["before"]["sha256"] != "6ce6d3c1451744cf3438e10c4f58914eb8808e4cfb7eb9ab720bea72a2d31744" or canonical_a85["after"]["sha256"] != "99d45a32efe55d4d630a6fcab42c3b4a47a5b54332ed6ddbb23b8af52653bc73":
        raise RuntimeError("a85_policy_differential_unexpected")

    payload: dict[str, Any] = {
        "schemaVersion": "velmere.p40.source-differential.v1",
        "revision": REVISION,
        "generatedAt": GENERATED_AT,
        "state": "IMPLEMENTED_AND_TESTED_INTERNAL_DIFFERENTIAL",
        "releaseState": "NO_GO",
        "parentRoot": "R44P46",
        "inputs": {
            "p36SourceIdentity": {"path": P36.relative_to(ROOT).as_posix(), "sha256": sha256_file(P36)},
            "p39SourceIdentity": {"path": P39.relative_to(ROOT).as_posix(), "sha256": sha256_file(P39)},
            "p40SourceIdentity": {"path": P40.relative_to(ROOT).as_posix(), "sha256": sha256_file(P40)},
            "p36BuildGates": {"path": P36_BUILD.relative_to(ROOT).as_posix(), "sha256": sha256_file(P36_BUILD)},
        },
        "p39ToP40": d39,
        "p36ToP40BuildSensitive": {
            "historicalP36ExactRuntime": p36_build["runtime"],
            "historicalP36BuildSourceAggregateSha256": p36_build["sourceIdentity"]["sourceAggregateSha256"],
            "packageLockIdentical": lock_identical,
            "packageLockSha256": p40_lock["sha256"] if p40_lock else None,
            "packageJsonBeforeSha256": p36_package["sha256"] if p36_package else None,
            "packageJsonCurrentSha256": p40_package["sha256"] if p40_package else None,
            "productOrBuildSensitiveChanged": product_changed,
            "productOrBuildSensitiveAdded": product_added,
            "productOrBuildSensitiveRemoved": product_removed,
            "historicalBuildCompatibilityInference": "INFORMATIVE_ONLY_NOT_CURRENT_BUILD_CREDIT",
        },
        "a85CanonicalRepair": {
            "path": canonical_a85["path"],
            "beforeSha256": canonical_a85["before"]["sha256"],
            "afterSha256": canonical_a85["after"]["sha256"],
            "changedInputBindings": [
                "components/market-integrity/ShieldProCleanTerminalClient.tsx",
                "components/market-integrity/ShieldMapCommandClient.tsx",
                "lib/market-integrity/shield-investigator.ts",
            ],
            "runtimeImplementationFilesChangedThisPass": False,
            "classification": "STALE_POLICY_SOURCE_BINDING_REPAIR",
        },
        "credit": {
            "exactSourceDifferential": True,
            "blastRadiusKnown": True,
            "packageLockContinuity": lock_identical,
            "currentDependencyClosure": False,
            "currentTypecheck": False,
            "currentLint": False,
            "currentWebpack": False,
            "currentTurbopack": False,
            "currentBrowser": False,
            "currentPdf": False,
            "goInternal": False,
        },
        "truthBoundary": "P40 records exact path/content changes from P39 and an informative build-sensitive differential from the last exact P36 build. An unchanged lockfile and small product-code delta reduce uncertainty but do not grant current install, typecheck, lint, Webpack, Turbopack, Browser, PDF or release credit.",
    }
    clone = dict(payload)
    payload["integritySha256"] = sha256_bytes(json.dumps(clone, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": "PASS_P40_SOURCE_DIFFERENTIAL",
        "p39ToP40Changed": len(d39["changed"]),
        "p39ToP40Added": len(d39["added"]),
        "p39ToP40Removed": len(d39["removed"]),
        "p36ToP40ProductChanged": len(product_changed),
        "packageLockIdentical": lock_identical,
        "receiptSha256": sha256_file(OUT),
        "releaseState": "NO_GO",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
