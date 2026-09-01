#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

import fitz

NEW_FAMILIES = {"cross_tool_consensus", "compiler_artifact_diff", "comparative_control_analysis"}
ALL_ADVANCED_FAMILIES = {"compiler_metadata", "static_analysis", "pattern_analysis", "build_reproduction", *NEW_FAMILIES}
EXPECTED_PDF_MARKERS = {
    "pl": ["konsensus między narzędziami", "różnica artefaktów kompilatora", "porównawcza analiza kontroli", "ślepy pakiet adjudykacyjny"],
    "en": ["cross-tool consensus", "compiler artifact diff", "comparative control analysis", "blind adjudication packet"],
    "de": ["werkzeugübergreifender Konsens", "Compiler-Artefakt-Differenz", "vergleichende Kontrollanalyse", "blindes Adjudikationspaket"],
}


def stable(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--packets", required=True)
    parser.add_argument("--summary", required=True)
    parser.add_argument("--advanced-analysis", required=True)
    parser.add_argument("--pdf-manifest", required=True)
    parser.add_argument("--pdf-verification", required=True)
    parser.add_argument("--receipt", required=True)
    args = parser.parse_args()

    packets = [json.loads(line) for line in Path(args.packets).read_text(encoding="utf-8").splitlines() if line.strip()]
    summary = json.loads(Path(args.summary).read_text(encoding="utf-8"))
    analysis = json.loads(Path(args.advanced_analysis).read_text(encoding="utf-8"))
    pdf_manifest_path = Path(args.pdf_manifest)
    pdf_manifest = json.loads(pdf_manifest_path.read_text(encoding="utf-8"))
    pdf_verification = json.loads(Path(args.pdf_verification).read_text(encoding="utf-8"))

    checks: list[dict[str, Any]] = []
    failures: list[dict[str, Any]] = []

    def check(check_id: str, passed: bool, detail: Any = None) -> None:
        row = {"id": check_id, "passed": bool(passed), "detail": detail}
        checks.append(row)
        if not passed:
            failures.append(row)

    check("packet-count", len(packets) == 450, len(packets))
    keys = {(row["caseId"], row["tier"], row["locale"]) for row in packets}
    check("packet-keys-unique", len(keys) == 450, len(keys))
    check("summary", summary.get("advancedEvidenceFamilyCount") == 7 and summary.get("proEvidenceFamilyCount") == 4 and summary.get("advancedGreaterThanProCases") == 50, summary)
    check("analysis-cases", analysis.get("cases") == 50 and len(analysis.get("advancedRows", [])) == 50, {"cases": analysis.get("cases"), "rows": len(analysis.get("advancedRows", []))})
    check("analysis-pairs", analysis.get("riskControlPairs") == 24 and analysis.get("benignControls") == 1 and analysis.get("ambiguousDependencies") == 1, {key: analysis.get(key) for key in ("riskControlPairs", "benignControls", "ambiguousDependencies")})
    check("no-independent-credit", analysis.get("independentAdjudicationCredit") == 0 and summary.get("independentAdjudicationCredit") == 0, None)

    grouped: dict[tuple[str, str], dict[str, dict[str, Any]]] = {}
    advanced_case_profiles: dict[str, str] = {}
    for packet in packets:
        temp = {key: value for key, value in packet.items() if key != "outputSha256"}
        check(f"packet:{packet['matrixId']}:hash", packet.get("outputSha256") == sha(stable(temp).encode()), packet.get("outputSha256"))
        claim = packet.get("claimBoundary") or {}
        check(f"packet:{packet['matrixId']}:claim-boundary", claim.get("automated") is True and claim.get("humanReviewIncluded") is False and claim.get("humanReviewClaimAllowed") is False and claim.get("independentCertificationClaimAllowed") is False and claim.get("personalisedAdviceAllowed") is False and claim.get("securityGuaranteeAllowed") is False, claim)
        grouped.setdefault((packet["caseId"], packet["locale"]), {})[packet["tier"]] = packet
        if packet["tier"] != "advanced":
            check(f"packet:{packet['matrixId']}:no-advanced-profile", packet.get("advancedEvidence") is None, type(packet.get("advancedEvidence")).__name__)
            continue
        tier_value = packet.get("tierValue") or {}
        families = set(tier_value.get("evidenceFamilies") or [])
        check(f"packet:{packet['matrixId']}:families", families == ALL_ADVANCED_FAMILIES and tier_value.get("evidenceFamilyCount") == 7, sorted(families))
        evidence = packet.get("evidenceTable") or []
        evidence_families = {row.get("family") for row in evidence}
        check(f"packet:{packet['matrixId']}:evidence-rows", len(evidence) == 7 and evidence_families == ALL_ADVANCED_FAMILIES, {"count": len(evidence), "families": sorted(evidence_families)})
        profile = packet.get("advancedEvidence") or {}
        profile_temp = {key: value for key, value in profile.items() if key != "profileSha256"}
        check(f"packet:{packet['matrixId']}:profile-hash", profile.get("profileSha256") == sha(stable(profile_temp).encode()), profile.get("profileSha256"))
        readiness = profile.get("adjudicationReadiness") or {}
        check(f"packet:{packet['matrixId']}:adjudication-truth", readiness.get("blindReviewPacketComplete") is True and readiness.get("independentDecision") is None and readiness.get("independentAdjudicationCredit") is False, readiness)
        for row in evidence:
            if row.get("family") in NEW_FAMILIES:
                payload = profile[{"cross_tool_consensus": "crossToolConsensus", "compiler_artifact_diff": "compilerArtifactDiff", "comparative_control_analysis": "comparativeControlAnalysis"}[row["family"]]]
                check(f"packet:{packet['matrixId']}:derived:{row['family']}", row.get("payloadSha256") == sha(stable(payload).encode()) and row.get("terminalStatus") == "DERIVED_FROM_VERIFIED_OFFICIAL_EVIDENCE", row)
        advanced_case_profiles.setdefault(packet["caseId"], profile.get("profileSha256"))
        check(f"packet:{packet['matrixId']}:locale-profile-stable", advanced_case_profiles[packet["caseId"]] == profile.get("profileSha256"), profile.get("profileSha256"))

    for key, tiers in grouped.items():
        check(f"tiers:{key}:complete", set(tiers) == {"basic", "pro", "advanced"}, sorted(tiers))
        if set(tiers) == {"basic", "pro", "advanced"}:
            basic_count = tiers["basic"]["tierValue"]["evidenceFamilyCount"]
            pro_count = tiers["pro"]["tierValue"]["evidenceFamilyCount"]
            advanced_count = tiers["advanced"]["tierValue"]["evidenceFamilyCount"]
            check(f"tiers:{key}:strict-delta", basic_count < pro_count < advanced_count and pro_count == 4 and advanced_count == 7, {"basic": basic_count, "pro": pro_count, "advanced": advanced_count})
            check(f"tiers:{key}:new-families", NEW_FAMILIES.issubset(set(tiers["advanced"]["tierValue"]["evidenceFamilies"])) and NEW_FAMILIES.isdisjoint(set(tiers["pro"]["tierValue"]["evidenceFamilies"])), None)

    classifications = [row["comparativeControlAnalysis"]["classification"] for row in analysis["advancedRows"]]
    check("classification-count-risk-control", classifications.count("RISK_TO_MITIGATION_PAIR") == 48, classifications.count("RISK_TO_MITIGATION_PAIR"))
    check("classification-count-benign", classifications.count("BENIGN_CONTROL_BASELINE") == 1, classifications.count("BENIGN_CONTROL_BASELINE"))
    check("classification-count-ambiguous", classifications.count("AMBIGUOUS_EXTERNAL_DEPENDENCY_BOUNDARY") == 1, classifications.count("AMBIGUOUS_EXTERNAL_DEPENDENCY_BOUNDARY"))

    check("pdf-manifest", pdf_manifest.get("documents") == 150 and pdf_manifest.get("pages") == 700 and pdf_manifest.get("byTier") == {"basic": 50, "pro": 50, "advanced": 50}, {key: pdf_manifest.get(key) for key in ("documents", "pages", "byTier")})
    check("pdf-qa", pdf_verification.get("schemaVersion") == "velmere.pass36.a102r44p7.audit-pdf-corpus-verification.v1" and pdf_verification.get("status") == "PASS_A102R44P7_ADVANCED_EVIDENCE_PDF_CORPUS_NO_REAL_CUSTOMER_CREDIT" and pdf_verification.get("failed") == 0 and pdf_verification.get("documentsPassed") == 150 and pdf_verification.get("pagesExecuted") == 700 and pdf_verification.get("advancedMarkerDocuments") == 50, {key: pdf_verification.get(key) for key in ("schemaVersion", "status", "failed", "documentsPassed", "pagesExecuted", "advancedMarkerDocuments")})

    advanced_pdf_rows = [row for row in pdf_manifest.get("rows", []) if row.get("tier") == "advanced"]
    marker_failures = []
    for row in advanced_pdf_rows:
        pdf_path = Path(row["path"])
        if not pdf_path.is_absolute():
            pdf_path = (pdf_manifest_path.parent / pdf_path).resolve()
        doc = fitz.open(str(pdf_path))
        text = "\n".join(page.get_text("text") for page in doc).lower()
        doc.close()
        missing = [marker for marker in EXPECTED_PDF_MARKERS[row["locale"]] if marker.lower() not in text]
        if missing:
            marker_failures.append({"path": row["path"], "locale": row["locale"], "missing": missing})
    check("advanced-pdf-markers", len(advanced_pdf_rows) == 50 and not marker_failures, {"rows": len(advanced_pdf_rows), "failures": marker_failures[:10]})

    output = {
        "schemaVersion": "velmere.pass36.a102r44p7.advanced-evidence-value-verification.v1",
        "status": "PASS_A102R44P7_ADVANCED_INCREMENTAL_EVIDENCE_LOCAL_FIXTURE_ONLY" if not failures else "FAIL_A102R44P7_ADVANCED_INCREMENTAL_EVIDENCE",
        "checks": len(checks),
        "passed": len(checks) - len(failures),
        "failed": len(failures),
        "packetRows": len(packets),
        "advancedEvidenceFamilies": 7,
        "proEvidenceFamilies": 4,
        "advancedGreaterThanProCases": 50 if not failures else None,
        "riskControlPairs": 24,
        "pdfDocuments": pdf_manifest.get("documents"),
        "pdfPages": pdf_manifest.get("pages"),
        "independentAdjudicationCredit": 0,
        "realAuditCredit": 0,
        "realCustomerPdfCredit": 0,
        "liveCredit": 0,
        "saleEnabled": False,
        "failures": failures[:100],
        "truthBoundary": "Advanced is materially differentiated by three deterministic derived evidence families on project-owned fixtures. This is not independent adjudication, deployed-contract, customer, Windows, staging, LIVE or public-sale proof.",
    }
    Path(args.receipt).write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(output, indent=2, ensure_ascii=False))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
