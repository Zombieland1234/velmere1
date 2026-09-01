#!/usr/bin/env python3
"""Recover exact current-lockfile npm tarballs from a pre-existing local content cache.

This pass is deliberately bounded. It binds the *current* package-lock bytes,
corrects the stale historical A78 denominator, and copies only tarballs whose
SHA-512 SRI exactly matches a current lockfile row. It performs no network
request and grants no npm-ci, build, Browser, paid, LIVE, or release credit.
"""

from __future__ import annotations

import base64
import hashlib
import json
from pathlib import Path
import shutil
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
LOCK = ROOT / "package-lock.json"
A78 = ROOT / "config/pass36/a78-exact-runtime-lockfile-browser-bootstrap.json"
POLICY = ROOT / "config/p38/p38-current-lockfile-local-cas-policy.json"
IMPORT_MANIFEST = ROOT / "config/p38/p38-local-cache-import-manifest.json"
RECEIPT = ROOT / "artifacts/closure/p38/P38_CURRENT_LOCKFILE_LOCAL_CAS_RECOVERY.json"
TARGET_CAS = ROOT / "config/p38/dependency-cas"
BASELINE_CAS = (
    ROOT / "config/supply-chain-license-archive-cas-pass4825",
    ROOT / "config/supply-chain-install-script-archive-cas-pass4825",
)
NPM_CONTENT_CACHE = Path("/root/.npm/_cacache/content-v2")

REVISION = "P38_V15_CURRENT_LOCKFILE_CAS_RECOVERY_AND_NODE24_DIFFERENTIAL"
GENERATED_AT = "2026-08-14T03:10:00.000Z"
EXPECTED_CURRENT_LOCK_SHA256 = "e228adec08801e454ef5559a20f302110b4896a307c364195716218a376c48bb"
EXPECTED_CURRENT_LOCK_ROWS = 661
EXPECTED_HISTORICAL_A78_LOCK_SHA256 = "6269b250e484780187c9378b52c69898fa533cf1c39cc21122ce8ef053387a6b"
EXPECTED_HISTORICAL_A78_ROWS = 654
EXPECTED_BASELINE_COVERED_PATHS = 41
EXPECTED_RECOVERED_PATHS = 26
EXPECTED_COMBINED_COVERED_PATHS = 67
EXPECTED_RECOVERED_TARBALLS = 26


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def write_integrity_json(path: Path, payload: dict[str, Any]) -> None:
    payload["integritySha256"] = sha256_bytes(canonical_json(payload))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def lock_rows(lock: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for lock_path, row in lock.get("packages", {}).items():
        if not lock_path or not isinstance(row, dict) or row.get("link"):
            continue
        resolved = row.get("resolved")
        integrity = row.get("integrity")
        if not isinstance(resolved, str) or not isinstance(integrity, str):
            continue
        rows.append({
            "lockPath": lock_path,
            "name": row.get("name"),
            "version": row.get("version"),
            "resolved": resolved,
            "integrity": integrity,
        })
    rows.sort(key=lambda item: item["lockPath"].encode("utf-8"))
    return rows


def integrity_of(data: bytes, algorithm: str = "sha512") -> str:
    digest = hashlib.new(algorithm, data).digest()
    return f"{algorithm}-{base64.b64encode(digest).decode('ascii')}"


def cache_content_path(integrity: str) -> Path:
    algorithm, encoded = integrity.split("-", 1)
    digest_hex = base64.b64decode(encoded).hex()
    return NPM_CONTENT_CACHE / algorithm / digest_hex[:2] / digest_hex[2:4] / digest_hex[4:]


def scan_cas(directories: tuple[Path, ...] | list[Path], rows: list[dict[str, Any]]) -> dict[str, Any]:
    by_integrity: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        by_integrity.setdefault(row["integrity"], []).append(row)
    files: list[dict[str, Any]] = []
    for directory in directories:
        if not directory.is_dir():
            continue
        for path in sorted(directory.glob("*.tgz"), key=lambda item: item.name.encode("utf-8")):
            if path.is_symlink() or not path.is_file():
                raise RuntimeError(f"cas_non_regular:{path}")
            data = path.read_bytes()
            integrity = integrity_of(data)
            matches = by_integrity.get(integrity, [])
            files.append({
                "path": path.relative_to(ROOT).as_posix(),
                "byteLength": len(data),
                "sha256": sha256_bytes(data),
                "integrity": integrity,
                "matchedLockPaths": [row["lockPath"] for row in matches],
            })
    covered = sorted({lock_path for item in files for lock_path in item["matchedLockPaths"]}, key=lambda item: item.encode("utf-8"))
    return {
        "expectedLockPaths": len(rows),
        "exactCoveredLockPaths": len(covered),
        "uncoveredLockPaths": len(rows) - len(covered),
        "uniqueCasTarballs": len(files),
        "coveragePercent": round((len(covered) / len(rows)) * 100, 3) if rows else 0,
        "coveredPathSetSha256": sha256_bytes("\n".join(covered).encode("utf-8")),
        "files": files,
        "coveredPaths": covered,
    }


def main() -> int:
    if sha256_file(LOCK) != EXPECTED_CURRENT_LOCK_SHA256:
        raise RuntimeError(f"current_lock_changed:{sha256_file(LOCK)}")
    lock = json.loads(LOCK.read_text(encoding="utf-8"))
    rows = lock_rows(lock)
    if len(rows) != EXPECTED_CURRENT_LOCK_ROWS:
        raise RuntimeError(f"current_lock_denominator_changed:{len(rows)}")

    a78 = json.loads(A78.read_text(encoding="utf-8"))
    historical = a78.get("packageLock", {})
    if historical.get("sha256") != EXPECTED_HISTORICAL_A78_LOCK_SHA256:
        raise RuntimeError("historical_a78_lock_binding_changed")
    if historical.get("expectedRemotePackages") != EXPECTED_HISTORICAL_A78_ROWS:
        raise RuntimeError("historical_a78_denominator_changed")

    baseline = scan_cas(BASELINE_CAS, rows)
    if baseline["exactCoveredLockPaths"] != EXPECTED_BASELINE_COVERED_PATHS:
        raise RuntimeError(f"current_baseline_coverage_changed:{baseline['exactCoveredLockPaths']}")
    baseline_integrities = {
        item["integrity"] for item in baseline["files"] if item["matchedLockPaths"]
    }

    TARGET_CAS.mkdir(parents=True, exist_ok=True)
    expected_by_integrity: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        expected_by_integrity.setdefault(row["integrity"], []).append(row)

    recovered: list[dict[str, Any]] = []
    for integrity, matching_rows in sorted(expected_by_integrity.items(), key=lambda item: item[0].encode("utf-8")):
        if integrity in baseline_integrities:
            continue
        source = cache_content_path(integrity)
        existing_candidates = sorted(TARGET_CAS.glob("*.tgz"), key=lambda item: item.name.encode("utf-8"))
        existing_by_integrity: dict[str, Path] = {}
        for candidate in existing_candidates:
            data = candidate.read_bytes()
            existing_by_integrity[integrity_of(data)] = candidate
        existing = existing_by_integrity.get(integrity)
        if existing is not None:
            data = existing.read_bytes()
            origin = "P38_SOURCE_CAS_ALREADY_PRESENT"
            target = existing
        elif source.is_file():
            data = source.read_bytes()
            if integrity_of(data) != integrity:
                raise RuntimeError(f"npm_cache_integrity_mismatch:{integrity}")
            sha256 = sha256_bytes(data)
            target = TARGET_CAS / f"{sha256}.tgz"
            if target.exists() and target.read_bytes() != data:
                raise RuntimeError(f"target_sha256_collision:{target.name}")
            if not target.exists():
                shutil.copyfile(source, target)
            origin = "LOCAL_PREEXISTING_NPM_CONTENT_CACHE"
        else:
            continue

        if integrity_of(data) != integrity:
            raise RuntimeError(f"recovered_integrity_mismatch:{target}")
        sha256 = sha256_bytes(data)
        if target.name != f"{sha256}.tgz":
            raise RuntimeError(f"target_name_not_sha256:{target.name}:{sha256}")
        recovered.append({
            "path": target.relative_to(ROOT).as_posix(),
            "byteLength": len(data),
            "sha256": sha256,
            "integrity": integrity,
            "originClass": origin,
            "lockPaths": [row["lockPath"] for row in matching_rows],
            "packages": [
                {
                    "lockPath": row["lockPath"],
                    "name": row["name"],
                    "version": row["version"],
                    "resolved": row["resolved"],
                }
                for row in matching_rows
            ],
        })

    recovered.sort(key=lambda item: item["path"].encode("utf-8"))
    if len(recovered) != EXPECTED_RECOVERED_TARBALLS:
        raise RuntimeError(f"recovered_tarball_count_changed:{len(recovered)}")
    recovered_paths = sum(len(item["lockPaths"]) for item in recovered)
    if recovered_paths != EXPECTED_RECOVERED_PATHS:
        raise RuntimeError(f"recovered_path_count_changed:{recovered_paths}")

    target_files = sorted(TARGET_CAS.glob("*.tgz"), key=lambda item: item.name.encode("utf-8"))
    if len(target_files) != EXPECTED_RECOVERED_TARBALLS:
        raise RuntimeError(f"unexpected_target_cas_file_count:{len(target_files)}")

    combined = scan_cas([*BASELINE_CAS, TARGET_CAS], rows)
    if combined["exactCoveredLockPaths"] != EXPECTED_COMBINED_COVERED_PATHS:
        raise RuntimeError(f"combined_coverage_changed:{combined['exactCoveredLockPaths']}")

    policy: dict[str, Any] = {
        "schemaVersion": "velmere.p38.current-lockfile-local-cas-policy.v1",
        "revision": REVISION,
        "generatedAt": GENERATED_AT,
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "parentRoot": "R44P46",
        "parentCheckpoint": "P37_V15_PACKAGE_REPRODUCIBILITY_AND_A85_BINDING",
        "currentPackageLock": {
            "path": LOCK.relative_to(ROOT).as_posix(),
            "sha256": EXPECTED_CURRENT_LOCK_SHA256,
            "expectedRemoteLockPaths": EXPECTED_CURRENT_LOCK_ROWS,
            "derivation": "non-link package-lock packages rows with string resolved and integrity",
        },
        "historicalA78Binding": {
            "path": A78.relative_to(ROOT).as_posix(),
            "sha256": sha256_file(A78),
            "boundPackageLockSha256": EXPECTED_HISTORICAL_A78_LOCK_SHA256,
            "expectedRemotePackages": EXPECTED_HISTORICAL_A78_ROWS,
            "currentStatus": "HISTORICAL_POLICY_PRESERVED_BUT_CURRENT_LOCK_BINDING_STALE",
        },
        "casDirectories": {
            "baseline": [path.relative_to(ROOT).as_posix() for path in BASELINE_CAS],
            "recovered": TARGET_CAS.relative_to(ROOT).as_posix(),
        },
        "admissionRules": {
            "networkRequestsAllowed": False,
            "exactCurrentLockSriRequired": True,
            "sha256FilenameRequired": True,
            "symlinksAllowed": False,
            "nonRegularFilesAllowed": False,
            "unknownTarballsReceiveCoverage": False,
            "allCurrentLockTarballsRequiredForDependencyClosure": True,
            "offlineNpmCiRequiredForDependencyClosure": True,
        },
        "expectedCurrentResult": {
            "baselineExactCoveredLockPaths": EXPECTED_BASELINE_COVERED_PATHS,
            "recoveredExactCoveredLockPaths": EXPECTED_RECOVERED_PATHS,
            "combinedExactCoveredLockPaths": EXPECTED_COMBINED_COVERED_PATHS,
            "remainingUncoveredLockPaths": EXPECTED_CURRENT_LOCK_ROWS - EXPECTED_COMBINED_COVERED_PATHS,
        },
        "creditBoundary": {
            "currentLockRebound": True,
            "exactTarballRecoveryCredit": True,
            "dependencyClosureCredit": False,
            "offlineNpmCiCredit": False,
            "exactNodeCredit": False,
            "buildCredit": False,
            "browserCredit": False,
            "goInternalCredit": False,
            "saleOrLiveCredit": False,
        },
        "truthBoundary": (
            "P38 binds the current package-lock and recovers only exact SRI-matching tarballs already present in a "
            "local content-addressable cache. Historical A78 is preserved but is not current authority because its "
            "lock hash and denominator are stale. Partial CAS coverage is not dependency closure and gives no npm-ci, "
            "build, Browser, GO_INTERNAL, paid, LIVE, or world-class credit."
        ),
    }
    write_integrity_json(POLICY, policy)

    manifest: dict[str, Any] = {
        "schemaVersion": "velmere.p38.local-cache-import-manifest.v1",
        "revision": REVISION,
        "generatedAt": GENERATED_AT,
        "sourceClass": "LOCAL_PREEXISTING_NPM_CONTENT_CACHE_NO_NETWORK",
        "networkRequestsExecuted": 0,
        "currentPackageLock": {
            "sha256": EXPECTED_CURRENT_LOCK_SHA256,
            "remoteLockPaths": EXPECTED_CURRENT_LOCK_ROWS,
        },
        "historicalBindingCorrection": {
            "historicalA78LockSha256": EXPECTED_HISTORICAL_A78_LOCK_SHA256,
            "historicalA78Denominator": EXPECTED_HISTORICAL_A78_ROWS,
            "currentLockSha256": EXPECTED_CURRENT_LOCK_SHA256,
            "currentDenominator": EXPECTED_CURRENT_LOCK_ROWS,
            "denominatorDelta": EXPECTED_CURRENT_LOCK_ROWS - EXPECTED_HISTORICAL_A78_ROWS,
            "currentBaselineExactCoverage": EXPECTED_BASELINE_COVERED_PATHS,
            "historicalCoverageNotPromoted": True,
        },
        "baselineCoverage": {
            key: baseline[key]
            for key in (
                "expectedLockPaths", "exactCoveredLockPaths", "uncoveredLockPaths",
                "uniqueCasTarballs", "coveragePercent", "coveredPathSetSha256",
            )
        },
        "recovered": {
            "tarballs": len(recovered),
            "lockPaths": recovered_paths,
            "payloadBytes": sum(item["byteLength"] for item in recovered),
            "rows": recovered,
        },
        "combinedCoverage": {
            key: combined[key]
            for key in (
                "expectedLockPaths", "exactCoveredLockPaths", "uncoveredLockPaths",
                "uniqueCasTarballs", "coveragePercent", "coveredPathSetSha256",
            )
        },
        "delta": {
            "exactCoveredLockPaths": combined["exactCoveredLockPaths"] - baseline["exactCoveredLockPaths"],
            "coveragePercentagePoints": round(combined["coveragePercent"] - baseline["coveragePercent"], 3),
            "remainingUncoveredLockPaths": combined["uncoveredLockPaths"],
        },
        "allRecoveredSriVerified": True,
        "allRecoveredSha256Verified": True,
        "allRecoveredFilenamesContentAddressed": True,
        "dependencyClosure": False,
        "offlineNpmCiExecuted": False,
        "releaseState": "NO_GO",
        "truthBoundary": policy["truthBoundary"],
    }
    write_integrity_json(IMPORT_MANIFEST, manifest)

    receipt: dict[str, Any] = {
        "schemaVersion": "velmere.p38.current-lockfile-local-cas-recovery-receipt.v1",
        "revision": REVISION,
        "generatedAt": GENERATED_AT,
        "state": "IMPLEMENTED_AND_TESTED_INTERNAL_PARTIAL_DEPENDENCY_ARTIFACT_RECOVERY",
        "policy": {
            "path": POLICY.relative_to(ROOT).as_posix(),
            "sha256": sha256_file(POLICY),
        },
        "importManifest": {
            "path": IMPORT_MANIFEST.relative_to(ROOT).as_posix(),
            "sha256": sha256_file(IMPORT_MANIFEST),
        },
        "currentPackageLockSha256": EXPECTED_CURRENT_LOCK_SHA256,
        "currentRemoteLockPaths": EXPECTED_CURRENT_LOCK_ROWS,
        "historicalA78CurrentBinding": "STALE_LOCK_HASH_AND_DENOMINATOR",
        "baselineExactCoverage": f"{baseline['exactCoveredLockPaths']}/{EXPECTED_CURRENT_LOCK_ROWS}",
        "recoveredExactCoverageDelta": f"+{recovered_paths}",
        "combinedExactCoverage": f"{combined['exactCoveredLockPaths']}/{EXPECTED_CURRENT_LOCK_ROWS}",
        "combinedCoveragePercent": combined["coveragePercent"],
        "remainingUncovered": combined["uncoveredLockPaths"],
        "recoveredTarballs": len(recovered),
        "recoveredPayloadBytes": sum(item["byteLength"] for item in recovered),
        "networkRequestsExecuted": 0,
        "allRecoveredSriVerified": True,
        "allRecoveredSha256Verified": True,
        "dependencyClosure": False,
        "offlineNpmCiExecuted": False,
        "exactRuntimeExecuted": False,
        "releaseState": "NO_GO",
        "creditClass": "IMPLEMENTED_AND_TESTED_INTERNAL_PARTIAL_DEPENDENCY_ARTIFACT_RECOVERY",
        "truthBoundary": policy["truthBoundary"],
    }
    write_integrity_json(RECEIPT, receipt)

    print(json.dumps({
        "status": "PASS_P38_CURRENT_LOCKFILE_LOCAL_CAS_RECOVERY",
        "currentLockSha256": EXPECTED_CURRENT_LOCK_SHA256,
        "currentRemoteLockPaths": EXPECTED_CURRENT_LOCK_ROWS,
        "historicalA78Denominator": EXPECTED_HISTORICAL_A78_ROWS,
        "baseline": f"{baseline['exactCoveredLockPaths']}/{EXPECTED_CURRENT_LOCK_ROWS}",
        "recoveredDelta": recovered_paths,
        "combined": f"{combined['exactCoveredLockPaths']}/{EXPECTED_CURRENT_LOCK_ROWS}",
        "remaining": combined["uncoveredLockPaths"],
        "recoveredTarballs": len(recovered),
        "networkRequests": 0,
        "dependencyClosure": False,
        "releaseState": "NO_GO",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
