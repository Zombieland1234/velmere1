#!/usr/bin/env python3
from __future__ import annotations

import csv
import datetime as dt
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import time
from collections import Counter
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parent
DATASET = ROOT / "smartbugs-curated"
OUT = ROOT / "evidence"
RECEIPTS = OUT / "receipts"
DATASET_COMMIT = "230e649123477eff332742a59a1c7cc6dc286cab"
EXPECTED_CASES = 69

CATEGORY_MAP_SLITHER: dict[str, set[str]] = {
    "reentrancy": {"reentrancy-eth", "reentrancy-no-eth", "reentrancy-benign", "reentrancy-events", "reentrancy-unlimited-gas"},
    "access_control": {"tx-origin", "suicidal", "unprotected-upgrade", "protected-vars", "arbitrary-send-eth", "controlled-delegatecall"},
    "arithmetic": {"divide-before-multiply", "incorrect-exp", "weak-prng"},
    "unchecked_low_level_calls": {"unchecked-lowlevel", "unchecked-send", "low-level-calls"},
    "denial_of_service": {"calls-loop", "msg-value-loop", "locked-ether", "costly-loop", "array-length-assignment"},
    "bad_randomness": {"weak-prng"},
    "front_running": {"timestamp", "weak-prng"},
    "time_manipulation": {"timestamp"},
    "short_addresses": set(),
    "other": {"suicidal", "arbitrary-send-eth", "weak-prng", "tx-origin"},
}

SEMGREP_RULES = r'''rules:
  - id: velmere-external-reentrancy-call-before-state
    languages: [generic]
    severity: ERROR
    message: External call surface requiring reentrancy review
    pattern-regex: '\\.(?:call|callcode|delegatecall)\\s*(?:\\{|\\()'
    metadata: {category: reentrancy}
  - id: velmere-external-tx-origin
    languages: [generic]
    severity: ERROR
    message: tx.origin authorization surface
    pattern-regex: '\\btx\\.origin\\b'
    metadata: {category: access_control}
  - id: velmere-external-selfdestruct
    languages: [generic]
    severity: ERROR
    message: destructive lifecycle surface
    pattern-regex: '\\b(?:selfdestruct|suicide)\\s*\\('
    metadata: {category: access_control}
  - id: velmere-external-delegatecall
    languages: [generic]
    severity: ERROR
    message: delegatecall surface
    pattern-regex: '\\.delegatecall\\s*\\('
    metadata: {category: access_control}
  - id: velmere-external-unchecked-low-level-call
    languages: [generic]
    severity: WARNING
    message: low-level call surface
    pattern-regex: '\\.(?:call|callcode|delegatecall|send)\\s*(?:\\{|\\()'
    metadata: {category: unchecked_low_level_calls}
  - id: velmere-external-loop-transfer
    languages: [generic]
    severity: WARNING
    message: loop with transfer/call surface
    patterns:
      - pattern-regex: '\\b(?:for|while)\\s*\\('
      - pattern-regex: '\\.(?:transfer|send|call)\\s*(?:\\{|\\()'
    metadata: {category: denial_of_service}
  - id: velmere-external-block-randomness
    languages: [generic]
    severity: ERROR
    message: miner-influenced randomness surface
    pattern-regex: '\\b(?:blockhash|block\\.(?:timestamp|number|difficulty)|now)\\b'
    metadata: {category: bad_randomness}
  - id: velmere-external-timestamp
    languages: [generic]
    severity: WARNING
    message: timestamp-dependent logic surface
    pattern-regex: '\\b(?:block\\.timestamp|now)\\b'
    metadata: {category: time_manipulation}
  - id: velmere-external-public-hash-commitment
    languages: [generic]
    severity: WARNING
    message: public hash commitment / ordering surface
    pattern-regex: '\\bkeccak256\\s*\\(|\\bsha3\\s*\\('
    metadata: {category: front_running}
  - id: velmere-external-arithmetic-operator
    languages: [generic]
    severity: INFO
    message: pre-0.8 arithmetic review surface
    pattern-regex: '[A-Za-z0-9_\\]\\)]\\s*(?:\\+|-|\\*)\\s*[A-Za-z0-9_(]'
    metadata: {category: arithmetic}
'''

CONTROL_SOURCES: dict[str, str] = {
    "control-01-auth.sol": "pragma solidity ^0.8.24; contract C { address immutable owner; constructor(){owner=msg.sender;} function set(uint x) external view returns(uint){require(msg.sender==owner);return x;} }",
    "control-02-vault.sol": "pragma solidity ^0.8.24; contract C { mapping(address=>uint) b; function deposit() external payable {b[msg.sender]+=msg.value;} function withdraw(uint a) external {require(b[msg.sender]>=a);b[msg.sender]-=a;(bool ok,)=msg.sender.call{value:a}(\"\");require(ok);} }",
    "control-03-quorum.sol": "pragma solidity ^0.8.24; contract C { uint immutable supply; constructor(uint s){supply=s;} function passed(uint v) external view returns(bool){return v*100>=supply*10;} }",
    "control-04-randomness.sol": "pragma solidity ^0.8.24; interface V{function request() external returns(uint);} contract C{V immutable v;constructor(V x){v=x;}function draw() external returns(uint){return v.request();}}",
    "control-05-timelock.sol": "pragma solidity ^0.8.24; contract C{function execute(uint deadline) external view{require(block.timestamp<=deadline);}}",
    "control-06-mint.sol": "pragma solidity ^0.8.24; contract C{address immutable owner;mapping(address=>uint)b;constructor(){owner=msg.sender;}function mint(address t,uint a) external{require(msg.sender==owner);b[t]+=a;}}",
    "control-07-call.sol": "pragma solidity ^0.8.24; contract C{function ping(address t,bytes calldata d) external{(bool ok,)=t.call(d);require(ok);}}",
    "control-08-loop.sol": "pragma solidity ^0.8.24; contract C{address[] u;function page(uint s,uint n) external view returns(address[] memory o){uint e=s+n;if(e>u.length)e=u.length;o=new address[](e-s);for(uint i=s;i<e;i++)o[i-s]=u[i];}}",
    "control-09-init.sol": "pragma solidity ^0.8.24; contract C{bool initialized;address owner;function initialize(address a) external{require(!initialized);initialized=true;owner=a;}}",
    "control-10-bridge.sol": "pragma solidity ^0.8.24; contract C{address immutable messenger;mapping(bytes32=>bool)e;constructor(address m){messenger=m;}function x(uint src,uint dst,uint nonce,bytes calldata p)external{require(msg.sender==messenger&&dst==block.chainid);bytes32 id=keccak256(abi.encode(src,dst,address(this),nonce,p));require(!e[id]);e[id]=true;}}",
    "control-11-shares.sol": "pragma solidity ^0.8.24; contract C{uint a;uint s;function deposit(uint x)external returns(uint m){m=s==0?x:x*s/a;require(m>0);a+=x;s+=m;}}",
    "control-12-policy.sol": "pragma solidity ^0.8.24; contract C{mapping(address=>bool)blocked;mapping(address=>uint)b;address owner;constructor(){owner=msg.sender;}function move(address f,address t,uint a)external{require(!blocked[f]&&!blocked[t]);require(msg.sender==f||msg.sender==owner);b[f]-=a;b[t]+=a;}}",
}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def run(cmd: list[str], *, cwd: pathlib.Path, timeout: int = 300) -> dict[str, Any]:
    env = {k: os.environ[k] for k in ("PATH", "HOME", "LANG", "LC_ALL", "TMPDIR", "VIRTUAL_ENV") if k in os.environ}
    env.update({"CI": "true", "NO_COLOR": "1", "SEMGREP_SEND_METRICS": "off", "SEMGREP_ENABLE_VERSION_CHECK": "0", "PYTHONHASHSEED": "0"})
    started = dt.datetime.now(dt.timezone.utc)
    t0 = time.monotonic()
    try:
        cp = subprocess.run(cmd, cwd=cwd, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout, check=False)
        return {"exitCode": cp.returncode, "timedOut": False, "stdout": cp.stdout, "stderr": cp.stderr, "startedAt": started.isoformat(), "durationMs": round((time.monotonic()-t0)*1000,3)}
    except subprocess.TimeoutExpired as exc:
        return {"exitCode": None, "timedOut": True, "stdout": exc.stdout or b"", "stderr": exc.stderr or b"", "startedAt": started.isoformat(), "durationMs": round((time.monotonic()-t0)*1000,3)}


def tool_identity(command: str, args: list[str]) -> dict[str, Any]:
    resolved = pathlib.Path(shutil.which(command) or "").resolve()
    if not resolved.is_file():
        raise RuntimeError(f"missing tool: {command}")
    result = run([str(resolved), *args], cwd=ROOT, timeout=60)
    return {"command": command, "path": str(resolved), "sha256": sha256_file(resolved), "exitCode": result["exitCode"], "versionOutput": (result["stdout"]+b"\n"+result["stderr"]).decode("utf-8","replace")[:4096]}


def normalize_dataset_path(raw: str) -> str:
    raw = raw.strip().split(" [MOVED TO:", 1)[0].strip()
    if raw.startswith("./"):
        raw = raw[2:]
    if raw.startswith("access_control/"):
        raw = "dataset/" + raw
    return raw


def load_cases() -> list[dict[str, Any]]:
    icse = (DATASET / "ICSE2020_curated_69.txt").read_text(encoding="utf-8")
    listed = [normalize_dataset_path(line) for line in icse.splitlines() if line.strip().startswith("./")]
    if len(listed) != EXPECTED_CASES:
        raise RuntimeError(f"ICSE denominator drift: {len(listed)}")
    vulns = json.loads((DATASET / "vulnerabilities.json").read_text(encoding="utf-8"))
    by_path = {row["path"]: row for row in vulns}
    versions: dict[str, str] = {}
    with (DATASET / "versions.csv").open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            versions[row["file"]] = row["compiled version"].strip()
    rows = []
    for path in listed:
        record = by_path.get(path)
        if not record:
            raise RuntimeError(f"missing vulnerability record: {path}")
        source_path = DATASET / path
        if not source_path.is_file():
            raise RuntimeError(f"missing source: {path}")
        categories = sorted({str(v["category"]) for v in record.get("vulnerabilities", [])})
        rows.append({"path": path, "name": source_path.name, "sourcePath": source_path, "sourceSha256": sha256_file(source_path), "sourceBytes": source_path.stat().st_size, "compilerVersion": versions.get(path) or record.get("pragma"), "labels": categories, "labelLines": [{"category": v["category"], "lines": v.get("lines", [])} for v in record.get("vulnerabilities", [])]})
    return rows


def install_compilers(cases: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    versions = sorted({row["compilerVersion"] for row in cases if row["compilerVersion"]})
    result: dict[str, dict[str, Any]] = {}
    for version in versions:
        install = run(["solc-select", "install", version], cwd=ROOT, timeout=600)
        result[version] = {"installExitCode": install["exitCode"], "installTimedOut": install["timedOut"], "stdoutSha256": sha256_bytes(install["stdout"]), "stderrSha256": sha256_bytes(install["stderr"])}
    return result


def use_compiler(version: str) -> dict[str, Any]:
    selected = run(["solc-select", "use", version], cwd=ROOT, timeout=120)
    version_result = run(["solc", "--version"], cwd=ROOT, timeout=60)
    return {"selectExitCode": selected["exitCode"], "versionExitCode": version_result["exitCode"], "versionOutput": (version_result["stdout"]+version_result["stderr"]).decode("utf-8","replace")[:1024], "solcPath": str(pathlib.Path(shutil.which("solc") or "").resolve())}


def sanitize_slither(output_path: pathlib.Path) -> dict[str, Any]:
    if not output_path.is_file():
        return {"jsonPresent": False, "detectors": []}
    try:
        parsed = json.loads(output_path.read_text(encoding="utf-8"))
    except Exception as exc:
        return {"jsonPresent": True, "parseError": type(exc).__name__, "detectors": []}
    detectors = []
    for row in parsed.get("results", {}).get("detectors", []) or []:
        lines = sorted({int(line) for element in row.get("elements", []) or [] for line in element.get("source_mapping", {}).get("lines", []) or [] if isinstance(line, int)})
        detectors.append({"check": str(row.get("check", "")), "impact": str(row.get("impact", "")), "confidence": str(row.get("confidence", "")), "lines": lines})
    return {"jsonPresent": True, "success": parsed.get("success"), "error": parsed.get("error"), "detectors": detectors}


def sanitize_semgrep(output_path: pathlib.Path) -> dict[str, Any]:
    if not output_path.is_file():
        return {"jsonPresent": False, "results": [], "errors": []}
    try:
        parsed = json.loads(output_path.read_text(encoding="utf-8"))
    except Exception as exc:
        return {"jsonPresent": True, "parseError": type(exc).__name__, "results": [], "errors": []}
    rows = []
    for row in parsed.get("results", []) or []:
        extra = row.get("extra", {}) or {}
        rows.append({"checkId": str(row.get("check_id", "")), "path": str(row.get("path", "")), "startLine": row.get("start", {}).get("line"), "endLine": row.get("end", {}).get("line"), "severity": str(extra.get("severity", "")), "message": str(extra.get("message", ""))[:300], "category": str((extra.get("metadata") or {}).get("category", ""))})
    return {"jsonPresent": True, "results": rows, "errors": [{"type": str(e.get("type", "")), "message": str(e.get("message", ""))[:300]} for e in parsed.get("errors", []) or []]}


def categories_from_slither(detectors: list[dict[str, Any]]) -> set[str]:
    checks = {row["check"] for row in detectors}
    return {category for category, mapped in CATEGORY_MAP_SLITHER.items() if checks & mapped}


def categories_from_semgrep(results: list[dict[str, Any]]) -> set[str]:
    return {row["category"] for row in results if row.get("category")}


def process_case(case: dict[str, Any], semgrep_rules: pathlib.Path) -> dict[str, Any]:
    case_id = re.sub(r"[^A-Za-z0-9_.-]", "_", case["path"])
    case_dir = OUT / "work" / case_id
    if case_dir.exists():
        shutil.rmtree(case_dir)
    case_dir.mkdir(parents=True)
    source_copy = case_dir / "Case.sol"
    shutil.copy2(case["sourcePath"], source_copy)
    compiler = use_compiler(case["compilerVersion"])
    compile_run = run(["solc", "--bin", str(source_copy)], cwd=case_dir, timeout=180)
    slither_json = case_dir / "slither.json"
    slither_run = run(["slither", str(source_copy), "--solc", compiler["solcPath"], "--json", str(slither_json), "--disable-color"], cwd=case_dir, timeout=300)
    slither = sanitize_slither(slither_json)
    semgrep_json = case_dir / "semgrep.json"
    semgrep_run = run(["semgrep", "scan", "--config", str(semgrep_rules), "--json", "--output", str(semgrep_json), "--metrics", "off", str(source_copy)], cwd=case_dir, timeout=180)
    semgrep = sanitize_semgrep(semgrep_json)
    slither_categories = categories_from_slither(slither.get("detectors", []))
    semgrep_categories = categories_from_semgrep(semgrep.get("results", []))
    union_categories = slither_categories | semgrep_categories
    labels = set(case["labels"])
    hits = labels & union_categories
    receipt = {
        "schemaVersion": "velmere.pass36.a102r44p13.external-labeled-case.v1",
        "caseId": case_id,
        "datasetPath": case["path"],
        "datasetCommit": DATASET_COMMIT,
        "sourceSha256": case["sourceSha256"],
        "sourceBytes": case["sourceBytes"],
        "compilerVersion": case["compilerVersion"],
        "labels": case["labels"],
        "labelLines": case["labelLines"],
        "compiler": compiler,
        "compile": {"exitCode": compile_run["exitCode"], "timedOut": compile_run["timedOut"], "stdoutBytes": len(compile_run["stdout"]), "stdoutSha256": sha256_bytes(compile_run["stdout"]), "stderrBytes": len(compile_run["stderr"]), "stderrSha256": sha256_bytes(compile_run["stderr"])},
        "slither": {"exitCode": slither_run["exitCode"], "timedOut": slither_run["timedOut"], "stdoutBytes": len(slither_run["stdout"]), "stdoutSha256": sha256_bytes(slither_run["stdout"]), "stderrBytes": len(slither_run["stderr"]), "stderrSha256": sha256_bytes(slither_run["stderr"]), "sanitized": slither},
        "semgrep": {"exitCode": semgrep_run["exitCode"], "timedOut": semgrep_run["timedOut"], "stdoutBytes": len(semgrep_run["stdout"]), "stdoutSha256": sha256_bytes(semgrep_run["stdout"]), "stderrBytes": len(semgrep_run["stderr"]), "stderrSha256": sha256_bytes(semgrep_run["stderr"]), "sanitized": semgrep},
        "predictedCategories": {"slither": sorted(slither_categories), "semgrep": sorted(semgrep_categories), "union": sorted(union_categories)},
        "matchedLabels": sorted(hits),
        "allLabelsMatched": labels <= union_categories,
        "anyLabelMatched": bool(hits),
        "additionalUnlabeledSignals": sorted(union_categories - labels),
        "truthBoundary": {"externalPublicLabeledCorpus": True, "independentOfVelmereFixtureDesign": True, "commercialRedistributionRightsApproved": False, "sourceRedistributedInEvidence": False, "formalFalsePositiveCredit": False, "severityAccuracyCredit": False, "customerCredit": False, "saleCredit": False, "liveCredit": False},
    }
    RECEIPTS.mkdir(parents=True, exist_ok=True)
    receipt_path = RECEIPTS / f"{case_id}.json"
    receipt_path.write_text(json.dumps(receipt, indent=2, sort_keys=True)+"\n", encoding="utf-8")
    return receipt


def process_controls(semgrep_rules: pathlib.Path) -> list[dict[str, Any]]:
    controls_root = OUT / "controls"
    controls_root.mkdir(parents=True, exist_ok=True)
    use_compiler("0.8.24")
    rows = []
    for name, source in CONTROL_SOURCES.items():
        path = controls_root / name
        path.write_text(source+"\n", encoding="utf-8")
        slither_json = controls_root / f"{name}.slither.json"
        slither_run = run(["slither", str(path), "--json", str(slither_json), "--disable-color"], cwd=controls_root, timeout=300)
        slither = sanitize_slither(slither_json)
        semgrep_json = controls_root / f"{name}.semgrep.json"
        semgrep_run = run(["semgrep", "scan", "--config", str(semgrep_rules), "--json", "--output", str(semgrep_json), "--metrics", "off", str(path)], cwd=controls_root, timeout=180)
        semgrep = sanitize_semgrep(semgrep_json)
        predicted = categories_from_slither(slither.get("detectors", [])) | categories_from_semgrep(semgrep.get("results", []))
        rows.append({"controlId": name, "sourceSha256": sha256_file(path), "sourceBytes": path.stat().st_size, "predictedCategories": sorted(predicted), "flagged": bool(predicted), "slitherExitCode": slither_run["exitCode"], "semgrepExitCode": semgrep_run["exitCode"]})
    return rows


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    semgrep_rules = ROOT / "smartbugs-semgrep-rules.yml"
    semgrep_rules.write_text(SEMGREP_RULES, encoding="utf-8")
    if not DATASET.is_dir():
        raise RuntimeError("dataset clone missing")
    commit = run(["git", "rev-parse", "HEAD"], cwd=DATASET, timeout=60)
    actual_commit = commit["stdout"].decode().strip()
    if actual_commit != DATASET_COMMIT:
        raise RuntimeError(f"dataset commit mismatch: {actual_commit}")
    cases = load_cases()
    tool_identities = {
        "python": {"version": sys.version.split()[0], "executable": sys.executable, "sha256": sha256_file(pathlib.Path(sys.executable).resolve())},
        "slither": tool_identity("slither", ["--version"]),
        "semgrep": tool_identity("semgrep", ["--version"]),
        "solcSelect": tool_identity("solc-select", ["--version"]),
    }
    compiler_install = install_compilers(cases + [{"compilerVersion":"0.8.24"}])
    receipts = []
    for index, case in enumerate(cases, 1):
        print(f"[{index:02d}/{len(cases)}] {case['path']} ({case['compilerVersion']})", flush=True)
        receipts.append(process_case(case, semgrep_rules))
    controls = process_controls(semgrep_rules)
    label_counts = Counter(label for row in receipts for label in row["labels"])
    label_hits_any = Counter(label for row in receipts for label in row["labels"] if label in row["predictedCategories"]["union"])
    label_hits_slither = Counter(label for row in receipts for label in row["labels"] if label in row["predictedCategories"]["slither"])
    label_hits_semgrep = Counter(label for row in receipts for label in row["labels"] if label in row["predictedCategories"]["semgrep"])
    per_category = {}
    for category in sorted(label_counts):
        total = label_counts[category]
        per_category[category] = {"labeledCases": total, "slitherHits": label_hits_slither[category], "semgrepHits": label_hits_semgrep[category], "unionHits": label_hits_any[category], "slitherRecall": round(label_hits_slither[category]/total, 6), "semgrepRecall": round(label_hits_semgrep[category]/total, 6), "unionRecall": round(label_hits_any[category]/total, 6)}
    total_label_instances = sum(label_counts.values())
    union_label_hits = sum(label_hits_any.values())
    any_case_hits = sum(1 for r in receipts if r["anyLabelMatched"])
    all_case_hits = sum(1 for r in receipts if r["allLabelsMatched"])
    compile_success = sum(1 for r in receipts if r["compile"]["exitCode"] == 0)
    slither_json_success = sum(1 for r in receipts if r["slither"]["sanitized"].get("jsonPresent") and not r["slither"]["sanitized"].get("parseError"))
    semgrep_success = sum(1 for r in receipts if r["semgrep"]["sanitized"].get("jsonPresent") and not r["semgrep"]["sanitized"].get("parseError"))
    flagged_controls = sum(1 for r in controls if r["flagged"])
    ledger = {
        "schemaVersion": "velmere.pass36.a102r44p13.external-labeled-accuracy-ledger.v1",
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "dataset": {"repository": "smartbugs/smartbugs-curated", "commit": DATASET_COMMIT, "selection": "ICSE2020_curated_69.txt", "cases": len(cases), "sourceFilesRedistributed": 0, "licenseBoundary": "Original contracts retain original licenses; benchmark evidence stores hashes, labels and sanitized tool results only."},
        "tools": tool_identities,
        "compilerInstall": compiler_install,
        "denominators": {"cases": len(cases), "labelInstances": total_label_instances, "controls": len(controls), "categories": len(label_counts)},
        "execution": {"compileSuccess": compile_success, "slitherSanitizedResults": slither_json_success, "semgrepSanitizedResults": semgrep_success},
        "metrics": {"contractAnyLabelRecall": round(any_case_hits/len(cases), 6), "contractAllLabelsRecall": round(all_case_hits/len(cases), 6), "labelInstanceRecall": round(union_label_hits/total_label_instances, 6), "controlFlagRate": round(flagged_controls/len(controls), 6), "flaggedControls": flagged_controls},
        "perCategory": per_category,
        "controls": controls,
        "cases": [{"caseId": r["caseId"], "datasetPath": r["datasetPath"], "sourceSha256": r["sourceSha256"], "compilerVersion": r["compilerVersion"], "labels": r["labels"], "predictedCategories": r["predictedCategories"], "matchedLabels": r["matchedLabels"], "anyLabelMatched": r["anyLabelMatched"], "allLabelsMatched": r["allLabelsMatched"], "additionalUnlabeledSignals": r["additionalUnlabeledSignals"], "receiptSha256": sha256_file(RECEIPTS/f"{r['caseId']}.json")} for r in receipts],
        "truthBoundary": {"externalLabeledRecallBaseline": True, "independentDatasetDesign": True, "formalPrecision": False, "reasonFormalPrecisionUnavailable": "SmartBugs labels are vulnerability labels, not an exhaustive declaration that all other tool signals are false positives.", "controlFlagRateIsProjectOwnedControlsOnly": True, "severityCalibration": False, "businessLogicCoverage": False, "modernProtocolRepresentativeness": False, "commercialRightsApproved": False, "customerCredit": False, "paidTierCredit": False, "liveCredit": False, "worldClassProven": False},
    }
    ledger_path = OUT / "R44P13_EXTERNAL_LABELED_ACCURACY_LEDGER.json"
    ledger_path.write_text(json.dumps(ledger, indent=2, sort_keys=True)+"\n", encoding="utf-8")
    summary = {"status":"PASS_EXTERNAL_BASELINE_EXECUTED", "cases":len(cases), "labelInstances":total_label_instances, "compileSuccess":compile_success, "contractAnyLabelRecall":ledger["metrics"]["contractAnyLabelRecall"], "contractAllLabelsRecall":ledger["metrics"]["contractAllLabelsRecall"], "labelInstanceRecall":ledger["metrics"]["labelInstanceRecall"], "controls":len(controls), "flaggedControls":flagged_controls, "controlFlagRate":ledger["metrics"]["controlFlagRate"], "ledgerSha256":sha256_file(ledger_path)}
    (OUT / "R44P13_EXTERNAL_LABELED_ACCURACY_SUMMARY.json").write_text(json.dumps(summary, indent=2, sort_keys=True)+"\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
