#!/usr/bin/env python3
from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import time
import urllib.request
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parent
EVIDENCE = ROOT / "evidence"
PROJECT = EVIDENCE / "foundry-project"
RECEIPTS = EVIDENCE / "receipts"
RAW = EVIDENCE / "raw"
RPC_URL = os.environ.get("VELMERE_ANVIL_RPC", "http://127.0.0.1:8545")
CHAIN_ID = 31337
PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
DEPLOYER_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
EXPECTED_SOLC = "0.8.24"
EXPECTED_FORGE = "1.2.3"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def canonical_json_sha(value: Any) -> str:
    return sha256_bytes(json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8"))


def run(cmd: list[str], cwd: pathlib.Path, timeout: int = 240, check: bool = False) -> subprocess.CompletedProcess[bytes]:
    env = {
        "PATH": os.environ.get("PATH", ""),
        "HOME": os.environ.get("HOME", ""),
        "LANG": "C.UTF-8",
        "LC_ALL": "C.UTF-8",
        "NO_COLOR": "1",
        "CI": "true",
    }
    cp = subprocess.run(cmd, cwd=cwd, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout, check=False)
    if check and cp.returncode != 0:
        raise RuntimeError(f"command failed {cp.returncode}: {cmd}\nSTDOUT={cp.stdout[-4000:]!r}\nSTDERR={cp.stderr[-4000:]!r}")
    return cp


def rpc(method: str, params: list[Any]) -> Any:
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode("utf-8")
    req = urllib.request.Request(RPC_URL, data=body, headers={"content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if payload.get("error"):
        raise RuntimeError(f"RPC {method} failed: {payload['error']}")
    return payload.get("result")


def wait_for_anvil() -> None:
    for _ in range(120):
        try:
            if int(rpc("eth_chainId", []), 16) == CHAIN_ID:
                return
        except Exception:
            time.sleep(0.25)
    raise RuntimeError("anvil did not become ready")


def tool_identity(name: str, version_args: list[str]) -> dict[str, Any]:
    path = shutil.which(name)
    if not path:
        raise RuntimeError(f"missing tool {name}")
    real = pathlib.Path(path).resolve()
    cp = run([str(real), *version_args], ROOT, timeout=60, check=True)
    text = (cp.stdout + b"\n" + cp.stderr).decode("utf-8", "replace")
    return {
        "name": name,
        "path": str(real),
        "sha256": sha256_file(real),
        "versionOutput": text[:4096],
        "versionOutputSha256": sha256_bytes(cp.stdout + b"\n" + cp.stderr),
    }


def reconstruct_corpus() -> tuple[dict[str, Any], dict[str, dict[str, Any]]]:
    cases: list[dict[str, Any]] = []
    for path in sorted(ROOT.glob("contracts-batch-*.json")):
        cases.extend(json.loads(path.read_text(encoding="utf-8")))
    if len(cases) != 50 or len({x["case_id"] for x in cases}) != 50:
        raise RuntimeError("corpus denominator mismatch")
    corpus = {"schemaVersion": "velmere.r44p8.local-deployed-corpus.v1", "caseCount": 50, "cases": cases}
    targets_doc = json.loads((ROOT / "deployment-targets.json").read_text(encoding="utf-8"))
    targets = {x["case_id"]: x for x in targets_doc["cases"]}
    if set(targets) != {x["case_id"] for x in cases}:
        raise RuntimeError("deployment target path-set mismatch")
    return corpus, targets


def prepare_project(corpus: dict[str, Any], solc_path: pathlib.Path) -> dict[str, dict[str, Any]]:
    if PROJECT.exists():
        shutil.rmtree(PROJECT)
    (PROJECT / "src").mkdir(parents=True)
    metadata: dict[str, dict[str, Any]] = {}
    for case in corpus["cases"]:
        case_id = case["case_id"]
        file_name = f"Case{case_id}.sol"
        path = PROJECT / "src" / file_name
        path.write_text(case["source"], encoding="utf-8", newline="\n")
        actual = sha256_file(path)
        if actual != case["sha256"]:
            raise RuntimeError(f"source hash mismatch {case_id}: {actual} != {case['sha256']}")
        metadata[case_id] = {**case, "sourceRelativePath": f"src/{file_name}", "sourcePath": str(path)}
    (PROJECT / "foundry.toml").write_text(
        "[profile.default]\n"
        "src = 'src'\n"
        "out = 'out'\n"
        "cache_path = 'cache'\n"
        "build_info = true\n"
        f"solc = '{solc_path.as_posix()}'\n"
        "optimizer = true\n"
        "optimizer_runs = 200\n"
        "evm_version = 'cancun'\n"
        "bytecode_hash = 'ipfs'\n"
        "cbor_metadata = true\n",
        encoding="utf-8",
    )
    return metadata


def parse_last_json(data: bytes) -> dict[str, Any]:
    text = data.decode("utf-8", "replace").strip()
    try:
        value = json.loads(text)
        if isinstance(value, dict):
            return value
    except json.JSONDecodeError:
        pass
    starts = [m.start() for m in re.finditer(r"\{", text)]
    for pos in reversed(starts):
        try:
            value = json.loads(text[pos:])
            if isinstance(value, dict):
                return value
        except json.JSONDecodeError:
            continue
    raise RuntimeError(f"no JSON object in command output: {text[-2000:]}")


def resolve_constructor_args(values: list[str]) -> list[str]:
    return [DEPLOYER_ADDRESS if x == "DEPLOYER_ADDRESS" else x for x in values]


def mask_ranges(hex_string: str, ranges: list[dict[str, int]]) -> str:
    raw = bytearray.fromhex(hex_string.removeprefix("0x"))
    for item in ranges:
        start = int(item["start"])
        length = int(item["length"])
        if start < 0 or length < 0 or start + length > len(raw):
            raise RuntimeError(f"invalid immutable range: {item} for {len(raw)} bytes")
        raw[start:start + length] = b"\x00" * length
    return raw.hex()


def artifact_for(source_name: str, contract: str) -> pathlib.Path:
    path = PROJECT / "out" / source_name / f"{contract}.json"
    if not path.is_file():
        raise RuntimeError(f"artifact missing: {path}")
    return path


def deploy_one(case: dict[str, Any], target: dict[str, Any], identities: dict[str, Any]) -> dict[str, Any]:
    case_id = case["case_id"]
    source_name = pathlib.Path(case["sourceRelativePath"]).name
    contract = target["contract"]
    constructor_args = resolve_constructor_args(target.get("constructor", []))
    target_ref = f"{case['sourceRelativePath']}:{contract}"
    cmd = [
        "forge", "create", target_ref,
        "--root", str(PROJECT),
        "--rpc-url", RPC_URL,
        "--private-key", PRIVATE_KEY,
        "--broadcast",
        "--json",
    ]
    if constructor_args:
        cmd.extend(["--constructor-args", *constructor_args])
    started = dt.datetime.now(dt.timezone.utc)
    t0 = time.monotonic()
    cp = run(cmd, PROJECT, timeout=300)
    duration_ms = round((time.monotonic() - t0) * 1000, 3)
    raw_dir = RAW / case_id
    raw_dir.mkdir(parents=True, exist_ok=True)
    (raw_dir / "forge-create.stdout.bin").write_bytes(cp.stdout)
    (raw_dir / "forge-create.stderr.bin").write_bytes(cp.stderr)
    if cp.returncode != 0:
        raise RuntimeError(f"forge create failed for {case_id}: {cp.stderr[-4000:]!r}")
    result = parse_last_json(cp.stdout)
    address = result.get("deployedTo") or result.get("deployed_to") or result.get("contractAddress")
    tx_hash = result.get("transactionHash") or result.get("transaction_hash") or result.get("txHash")
    if not address or not tx_hash:
        raise RuntimeError(f"deployment output missing address/tx for {case_id}: {result}")
    tx = rpc("eth_getTransactionByHash", [tx_hash])
    receipt = rpc("eth_getTransactionReceipt", [tx_hash])
    code = rpc("eth_getCode", [address, "latest"])
    block = rpc("eth_getBlockByNumber", [receipt["blockNumber"], False])
    if receipt.get("status") != "0x1":
        raise RuntimeError(f"deployment reverted for {case_id}")
    if code in (None, "0x", "0x0"):
        raise RuntimeError(f"empty deployed code for {case_id}")

    artifact_path = artifact_for(source_name, contract)
    artifact = json.loads(artifact_path.read_text(encoding="utf-8"))
    creation_hex = artifact["bytecode"]["object"]
    expected_runtime_hex = artifact["deployedBytecode"]["object"]
    abi = artifact["abi"]
    immutable_refs_raw = artifact.get("deployedBytecode", {}).get("immutableReferences", {}) or {}
    immutable_ranges = [item for values in immutable_refs_raw.values() for item in values]
    link_refs = artifact.get("bytecode", {}).get("linkReferences", {}) or {}
    deployed_link_refs = artifact.get("deployedBytecode", {}).get("linkReferences", {}) or {}
    if link_refs or deployed_link_refs:
        raise RuntimeError(f"unexpected external library link references for {case_id}")

    constructor_encoded = ""
    if constructor_args:
        if len(constructor_args) != 1:
            raise RuntimeError(f"unsupported constructor arity for {case_id}")
        enc = run(["cast", "abi-encode", "f(address)", constructor_args[0]], PROJECT, timeout=60, check=True)
        constructor_encoded = enc.stdout.decode("utf-8").strip().removeprefix("0x")
    expected_creation_input = "0x" + creation_hex + constructor_encoded
    actual_input = tx.get("input") or tx.get("data")
    creation_match = actual_input.lower() == expected_creation_input.lower()

    actual_runtime_hex = code.removeprefix("0x")
    expected_masked = mask_ranges(expected_runtime_hex, immutable_ranges)
    actual_masked = mask_ranges(actual_runtime_hex, immutable_ranges)
    runtime_match = actual_masked.lower() == expected_masked.lower()
    if not creation_match or not runtime_match:
        raise RuntimeError(
            f"reproduction mismatch {case_id}: creation={creation_match}, runtime={runtime_match}, "
            f"expectedCreation={len(expected_creation_input)}, actualCreation={len(actual_input or '')}, "
            f"expectedRuntime={len(expected_runtime_hex)}, actualRuntime={len(actual_runtime_hex)}"
        )

    receipt_row = {
        "schemaVersion": "velmere.r44p8.local-deployed-reproduction.v1",
        "caseId": case_id,
        "sourceFilename": case["filename"],
        "sourceRelativePath": case["sourceRelativePath"],
        "sourceSha256": case["sha256"],
        "inputClass": case["input_class"],
        "rightsBasis": case["rights_basis"],
        "deploymentClass": "LOCAL_EPHEMERAL_ANVIL_PROJECT_OWNED_BENCHMARK",
        "chainId": CHAIN_ID,
        "blockNumber": int(receipt["blockNumber"], 16),
        "blockHash": receipt["blockHash"],
        "blockTimestamp": int(block["timestamp"], 16),
        "contract": contract,
        "contractAddress": address,
        "deployerAddress": DEPLOYER_ADDRESS,
        "transactionHash": tx_hash,
        "transactionStatus": 1,
        "gasUsed": int(receipt["gasUsed"], 16),
        "constructorArgs": constructor_args,
        "sourceToCreationInputReproduction": creation_match,
        "runtimeBytecodeReproductionMaskedImmutables": runtime_match,
        "immutableRanges": immutable_ranges,
        "creationInputBytes": (len(expected_creation_input) - 2) // 2,
        "runtimeBytecodeBytes": len(actual_runtime_hex) // 2,
        "creationInputSha256": sha256_bytes(bytes.fromhex(expected_creation_input.removeprefix("0x"))),
        "deployedRuntimeSha256": sha256_bytes(bytes.fromhex(actual_runtime_hex)),
        "maskedRuntimeSha256": sha256_bytes(bytes.fromhex(actual_masked)),
        "abiSha256": canonical_json_sha(abi),
        "artifactPath": str(artifact_path.relative_to(PROJECT)),
        "artifactSha256": sha256_file(artifact_path),
        "compilerSettingsSha256": canonical_json_sha(artifact.get("metadata", "")),
        "toolIdentities": identities,
        "startedAt": started.isoformat(),
        "durationMs": duration_ms,
        "officialDeploymentExecutionCredit": True,
        "realExternalDeployedContractAuditCredit": False,
        "customerCredit": False,
        "independentAdjudicationCredit": False,
        "liveCredit": False,
        "saleCredit": False,
    }
    RECEIPTS.mkdir(parents=True, exist_ok=True)
    receipt_path = RECEIPTS / f"{case_id}.json"
    receipt_path.write_text(json.dumps(receipt_row, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    receipt_row["receiptPath"] = str(receipt_path.relative_to(ROOT))
    receipt_row["receiptSha256"] = sha256_file(receipt_path)
    return receipt_row


def main() -> int:
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    corpus, targets = reconstruct_corpus()
    solc_env = os.environ.get("VELMERE_SOLC_BINARY")
    if not solc_env:
        raise RuntimeError("VELMERE_SOLC_BINARY is required")
    solc_path = pathlib.Path(solc_env).resolve()
    if not solc_path.is_file():
        raise RuntimeError(f"solc binary missing: {solc_path}")
    identities = {
        "solc": {
            **tool_identity(str(solc_path), ["--version"]),
            "expectedVersion": EXPECTED_SOLC,
        },
        "forge": {
            **tool_identity("forge", ["--version"]),
            "expectedVersion": EXPECTED_FORGE,
        },
        "cast": tool_identity("cast", ["--version"]),
        "anvil": tool_identity("anvil", ["--version"]),
    }
    if EXPECTED_SOLC not in identities["solc"]["versionOutput"]:
        raise RuntimeError("solc version mismatch")
    if EXPECTED_FORGE not in identities["forge"]["versionOutput"]:
        raise RuntimeError("forge version mismatch")

    case_meta = prepare_project(corpus, solc_path)
    build = run(["forge", "build", "--root", str(PROJECT), "--force", "--build-info"], PROJECT, timeout=600)
    (EVIDENCE / "forge-build.stdout.bin").write_bytes(build.stdout)
    (EVIDENCE / "forge-build.stderr.bin").write_bytes(build.stderr)
    if build.returncode != 0:
        raise RuntimeError(f"forge build failed: {build.stderr[-8000:]!r}")

    anvil_log = (EVIDENCE / "anvil.log").open("wb")
    anvil = subprocess.Popen(
        [
            "anvil", "--host", "127.0.0.1", "--port", "8545",
            "--chain-id", str(CHAIN_ID), "--hardfork", "cancun",
            "--mnemonic", "test test test test test test test test test test test junk",
            "--silent",
        ],
        cwd=PROJECT,
        env={"PATH": os.environ.get("PATH", ""), "HOME": os.environ.get("HOME", ""), "NO_COLOR": "1"},
        stdout=anvil_log,
        stderr=subprocess.STDOUT,
    )
    try:
        wait_for_anvil()
        genesis = rpc("eth_getBlockByNumber", ["0x0", False])
        rows: list[dict[str, Any]] = []
        for index, case in enumerate(corpus["cases"], 1):
            case_id = case["case_id"]
            print(f"[{index:02d}/50] deploy and reproduce {case['filename']}", flush=True)
            rows.append(deploy_one(case_meta[case_id], targets[case_id], identities))
        unique_addresses = {r["contractAddress"].lower() for r in rows}
        unique_txs = {r["transactionHash"].lower() for r in rows}
        summary = {
            "schemaVersion": "velmere.r44p8.local-deployed-reproduction-ledger.v1",
            "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
            "chain": {
                "class": "LOCAL_EPHEMERAL_ANVIL",
                "chainId": CHAIN_ID,
                "genesisHash": genesis["hash"],
                "genesisTimestamp": int(genesis["timestamp"], 16),
            },
            "caseCount": 50,
            "deploymentExecutionsRequired": 50,
            "deploymentExecutionsCompleted": len(rows),
            "uniqueContractAddresses": len(unique_addresses),
            "uniqueTransactionHashes": len(unique_txs),
            "sourceToCreationInputReproductions": sum(1 for r in rows if r["sourceToCreationInputReproduction"]),
            "runtimeBytecodeReproductions": sum(1 for r in rows if r["runtimeBytecodeReproductionMaskedImmutables"]),
            "projectOwnedRightsRows": sum(1 for r in rows if r["rightsBasis"] == "PROJECT_OWNED_FIXTURE_MIT"),
            "realExternalDeployedContractAuditCredit": 0,
            "independentAdjudicationCredit": 0,
            "customerCredit": 0,
            "liveCredit": 0,
            "rows": rows,
        }
        required = (
            len(rows) == 50
            and len(unique_addresses) == 50
            and len(unique_txs) == 50
            and summary["sourceToCreationInputReproductions"] == 50
            and summary["runtimeBytecodeReproductions"] == 50
            and summary["projectOwnedRightsRows"] == 50
        )
        summary["status"] = "PASS_LOCAL_DEPLOYED_REPRODUCTION_50_OF_50" if required else "FAIL"
        ledger_path = EVIDENCE / "LOCAL_DEPLOYED_REPRODUCTION_LEDGER.json"
        ledger_path.write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        manifest_rows = []
        for path in sorted(x for x in EVIDENCE.rglob("*") if x.is_file()):
            if path == EVIDENCE / "EVIDENCE_FILE_MANIFEST.json":
                continue
            manifest_rows.append({
                "path": str(path.relative_to(EVIDENCE)),
                "bytes": path.stat().st_size,
                "sha256": sha256_file(path),
            })
        manifest = {
            "schemaVersion": "velmere.r44p8.local-deployed-evidence-manifest.v1",
            "fileCount": len(manifest_rows),
            "files": manifest_rows,
        }
        (EVIDENCE / "EVIDENCE_FILE_MANIFEST.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(json.dumps({k: summary[k] for k in (
            "status", "deploymentExecutionsCompleted", "uniqueContractAddresses",
            "uniqueTransactionHashes", "sourceToCreationInputReproductions",
            "runtimeBytecodeReproductions", "projectOwnedRightsRows",
            "realExternalDeployedContractAuditCredit"
        )}, indent=2))
        return 0 if required else 1
    finally:
        anvil.terminate()
        try:
            anvil.wait(timeout=10)
        except subprocess.TimeoutExpired:
            anvil.kill()
            anvil.wait(timeout=5)
        anvil_log.close()


if __name__ == "__main__":
    raise SystemExit(main())
