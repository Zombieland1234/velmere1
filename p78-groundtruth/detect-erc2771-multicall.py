from __future__ import annotations

import argparse
import hashlib
import json
import re
import urllib.request
from pathlib import Path

REPO = "thirdweb-dev/contracts"
VULN = "745afa8537dbc577f72bfa75a718a2b781d0379d"
FIX = "efd2218ff9cbbfe326c33ce661042d7c19c17317"

PINNED = {
    "vuln_multicall": (f"https://raw.githubusercontent.com/{REPO}/{VULN}/contracts/extension/Multicall.sol", "d3507b964169c50f878881b1fbafc87b8316616994bc8e85312cab578eff4f81"),
    "vuln_factory": (f"https://raw.githubusercontent.com/{REPO}/{VULN}/contracts/infra/TWFactory.sol", "d270d7968366c8fec8ed404536778093080c139ad22923cb6915f2e7834f1e8f"),
    "fixed_multicall": (f"https://raw.githubusercontent.com/{REPO}/{FIX}/contracts/extension/Multicall.sol", "78167133f656827b1b76bf6c86456fe917dc7b60d3c27ccd8e4c3169085e5e9c"),
    "fixed_factory": (f"https://raw.githubusercontent.com/{REPO}/{FIX}/contracts/infra/TWFactory.sol", "816c1896093f70680f37a0a5c8a4a254cd3794fabf4cfcddfb3ca184e3ce46cf"),
}


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "Velmere-P78-Detector/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def get_pinned(name: str) -> str:
    url, expected = PINNED[name]
    raw = fetch(url)
    observed = hashlib.sha256(raw).hexdigest()
    if observed != expected:
        raise AssertionError(f"pinned source mismatch:{name}:{observed}:{expected}")
    return raw.decode("utf-8")


def strip_comments(source: str) -> str:
    source = re.sub(r"/\*[\s\S]*?\*/", " ", source)
    source = re.sub(r"//[^\n]*", " ", source)
    return source


def line_refs(source: str, patterns: list[str], limit: int = 8) -> list[dict[str, object]]:
    refs: list[dict[str, object]] = []
    for idx, line in enumerate(source.splitlines(), start=1):
        if any(re.search(pattern, line, flags=re.I) for pattern in patterns):
            refs.append({"line": idx, "text": line.strip()[:320]})
            if len(refs) >= limit:
                break
    return refs


def detect(units: dict[str, str]) -> dict[str, object]:
    clean = {name: strip_comments(text) for name, text in units.items()}
    joined = "\n".join(clean.values())

    meta_context = bool(re.search(r"\bERC2771Context\b", joined)) and bool(re.search(r"\b_msgSender\s*\(\s*\)", joined))
    self_delegatecall = bool(re.search(r"(?:functionDelegateCall\s*\(\s*address\s*\(\s*this\s*\)|address\s*\(\s*this\s*\)\s*\.\s*delegatecall\s*\()", joined))
    batched_user_calldata = bool(re.search(r"bytes\s*\[\s*\]\s+calldata\s+[A-Za-z_][A-Za-z0-9_]*", joined))
    auth_uses_logical_sender = bool(re.search(r"(?:hasRole|require|revert|owner|authorized|isAuthorized)[^;{}]{0,220}_msgSender\s*\(\s*\)", joined, flags=re.I))

    preservation = bool(
        re.search(r"address\s+[A-Za-z_][A-Za-z0-9_]*\s*=\s*_msgSender\s*\(\s*\)\s*;", joined)
        and re.search(r"abi\s*\.\s*encodePacked\s*\([^;]{0,260},\s*[A-Za-z_][A-Za-z0-9_]*\s*\)", joined)
        and re.search(r"msg\s*\.\s*sender\s*!=", joined)
    )

    vulnerable_pattern = meta_context and self_delegatecall and batched_user_calldata and auth_uses_logical_sender and not preservation
    state = "source_pattern_confirmed" if vulnerable_pattern else "not_detected"
    confidence = 92 if vulnerable_pattern else 88 if preservation else 45
    blockers = ["runtime_exploit_reproduction_not_executed", "deployment_reachability_not_proven"] if vulnerable_pattern else []

    evidence = []
    for name, source in units.items():
        refs = line_refs(source, [r"ERC2771Context", r"_msgSender", r"delegatecall|functionDelegateCall", r"bytes\s*\[\s*\]\s+calldata", r"abi\.encodePacked", r"msg\.sender\s*!="])
        if refs:
            evidence.append({"unit": name, "refs": refs})

    return {
        "schemaVersion": "velmere.p78.erc2771-multicall-source-detector.v1",
        "state": state,
        "family": "ERC2771_CONTEXT_MULTICALL_SENDER_SPOOFING",
        "signals": {
            "erc2771LogicalSenderContext": meta_context,
            "arbitrarySelfDelegatecallBatch": self_delegatecall and batched_user_calldata,
            "authorizationUsesLogicalSender": auth_uses_logical_sender,
            "logicalSenderPreservedAcrossDelegatecall": preservation,
        },
        "confidence": confidence,
        "severityCandidate": "high" if vulnerable_pattern else None,
        "exploitability": "source_preconditions_present_runtime_not_reproduced" if vulnerable_pattern else "not_claimed",
        "evidence": evidence,
        "preconditions": [
            "a trusted ERC2771 forwarder can reach the multicall entry point",
            "multicall delegatecalls user-controlled calldata back into the same contract context",
            "authorization-sensitive logic resolves identity with _msgSender()",
            "the original logical sender is not preserved across the delegated subcall",
        ] if vulnerable_pattern else [],
        "remediation": [
            "preserve the logical ERC2771 sender across each self-delegatecall and make _msgSender/_msgData recover it consistently",
            "or remove/strictly constrain arbitrary self-delegatecall batching across meta-transaction context",
            "add a trusted-forwarder spoof regression that proves an attacker cannot substitute the logical sender",
        ] if vulnerable_pattern else [],
        "retest": {
            "required": vulnerable_pattern,
            "negativeControl": "trusted-forwarder spoof attempt must revert/fail authorization after remediation",
            "positiveControl": "legitimate direct and trusted-forwarder multicall behavior should remain functional",
        },
        "blockers": blockers,
        "truthBoundary": "Source-pattern confirmation is not runtime exploit reproduction, deployed-bytecode proof, or a customer FINAL finding. Severity remains a candidate until case-bound exploitability/adjudication is complete.",
    }


def must(condition: bool, label: str) -> None:
    if not condition:
        raise AssertionError(label)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--output", required=True)
    args = ap.parse_args()

    vulnerable = {
        "Multicall.sol": get_pinned("vuln_multicall"),
        "TWFactory.sol": get_pinned("vuln_factory"),
    }
    fixed = {
        "Multicall.sol": get_pinned("fixed_multicall"),
        "TWFactory.sol": get_pinned("fixed_factory"),
    }
    hard_negative_multicall_only = {
        "Multicall.sol": "pragma solidity ^0.8.0; contract M { function multicall(bytes[] calldata calls) external { for(uint i; i<calls.length; i++){ address(this).delegatecall(calls[i]); } } }",
    }
    hard_negative_erc2771_only = {
        "Auth.sol": "pragma solidity ^0.8.0; abstract contract ERC2771Context {} contract A is ERC2771Context { function _msgSender() internal view returns(address){return msg.sender;} function f() external { require(_msgSender()!=address(0)); } }",
    }
    lookalike_preserved = {
        "Safe.sol": "pragma solidity ^0.8.0; abstract contract ERC2771Context {} contract S is ERC2771Context { function _msgSender() internal view returns(address){return msg.sender;} function multicall(bytes[] calldata calls) external { address sender=_msgSender(); bool isForwarder=msg.sender != sender; for(uint i; i<calls.length; i++){ bytes memory callData=isForwarder ? abi.encodePacked(calls[i], sender) : calls[i]; address(this).delegatecall(callData); } } function admin() external { require(_msgSender()!=address(0)); } }",
    }
    metamorphic_vulnerable = {
        "Meta.sol": "pragma solidity ^0.8.0; abstract contract ERC2771Context {} contract X is ERC2771Context { function _msgSender() internal view returns(address){ return msg.sender; } function batch(bytes[] calldata payloads) external { for (uint256 j=0;j<payloads.length;j++){ address(this).delegatecall(payloads[j]); } } function privileged() external { require(_msgSender() != address(0), 'auth'); } }",
    }

    cases = [
        ("thirdweb_vulnerable", vulnerable, True),
        ("thirdweb_fixed", fixed, False),
        ("hard_negative_multicall_without_erc2771", hard_negative_multicall_only, False),
        ("hard_negative_erc2771_without_delegatecall", hard_negative_erc2771_only, False),
        ("lookalike_sender_preserved", lookalike_preserved, False),
        ("metamorphic_vulnerable", metamorphic_vulnerable, True),
    ]
    rows = []
    tp = tn = fp = fn = 0
    for case_id, units, expected in cases:
        result = detect(units)
        observed = result["state"] == "source_pattern_confirmed"
        must(observed == expected, f"case mismatch:{case_id}:expected={expected}:observed={observed}:{json.dumps(result)}")
        if expected and observed: tp += 1
        elif not expected and not observed: tn += 1
        elif not expected and observed: fp += 1
        else: fn += 1
        rows.append({"caseId": case_id, "expectedPattern": expected, "observedPattern": observed, "result": result})

    must(rows[0]["result"]["signals"]["logicalSenderPreservedAcrossDelegatecall"] is False, "vulnerable preservation false expected")
    must(rows[1]["result"]["signals"]["logicalSenderPreservedAcrossDelegatecall"] is True, "fixed preservation true expected")
    must(rows[0]["result"]["exploitability"] == "source_preconditions_present_runtime_not_reproduced", "exploitability boundary missing")

    receipt = {
        "schemaVersion": "velmere.p78.erc2771-multicall-development-micro-corpus.v1",
        "status": "PASS",
        "detectorClass": "PURE_SOURCE_PATTERN_DIAGNOSTIC",
        "caseCount": len(rows),
        "matrix": {"tp": tp, "tn": tn, "fp": fp, "fn": fn},
        "rows": rows,
        "groundTruthBinding": {
            "repository": REPO,
            "vulnerableCommit": VULN,
            "fixedCommit": FIX,
            "independentGroundTruthReceipt": "P78_THIRDWEB_ERC2771_MULTICALL_GROUND_TRUTH.json",
        },
        "creditClass": "DEVELOPMENT_MICRO_CORPUS_NOT_ACCURACY_CREDIT",
        "zeroFakeCredit": {
            "formalPrecisionRecall": "WITHHELD_MICRO_CORPUS",
            "runtimeExploitability": 0,
            "customerFinal": "0/20",
            "auditFinalPdf": "0/3",
            "paidValue": "0/10",
            "saleEligible": "0/20",
            "live": False,
        },
        "nextAcceptanceTest": "Port this pure source-pattern detector into exact P78 product source only after the current source-acquisition contract is shown to provide hash-bound complete source units. Then run the same pinned vulnerable/fixed pair plus larger hard-negative and holdout sets under exact Windows.",
    }
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
