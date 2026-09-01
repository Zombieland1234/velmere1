#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, platform, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
MIGRATION=ROOT/'supabase/migrations/20260820000003_p85_audit_customer_artifact_publication_visibility_rls.sql'
P84_MIGRATION=ROOT/'supabase/migrations/20260820000002_p84_audit_customer_artifact_owner_read_path.sql'
SCHEMA=ROOT/'lib/db/schema.sql'; READ_MODULE=ROOT/'lib/reporting/account-customer-artifact-owner-visible-read.ts'
STORE=ROOT/'lib/reporting/account-customer-artifact-store.ts'; ROUTE=ROOT/'lib/server/lazy-route-modules/account--customer-artifact.ts'
P84_MESSAGES=ROOT/'lib/account/audit-account-messages.ts'; P84_PUBLISHER=ROOT/'lib/reporting/audit-exact-artifact-owner-readable-publisher.ts'
RUNTIME=ROOT/'scripts/p85/test-p85-owner-visible-artifact-runtime.mjs'; RECEIPT=ROOT/'receipts/p85/P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_STATIC.json'
checks=[]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def check(i,c,d=None): checks.append({'id':i,'status':'PASS' if c else 'FAIL',**({} if d is None else {'detail':d})})
paths=[MIGRATION,P84_MIGRATION,SCHEMA,READ_MODULE,STORE,ROUTE,P84_MESSAGES,P84_PUBLISHER,RUNTIME]
for p in paths: check(f'p85_file_exists:{p.relative_to(ROOT)}',p.is_file(),p.stat().st_size if p.exists() else None)
migration=MIGRATION.read_text(); schema=SCHEMA.read_text(); read_module=READ_MODULE.read_text(); store=STORE.read_text(); route=ROUTE.read_text(); messages=P84_MESSAGES.read_text(); publisher=P84_PUBLISHER.read_text(); runtime=RUNTIME.read_text()
check('p85_ordered_migration_after_p84',MIGRATION.name>P84_MIGRATION.name,[P84_MIGRATION.name,MIGRATION.name])
check('p85_migration_transaction_wrapped',migration.lstrip().startswith('begin;') and migration.rstrip().endswith('commit;'))
check('p85_migration_has_closed_markers','P85 AUDIT CUSTOMER ARTIFACT DATABASE-ENFORCED PUBLICATION VISIBILITY BEGIN' in migration and 'P85 AUDIT CUSTOMER ARTIFACT DATABASE-ENFORCED PUBLICATION VISIBILITY END' in migration)
block=migration[migration.index('-- P85 AUDIT'):migration.rindex('-- P85 AUDIT CUSTOMER ARTIFACT DATABASE-ENFORCED PUBLICATION VISIBILITY END')+len('-- P85 AUDIT CUSTOMER ARTIFACT DATABASE-ENFORCED PUBLICATION VISIBILITY END')]
check('p85_schema_has_same_closed_block',block in schema)
for table in ['velmere_customer_artifact_snapshots','velmere_customer_artifact_pdf_blobs','velmere_audit_customer_artifact_links']:
 check(f'p85_rls_enabled:{table}',f'alter table public.{table} enable row level security;' in migration)
check('p85_snapshot_select_regrant_is_authenticated_only','grant select on table public.velmere_customer_artifact_snapshots to authenticated;' in migration and 'grant select on table public.velmere_customer_artifact_snapshots to anon' not in migration)
check('p85_pdf_select_regrant_is_authenticated_only','grant select on table public.velmere_customer_artifact_pdf_blobs to authenticated;' in migration and 'grant select on table public.velmere_customer_artifact_pdf_blobs to anon' not in migration)
check('p85_snapshot_old_owner_policy_removed','drop policy if exists p84_customer_artifact_snapshot_owner_select' in migration)
check('p85_pdf_old_owner_policy_removed','drop policy if exists p84_customer_artifact_pdf_owner_select' in migration)
check('p85_snapshot_policy_owner_and_salted_hash','account_id = public.velmere_current_account_id()' in migration and 'account_id_hash = public.velmere_current_account_binding_hash()' in migration)
check('p85_snapshot_audit_requires_exact_payload_and_pdf',"payload_kind = 'audit_customer_report_v1'" in migration and "pdf_storage = 'exact_immutable_blob'" in migration)
check('p85_snapshot_audit_requires_link_exists',re.search(r'create policy p85_customer_artifact_snapshot_owner_published_select[\s\S]*?exists \([\s\S]*?velmere_audit_customer_artifact_links',migration) is not None)
for token in [
 'l.snapshot_id = velmere_customer_artifact_snapshots.snapshot_id','l.account_id = velmere_customer_artifact_snapshots.account_id',
 'l.account_id_hash = velmere_customer_artifact_snapshots.account_id_hash','l.artifact_snapshot_digest = velmere_customer_artifact_snapshots.snapshot_digest',
 'l.artifact_digest = velmere_customer_artifact_snapshots.artifact_digest',"l.pdf_digest = velmere_customer_artifact_snapshots.snapshot->'canonicalArtifact'->>'pdfDigest'"
]: check(f'p85_snapshot_link_cross_binding:{token.split("=")[0].strip()}',token in migration)
check('p85_non_audit_owner_read_retained',"surface <> 'audit'" in migration)
check('p85_pdf_audit_requires_link_exists',re.search(r'create policy p85_customer_artifact_pdf_owner_published_select[\s\S]*?surface <> \'audit\'[\s\S]*?exists',migration) is not None)
for token in ['l.pdf_blob_id = velmere_customer_artifact_pdf_blobs.blob_id','l.snapshot_id = velmere_customer_artifact_pdf_blobs.snapshot_id','l.account_id = velmere_customer_artifact_pdf_blobs.account_id','l.account_id_hash = velmere_customer_artifact_pdf_blobs.account_id_hash','l.artifact_digest = velmere_customer_artifact_pdf_blobs.artifact_digest','l.pdf_digest = velmere_customer_artifact_pdf_blobs.pdf_digest']:
 check(f'p85_pdf_link_cross_binding:{token.split("=")[0].strip()}',token in migration)
list_sig='create or replace function public.velmere_list_owner_visible_customer_artifacts_v1(\n  p_limit integer default 24\n)'
get_sig='create or replace function public.velmere_get_owner_visible_customer_artifact_v1(\n  p_snapshot_id text\n)'
check('p85_list_rpc_signature_has_no_account_parameter',list_sig in migration and 'p_account_id' not in migration[migration.index(list_sig):migration.index('create or replace function public.velmere_get_owner_visible_customer_artifact_v1')])
check('p85_get_rpc_signature_has_no_account_parameter',get_sig in migration and 'p_account_id' not in migration[migration.index(get_sig):migration.index('revoke all on function')])
check('p85_both_rpcs_security_invoker',migration.count('security invoker')>=2 and 'security definer' not in migration.lower())
check('p85_both_rpcs_stable',migration.count('\nstable\nsecurity invoker')>=2)
check('p85_both_rpcs_fixed_search_path',migration.count('set search_path = pg_catalog, public, pg_temp')>=2)
check('p85_rpcs_derive_owner_from_auth_binding',migration.count('v_account_id := public.velmere_current_account_id();')>=2 and migration.count('v_account_hash := public.velmere_current_account_binding_hash();')>=2)
check('p85_list_limit_validated_1_50','p_limit is null or p_limit < 1 or p_limit > 50' in migration)
check('p85_get_snapshot_id_validated',"p_snapshot_id !~ '^[A-Za-z0-9._:-]+$'" in migration and 'length(p_snapshot_id) < 8' in migration and 'length(p_snapshot_id) > 160' in migration)
check('p85_rpc_projection_version_closed',migration.count("'p85-owner-visible-customer-artifact-read-v1'::text")==2)
check('p85_rpc_never_reads_full_message_ledger','velmere_audit_account_messages' not in migration)
check('p85_rpc_joins_only_minimal_link_ledger',migration.count('left join public.velmere_audit_customer_artifact_links l')==2)
for token in ['l.snapshot_id = s.snapshot_id','l.account_id = s.account_id','l.account_id_hash = s.account_id_hash','l.artifact_snapshot_digest = s.snapshot_digest','l.artifact_digest = s.artifact_digest',"l.pdf_digest = s.snapshot->'canonicalArtifact'->>'pdfDigest'"]:
 check(f'p85_rpc_link_cross_binding:{token}',migration.count(token)==2)
check('p85_list_filters_visibility_before_limit',migration.index("and (s.surface <> 'audit' or l.snapshot_id is not null)")<migration.index('order by s.generated_at desc, s.snapshot_id desc')<migration.index('limit p_limit;'))
check('p85_list_deterministic_order','order by s.generated_at desc, s.snapshot_id desc' in migration)
check('p85_get_owner_and_snapshot_bound','where s.snapshot_id = p_snapshot_id' in migration and 'and s.account_id = v_account_id' in migration and 'and s.account_id_hash = v_account_hash' in migration)
check('p85_rpc_execute_revoked_broadly','from public, anon, authenticated, service_role' in migration)
check('p85_rpc_execute_granted_authenticated_only','grant execute on function public.velmere_list_owner_visible_customer_artifacts_v1(integer)\n  to authenticated;' in migration and 'grant execute on function public.velmere_get_owner_visible_customer_artifact_v1(text)\n  to authenticated;' in migration)
check('p85_store_row_parser_exported','export function parsePass4822AccountCustomerArtifactSnapshotRow' in store)
check('p85_read_module_version_and_rpc_names',all(t in read_module for t in ['p85-owner-visible-customer-artifact-read-v1','velmere_list_owner_visible_customer_artifacts_v1','velmere_get_owner_visible_customer_artifact_v1']))
check('p85_read_module_exact_row_shape','const P85_ROW_KEYS' in read_module and 'owner_visible_customer_artifact_row_shape_invalid' in read_module)
check('p85_read_module_rejects_preview_owner',read_module.count('accountId.startsWith("preview:")')==2)
check('p85_read_module_requires_client','VELMERE_P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_BOUNDARY_REQUIRED' in read_module and 'requireClient(args.client)' in read_module)
check('p85_read_module_uses_rpc_only','.rpc(' in read_module and '.from(' not in read_module)
check('p85_list_rpc_sends_only_limit','client.rpc(P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_LIST_RPC, {\n    p_limit: limit,\n  })' in read_module)
check('p85_get_rpc_sends_only_snapshot','client.rpc(P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_GET_RPC, {\n    p_snapshot_id: snapshotId,\n  })' in read_module)
check('p85_read_module_audit_requires_exact_link','owner_visible_audit_artifact_publication_missing' in read_module and 'publicationState: "p84_exact_link"' in read_module)
for token in ['link.accountIdHash !== snapshot.accountIdHash','link.artifactSnapshotDigest !== snapshot.snapshotDigest','link.artifactDigest !== snapshot.canonicalArtifact.artifactDigest','link.pdfDigest !== snapshot.canonicalArtifact.pdfDigest']:
 check(f'p85_ts_link_cross_binding:{token}',token in read_module)
check('p85_read_module_duplicate_and_order_fail_closed','owner_visible_customer_artifact_duplicate_snapshot' in read_module and 'owner_visible_customer_artifact_order_invalid' in read_module)
check('p85_read_module_limits_response','data.length > limit' in read_module and 'data.length > 1' in read_module)
check('p85_read_module_empty_get_is_non_disclosing_null','if (data.length === 0) return null;' in read_module)
check('p85_route_imports_owner_visible_read','listP85OwnerVisibleCustomerArtifacts' in route and 'getP85OwnerVisibleCustomerArtifact' in route)
check('p85_route_real_list_uses_one_rpc_abstraction',re.search(r'if \(ownerClient\)[\s\S]*?listP85OwnerVisibleCustomerArtifacts\(\{[\s\S]*?limit,[\s\S]*?client: ownerClient',route) is not None)
check('p85_route_real_get_uses_one_rpc_abstraction',re.search(r'if \(ownerClient\)[\s\S]*?getP85OwnerVisibleCustomerArtifact\(\{[\s\S]*?snapshotId,[\s\S]*?client: ownerClient',route) is not None)
check('p85_route_visibility_failure_is_503_fail_closed',route.count('error: "artifact_visibility_boundary_unavailable"')>=2 and 'status: 503' in route)
check('p85_route_legacy_n_plus_one_is_preview_only','if (snapshot.surface === "audit" && !ownerClient)' in route and 'client: null' in route)
check('p85_route_real_list_does_not_overfetch_50','listP85OwnerVisibleCustomerArtifacts({\n          accountId: account.accountId,\n          limit,' in route)
check('p85_route_never_uses_service_role_for_owner_read','getSupabaseServiceRoleClient' not in route)
check('p85_preserves_p84_link_schema','"p84-audit-customer-artifact-link-v1"' in messages)
check('p85_preserves_p84_atomic_publisher','"p84-audit-exact-artifact-owner-readable-publication-v2"' in publisher and '"velmere_publish_audit_exact_artifact_v2"' in publisher)
check('p85_runtime_has_orphan_cross_account_and_tamper_cases',all(t in runtime for t in ['p85_orphan_audit_row_rejected','p85_wrong_row_owner_rejected','p85_link_snapshot_digest_rejected','p85_link_artifact_digest_rejected','p85_link_pdf_digest_rejected','p85_out_of_order_rows_rejected','p85_duplicate_snapshot_rejected']))
check('p85_runtime_does_not_claim_postgres_or_final','authorizedPostgresExecution: "WITHHELD_NO_SERVER_BINARY_OR_NETWORK_RETRIEVAL"' in runtime and 'customerFinal: "0/20"' in runtime and 'auditFinalPdf: "0/3"' in runtime)
payload={'schemaVersion':'velmere.p85.owner-visible-customer-artifact-static.v1','status':'PASS' if all(r['status']=='PASS' for r in checks) else 'FAIL','runtime':{'python':platform.python_version(),'platform':platform.platform()},'files':{str(p.relative_to(ROOT)):{'bytes':p.stat().st_size,'sha256':sha(p)} for p in paths},'discoveredDefects':[
 {'id':'P85-DEFECT-01-DIRECT-OWNER-REST-COULD-BYPASS-AUDIT-PUBLICATION-LINK','severity':'HIGH_CUSTOMER_PRIVACY_AND_EVIDENCE_INTEGRITY_BLOCKER','status':'REPAIRED_IN_SOURCE_STATIC_PROVEN_RUNTIME_POSTGRES_WITHHELD','description':'P84 owner RLS allowed a signed owner to query their own Audit snapshot/PDF directly before the immutable publication link existed. P85 makes exact link existence and digest binding part of snapshot/PDF RLS itself.'},
 {'id':'P85-DEFECT-02-LIMIT-BEFORE-ORPHAN-FILTER-AND-N-PLUS-ONE-READS','severity':'MEDIUM_AVAILABILITY_AND_SCALING_BLOCKER','status':'REPAIRED_IN_SOURCE_STATIC_AND_LOCAL_RPC_RUNTIME_PROVEN','description':'The route fetched at most 50 snapshots before filtering hidden Audit rows and issued one link query per Audit artifact. P85 filters publication visibility before LIMIT in PostgreSQL and uses one closed owner-scoped RPC.'},
 {'id':'P85-DEFECT-03-PREVIEW-ACCOUNT-IDENTITY-ACCEPTED-BY-DURABLE-READ-HELPER','severity':'MEDIUM_BOUNDARY_CONFUSION_BLOCKER','status':'REPAIRED_AND_RUNTIME_PROVEN','description':'The first P85 implementation accepted preview:* account strings even though the durable RPC is only valid for authenticated real owners. The helper now rejects preview owners before RPC.'}],
 'checks':{'total':len(checks),'passed':sum(r['status']=='PASS' for r in checks),'failed':sum(r['status']=='FAIL' for r in checks),'rows':checks},
 'truthBoundary':'Static proof establishes the ordered P85 migration, database-level Audit publication policies, SECURITY INVOKER owner RPCs, closed TypeScript parsing and one-RPC customer route. Local runtime validates response integrity against mocked owner-token RPC clients. No PostgreSQL/Supabase server, real JWT/RLS isolation, deployed HTTP, current-chain state or exact Windows execution is credited.'}
RECEIPT.parent.mkdir(parents=True,exist_ok=True); RECEIPT.write_text(json.dumps(payload,indent=2)+'\n'); print(json.dumps(payload,indent=2))
if payload['status']!='PASS': raise SystemExit(1)
