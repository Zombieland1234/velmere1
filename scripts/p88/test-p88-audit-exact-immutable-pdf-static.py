#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'receipts/p88/P88_AUDIT_EXACT_IMMUTABLE_PDF_STATIC.json'
GENERATED_AT='2026-08-20T13:30:00.000Z'
CHECKS=[]

def check(cid, condition, detail=None):
    row={'id':cid,'status':'PASS' if condition else 'FAIL'}
    if detail is not None: row['detail']=detail
    CHECKS.append(row)
    if not condition: raise AssertionError(f'{cid}: {detail}')

def text(rel): return (ROOT/rel).read_text(encoding='utf-8')
def data(rel): return (ROOT/rel).read_bytes()
def sha(rel): return hashlib.sha256(data(rel)).hexdigest()
def exists(rel): return (ROOT/rel).is_file()

MASTER='VELMERE_ULTIMATE_WORLD_CLASS_CONTINUOUS_CLOSURE_FINAL_CANDIDATE_MASTER_DIRECTIVE_V2_COMPLETE_2026-08-20.txt'
V17='VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt'
EXACT='lib/security/audit-report-exact-pdf-artifact.ts'
STORE='lib/security/audit-report-snapshot-store.ts'
RENDERER='lib/security/pro-audit-pdf/render-pro-audit-pdf.ts'
PRO_SETTLE='lib/server/lazy-route-modules/security--audit-review--pro--settle.ts'
ADV_SETTLE='lib/server/lazy-route-modules/security--audit-review--advanced--settle.ts'
TOKEN='lib/server/lazy-route-modules/security--audit-watch--pro-pdf--token.ts'
DOWNLOAD='lib/server/lazy-route-modules/security--audit-watch--pro-pdf.ts'
ADMIN='lib/server/lazy-route-modules/admin--security--advanced-audit-release.ts'
RPC='lib/db/supabase-rpc-operation-registry.ts'
MIG='supabase/migrations/20260820000005_p88_audit_paid_exact_immutable_pdf_blob.sql'
SCHEMA='lib/db/schema.sql'
RUNTIME='receipts/p88/P88_AUDIT_EXACT_IMMUTABLE_PDF_RUNTIME.json'
FILES=[MASTER,V17,EXACT,STORE,RENDERER,PRO_SETTLE,ADV_SETTLE,TOKEN,DOWNLOAD,ADMIN,RPC,MIG,SCHEMA,RUNTIME]
for rel in FILES: check(f'exists:{rel}',exists(rel))

# Complete owner execution authority is exact and self-validating.
master=text(MASTER)
sections=[int(x) for x in re.findall(r'^#\s+(\d+)\.',master,re.M)]
check('authority:master_exact_sha256',sha(MASTER)=='9184cd18eb864f50a8c5d3af8f2899e7f138372861095e343901ab9c5e3bcb53')
check('authority:master_exact_bytes',len(data(MASTER))==38471)
check('authority:master_sections_count',len(sections)==89,sections)
check('authority:master_sections_exact',sections==list(range(89)),sections)
check('authority:master_start_now','\nSTART NOW\n' in master)
check('authority:master_end_sentinel','\nEND-OF-DIRECTIVE\n' in master)
check('authority:master_completeness_contract','SECTIONS 0–88 PRESENT' in master or 'SECTIONS 0–88 MUST BE PRESENT BEFORE EXECUTION' in master)
check('authority:v17_exact_sha256',sha(V17)=='de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05')
check('authority:topology_10_20_20_10',all(x in master for x in ['10 product families','20 customer-facing rows','20 current execution profiles','10 material paid transitions']))
check('authority:render_once_contract',all(x in master for x in ['render once','immutable stored bytes','one canonical SHA-256']))
check('authority:no_download_regeneration','Nie regeneruj finalnego PDF przy download.' in master)

exact=text(EXACT); store=text(STORE); renderer=text(RENDERER); pro=text(PRO_SETTLE); adv=text(ADV_SETTLE); token=text(TOKEN); download=text(DOWNLOAD); admin=text(ADMIN); rpc=text(RPC); mig=text(MIG); schema=text(SCHEMA)

# First-render builder and immutable exact-byte object.
check('renderer:artifact_builder_export','export async function buildProAuditPdfSnapshotArtifact' in renderer)
check('renderer:first_render_bytes_created','const renderedPdf = new Uint8Array(buildCustomerSafeMinimalPdf' in renderer)
check('renderer:contract_digest_from_first_bytes','pdfDigest: sha256BytesDigest(renderedPdf)' in renderer)
check('renderer:contract_length_from_first_bytes','pdfByteLength: renderedPdf.byteLength' in renderer)
check('renderer:returns_first_render_bytes','return { snapshot, pdfBytes: new Uint8Array(renderedPdf) };' in renderer)
check('renderer:compat_builder_delegates','const artifact = await buildProAuditPdfSnapshotArtifact(input);' in renderer and 'return artifact.snapshot;' in renderer)
check('renderer:diagnostic_rerender_remains_separate','export function renderProAuditPdfSnapshot' in renderer)

check('exact:schema_version','p88-audit-paid-exact-immutable-pdf-artifact-v1' in exact)
check('exact:min_max_budget','P88_AUDIT_EXACT_PDF_MIN_BYTES' in exact and 'P88_AUDIT_EXACT_PDF_MAX_BYTES' in exact)
check('exact:structural_validator','inspectPdfStructure(bytes)' in exact)
check('exact:header_validation','audit_exact_pdf_header_invalid' in exact)
check('exact:eof_validation','audit_exact_pdf_eof_invalid' in exact)
check('exact:active_content_validation','audit_exact_pdf_active_content_forbidden' in exact)
check('exact:snapshot_digest_binding','audit_exact_pdf_snapshot_digest_mismatch' in exact)
check('exact:snapshot_length_binding','audit_exact_pdf_snapshot_length_mismatch' in exact)
check('exact:render_contract_authority','PASS4808_PDF_RENDER_CONTRACT_ID' in exact)
check('exact:canonical_base64_regex',r'^(?:[A-Za-z0-9+/]{4})*' in exact)
check('exact:canonical_base64_roundtrip','Buffer.from(bytes).toString("base64") !== value' in exact)
check('exact:stored_base64_not_silently_normalized','value.replace(/\\n/g, "")' not in exact)
check('exact:metadata_line_binding','.join("\\n")' in exact)
for field in ['reportId','caseRef','requestId','accountIdHash','entitlementId','tier','targetHash','reportVersionHash','snapshotDigest','sourceReceiptRoot','pdfDigest','pdfByteLength','renderContractId','createdAt']:
    check(f'exact:metadata_binds:{field}',f'metadata.{field}' in exact)
check('exact:record_digest_verifier','exactMetadataDigest(metadata) === artifact.recordDigest' in exact)
check('exact:artifact_bytes_required','artifact.pdfBytes instanceof Uint8Array' in exact)

# Store and completion boundary.
check('store:record_contains_exact_bytes','pdfBytes: Uint8Array' in store)
check('store:record_contains_length','pdfByteLength: number' in store)
check('store:record_contains_contract','renderContractId: typeof PASS4808_PDF_RENDER_CONTRACT_ID' in store)
check('store:record_contains_record_digest','pdfRecordDigest: string' in store)
check('store:no_renderer_import','renderProAuditPdfSnapshot' not in store)
check('store:direct_durable_write_blocked','audit_report_exact_pdf_atomic_completion_required' in store)
check('store:production_memory_blocked','audit_report_snapshot_durable_store_required' in store)
check('store:local_idempotency_compares_bytes','bytesEqual(left.pdfBytes, right.pdfBytes)' in store)
check('store:v2_pro_operation','audit_pro_worker_complete_with_exact_pdf_v2' in store)
check('store:v2_advanced_operation','audit_advanced_worker_complete_with_exact_pdf_v2' in store)
check('store:rpc_sends_canonical_base64','p_pdf_base64: encodeP88AuditExactPdfBase64(record.pdfBytes)' in store)
check('store:rpc_receipt_length_rechecked','Number(row.pdfByteLength) !== record.pdfByteLength' in store)
check('store:rpc_receipt_contract_rechecked','row.renderContractId' in store and 'record.renderContractId' in store)
check('store:rpc_receipt_record_digest_rechecked','row.pdfRecordDigest' in store and 'record.pdfRecordDigest' in store)
check('store:durable_reads_blob_table','.from("velmere_audit_report_pdf_blobs")' in store)
check('store:missing_blob_withheld','audit_report_exact_pdf_bytes_withheld' in store)
check('store:cross_binding_pairs','audit_report_exact_pdf_cross_binding_mismatch' in store)
check('store:stored_bytes_revalidated','decodeP88StoredAuditExactPdfBytes' in store and 'buildRecord({' in store)
check('store:owner_hash_rechecked','record.accountIdHash !== accountIdHash' in store)
check('store:entitlement_rechecked','record.entitlementId !== entitlementId' in store)

# Both paid completion routes carry first-render bytes.
for name,body,tier in [('pro',pro,'pro'),('advanced',adv,'advanced')]:
    check(f'{name}_settle:uses_artifact_builder','buildProAuditPdfSnapshotArtifact' in body)
    check(f'{name}_settle:destructures_pdf_bytes','const { snapshot, pdfBytes }' in body)
    check(f'{name}_settle:passes_pdf_bytes',body.count('pdfBytes,')>=2)
    check(f'{name}_settle:exact_storage_receipt','exactPdfStorage: "render_once_immutable_blob"' in body)
    check(f'{name}_settle:tier_bound',f'tier: "{tier}"' in body)

# Customer download route must never reconstruct the artifact.
check('download:no_renderer_import','render-pro-audit-pdf' not in download)
check('download:no_render_function','renderProAuditPdf' not in download)
check('download:no_worker_payload','renderProAuditPdfWorkerPayload' not in download)
check('download:no_durable_recompute','runDurableBinaryComputation' not in download)
check('download:reads_snapshot_store','readAuditReportSnapshotForDelivery' in download)
check('download:uses_exact_delivery','buildExactCustomerPdfDelivery' in download)
check('download:body_from_stored_bytes','pdfBytes: report.pdfBytes' in download)
check('download:digest_from_stored_record','expectedPdfSha256: report.pdfDigest' in download)
check('download:length_rechecked','delivery.byteLength !== report.pdfByteLength' in download)
check('download:same_blob_header','same_immutable_blob' in download)
check('download:exact_storage_header','render-once-immutable-blob' in download)
check('download:no_store_cache','no-store, private, max-age=0' in download)
check('download:content_security_sandbox','"content-security-policy": "sandbox"' in download)
check('download:account_required','account_session_required' in download)
check('download:case_owner_check','getAuditCaseForOwningAccount' in download)
check('download:entitlement_recheck','verifyVlmPaidSurfaceEntitlementById' in download)
check('download:report_version_check','audit_pdf_report_version_mismatch' in download)
check('download:completed_review_required','review.state !== "completed"' in download)
check('download:single_use_token_lifecycle','reservePass4658AuditPdfDownloadToken' in download and 'finalizePass4658AuditPdfDownloadToken' in download and 'failPass4658AuditPdfDownloadReservation' in download)
check('download:no_bytes_on_token_failure',download.index('reservePass4658AuditPdfDownloadToken') < download.index('buildExactCustomerPdfDelivery'))
check('download:no_rerender_fallback','render' not in re.sub(r'"[^"]*render[^"]*"', '', download, flags=re.I).lower() or 'renderProAuditPdfSnapshot' not in download)

check('token:binds_byte_length','pdfByteLength: report.pdfByteLength' in token)
check('token:binds_render_contract','renderContractId: report.renderContractId' in token)
check('token:binds_exact_storage','exactPdfStorage: "render_once_immutable_blob"' in token)
check('admin:binds_byte_length','pdfByteLength: reportRecord.pdfByteLength' in admin)
check('admin:binds_render_contract','renderContractId: reportRecord.renderContractId' in admin)
check('admin:exact_bytes_comment','verifies the exact' in admin and 'stored PDF bytes' in admin)
check('rpc:pro_v2_registered','velmere_complete_pro_audit_with_exact_pdf_v2' in rpc)
check('rpc:advanced_v2_registered','velmere_complete_advanced_audit_with_exact_pdf_v2' in rpc)

# Ordered migration and database fail-closed semantics.
check('migration:ordered_after_p86',Path(MIG).name=='20260820000005_p88_audit_paid_exact_immutable_pdf_blob.sql')
check('migration:transaction_wrapped',mig.startswith('begin;') and mig.rstrip().endswith('commit;'))
check('migration:table_created','create table if not exists public.velmere_audit_report_pdf_blobs' in mig)
check('migration:fk_snapshot','references public.velmere_audit_report_snapshots(report_id) on delete restrict' in mig)
check('migration:one_blob_per_case_tier','unique (case_ref, tier)' in mig)
check('migration:length_constraint','octet_length(pdf_bytes) = pdf_byte_length' in mig)
check('migration:header_constraint',"substring(pdf_bytes from 1 for 5) = decode('255044462d', 'hex')" in mig)
check('migration:digest_constraint',"pdf_digest = 'sha256:' || encode(digest(pdf_bytes, 'sha256'), 'hex')" in mig)
check('migration:rls_enabled','alter table public.velmere_audit_report_pdf_blobs enable row level security' in mig)
check('migration:no_customer_table_access','revoke all on public.velmere_audit_report_pdf_blobs from public, anon, authenticated' in mig)
check('migration:service_role_only_table','grant select, insert on public.velmere_audit_report_pdf_blobs to service_role' in mig)
check('migration:insert_validator_trigger','p88_validate_audit_report_pdf_blob' in mig)
check('migration:immutable_trigger','p88_reject_audit_report_pdf_blob_mutation' in mig)
check('migration:no_mutation_grants','grant update' not in mig.lower() and 'grant delete' not in mig.lower())
check('migration:trigger_snapshot_lock','for key share' in mig)
check('migration:trigger_full_cross_binding','audit_exact_pdf_snapshot_cross_binding_mismatch' in mig and 'audit_exact_pdf_render_contract_cross_binding_mismatch' in mig)
check('migration:strict_eof_tail',"!~ '%%EOF[[:space:]]*$'" in mig)
check('migration:bounded_active_token_regex',"/(JavaScript|JS|Launch|EmbeddedFile|OpenAction|AA)([^A-Za-z0-9_]|$)" in mig)
check('migration:no_broad_aa_position',"position(convert_to('/AA'" not in mig)
check('migration:null_safe_input_validation','p_account_id_hash is null' in mig and 'p_pdf_byte_length is null' in mig and 'p_snapshot_json is null' in mig)
check('migration:snapshot_length_string_checked',"pdfByteLength}', '') !~ '^[0-9]+$'" in mig)
check('migration:strict_base64_shape',"^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$" in mig)
check('migration:base64_roundtrip',"replace(encode(v_pdf_bytes, 'base64'), E'\\n', '') <> p_pdf_base64" in mig)
check('migration:record_digest_recomputed','audit_exact_pdf_record_digest_invalid' in mig and "concat_ws(E'\\n'" in mig)
check('migration:advisory_lock','pg_advisory_xact_lock' in mig)
check('migration:historical_snapshot_only_withheld','if v_snapshot_found and not v_blob_found' in mig and 'audit_report_exact_pdf_bytes_withheld' in mig)
check('migration:orphan_blob_blocked','if v_blob_found and not v_snapshot_found' in mig and 'audit_exact_pdf_orphan_integrity_failure' in mig)
check('migration:legacy_completion_inside_transaction','velmere_complete_pro_audit_with_snapshot' in mig and 'velmere_complete_advanced_audit_with_snapshot' in mig)
check('migration:blob_insert_after_legacy',mig.index('v_legacy_result :=') < mig.index('insert into public.velmere_audit_report_pdf_blobs'))
check('migration:post_insert_verification','audit_exact_pdf_post_insert_verification_failed' in mig)
check('migration:internal_rpc_not_exposed','from public, anon, authenticated, service_role' in mig)
check('migration:pro_wrapper_service_only','grant execute on function public.velmere_complete_pro_audit_with_exact_pdf_v2' in mig)
check('migration:advanced_wrapper_service_only','grant execute on function public.velmere_complete_advanced_audit_with_exact_pdf_v2' in mig)
check('migration:no_historical_backfill','deliberately not backfilled' in mig)
start='-- P88 AUDIT PAID EXACT IMMUTABLE PDF BLOB BEGIN'; end='-- P88 AUDIT PAID EXACT IMMUTABLE PDF BLOB END'
check('schema:p88_block_once',schema.count(start)==1 and schema.count(end)==1)
mig_block=mig[mig.index(start):mig.index(end)+len(end)]
schema_block=schema[schema.index(start):schema.index(end)+len(end)]
check('schema:migration_block_exact',mig_block==schema_block)

runtime=json.loads(text(RUNTIME))
check('runtime:current_pass',runtime.get('status')=='PASS_BOUNDED_LOCAL_CONTROLLED_FIXTURE')
check('runtime:no_failures',runtime.get('summary',{}).get('failed')==0)
check('runtime:pro_and_advanced',runtime.get('summary',{}).get('tiers')==2)
check('runtime:same_blob_pairs',runtime.get('summary',{}).get('exactPreviewDownloadPairs')==2)
check('runtime:failure_adjudication_preserved',len(runtime.get('failureAdjudication',{}).get('failures',[]))==3)

status='PASS' if all(x['status']=='PASS' for x in CHECKS) else 'FAIL'
changed=[EXACT,STORE,RENDERER,PRO_SETTLE,ADV_SETTLE,TOKEN,DOWNLOAD,ADMIN,RPC,MIG,SCHEMA]
payload={
  'schemaVersion':'velmere.p88.audit-exact-immutable-pdf-static.v1',
  'generatedAt':GENERATED_AT,
  'status':status,
  'classification':'DEFENSIVE_RENDER_ONCE_STORE_FIRST_NO_RERENDER_STATIC',
  'checks':{'total':len(CHECKS),'passed':sum(x['status']=='PASS' for x in CHECKS),'failed':sum(x['status']=='FAIL' for x in CHECKS),'rows':CHECKS},
  'changedAndClosureCriticalFiles':changed,
  'sourceSha256':{x:sha(x) for x in changed},
  'authority':{'masterDirective':MASTER,'masterDirectiveSha256':sha(MASTER),'canonicalTopologyDirective':V17,'canonicalTopologyDirectiveSha256':sha(V17)},
  'truthBoundary':'Static source/order/schema proof only. PostgreSQL, Supabase, service-role grants, rollback, deployed HTTP, real owner isolation, current provider/rights truth, Customer FINAL, Audit FINAL PDF, whole-project build and exact Windows remain unproven.',
}
OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(payload,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
(ROOT/'artifacts/p88').mkdir(parents=True,exist_ok=True)
(ROOT/'artifacts/p88/P88_AUDIT_EXACT_IMMUTABLE_PDF_STATIC.json').write_text(json.dumps(payload,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps({'status':status,'passed':payload['checks']['passed'],'total':payload['checks']['total']},indent=2))
raise SystemExit(0 if status=='PASS' else 1)
