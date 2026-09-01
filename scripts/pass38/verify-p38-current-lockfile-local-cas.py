#!/usr/bin/env python3
"""Verify the P38 current-lockfile CAS recovery from SOURCE_ONLY bytes only."""

from __future__ import annotations

import base64
import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
LOCK = ROOT / "package-lock.json"
POLICY = ROOT / "config/p38/p38-current-lockfile-local-cas-policy.json"
MANIFEST = ROOT / "config/p38/p38-local-cache-import-manifest.json"
RECEIPT = ROOT / "artifacts/closure/p38/P38_CURRENT_LOCKFILE_LOCAL_CAS_RECOVERY.json"
CAS_DIRS = (
    ROOT / "config/supply-chain-license-archive-cas-pass4825",
    ROOT / "config/supply-chain-install-script-archive-cas-pass4825",
    ROOT / "config/p38/dependency-cas",
)
EXPECTED_LOCK_SHA256 = "e228adec08801e454ef5559a20f302110b4896a307c364195716218a376c48bb"
EXPECTED_ROWS = 661
EXPECTED_COVERED = 67
EXPECTED_RECOVERED = 26


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def verify_integrity(payload: dict[str, Any], label: str) -> None:
    expected = payload.get("integritySha256")
    core = dict(payload)
    core.pop("integritySha256", None)
    actual = sha256_bytes(canonical_json(core))
    if expected != actual:
        raise RuntimeError(f"integrity_mismatch:{label}:{expected}:{actual}")


def rows(lock: dict[str, Any]) -> list[dict[str, str]]:
    result = []
    for lock_path, row in lock.get("packages", {}).items():
        if not lock_path or not isinstance(row, dict) or row.get("link"):
            continue
        if isinstance(row.get("resolved"), str) and isinstance(row.get("integrity"), str):
            result.append({"lockPath": lock_path, "integrity": row["integrity"]})
    return sorted(result, key=lambda item: item["lockPath"].encode("utf-8"))


def integrity_of(data: bytes) -> str:
    return "sha512-" + base64.b64encode(hashlib.sha512(data).digest()).decode("ascii")


def main() -> int:
    if sha256_file(LOCK) != EXPECTED_LOCK_SHA256:
        raise RuntimeError("lock_hash_mismatch")
    lock_rows = rows(json.loads(LOCK.read_text(encoding="utf-8")))
    if len(lock_rows) != EXPECTED_ROWS:
        raise RuntimeError(f"lock_denominator_mismatch:{len(lock_rows)}")

    policy = json.loads(POLICY.read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    receipt = json.loads(RECEIPT.read_text(encoding="utf-8"))
    verify_integrity(policy, "policy")
    verify_integrity(manifest, "manifest")
    verify_integrity(receipt, "receipt")

    expected_by_integrity: dict[str, set[str]] = {}
    for row in lock_rows:
        expected_by_integrity.setdefault(row["integrity"], set()).add(row["lockPath"])

    covered: set[str] = set()
    cas_files = 0
    p38_files = 0
    for directory in CAS_DIRS:
        if not directory.is_dir():
            raise RuntimeError(f"cas_directory_missing:{directory.relative_to(ROOT)}")
        for path in sorted(directory.glob("*.tgz"), key=lambda item: item.name.encode("utf-8")):
            if path.is_symlink() or not path.is_file():
                raise RuntimeError(f"cas_non_regular:{path.relative_to(ROOT)}")
            data = path.read_bytes()
            sha256 = sha256_bytes(data)
            if directory.name == "dependency-cas":
                p38_files += 1
                if path.name != f"{sha256}.tgz":
                    raise RuntimeError(f"p38_cas_name_mismatch:{path.name}:{sha256}")
            cas_files += 1
            covered.update(expected_by_integrity.get(integrity_of(data), set()))

    if p38_files != EXPECTED_RECOVERED:
        raise RuntimeError(f"p38_recovered_tarball_count_mismatch:{p38_files}")
    if len(covered) != EXPECTED_COVERED:
        raise RuntimeError(f"combined_coverage_mismatch:{len(covered)}")
    if manifest["combinedCoverage"]["exactCoveredLockPaths"] != EXPECTED_COVERED:
        raise RuntimeError("manifest_coverage_mismatch")
    if manifest["recovered"]["tarballs"] != EXPECTED_RECOVERED:
        raise RuntimeError("manifest_recovered_count_mismatch")
    if receipt["combinedExactCoverage"] != f"{EXPECTED_COVERED}/{EXPECTED_ROWS}":
        raise RuntimeError("receipt_coverage_mismatch")
    if receipt.get("dependencyClosure") is not False or receipt.get("offlineNpmCiExecuted") is not False:
        raise RuntimeError("false_dependency_promotion")

    print(json.dumps({
        "status": "PASS_P38_CURRENT_LOCKFILE_LOCAL_CAS_SOURCE_ONLY_VERIFY",
        "lockRows": EXPECTED_ROWS,
        "exactCoveredLockPaths": len(covered),
        "remaining": EXPECTED_ROWS - len(covered),
        "p38RecoveredTarballs": p38_files,
        "allCasTarballsScanned": cas_files,
        "dependencyClosure": False,
        "releaseState": "NO_GO",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
