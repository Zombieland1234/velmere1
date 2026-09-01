#!/usr/bin/env python3
"""Build a deterministic current-lock lifecycle inventory for P42.

The builder treats dependency archives as untrusted data. It may read tar members,
package manifests and lifecycle script bytes; it never imports or executes package
code and it never authorises lifecycle execution.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import re
import tarfile
from pathlib import Path, PurePosixPath
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
FIXED_GENERATED_AT = "2026-08-14T11:05:00.000Z"
TARGETS = ("windows-x64", "linux-x64-glibc")
LIFECYCLE_NAMES = ("preinstall", "install", "postinstall", "prepare")
CAS_RELATIVE = Path("config/p42/p42-lifecycle-archive-cas")
NETWORK_PATTERNS = (
    rb"https?://", rb"fetch\s*\(", rb"https\.get", rb"http\.get",
    rb"download", rb"curl\b", rb"wget\b", rb"npm\s+install", rb"yarn\s+add",
)
PROCESS_PATTERNS = (rb"child_process", rb"spawn\s*\(", rb"exec\s*\(", rb"execFile\s*\(")


def canonical_sha256(value: Any) -> str:
    return hashlib.sha256(
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def package_name_from_lock_path(lock_path: str) -> str:
    marker = "node_modules/"
    if marker not in lock_path:
        raise ValueError(f"not_a_dependency_lock_path:{lock_path}")
    suffix = lock_path.rsplit(marker, 1)[1]
    if suffix.startswith("@"):
        bits = suffix.split("/")
        if len(bits) < 2:
            raise ValueError(f"invalid_scoped_package_path:{lock_path}")
        return "/".join(bits[:2])
    return suffix.split("/", 1)[0]


def supported_for_target(entry: dict[str, Any], target: str) -> bool:
    target_os = "win32" if target == "windows-x64" else "linux"
    target_cpu = "x64"
    os_rules = entry.get("os") or []
    cpu_rules = entry.get("cpu") or []

    def rules_allow(rules: list[str], value: str) -> bool:
        if not rules:
            return True
        positives = [item for item in rules if not item.startswith("!")]
        negatives = {item[1:] for item in rules if item.startswith("!")}
        if value in negatives:
            return False
        return not positives or value in positives

    return rules_allow(os_rules, target_os) and rules_allow(cpu_rules, target_cpu)


def verify_sri_bytes(value: bytes, integrity: str) -> tuple[str, bool]:
    tokens = [token for token in str(integrity).split() if "-" in token]
    priority = ("sha512", "sha384", "sha256", "sha1")
    for algorithm in priority:
        token = next((candidate for candidate in tokens if candidate.startswith(f"{algorithm}-")), None)
        if token is None:
            continue
        expected = base64.b64decode(token.split("-", 1)[1], validate=True)
        actual = hashlib.new(algorithm, value).digest()
        return token, actual == expected
    raise ValueError(f"unsupported_integrity:{integrity}")


def safe_member_name(name: str) -> str:
    pure = PurePosixPath(name)
    if pure.is_absolute() or ".." in pure.parts:
        raise ValueError(f"unsafe_tar_member:{name}")
    return pure.as_posix()


def read_tar_member(archive: tarfile.TarFile, name: str) -> bytes | None:
    try:
        member = archive.getmember(name)
    except KeyError:
        return None
    safe_member_name(member.name)
    if not member.isfile() or member.size > 8 * 1024 * 1024:
        return None
    stream = archive.extractfile(member)
    return None if stream is None else stream.read()


def referenced_script_paths(command: str) -> list[str]:
    # Keep this deliberately narrow: only local JS/CJS/MJS scripts named in the
    # lifecycle command are inspected. Shell expansion or package execution is
    # never attempted.
    paths: list[str] = []
    for token in re.findall(r"(?:^|\s)([^\s'\";&|]+\.(?:c?js|mjs))(?:\s|$)", command):
        clean = token.replace("\\", "/").lstrip("./")
        if clean and clean not in paths:
            paths.append(clean)
    return paths


def inspect_archive(path: Path, expected_name: str, expected_version: str) -> dict[str, Any]:
    archive_bytes = path.read_bytes()
    with tarfile.open(path, mode="r:gz") as archive:
        # Validate every member name before reading selected members.
        for member in archive.getmembers():
            safe_member_name(member.name)
        manifest_bytes = read_tar_member(archive, "package/package.json")
        if manifest_bytes is None:
            raise ValueError("archive_package_json_missing")
        manifest = json.loads(manifest_bytes.decode("utf-8"))
        scripts = {
            name: str(manifest.get("scripts", {}).get(name))
            for name in LIFECYCLE_NAMES
            if manifest.get("scripts", {}).get(name)
        }
        refs: list[dict[str, Any]] = []
        aggregate_script_bytes = bytearray()
        for lifecycle_name, command in scripts.items():
            for relative in referenced_script_paths(command):
                member_path = f"package/{relative}"
                value = read_tar_member(archive, member_path)
                row = {
                    "lifecycle": lifecycle_name,
                    "path": relative,
                    "present": value is not None,
                    "byteLength": 0 if value is None else len(value),
                    "sha256": None if value is None else sha256_bytes(value),
                }
                refs.append(row)
                if value is not None:
                    aggregate_script_bytes.extend(value)
        refs.sort(key=lambda row: (row["lifecycle"], row["path"]))
        script_blob = bytes(aggregate_script_bytes)
        network_indicators = sorted({
            pattern.decode("ascii", errors="replace")
            for pattern in NETWORK_PATTERNS
            if re.search(pattern, script_blob, flags=re.I)
        })
        process_indicators = sorted({
            pattern.decode("ascii", errors="replace")
            for pattern in PROCESS_PATTERNS
            if re.search(pattern, script_blob, flags=re.I)
        })
        license_member = next(
            (
                member.name for member in archive.getmembers()
                if member.isfile()
                and PurePosixPath(member.name).parent == PurePosixPath("package")
                and PurePosixPath(member.name).name.lower().startswith(("license", "licence", "copying"))
            ),
            None,
        )
        license_bytes = read_tar_member(archive, license_member) if license_member else None

    return {
        "archiveSha256": sha256_bytes(archive_bytes),
        "archiveByteLength": len(archive_bytes),
        "packageJsonPath": "package/package.json",
        "packageJsonSha256": sha256_bytes(manifest_bytes),
        "manifestName": manifest.get("name"),
        "manifestVersion": manifest.get("version"),
        "manifestLicense": manifest.get("license"),
        "manifestMatchesLockTuple": manifest.get("name") == expected_name and manifest.get("version") == expected_version,
        "lifecycleScripts": scripts,
        "referencedScriptFiles": refs,
        "networkCapableStaticIndicators": network_indicators,
        "processExecutionStaticIndicators": process_indicators,
        "buildFromSourceEnvironmentGatePresent": b"npm_config_build_from_source" in script_blob,
        "licenseFilePath": license_member,
        "licenseFileSha256": None if license_bytes is None else sha256_bytes(license_bytes),
        "licenseFileByteLength": 0 if license_bytes is None else len(license_bytes),
        "archiveExecutedDuringInspection": False,
    }


def binding(path: Path, root: Path) -> dict[str, Any]:
    return {
        "path": path.relative_to(root).as_posix(),
        "sha256": sha256_file(path),
        "byteLength": path.stat().st_size,
    }


def platform_packages(name: str, version: str) -> dict[str, str | None]:
    if name == "@parcel/watcher":
        return {
            "windows-x64": f"node_modules/@parcel/watcher-win32-x64@{version}",
            "linux-x64-glibc": f"node_modules/@parcel/watcher-linux-x64-glibc@{version}",
        }
    if name == "@swc/core":
        return {
            "windows-x64": f"node_modules/@swc/core-win32-x64-msvc@{version}",
            "linux-x64-glibc": f"node_modules/@swc/core-linux-x64-gnu@{version}",
        }
    if name == "esbuild":
        return {
            "windows-x64": f"node_modules/@esbuild/win32-x64@{version}",
            "linux-x64-glibc": f"node_modules/@esbuild/linux-x64@{version}",
        }
    return {target: None for target in TARGETS}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--output", type=Path, default=Path("config/p42/p42-current-lock-lifecycle-inventory.json"))
    args = parser.parse_args()
    root = args.root.resolve()
    output = args.output if args.output.is_absolute() else root / args.output
    output.parent.mkdir(parents=True, exist_ok=True)

    package_path = root / "package.json"
    lock_path = root / "package-lock.json"
    package = json.loads(package_path.read_text(encoding="utf-8"))
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    lock_packages = lock.get("packages", {})

    archive_by_tuple: dict[tuple[str, str], tuple[Path, dict[str, Any], str]] = {}
    cas_dir = root / CAS_RELATIVE
    if cas_dir.is_dir():
        for archive_path in sorted(cas_dir.glob("*.tgz"), key=lambda p: p.name.encode("utf-8")):
            with tarfile.open(archive_path, "r:gz") as archive:
                manifest_bytes = read_tar_member(archive, "package/package.json")
                if manifest_bytes is None:
                    raise ValueError(f"archive_package_json_missing:{archive_path}")
                manifest = json.loads(manifest_bytes.decode("utf-8"))
            name = str(manifest.get("name"))
            version = str(manifest.get("version"))
            inspected = inspect_archive(archive_path, name, version)
            archive_by_tuple[(name, version)] = (archive_path, inspected, sha256_file(archive_path))

    rows: list[dict[str, Any]] = []
    for lock_path_name, entry in lock_packages.items():
        if not lock_path_name or not isinstance(entry, dict) or entry.get("hasInstallScript") is not True:
            continue
        name = package_name_from_lock_path(lock_path_name)
        version = str(entry.get("version"))
        target_applicability = {target: supported_for_target(entry, target) for target in TARGETS}
        archive_info = archive_by_tuple.get((name, version))
        archive_evidence: dict[str, Any] | None = None
        if archive_info is not None:
            archive_path, inspected, archive_sha = archive_info
            sri_token, sri_ok = verify_sri_bytes(archive_path.read_bytes(), str(entry.get("integrity")))
            archive_evidence = {
                "path": archive_path.relative_to(root).as_posix(),
                "sha256": archive_sha,
                "byteLength": archive_path.stat().st_size,
                "integrityTokenVerified": sri_token,
                "sriVerified": sri_ok,
                **inspected,
            }
        target_platform_packages: dict[str, Any] = {}
        for target, descriptor in platform_packages(name, version).items():
            if descriptor is None:
                target_platform_packages[target] = {"required": False, "lockPath": None, "presentInLock": True, "versionMatches": True}
                continue
            platform_lock_path, required_version = descriptor.rsplit("@", 1)
            platform_entry = lock_packages.get(platform_lock_path)
            target_platform_packages[target] = {
                "required": True,
                "lockPath": platform_lock_path,
                "presentInLock": isinstance(platform_entry, dict),
                "expectedVersion": required_version,
                "observedVersion": None if not isinstance(platform_entry, dict) else platform_entry.get("version"),
                "versionMatches": isinstance(platform_entry, dict) and platform_entry.get("version") == required_version,
            }

        row = {
            "packagePath": lock_path_name,
            "name": name,
            "version": version,
            "resolved": entry.get("resolved"),
            "integrity": entry.get("integrity"),
            "licenseFromLock": entry.get("license"),
            "optional": bool(entry.get("optional", False)),
            "dev": bool(entry.get("dev", False)),
            "osRules": entry.get("os", []),
            "cpuRules": entry.get("cpu", []),
            "hasInstallScript": True,
            "targetApplicability": target_applicability,
            "applicableToAnyRequiredTarget": any(target_applicability.values()),
            "targetPlatformPackages": target_platform_packages,
            "exactCurrentArchiveEvidence": archive_evidence is not None and archive_evidence.get("sriVerified") is True and archive_evidence.get("manifestMatchesLockTuple") is True,
            "archiveEvidence": archive_evidence,
            "executionApproved": False,
            "executionState": "QUARANTINED_NOT_AUTHORIZED",
        }
        rows.append(row)
    rows.sort(key=lambda row: row["packagePath"].encode("utf-8"))

    inventory: dict[str, Any] = {
        "schemaVersion": "velmere.p42.current-lock-lifecycle-inventory.v1",
        "revision": "P42_V16_CURRENT_LOCK_LIFECYCLE_QUARANTINE_ACTION_PINNING",
        "generatedAt": FIXED_GENERATED_AT,
        "parentRoot": "R44P46",
        "checkpoint": "P42",
        "mode": "STATIC_LOCK_AND_ARCHIVE_INSPECTION_NO_EXECUTION",
        "requiredTargets": list(TARGETS),
        "bindings": {
            "packageJson": binding(package_path, root),
            "packageLock": binding(lock_path, root),
        },
        "packageJsonAllowScriptsObserved": package.get("allowScripts", {}),
        "rootLifecycle": {
            "preinstall": package.get("scripts", {}).get("preinstall"),
            "ownedByVelmere": package.get("scripts", {}).get("preinstall") == "node scripts/verify-runtime-contract.mjs",
            "executionApproved": package.get("scripts", {}).get("preinstall") == "node scripts/verify-runtime-contract.mjs",
        },
        "denominator": {
            "dependencyRowsTotal": len(rows),
            "targetApplicableDependencyRows": sum(1 for row in rows if row["applicableToAnyRequiredTarget"]),
            "targetApplicableDependencyRowsWithExactCurrentArchiveEvidence": sum(1 for row in rows if row["applicableToAnyRequiredTarget"] and row["exactCurrentArchiveEvidence"]),
            "targetApplicableDependencyExecutionApproved": sum(1 for row in rows if row["applicableToAnyRequiredTarget"] and row["executionApproved"]),
        },
        "dependencyLifecycleRows": rows,
        "creditBoundary": {
            "archiveBytesInspected": True,
            "archiveCodeExecuted": False,
            "dependencyLifecycleExecutionAuthorized": False,
            "npmCiWithoutIgnoreScriptsAuthorized": False,
            "semanticOrBuildClosure": False,
        },
    }
    inventory["integritySha256"] = canonical_sha256(inventory)
    output.write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    try:
        output_label = output.relative_to(root).as_posix()
    except ValueError:
        output_label = str(output)
    print(json.dumps({"status": "PASS", "output": output_label, "denominator": inventory["denominator"]}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
