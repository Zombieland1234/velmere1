#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any

ROOT = Path.cwd().resolve()
REVISION_ID = "VELMERE_PASS36_A88R0_BRAIN_ANGEL_RISK_MULTILINGUAL_ADVERSARIAL_EVAL_AND_ADVICE_BOUNDARY"
COMMAND_TIMEOUT_SECONDS = 300
MAX_OUTPUT_BYTES = 512 * 1024 * 1024
BATCH_SIZE = 5
WORKER_TIMEOUT_SECONDS = (COMMAND_TIMEOUT_SECONDS * BATCH_SIZE) + 60

COMMANDS: tuple[tuple[str, tuple[str, ...], bool], ...] = (
    ("a58_release_integrity_first", ("scripts/pass36/verify-a58-release-integrity.mjs",), True),
    ("a58_contract", ("scripts/pass36/test-a58-release-integrity.mjs",), False),
    ("source_package_self_audit", ("scripts/pass35/test-source-package-self-verification.mjs",), False),
    ("a88_descendant", ("scripts/pass36/verify-a88-current-root-descendant.mjs",), False),
    ("a88_matrix", ("--import", "./scripts/pass11/register-offline-ts-loader.mjs", "scripts/pass36/run-a88-top-level-module-force-exit.mjs", "scripts/pass36/verify-a88-brain-angel-risk-eval.ts"), False),
    ("a87_descendant", ("scripts/pass36/verify-a87-current-root-descendant.mjs",), False),
    ("a87_matrix", ("--import", "./scripts/pass11/register-offline-ts-loader.mjs", "scripts/pass36/run-a88-top-level-module-force-exit.mjs", "scripts/pass36/verify-a87-market-impact-whale-watch-matrix.ts"), False),
    ("a86_descendant", ("scripts/pass36/verify-a86-current-root-descendant.mjs",), False),
    ("a86_matrix", ("--experimental-strip-types", "scripts/pass36/run-a88-top-level-module-force-exit.mjs", "scripts/pass36/verify-a86-real-markets-cross-asset-matrix.ts"), False),
    ("a85_descendant", ("scripts/pass36/verify-a85-current-root-descendant.mjs",), False),
    ("a85_matrix", ("--import", "./scripts/pass11/register-offline-ts-loader.mjs", "scripts/pass36/run-a88-top-level-module-force-exit.mjs", "scripts/pass36/verify-a85-shield-pro-map-full-depth-matrix.ts"), False),
    ("a84_descendant", ("scripts/pass36/verify-a84-current-root-descendant.mjs",), False),
    ("a84_matrix", ("--experimental-strip-types", "scripts/pass36/run-a88-top-level-module-force-exit.mjs", "scripts/pass36/verify-a84-shield-full-catalog-tier-matrix.ts"), False),
    ("a83_descendant", ("scripts/pass36/verify-a83-current-root-descendant.mjs",), False),
    ("a83_matrix", ("--import", "./scripts/pass11/register-offline-ts-loader.mjs", "scripts/pass36/run-a88-top-level-module-force-exit.mjs", "scripts/pass36/verify-a83-browser-lens-pdf-real-packet-matrix.ts"), False),
    ("a82_descendant", ("scripts/pass36/verify-a82-current-root-descendant.mjs",), False),
    ("a82_matrix", ("scripts/pass36/verify-a82-audit-real-contract-matrix.mjs",), False),
    ("a81_descendant", ("scripts/pass36/verify-a81-current-root-descendant.mjs",), False),
    ("a81_matrix", ("--experimental-strip-types", "scripts/pass36/run-a88-top-level-module-force-exit.mjs", "scripts/pass36/verify-a81-canonical-mega-matrix-orchestrator.ts"), False),
    ("a80_descendant", ("scripts/pass36/verify-a80-current-root-descendant.mjs",), False),
    ("a80_admission", ("scripts/pass36/verify-a80-frozen-local-release-candidate-admission.mjs",), False),
    ("a79_descendant", ("scripts/pass36/verify-a79-current-root-descendant.mjs",), False),
    ("a79_admission", ("scripts/pass36/verify-a79-exact-final-byte-build-browser-evidence-binding.mjs",), False),
    ("a78_descendant", ("scripts/pass36/verify-a78-current-root-descendant.mjs",), False),
    ("a78_bootstrap", ("scripts/pass36/verify-a78-exact-runtime-lockfile-browser-bootstrap.mjs",), False),
    ("a77_clean_root", ("scripts/pass36/verify-a77-clean-root-migration.mjs",), False),
    ("a77_legacy", ("scripts/pass36/verify-a77-legacy-lineage-isolation.mjs",), False),
    ("a37_performance_runtime", ("--experimental-strip-types", "scripts/pass36/run-a88-top-level-module-force-exit.mjs", "scripts/pass35/test-a37-visual-runtime-performance.mjs"), False),
    ("a38_lifecycle_payload", ("--expose-gc", "--experimental-strip-types", "scripts/pass36/run-a88-top-level-module-force-exit.mjs", "scripts/pass35/test-a38-client-runtime-lifecycle.mjs"), False),
    ("a39_runtime_css_a11y", ("--experimental-strip-types", "scripts/pass36/run-a88-top-level-module-force-exit.mjs", "scripts/pass35/test-a39-runtime-binding-css.mjs"), False),
    ("a40_session_temporal_visibility", ("--experimental-strip-types", "scripts/pass36/run-a88-top-level-module-force-exit.mjs", "scripts/pass35/test-a40-session-temporal-visibility.mjs"), False),
    ("a41_route_runtime_recovery", ("scripts/pass35/test-a41-browser-shield-runtime-recovery.mjs",), False),
    ("a59_build_route_css_budgets", ("scripts/pass36/verify-a59-build-graph-route-css-budget-recovery.mjs",), False),
    ("a46_data_plane", ("scripts/pass35/test-a46-customer-data-plane-acceptance.mjs",), False),
    ("a57_acceptance", ("scripts/pass35/test-a57-controlled-canary-kill-switch-rollback-telemetry-acceptance.mjs",), False),
    ("route_dispatch", ("scripts/pass15/verify-route-dispatch-consolidation.mjs",), False),
    ("current_status", ("scripts/pass35/test-current-status-register.mjs",), False),
    ("static_control_plane", ("scripts/pass35/verify-control-plane.mjs",), False),
    ("product_tiers", ("scripts/pass35/test-product-tier-content-contract.mjs",), False),
    ("zero_budget", ("scripts/pass35/test-zero-budget-functional-roadmap.mjs",), False),
    ("source_audit", ("scripts/a44-source-integrity-audit.mjs",), False),
)


def parse_json_status(text: str) -> tuple[dict[str, Any] | None, str | None]:
    try:
        value = json.loads(text)
    except json.JSONDecodeError:
        return None, None
    if not isinstance(value, dict):
        return None, None
    status = value.get("status")
    return value, status if isinstance(status, str) else None


def bounded_read(path: Path) -> tuple[str, int, str | None]:
    size = path.stat().st_size
    if size > MAX_OUTPUT_BYTES:
        return "", size, "MAX_OUTPUT_BYTES"
    return path.read_text(encoding="utf-8", errors="replace"), size, None


def run_command(node: str, identifier: str, args: tuple[str, ...], parse_a58: bool, _temp_root: Path, _sequence: int) -> dict[str, Any]:
    started = time.monotonic()
    environment = os.environ.copy()
    environment["TERM"] = environment.get("TERM") or "xterm-256color"
    environment["VELMERE_A88_CLEAN_UNPACK_SEQUENCE"] = "1"
    exit_code: int | None = None
    signal: int | None = None
    error_code: str | None = None
    stdout = ""
    stderr = ""

    try:
        completed = subprocess.run(
            [node, *args],
            cwd=ROOT,
            env=environment,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=False,
            timeout=COMMAND_TIMEOUT_SECONDS,
            check=False,
            text=True,
            encoding="utf-8",
            errors="replace",
            start_new_session=(os.name != "nt"),
        )
        exit_code = completed.returncode
        stdout = completed.stdout or ""
        stderr = completed.stderr or ""
        if exit_code is not None and exit_code < 0:
            signal = -exit_code
    except subprocess.TimeoutExpired as error:
        error_code = "ETIMEDOUT"
        stdout = error.stdout or ""
        stderr = error.stderr or ""
        if isinstance(stdout, bytes):
            stdout = stdout.decode("utf-8", "replace")
        if isinstance(stderr, bytes):
            stderr = stderr.decode("utf-8", "replace")
    except OSError as error:
        error_code = f"SPAWN:{error.__class__.__name__}:{error}"

    stdout_bytes = len(stdout.encode("utf-8"))
    stderr_bytes = len(stderr.encode("utf-8"))
    if stdout_bytes > MAX_OUTPUT_BYTES:
        error_code = error_code or "STDOUT_MAX_OUTPUT_BYTES"
        stdout = ""
    if stderr_bytes > MAX_OUTPUT_BYTES:
        error_code = error_code or "STDERR_MAX_OUTPUT_BYTES"
        stderr = ""

    parsed, status = parse_json_status(stdout)
    passed = exit_code == 0 and signal is None and error_code is None
    if parse_a58:
        passed = bool(
            passed
            and parsed is not None
            and parsed.get("status") == "PASS_RELEASE_INTEGRITY_NO_PROMOTION"
            and isinstance(parsed.get("summary"), dict)
            and parsed["summary"].get("blockingFailed") == 0
            and parsed.get("historicalArtifactRecoveryComplete") is False
        )

    return {
        "id": identifier,
        "passed": passed,
        "exitCode": exit_code,
        "signal": signal,
        "timedOut": error_code == "ETIMEDOUT",
        "errorCode": error_code,
        "elapsedMs": round((time.monotonic() - started) * 1000),
        "stdoutBytes": stdout_bytes,
        "stderrBytes": stderr_bytes,
        "status": status,
        "failureTail": None if passed else f"{stderr}\n{stdout}"[-5000:],
    }

def build_report(results: list[dict[str, Any]]) -> dict[str, Any]:
    failures = [row for row in results if not row["passed"]]
    return {
        "schemaVersion": "velmere.pass36.a88.clean-unpack-sequence.v1",
        "revisionId": REVISION_ID,
        "status": "FAIL_A88_CLEAN_UNPACK_SEQUENCE" if failures else "PASS_A88_CLEAN_UNPACK_SEQUENCE_NO_PROMOTION",
        "requiredOrder": [
            "A58_EXACT_PATH_SET_BEFORE_ANY_RECEIPT_GENERATING_TEST",
            "A88_AND_RETAINED_REGRESSIONS_AFTER_A58",
        ],
        "processBoundary": {
            "childExecution": "SELF_REEXECUTING_PYTHON_BATCHES_WITH_COMMUNICATE_DRAINED_NODE_PIPES",
            "shell": False,
            "batchSize": BATCH_SIZE,
            "commandTimeoutSeconds": COMMAND_TIMEOUT_SECONDS,
            "maxStdoutBytes": MAX_OUTPUT_BYTES,
            "maxStderrBytes": MAX_OUTPUT_BYTES,
            "temporaryStateOutsideSourceRoot": True,
            "communicateDrainsStdoutStderrConcurrently": True,
        },
        "checks": len(results),
        "passed": sum(1 for row in results if row["passed"]),
        "failed": len(failures),
        "results": results,
        "historicalArtifactsRecovered": False,
        "exactBuildBrowserExecuted": False,
        "realEvalCasesVerified": 0,
        "realModelExecutions": 0,
        "rightsApprovedAiCases": 0,
        "independentAdjudications": 0,
        "customerDecisionUtilityLabels": 0,
        "realCalibrationWindowsClosed": 0,
        "realEvidenceRowsVerified": 0,
        "currentProviderEvidenceRows": 0,
        "rightsApprovedRows": 0,
        "realizedSlippageRows": 0,
        "continuousMonitoringRows": 0,
        "productionBrowserRows": 0,
        "customerValueLabeledRows": 0,
        "legalRegulatoryDecisionsSigned": 0,
        "legalRegulatoryDecisionDenominator": 20,
        "stagingProven": False,
        "liveProven": False,
        "saleEnabled": False,
        "truthBoundary": "This sequence verifies an unpacked SOURCE_ONLY package in safe order. A58 runs first. It does not execute a real AI model/provider/customer evaluation, close real calibration windows, establish legal correctness, provider rights, customer utility, exact A80, staging, LIVE or sale.",
    }


def create_state_file() -> Path:
    descriptor, raw_path = tempfile.mkstemp(prefix="velmere-a88-clean-state-", suffix=".json")
    os.close(descriptor)
    state_path = Path(raw_path)
    os.chmod(state_path, 0o600)
    state_path.write_text(json.dumps({"next": 0, "results": []}), encoding="utf-8")
    return state_path


def read_state(state_path: Path) -> dict[str, Any]:
    value = json.loads(state_path.read_text(encoding="utf-8"))
    if not isinstance(value, dict) or not isinstance(value.get("next"), int) or not isinstance(value.get("results"), list):
        raise RuntimeError("a88_clean_unpack_state_invalid")
    if value["next"] != len(value["results"]) or value["next"] < 0 or value["next"] > len(COMMANDS):
        raise RuntimeError("a88_clean_unpack_state_sequence_invalid")
    return value


def write_state(state_path: Path, state: dict[str, Any]) -> None:
    temporary = state_path.with_suffix(f".{os.getpid()}.tmp")
    temporary.write_text(json.dumps(state, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    os.chmod(temporary, 0o600)
    os.replace(temporary, state_path)


def main() -> int:
    if not (ROOT / "_velmere/PASS35_SOURCE_ONLY_MANIFEST.json").is_file():
        raise RuntimeError("a88_clean_unpack_package_manifest_required")
    node = shutil.which("node")
    if not node:
        raise RuntimeError("a88_clean_unpack_node_not_found")

    if len(sys.argv) == 3 and sys.argv[1] == "--state":
        state_path = Path(sys.argv[2]).resolve()
        if not state_path.is_file() or ROOT == state_path or ROOT in state_path.parents:
            raise RuntimeError("a88_clean_unpack_state_path_invalid")
    elif len(sys.argv) == 1:
        state_path = create_state_file()
    else:
        raise RuntimeError("a88_clean_unpack_arguments_invalid")

    state = read_state(state_path)
    failures = [row for row in state["results"] if not row.get("passed")]
    if not failures:
        start = state["next"]
        end = min(len(COMMANDS), start + BATCH_SIZE)
        with tempfile.TemporaryDirectory(prefix="velmere-a88-clean-batch-") as temporary:
            temp_root = Path(temporary)
            for index in range(start, end):
                identifier, args, parse_a58 = COMMANDS[index]
                result = run_command(node, identifier, args, parse_a58, temp_root, index + 1)
                state["results"].append(result)
                state["next"] = index + 1
                write_state(state_path, state)
                if not result["passed"]:
                    failures.append(result)
                    break

    if not failures and state["next"] < len(COMMANDS):
        environment = os.environ.copy()
        environment["PYTHONUNBUFFERED"] = "1"
        os.execve(
            sys.executable,
            [sys.executable, str(Path(__file__).resolve()), "--state", str(state_path)],
            environment,
        )
        raise RuntimeError("a88_clean_unpack_exec_returned")

    report = build_report(state["results"])
    try:
        state_path.unlink()
    except OSError:
        pass
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if report["failed"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
