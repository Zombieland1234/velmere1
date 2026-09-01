#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any


def stable(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--advanced-analysis", required=True)
    parser.add_argument("--packets", required=True)
    parser.add_argument("--blind-output", required=True)
    parser.add_argument("--answer-key", required=True)
    parser.add_argument("--review-template", required=True)
    args = parser.parse_args()

    analysis = json.loads(Path(args.advanced_analysis).read_text(encoding="utf-8"))
    packets = [json.loads(line) for line in Path(args.packets).read_text(encoding="utf-8").splitlines() if line.strip()]
    advanced_en = {row["caseId"]: row for row in packets if row["tier"] == "advanced" and row["locale"] == "en"}
    blind_rows = []
    answer_rows = []
    for profile in analysis["advancedRows"]:
        case_number = int(profile["caseId"])
        packet_id = next(key for key in advanced_en if key.startswith(f"official_tool-{case_number:03d}-"))
        packet = advanced_en[packet_id]
        comparative = profile["comparativeControlAnalysis"]
        blind = {
            "schemaVersion": "velmere.pass36.a102r44p7.blind-adjudication-case.v1",
            "blindCaseId": profile["blindPacketId"],
            "sourceSha256": packet["sourceSha256"],
            "analysisMode": "automated_informational",
            "highestSeverity": packet["highestSeverity"],
            "confidence": packet["confidence"],
            "findings": [{"id": row["id"], "title": row["title"], "severity": row["severity"], "rationale": row["rationale"], "evidence": row["evidence"]} for row in packet["findings"]],
            "crossToolConsensus": profile["crossToolConsensus"],
            "compilerArtifactProfile": {
                "contractCount": profile["compilerArtifactDiff"]["contractCount"],
                "totalBytecodeBytes": profile["compilerArtifactDiff"]["totalBytecodeBytes"],
                "totalAbiFunctions": profile["compilerArtifactDiff"]["totalAbiFunctions"],
                "profileSha256": profile["compilerArtifactDiff"]["profileSha256"],
            },
            "comparisonWithoutLabels": {
                "resolvedThemeCount": len(comparative.get("resolvedThemes") or []),
                "persistentThemeCount": len(comparative.get("persistentThemes") or []),
                "introducedThemeCount": len(comparative.get("introducedThemes") or []),
                "severityWeightDelta": comparative.get("severityWeightDelta"),
                "bytecodeDeltaBytes": comparative.get("bytecodeDeltaBytes"),
                "abiFunctionDelta": comparative.get("abiFunctionDelta"),
            },
            "reviewQuestions": [
                "Which findings are valid, invalid or require more evidence?",
                "Is the proposed severity calibrated to realistic exploitability?",
                "Does the comparison support a remediation claim?",
                "What evidence is missing before a deployed-contract claim?",
                "Would this packet materially improve a customer decision over Pro?",
            ],
            "reviewerFields": {"decision": None, "severity": None, "falsePositive": None, "falseNegative": None, "missingEvidence": [], "notes": None, "reviewerIdHash": None, "reviewedAt": None, "signature": None},
            "independentAdjudicationCredit": False,
        }
        blind["packetSha256"] = sha(stable(blind).encode())
        blind_rows.append(blind)
        answer_rows.append({
            "blindCaseId": profile["blindPacketId"],
            "caseId": profile["caseId"],
            "benchmarkRole": packet.get("benchmarkRole"),
            "category": packet.get("category"),
            "comparativeClassification": comparative.get("classification"),
            "pairedCaseId": comparative.get("pairedCaseId"),
            "expectedAutomatedThemes": sorted({row.get("theme") for row in packet["findings"] if row.get("theme")}),
            "sourceSha256": packet["sourceSha256"],
        })

    blind_path = Path(args.blind_output)
    blind_path.parent.mkdir(parents=True, exist_ok=True)
    blind_path.write_text("\n".join(stable(row) for row in blind_rows) + "\n", encoding="utf-8")
    answer = {
        "schemaVersion": "velmere.pass36.a102r44p7.blind-adjudication-answer-key.v1",
        "caseCount": len(answer_rows),
        "accessClass": "RESTRICTED_INTERNAL_ANSWER_KEY",
        "rows": answer_rows,
        "independentAdjudicationCredit": 0,
    }
    Path(args.answer_key).write_text(json.dumps(answer, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    template = {
        "schemaVersion": "velmere.pass36.a102r44p7.independent-review-template.v1",
        "requiredReviewers": 2,
        "independenceRequirements": ["reviewer is not the author of the automated packet", "reviewer does not see the answer key before submission", "reviewer declares conflicts", "decision is timestamped and signed"],
        "passCriteria": ["50/50 cases receive a complete decision", "disagreements are adjudicated by a third reviewer", "false-positive and false-negative labels are complete", "severity drift is measured", "answer key is disclosed only after first-pass decisions freeze"],
        "currentCompletedReviews": 0,
        "currentIndependentCredit": 0,
    }
    Path(args.review_template).write_text(json.dumps(template, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    leaked = [row["blindCaseId"] for row in blind_rows if any(key in row for key in ("caseId", "category", "benchmarkRole", "pairedCaseId", "expectedAutomatedThemes"))]
    if leaked or len(blind_rows) != 50 or len({row["blindCaseId"] for row in blind_rows}) != 50:
        raise SystemExit(f"blind packet failure: leaked={leaked[:5]} count={len(blind_rows)}")
    print(json.dumps({"blindCases": len(blind_rows), "answerRows": len(answer_rows), "uniqueBlindIds": len({row['blindCaseId'] for row in blind_rows}), "answerLeakage": 0, "independentAdjudicationCredit": 0}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
