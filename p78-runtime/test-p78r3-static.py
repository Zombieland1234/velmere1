from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

PARENT = {
    "fileCount": 1601,
    "payloadBytes": 21040272,
    "pathSetSha256": "40b966b3bc2497a1d1d18b967ec867f182f76030af23d15329e42c6057268d59",
    "sourceContentAggregateSha256": "7f161ad862642233a7f7984bd681353f4a1aced3a0f14e1492400a4609c0146f",
}

EXPECTED_CHANGED = {
    "lib/security/erc2771-multicall-source-detector.ts",
    "lib/security/audit-claim-ledger.ts",
    "lib/security/audit-report-assembler.ts",
    "lib/security/audit-watch-post-handler.ts",
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def must(condition: bool, label: str, checks: list[str]) -> None:
    if not condition:
        raise AssertionError(label)
    checks.append(label)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source-root", required=True)
    ap.add_argument("--parent-manifest", required=True)
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--source-receipt", required=True)
    ap.add_argument("--receipt", required=True)
    args = ap.parse_args()

    root = Path(args.source_root)
    parent = json.loads(Path(args.parent_manifest).read_text(encoding="utf-8"))
    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    source_receipt = json.loads(Path(args.source_receipt).read_text(encoding="utf-8"))
    checks: list[str] = []

    for key, expected in PARENT.items():
        must(parent["projection"].get(key) == expected, f"parent_identity:{key}", checks)

    projection = manifest["projection"]
    must(projection["fileCount"] == 1602, "product_file_count_1602", checks)
    must(projection["payloadBytes"] > PARENT["payloadBytes"], "product_payload_increased", checks)
    must(projection["pathSetSha256"] != PARENT["pathSetSha256"], "pathset_changed_only_for_new_detector", checks)
    must(projection["sourceContentAggregateSha256"] != PARENT["sourceContentAggregateSha256"], "aggregate_changed", checks)

    changed_rows = source_receipt.get("changedFiles", [])
    changed_paths = {row.get("path") for row in changed_rows}
    must(changed_paths == EXPECTED_CHANGED, "exact_four_product_paths_changed", checks)
    must(len(changed_rows) == 4, "exact_four_changed_rows", checks)

    rows = {row["path"]: row for row in manifest["files"]}
    must(set(rows).issuperset(EXPECTED_CHANGED), "manifest_contains_all_r3_paths", checks)
    for rel in sorted(EXPECTED_CHANGED):
        raw = (root / rel).read_bytes()
        row = rows[rel]
        must(len(raw) == row["byteLength"], f"manifest_bytes_match:{rel}", checks)
        must(sha256(raw) == row["sha256"], f"manifest_sha_match:{rel}", checks)

    detector = (root / "lib/security/erc2771-multicall-source-detector.ts").read_text(encoding="utf-8")
    claim = (root / "lib/security/audit-claim-ledger.ts").read_text(encoding="utf-8")
    assembler = (root / "lib/security/audit-report-assembler.ts").read_text(encoding="utf-8")
    handler = (root / "lib/security/audit-watch-post-handler.ts").read_text(encoding="utf-8")

    # Detector trust boundary.
    must('detectorClass: "PURE_VERIFIED_SOURCE_PATTERN"' in detector, "detector_is_verified_source_pattern_only", checks)
    must('evidenceAddress === contractAddress' in detector, "detector_exact_contract_guard", checks)
    must('evidenceChain === chain' in detector, "detector_exact_chain_guard", checks)
    must('/^[a-f0-9]{64}$/.test(digest)' in detector, "detector_response_digest_guard", checks)
    must('Number.isFinite(Date.parse(evidence.observedAt))' in detector, "detector_observation_time_guard", checks)
    must('evidence.provider.trim()' in detector, "detector_provider_guard", checks)

    # Source decoding / bounded processing.
    must('const MAX_SOURCE_BYTES = 2_000_000;' in detector, "detector_total_source_size_cap", checks)
    must('const MAX_SOURCE_UNITS = 128;' in detector, "detector_source_unit_count_cap", checks)
    must('const MAX_UNIT_BYTES = 240_000;' in detector, "detector_per_unit_size_cap", checks)
    must('asRecord(record.sources) ?? record' in detector, "detector_standard_json_sources_decoder", checks)
    must('trimmed.startsWith("{{") && trimmed.endsWith("}}")' in detector, "detector_etherscan_double_brace_decoder", checks)
    must('.replace(/\\/\\*[\\s\\S]*?\\*\\//g, " ")' in detector, "detector_strips_block_comments", checks)
    must('.replace(/\\/\\/[^\\n\\r]*/g, " ")' in detector, "detector_strips_line_comments", checks)
    must('.replace(/"(?:\\\\.|[^"\\\\])*"/g, \'""\')' in detector, "detector_strips_double_quoted_strings", checks)

    # Pattern semantics and sender-preservation negative control.
    must('ERC2771Context' in detector and '_msgSender' in detector, "detector_meta_sender_signals", checks)
    must('functionDelegateCall' in detector and 'delegatecall' in detector, "detector_self_delegatecall_signals", checks)
    must('abi\\s*\\.\\s*encodePacked' in detector, "detector_sender_preservation_append_signal", checks)
    must('msg\\s*\\.\\s*sender\\s*!="' not in detector, "detector_no_broken_literal_preservation_check", checks)
    must('const vulnerablePattern = metaContext && selfDelegatecall && batchedUserCalldata && authUsesLogicalSender && !preservation;' in detector, "detector_vulnerable_conjunction", checks)
    must('const mitigatedPattern = metaContext && selfDelegatecall && batchedUserCalldata && preservation;' in detector, "detector_mitigated_conjunction", checks)

    # No raw source payload is part of detector report output contract.
    report_start = detector.index('export type Pass5002Erc2771MulticallSourceDetectorReport = {')
    report_end = detector.index('\n};', report_start) + 3
    report_type = detector[report_start:report_end]
    must('sourceText' not in report_type, "detector_report_type_has_no_raw_source_text", checks)
    must('abiText' not in report_type, "detector_report_type_has_no_raw_abi_text", checks)
    must('sourceDigest?: string;' in report_type, "detector_report_uses_source_digest", checks)
    must('evidenceRefs: string[];' in report_type, "detector_report_uses_bounded_evidence_refs", checks)

    # Truth / remediation / retest boundary.
    must('runtime_exploit_reproduction_not_executed' in detector, "detector_runtime_exploit_blocker", checks)
    must('deployed_runtime_bytecode_equivalence_not_proven' in detector, "detector_deployed_bytecode_blocker", checks)
    must('This detector can confirm a verified-source pattern only.' in detector, "detector_truth_boundary", checks)
    must('negativeControl:' in detector and 'positiveControl:' in detector, "detector_retest_controls_present", checks)
    must('remediation: string[];' in detector, "detector_structured_remediation_present", checks)

    # Claim ledger structured handoff.
    must('sourcePatternEvidence?: Pass5002Erc2771MulticallSourceDetectorReport | null;' in claim, "claim_ledger_accepts_source_pattern_evidence", checks)
    must('adverseKind?: "deployment_identity" | "source_pattern";' in claim, "claim_ledger_source_pattern_kind", checks)
    must('exploitabilityBoundary?: string;' in claim, "claim_ledger_exploitability_boundary", checks)
    must('remediation?: string[];' in claim, "claim_ledger_structured_remediation", checks)
    must('retest?: { required: boolean; negativeControl: string; positiveControl: string };' in claim, "claim_ledger_structured_retest", checks)
    must('sourcePatternEvidence?.state === "confirmed_source_pattern"' in claim, "claim_only_maps_confirmed_source_pattern", checks)
    must('adverseKind: "source_pattern"' in claim, "claim_marks_source_pattern_kind", checks)
    must('const claims = uniqueClaims([...sourcePatternClaims, ...authorityClaims, ...runtimeClaims, ...quorumClaims, ...derivedClaims])' in claim, "source_pattern_claim_has_precedence", checks)
    must('adverseRiskFloor:' not in claim[claim.index('const sourcePatternClaims'):claim.index('const authorityEvidence = input.authorityEvidence;')], "source_pattern_claim_has_no_risk_floor", checks)

    # Assembler must surface structured finding but isolate risk-floor arithmetic.
    must('claim.adverseKind === "source_pattern"' in assembler, "assembler_recognizes_source_pattern", checks)
    must('source pattern confirmed' in assembler, "assembler_source_pattern_title", checks)
    must('evidenceRefs: claim.evidenceRefs' in assembler, "assembler_preserves_evidence_refs", checks)
    must('remediation: claim.remediation' in assembler, "assembler_preserves_remediation", checks)
    must('retest: claim.retest' in assembler, "assembler_preserves_retest", checks)
    must('const riskFloorClaims = confirmedAdverseClaims.filter' in assembler, "assembler_separates_risk_floor_claims", checks)
    must('const adverseRiskFloor = riskFloorClaims.length > 0' in assembler, "assembler_risk_floor_uses_numeric_subset", checks)

    # Reachable customer route wiring.
    must('buildPass5002Erc2771MulticallSourceDetectorReport' in handler, "handler_imports_detector", checks)
    must('const pass5002Erc2771MulticallSourceDetector = buildPass5002Erc2771MulticallSourceDetectorReport({' in handler, "handler_executes_detector", checks)
    must('verifiedStaticEvidence: pass2572VerifiedStaticEvidence' in handler, "handler_detector_consumes_private_verified_source", checks)
    must('sourcePatternEvidence: pass5002Erc2771MulticallSourceDetector' in handler, "handler_hands_detector_to_claim_ledger", checks)

    # Projection/credit boundary remains explicit.
    excluded = set(projection.get("excludedFromCredit", []))
    for item in ("runtime exploitability proof", "deployed bytecode equivalence", "formal detector accuracy", "Customer FINAL", "Audit FINAL PDF", "paid value", "sale eligibility", "LIVE"):
        must(item in excluded, f"projection_withholds:{item}", checks)
    zero = source_receipt.get("zeroFakeCredit", {})
    must(zero.get("runtimeExploitability") == 0, "zero_credit_runtime_exploitability", checks)
    must(zero.get("formalDetectorAccuracy") == "WITHHELD", "zero_credit_formal_accuracy", checks)
    must(zero.get("customerFinal") == "0/20", "zero_credit_customer_final", checks)
    must(zero.get("auditFinalPdf") == "0/3", "zero_credit_audit_pdf", checks)
    must(zero.get("saleEligible") == "0/20", "zero_credit_sale", checks)
    must(zero.get("live") is False, "zero_credit_live", checks)

    receipt = {
        "schemaVersion": "velmere.p78r3.erc2771-multicall-static-controls.v1",
        "status": "PASS",
        "checkCount": len(checks),
        "checks": checks,
        "projection": projection,
        "truthBoundary": "Static controls prove deterministic source wiring and explicit non-promotion boundaries only. Runtime behavior, holdout accuracy, deployed exploitability and customer FINAL remain separate gates.",
    }
    Path(args.receipt).write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
