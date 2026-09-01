#!/usr/bin/env python3
"""Verify exact P39 Node artifacts and attempt fail-closed offline dependency closure.

This is deliberately bounded. It records exact Linux execution, exact downloaded
Linux/Windows artifact bytes, and the first current-lock cache miss from a network-
forbidden npm ci. It never converts artifact acquisition into Windows execution or
a failed install into build/Browser credit.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from typing import Any
import zipfile

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT = ROOT / "artifacts/closure/p39/P39_EXACT_TOOLCHAIN_AND_DEPENDENCY_BASELINE.json"
LOG_DIR = ROOT / "artifacts/closure/p39/dependency-baseline"
REVISION = "P39_V16_AUTHORITY_TOPOLOGY_AND_EXACT_NODE24_LINUX_RECONCILIATION"
GENERATED_AT = "2026-08-14T05:45:00.000Z"
EXPECTED_NODE = "24.18.0"
EXPECTED_NPM = "11.16.0"
EXPECTED_LOCK_SHA = "e228adec08801e454ef5559a20f302110b4896a307c364195716218a376c48bb"
EXPECTED_LINUX_WORKFLOW_ZIP_SHA = "3510396fae3f63153683c7c54de02c17313b853ff7175440fa507f413323a8b7"
EXPECTED_LINUX_INNER_TAR_SHA = "efced36c041a7a43e8b4a4b35cb929bef7747c1c7442e693901a0b4f06467e1d"
EXPECTED_LINUX_INNER_TAR_BYTES = 57653661
EXPECTED_WINDOWS_WORKFLOW_ZIP_SHA = "8eec21c0e6328694ab67435692c04c0825aa51b73d013a01b966341b6ae477ab"
EXPECTED_WINDOWS_MEMBER = "node-24.18.0-win32-x64.7z"
EXPECTED_WINDOWS_MEMBER_SHA = "1363d9aabb7e8b59b5109b874d9109ec6ca3252cc794874c58decb8b182aee10"
EXPECTED_WINDOWS_MEMBER_BYTES = 24473732


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def stable(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: stable(value[key]) for key in sorted(value)}
    if isinstance(value, list):
        return [stable(item) for item in value]
    return value


def integrity(value: dict[str, Any]) -> str:
    return sha256_bytes(json.dumps(stable(value), ensure_ascii=False, separators=(",", ":")).encode("utf-8"))


def binding(path: Path, *, outside_source: bool = False) -> dict[str, Any]:
    return {
        "pathOutsideSourceOnly" if outside_source else "path": str(path) if outside_source else path.relative_to(ROOT).as_posix(),
        "byteLength": path.stat().st_size,
        "sha256": sha256_file(path),
    }


def npm_remote_rows() -> tuple[int, list[str]]:
    lock = json.loads((ROOT / "package-lock.json").read_text(encoding="utf-8"))
    rows: list[str] = []
    for package_path, value in lock.get("packages", {}).items():
        if not package_path or not isinstance(value, dict):
            continue
        resolved = value.get("resolved")
        if isinstance(resolved, str) and resolved.startswith(("https://", "http://")):
            rows.append(resolved)
    return len(rows), sorted(set(rows))


def inspect_windows_artifact(path: Path) -> dict[str, Any]:
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        if names != [EXPECTED_WINDOWS_MEMBER]:
            raise RuntimeError(f"windows_workflow_zip_member_set_drift:{names}")
        info = archive.getinfo(EXPECTED_WINDOWS_MEMBER)
        digest = hashlib.sha256()
        with archive.open(info) as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(chunk)
        member_sha = digest.hexdigest()
        if info.file_size != EXPECTED_WINDOWS_MEMBER_BYTES or member_sha != EXPECTED_WINDOWS_MEMBER_SHA:
            raise RuntimeError(f"windows_inner_artifact_identity_mismatch:{info.file_size}:{member_sha}")
        return {
            "workflowArtifactZip": binding(path, outside_source=True),
            "expectedWorkflowZipSha256": EXPECTED_WINDOWS_WORKFLOW_ZIP_SHA,
            "workflowZipIntegrityPass": sha256_file(path) == EXPECTED_WINDOWS_WORKFLOW_ZIP_SHA,
            "member": {
                "name": EXPECTED_WINDOWS_MEMBER,
                "byteLength": info.file_size,
                "sha256": member_sha,
                "expectedSha256FromOfficialReleaseAsset": EXPECTED_WINDOWS_MEMBER_SHA,
                "integrityPass": True,
            },
            "acquired": True,
            "executed": False,
            "executionBlocker": "NO_WINDOWS_RUNTIME_OR_WINDOWS_CI_EXECUTION_AVAILABLE_IN_CURRENT_ENVIRONMENT",
        }


def parse_npm_failure(stdout: bytes, stderr: bytes) -> dict[str, Any]:
    text = (stdout + b"\n" + stderr).decode("utf-8", errors="replace")
    urls = re.findall(r"https?://[^\s'\"`]+", text)
    cleaned = [value.rstrip(".,;:)") for value in urls]
    missing = next((value for value in cleaned if "registry.npmjs.org" in value and value.endswith((".tgz", ".tar.gz"))), None)
    error_code = None
    for candidate in ("ENOTCACHED", "EAI_AGAIN", "ENETUNREACH", "ETIMEDOUT", "ECONNREFUSED"):
        if candidate in text:
            error_code = candidate
            break
    return {
        "errorCode": error_code,
        "firstMissingOrFailedUrl": missing,
        "networkForbidden": True,
        "exactFailureClass": "OFFLINE_CACHE_MISS" if error_code == "ENOTCACHED" else "NETWORK_OR_CACHE_FAILURE",
    }


def run_offline_npm_ci(node: Path, npm: Path, seed_cache: Path | None) -> dict[str, Any]:
    canonical_node_modules_before = (ROOT / "node_modules").exists()
    package_before = sha256_file(ROOT / "package.json")
    lock_before = sha256_file(ROOT / "package-lock.json")
    with tempfile.TemporaryDirectory(prefix="velmere-p39-offline-npm-ci-") as tmp:
        temp_root = Path(tmp)
        clone = temp_root / "source"
        subprocess.run(["cp", "-al", str(ROOT), str(clone)], check=True, timeout=180)
        cache = temp_root / "npm-cache"
        if seed_cache and seed_cache.is_dir():
            shutil.copytree(seed_cache, cache, symlinks=False)
            seed_binding = {
                "pathOutsideSourceOnly": str(seed_cache),
                "entryCount": sum(1 for _ in seed_cache.rglob("*")),
                "bytes": sum(p.stat().st_size for p in seed_cache.rglob("*") if p.is_file()),
                "copiedIntoIsolatedCache": True,
            }
        else:
            cache.mkdir()
            seed_binding = {"pathOutsideSourceOnly": None, "entryCount": 0, "bytes": 0, "copiedIntoIsolatedCache": False}
        home = temp_root / "home"
        work_tmp = temp_root / "tmp"
        home.mkdir()
        work_tmp.mkdir()
        env = {
            "PATH": f"{node.parent}:/usr/bin:/bin",
            "HOME": str(home),
            "USERPROFILE": str(home),
            "TMPDIR": str(work_tmp),
            "TMP": str(work_tmp),
            "TEMP": str(work_tmp),
            "LANG": "C.UTF-8",
            "LC_ALL": "C.UTF-8",
            "CI": "1",
            "NODE_ENV": "production",
            "npm_config_offline": "true",
            "npm_config_audit": "false",
            "npm_config_fund": "false",
            "npm_config_update_notifier": "false",
            "npm_config_ignore_scripts": "true",
            "npm_config_cache": str(cache),
            "npm_config_loglevel": "verbose",
            "npm_config_fetch_retries": "0",
        }
        command = [
            str(npm), "ci", "--offline", "--ignore-scripts", "--audit=false", "--fund=false",
            "--cache", str(cache), "--loglevel=verbose",
        ]
        completed = subprocess.run(
            command,
            cwd=clone,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=300,
            check=False,
        )
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        stdout_path = LOG_DIR / "npm-ci-offline.stdout.log"
        stderr_path = LOG_DIR / "npm-ci-offline.stderr.log"
        stdout_path.write_bytes(completed.stdout)
        stderr_path.write_bytes(completed.stderr)
        failure = parse_npm_failure(completed.stdout, completed.stderr)
        clone_node_modules = clone / "node_modules"
        node_modules_retained = clone_node_modules.exists()
        if clone_node_modules.exists():
            shutil.rmtree(clone_node_modules, ignore_errors=True)
        return {
            "command": ["npm", *command[1:]],
            "runtime": {
                "node": subprocess.check_output([str(node), "--version"], env=env, text=True).strip().removeprefix("v"),
                "npm": subprocess.check_output([str(npm), "--version"], env=env, text=True).strip(),
                "platform": "linux-x64",
            },
            "isolatedHardlinkWorktree": True,
            "isolatedHomeTempAndCache": True,
            "parentSecretsInherited": False,
            "seedCache": seed_binding,
            "exitCode": completed.returncode,
            "stdout": binding(stdout_path),
            "stderr": binding(stderr_path),
            "stdoutUtf8Tail": completed.stdout.decode("utf-8", errors="replace")[-1600:],
            "stderrUtf8Tail": completed.stderr.decode("utf-8", errors="replace")[-2400:],
            "parsedFailure": failure,
            "npmCiCompleted": completed.returncode == 0,
            "dependencyClosure": completed.returncode == 0,
            "nodeModulesCreatedInIsolatedClone": node_modules_retained,
            "nodeModulesRetained": False,
            "canonicalNodeModulesBefore": canonical_node_modules_before,
            "canonicalNodeModulesAfter": (ROOT / "node_modules").exists(),
            "canonicalPackageJsonUnchanged": package_before == sha256_file(ROOT / "package.json"),
            "canonicalPackageLockUnchanged": lock_before == sha256_file(ROOT / "package-lock.json"),
        }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--node", required=True)
    parser.add_argument("--npm", required=True)
    parser.add_argument("--linux-workflow-zip", required=True)
    parser.add_argument("--linux-inner-tar", required=True)
    parser.add_argument("--windows-workflow-zip", required=True)
    parser.add_argument("--seed-cache", default="/root/.npm")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    args = parser.parse_args()

    node = Path(args.node).resolve()
    npm = Path(args.npm).resolve()
    linux_zip = Path(args.linux_workflow_zip).resolve()
    linux_tar = Path(args.linux_inner_tar).resolve()
    windows_zip = Path(args.windows_workflow_zip).resolve()
    seed_cache = Path(args.seed_cache).resolve() if args.seed_cache else None
    output = Path(args.output).resolve()
    for path in (node, npm, linux_zip, linux_tar, windows_zip, ROOT / "package-lock.json"):
        if not path.is_file():
            raise RuntimeError(f"required_input_missing:{path}")

    node_version = subprocess.check_output([str(node), "--version"], text=True).strip().removeprefix("v")
    npm_version = subprocess.check_output([str(npm), "--version"], env={"PATH": f"{node.parent}:/usr/bin:/bin"}, text=True).strip()
    if node_version != EXPECTED_NODE or npm_version != EXPECTED_NPM:
        raise RuntimeError(f"exact_runtime_mismatch:{node_version}:{npm_version}")
    if sha256_file(ROOT / "package-lock.json") != EXPECTED_LOCK_SHA:
        raise RuntimeError("current_package_lock_hash_drift")
    if sha256_file(linux_zip) != EXPECTED_LINUX_WORKFLOW_ZIP_SHA:
        raise RuntimeError("linux_workflow_zip_hash_mismatch")
    if linux_tar.stat().st_size != EXPECTED_LINUX_INNER_TAR_BYTES or sha256_file(linux_tar) != EXPECTED_LINUX_INNER_TAR_SHA:
        raise RuntimeError("linux_inner_tar_hash_mismatch")
    if sha256_file(windows_zip) != EXPECTED_WINDOWS_WORKFLOW_ZIP_SHA:
        raise RuntimeError("windows_workflow_zip_hash_mismatch")

    remote_count, remote_urls = npm_remote_rows()
    install = run_offline_npm_ci(node, npm, seed_cache if seed_cache and seed_cache.exists() else None)
    windows = inspect_windows_artifact(windows_zip)

    payload: dict[str, Any] = {
        "schemaVersion": "velmere.p39.exact-toolchain-and-dependency-baseline.v1",
        "revision": REVISION,
        "generatedAt": GENERATED_AT,
        "state": "CURRENT_EXACT_TOOLCHAIN_BASELINE_DEPENDENCY_BLOCKED",
        "releaseState": "NO_GO",
        "parentRoot": "R44P46",
        "requiredRuntime": {"node": EXPECTED_NODE, "npm": EXPECTED_NPM, "finalPlatform": "Windows"},
        "executedLinuxRuntime": {
            "node": {**binding(node, outside_source=True), "observedVersion": node_version, "exactPass": True},
            "npm": {**binding(npm, outside_source=True), "observedVersion": npm_version, "exactPass": True},
            "workflowArtifactZip": {**binding(linux_zip, outside_source=True), "expectedSha256": EXPECTED_LINUX_WORKFLOW_ZIP_SHA, "integrityPass": True},
            "innerTar": {**binding(linux_tar, outside_source=True), "expectedSha256": EXPECTED_LINUX_INNER_TAR_SHA, "integrityPass": True},
            "executed": True,
        },
        "acquiredWindowsRuntimeArtifact": windows,
        "currentLock": {
            "path": "package-lock.json",
            "sha256": EXPECTED_LOCK_SHA,
            "lockfileVersion": 3,
            "remotePackageRows": remote_count,
            "uniqueRemoteUrls": len(remote_urls),
        },
        "offlineNpmCiAttempt": install,
        "gates": {
            "exactNode24180Linux": True,
            "exactNpm11160Linux": True,
            "exactWindowsArtifactAcquired": True,
            "exactWindowsExecuted": False,
            "dependencyClosure": install["dependencyClosure"],
            "typecheckEligible": install["dependencyClosure"],
            "lintEligible": install["dependencyClosure"],
            "webpackBuildEligible": install["dependencyClosure"],
            "turbopackBuildEligible": install["dependencyClosure"],
            "browserEligible": install["dependencyClosure"],
            "goInternal": False,
        },
        "nextFreeFirstAction": (
            "Recover the exact missing current-lock tarballs into a hash/SRI-verified local cache without bypassing registry or license rules, then rerun exact npm ci on the required Windows environment before typecheck, lint, dual build or Browser credit."
        ),
        "truthBoundary": (
            "P39 acquired and verified exact Node 24.18.0 Linux and Windows toolcache artifacts and executed exact Node/npm on Linux. The Windows bytes were not executed. The network-forbidden current-lock npm ci did not complete, so dependency closure, typecheck, lint, Webpack/Turbopack, Browser, PDF and release credit remain false."
        ),
    }
    payload["integritySha256"] = integrity(payload)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": "PASS_P39_EXACT_TOOLCHAIN_BASELINE_DEPENDENCY_BLOCKED",
        "node": node_version,
        "npm": npm_version,
        "windowsArtifact": "ACQUIRED_NOT_EXECUTED",
        "remoteRows": remote_count,
        "npmCiExit": install["exitCode"],
        "npmCiError": install["parsedFailure"]["errorCode"],
        "missingUrl": install["parsedFailure"]["firstMissingOrFailedUrl"],
        "dependencyClosure": install["dependencyClosure"],
        "receiptSha256": sha256_file(output),
        "releaseState": "NO_GO",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
