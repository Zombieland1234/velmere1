#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from typing import Any

REV = "VELMERE_PASS36_A102R44P41_ACTION_REQUIRED_OFFICIAL_FOUNDRY_INVARIANTS_ANVIL_RAW_RPC_EXACT_OFFLINE_FULL_LINUX_RELEASE_NO_LIVE_CREDIT"
EXPECTED_FORGE = "1.7.1"
EXPECTED_SOLC_MARKER = "0.8.24+commit.e11b9ed9"
SEED = "0x414141"
CHAIN_ID = 31341

FAMILIES = [
    {"id": "vault-solvency", "risk": "VaultRiskInvariant", "control": "VaultControlInvariant", "invariant": "invariant_vault_solvency", "reason": "R44P41_VAULT_INSOLVENT"},
    {"id": "supply-cap", "risk": "SupplyCapRiskInvariant", "control": "SupplyCapControlInvariant", "invariant": "invariant_supply_cap", "reason": "R44P41_SUPPLY_CAP_BROKEN"},
    {"id": "owner-integrity", "risk": "OwnershipRiskInvariant", "control": "OwnershipControlInvariant", "invariant": "invariant_owner_integrity", "reason": "R44P41_OWNER_TAKEOVER"},
    {"id": "bridge-replay", "risk": "BridgeReplayRiskInvariant", "control": "BridgeReplayControlInvariant", "invariant": "invariant_bridge_single_execution", "reason": "R44P41_BRIDGE_REPLAY"},
    {"id": "pause-bypass", "risk": "PauseRiskInvariant", "control": "PauseControlInvariant", "invariant": "invariant_pause_blocks_movement", "reason": "R44P41_PAUSE_BYPASS"},
    {"id": "blacklist-bypass", "risk": "BlacklistRiskInvariant", "control": "BlacklistControlInvariant", "invariant": "invariant_blacklist_blocks_movement", "reason": "R44P41_BLACKLIST_BYPASS"},
    {"id": "fee-cap", "risk": "FeeCapRiskInvariant", "control": "FeeCapControlInvariant", "invariant": "invariant_fee_cap", "reason": "R44P41_FEE_CAP_BROKEN"},
    {"id": "minimum-quorum", "risk": "QuorumRiskInvariant", "control": "QuorumControlInvariant", "invariant": "invariant_minimum_quorum", "reason": "R44P41_LOW_QUORUM"},
]

ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def run(command: list[str], cwd: Path, env: dict[str, str], timeout: int = 120) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, cwd=cwd, env=env, text=True, capture_output=True, timeout=timeout, check=False)


def normalized_text(value: str) -> str:
    return ANSI_RE.sub("", value).replace("\r\n", "\n")


def sequence_from_log(value: str) -> list[str]:
    lines = normalized_text(value).splitlines()
    active = False
    rows: list[str] = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("[Sequence]"):
            if active and rows:
                break
            active = True
            continue
        if active:
            if stripped.startswith("sender="):
                rows.append(re.sub(r"\s+", " ", stripped))
                continue
            if stripped.startswith("invariant_"):
                break
    return rows


def sequence_shape(rows: list[str]) -> list[str]:
    shaped: list[str] = []
    for row in rows:
        row = re.sub(r"sender=0x[0-9A-Fa-f]{40}", "sender=<address>", row)
        row = re.sub(r"addr=\[[^\]]+\]0x[0-9A-Fa-f]{40}", "addr=<target>", row)
        shaped.append(row)
    return shaped


def parse_original_shrunk(text: str) -> tuple[int | None, int | None]:
    match = re.search(r"\[Sequence\]\s*\(original:\s*(\d+),\s*shrunk:\s*(\d+)\)", normalized_text(text))
    return (int(match.group(1)), int(match.group(2))) if match else (None, None)


def parse_control_metrics(text: str, invariant: str) -> dict[str, int] | None:
    pattern = rf"\[PASS\]\s+{re.escape(invariant)}\(\)\s+\(runs:\s*(\d+),\s*calls:\s*(\d+),\s*reverts:\s*(\d+)\)"
    match = re.search(pattern, normalized_text(text))
    if not match:
        return None
    return {"runs": int(match.group(1)), "calls": int(match.group(2)), "reverts": int(match.group(3))}


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def rpc(url: str, method: str, params: list[Any], request_id: int) -> dict[str, Any]:
    body = json.dumps({"jsonrpc": "2.0", "id": request_id, "method": method, "params": params}).encode("utf-8")
    request = urllib.request.Request(url, data=body, headers={"content-type": "application/json"}, method="POST")
    with urllib.request.urlopen(request, timeout=10) as response:
        payload = json.loads(response.read().decode("utf-8"))
    return {"request": {"jsonrpc": "2.0", "id": request_id, "method": method, "params": params}, "response": payload}


def wait_rpc(url: str) -> None:
    for attempt in range(80):
        try:
            result = rpc(url, "eth_chainId", [], 1)
            if result["response"].get("result"):
                return
        except Exception:
            pass
        time.sleep(0.1)
    raise RuntimeError("anvil_rpc_not_ready")


def artifact_index(root: Path, exclude: set[str] | None = None) -> list[dict[str, Any]]:
    exclude = exclude or set()
    rows: list[dict[str, Any]] = []
    for path in sorted(root.rglob("*"), key=lambda item: item.relative_to(root).as_posix().encode("utf-8")):
        if not path.is_file():
            continue
        relative = path.relative_to(root).as_posix()
        if relative in exclude:
            continue
        rows.append({"path": relative, "byteLength": path.stat().st_size, "sha256": sha256_file(path)})
    return rows


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", required=True)
    parser.add_argument("--forge", required=True)
    parser.add_argument("--cast", required=True)
    parser.add_argument("--anvil", required=True)
    parser.add_argument("--solc", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    source_root = Path(args.source_root).resolve()
    forge = Path(args.forge).resolve()
    cast = Path(args.cast).resolve()
    anvil = Path(args.anvil).resolve()
    solc = Path(args.solc).resolve()
    output_root = Path(args.output).resolve()
    project_source = source_root / "fixtures/pass36/r44p41-foundry-invariants"
    manifest_path = source_root / "_velmere/PASS36_A102R44P41_SOURCE_ONLY_MANIFEST.json"

    if output_root.exists():
        shutil.rmtree(output_root)
    output_root.mkdir(parents=True)
    workspace = output_root / "workspace"
    shutil.copytree(project_source, workspace)
    logs = output_root / "logs"
    rpc_root = output_root / "raw-rpc"
    logs.mkdir()
    rpc_root.mkdir()
    isolated_home = output_root / "home"
    isolated_home.mkdir()

    env = dict(os.environ)
    env.update({"NO_COLOR": "1", "HOME": str(isolated_home), "FOUNDRY_FUZZ_SEED": SEED, "RUST_BACKTRACE": "0"})

    checks: list[dict[str, Any]] = []
    def check(check_id: str, passed: bool, detail: Any = None) -> None:
        checks.append({"id": check_id, "passed": bool(passed), "detail": detail})

    forge_version = run([str(forge), "--version"], workspace, env)
    cast_version = run([str(cast), "--version"], workspace, env)
    anvil_version = run([str(anvil), "--version"], workspace, env)
    solc_version = run([str(solc), "--version"], workspace, env)
    for name, result in [("forge", forge_version), ("cast", cast_version), ("anvil", anvil_version), ("solc", solc_version)]:
        (logs / f"{name}-version.stdout.log").write_text(result.stdout, encoding="utf-8")
        (logs / f"{name}-version.stderr.log").write_text(result.stderr, encoding="utf-8")
    check("forge-version", forge_version.returncode == 0 and f"Version: {EXPECTED_FORGE}" in forge_version.stdout, forge_version.stdout.strip())
    check("cast-version", cast_version.returncode == 0 and f"Version: {EXPECTED_FORGE}" in cast_version.stdout, cast_version.stdout.strip())
    check("anvil-version", anvil_version.returncode == 0 and f"Version: {EXPECTED_FORGE}" in anvil_version.stdout, anvil_version.stdout.strip())
    check("solc-version", solc_version.returncode == 0 and EXPECTED_SOLC_MARKER in solc_version.stdout, solc_version.stdout.strip())

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    source_binding = {
        "revisionId": manifest["revisionId"],
        "manifestPath": manifest_path.relative_to(source_root).as_posix(),
        "manifestSha256": sha256_file(manifest_path),
        "sourceAggregateSha256": manifest["sourceAggregateSha256"],
        "pathSetSha256": manifest["pathSetSha256"],
        "fileCount": manifest["fileCount"],
    }
    check("source-revision", source_binding["revisionId"] == REV, source_binding)

    build = run([str(forge), "build", "--use", str(solc), "-vv"], workspace, env, timeout=180)
    (logs / "forge-build.stdout.log").write_text(build.stdout, encoding="utf-8")
    (logs / "forge-build.stderr.log").write_text(build.stderr, encoding="utf-8")
    check("forge-build", build.returncode == 0 and "Compiler run successful" in normalized_text(build.stdout + build.stderr))

    family_rows: list[dict[str, Any]] = []
    for family in FAMILIES:
        risk_runs: list[dict[str, Any]] = []
        for repetition in (1, 2):
            shutil.rmtree(workspace / "cache/invariant", ignore_errors=True)
            shutil.rmtree(workspace / "failures", ignore_errors=True)
            command = [str(forge), "test", "--use", str(solc), "--match-contract", family["risk"], "--fuzz-seed", SEED, "-vvv"]
            result = run(command, workspace, env, timeout=180)
            base = f"{family['id']}.risk.{repetition}"
            stdout_path = logs / f"{base}.stdout.log"
            stderr_path = logs / f"{base}.stderr.log"
            stdout_path.write_text(result.stdout, encoding="utf-8")
            stderr_path.write_text(result.stderr, encoding="utf-8")
            combined = result.stdout + result.stderr
            sequence = sequence_from_log(combined)
            original, shrunk = parse_original_shrunk(combined)
            risk_runs.append({
                "repetition": repetition,
                "exitCode": result.returncode,
                "expectedFailureObserved": result.returncode != 0 and f"[FAIL: {family['reason']}]" in normalized_text(combined) and family["invariant"] in combined,
                "originalSequenceLength": original,
                "shrunkSequenceLength": shrunk,
                "sequence": sequence,
                "sequenceShape": sequence_shape(sequence),
                "stdoutPath": stdout_path.relative_to(output_root).as_posix(),
                "stdoutSha256": sha256_file(stdout_path),
                "stderrPath": stderr_path.relative_to(output_root).as_posix(),
                "stderrSha256": sha256_file(stderr_path),
            })

        control_runs: list[dict[str, Any]] = []
        for repetition in (1, 2):
            shutil.rmtree(workspace / "cache/invariant", ignore_errors=True)
            shutil.rmtree(workspace / "failures", ignore_errors=True)
            command = [str(forge), "test", "--use", str(solc), "--match-contract", family["control"], "--fuzz-seed", SEED, "-vv"]
            result = run(command, workspace, env, timeout=180)
            base = f"{family['id']}.control.{repetition}"
            stdout_path = logs / f"{base}.stdout.log"
            stderr_path = logs / f"{base}.stderr.log"
            stdout_path.write_text(result.stdout, encoding="utf-8")
            stderr_path.write_text(result.stderr, encoding="utf-8")
            combined = result.stdout + result.stderr
            metrics = parse_control_metrics(combined, family["invariant"])
            control_runs.append({
                "repetition": repetition,
                "exitCode": result.returncode,
                "passed": result.returncode == 0 and metrics is not None and metrics["runs"] >= 256 and metrics["calls"] > 0,
                "metrics": metrics,
                "stdoutPath": stdout_path.relative_to(output_root).as_posix(),
                "stdoutSha256": sha256_file(stdout_path),
                "stderrPath": stderr_path.relative_to(output_root).as_posix(),
                "stderrSha256": sha256_file(stderr_path),
            })

        repeatable = (
            risk_runs[0]["sequenceShape"] == risk_runs[1]["sequenceShape"]
            and risk_runs[0]["sequenceShape"]
            and all(item["expectedFailureObserved"] for item in risk_runs)
            and all(item["passed"] for item in control_runs)
        )
        family_rows.append({
            "familyId": family["id"],
            "riskContract": family["risk"],
            "controlContract": family["control"],
            "invariant": family["invariant"],
            "expectedFailureReason": family["reason"],
            "riskRuns": risk_runs,
            "controlRuns": control_runs,
            "repeatable": bool(repeatable),
        })
        check(f"family:{family['id']}", repeatable)

    replay_rows: list[dict[str, Any]] = []
    for kind, contract in [("risk", "R44P41RiskReplay"), ("control", "R44P41ControlReplay")]:
        command = [str(forge), "test", "--use", str(solc), "--match-contract", contract, "-vv"]
        result = run(command, workspace, env, timeout=180)
        stdout_path = logs / f"{kind}-replay.stdout.log"
        stderr_path = logs / f"{kind}-replay.stderr.log"
        stdout_path.write_text(result.stdout, encoding="utf-8")
        stderr_path.write_text(result.stderr, encoding="utf-8")
        pass_count = len(re.findall(r"^\[PASS\]\s+test_", normalized_text(result.stdout + result.stderr), flags=re.MULTILINE))
        replay_rows.append({"kind": kind, "contract": contract, "exitCode": result.returncode, "passCount": pass_count, "required": 8, "passed": result.returncode == 0 and pass_count == 8, "stdoutPath": stdout_path.relative_to(output_root).as_posix(), "stdoutSha256": sha256_file(stdout_path), "stderrPath": stderr_path.relative_to(output_root).as_posix(), "stderrSha256": sha256_file(stderr_path)})
        check(f"replay:{kind}", result.returncode == 0 and pass_count == 8)

    # Local Anvil raw-RPC binding and deterministic replay.
    port = free_port()
    rpc_url = f"http://127.0.0.1:{port}"
    anvil_stdout_path = logs / "anvil.stdout.log"
    anvil_stderr_path = logs / "anvil.stderr.log"
    anvil_config_path = isolated_home / "anvil-ephemeral-config.json"
    with anvil_stdout_path.open("w", encoding="utf-8") as stdout_handle, anvil_stderr_path.open("w", encoding="utf-8") as stderr_handle:
        process = subprocess.Popen(
            [
                str(anvil),
                "--host", "127.0.0.1",
                "--port", str(port),
                "--chain-id", str(CHAIN_ID),
                "--mnemonic-random", "12",
                "--config-out", str(anvil_config_path),
                "--silent",
            ],
            cwd=workspace,
            env=env,
            text=True,
            stdout=stdout_handle,
            stderr=stderr_handle,
        )
    anvil_data: dict[str, Any] = {}
    sender_address = ""
    try:
        wait_rpc(rpc_url)
        for _ in range(50):
            if anvil_config_path.exists() and anvil_config_path.stat().st_size > 0:
                break
            time.sleep(0.1)
        config = json.loads(anvil_config_path.read_text(encoding="utf-8"))
        sender_address = str(config["available_accounts"][0])
        # Ephemeral mnemonic/private keys are never retained in evidence or MATERIALS.
        anvil_config_path.unlink(missing_ok=True)
        check("anvil-ephemeral-config-erased", not anvil_config_path.exists())
        chain = rpc(rpc_url, "eth_chainId", [], 10)
        write_json(rpc_root / "chain-id.json", chain)
        chain_id = int(chain["response"]["result"], 16)
        check("anvil-chain-id", chain_id == CHAIN_ID, chain_id)

        deployments: list[dict[str, Any]] = []
        for index, contract in enumerate(("RiskVault", "ControlVault"), start=1):
            create = run([str(forge), "create", "--use", str(solc), "--rpc-url", rpc_url, "--unlocked", "--from", sender_address, "--broadcast", "--json", f"src/R44P41InvariantTargets.sol:{contract}"], workspace, env, timeout=180)
            create_stdout = logs / f"anvil-{contract}.create.stdout.json"
            create_stderr = logs / f"anvil-{contract}.create.stderr.log"
            create_stdout.write_text(create.stdout, encoding="utf-8")
            create_stderr.write_text(create.stderr, encoding="utf-8")
            create_json = json.loads(create.stdout)
            address = create_json["deployedTo"]
            tx_hash = create_json["transactionHash"]
            raw_receipt = rpc(rpc_url, "eth_getTransactionReceipt", [tx_hash], 100 + index * 10)
            raw_tx = rpc(rpc_url, "eth_getTransactionByHash", [tx_hash], 101 + index * 10)
            block_number = raw_receipt["response"]["result"]["blockNumber"]
            raw_block = rpc(rpc_url, "eth_getBlockByNumber", [block_number, True], 102 + index * 10)
            raw_code = rpc(rpc_url, "eth_getCode", [address, "latest"], 103 + index * 10)
            for label, value in [("receipt", raw_receipt), ("transaction", raw_tx), ("block", raw_block), ("code", raw_code)]:
                write_json(rpc_root / f"{contract}.{label}.json", value)
            inspect = run([str(forge), "inspect", "--use", str(solc), f"src/R44P41InvariantTargets.sol:{contract}", "deployedBytecode"], workspace, env, timeout=180)
            expected_code = inspect.stdout.strip().lower()
            observed_code = raw_code["response"]["result"].lower()
            deployments.append({"contract": contract, "address": address, "transactionHash": tx_hash, "blockNumber": block_number, "expectedRuntimeBytecodeSha256": hashlib.sha256(bytes.fromhex(expected_code.removeprefix("0x"))).hexdigest(), "observedRuntimeBytecodeSha256": hashlib.sha256(bytes.fromhex(observed_code.removeprefix("0x"))).hexdigest(), "exactRuntimeBytecodeMatch": expected_code == observed_code, "receiptPath": (rpc_root / f"{contract}.receipt.json").relative_to(output_root).as_posix(), "transactionPath": (rpc_root / f"{contract}.transaction.json").relative_to(output_root).as_posix(), "blockPath": (rpc_root / f"{contract}.block.json").relative_to(output_root).as_posix(), "codePath": (rpc_root / f"{contract}.code.json").relative_to(output_root).as_posix()})
            check(f"anvil-code:{contract}", expected_code == observed_code)

        liabilities_selector = run([str(cast), "sig", "liabilities()"], workspace, env).stdout.strip()
        execution_rows: list[dict[str, Any]] = []
        for index, deployment in enumerate(deployments, start=1):
            address = deployment["address"]
            contract = deployment["contract"]
            deposit = run([str(cast), "send", "--rpc-url", rpc_url, "--unlocked", "--from", sender_address, "--value", "100", address, "deposit()", "--json"], workspace, env, timeout=60)
            withdraw = run([str(cast), "send", "--rpc-url", rpc_url, "--unlocked", "--from", sender_address, address, "withdraw(uint256)", "50", "--json"], workspace, env, timeout=60)
            deposit_json = json.loads(deposit.stdout)
            withdraw_json = json.loads(withdraw.stdout)
            write_json(rpc_root / f"{contract}.deposit.cast.json", deposit_json)
            write_json(rpc_root / f"{contract}.withdraw.cast.json", withdraw_json)
            for offset, tx_hash in enumerate((deposit_json["transactionHash"], withdraw_json["transactionHash"]), start=1):
                receipt = rpc(rpc_url, "eth_getTransactionReceipt", [tx_hash], 200 + index * 20 + offset)
                write_json(rpc_root / f"{contract}.execution-{offset}.receipt.json", receipt)
            balance_rpc = rpc(rpc_url, "eth_getBalance", [address, "latest"], 230 + index)
            liabilities_rpc = rpc(rpc_url, "eth_call", [{"to": address, "data": liabilities_selector}, "latest"], 240 + index)
            write_json(rpc_root / f"{contract}.final-balance.json", balance_rpc)
            write_json(rpc_root / f"{contract}.final-liabilities.json", liabilities_rpc)
            balance = int(balance_rpc["response"]["result"], 16)
            liabilities = int(liabilities_rpc["response"]["result"], 16)
            risk_expected = contract == "RiskVault"
            relation_ok = balance < liabilities if risk_expected else balance == liabilities
            execution_rows.append({"contract": contract, "depositTransactionHash": deposit_json["transactionHash"], "withdrawTransactionHash": withdraw_json["transactionHash"], "finalBalanceWei": balance, "finalLiabilitiesWei": liabilities, "riskExpected": risk_expected, "expectedRelationObserved": relation_ok})
            check(f"anvil-replay:{contract}", relation_ok, {"balance": balance, "liabilities": liabilities})

        anvil_data = {"classification": "LOCAL_ANVIL_RAW_RPC_ONLY", "chainId": chain_id, "rpcHost": "127.0.0.1", "portRedacted": True, "deployments": deployments, "executions": execution_rows, "realChainCredit": False, "forkReplayCredit": False, "externalRpcCredit": False}
    finally:
        anvil_config_path.unlink(missing_ok=True)
        if process.poll() is None:
            process.send_signal(signal.SIGTERM)
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)

    check("anvil-process-exit", process.returncode in (0, -signal.SIGTERM), process.returncode)

    # Execution copies and compiler caches are intentionally excluded from evidence packaging.
    shutil.rmtree(workspace, ignore_errors=True)
    shutil.rmtree(isolated_home, ignore_errors=True)

    failed_checks = [row for row in checks if not row["passed"]]
    toolchain = {
        "forge": {"version": forge_version.stdout.strip(), "sha256": sha256_file(forge)},
        "cast": {"version": cast_version.stdout.strip(), "sha256": sha256_file(cast)},
        "anvil": {"version": anvil_version.stdout.strip(), "sha256": sha256_file(anvil)},
        "solc": {"version": solc_version.stdout.strip(), "sha256": sha256_file(solc)},
        "officialFoundryBinaryRelease": "v1.7.1",
        "solidityCompiler": "0.8.24+commit.e11b9ed9",
    }
    receipt_path = output_root / "R44P41_FOUNDRY_INVARIANT_CAMPAIGN_RECEIPT.json"
    index = artifact_index(output_root, {receipt_path.name})
    receipt = {
        "schemaVersion": "velmere.pass36.a102r44p41.foundry-invariant-campaign.v1",
        "revisionId": REV,
        "status": "PASS_R44P41_OFFICIAL_FOUNDRY_INVARIANT_CAMPAIGN" if not failed_checks else "FAIL_R44P41_OFFICIAL_FOUNDRY_INVARIANT_CAMPAIGN",
        "classification": "OFFICIAL_FOUNDRY_LOCAL_INVARIANT_FUZZ_REPLAY_AND_ANVIL_RAW_RPC_ONLY",
        "sourceBinding": source_binding,
        "toolchain": toolchain,
        "campaign": {"seed": SEED, "families": family_rows, "familyCount": len(family_rows), "riskExpectedFailuresObserved": sum(all(run_row["expectedFailureObserved"] for run_row in row["riskRuns"]) for row in family_rows), "controlsPassed": sum(all(run_row["passed"] for run_row in row["controlRuns"]) for row in family_rows), "repeatableFamilies": sum(row["repeatable"] for row in family_rows), "riskReplaysPassed": replay_rows[0]["passCount"], "controlReplaysPassed": replay_rows[1]["passCount"], "invariantRunsPerControlRepetition": 256, "invariantDepth": 64, "replays": replay_rows},
        "localAnvil": anvil_data,
        "checks": {"total": len(checks), "passed": len(checks) - len(failed_checks), "failed": len(failed_checks), "rows": checks},
        "artifactIndex": index,
        "credits": {"officialFoundryExecutionCredit": not failed_checks, "localInvariantCredit": not failed_checks, "replayableCounterexampleCredit": not failed_checks, "localAnvilRawRpcCredit": not failed_checks, "forkReplayCredit": False, "realChainCredit": False, "independentGroundTruthCredit": False, "independentReviewerCredit": False, "customerCredit": False, "saleCredit": False, "liveCredit": False, "worldClassCredit": False},
        "truthBoundary": "This receipt proves an official Foundry v1.7.1 local invariant/fuzz campaign, deterministic risk counterexamples, control invariants, explicit replay tests and local Anvil raw JSON-RPC source/runtime binding on the exact R44P41 SOURCE. It does not prove real-chain execution, fork replay, independent ground truth, business-logic completeness, customer value, sale readiness, LIVE readiness or world-class accuracy.",
    }
    write_json(receipt_path, receipt)
    print(json.dumps({"status": receipt["status"], "families": len(family_rows), "riskExpectedFailuresObserved": receipt["campaign"]["riskExpectedFailuresObserved"], "controlsPassed": receipt["campaign"]["controlsPassed"], "repeatableFamilies": receipt["campaign"]["repeatableFamilies"], "riskReplaysPassed": receipt["campaign"]["riskReplaysPassed"], "controlReplaysPassed": receipt["campaign"]["controlReplaysPassed"], "checks": receipt["checks"], "receipt": str(receipt_path)}, indent=2))
    return 1 if failed_checks else 0


if __name__ == "__main__":
    raise SystemExit(main())
