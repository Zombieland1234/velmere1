#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'receipts/p89/P89_AUDIT_PROVIDER_EVIDENCE_DIMENSIONS_STATIC.json'
ART=ROOT/'artifacts/p89/P89_AUDIT_PROVIDER_EVIDENCE_DIMENSIONS_STATIC.json'
FIXED='2026-08-20T18:20:00.000Z'
files={
 'dimensions':ROOT/'lib/security/audit-provider-evidence-dimensions.ts',
 'readiness':ROOT/'lib/security/audit-paid-evidence-readiness.ts',
 'packet':ROOT/'lib/security/audit-evidence-receipt-packet.ts',
 'renderer':ROOT/'lib/security/pro-audit-pdf/render-pro-audit-pdf.ts',
 'runtime':ROOT/'lib/security/audit-provider-runtime-client.ts',
 'confidence':ROOT/'lib/security/audit-runtime-confidence.ts',
 'tier':ROOT/'lib/security/audit-tier-contract.ts',
}
src={k:p.read_text('utf-8') for k,p in files.items()}
checks=[]
def check(i,c,d=None):
 row={'id':i,'status':'PASS' if c else 'FAIL'}
 if d is not None: row['detail']=d
 checks.append(row)
 if not c: raise AssertionError(f'{i}: {d}')
def has(name,*parts):
 return all(x in src[name] for x in parts)

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()

# Frozen owner thresholds are unchanged.
check('tier_pro_threshold_exact', 'minimumEvidence: { verifiedProviderReceipts: 4, independentProviderFamilies: 3, liveLanes: 5, evidenceRows: 6 }' in src['tier'])
check('tier_advanced_current_threshold_exact', src['tier'].count('minimumEvidence: { verifiedProviderReceipts: 5, independentProviderFamilies: 4, liveLanes: 6, evidenceRows: 10 }') >= 2)
check('no_threshold_lowering_pro', 'verifiedProviderReceipts: 3, independentProviderFamilies: 3, liveLanes: 5' not in src['tier'])
check('no_threshold_lowering_advanced', 'verifiedProviderReceipts: 4, independentProviderFamilies: 4, liveLanes: 6' not in src['tier'])

# Core dimension boundary.
for marker in [
 'pass4809-audit-provider-evidence-dimensions-v1',
 'lane.lineage.transport === "direct_api"',
 'lane.lineage.independenceEligible === true',
 'statusCode ?? 0) >= 200',
 'statusCode ?? 0) < 300',
 'bodyBytes ?? 0) > 0',
 'identity?.matched === true',
 'identity.verification === "exact_response"',
 'return lane.lineage.providerId.trim().toLowerCase();',
 'duplicateStrictLanesRejected',
 'duplicateLiveLanesRejected',
]: check(f'dimensions_marker_{hashlib.sha256(marker.encode()).hexdigest()[:10]}', marker in src['dimensions'], marker)
check('dimensions_one_provider_one_slot_documented', 'One canonical provider identity can satisfy at most one strict receipt' in src['dimensions'])
check('dimensions_live_not_request_counter', 'liveLanes is provider execution coverage, not a request counter' in src['dimensions'])
check('dimensions_submitted_human_excluded_by_transport', 'transport === "direct_api"' in src['dimensions'] and 'submitted_source' not in src['dimensions'].split('isSuccessfulAuditProviderLane',1)[1].split('}',1)[0])

# Readiness must use separate dimensions and authority cannot fake live execution.
check('readiness_version_v2', 'pass4819-audit-paid-evidence-readiness-v2' in src['readiness'])
check('readiness_legacy_version_preserved', 'pass4819-audit-paid-evidence-readiness-v1' in src['readiness'])
check('readiness_builds_dimensions', 'const dimensions = buildAuditProviderEvidenceDimensions(eligibleLanes);' in src['readiness'])
check('readiness_strict_threshold_separate', 'verifiedEvidenceReceipts < input.tierContract.minimumEvidence.verifiedProviderReceipts' in src['readiness'])
check('readiness_live_threshold_separate', 'dimensions.successfulLiveLaneCount < input.tierContract.minimumEvidence.liveLanes' in src['readiness'])
check('readiness_no_old_strict_live_conflation', 'verifiedEvidenceReceipts < input.tierContract.minimumEvidence.liveLanes' not in src['readiness'])
check('readiness_live_blocker_precise', 'successful_live_provider_lanes:' in src['readiness'])
check('readiness_basic_authority_only', 'const strictAuthorityReceipts = input.tier === "basic"' in src['readiness'])
check('readiness_authority_never_added_to_live_count', 'strictAuthorityReceipts.length' not in src['readiness'].split('successfulLiveProviderLanes:',1)[1].split('\n',1)[0])
check('readiness_duplicate_counts_exposed', has('readiness','duplicateStrictLanesRejected','duplicateLiveLanesRejected'))
check('readiness_dimension_version_exposed', 'evidenceDimensionVersion: PASS4809_AUDIT_PROVIDER_EVIDENCE_DIMENSIONS_ID' in src['readiness'])

# Receipt packet binds both dimensions and deduplicates before roots/counts.
check('packet_v2_current', 'pass4809-audit-evidence-receipt-packet-v2' in src['packet'])
check('packet_v1_legacy_preserved', 'pass4807-audit-evidence-receipt-packet-v1' in src['packet'])
check('packet_uses_dimension_helper', 'const dimensions = buildAuditProviderEvidenceDimensions(input.providerRuntime.lanes);' in src['packet'])
check('packet_strict_uses_deduped_rows', 'const strictLanes = dimensions.strictLanes;' in src['packet'])
check('packet_live_uses_deduped_rows', 'const successfulLiveLanes = dimensions.successfulLiveLanes;' in src['packet'])
check('packet_live_root_bound', 'liveExecutionRoot: root(successfulLiveReceipts)' in src['packet'])
check('packet_aggregate_version_current', 'schemaVersion: PASS4809_AUDIT_EVIDENCE_RECEIPT_PACKET_ID' in src['packet'])
check('packet_duplicate_counts_bound', has('packet','duplicateStrictLanesRejected: dimensions.duplicateStrictLanesRejected','duplicateLiveLanesRejected: dimensions.duplicateLiveLanesRejected'))
check('packet_live_provider_ids_bound', 'successfulLiveProviderIds: dimensions.successfulLiveProviderIds' in src['packet'])

# PDF current schema and legacy separation.
check('pdf_current_model_p89', 'audit-report-assembler-pass2578-evidence-dimensions-pass4809' in src['renderer'])
check('pdf_p88_model_preserved', 'audit-report-assembler-pass2578-render-bound-pass4808' in src['renderer'])
check('pdf_p87_model_preserved', 'audit-report-assembler-pass2578-content-bound-pass4807' in src['renderer'])
check('pdf_legacy_combined_rule_explicit', 'Math.max(tierMinimum.verifiedProviderReceipts, tierMinimum.liveLanes)' in src['renderer'])
check('pdf_current_strict_threshold_separate', 'evidenceDimensions.strictReceiptCount >= proMinimum.verifiedProviderReceipts' in src['renderer'])
check('pdf_current_live_threshold_separate', 'evidenceDimensions.successfulLiveLaneCount >= proMinimum.liveLanes' in src['renderer'])
check('pdf_current_advanced_strict_separate', 'evidenceDimensions.strictReceiptCount >= advancedMinimum.verifiedProviderReceipts' in src['renderer'])
check('pdf_current_advanced_live_separate', 'evidenceDimensions.successfulLiveLaneCount >= advancedMinimum.liveLanes' in src['renderer'])
check('pdf_current_evidence_rows_pro', 'evidenceRowCount >= proMinimum.evidenceRows' in src['renderer'])
check('pdf_current_evidence_rows_advanced', 'evidenceRowCount >= advancedMinimum.evidenceRows' in src['renderer'])
check('pdf_no_current_math_max_in_build', 'evidencePacket.counts.providerReceipts >= Math.max' not in src['renderer'])
check('pdf_current_live_blocker', 'successful_live_provider_lanes:' in src['renderer'])
check('pdf_current_evidence_row_blocker', 'evidence_rows:' in src['renderer'])
check('pdf_live_root_required_current', 'audit_pdf_evidence_root_invalid:liveExecutionRoot' in src['renderer'])
check('pdf_dimension_fields_required_current', 'audit_pdf_provider_evidence_dimensions_invalid' in src['renderer'])
check('pdf_dimension_customer_lines_verified', 'audit_pdf_provider_dimension_line_mismatch' in src['renderer'])
check('pdf_model_reference_customer_safe_digest', '`Report model reference: ${sha256Digest(MODEL_VERSION)}`' in src['renderer'])
check('pdf_dimension_reference_customer_safe_digest', '`Provider evidence dimension reference: ${sha256Digest(PASS4809_AUDIT_PROVIDER_EVIDENCE_DIMENSIONS_ID)}`' in src['renderer'])
check('pdf_no_raw_current_model_customer_line', '`Report model: ${MODEL_VERSION}`' not in src['renderer'])
check('pdf_live_count_customer_line', '`Successful live direct-provider executions: ${evidenceDimensions.successfulLiveLaneCount}`' in src['renderer'])
check('pdf_live_root_customer_line', '`Live execution root: ${evidencePacket.roots.liveExecutionRoot}`' in src['renderer'])
check('pdf_snapshot_binds_duplicate_rejections', has('renderer','duplicateStrictLanesRejected: evidenceDimensions.duplicateStrictLanesRejected','duplicateLiveLanesRejected: evidenceDimensions.duplicateLiveLanesRejected'))
check('pdf_snapshot_binds_evidence_rows', 'evidenceRows: evidenceRowCount' in src['renderer'])
check('pdf_current_render_contract_required', 'hasRenderContractModel(modelVersion)' in src['renderer'])
check('pdf_content_legacy_renderer_retained', 'snapshot.modelVersion === CONTENT_BOUND_LEGACY_MODEL_VERSION' in src['renderer'])

# Runtime and confidence surfaces no longer mislabel strict as live.
check('runtime_client_versioned', 'audit-provider-runtime-client-p89-v2' in src['runtime'])
check('runtime_client_legacy_id_preserved', 'LEGACY_PASS2572_AUDIT_PROVIDER_RUNTIME_CLIENT_ID' in src['runtime'])
check('runtime_client_dimensions_used', 'const evidenceDimensions = buildAuditProviderEvidenceDimensions(lanes);' in src['runtime'])
check('runtime_client_live_uses_successful', 'const live = evidenceDimensions.successfulLiveLaneCount;' in src['runtime'])
check('runtime_client_summary_strict_and_live_separate', 'strict exact-identity contributors' in src['runtime'] and 'successful direct-provider contributors' in src['runtime'])
check('runtime_client_duplicate_counts_exposed', has('runtime','duplicateStrictLanesRejected','duplicateLiveLanesRejected'))
check('confidence_engine_versioned', 'audit-runtime-confidence-engine-p89-v2' in src['confidence'])
check('confidence_legacy_id_preserved', 'LEGACY_PASS2573_AUDIT_RUNTIME_CONFIDENCE_ENGINE_ID' in src['confidence'])
check('confidence_uses_dimension_helper', 'const evidenceDimensions = buildAuditProviderEvidenceDimensions(runtimeLanes);' in src['confidence'])
check('confidence_live_uses_successful', 'const liveLanes = evidenceDimensions.successfulLiveLaneCount;' in src['confidence'])
check('confidence_risk_still_strict_only', 'return isStrictAuditEvidenceLane(lane);' in src['confidence'])
check('confidence_dimension_version_bound', 'providerEvidenceDimensionVersion: PASS4809_AUDIT_PROVIDER_EVIDENCE_DIMENSIONS_ID' in src['confidence'])

# Current control-plane identity.
check('active_pass_p89', (ROOT/'VELMERE_ACTIVE_PASS.txt').read_text('utf-8').strip() == 'P89R1')
check('p89_package_recipe_present', (ROOT/'P89R1_PACKAGE_BUILD_RECIPE.json').is_file())

# Harness and first-failure preservation.
for rel in [
 'scripts/p89/test-p89-audit-provider-evidence-dimensions-runtime.mjs',
 'scripts/p89/test-p89-audit-pdf-evidence-dimensions-runtime.mjs',
 'artifacts/p89/logs/regression/00A_P89_BASIC_SCHEMA_FIRST_FAIL.log',
]: check(f'harness_present_{Path(rel).name}', (ROOT/rel).is_file(), rel)
check('first_failure_no_credit_recorded', 'Credit: NONE' in (ROOT/'artifacts/p89/logs/regression/00A_P89_BASIC_SCHEMA_FIRST_FAIL.log').read_text())

failed=[x for x in checks if x['status']=='FAIL']
payload={
 'schemaVersion':'velmere.p89.audit-provider-evidence-dimensions-static.v1',
 'generatedAt':FIXED,
 'status':'PASS' if not failed else 'FAIL',
 'classification':'CURRENT_SOURCE_SEMANTIC_AND_ANTI_DUPLICATION_STATIC_PROOF',
 'checks':{'total':len(checks),'passed':len(checks)-len(failed),'failed':len(failed),'rows':checks},
 'sourceFiles':{k:{'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':sha(p)} for k,p in files.items()},
 'thresholdsUnchanged':{'pro':{'verifiedProviderReceipts':4,'independentProviderFamilies':3,'liveLanes':5,'evidenceRows':6},'advanced':{'verifiedProviderReceipts':5,'independentProviderFamilies':4,'liveLanes':6,'evidenceRows':10}},
 'zeroFakeCredit':{'liveProviderExecution':False,'providerRights':'WITHHELD','currentness':'WITHHELD','customerFinal':'0/20','auditFinalPdf':'0/3','saleEligible':'0/20'},
 'truthBoundary':'Static source proof only. It verifies current dimensional separation, versioning, anti-duplication and unchanged thresholds; it does not prove live providers, real independence, rights, deployed runtime, accuracy, Customer FINAL or sale eligibility.'
}
OUT.parent.mkdir(parents=True,exist_ok=True);ART.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(json.dumps(payload,indent=2)+'\n');ART.write_bytes(OUT.read_bytes())
print(json.dumps({'status':payload['status'],'passed':payload['checks']['passed'],'total':payload['checks']['total'],'receiptSha256':sha(OUT)},indent=2))
raise SystemExit(0 if not failed else 1)
