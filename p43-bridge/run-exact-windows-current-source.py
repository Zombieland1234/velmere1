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
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def hash_integrities(path: Path) -> set[str]:
    data = path.read_bytes()
    out: set[str] = set()
    for alg in ("sha512", "sha384", "sha256", "sha1"):
        digest = hashlib.new(alg, data).digest()
        out.add(f"{alg}-{base64.b64encode(digest).decode('ascii')}")
    return out


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
        proc = subprocess.run(
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
        output = proc.stdout or ""
        log_path.write_text(output, encoding="utf-8")
        return {
            "name": name,
            "command": command,
            "exitCode": proc.returncode,
            "pass": proc.returncode == 0,
            "durationSeconds": round(time.time() - started, 3),
            "log": str(log_path),
            "logSha256": sha256_file(log_path),
            "tail": output[-6000:],
        }
    except subprocess.TimeoutExpired as exc:
        output = (exc.stdout or "") if isinstance(exc.stdout, str) else ""
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
    except Exception as exc:  # fail-closed receipt rather than disappearing
        output = f"{type(exc).__name__}: {exc}\n"
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


def locate_project(output_dir: Path, coverage: dict[str, Any]) -> Path:
    reconstruction = coverage.get("reconstruction", {}) if isinstance(coverage, dict) else {}
    keys = (
        "outputRoot",
        "outputDir",
        "reconstructedRoot",
        "reconstructedSourceRoot",
        "root",
    )
    candidates: list[Path] = []
    for key in keys:
        value = reconstruction.get(key)
        if value:
            p = Path(value)
            if not p.is_absolute():
                p = (Path.cwd() / p).resolve()
            candidates.append(p)
    candidates.extend(p.parent for p in output_dir.rglob("package.json") if (p.parent / "package-lock.json").is_file())
    valid: list[Path] = []
    for candidate in candidates:
        candidate = candidate.resolve()
        if (candidate / "package.json").is_file() and (candidate / "package-lock.json").is_file():
            valid.append(candidate)
    if not valid:
        raise RuntimeError("Reconstructed project root with package.json and package-lock.json was not found")
    valid = sorted(set(valid), key=lambda p: (sum(1 for _ in p.rglob("*")), len(str(p))), reverse=True)
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
    rows: list[Path] = []
    for path in root.rglob("*.tgz"):
        if any(part in excluded for part in path.parts):
            continue
        rows.append(path)
    return sorted(set(rows))


def discover_existing_cache(root: Path) -> list[Path]:
    rows: list[Path] = []
    for path in root.rglob("_cacache"):
        if path.is_dir():
            rows.append(path.parent)
    return sorted(set(rows), key=lambda p: sum(1 for _ in p.rglob("*")), reverse=True)


def tree_fingerprint(root: Path) -> dict[str, Any]:
    rows: list[tuple[str, str, int]] = []
    if not root.exists():
        return {"exists": False, "files": 0, "bytes": 0, "sha256": None}
    for path in sorted(p for p in root.rglob("*") if p.is_file()):
        rel = path.relative_to(root).as_posix()
        rows.append((rel, sha256_file(path), path.stat().st_size))
    h = hashlib.sha256()
    for rel, digest, size in rows:
        h.update(rel.encode("utf-8"))
        h.update(b"\0")
        h.update(digest.encode("ascii"))
        h.update(b"\0")
        h.update(str(size).encode("ascii"))
        h.update(b"\n")
    return {
        "exists": True,
        "files": len(rows),
        "bytes": sum(size for _, _, size in rows),
        "sha256": h.hexdigest(),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--coverage-receipt", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    out = Path(args.output_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    logs = out / "logs"
    logs.mkdir(parents=True, exist_ok=True)
    coverage_path = Path(args.coverage_receipt).resolve()
    coverage = load_json(coverage_path)

    receipt: dict[str, Any] = {
        "schema": "velmere.p43.exact-windows-current-source-semantic-dual-build.v1",
        "status": "IN_PROGRESS",
        "creditClass": "CURRENT_SOURCE_EXACT_WINDOWS_INTERNAL",
        "sourceIdentityExpected": {
            "fileCount": EXPECTED_SOURCE_FILES,
            "payloadBytes": EXPECTED_PAYLOAD_BYTES,
            "pathSetSha256": EXPECTED_PATH_SET,
            "sourceAggregateSha256": EXPECTED_SOURCE_AGGREGATE,
        },
        "coverageReceipt": {
            "path": str(coverage_path),
            "sha256": sha256_file(coverage_path),
        },
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
            "dependencyClosure": False,
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

    receipt_path = out / "P43_EXACT_WINDOWS_CURRENT_SOURCE_SEMANTIC_DUAL_BUILD_RECEIPT.json"
    try:
        reconstruction = coverage.get("reconstruction", {})
        coverage_state = coverage.get("coverage", {})
        exact_identity = bool(
            coverage_state.get("complete")
            and reconstruction.get("exactIdentityPass")
            and reconstruction.get("fileCount") == EXPECTED_SOURCE_FILES
            and reconstruction.get("payloadBytes") == EXPECTED_PAYLOAD_BYTES
            and reconstruction.get("pathSetSha256") == EXPECTED_PATH_SET
            and reconstruction.get("sourceAggregateSha256") == EXPECTED_SOURCE_AGGREGATE
        )
        receipt["hardGates"]["exactSourceIdentity"] = exact_identity
        if not exact_identity:
            raise RuntimeError("Coverage/reconstruction receipt does not prove exact P43 source identity")

        project = locate_project(Path(args.output_dir).resolve().parent, coverage)
        receipt["projectRoot"] = str(project)
        receipt["projectFiles"] = {
            "packageJsonSha256": sha256_file(project / "package.json"),
            "packageLockSha256": sha256_file(project / "package-lock.json"),
        }

        env = os.environ.copy()
        env.update({
            "CI": "1",
            "NEXT_TELEMETRY_DISABLED": "1",
            "NODE_ENV": "production",
        })

        node_version = subprocess.check_output(["node", "--version"], text=True).strip()
        npm_version = subprocess.check_output(["npm", "--version"], text=True).strip()
        receipt["toolchain"] = {"node": node_version, "npm": npm_version}
        receipt["hardGates"]["exactWindows"] = platform.system().lower() == "windows"
        receipt["hardGates"]["exactNode"] = node_version == EXPECTED_NODE
        receipt["hardGates"]["exactNpm"] = npm_version == EXPECTED_NPM
        if not all(receipt["hardGates"][k] for k in ("exactWindows", "exactNode", "exactNpm")):
            raise RuntimeError(f"Exact Windows/Node/npm mismatch: {receipt['toolchain']} on {platform.system()}")

        lock = load_json(project / "package-lock.json")
        required_integrities = lock_integrities(lock)
        tarballs = discover_tarballs(project)
        integrity_to_tarball: dict[str, str] = {}
        for tarball in tarballs:
            for integrity in hash_integrities(tarball):
                integrity_to_tarball.setdefault(integrity, str(tarball))
        covered = sorted(required_integrities.intersection(integrity_to_tarball))
        missing = sorted(required_integrities.difference(integrity_to_tarball))
        receipt["dependencyCas"] = {
            "requiredIntegrities": len(required_integrities),
            "tarballFiles": len(tarballs),
            "coveredIntegrities": len(covered),
            "missingIntegrities": len(missing),
            "missing": missing[:200],
        }

        cache_candidates = discover_existing_cache(project)
        cache = (out / "npm-cache").resolve()
        if cache.exists():
            shutil.rmtree(cache)
        cache.mkdir(parents=True, exist_ok=True)
        receipt["dependencyCas"]["existingCacheCandidates"] = [str(p) for p in cache_candidates[:10]]

        if missing:
            raise RuntimeError(f"Dependency CAS is incomplete for lockfile: {len(missing)} integrity rows missing")

        unique_tarballs = sorted({Path(integrity_to_tarball[item]) for item in covered})
        cache_add_results: list[dict[str, Any]] = []
        for index in range(0, len(unique_tarballs), 20):
            chunk = unique_tarballs[index:index + 20]
            result = run_command(
                f"npm-cache-add-{index // 20:03d}",
                ["npm", "cache", "add", *[str(path) for path in chunk], "--cache", str(cache), "--ignore-scripts", "--audit=false", "--fund=false"],
                project,
                logs,
                env,
                900,
            )
            cache_add_results.append(result)
            if not result["pass"]:
                break
        receipt["cacheAdd"] = {
            "chunks": len(cache_add_results),
            "passed": sum(1 for row in cache_add_results if row["pass"]),
            "allPass": bool(cache_add_results) and all(row["pass"] for row in cache_add_results),
        }
        receipt["steps"].extend(cache_add_results)
        if not receipt["cacheAdd"]["allPass"]:
            raise RuntimeError("Unable to populate exact offline npm cache from dependency CAS")

        npm_ci = run_command(
            "npm-ci-offline-ignore-scripts",
            ["npm", "ci", "--offline", "--ignore-scripts", "--cache", str(cache), "--audit=false", "--fund=false"],
            project,
            logs,
            env,
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
            env,
            900,
        )
        receipt["steps"].append(npm_ls)
        receipt["hardGates"]["dependencyClosure"] = npm_ls["pass"]
        if not npm_ls["pass"]:
            raise RuntimeError("npm ls reported dependency problems")

        package_json = load_json(project / "package.json")
        scripts = package_json.get("scripts", {}) if isinstance(package_json, dict) else {}

        typecheck_command = ["npm", "run", "typecheck"] if "typecheck" in scripts else ["npx", "tsc", "--noEmit", "--pretty", "false"]
        typecheck = run_command("typecheck", typecheck_command, project, logs, env, 1800)
        receipt["steps"].append(typecheck)
        receipt["hardGates"]["typecheck"] = typecheck["pass"]
        if not typecheck["pass"]:
            raise RuntimeError("Semantic TypeScript failed")

        lint_command = ["npm", "run", "lint"] if "lint" in scripts else ["npx", "eslint", ".", "--max-warnings", "0"]
        lint = run_command("lint", lint_command, project, logs, env, 2400)
        receipt["steps"].append(lint)
        receipt["hardGates"]["lint"] = lint["pass"]
        if not lint["pass"]:
            raise RuntimeError("ESLint failed")

        next_dir = project / ".next"
        if next_dir.exists():
            shutil.rmtree(next_dir)
        webpack_command = ["npm", "run", "build:webpack"] if "build:webpack" in scripts else ["npx", "next", "build", "--webpack"]
        webpack = run_command("build-webpack", webpack_command, project, logs, env, 3600)
        webpack["outputFingerprint"] = tree_fingerprint(next_dir)
        receipt["steps"].append(webpack)
        receipt["hardGates"]["webpackBuild"] = webpack["pass"]
        if not webpack["pass"]:
            raise RuntimeError("Webpack production build failed")

        if next_dir.exists():
            shutil.rmtree(next_dir)
        turbopack_command = ["npm", "run", "build:turbopack"] if "build:turbopack" in scripts else ["npx", "next", "build", "--turbopack"]
        turbopack = run_command("build-turbopack", turbopack_command, project, logs, env, 3600)
        turbopack["outputFingerprint"] = tree_fingerprint(next_dir)
        receipt["steps"].append(turbopack)
        receipt["hardGates"]["turbopackBuild"] = turbopack["pass"]
        if not turbopack["pass"]:
            raise RuntimeError("Turbopack production build failed")

        receipt["status"] = "PASS" if all(receipt["hardGates"].values()) else "FAIL"
    except Exception as exc:
        receipt["status"] = "FAIL"
        receipt["failure"] = {"type": type(exc).__name__, "message": str(exc)}
    finally:
        receipt["finishedAtEpoch"] = time.time()
        receipt_path.write_text(json.dumps(receipt, indent=2, ensure_ascii=False), encoding="utf-8")
        receipt["receiptSha256"] = sha256_file(receipt_path)
        receipt_path.write_text(json.dumps(receipt, indent=2, ensure_ascii=False), encoding="utf-8")
        print(json.dumps({"status": receipt["status"], "receipt": str(receipt_path)}, indent=2))

    return 0 if receipt["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
