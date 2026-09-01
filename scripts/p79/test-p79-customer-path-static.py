#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
files = {
    "registry": ROOT / "lib/security/audit-historical-deployment-ground-truth.ts",
    "adjudicator": ROOT / "lib/security/audit-deployment-context-adjudicator.ts",
    "claim": ROOT / "lib/security/audit-claim-ledger.ts",
    "assembler": ROOT / "lib/security/audit-report-assembler.ts",
    "projection": ROOT / "lib/security/audit-report-customer-projection.ts",
    "watch": ROOT / "lib/security/audit-watch-post-handler.ts",
    "pdf": ROOT / "lib/security/pro-audit-pdf/render-pro-audit-pdf.ts",
    "renderer": ROOT / "lib/security/pro-audit-pdf/customer-safe-renderer.ts",
    "runtime": ROOT / "scripts/p79/test-p79-historical-deployment-customer-path-runtime.mjs",
}
text = {key: path.read_text(encoding="utf-8") for key, path in files.items()}
checks = []

def ck(name, cond):
    checks.append({"name": name, "status": "PASS" if cond else "FAIL"})

ck("p79_registry_module_exists", files["registry"].exists())
ck("p79_adjudicator_module_exists", files["adjudicator"].exists())
ck("p79_runtime_harness_exists", files["runtime"].exists())
ck("p79_registry_schema_versioned", "p79-historical-deployment-ground-truth.v1" in text["registry"])
ck("p79_registry_exact_target", "0x0dabdc92af35615443412a336344c591faed3f90" in text["registry"])
ck("p79_registry_exact_snapshot_block", "34_141_659" in text["registry"])
ck("p79_registry_exact_attack_block", "34_141_660" in text["registry"])
ck("p79_registry_exact_attack_tx", "0x1ee617cd739b1afcc673a180e60b9a32ad3ba856226a68e8748d58fcccc877a8" in text["registry"])
ck("p79_registry_exact_forwarder", "0x7c4717039b89d5859c4fbb85edb19a6e2ce61171" in text["registry"])
ck("p79_registry_exact_implementation", "0xae5be6d490c47c7417e91b7911d3a0ce3553438d" in text["registry"])
ck("p79_registry_extracts_eip1167", "extractP79Eip1167Implementation" in text["registry"] and "363d3d373d3d3d363d73" in text["registry"])
ck("p79_registry_digest_signed", "recordDigest: sha256Digest(canonicalJson(unsigned))" in text["registry"])
ck("p79_registry_integrity_verifier", "verifyP79HistoricalDeploymentGroundTruthRecord" in text["registry"])
ck("p79_registry_eight_pinned_anchors", text["registry"].count('kind: "') >= 8 and "state_snapshot" in text["registry"] and "execution_trace" in text["registry"] and "upstream_replay_poc" in text["registry"])
ck("p79_registry_verified_source_metadata_anchor", "verified_source_metadata" in text["registry"] and "3deb32daa01207e8883aa7ddab85bd0a81952758" in text["registry"])
ck("p79_registry_verified_primary_source_anchor", "0a12f986ce8bbba57b655889f3f049729b47b764" in text["registry"])
ck("p79_registry_verified_erc2771_source_anchor", "d0d8039614eb6b48ca2a20dac78823bbb17977d5" in text["registry"])
ck("p79_registry_verified_multicall_source_anchor", "bbdde89e3d4267717502c9e6e4b419ddcbd89bd3" in text["registry"])
ck("p79_registry_compile_runtime_binding_withheld", "exactCompilationToRuntimeProven: false" in text["registry"])
ck("p79_registry_exact_canonical_record_verification", "observedUnsigned !== DOMINOTT_UNSIGNED_CANONICAL" in text["registry"])
ck("p79_registry_returns_isolated_clones", "cloneRecord(DOMINOTT_RECORD)" in text["registry"])
ck("p79_registry_pins_mirror_commit", "f33fc07accb9f91a2705e3ad67ddf034622e52b8" in text["registry"])
ck("p79_registry_pins_upstream_commit", "ad353ba25fbb897c56d64c28ce92ee10ac68cad2" in text["registry"])
ck("p79_registry_metadata_only_rights", "DERIVED_METADATA_AND_PINNED_REFERENCES_ONLY" in text["registry"])
ck("p79_registry_no_raw_source_trace_state_packaged", "rawSourceTraceStatePackaged: false" in text["registry"])
ck("p79_registry_no_customer_redistribution_claim", "customerRedistributionAuthorized: false" in text["registry"])
ck("p79_registry_historical_only", "HISTORICAL_EXACT_BLOCK_ONLY" in text["registry"])
ck("p79_registry_current_runtime_false", "currentRuntimeStateProven: false" in text["registry"])
ck("p79_registry_current_forwarder_false", "currentTrustedForwarderStateProven: false" in text["registry"])
ck("p79_registry_current_exploitability_false", "currentExploitabilityProven: false" in text["registry"])
ck("p79_registry_no_network_fetch", "fetch(" not in text["registry"] and "brokeredEgressFetch" not in text["registry"])
ck("p79_registry_no_raw_solidity_payload", "pragma solidity" not in text["registry"] and "delegatecall(" not in text["registry"])

ck("p79_adjudicator_schema_versioned", "p79-deployment-context-adjudicator.v1" in text["adjudicator"])
ck("p79_adjudicator_three_way_classification", all(item in text["adjudicator"] for item in ["NOT_APPLICABLE", "BLOCKED_SOURCE_NOT_BOUND", "HISTORICAL_DEPLOYMENT_BOUND_UPSTREAM_REPLAY"]))
ck("p79_adjudicator_requires_p78_source_signal", "isBoundP78SourceSignal" in text["adjudicator"] and "P78_ERC2771_MULTICALL_DETECTOR_ID" in text["adjudicator"])
ck("p79_adjudicator_requires_complete_detector_evidence", all(item in text["adjudicator"] for item in ['evidenceKinds.has("composition")', 'evidenceKinds.has("multicall")', 'evidenceKinds.has("trusted_forwarder_configuration")']))
ck("p79_adjudicator_rejects_detector_final_or_exploitability", "detectorExploitabilityProven" in text["adjudicator"] and "detectorCustomerFinalEligible" in text["adjudicator"])
ck("p79_adjudicator_verifies_registry", "verifyP79HistoricalDeploymentGroundTruthRecord(record)" in text["adjudicator"])
ck("p79_adjudicator_binds_proxy_implementation", "extractP79Eip1167Implementation(record.deployment.runtimeBytecode)" in text["adjudicator"])
ck("p79_adjudicator_public_result_no_runtime_bytecode_field", "runtimeBytecode: string" not in text["adjudicator"] and "containsForbiddenPrivateField(result)" in text["adjudicator"])
ck("p79_adjudicator_binds_record_digest", "recordDigest: record.recordDigest" in text["adjudicator"])
ck("p79_adjudicator_binds_source_corpus_count", "pinnedSourceCorpusAnchorCount" in text["adjudicator"])
ck("p79_adjudicator_compile_runtime_binding_withheld", "exactCompilationToRuntimeProven: false" in text["adjudicator"])
ck("p79_adjudicator_no_raw_source_or_abi", "rawSourceIncluded: false" in text["adjudicator"] and "rawAbiIncluded: false" in text["adjudicator"])
ck("p79_adjudicator_historical_fact_only", "historicalSnapshotOnly" in text["adjudicator"] and "This does not prove current exploitability" in text["adjudicator"])
ck("p79_adjudicator_upstream_replay_only", "upstreamReplayProven: true" in text["adjudicator"] and "independentVelmereReplayProven: false" in text["adjudicator"])
ck("p79_adjudicator_customer_final_hard_false", "customerFinalEligible: false as const" in text["adjudicator"])
ck("p79_adjudicator_pdf_final_hard_false", "auditFinalPdfEligible: false as const" in text["adjudicator"])
ck("p79_adjudicator_current_exploitability_hard_false", "currentExploitabilityProven: false as const" in text["adjudicator"])
ck("p79_adjudicator_result_digest", "adjudicationDigest: sha256Digest(canonicalJson(unsigned))" in text["adjudicator"])
ck("p79_adjudicator_integrity_verifier", "verifyP79HistoricalDeploymentContextAdjudication" in text["adjudicator"])
ck("p79_adjudicator_rejects_forged_replay", "result.replay.independentVelmereReplayProven !== false" in text["adjudicator"])
ck("p79_adjudicator_rejects_forged_final", "result.customerFinalEligible !== false" in text["adjudicator"] and "result.auditFinalPdfEligible !== false" in text["adjudicator"])
ck("p79_adjudicator_no_network_fetch", "fetch(" not in text["adjudicator"] and "brokeredEgressFetch" not in text["adjudicator"])

ck("p79_watch_imports_adjudicator", "buildP79HistoricalDeploymentContextAdjudication" in text["watch"])
ck("p79_watch_builds_after_detector", text["watch"].find("pass79HistoricalDeploymentContext = buildP79") > text["watch"].find("detectP78Erc2771MulticallContext"))
ck("p79_watch_builds_before_claim_ledger", text["watch"].find("pass79HistoricalDeploymentContext = buildP79") < text["watch"].find("buildPass2574AuditClaimLedgerReport({"))
ck("p79_watch_passes_to_claim_ledger", "deploymentContextEvidence: pass79HistoricalDeploymentContext" in text["watch"])
ck("p79_watch_does_not_return_raw_registry", "pass79HistoricalDeploymentContext," not in text["watch"].split("return NextResponse.json")[-1])

ck("p79_pdf_reads_private_static_source", "readPass2572AuditProviderPrivateStaticEvidence(providerRuntime)" in text["pdf"])
ck("p79_pdf_runs_p78_detector", "detectP78Erc2771MulticallContext(verifiedSourceBundle.files)" in text["pdf"])
ck("p79_pdf_runs_p79_adjudicator", "buildP79HistoricalDeploymentContextAdjudication" in text["pdf"])
ck("p79_pdf_passes_both_source_and_deployment", "sourceContextIntegrity," in text["pdf"] and "deploymentContextEvidence: historicalDeploymentContext" in text["pdf"])
ck("p79_pdf_emits_top_findings", '"Top findings:"' in text["pdf"] and "reportAssembler.topFindings.slice(0, 7)" in text["pdf"])
ck("p79_pdf_preserves_closed_public_chain_evidence_only", "PUBLIC_HISTORICAL_CHAIN_EVIDENCE_LINE" in text["renderer"] and "hasClosedHistoricalChainEvidence" in text["renderer"])
ck("p79_pdf_mask_has_same_closed_pattern", "historicalDeployment=0x[a-fA-F0-9]{40}" in text["pdf"] and "currentExploitabilityProven=false" in text["pdf"])
ck("p79_pdf_does_not_allow_generic_wallet_lines", "hasPublicTargetAddress || hasClosedHistoricalChainEvidence" in text["renderer"])

ck("p79_claim_accepts_adjudication", "deploymentContextEvidence?: P79HistoricalDeploymentContextAdjudication | null" in text["claim"])
ck("p79_claim_verifies_adjudication", "verifyP79HistoricalDeploymentContextAdjudication(deploymentContextEvidence)" in text["claim"])
ck("p79_claim_historical_confirmed", 'label: "Historical deployment-bound exploit"' in text["claim"] and 'grade: "confirmed"' in text["claim"])
ck("p79_claim_historical_fact_safe", "canShowAsFact: true" in text["claim"])
ck("p79_claim_historical_critical", 'adverseKind: "historical_exploit"' in text["claim"] and 'adverseSeverity: "critical"' in text["claim"])
hist_slice = text["claim"][text["claim"].find("const historicalDeploymentClaims"):text["claim"].find("const sourceContextIntegrity")]
ck("p79_claim_historical_has_no_risk_floor", "adverseRiskFloor" not in hist_slice)
ck("p79_claim_preserves_currentness_boundary", "before any current or FINAL claim" in text["claim"])

ck("p79_assembler_separates_history_from_risk_floor", "confirmedRiskFloorClaims" in text["assembler"] and "confirmedHistoricalClaims" in text["assembler"])
ck("p79_assembler_risk_floor_ignores_history", "const adverseRiskFloor = confirmedRiskFloorClaims.length" in text["assembler"])
ck("p79_assembler_historical_finding_title", "Historical deployment-bound exploit · confirmed" in text["assembler"])
ck("p79_assembler_uses_explicit_historical_severity", "claim.adverseSeverity" in text["assembler"])
ck("p79_assembler_history_before_permission_findings", text["assembler"].find("...adverseFindings") < text["assembler"].find("...permissionFindings") < text["assembler"].find("...sectionFindings"))
ck("p79_projection_preserves_history_via_claim_ledger", 'finding.sourceFamily.startsWith("historical-deployment:") && visibleIds.has("claim-ledger")' in text["projection"])

ck("p79_runtime_has_negative_wrong_target", "p79_wrong_target_not_applicable" in text["runtime"])
ck("p79_runtime_has_negative_wrong_chain", "p79_wrong_chain_not_applicable" in text["runtime"])
ck("p79_runtime_has_forged_replay_test", "p79_forged_independent_replay_rejected" in text["runtime"])
ck("p79_runtime_has_forged_current_test", "p79_forged_current_exploitability_rejected" in text["runtime"])
ck("p79_runtime_has_forged_final_test", "p79_forged_customer_final_rejected" in text["runtime"])
ck("p79_runtime_has_resigned_registry_tamper_test", "p79_registry_resigned_anchor_tamper_rejected" in text["runtime"])
ck("p79_runtime_has_resigned_detector_tamper_test", "p79_adjudication_resigned_detector_tamper_rejected" in text["runtime"])
ck("p79_runtime_has_resigned_evidence_tamper_test", "p79_adjudication_resigned_evidence_tamper_rejected" in text["runtime"])
ck("p79_runtime_has_wrong_detector_binding_test", "p79_wrong_detector_cannot_bind" in text["runtime"])
ck("p79_runtime_has_incomplete_evidence_binding_test", "p79_incomplete_source_evidence_cannot_bind" in text["runtime"])
ck("p79_runtime_checks_pdf_path", "buildProAuditPdfSnapshot" in text["runtime"] and "p79_pdf_snapshot_contains_historical_finding" in text["runtime"])
ck("p79_runtime_pdf_accepts_closed_chain_row", "p79_pdf_safety_accepts_closed_historical_chain_row" in text["runtime"])
ck("p79_runtime_pdf_rejects_generic_wallet", "p79_pdf_safety_rejects_generic_wallet_row" in text["runtime"])
ck("p79_runtime_pdf_rejects_freeform_tx", "p79_pdf_safety_rejects_freeform_transaction_row" in text["runtime"])
ck("p79_runtime_pdf_rejects_truncated_chain_row", "p79_pdf_safety_rejects_truncated_historical_row" in text["runtime"])
ck("p79_runtime_pdf_rejects_email", "p79_pdf_safety_rejects_email" in text["runtime"])
ck("p79_runtime_checks_private_public_boundary", "p79_public_path_excludes_exact_source" in text["runtime"] and "p79_public_path_excludes_raw_runtime" in text["runtime"])
ck("p79_runtime_zero_fake_credit", 'customerFinal: "0/20"' in text["runtime"] and 'auditFinalPdf: "0/3"' in text["runtime"])

failed = [row for row in checks if row["status"] == "FAIL"]
receipt = {
    "schemaVersion": "velmere.p79.customer-path-static.v1",
    "status": "FAIL" if failed else "PASS",
    "checkCount": len(checks),
    "checks": checks,
    "zeroFakeCredit": {
        "customerFinal": "0/20",
        "auditFinalPdf": "0/3",
        "exactWindows": "WITHHELD",
        "independentVelmereReplay": "WITHHELD",
        "currentRpcQuorum": "WITHHELD",
        "currentExploitability": "WITHHELD",
        "note": "Static source-shape proof only. It proves fail-closed wiring and public/private boundaries, not current chain state or FINAL delivery.",
    },
}
out = ROOT / "receipts/p79/P79_CUSTOMER_PATH_STATIC.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps({"status": receipt["status"], "checkCount": len(checks), "failed": [row["name"] for row in failed]}, indent=2, ensure_ascii=False))
raise SystemExit(1 if failed else 0)
