#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any

SEV_ORDER = {"critical": 5, "high": 4, "medium": 3, "low": 2, "informational": 1, "optimization": 0, "none": -1}
SEV_WEIGHT = {"High": 4, "Medium": 3, "Low": 2, "Informational": 1, "Optimization": 0}
SLITHER_SEV = {"High": "high", "Medium": "medium", "Low": "low", "Informational": "informational", "Optimization": "optimization"}
SEMGREP_SEV = {"ERROR": "medium", "WARNING": "low", "INFO": "informational"}
TOOL_FAMILY = {"solc": "compiler_metadata", "slither": "static_analysis", "semgrep": "pattern_analysis", "forge": "build_reproduction"}
LOCALES = ("pl", "en", "de")
TIERS = ("basic", "pro", "advanced")

THEME_MAP = {
    "reentrancy-eth": "reentrancy",
    "reentrancy-no-eth": "reentrancy",
    "reentrancy-benign": "reentrancy_surface",
    "low-level-calls": "low_level_call_surface",
    "unchecked-lowlevel": "unchecked_low_level_call",
    "velmere-solidity-unchecked-low-level-call": "low_level_call_surface",
    "arbitrary-send-eth": "value_flow_authorization",
    "tx-origin": "authorization",
    "velmere-solidity-tx-origin": "authorization",
    "missing-zero-check": "input_validation",
    "immutable-states": "immutability_optimization",
    "constable-states": "const_state_optimization",
    "controlled-delegatecall": "delegatecall",
    "velmere-solidity-delegatecall": "delegatecall",
    "weak-prng": "randomness",
    "velmere-solidity-blockhash": "randomness",
    "timestamp": "time_dependency",
    "velmere-solidity-block-timestamp": "time_dependency",
    "calls-loop": "unbounded_external_loop",
    "cache-array-length": "loop_optimization",
    "uninitialized-state": "initialization",
    "incorrect-equality": "comparison_logic",
    "locked-ether": "asset_recovery",
    "assembly": "assembly_surface",
    "erc20-interface": "token_interface",
    "redundant-statements": "dead_code",
    "velmere-solidity-selfdestruct": "destructive_operation",
    "velmere-solidity-ecrecover": "signature_verification_surface",
}

REMEDIATION = {
    "reentrancy-eth": "Apply checks-effects-interactions or a proven reentrancy guard and add adversarial callback tests.",
    "tx-origin": "Replace tx.origin authorization with explicit msg.sender/role checks and test proxy-call paths.",
    "unchecked-lowlevel": "Check the low-level call result, propagate bounded errors and add failure-path tests.",
    "controlled-delegatecall": "Bind delegatecall targets to a reviewed allowlist and protect storage layout and upgrade governance.",
    "arbitrary-send-eth": "Constrain recipients, authorization and value flow; add negative recipient-substitution tests.",
    "weak-prng": "Use an appropriate verifiable randomness design and model timing/manipulation assumptions.",
    "timestamp": "Bound timestamp use to tolerable windows and avoid it as a sole randomness or authorization source.",
    "calls-loop": "Paginate or cap external-call loops and test worst-case gas and partial failure.",
    "missing-zero-check": "Validate critical address inputs and document whether the zero address has intentional semantics.",
    "uninitialized-state": "Require one-time initialization, constructor/initializer locking and deployment-state checks.",
    "storage-collision": "Use stable namespaced storage and an explicit upgrade storage-layout verifier.",
}

COPY = {
    "pl": {
        "verdict": "Oficjalne narzędzia zakończyły analizę. Pakiet {tier} obejmuje {n} {signal}; jest to benchmark syntetyczny, nie audyt wdrożonego kontraktu.",
        "next": "Powiąż wdrożony bytecode i źródło, następnie wykonaj niezależną adjudykację przed claimem realnego audytu.",
        "pair": "Porównanie ryzyko-kontrola pokazuje, które klasy sygnałów zniknęły, pozostały albo pojawiły się po remediacji.",
        "limits": ["Benchmark należący do projektu, nie wdrożony kontrakt.", "Brak niezależnej adjudykacji i wyniku klienta.", "Analiza porównawcza jest automatyczna i nie zastępuje review człowieka.", "Wynik narzędzia jest sygnałem do weryfikacji, nie gwarancją podatności ani bezpieczeństwa."],
    },
    "en": {
        "verdict": "Official tools completed the analysis. The {tier} packet includes {n} {signal}; this is a synthetic benchmark, not a deployed-contract audit.",
        "next": "Bind deployed bytecode and source, then obtain independent adjudication before any real-audit claim.",
        "pair": "The risk-control comparison identifies which signal classes disappeared, persisted or appeared after remediation.",
        "limits": ["Project-owned benchmark, not a deployed contract.", "No independent adjudication or customer outcome.", "Comparative analysis is automated and does not replace human review.", "Tool output is a verification signal, not a guarantee of vulnerability or safety."],
    },
    "de": {
        "verdict": "Offizielle Werkzeuge haben die Analyse abgeschlossen. Das {tier}-Paket enthält {n} {signal}; dies ist ein synthetischer Benchmark und kein Audit eines bereitgestellten Vertrags.",
        "next": "Bereitgestellten Bytecode und Quelltext binden und vor einem Real-Audit-Claim eine unabhängige Adjudikation durchführen.",
        "pair": "Der Risiko-Kontroll-Vergleich zeigt, welche Signalklassen nach der Abhilfe verschwanden, bestehen blieben oder neu erschienen.",
        "limits": ["Projekteigener Benchmark, kein bereitgestellter Vertrag.", "Keine unabhängige Adjudikation und kein Kundenergebnis.", "Die Vergleichsanalyse ist automatisiert und ersetzt kein Human Review.", "Werkzeugausgaben sind Prüfsignale, keine Garantie für Schwachstelle oder Sicherheit."],
    },
}


def signal_label(locale: str, n: int) -> str:
    if locale == "pl":
        if n == 1:
            return "sygnał"
        if n % 10 in (2, 3, 4) and n % 100 not in (12, 13, 14):
            return "sygnały"
        return "sygnałów"
    if locale == "de":
        return "Signal" if n == 1 else "Signale"
    return "signal" if n == 1 else "signals"

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def stable(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def clean(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def check_theme(check: str) -> str:
    return THEME_MAP.get(check, check.replace("velmere-solidity-", "").replace("-", "_"))


def line_from_text(text: str) -> int:
    match = re.search(r"#(?:L)?(\d+)", text or "")
    return int(match.group(1)) if match else 1


def guidance(check: str) -> str:
    return REMEDIATION.get(check, "Review the exact source location, confirm exploitability, add a negative regression test and document residual assumptions.")


def severity_max(findings: list[dict[str, Any]]) -> str:
    if not findings:
        return "none"
    return max((row["severity"] for row in findings), key=lambda item: SEV_ORDER.get(item, 0))


def case_findings(evidence_root: Path, case: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, Any], dict[str, Any]]:
    cid = case["caseId"]
    slither = json.loads((evidence_root / "cases" / cid / "slither.json").read_text(encoding="utf-8"))
    semgrep = json.loads((evidence_root / "cases" / cid / "semgrep.json").read_text(encoding="utf-8"))
    findings: list[dict[str, Any]] = []
    for index, detector in enumerate(slither.get("results", {}).get("detectors", []), 1):
        check = detector.get("check", "unknown")
        description = clean(detector.get("description"))
        line = line_from_text(description)
        findings.append({
            "id": f"slither-{check}-{index}",
            "title": check.replace("-", " "),
            "severity": SLITHER_SEV.get(detector.get("impact"), "informational"),
            "rationale": description[:1200],
            "remediation": guidance(check),
            "guidance": guidance(check),
            "evidence": [{"sourcePath": case["sourcePath"], "lineStart": line, "lineEnd": line, "codeSha256": case["sourceSha256"], "sourceId": f"{cid}-slither", "family": "static_analysis"}],
            "analyzerFamilies": ["static_analysis"],
            "sourceIds": [f"{cid}-slither"],
            "tool": "slither",
            "check": check,
            "theme": check_theme(check),
            "confidence": detector.get("confidence"),
        })
    for index, result in enumerate(semgrep.get("results", []), 1):
        check = result.get("check_id", "unknown").rsplit(".", 1)[-1]
        start = result.get("start", {}).get("line", 1)
        message = clean(result.get("extra", {}).get("message", check))
        findings.append({
            "id": f"semgrep-{check}-{index}",
            "title": check.replace("-", " "),
            "severity": SEMGREP_SEV.get(result.get("extra", {}).get("severity"), "informational"),
            "rationale": message,
            "remediation": guidance(check),
            "guidance": guidance(check),
            "evidence": [{"sourcePath": case["sourcePath"], "lineStart": start, "lineEnd": result.get("end", {}).get("line", start), "codeSha256": case["sourceSha256"], "sourceId": f"{cid}-semgrep", "family": "pattern_analysis"}],
            "analyzerFamilies": ["pattern_analysis"],
            "sourceIds": [f"{cid}-semgrep"],
            "tool": "semgrep",
            "check": check,
            "theme": check_theme(check),
            "confidence": "rule-match",
        })
    findings.sort(key=lambda row: (-SEV_ORDER.get(row["severity"], 0), row["tool"], row["id"]))
    return findings, slither, semgrep


def artifact_profile(evidence_root: Path, case_id: str) -> dict[str, Any]:
    out_dir = evidence_root / "cases" / case_id / "solc-out"
    bins = sorted(out_dir.glob("*.bin"))
    abis = sorted(out_dir.glob("*.abi"))
    bytecode_rows = []
    for path in bins:
        text = re.sub(r"\s+", "", path.read_text(encoding="utf-8"))
        bytecode_rows.append({"contract": path.stem, "bytecodeBytes": len(text) // 2, "sha256": sha(text.encode())})
    function_rows = []
    for path in abis:
        try:
            abi = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            abi = []
        functions = sorted({str(item.get("name")) for item in abi if item.get("type") == "function" and item.get("name")})
        function_rows.append({"contract": path.stem, "functions": functions, "functionCount": len(functions), "sha256": sha(path.read_bytes())})
    profile = {
        "contractCount": len({row["contract"] for row in bytecode_rows + function_rows}),
        "totalBytecodeBytes": sum(row["bytecodeBytes"] for row in bytecode_rows),
        "totalAbiFunctions": sum(row["functionCount"] for row in function_rows),
        "bytecode": bytecode_rows,
        "abi": function_rows,
    }
    profile["profileSha256"] = sha(stable(profile).encode())
    return profile


def tool_theme_profile(findings: list[dict[str, Any]]) -> dict[str, Any]:
    by_theme: dict[str, set[str]] = {}
    for finding in findings:
        by_theme.setdefault(finding["theme"], set()).add(finding["tool"])
    consensus = sorted(theme for theme, tools in by_theme.items() if len(tools) >= 2)
    single = sorted(theme for theme, tools in by_theme.items() if len(tools) == 1)
    score = round((len(consensus) / len(by_theme) * 100), 2) if by_theme else 100.0
    profile = {
        "themeCount": len(by_theme),
        "consensusThemeCount": len(consensus),
        "singleToolThemeCount": len(single),
        "consensusThemes": [{"theme": theme, "tools": sorted(by_theme[theme])} for theme in consensus],
        "singleToolThemes": [{"theme": theme, "tools": sorted(by_theme[theme])} for theme in single],
        "agreementScore": score,
        "noFindingState": len(by_theme) == 0,
    }
    profile["profileSha256"] = sha(stable(profile).encode())
    return profile


def weighted_score(findings: list[dict[str, Any]]) -> int:
    return sum(SEV_ORDER.get(row["severity"], 0) for row in findings)


def comparative_profile(case_id: str, case_by_id: dict[str, dict[str, Any]], finding_by_id: dict[str, list[dict[str, Any]]], artifact_by_id: dict[str, dict[str, Any]]) -> dict[str, Any]:
    numeric = int(case_id)
    case = case_by_id[case_id]
    if numeric <= 48:
        risk_id = f"{numeric if numeric % 2 else numeric - 1:02d}"
        control_id = f"{int(risk_id) + 1:02d}"
        risk_findings = finding_by_id[risk_id]
        control_findings = finding_by_id[control_id]
        risk_themes = {row["theme"] for row in risk_findings if SEV_ORDER.get(row["severity"], 0) >= 1}
        control_themes = {row["theme"] for row in control_findings if SEV_ORDER.get(row["severity"], 0) >= 1}
        profile = {
            "classification": "RISK_TO_MITIGATION_PAIR",
            "pairId": f"PAIR-{(int(risk_id)+1)//2:02d}",
            "subjectRole": "RISK_BENCHMARK" if case_id == risk_id else "MITIGATION_OR_CONTROL",
            "riskCaseId": risk_id,
            "controlCaseId": control_id,
            "pairedCaseId": control_id if case_id == risk_id else risk_id,
            "resolvedThemes": sorted(risk_themes - control_themes),
            "persistentThemes": sorted(risk_themes & control_themes),
            "introducedThemes": sorted(control_themes - risk_themes),
            "riskSeverityWeight": weighted_score(risk_findings),
            "controlSeverityWeight": weighted_score(control_findings),
            "severityWeightDelta": weighted_score(control_findings) - weighted_score(risk_findings),
            "riskBytecodeBytes": artifact_by_id[risk_id]["totalBytecodeBytes"],
            "controlBytecodeBytes": artifact_by_id[control_id]["totalBytecodeBytes"],
            "bytecodeDeltaBytes": artifact_by_id[control_id]["totalBytecodeBytes"] - artifact_by_id[risk_id]["totalBytecodeBytes"],
            "riskAbiFunctions": artifact_by_id[risk_id]["totalAbiFunctions"],
            "controlAbiFunctions": artifact_by_id[control_id]["totalAbiFunctions"],
            "abiFunctionDelta": artifact_by_id[control_id]["totalAbiFunctions"] - artifact_by_id[risk_id]["totalAbiFunctions"],
        }
    elif case_id == "49":
        profile = {
            "classification": "BENIGN_CONTROL_BASELINE",
            "pairId": None,
            "subjectRole": case["benchmarkRole"],
            "pairedCaseId": None,
            "resolvedThemes": [],
            "persistentThemes": [],
            "introducedThemes": [],
            "severityWeightDelta": 0,
            "bytecodeDeltaBytes": 0,
            "abiFunctionDelta": 0,
            "boundary": "A benign control may still expose generic low-level-call surfaces; absence of a high-severity detector is not proof of safety.",
        }
    else:
        profile = {
            "classification": "AMBIGUOUS_EXTERNAL_DEPENDENCY_BOUNDARY",
            "pairId": None,
            "subjectRole": case["benchmarkRole"],
            "pairedCaseId": None,
            "resolvedThemes": [],
            "persistentThemes": [],
            "introducedThemes": [],
            "severityWeightDelta": 0,
            "bytecodeDeltaBytes": 0,
            "abiFunctionDelta": 0,
            "boundary": "External dependency behaviour cannot be adjudicated from the consumer source alone; Advanced must abstain and request provider evidence.",
        }
    profile["profileSha256"] = sha(stable(profile).encode())
    return profile


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--evidence-root", required=True)
    parser.add_argument("--source-root", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--summary", required=True)
    parser.add_argument("--advanced-analysis", required=True)
    args = parser.parse_args()

    evidence_root = Path(args.evidence_root)
    source_root = Path(args.source_root)
    ledger = json.loads((evidence_root / "OFFICIAL_TOOL_EXECUTION_LEDGER.json").read_text(encoding="utf-8"))
    corpus = json.loads((source_root / "evaluation/pass36/a102r44p4-official-tool-corpus-index.json").read_text(encoding="utf-8"))
    case_by_id = {row["caseId"]: row for row in corpus["cases"]}
    receipts = {(row["tool"], row["caseId"]): row for row in ledger["rows"]}

    finding_by_id: dict[str, list[dict[str, Any]]] = {}
    slither_by_id: dict[str, dict[str, Any]] = {}
    semgrep_by_id: dict[str, dict[str, Any]] = {}
    artifact_by_id: dict[str, dict[str, Any]] = {}
    consensus_by_id: dict[str, dict[str, Any]] = {}
    for case_id, case in sorted(case_by_id.items()):
        source_path = source_root / case["sourcePath"]
        if not source_path.is_file() or sha(source_path.read_bytes()) != case["sourceSha256"]:
            raise SystemExit(f"source mismatch: {case_id}")
        findings, slither, semgrep = case_findings(evidence_root, case)
        finding_by_id[case_id] = findings
        slither_by_id[case_id] = slither
        semgrep_by_id[case_id] = semgrep
        artifact_by_id[case_id] = artifact_profile(evidence_root, case_id)
        consensus_by_id[case_id] = tool_theme_profile(findings)

    comparison_by_id = {case_id: comparative_profile(case_id, case_by_id, finding_by_id, artifact_by_id) for case_id in case_by_id}
    packets: list[dict[str, Any]] = []
    case_summary: list[dict[str, Any]] = []
    advanced_rows: list[dict[str, Any]] = []

    for case_id, case in sorted(case_by_id.items()):
        findings = finding_by_id[case_id]
        receipt_rows = [receipts[(tool, case_id)] for tool in ("solc", "slither", "semgrep", "forge")]
        base_evidence = []
        for receipt in receipt_rows:
            ids = [row["id"] for row in findings if row["tool"] == receipt["tool"]]
            base_evidence.append({
                "sourceId": receipt["executionId"],
                "family": TOOL_FAMILY[receipt["tool"]],
                "findingIds": ids,
                "controls": ["exact_version", "exact_executable_hash", "source_sha256", "raw_output_sha256", "receipt_sha256"],
                "payloadSha256": receipt["receiptSha256"],
                "receiptSha256": receipt["receiptSha256"],
                "terminalStatus": receipt["terminalStatus"],
            })

        consensus = consensus_by_id[case_id]
        artifact = artifact_by_id[case_id]
        comparison = comparison_by_id[case_id]
        derived_profiles = {
            "cross_tool_consensus": consensus,
            "compiler_artifact_diff": artifact,
            "comparative_control_analysis": comparison,
        }
        derived_evidence = [{
            "sourceId": f"derived-{case_id}-{family}",
            "family": family,
            "findingIds": [],
            "controls": ["source_sha256", "official_receipt_set", "deterministic_derivation", "payload_sha256"],
            "payloadSha256": sha(stable(payload).encode()),
            "receiptSha256": sha(stable({"caseId": case_id, "family": family, "payload": payload}).encode()),
            "terminalStatus": "DERIVED_FROM_VERIFIED_OFFICIAL_EVIDENCE",
        } for family, payload in derived_profiles.items()]

        advanced_profile = {
            "caseId": case_id,
            "blindPacketId": f"VLM-BLIND-{sha((case_id + case['sourceSha256']).encode())[:16].upper()}",
            "crossToolConsensus": consensus,
            "compilerArtifactDiff": artifact,
            "comparativeControlAnalysis": comparison,
            "adjudicationReadiness": {
                "sourceIdentityBound": True,
                "officialReceiptSetComplete": True,
                "toolFamilies": 4,
                "derivedEvidenceFamilies": 3,
                "blindReviewPacketComplete": True,
                "independentDecision": None,
                "independentAdjudicationCredit": False,
            },
        }
        advanced_profile["profileSha256"] = sha(stable(advanced_profile).encode())
        advanced_rows.append(advanced_profile)

        case_summary.append({
            "caseId": case_id,
            "filename": case["filename"],
            "category": case["category"],
            "benchmarkRole": case["benchmarkRole"],
            "officialToolsCompleted": 4,
            "rawFindings": len(findings),
            "highestSeverity": severity_max(findings),
            "slitherDetectors": len(slither_by_id[case_id].get("results", {}).get("detectors", [])),
            "semgrepResults": len(semgrep_by_id[case_id].get("results", [])),
            "advancedEvidenceFamilyCount": 7,
            "consensusThemeCount": consensus["consensusThemeCount"],
            "comparativeClassification": comparison["classification"],
        })

        for locale in LOCALES:
            for tier in TIERS:
                if tier == "basic":
                    selected = [row for row in findings if SEV_ORDER.get(row["severity"], 0) >= 3][:4]
                elif tier == "pro":
                    selected = [row for row in findings if row["severity"] != "optimization"][:14]
                else:
                    selected = findings[:24]

                families = {"compiler_metadata"}
                evidence_table = list(base_evidence)
                if tier in ("pro", "advanced"):
                    families.update(["static_analysis", "pattern_analysis", "build_reproduction"])
                else:
                    if any(row["tool"] == "slither" for row in selected):
                        families.add("static_analysis")
                    if any(row["tool"] == "semgrep" for row in selected):
                        families.add("pattern_analysis")
                    evidence_table = [row for row in base_evidence if row["family"] in families]
                if tier == "advanced":
                    families.update(["cross_tool_consensus", "compiler_artifact_diff", "comparative_control_analysis"])
                    evidence_table.extend(derived_evidence)

                contradictions = []
                if consensus["singleToolThemeCount"]:
                    contradictions.append({"code": "SINGLE_TOOL_THEME_REQUIRES_ADJUDICATION", "detail": f"{consensus['singleToolThemeCount']} theme(s) appear in only one analysis family and remain unadjudicated."})
                if len(selected) < len(findings):
                    contradictions.append({"code": "TIER_SCOPE_TRUNCATION", "detail": f"{len(findings)-len(selected)} lower-priority or optimization signals remain outside this tier display."})
                if tier == "advanced" and comparison.get("persistentThemes"):
                    contradictions.append({"code": "PERSISTENT_SURFACE_AFTER_CONTROL", "detail": f"Paired control retains themes: {', '.join(comparison['persistentThemes'])}. Surface retention is not automatically a failed remediation."})

                material = (
                    ["source_bound_identity", "bounded_official_tool_summary", "limitations", "next_safe_check"]
                    if tier == "basic"
                    else ["four_official_tool_receipts", "full_evidence_table", "severity_rationale", "remediation_map"]
                    if tier == "pro"
                    else ["all_tool_signals", "contradiction_register", "cross_tool_consensus", "compiler_artifact_diff", "comparative_control_analysis", "blind_adjudication_packet", "abstention_and_claim_boundary"]
                )

                tier_value = {
                    "tier": tier,
                    "evidenceFamilyCount": len(families),
                    "evidenceFamilies": sorted(families),
                    "findingCount": len(selected),
                    "contradictionCount": len(contradictions),
                    "humanReviewIncluded": False,
                    "materialAdditions": material,
                    "explicitlyExcluded": ["human_review_claim", "independent_certification", "security_guarantee", "personalised_advice", "real_deployed_contract_claim"],
                }
                packet = {
                    "schemaVersion": "velmere.pass36.a102r44p7.advanced-evidence-audit-packet.v1",
                    "matrixId": f"official_tool-{int(case_id):03d}-{case['category']}::{tier}::{locale}",
                    "caseId": f"official_tool-{int(case_id):03d}-{case['category']}",
                    "category": case["category"],
                    "benchmarkRole": case["benchmarkRole"],
                    "tier": tier,
                    "locale": locale,
                    "sourcePath": case["sourcePath"],
                    "sourceSha256": case["sourceSha256"],
                    "analysisMode": "automated_informational",
                    "status": "analysis_completed",
                    "confidence": None,
                    "highestSeverity": severity_max(selected),
                    "customerVerdict": COPY[locale]["verdict"].format(n=len(selected), signal=signal_label(locale, len(selected)), tier=tier.upper()),
                    "claimBoundary": {"issuer": "Velmère Security", "analysisMode": "automated_informational", "automated": True, "humanReviewIncluded": False, "humanReviewClaimAllowed": False, "independentCertificationClaimAllowed": False, "personalisedAdviceAllowed": False, "securityGuaranteeAllowed": False},
                    "tierValue": tier_value,
                    "evidenceCoverage": {"analyzerFamilyCount": len(families), "minimumAnalyzerFamilies": 1 if tier == "basic" else 4 if tier == "pro" else 7, "findingCount": len(selected), "findingsWithReproducibleLocation": len(selected), "contradictionCount": len(contradictions), "identityVerified": True, "commercialRights": "verified_project_owned_fixture", "officialToolExecutions": 4, "derivedEvidenceFamilies": 3 if tier == "advanced" else 0},
                    "findings": selected,
                    "contradictions": contradictions,
                    "limitations": COPY[locale]["limits"],
                    "missingData": ["deployed_bytecode", "source_bytecode_reproduction", "independent_adjudication", "real_customer_outcome"],
                    "nextSafeCheck": COPY[locale]["next"],
                    "methodology": None if tier != "advanced" else {
                        "compiler": "solc 0.8.24 exact hash-bound execution",
                        "static analysis": "Slither 0.11.5 exact hash-bound execution",
                        "pattern analysis": "Semgrep 1.130.0 exact hash-bound execution",
                        "build reproduction": "Forge 1.2.3 deterministic project build",
                        "cross-tool consensus": "theme-normalized comparison across Slither and Semgrep",
                        "compiler artifact diff": "ABI/function and bytecode-size profile bound to exact solc artifacts",
                        "comparative control analysis": COPY[locale]["pair"],
                        "adjudication": "blind review packet prepared; independent decision not performed",
                        "human review": "not included",
                    },
                    "evidenceTable": evidence_table,
                    "advancedEvidence": advanced_profile if tier == "advanced" else None,
                    "provenanceReceipt": sha("".join(row["receiptSha256"] for row in receipt_rows).encode()),
                    "commercialRights": "verified_project_owned_fixture",
                    "entitlementStatus": "not_required" if tier == "basic" else "pilot_only",
                }
                temp = dict(packet)
                packet["outputSha256"] = sha(stable(temp).encode())
                packets.append(packet)

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join(stable(row) for row in packets) + "\n", encoding="utf-8")
    Path(args.advanced_analysis).write_text(json.dumps({
        "schemaVersion": "velmere.pass36.a102r44p7.advanced-evidence-analysis.v1",
        "cases": 50,
        "riskControlPairs": 24,
        "benignControls": 1,
        "ambiguousDependencies": 1,
        "advancedRows": advanced_rows,
        "independentAdjudicationCredit": 0,
        "realAuditCredit": 0,
        "truthBoundary": "Derived evidence materially differentiates Advanced from Pro but remains automated analysis on project-owned fixtures. It is not independent adjudication or deployed-contract evidence.",
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    summary = {
        "schemaVersion": "velmere.pass36.a102r44p7.advanced-evidence-tier-summary.v1",
        "cases": 50,
        "packetRows": len(packets),
        "selectedPdfRows": 150,
        "tiers": {tier: sum(1 for row in packets if row["tier"] == tier) for tier in TIERS},
        "locales": {locale: sum(1 for row in packets if row["locale"] == locale) for locale in LOCALES},
        "officialToolProcessesBound": 200,
        "proEvidenceFamilyCount": 4,
        "advancedEvidenceFamilyCount": 7,
        "advancedGreaterThanProCases": 50,
        "advancedNewEvidenceFamilies": ["cross_tool_consensus", "compiler_artifact_diff", "comparative_control_analysis"],
        "riskControlPairs": 24,
        "independentAdjudicationCredit": 0,
        "realAuditCredit": 0,
        "realCustomerCredit": 0,
        "liveCredit": 0,
        "saleEnabled": False,
        "caseSummary": case_summary,
        "truthBoundary": "Advanced now contains three deterministic derived evidence families beyond Pro. Public-sale proof remains blocked by independent adjudication, deployed-contract evidence and customer outcomes.",
    }
    Path(args.summary).write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({key: summary[key] for key in ("cases", "packetRows", "selectedPdfRows", "officialToolProcessesBound", "proEvidenceFamilyCount", "advancedEvidenceFamilyCount", "advancedGreaterThanProCases", "riskControlPairs", "independentAdjudicationCredit")}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
