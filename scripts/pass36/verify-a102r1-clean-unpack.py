#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, os, pathlib, subprocess, time

REV = "VELMERE_PASS36_A102R1_OUT_OF_TIME_REPEATED_SLO_VENDOR_EXIT_OBSERVATION_INDEPENDENT_WITNESS_AND_FROZEN_SOURCE_DIVERSITY_TRUTH_BOUNDARY"
MANIFEST_REL = "_velmere/PASS36_A102R1_SOURCE_ONLY_MANIFEST.json"
MAX_OUTPUT = 32 * 1024 * 1024


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical(value) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")


def safe_name(value: str) -> str:
    return "".join(
        character if character.isalnum() or character in "-_." else "_"
        for character in value
    )


def source_excluded(relative: str) -> bool:
    top = relative.split("/", 1)[0]
    if (
        top
        in {
            ".git",
            ".velmere",
            ".next",
            ".turbo",
            "_velmere",
            "artifacts",
            "coverage",
            "node_modules",
            "dist",
            "out",
            ".cache",
            "cache",
        }
        or top.startswith(".next-")
    ):
        return True
    segments = relative.split("/")
    base = relative.rsplit("/", 1)[-1]
    if "__pycache__" in segments or base.endswith(".pyc"):
        return True
    if base == ".env" or base.startswith(".env."):
        return True
    if base == ".eslintcache" or base.endswith(".tsbuildinfo"):
        return True
    if base.endswith(".log") and relative != (
        "fixtures/pass35/a42/windows-global-json-crash.log"
    ):
        return True
    return base.endswith((".db", ".sqlite", ".sqlite3"))


def verify_manifest(root: pathlib.Path):
    path = root / MANIFEST_REL
    manifest = json.loads(path.read_text(encoding="utf-8"))
    core = dict(manifest)
    declared = core.pop("manifestSha256", None)
    checks = [
        (
            "manifest_self_hash",
            declared == sha(canonical(core)),
            {"declared": declared, "actual": sha(canonical(core))},
        ),
        ("manifest_revision", manifest.get("revisionId") == REV,
         manifest.get("revisionId")),
        (
            "manifest_action_required",
            manifest.get("checkpointClass") == "ACTION_REQUIRED_NON_PASS"
            and manifest.get("completedThrough") == 89,
            None,
        ),
        (
            "manifest_no_promotion",
            manifest.get("a90ToA102PassCredit") is False
            and manifest.get("exactReleaseCredit") is False
            and manifest.get("globalDecision") == "NO_GO"
            and manifest.get("live") is False
            and manifest.get("saleEnabled") is False
            and manifest.get("productionApproved") is False
            and manifest.get("worldClassProven") is False,
            None,
        ),
    ]
    entries = manifest.get("entries") if isinstance(
        manifest.get("entries"), list
    ) else []
    rows = []
    failures = []
    for entry in entries:
        relative = entry.get("path")
        entry_path = root / relative
        if (
            not isinstance(relative, str)
            or relative.startswith("/")
            or "\\" in relative
            or any(part in ("", ".", "..") for part in relative.split("/"))
        ):
            failures.append({"path": relative, "reason": "unsafe_path"})
            continue
        if not entry_path.is_file() or entry_path.is_symlink():
            failures.append(
                {"path": relative, "reason": "missing_or_not_regular"}
            )
            continue
        data = entry_path.read_bytes()
        mode = 0o100755 if os.stat(entry_path).st_mode & 0o111 else 0o100644
        actual = {
            "path": relative,
            "byteLength": len(data),
            "sha256": sha(data),
            "mode": mode,
        }
        rows.append(actual)
        if actual != entry:
            failures.append(
                {
                    "path": relative,
                    "reason": "metadata_or_bytes_mismatch",
                    "declared": entry,
                    "actual": actual,
                }
            )
    actual_paths = {
        item.relative_to(root).as_posix()
        for item in root.rglob("*")
        if item.is_file()
        and not item.is_symlink()
        and item.relative_to(root).as_posix() != MANIFEST_REL
        and not source_excluded(item.relative_to(root).as_posix())
    }
    declared_paths = {
        entry.get("path") for entry in entries if isinstance(entry, dict)
    }
    checks.extend(
        [
            ("manifest_entries_exact", not failures, failures[:30]),
            (
                "manifest_exact_path_set",
                actual_paths == declared_paths,
                {
                    "unexpected": sorted(actual_paths - declared_paths)[:30],
                    "missing": sorted(declared_paths - actual_paths)[:30],
                },
            ),
        ]
    )
    rows.sort(key=lambda row: row["path"])
    path_set = sha("\n".join(row["path"] for row in rows).encode())
    aggregate = sha(
        "\n".join(
            f"{row['path']}\0{row['byteLength']}\0{row['sha256']}\0{row['mode']}"
            for row in rows
        ).encode()
    )
    checks.extend(
        [
            (
                "manifest_count",
                manifest.get("fileCount") == len(rows),
                {"declared": manifest.get("fileCount"), "actual": len(rows)},
            ),
            (
                "manifest_bytes",
                manifest.get("byteLength")
                == sum(row["byteLength"] for row in rows),
                None,
            ),
            (
                "manifest_pathset",
                manifest.get("pathSetSha256") == path_set,
                None,
            ),
            (
                "manifest_aggregate",
                manifest.get("aggregateSha256") == aggregate,
                None,
            ),
        ]
    )
    return manifest, checks


def run_step(
    root: pathlib.Path,
    receipt_dir: pathlib.Path,
    index: int,
    step: dict,
    base_env: dict,
):
    started = time.monotonic()
    result = {
        "index": index,
        "id": step["id"],
        "command": step["cmd"],
        "timeoutSeconds": step.get("timeout", 300),
    }
    try:
        completed = subprocess.run(
            step["cmd"],
            cwd=root,
            env=base_env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=step.get("timeout", 300),
            check=False,
        )
        stdout = completed.stdout[:MAX_OUTPUT]
        stderr = completed.stderr[:MAX_OUTPUT]
        result.update(
            {
                "exitCode": completed.returncode,
                "timedOut": False,
                "stdoutTruncated": len(completed.stdout) > MAX_OUTPUT,
                "stderrTruncated": len(completed.stderr) > MAX_OUTPUT,
            }
        )
    except subprocess.TimeoutExpired as error:
        stdout = (error.stdout or b"")[:MAX_OUTPUT]
        stderr = (error.stderr or b"")[:MAX_OUTPUT]
        result.update(
            {
                "exitCode": None,
                "timedOut": True,
                "stdoutTruncated": False,
                "stderrTruncated": False,
            }
        )
    stdout_path = receipt_dir / (
        f"{index:02d}-{safe_name(step['id'])}.stdout.log"
    )
    stderr_path = receipt_dir / (
        f"{index:02d}-{safe_name(step['id'])}.stderr.log"
    )
    stdout_path.write_bytes(stdout)
    stderr_path.write_bytes(stderr)
    result.update(
        {
            "elapsedMs": int((time.monotonic() - started) * 1000),
            "stdoutBytes": len(stdout),
            "stderrBytes": len(stderr),
            "stdoutSha256": sha(stdout),
            "stderrSha256": sha(stderr),
            "stdoutLog": stdout_path.name,
            "stderrLog": stderr_path.name,
        }
    )
    expected = step.get("expectedStatus")
    decoded_stdout = stdout.decode("utf-8").strip()
    try:
        parsed = json.loads(decoded_stdout)
    except Exception:
        parsed = None
        decoder = json.JSONDecoder()
        for offset in range(len(decoded_stdout) - 1, -1, -1):
            if decoded_stdout[offset] != "{":
                continue
            try:
                candidate, consumed = decoder.raw_decode(
                    decoded_stdout[offset:]
                )
            except Exception:
                continue
            if decoded_stdout[offset + consumed:].strip() == "":
                parsed = candidate
                break
    result["parsedStatus"] = (
        parsed.get("status") or parsed.get("decision")
        if isinstance(parsed, dict)
        else None
    )
    passed = (
        result["exitCode"] == 0
        and not result["timedOut"]
        and not result["stdoutTruncated"]
        and not result["stderrTruncated"]
    )
    if expected is not None:
        passed = passed and result["parsedStatus"] == expected
    if step.get("a58"):
        passed = (
            passed
            and isinstance(parsed, dict)
            and str(parsed.get("status", "")).startswith("PASS")
            and parsed.get("summary", {}).get("blockingFailed") == 0
            and parsed.get("promotionAllowed") is False
            and parsed.get("saleEnabled") is False
            and parsed.get("liveProven") is False
        )
    result["passed"] = bool(passed)
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--receipt-dir", required=True)
    args = parser.parse_args()
    root = pathlib.Path.cwd().resolve()
    receipt_dir = pathlib.Path(args.receipt_dir).resolve()
    receipt_dir.mkdir(parents=True, exist_ok=True)
    manifest, before_checks = verify_manifest(root)
    exact_node_bin = os.environ.get("VELMERE_EXACT_NODE_BIN")
    exact_npm_bin = os.environ.get("VELMERE_EXACT_NPM_BIN")
    exact_npm_cache_raw = os.environ.get("VELMERE_EXACT_NPM_CACHE")
    if not exact_node_bin or not exact_npm_bin or not exact_npm_cache_raw:
        raise RuntimeError("exact_node_npm_and_external_cache_required")
    exact_node = pathlib.Path(exact_node_bin) / "node"
    exact_npm_cli = pathlib.Path(exact_npm_bin) / "npm-cli.js"
    if not exact_node.is_file() or not exact_npm_cli.is_file():
        raise RuntimeError("exact_node_or_npm_cli_missing")
    exact_npm_cache = pathlib.Path(exact_npm_cache_raw).resolve()
    if (
        not exact_npm_cache.is_dir()
        or exact_npm_cache.is_symlink()
        or exact_npm_cache == root
        or root in exact_npm_cache.parents
    ):
        raise RuntimeError("external_regular_npm_cache_required")
    npm = [str(exact_node), str(exact_npm_cli)]
    exact_path = os.pathsep.join(
        [exact_node_bin, exact_npm_bin, "/usr/bin", "/bin"]
    )
    base_env = {
        "PATH": exact_path,
        "LANG": "C.UTF-8",
        "LC_ALL": "C.UTF-8",
        "TZ": "UTC",
        "CI": "1",
        "NO_COLOR": "1",
        "NODE_ENV": "test",
        "VELMERE_A102R1_CLEAN_UNPACK": "1",
        "VELMERE_A95_NO_WRITE": "1",
    }
    steps = [
        {
            "id": "a58_release_integrity_literal_first_child",
            "cmd": ["node", "scripts/pass36/verify-a58-release-integrity.mjs"],
            "expectedStatus": "PASS_RELEASE_INTEGRITY_NO_PROMOTION",
            "a58": True,
            "timeout": 420,
        },
        {
            "id": "npm_ci_exact_local_runtime",
            "cmd": [
                *npm,
                "ci",
                "--ignore-scripts",
                "--no-audit",
                "--no-fund",
                "--cache",
                str(exact_npm_cache),
                "--offline",
            ],
            "timeout": 900,
        },
        {
            "id": "a102r1_authority_descendant",
            "cmd": [
                "node",
                "scripts/pass36/verify-a102r1-action-required-authority.mjs",
            ],
            "expectedStatus":
                "PASS_A102R1_ACTION_REQUIRED_AUTHORITY_NO_REAL_OR_STAGING_CREDIT",
            "timeout": 600,
        },
        {
            "id": "current_root_30_of_30",
            "cmd": [
                "node",
                "scripts/pass6/run-critical-offline-gate.mjs",
                "--lineage-mode",
                "current-root",
            ],
            "expectedStatus": "PASS_CODE_ONLY_ACTION_REQUIRED_CHECKPOINT",
            "timeout": 1200,
        },
        {
            "id": "lint_zero_zero",
            "cmd": [*npm, "run", "lint"],
            "timeout": 1200,
        },
        {
            "id": "typecheck_zero_diagnostics",
            "cmd": [*npm, "run", "typecheck:direct"],
            "timeout": 1200,
        },
        {
            "id": "webpack_build",
            "cmd": [*npm, "run", "build:webpack"],
            "timeout": 1800,
        },
        {
            "id": "webpack_production_smoke",
            "cmd": [*npm, "run", "smoke:production:webpack"],
            "timeout": 900,
        },
        {
            "id": "turbopack_build",
            "cmd": [*npm, "run", "build:turbopack"],
            "timeout": 1800,
        },
        {
            "id": "turbopack_production_smoke",
            "cmd": [*npm, "run", "smoke:production:turbopack"],
            "timeout": 900,
        },
        {
            "id": "route_ast_static_replay",
            "cmd": [
                "node",
                "scripts/pass15/verify-route-export-ast-registry.mjs",
            ],
            "expectedStatus":
                "PASS_ROUTE_EXPORT_AST_REGISTRY_STATIC_REPLAY_NO_REPARSE_CREDIT",
            "timeout": 300,
        },
        {
            "id": "route_dispatch_full_denominator",
            "cmd": [
                "node",
                "scripts/pass15/verify-route-dispatch-consolidation.mjs",
                "--output",
                str(receipt_dir / "route-dispatch-verification.json"),
            ],
            "timeout": 420,
        },
        {
            "id": "product_tier_contract",
            "cmd": [
                "node",
                "scripts/pass35/test-product-tier-content-contract.mjs",
            ],
            "timeout": 420,
        },
        {
            "id": "retained_pdf_summary",
            "cmd": [
                "node",
                "scripts/pass36/verify-a94r2-retained-pdf-summary.mjs",
            ],
            "expectedStatus":
                "PASS_A94R2_RETAINED_PDF_SUMMARY_SYNTHETIC_ONLY_NO_SALE_CREDIT",
            "timeout": 300,
        },
        {
            "id": "source_integrity_audit",
            "cmd": ["node", "scripts/a44-source-integrity-audit.mjs"],
            "timeout": 900,
        },
    ]
    results = []
    for index, step in enumerate(steps, 1):
        results.append(
            run_step(root, receipt_dir, index, step, base_env)
        )
        if not results[-1]["passed"]:
            break
    _, after_checks = verify_manifest(root)
    checks = [
        {"id": f"before:{identifier}", "passed": passed, "detail": detail}
        for identifier, passed, detail in before_checks
    ] + [
        {"id": f"after:{identifier}", "passed": passed, "detail": detail}
        for identifier, passed, detail in after_checks
    ]
    checks.append(
        {
            "id": "a58_is_literal_first_child",
            "passed": bool(results)
            and results[0]["id"] == "a58_release_integrity_literal_first_child",
            "detail": results[0]["id"] if results else None,
        }
    )
    checks.append(
        {
            "id": "all_child_steps_passed",
            "passed": len(results) == len(steps)
            and all(result["passed"] for result in results),
            "detail": {
                "executed": len(results),
                "required": len(steps),
                "failed": [
                    result["id"] for result in results if not result["passed"]
                ],
            },
        }
    )
    failures = [check for check in checks if not check["passed"]]
    receipt = {
        "schemaVersion": "velmere.pass36.a102r1.clean-unpack-verification.v1",
        "revisionId": REV,
        "status": (
            "ACTION_REQUIRED_EXTERNAL_BROWSER_AND_REAL_EVIDENCE_CLOSURE"
            if not failures
            else "FAIL_A102R1_CLEAN_UNPACK_LOCAL_CONTRACT"
        ),
        "localContractPassed": not failures,
        "a58LiteralFirstChild": bool(results)
        and results[0]["id"] == "a58_release_integrity_literal_first_child",
        "dependencyInstallNetworkMode": "OFFLINE_EXTERNAL_LOCKFILE_CACHE",
        "sourceArchiveManifestSha256": manifest.get("manifestSha256"),
        "checks": len(checks),
        "passed": len(checks) - len(failures),
        "failed": len(failures),
        "failures": failures,
        "steps": results,
        "notExecutedOrNotCredited": [
            {
                "gate": "official_node_npm_archive_provenance",
                "status": "NOT_PROVEN",
            },
            {
                "gate": "historical_827_of_827_dependency_cas",
                "status": "CURRENT_LOCKFILE_HAS_654_REMOTE_PACKAGE_ROWS",
            },
            {
                "gate": "exact_playwright_chromium_and_54_browser_rows",
                "status": "NOT_EXECUTED",
            },
            {
                "gate": "a77r1_a80r1_exact_release",
                "status": "NOT_EXECUTED",
            },
            {
                "gate": "real_a95_a104_staging_lifecycles",
                "status": "0_OF_REQUIRED_REAL_STAGES",
            },
            {
                "gate": "real_a102_repeated_observation",
                "status": "0_OF_3_OVER_72_HOURS",
            },
            {
                "gate": "real_data_rights_legal_customer_assurance",
                "status": "BLOCKED_EXTERNAL",
            },
        ],
        "globalDecision": "NO_GO",
        "live": False,
        "saleEnabled": False,
        "productionApproved": False,
        "worldClassProven": False,
    }
    output = receipt_dir / "PASS36_A102R1_CLEAN_UNPACK_RECEIPT.json"
    output.write_text(
        json.dumps(receipt, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(receipt, indent=2, ensure_ascii=False))
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
