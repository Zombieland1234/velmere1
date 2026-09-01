#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
PARENT=Path('/mnt/data/velmere_p88_work/base')
OUT=ROOT/'receipts/p88/P88_P87_COMPATIBILITY_AND_SUPERSESSION.json'
CHECKS=[]
def check(i,ok,detail=None):
 row={'id':i,'status':'PASS' if ok else 'FAIL'}
 if detail is not None: row['detail']=detail
 CHECKS.append(row)
 if not ok: raise AssertionError(f'{i}: {detail}')
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
CHANGED={
 'lib/security/audit-report-exact-pdf-artifact.ts',
 'lib/security/audit-report-snapshot-store.ts',
 'lib/security/pro-audit-pdf/render-pro-audit-pdf.ts',
 'lib/server/lazy-route-modules/security--audit-review--pro--settle.ts',
 'lib/server/lazy-route-modules/security--audit-review--advanced--settle.ts',
 'lib/server/lazy-route-modules/security--audit-watch--pro-pdf--token.ts',
 'lib/server/lazy-route-modules/security--audit-watch--pro-pdf.ts',
 'lib/server/lazy-route-modules/admin--security--advanced-audit-release.ts',
 'lib/db/supabase-rpc-operation-registry.ts',
}
projection=json.loads((PARENT/'artifacts/closure/p87r1/P87R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json').read_text())
unchanged=0; mism=[]
for row in projection['files']:
 rel=row['path']
 if rel in CHANGED: continue
 p=PARENT/rel; q=ROOT/rel
 unchanged+=1
 if not p.is_file() or not q.is_file() or p.read_bytes()!=q.read_bytes():
  mism.append({'path':rel,'parent':sha(p) if p.is_file() else None,'current':sha(q) if q.is_file() else None})
check('p88_parent_product_projection_unchanged_except_declared',not mism,{'verifiedUnchangedFiles':unchanged,'mismatches':mism[:10]})
for rel in [
 'lib/market-integrity/customer-report-exact-pdf-token.ts',
 'lib/market-integrity/real-markets-paid-account-artifact.ts',
 'lib/server/market-integrity-route-modules/report-pdf.ts',
 'lib/server/market-integrity-route-modules/report.ts',
]:
 check('p88_p87_real_markets_frozen_'+rel.replace('/','_').replace('.','_'),(PARENT/rel).read_bytes()==(ROOT/rel).read_bytes(),sha(ROOT/rel))
check('p88_v17_frozen',(PARENT/'VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt').read_bytes()==(ROOT/'VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt').read_bytes())
base_schema=(PARENT/'lib/db/schema.sql').read_bytes(); current_schema=(ROOT/'lib/db/schema.sql').read_bytes()
check('p88_schema_parent_prefix_exact',current_schema.startswith(base_schema),{'parentBytes':len(base_schema),'currentBytes':len(current_schema)})
check('p88_schema_delta_only_p88_block',current_schema[len(base_schema):].startswith(b'\n-- P88 AUDIT PAID EXACT IMMUTABLE PDF BLOB BEGIN'))
check('p88_ordered_migration_only_new',not (PARENT/'supabase/migrations/20260820000005_p88_audit_paid_exact_immutable_pdf_blob.sql').exists() and (ROOT/'supabase/migrations/20260820000005_p88_audit_paid_exact_immutable_pdf_blob.sql').is_file())

# P75 frozen harness is intentionally superseded only at its v1 completion-operation assertions.
run=subprocess.run(['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','scripts/p75/test-p75-advanced-automation-runtime.mjs'],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
try: result=json.loads(run.stdout.decode(errors='replace'))
except Exception: result={}
failed=[x.get('name') for x in result.get('checks',[]) if x.get('status')=='FAIL']
check('p88_p75_historical_harness_executed_nonzero',run.returncode!=0,run.returncode)
check('p88_p75_failure_exactly_two_v1_completion_assertions',failed==['Advanced atomic TS boundary','Advanced atomic tier binding'],failed)
store=(ROOT/'lib/security/audit-report-snapshot-store.ts').read_text()
rpc=(ROOT/'lib/db/supabase-rpc-operation-registry.ts').read_text()
adv=(ROOT/'lib/server/lazy-route-modules/security--audit-review--advanced--settle.ts').read_text()
mig=(ROOT/'supabase/migrations/20260820000005_p88_audit_paid_exact_immutable_pdf_blob.sql').read_text()
check('p88_p75_replacement_export_preserved','export async function completeAdvancedAuditWorkerLeaseWithSnapshot' in store)
check('p88_p75_replacement_generic_tier_binding','return completePaidWorkerLeaseWithExactPdf("advanced", args);' in store)
check('p88_p75_replacement_v2_operation','audit_advanced_worker_complete_with_exact_pdf_v2' in store and 'velmere_complete_advanced_audit_with_exact_pdf_v2' in rpc)
check('p88_p75_replacement_settle_advanced_tier','tier: "advanced"' in adv and 'pdfBytes,' in adv)
check('p88_p75_replacement_sql_wrapper',"select public.velmere_complete_paid_audit_with_exact_pdf_v2(\n    'advanced'" in mig)
check('p88_p75_replacement_automated_not_human','advanced_automation' in (ROOT/'lib/server/lazy-route-modules/security--audit-watch--pro-pdf.ts').read_text())

# Old P87/P86 compatibility freezes schema byte identity and is no longer a valid current lane after an ordered P88 migration.
p87compat=(ROOT/'scripts/p87/verify-p87-p86-compatibility.py').read_text()
check('p88_p87_old_compat_freezes_schema','lib/db/schema.sql' in p87compat)
check('p88_p87_old_compat_not_counted_after_schema_migration',current_schema!=base_schema)

status='PASS' if all(x['status']=='PASS' for x in CHECKS) else 'FAIL'
payload={
 'schemaVersion':'velmere.p88.p87-compatibility-and-supersession.v1',
 'generatedAt':'2026-08-20T14:10:00.000Z',
 'status':status,
 'parentCheckpoint':'P87R1',
 'verifiedUnchangedParentProductFiles':unchanged,
 'declaredChangedBuildRelevantFiles':sorted(CHANGED),
 'supersededHistoricalHarnesses':[
  {'harness':'scripts/p75/test-p75-advanced-automation-runtime.mjs','result':'EXPECTED_NONZERO_TWO_V1_ASSERTIONS_NOT_COUNTED','reason':'P88 replaces snapshot-only completion operation matching with the stronger exact-PDF v2 atomic completion boundary.','replacementProof':'P88 runtime/static and this compatibility receipt'},
  {'harness':'scripts/p87/verify-p87-p86-compatibility.py','result':'NOT_CURRENT_AFTER_ORDERED_SCHEMA_CHANGE','reason':'The frozen P87 lane requires lib/db/schema.sql to remain byte-identical to P86; P88 intentionally appends one ordered exact-PDF migration block.','replacementProof':'P88 schema-prefix/delta proof, P87 Real Markets current runtime/static and this compatibility receipt'},
 ],
 'checks':{'total':len(CHECKS),'passed':sum(x['status']=='PASS' for x in CHECKS),'failed':sum(x['status']=='FAIL' for x in CHECKS),'rows':CHECKS},
 'truthBoundary':'Compatibility/source-supersession proof. It does not establish PostgreSQL execution, rollback, deployed HTTP, current rights/providers, Customer FINAL, sale eligibility, build or exact Windows.',
}
OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(payload,indent=2)+'\n')
(ROOT/'artifacts/p88/P88_P87_COMPATIBILITY_AND_SUPERSESSION.json').write_bytes(OUT.read_bytes())
print(json.dumps({'status':status,'passed':payload['checks']['passed'],'total':payload['checks']['total'],'verifiedUnchangedParentProductFiles':unchanged},indent=2))
raise SystemExit(0 if status=='PASS' else 1)
