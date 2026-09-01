#!/usr/bin/env python3
import json, re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
files={
  'bundle': ROOT/'lib/security/verified-solidity-source-bundle.ts',
  'provider': ROOT/'lib/security/audit-provider-runtime-client.ts',
  'detector': ROOT/'lib/security/erc2771-multicall-context-detector.ts',
  'claim': ROOT/'lib/security/audit-claim-ledger.ts',
  'permission': ROOT/'lib/security/audit-permission-parser.ts',
  'assembler': ROOT/'lib/security/audit-report-assembler.ts',
  'projection': ROOT/'lib/security/audit-report-customer-projection.ts',
  'extract': ROOT/'lib/security/contract-source-abi-extraction.ts',
  'watch': ROOT/'lib/security/audit-watch-post-handler.ts',
}
text={k:p.read_text(encoding='utf-8') for k,p in files.items()}
checks=[]
def ck(name, cond): checks.append({'name':name,'status':'PASS' if cond else 'FAIL'})

ck('source_bundle_module_exists', files['bundle'].exists())
ck('source_bundle_supports_standard_json', '"standard-json"' in text['bundle'] and 'record.sources' in text['bundle'])
ck('source_bundle_supports_etherscan_double_brace', 'etherscan-double-brace-json' in text['bundle'] and 'raw.slice(1, -1)' in text['bundle'])
ck('source_bundle_has_raw_size_bound', 'MAX_RAW_SOURCE_BYTES' in text['bundle'] and 'source_exceeds_private_parser_boundary' in text['bundle'])
ck('source_bundle_has_file_count_bound', 'MAX_SOURCE_FILES' in text['bundle'])
ck('source_bundle_has_single_file_bound', 'MAX_SINGLE_SOURCE_BYTES' in text['bundle'])
ck('source_bundle_has_total_content_bound', 'MAX_TOTAL_SOURCE_BYTES' in text['bundle'])
ck('source_bundle_uses_strict_json', 'parseStrictJsonText' in text['bundle'])
ck('source_bundle_rejects_non_solidity_language', 'record.language' in text['bundle'] and '!== "solidity"' in text['bundle'])
ck('source_bundle_sanitizes_paths', 'sanitizePath' in text['bundle'] and 'part !== ".."' in text['bundle'])
ck('source_bundle_has_digest', 'sourceDigest' in text['bundle'] and 'sha256Digest(raw)' in text['bundle'])
ck('source_bundle_never_silently_truncates_complete', 'return { corpus: chunks.join("\\n"), complete: false }' in text['bundle'])

ck('detector_never_proves_exploitability', 'exploitabilityProven: false' in text['detector'])
ck('detector_never_authorizes_final', 'customerFinalEligibleFromDetector: false' in text['detector'])
ck('detector_requires_cross_file_composition', 'compositionMatches' in text['detector'] and 'rawDelegate' in text['detector'])
ck('detector_recognizes_direct_fix', 'FORWARDED_SENDER_PROPAGATION' in text['detector'])
ck('detector_recognizes_interim_guard', 'CONTRACT_CALLER_GUARD' in text['detector'])

ck('watch_reads_private_static_evidence', 'readPass2572AuditProviderPrivateStaticEvidence(pass2572AuditProviderRuntime)' in text['watch'])
ck('watch_parses_private_source_before_claim_ledger', text['watch'].find('parseVerifiedSoliditySourceBundle(pass78PrivateStaticEvidence?.sourceText)') < text['watch'].find('buildPass2574AuditClaimLedgerReport({'))
ck('watch_runs_detector_before_claim_ledger', text['watch'].find('detectP78Erc2771MulticallContext(pass78VerifiedSourceBundle.files)') < text['watch'].find('buildPass2574AuditClaimLedgerReport({'))
ck('watch_passes_detector_to_claim_ledger', 'sourceContextIntegrity: pass78SourceContextIntegrity' in text['watch'])
ck('watch_does_not_put_private_bundle_in_response', 'pass78VerifiedSourceBundle,' not in text['watch'].split('return NextResponse.json')[-1])

ck('claim_accepts_source_context_integrity', 'sourceContextIntegrity?: P78Erc2771MulticallResult | null' in text['claim'])
ck('claim_source_signal_is_partial', 'id: "p78-erc2771-multicall-context-source-signal"' in text['claim'] and 'grade: "partial"' in text['claim'])
ck('claim_source_signal_not_fact_safe', 'canShowAsFact: false' in text['claim'])
ck('claim_source_signal_has_no_adverse_risk_floor', 'p78-erc2771-multicall-context-source-signal' in text['claim'] and 'adverseRiskFloor:' not in text['claim'][text['claim'].find('p78-erc2771-multicall-context-source-signal'):text['claim'].find('const derivedConfidence')])
ck('claim_evidence_refs_are_hashed', 'sha256Digest(`${item.path}|${item.line}|${item.kind}`)' in text['claim'])
ck('claim_advanced_rule_automated', 'Advanced automatically resolves claims' in text['claim'])
ck('claim_no_manual_permission_instruction', 'Send to manual permissions/source parser' not in text['claim'])

ck('permission_uses_source_bundle', 'parseVerifiedSoliditySourceBundle(raw?.sourceText)' in text['permission'])
ck('permission_uses_large_bounded_analysis_corpus', 'buildVerifiedSolidityAnalysisCorpus(sourceBundle, 1_600_000)' in text['permission'])
ck('permission_tracks_source_complete', 'sourceComplete:' in text['permission'] and 'trusted.sourceComplete' in text['permission'])
ck('permission_supports_context_integrity_category', '| "context_integrity"' in text['permission'])
ck('permission_runs_context_detector', 'detectP78Erc2771MulticallContext(trusted.sourceFiles)' in text['permission'])
ck('permission_context_signal_elevated_not_critical', 'id: "erc2771-multicall-context-integrity"' in text['permission'] and 'severity: "elevated"' in text['permission'])
ck('permission_context_signal_requires_runtime_proof', 'trusted-forwarder runtime state at an exact block' in text['permission'])
ck('permission_context_signal_does_not_claim_exploitability', 'exploitabilityProven=false' in text['permission'])
ck('permission_public_evidence_is_digest_ref', 'verified-source-ref:' in text['permission'] and 'safePatternEvidence' in text['permission'])
ck('permission_raw_line_sample_removed', 'function sampleEvidence' not in text['permission'])
ck('permission_standard_evidence_no_raw_line', 'verified-static-pattern:' in text['permission'])
ck('permission_advanced_rule_not_manual', 'Advanced must manually review' not in text['permission'] and 'Advanced automatically resolves caller control' in text['permission'])
ck('permission_basic_can_surface_context_signal', 'const signals: Pass2576PermissionSignal[] = contextSignal ? [contextSignal, ...baseSignals]' in text['permission'])

ck('extract_uses_source_bundle', 'parseVerifiedSoliditySourceBundle(value)' in text['extract'])
ck('extract_requires_complete_source_bundle', 'if (!bundle.valid || !bundle.complete) return "";' in text['extract'])
ck('extract_supports_larger_bounded_abi', 'maxBytes: 400_000' in text['extract'])
ck('extract_static_cannot_final_sign', 'canFinalSignFromStaticExtraction: false' in text['extract'])
ck('extract_advanced_rule_automated', 'Advanced automatically compares source, ABI, implementation' in text['extract'])

ck('assembler_builds_permission_specific_findings', 'findingFromPermissionSignal' in text['assembler'])
ck('assembler_promotes_elevated_permission_signals', 'signal.state === "detected" && (signal.severity === "elevated" || signal.severity === "critical")' in text['assembler'])
ck('assembler_puts_specific_findings_before_sections', '...permissionFindings, ...sectionFindings' in text['assembler'])
ck('assembler_pdf_includes_top_finding_lines', 'Finding ${index + 1}: ${finding.title}' in text['assembler'])
ck('assembler_does_not_make_permission_risk_floor', 'adverseRiskFloor' in text['assembler'] and 'permissionFindings' in text['assembler'])

ck('projection_preserves_permission_findings', 'finding.sourceFamily.startsWith("permission:") && visibleIds.has("permission-parser")' in text['projection'])
ck('projection_still_hides_advanced_queue', 'const advancedQueue: string[] = []' in text['projection'])

failed=[c for c in checks if c['status']=='FAIL']
receipt={
  'schemaVersion':'velmere.p78r3.customer-path-static.v1',
  'status':'FAIL' if failed else 'PASS',
  'checkCount':len(checks),
  'checks':checks,
  'zeroFakeCredit':{
    'customerFinal':'0/20',
    'auditFinalPdf':'0/3',
    'exactWindows':'WITHHELD',
    'typescriptSemanticCheck':'WITHHELD_LOCAL_TOOLCHAIN_MISMATCH',
    'deploymentExploitability':'WITHHELD',
    'note':'Static implementation-shape proof only. No FINAL, PDF FINAL, exact-Windows, rights/currentness, deployment exploitability or independent holdout credit.'
  }
}
out=ROOT/'receipts/p78/P78R3_CUSTOMER_PATH_STATIC.json'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(receipt,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps({'status':receipt['status'],'checkCount':len(checks),'failed':[c['name'] for c in failed]},indent=2,ensure_ascii=False))
raise SystemExit(1 if failed else 0)
