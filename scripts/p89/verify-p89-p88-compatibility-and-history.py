#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
PARENT=Path('/mnt/data/velmere_p89_parent_p88')
PARENT_ZIP=Path('/mnt/data/VELMERE_R44P46_V17_P88R1_AUDIT_PAID_EXACT_IMMUTABLE_PDF_RENDER_ONCE_STORE_FIRST_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-20.zip')
OUT=ROOT/'receipts/p89/P89_P88_COMPATIBILITY_AND_HISTORY.json'
ART=ROOT/'artifacts/p89/P89_P88_COMPATIBILITY_AND_HISTORY.json'
MASTER='VELMERE_ULTIMATE_WORLD_CLASS_CONTINUOUS_CLOSURE_FINAL_CANDIDATE_MASTER_DIRECTIVE_V2_COMPLETE_2026-08-20.txt'
MASTER_SHA='9184cd18eb864f50a8c5d3af8f2899e7f138372861095e343901ab9c5e3bcb53'
V17='VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt'
V17_SHA='de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05'
P88_ZIP_SHA='47a7a76d02e6f52959452cab765cbbedd0390070cd2f721917f2d973be84cc87'
checks=[]

def sha(path:Path)->str:
 h=hashlib.sha256()
 with path.open('rb') as f:
  for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
 return h.hexdigest()

def check(cid,cond,detail=None):
 row={'id':cid,'status':'PASS' if cond else 'FAIL'}
 if detail is not None:row['detail']=detail
 checks.append(row)
 if not cond:raise AssertionError(f'{cid}: {detail}')

def exact(rel:str):
 a=PARENT/rel;b=ROOT/rel
 return a.is_file() and b.is_file() and a.stat().st_size==b.stat().st_size and sha(a)==sha(b)

def exact_tree(prefix:str):
 expected={p.relative_to(PARENT).as_posix():p for p in (PARENT/prefix).rglob('*') if p.is_file()}
 actual={p.relative_to(ROOT).as_posix():p for p in (ROOT/prefix).rglob('*') if p.is_file()}
 mism=[]
 for rel,p in expected.items():
  q=actual.get(rel)
  if not q or p.stat().st_size!=q.stat().st_size or sha(p)!=sha(q):mism.append(rel)
 extra=sorted(set(actual)-set(expected))
 return len(expected),mism,extra

check('parent_tree_present',PARENT.is_dir())
check('parent_zip_present',PARENT_ZIP.is_file())
check('parent_zip_sha_exact',sha(PARENT_ZIP)==P88_ZIP_SHA,sha(PARENT_ZIP))
check('master_current_exact',sha(ROOT/MASTER)==MASTER_SHA)
check('master_parent_exact',exact(MASTER))
text=(ROOT/MASTER).read_text('utf-8')
sections=[int(x) for x in re.findall(r'^# (\d+)\.',text,re.M)]
check('master_sections_0_88',sections==list(range(89)),sections[-5:])
check('master_end_sentinel','END-OF-DIRECTIVE' in text and 'EXPECTED NUMBERED SECTIONS: 89 (0–88)' in text)
check('v17_current_exact',sha(ROOT/V17)==V17_SHA)
check('v17_parent_exact',exact(V17))
check('active_pass_p89',(ROOT/'VELMERE_ACTIVE_PASS.txt').read_text().strip()=='P89R1')
check('recipe_p89_present',(ROOT/'P89R1_PACKAGE_BUILD_RECIPE.json').is_file())

for prefix,cid in [('receipts/p88','p88_receipts'),('artifacts/p88','p88_artifacts'),('scripts/p88','p88_scripts'),('artifacts/closure/p88r1','p88_closure')]:
 count,mism,extra=exact_tree(prefix)
 check(f'{cid}_byte_identical',not mism and not extra,{'verified':count,'mismatches':mism[:5],'extra':extra[:5]})

for rel,cid in [
 ('lib/security/audit-report-exact-pdf-artifact.ts','p88_exact_pdf_boundary'),
 ('lib/security/audit-report-snapshot-store.ts','p88_snapshot_store'),
 ('supabase/migrations/20260820000005_p88_audit_paid_exact_immutable_pdf_blob.sql','p88_migration'),
 ('lib/db/schema.sql','p88_schema'),
 ('lib/server/lazy-route-modules/security--audit-review--pro--settle.ts','p88_pro_settle'),
 ('lib/server/lazy-route-modules/security--audit-review--advanced--settle.ts','p88_advanced_settle'),
 ('lib/server/lazy-route-modules/security--audit-watch--pro-pdf.ts','p88_pdf_download'),
]:check(f'{cid}_unchanged',exact(rel),rel)

renderer=(ROOT/'lib/security/pro-audit-pdf/render-pro-audit-pdf.ts').read_text('utf-8')
check('p88_model_identifier_preserved','audit-report-assembler-pass2578-render-bound-pass4808' in renderer)
check('p87_model_identifier_preserved','audit-report-assembler-pass2578-content-bound-pass4807' in renderer)
check('p89_model_identifier_distinct','audit-report-assembler-pass2578-evidence-dimensions-pass4809' in renderer)
check('legacy_combined_rule_preserved','Math.max(tierMinimum.verifiedProviderReceipts, tierMinimum.liveLanes)' in renderer)
check('current_rule_is_separate','currentDimensionModel && successfulLiveProviderLanes < tierMinimum.liveLanes' in renderer)

pdf=json.loads((ROOT/'receipts/p89/P89_AUDIT_PDF_EVIDENCE_DIMENSIONS_RUNTIME.json').read_text())
rows={x['id']:x for x in pdf['checks']['rows']}
for cid in [
 'p88_legacy_pro_does_not_inherit_separate_live_semantics',
 'p88_legacy_pro_old_stricter_five_receipt_rule_still_verifies',
 'p88_legacy_advanced_old_stricter_six_receipt_rule_retained',
 'p88_legacy_advanced_six_receipts_pass',
 'old_model_cannot_silently_inherit_new_fields',
]:check(f'pdf_runtime_{cid}',rows.get(cid,{}).get('status')=='PASS')

runtime=json.loads((ROOT/'receipts/p89/P89_AUDIT_PROVIDER_EVIDENCE_DIMENSIONS_RUNTIME.json').read_text())
controlled=runtime['controlledResults']
check('controlled_pro_structural_shape',controlled['pro']=={'strictReceipts':4,'successfulLiveProviders':5,'met':True},controlled['pro'])
check('controlled_advanced_current_shape_withheld',controlled['advancedCurrentArchitectureShape']['met'] is False,controlled['advancedCurrentArchitectureShape'])
check('controlled_advanced_blockers_exact',controlled['advancedCurrentArchitectureShape']['blockers']==['verified_evidence_receipts:4/5','successful_live_provider_lanes:5/6'])
check('no_real_provider_credit',runtime['zeroFakeCredit']['realProviderExecution'] is False)
check('no_rights_credit',runtime['zeroFakeCredit']['providerRights']=='WITHHELD')

for rel in [
 'artifacts/p89/logs/regression/00A_P89_BASIC_SCHEMA_FIRST_FAIL.log',
 'artifacts/p89/logs/regression/05_P88_RUNTIME_SUPERSEDED.log',
 'artifacts/p89/logs/regression/07_P88_PROVIDER_CAPACITY_SUPERSEDED.log',
]:check(f'failure_log_preserved_{Path(rel).name}',(ROOT/rel).is_file() and (ROOT/rel).stat().st_size>0,rel)

failed=[x for x in checks if x['status']=='FAIL']
payload={
 'schemaVersion':'velmere.p89.p88-compatibility-and-history.v1',
 'generatedAt':'2026-08-20T20:05:00.000Z',
 'status':'PASS' if not failed else 'FAIL',
 'checks':{'total':len(checks),'passed':len(checks)-len(failed),'failed':len(failed),'rows':checks},
 'parent':{'checkpoint':'P88R1','sourceOnly':PARENT_ZIP.name,'sourceOnlySha256':P88_ZIP_SHA},
 'historyBoundary':'P88 receipts, artifacts, closure receipts, exact-PDF storage boundary, migration and delivery routes remain byte-identical. Only explicitly versioned P89 evidence-dimension modules and the PDF evidence schema changed.',
 'supersessionBoundary':'P88 model receipts keep their old stricter combined strict/live interpretation. They cannot inherit P89 separate execution-coverage guarantees. Nonzero P88 harnesses are retained with zero credit and replaced by P89 requirements-based checks.',
 'zeroFakeCredit':{'customerFinal':'0/20','auditFinalPdf':'0/3','rights':'2/203 inherited only','realProvidersExecuted':False,'exactWindows':'WITHHELD'},
}
OUT.parent.mkdir(parents=True,exist_ok=True);ART.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(json.dumps(payload,indent=2)+'\n',encoding='utf-8');ART.write_bytes(OUT.read_bytes())
print(json.dumps({'status':payload['status'],'passed':payload['checks']['passed'],'total':payload['checks']['total'],'receiptSha256':sha(OUT)},indent=2))
raise SystemExit(0 if not failed else 1)
