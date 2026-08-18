from __future__ import annotations

import hashlib
import json
import sys
import urllib.request
from pathlib import Path

VULN = "745afa8537dbc577f72bfa75a718a2b781d0379d"
FIX = "efd2218ff9cbbfe326c33ce661042d7c19c17317"
REPO = "thirdweb-dev/contracts"
CASE_ID = "P78-GT-THIRDWEB-ERC2771-MULTICALL-2023"

ASSETS = {
    "vulnerableMulticall": {
        "url": f"https://raw.githubusercontent.com/{REPO}/{VULN}/contracts/extension/Multicall.sol",
        "gitBlobSha1": "25e51cdf8505723f586b6f6320456441a39149dc",
    },
    "fixedMulticall": {
        "url": f"https://raw.githubusercontent.com/{REPO}/{FIX}/contracts/extension/Multicall.sol",
        "gitBlobSha1": "043d6c3c02610294236945e0abeb8c60c3319b22",
    },
    "vulnerableTWFactory": {
        "url": f"https://raw.githubusercontent.com/{REPO}/{VULN}/contracts/infra/TWFactory.sol",
        "gitBlobSha1": "7d88d1636c7467702dd5f1297163087a0b111df8",
    },
    "fixedTWFactory": {
        "url": f"https://raw.githubusercontent.com/{REPO}/{FIX}/contracts/infra/TWFactory.sol",
        "gitBlobSha1": "0e47d7114119ca1ea9afd73d046ba2847aef7c16",
    },
    "fixedMulticallTests": {
        "url": f"https://raw.githubusercontent.com/{REPO}/{FIX}/src/test/Multicall.t.sol",
        "gitBlobSha1": "3b9bbfb931e7f5c0cd62d1dde37f164177aabf6d",
    },
}


def fetch_bytes(url: str) -> bytes:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Velmere-P78-GroundTruth-Probe/1.0",
            "Accept": "application/vnd.github+json, text/plain, */*",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read()


def git_blob_sha1(data: bytes) -> str:
    h = hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"))
    h.update(data)
    return h.hexdigest()


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def require(condition: bool, label: str) -> None:
    if not condition:
        raise AssertionError(label)


def fetch_json(url: str) -> dict:
    return json.loads(fetch_bytes(url).decode("utf-8"))


def main() -> int:
    out_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "p78-groundtruth-out")
    out_dir.mkdir(parents=True, exist_ok=True)

    fetched: dict[str, dict[str, object]] = {}
    texts: dict[str, str] = {}
    for name, spec in ASSETS.items():
        data = fetch_bytes(str(spec["url"]))
        observed_git = git_blob_sha1(data)
        require(observed_git == spec["gitBlobSha1"], f"{name}: git blob mismatch {observed_git}")
        text = data.decode("utf-8")
        texts[name] = text
        fetched[name] = {
            "url": spec["url"],
            "bytes": len(data),
            "gitBlobSha1": observed_git,
            "sha256": sha256(data),
        }

    vulnerable_multicall = texts["vulnerableMulticall"]
    fixed_multicall = texts["fixedMulticall"]
    vulnerable_factory = texts["vulnerableTWFactory"]
    fixed_factory = texts["fixedTWFactory"]
    fixed_tests = texts["fixedMulticallTests"]

    structural = {
        "vulnerableDirectDelegateCall": "Address.functionDelegateCall(address(this), data[i])" in vulnerable_multicall,
        "vulnerableHasNoForwarderPreservation": "isForwarder" not in vulnerable_multicall
        and "abi.encodePacked(data[i], sender)" not in vulnerable_multicall,
        "vulnerableFactoryCombinesMulticallAndERC2771": "contract TWFactory is Multicall, ERC2771Context" in vulnerable_factory,
        "vulnerableFactoryUsesContextForRoleChecks": "hasRole(FACTORY_ROLE, _msgSender())" in vulnerable_factory,
        "vulnerableFactoryOverrideOmitsMulticall": "override(Context, ERC2771Context)" in vulnerable_factory,
        "fixedCapturesLogicalSender": "address sender = _msgSender();" in fixed_multicall,
        "fixedDetectsForwarderContext": "bool isForwarder = msg.sender != sender;" in fixed_multicall,
        "fixedPreservesLogicalSenderAcrossDelegateCall": "abi.encodePacked(data[i], sender)" in fixed_multicall,
        "fixedFactoryOverrideIncludesMulticall": "override(Context, ERC2771Context, Multicall)" in fixed_factory,
        "fixedHasSpoofNegativeControl": "test_multicall_viaForwarder_attemptSpoof" in fixed_tests,
        "fixedHasRoleProtectedTokenSpoofNegativeControl": "test_multicall_tokenerc721_viaForwarder_attemptSpoof" in fixed_tests,
    }
    for label, state in structural.items():
        require(state, f"structural ground-truth control failed: {label}")

    commit = fetch_json(f"https://api.github.com/repos/{REPO}/commits/{FIX}")
    parents = [p.get("sha") for p in commit.get("parents", [])]
    require(parents == [VULN], f"patch parent mismatch: {parents}")
    require("Patch extension/Multicall" in commit.get("commit", {}).get("message", ""), "patch message mismatch")

    oz_issue = fetch_json("https://api.github.com/repos/OpenZeppelin/openzeppelin-contracts/issues/4791")
    oz_body = oz_issue.get("body") or ""
    require(
        "Arbitrary Address Spoofing Attack: ERC2771Context Multicall Public Disclosure" in oz_body,
        "OpenZeppelin disclosure pointer missing",
    )
    require("blog.openzeppelin.com/arbitrary-address-spoofing-vulnerability" in oz_body, "OpenZeppelin disclosure URL missing")

    gsn_issue = fetch_json("https://api.github.com/repos/opengsn/gsn/issues/1008")
    gsn_body = gsn_issue.get("body") or ""
    require("ERC2771" in gsn_body, "OpenGSN corroboration missing ERC2771")
    require("blog.thirdweb.com/security-vulnerability" in gsn_body, "thirdweb disclosure pointer missing")
    require("Did not reproduce" in gsn_body, "OpenGSN non-reproduction boundary missing")

    receipt = {
        "schemaVersion": "velmere.p78.real-target-ground-truth-probe.v1",
        "caseId": CASE_ID,
        "status": "PASS_BOUNDED_GROUND_TRUTH_PROBE",
        "target": {
            "repository": REPO,
            "vulnerableCommit": VULN,
            "fixedCommit": FIX,
            "patchParentBound": True,
            "scope": [
                "contracts/extension/Multicall.sol",
                "contracts/infra/TWFactory.sol",
                "src/test/Multicall.t.sol",
            ],
        },
        "classification": {
            "vulnerabilityFamily": "ERC2771_CONTEXT_MULTICALL_SENDER_SPOOFING",
            "impactClass": "AUTHORIZATION_IDENTITY_SPOOFING",
            "severity": "UNADJUDICATED_FOR_VELMERE",
            "exploitability": "NOT_YET_RUNTIME_REPRODUCED_BY_VELMERE",
        },
        "assets": fetched,
        "structuralGroundTruth": structural,
        "patchEvidence": {
            "patchCommitMessage": commit.get("commit", {}).get("message", ""),
            "parent": parents[0],
        },
        "externalPointers": {
            "openZeppelinIssue4791": {
                "url": oz_issue.get("html_url"),
                "bodySha256": sha256(oz_body.encode("utf-8")),
                "role": "INDEPENDENT_DISCLOSURE_POINTER_NOT_RUNTIME_REPRODUCTION",
            },
            "openGSNIssue1008": {
                "url": gsn_issue.get("html_url"),
                "bodySha256": sha256(gsn_body.encode("utf-8")),
                "role": "ECOSYSTEM_CORROBORATION_ONLY_EXPLICITLY_NOT_REPRODUCED",
            },
        },
        "rightsBoundary": "Public Apache-2.0 target source is used for internal security evaluation. This receipt does not decide customer redistribution/display rights for external text or source.",
        "creditBoundary": {
            "velmereDetectorExecuted": False,
            "velmereFindingAdjudicated": False,
            "velmereRemediationRetestExecuted": False,
            "customerFinal": "0/20",
            "auditFinalPdf": "0/3",
            "paidValue": "0/10",
            "saleEligible": "0/20",
            "live": False,
        },
        "nextAcceptanceTest": "Run the exact P77R3/P78 Audit analyzer against the vulnerable commit and fixed negative control on matched inputs; require vulnerable detection, fixed abstention/no false positive, evidence-bound exploitability reasoning, remediation mapping and retest before any Customer FINAL credit.",
    }

    receipt_path = out_dir / "P78_THIRDWEB_ERC2771_MULTICALL_GROUND_TRUTH.json"
    receipt_path.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
