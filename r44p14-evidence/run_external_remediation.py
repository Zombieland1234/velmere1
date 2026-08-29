#!/usr/bin/env python3
from __future__ import annotations

import datetime as dt
import hashlib
import json
import pathlib
import re
import subprocess
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parent
DATASET = ROOT / "smartbugs-curated"
BASELINE_PATH = ROOT / "R44P14_R44P13_BASELINE_SNAPSHOT.json"
ANALYZE_HELPER = ROOT / "analyze_file.mjs"
OUT = ROOT / "evidence"
RECEIPTS = OUT / "receipts"
EXPECTED_DATASET_COMMIT = "230e649123477eff332742a59a1c7cc6dc286cab"
EXPECTED_CASES = 69
EXPECTED_CONTROLS = 12

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


def version_tuple(source: str) -> tuple[int, int, int] | None:
    match = re.search(r"\bpragma\s+solidity\s+[^;]*?(\d+)\.(\d+)\.(\d+)", source)
    if not match:
        return None
    return tuple(int(x) for x in match.groups())


def analyze(path: pathlib.Path) -> dict[str, Any]:
    cp = subprocess.run(["node", str(ANALYZE_HELPER), str(path)], cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60, check=False)
    if cp.returncode != 0:
        raise RuntimeError(f"analyzer failed for {path}: {cp.stderr.decode('utf-8','replace')[-2000:]}")
    parsed = json.loads(cp.stdout)
    if parsed.get("compilerAstCredit") is not False:
        raise RuntimeError("structured analyzer must not claim compiler AST credit")
    if parsed.get("analyzerClass") != "STRUCTURED_TOKEN_CONTROL_FLOW_V2_NOT_COMPILER_AST":
        raise RuntimeError(f"unexpected analyzer class: {parsed.get('analyzerClass')}")
    return parsed


def triage(source: str, baseline: list[str], analysis: dict[str, Any]) -> tuple[list[str], list[str], list[str]]:
    signals = {str(x) for x in analysis.get("signals", [])}
    structured_categories = {str(x.get("category")) for x in analysis.get("findings", []) if x.get("category")}
    final = set(baseline)
    suppressed: set[str] = set()
    version = version_tuple(source)
    modern = version is not None and version >= (0, 8, 0)
    if modern and "rounding_zero" not in signals and "arithmetic" in final:
        final.remove("arithmetic"); suppressed.add("arithmetic")
    if "unchecked_call" not in signals and "unchecked_low_level_calls" in final:
        final.remove("unchecked_low_level_calls"); suppressed.add("unchecked_low_level_calls")
    if "reentrancy_order" not in signals and "hook_reentrancy" not in signals and "reentrancy" in final:
        final.remove("reentrancy"); suppressed.add("reentrancy")
    if modern and "bad_randomness" not in structured_categories and "bad_randomness" in final:
        final.remove("bad_randomness"); suppressed.add("bad_randomness")
    if modern and "front_running" not in structured_categories and "front_running" in final:
        final.remove("front_running"); suppressed.add("front_running")
    if modern and "time_manipulation" not in structured_categories and "time_manipulation" in final:
        final.remove("time_manipulation"); suppressed.add("time_manipulation")
    final.update(structured_categories)
    return sorted(final), sorted(structured_categories), sorted(suppressed)


def calculate_metrics(rows: list[dict[str, Any]]) -> dict[str, Any]:
    label_instances = sum(len(row["labels"]) for row in rows)
    matched_instances = sum(len(set(row["labels"]) & set(row["finalPredictedCategories"])) for row in rows)
    any_matched = sum(bool(set(row["labels"]) & set(row["finalPredictedCategories"])) for row in rows)
    all_matched = sum(set(row["labels"]).issubset(set(row["finalPredictedCategories"])) for row in rows)
    categories = sorted({label for row in rows for label in row["labels"]})
    per_category: dict[str, Any] = {}
    for category in categories:
        relevant = [row for row in rows if category in row["labels"]]
        matched = [row for row in relevant if category in row["finalPredictedCategories"]]
        per_category[category] = {"cases": len(relevant), "matched": len(matched), "recall": round(len(matched) / len(relevant), 6) if relevant else None}
    return {"cases": len(rows), "labelInstances": label_instances, "contractAnyLabelMatched": any_matched, "contractAnyLabelRecall": round(any_matched / len(rows), 6), "contractAllLabelsMatched": all_matched, "contractAllLabelsRecall": round(all_matched / len(rows), 6), "labelInstancesMatched": matched_instances, "labelInstanceRecall": round(matched_instances / label_instances, 6), "perCategory": per_category}


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True); RECEIPTS.mkdir(parents=True, exist_ok=True)
    baseline = json.loads(BASELINE_PATH.read_text(encoding="utf-8"))
    if baseline["dataset"]["commit"] != EXPECTED_DATASET_COMMIT:
        raise RuntimeError("baseline dataset commit mismatch")
    if len(baseline["cases"]) != EXPECTED_CASES or len(baseline["controls"]) != EXPECTED_CONTROLS:
        raise RuntimeError("baseline denominator mismatch")
    dataset_head = subprocess.check_output(["git", "-C", str(DATASET), "rev-parse", "HEAD"], text=True).strip()
    if dataset_head != EXPECTED_DATASET_COMMIT:
        raise RuntimeError(f"dataset checkout mismatch: {dataset_head}")

    case_rows: list[dict[str, Any]] = []
    for index, row in enumerate(baseline["cases"], 1):
        source_path = DATASET / row["datasetPath"]
        source_bytes = source_path.read_bytes()
        if sha256_bytes(source_bytes) != row["sourceSha256"]:
            raise RuntimeError(f"source hash mismatch: {row['datasetPath']}")
        source = source_bytes.decode("utf-8", "replace")
        analysis = analyze(source_path)
        final, structured, suppressed = triage(source, row["baselineUnion"], analysis)
        labels = sorted(row["labels"]); matched = sorted(set(labels) & set(final))
        receipt = {"schemaVersion": "velmere.pass36.a102r44p14.external-case-receipt.v1", "caseId": row["caseId"], "datasetPath": row["datasetPath"], "datasetCommit": EXPECTED_DATASET_COMMIT, "sourceSha256": row["sourceSha256"], "labels": labels, "baselineUnion": sorted(row["baselineUnion"]), "structuredCategories": structured, "structuredSignals": sorted(analysis.get("signals", [])), "suppressedBaselineCategories": suppressed, "finalPredictedCategories": final, "matchedLabels": matched, "anyLabelMatched": bool(matched), "allLabelsMatched": set(labels).issubset(final), "truthBoundary": {"externalLabeledRecall": True, "formalPrecision": False, "severityCalibration": False, "businessLogicCoverage": False, "saleCredit": False, "liveCredit": False}}
        receipt_path = RECEIPTS / f"{row['caseId']}.json"
        receipt_path.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        case_rows.append({**receipt, "receiptSha256": sha256_bytes(receipt_path.read_bytes())})
        print(f"[{index:02d}/{EXPECTED_CASES}] {row['datasetPath']} labels={labels} final={final} matched={matched}")

    controls_dir = OUT / "controls"; controls_dir.mkdir(parents=True, exist_ok=True)
    baseline_controls = {row["controlId"]: row for row in baseline["controls"]}; control_rows = []
    for control_id, source in CONTROL_SOURCES.items():
        baseline_row = baseline_controls[control_id]; source_path = controls_dir / control_id
        source_with_newline = source + "\n"; source_path.write_text(source_with_newline, encoding="utf-8", newline="")
        source_sha = sha256_bytes(source_with_newline.encode("utf-8"))
        if source_sha != baseline_row["sourceSha256"]:
            raise RuntimeError(f"control source hash mismatch: {control_id}")
        analysis = analyze(source_path); final, structured, suppressed = triage(source_with_newline, baseline_row["baselineUnion"], analysis)
        control_rows.append({"controlId": control_id, "sourceSha256": source_sha, "baselineUnion": sorted(baseline_row["baselineUnion"]), "structuredCategories": structured, "structuredSignals": sorted(analysis.get("signals", [])), "suppressedBaselineCategories": suppressed, "finalPredictedCategories": final, "flagged": bool(final)})

    metrics = calculate_metrics(case_rows); baseline_metrics = baseline["baselineMetrics"]
    flagged_controls = sum(row["flagged"] for row in control_rows); control_rate = round(flagged_controls / len(control_rows), 6)
    category_delta = {}
    for category, current in metrics["perCategory"].items():
        relevant = [row for row in baseline["cases"] if category in row["labels"]]
        baseline_matched = sum(category in row["baselineUnion"] for row in relevant)
        baseline_recall = round(baseline_matched / len(relevant), 6) if relevant else None
        category_delta[category] = {"baselineRecall": baseline_recall, "currentRecall": current["recall"], "delta": round(current["recall"] - baseline_recall, 6) if baseline_recall is not None else None}

    result = {"schemaVersion": "velmere.pass36.a102r44p14.external-accuracy-remediation-ledger.v1", "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(), "status": "PASS_EXTERNAL_REMEDIATION_EXECUTED", "dataset": baseline["dataset"], "analyzer": {"class": "STRUCTURED_TOKEN_CONTROL_FLOW_V2_NOT_COMPILER_AST", "analyzerSha256": sha256_bytes((ROOT / "analyzer.mjs").read_bytes()), "compilerAstCredit": False, "failures": 0}, "denominators": {"cases": len(case_rows), "controls": len(control_rows), "labelInstances": metrics["labelInstances"]}, "baseline": {"contractAnyLabelRecall": baseline_metrics["contractAnyLabelRecall"], "labelInstanceRecall": baseline_metrics["labelInstanceRecall"], "controlFlagRate": baseline_metrics["controlFlagRate"], "flaggedControls": baseline_metrics["flaggedControls"]}, "current": {**{k: v for k, v in metrics.items() if k != "perCategory"}, "flaggedControls": flagged_controls, "controlFlagRate": control_rate}, "perCategory": metrics["perCategory"], "categoryDelta": category_delta, "cases": case_rows, "controls": control_rows, "truthBoundary": {"externalLabeledRecallBaseline": True, "independentDatasetDesign": True, "formalPrecision": False, "severityCalibration": False, "modernProtocolRepresentativeness": False, "businessLogicCoverage": False, "independentAdjudication": False, "commercialRightsApproved": False, "customerCredit": False, "paidTierCredit": False, "liveCredit": False, "worldClassProven": False}}
    ledger_path = OUT / "R44P14_EXTERNAL_ACCURACY_REMEDIATION_LEDGER.json"; ledger_path.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    summary = {"status": result["status"], "cases": len(case_rows), "controls": len(control_rows), "baselineRecall": baseline_metrics["contractAnyLabelRecall"], "currentRecall": metrics["contractAnyLabelRecall"], "recallDelta": round(metrics["contractAnyLabelRecall"] - baseline_metrics["contractAnyLabelRecall"], 6), "baselineControlFlagRate": baseline_metrics["controlFlagRate"], "currentControlFlagRate": control_rate, "controlFlagRateDelta": round(control_rate - baseline_metrics["controlFlagRate"], 6), "flaggedControls": flagged_controls, "analyzerFailures": 0, "ledgerSha256": sha256_bytes(ledger_path.read_bytes())}
    (OUT / "R44P14_EXTERNAL_ACCURACY_REMEDIATION_SUMMARY.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2, sort_keys=True)); return 0

if __name__ == "__main__":
    raise SystemExit(main())
