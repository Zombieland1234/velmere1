from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import platform
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

EXPECTED_SOURCE_FILES = 6666
EXPECTED_PAYLOAD_BYTES = 196_479_563
EXPECTED_PATH_SET = "38eba6c9b7f1761d531bed806cc783d28b540165f199bce385ba6d38842238fa"
EXPECTED_SOURCE_AGGREGATE = "ae505b6f94813767752e344c76c249099fb3e30283b64a3647420eaafbbd8478"
EXPECTED_NODE = "v24.18.0"
EXPECTED_NPM = "11.16.0"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def canonical_sha256(value: object) -> str:
    return hashlib.sha256(
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()


def hash_integrities(path: Path) -> set[str]:
    data = path.read_bytes()
    result: set[str] = set()
    for algorithm in ("sha512", "sha384", "sha256", "sha1"):
        digest = hashlib.new(algorithm, data).digest()
        result.add(f"{algorithm}-{base64.b64encode(digest).decode('ascii')}")
    return result


def run_command(
    name: str,
    command: list[str],
    cwd: Path,
    logs: Path,
    env: dict[str, str],
    timeout: int,
) -> dict[str, Any]:
    log_path = logs / f"{name}.log"
    started = time.time()
    try:
        process = subprocess.run(
            command,
            cwd=cwd,
            env=env,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=timeout,
            check=False,
            encoding="utf-8",
            errors="replace",
        )
        output = process.stdout or ""
        log_path.write_text(output, encoding="utf-8")
        return {
            "name": name,
            "command": command,
            "exitCode": process.returncode,
            "pass": process.returncode == 0,
            "durationSeconds": round(time.time() - started, 3),
            "log": str(log_path),
            "logSha256": sha256_file(log_path),
            "tail": output[-6000:],
        }
    except subprocess.TimeoutExpired as exception:
        output = exception.stdout if isinstance(exception.stdout, str) else ""
        output += "\nTIMEOUT\n"
        log_path.write_text(output, encoding="utf-8")
        return {
            "name": name,
            "command": command,
            "exitCode": None,
            "pass": False,
            "timeout": True,
            "durationSeconds": round(time.time() - started, 3),
            "log": str(log_path),
            "logSha256": sha256_file(log_path),
            "tail": output[-6000:],
        }
    except Exception as exception:  # fail closed and still emit a receipt
        output = f"{type(exception).__name__}: {exception}\n"
        log_path.write_text(output, encoding="utf-8")
        return {
            "name": name,
            "command": command,
            "exitCode": None,
            "pass": False,
            "exception": output.strip(),
            "durationSeconds": round(time.time() - started, 3),
            "log": str(log_path),
            "logSha256": sha256_file(log_path),
            "tail": output,
        }


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def locate_project(search_root: Path, coverage: dict[str, Any]) -> Path:
    reconstruction = coverage.get("reconstruction", {}) if isinstance(coverage, dict) else {}
    candidates: list[Path] = []
    for key in ("outputRoot", "outputDir", "reconstructedRoot", "reconstructedSourceRoot", "root"):
        value = reconstruction.get(key)
        if value:
            candidate = Path(value)
            if not candidate.is_absolute():
                candidate = (Path.cwd() / candidate).resolve()
            candidates.append(candidate)
    candidates.extend(
        package.parent
        for package in search_root.rglob("package.json")
        if (package.parent / "package-lock.json").is_file()
    )
    valid = sorted(
        {
            candidate.resolve()
            for candidate in candidates
            if (candidate / "package.json").is_file() and (candidate / "package-lock.json").is_file()
        },
        key=lambda candidate: (len(candidate.parts), len(str(candidate))),
    )
    if not valid:
        raise RuntimeError("Reconstructed project root with package.json and package-lock.json was not found")
    reconstruction_root = reconstruction.get("root")
    if reconstruction_root:
        expected = Path(reconstruction_root).resolve()
        if expected in valid:
            return expected
    return valid[0]


def lock_integrities(lock: dict[str, Any]) -> set[str]:
    found: set[str] = set()
    packages = lock.get("packages")
    if isinstance(packages, dict):
        for row in packages.values():
            if isinstance(row, dict) and isinstance(row.get("integrity"), str):
                found.update(part for part in row["integrity"].split() if "-" in part)
    dependencies = lock.get("dependencies")
    if isinstance(dependencies, dict):
        stack = list(dependencies.values())
        while stack:
            row = stack.pop()
            if not isinstance(row, dict):
                continue
            if isinstance(row.get("integrity"), str):
                found.update(part for part in row["integrity"].split() if "-" in part)
            nested = row.get("dependencies")
            if isinstance(nested, dict):
                stack.extend(nested.values())
    return found


def discover_tarballs(root: Path) -> list[Path]:
    excluded = {"node_modules", ".next", ".git"}
    return sorted(
        {
            path
            for path in root.rglob("*.tgz")
            if not any(part in excluded or part.startswith(".next-") for part in path.parts)
        }
    )


def tree_fingerprint(root: Path) -> dict[str, Any]:
    if not root.exists():
        return {"exists": False, "files": 0, "bytes": 0, "sha256": None}
    rows: list[tuple[str, str, int]] = []
    for path in sorted(candidate for candidate in root.rglob("*") if candidate.is_file()):
        relative = path.relative_to(root).as_posix()
        rows.append((relative, sha256_file(path), path.stat().st_size))
    digest = hashlib.sha256()
    for relative, file_sha, size in rows:
        digest.update(relative.encode("utf-8"))
        digest.update(b"\0")
        digest.update(file_sha.encode("ascii"))
        digest.update(b"\0")
        digest.update(str(size).encode("ascii"))
        digest.update(b"\n")
    return {
        "exists": True,
        "files": len(rows),
        "bytes": sum(size for _, _, size in rows),
        "sha256": digest.hexdigest(),
    }


def clean_environment() -> dict[str, str]:
    environment = os.environ.copy()
    for key in (
        "NODE_ENV",
        "NPM_CONFIG_PRODUCTION",
        "npm_config_production",
        "NPM_CONFIG_OMIT",
        "npm_config_omit",
    ):
        environment.pop(key, None)
    environment.update({"CI": "1", "NEXT_TELEMETRY_DISABLED": "1"})
    return environment


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--coverage-receipt", required=True)
    parser.add_argument("--output-dir", required=True)
    arguments = parser.parse_args()

    output = Path(arguments.output_dir).resolve()
    output.mkdir(parents=True, exist_ok=True)
    logs = output / "logs"
    logs.mkdir(parents=True, exist_ok=True)
    coverage_path = Path(arguments.coverage_receipt).resolve()
    coverage = load_json(coverage_path)
    receipt_path = output / "P43_EXACT_WINDOWS_CURRENT_SOURCE_SEMANTIC_DUAL_BUILD_RECEIPT.json"

    receipt: dict[str, Any] = {
        "schemaVersion": "velmere.p44.exact-windows-current-source-semantic-dual-build.v2",
        "status": "IN_PROGRESS",
        "creditClass": "CURRENT_SOURCE_EXACT_WINDOWS_INTERNAL",
        "sourceIdentityExpected": {
            "fileCount": EXPECTED_SOURCE_FILES,
            "payloadBytes": EXPECTED_PAYLOAD_BYTES,
            "pathSetSha256": EXPECTED_PATH_SET,
            "sourceAggregateSha256": EXPECTED_SOURCE_AGGREGATE,
        },
        "coverageReceipt": {"path": str(coverage_path), "sha256": sha256_file(coverage_path)},
        "platform": {
            "system": platform.system(),
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine(),
            "python": sys.version,
        },
        "steps": [],
        "hardGates": {
            "exactWindows": False,
            "exactNode": False,
            "exactNpm": False,
            "exactSourceIdentity": False,
            "lifecycleQuarantine": False,
            "rootRuntimeContract": False,
            "dependencyClosure": False,
            "trustedNativeGuardExpectedBlock": False,
            "nativePlatformAvailability": False,
            "typecheck": False,
            "lint": False,
            "webpackBuild": False,
            "turbopackBuild": False,
        },
        "lifecyclePolicy": {
            "npmCiIgnoreScripts": True,
            "dependencyLifecycleCodeExecuted": False,
            "withheldUntilSeparatelyAdjudicated": True,
        },
    }

    try:
        reconstruction = coverage.get("reconstruction", {})
        coverage_state = coverage.get("coverage", {})
        exact_identity = bool(
            coverage.get("status") == "PASS"
            and coverage_state.get("complete")
            and reconstruction.get("exactIdentityPass")
            and reconstruction.get("fileCount") == EXPECTED_SOURCE_FILES
            and reconstruction.get("payloadBytes") == EXPECTED_PAYLOAD_BYTES
            and reconstruction.get("pathSetSha256") == EXPECTED_PATH_SET
            and reconstruction.get("sourceAggregateSha256") == EXPECTED_SOURCE_AGGREGATE
        )
        receipt["hardGates"]["exactSourceIdentity"] = exact_identity
        if not exact_identity:
            raise RuntimeError("Coverage/reconstruction receipt does not prove exact P43 source identity")

        project = locate_project(output.parent, coverage)
        receipt["projectRoot"] = str(project)
        receipt["projectFiles"] = {
            "packageJsonSha256": sha256_file(project / "package.json"),
            "packageLockSha256": sha256_file(project / "package-lock.json"),
        }

        base_environment = clean_environment()
        build_environment = dict(base_environment)
        build_environment["NODE_ENV"] = "production"

        node_version = subprocess.check_output(["node", "--version"], text=True).strip()
        npm_version = subprocess.check_output(["npm", "--version"], text=True).strip()
        receipt["toolchain"] = {"node": node_version, "npm": npm_version}
        receipt["hardGates"]["exactWindows"] = platform.system().lower() == "windows"
        receipt["hardGates"]["exactNode"] = node_version == EXPECTED_NODE
        receipt["hardGates"]["exactNpm"] = npm_version == EXPECTED_NPM
        if not all(receipt["hardGates"][key] for key in ("exactWindows", "exactNode", "exactNpm")):
            raise RuntimeError(f"Exact Windows/Node/npm mismatch: {receipt['toolchain']} on {platform.system()}")

        lifecycle_output = output / "P43_WINDOWS_LIFECYCLE_QUARANTINE.json"
        lifecycle = run_command(
            "lifecycle-quarantine",
            [
                sys.executable,
                "scripts/pass42/verify-p42-lifecycle-quarantine.py",
                "--root",
                str(project),
                "--output",
                str(lifecycle_output),
                "--require-windows",
            ],
            project,
            logs,
            base_environment,
            300,
        )
        receipt["steps"].append(lifecycle)
        receipt["hardGates"]["lifecycleQuarantine"] = lifecycle["pass"]
        if not lifecycle["pass"]:
            raise RuntimeError("Lifecycle quarantine verification failed")

        runtime_contract = run_command(
            "root-runtime-contract",
            ["node", "scripts/verify-runtime-contract.mjs"],
            project,
            logs,
            base_environment,
            300,
        )
        receipt["steps"].append(runtime_contract)
        receipt["hardGates"]["rootRuntimeContract"] = runtime_contract["pass"]
        if not runtime_contract["pass"]:
            raise RuntimeError("Root runtime contract failed")

        lock = load_json(project / "package-lock.json")
        required_integrities = lock_integrities(lock)
        tarballs = discover_tarballs(project)
        integrity_to_tarball: dict[str, str] = {}
        for tarball in tarballs:
            for integrity in hash_integrities(tarball):
                integrity_to_tarball.setdefault(integrity, str(tarball))
        covered_integrities = sorted(required_integrities.intersection(integrity_to_tarball))
        missing_integrities = sorted(required_integrities.difference(integrity_to_tarball))
        receipt["dependencyCas"] = {
            "requiredIntegrities": len(required_integrities),
            "tarballFiles": len(tarballs),
            "coveredIntegrities": len(covered_integrities),
            "missingIntegrities": len(missing_integrities),
            "missing": missing_integrities[:200],
        }
        if missing_integrities:
            raise RuntimeError(f"Dependency CAS is incomplete for lockfile: {len(missing_integrities)} integrity rows missing")

        cache = (output / "npm-cache").resolve()
        if cache.exists():
            shutil.rmtree(cache)
        cache.mkdir(parents=True, exist_ok=True)
        unique_tarballs = sorted({Path(integrity_to_tarball[integrity]) for integrity in covered_integrities})
        cache_add_results: list[dict[str, Any]] = []
        for index in range(0, len(unique_tarballs), 20):
            chunk = unique_tarballs[index : index + 20]
            result = run_command(
                f"npm-cache-add-{index // 20:03d}",
                [
                    "npm",
                    "cache",
                    "add",
                    *[str(path) for path in chunk],
                    "--cache",
                    str(cache),
                    "--ignore-scripts",
                    "--audit=false",
                    "--fund=false",
                ],
                project,
                logs,
                base_environment,
                900,
            )
            cache_add_results.append(result)
            if not result["pass"]:
                break
        receipt["steps"].extend(cache_add_results)
        receipt["cacheAdd"] = {
            "chunks": len(cache_add_results),
            "passed": sum(1 for row in cache_add_results if row["pass"]),
            "allPass": bool(cache_add_results) and all(row["pass"] for row in cache_add_results),
        }
        if not receipt["cacheAdd"]["allPass"]:
            raise RuntimeError("Unable to populate exact offline npm cache from dependency CAS")

        npm_ci = run_command(
            "npm-ci-offline-ignore-scripts",
            [
                "npm",
                "ci",
                "--offline",
                "--ignore-scripts",
                "--include=dev",
                "--include=optional",
                "--cache",
                str(cache),
                "--audit=false",
                "--fund=false",
            ],
            project,
            logs,
            base_environment,
            2400,
        )
        receipt["steps"].append(npm_ci)
        if not npm_ci["pass"]:
            raise RuntimeError("Offline npm ci failed")

        npm_ls = run_command(
            "npm-ls-all",
            ["npm", "ls", "--all", "--json"],
            project,
            logs,
            base_environment,
            900,
        )
        receipt["steps"].append(npm_ls)
        receipt["hardGates"]["dependencyClosure"] = npm_ls["pass"]
        if not npm_ls["pass"]:
            raise RuntimeError("npm ls reported dependency problems")

        trusted_guard = run_command(
            "trusted-native-guard-negative-control",
            ["node", "scripts/runtime/rebuild-trusted-native.mjs"],
            project,
            logs,
            base_environment,
            300,
        )
        trusted_guard["expectedExitCode"] = 78
        trusted_guard["expectedBlockPass"] = trusted_guard.get("exitCode") == 78
        receipt["steps"].append(trusted_guard)
        receipt["hardGates"]["trustedNativeGuardExpectedBlock"] = bool(trusted_guard["expectedBlockPass"])
        if not trusted_guard["expectedBlockPass"]:
            raise RuntimeError("Trusted-native guard did not fail closed with exit code 78")

        native_output = output / "P43_WINDOWS_NATIVE_PLATFORM_AVAILABILITY.json"
        native_probe = run_command(
            "native-platform-availability",
            [
                "node",
                "scripts/pass42/verify-p42-native-platform-availability.mjs",
                "--output",
                str(native_output),
            ],
            project,
            logs,
            base_environment,
            600,
        )
        receipt["steps"].append(native_probe)
        receipt["hardGates"]["nativePlatformAvailability"] = native_probe["pass"]
        if not native_probe["pass"]:
            raise RuntimeError("Native Windows platform availability failed")

        package_json = load_json(project / "package.json")
        scripts = package_json.get("scripts", {}) if isinstance(package_json, dict) else {}

        typecheck_command = (
            ["npm", "run", "typecheck"]
            if "typecheck" in scripts
            else ["npx", "tsc", "--noEmit", "--pretty", "false"]
        )
        typecheck = run_command("typecheck", typecheck_command, project, logs, base_environment, 2400)
        receipt["steps"].append(typecheck)
        receipt["hardGates"]["typecheck"] = typecheck["pass"]
        if not typecheck["pass"]:
            raise RuntimeError("Semantic TypeScript failed")

        lint_command = (
            ["npm", "run", "lint"]
            if "lint" in scripts
            else ["npx", "eslint", ".", "--max-warnings", "0"]
        )
        lint = run_command("lint", lint_command, project, logs, base_environment, 3600)
        receipt["steps"].append(lint)
        receipt["hardGates"]["lint"] = lint["pass"]
        if not lint["pass"]:
            raise RuntimeError("ESLint failed")

        for directory in (project / ".next", project / ".next-pass25-webpack"):
            if directory.exists():
                shutil.rmtree(directory)
        webpack_command = (
            ["npm", "run", "build:webpack"]
            if "build:webpack" in scripts
            else ["npx", "next", "build", "--webpack"]
        )
        webpack = run_command("build-webpack", webpack_command, project, logs, build_environment, 5400)
        webpack_output = project / ".next-pass25-webpack"
        if not webpack_output.exists():
            webpack_output = project / ".next"
        webpack["outputFingerprint"] = tree_fingerprint(webpack_output)
        receipt["steps"].append(webpack)
        receipt["hardGates"]["webpackBuild"] = webpack["pass"] and webpack["outputFingerprint"]["exists"]
        if not receipt["hardGates"]["webpackBuild"]:
            raise RuntimeError("Webpack production build failed or produced no bound output")

        for directory in (project / ".next", project / ".next-pass25-turbopack"):
            if directory.exists():
                shutil.rmtree(directory)
        turbopack_command = (
            ["npm", "run", "build:turbopack"]
            if "build:turbopack" in scripts
            else ["npx", "next", "build", "--turbopack"]
        )
        turbopack = run_command("build-turbopack", turbopack_command, project, logs, build_environment, 5400)
        turbopack_output = project / ".next-pass25-turbopack"
        if not turbopack_output.exists():
            turbopack_output = project / ".next"
        turbopack["outputFingerprint"] = tree_fingerprint(turbopack_output)
        receipt["steps"].append(turbopack)
        receipt["hardGates"]["turbopackBuild"] = turbopack["pass"] and turbopack["outputFingerprint"]["exists"]
        if not receipt["hardGates"]["turbopackBuild"]:
            raise RuntimeError("Turbopack production build failed or produced no bound output")

        receipt["status"] = "PASS" if all(receipt["hardGates"].values()) else "FAIL"
    except Exception as exception:
        receipt["status"] = "FAIL"
        receipt["failure"] = {"type": type(exception).__name__, "message": str(exception)}
    finally:
        receipt["finishedAtEpoch"] = time.time()
        receipt["integritySha256"] = canonical_sha256(receipt)
        receipt_path.write_text(
            json.dumps(receipt, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print(json.dumps({"status": receipt["status"], "receipt": str(receipt_path)}, indent=2))

    return 0 if receipt["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
