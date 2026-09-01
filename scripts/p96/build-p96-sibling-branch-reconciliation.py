#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, zipfile
from pathlib import Path

def sha(path: Path) -> str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()

def file_map(root: Path):
    return {str(p.relative_to(root)).replace('\\','/'):(p.stat().st_size,sha(p)) for p in root.rglob('*') if p.is_file()}

def changed(base,current):
    b=file_map(base); c=file_map(current)
    return {
      'added': sorted(set(c)-set(b)),
      'removed': sorted(set(b)-set(c)),
      'modified': sorted(p for p in set(b)&set(c) if b[p][1]!=c[p][1]),
    }

def load(path: Path): return json.loads(path.read_text(encoding='utf-8'))

def zinfo(path: Path):
    with zipfile.ZipFile(path) as z:
        bad=z.testzip(); names=z.namelist()
    return {'name':path.name,'bytes':path.stat().st_size,'sha256':sha(path),'entries':len(names),'crcPass':bad is None}

ap=argparse.ArgumentParser()
ap.add_argument('--root',type=Path,required=True)
ap.add_argument('--p94-tree',type=Path,required=True)
ap.add_argument('--p95a-tree',type=Path,required=True)
ap.add_argument('--p95b-tree',type=Path,required=True)
ap.add_argument('--p94-zip',type=Path,required=True)
ap.add_argument('--p95a-zip',type=Path,required=True)
ap.add_argument('--p95b-zip',type=Path,required=True)
args=ap.parse_args()
root=args.root
za,zb,z94=map(zinfo,[args.p95a_zip,args.p95b_zip,args.p94_zip])
ca=load(args.p95a_tree/'artifacts/closure/p95r1/P95R1_CHECKPOINT_RECEIPT.json')
cb=load(args.p95b_tree/'artifacts/closure/p95r1/P95R1_CHECKPOINT_RECEIPT.json')
pa=load(args.p95a_tree/'artifacts/closure/p95r1/P95R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json')
pb=load(args.p95b_tree/'artifacts/closure/p95r1/P95R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json')
da=changed(args.p94_tree,args.p95a_tree); db=changed(args.p94_tree,args.p95b_tree)
checks=[]
def check(i,c,d=None): checks.append({'id':i,'status':'PASS' if c else 'FAIL',**({} if d is None else {'detail':d})})
check('p94_crc',z94['crcPass'],z94)
check('p95a_crc',za['crcPass'],za)
check('p95b_crc',zb['crcPass'],zb)
check('siblings_share_p94_parent',ca['parent']['sha256']==z94['sha256']==cb['parent']['sha256'],[ca['parent']['sha256'],z94['sha256'],cb['parent']['sha256']])
check('siblings_claim_same_pass_id',ca['activePass']=='P95R1' and cb['activePass']=='P95R1')
check('siblings_have_different_package_bytes',za['sha256']!=zb['sha256'] and za['bytes']!=zb['bytes'],[za,zb])
check('siblings_have_different_tree_identity',load(args.p95a_tree/'artifacts/closure/p95r1/P95R1_TREE_IDENTITY_EXCLUDING_SELF.json')['sourceContentAggregateSha256']!=load(args.p95b_tree/'artifacts/closure/p95r1/P95R1_TREE_IDENTITY_EXCLUDING_SELF.json')['sourceContentAggregateSha256'])
check('siblings_have_different_product_projection',pa['currentCandidateProjection']!=pb['currentCandidateProjection'])
check('p95a_missing_request_binding_module',not (args.p95a_tree/'lib/market-integrity/risk-history-customer-request-binding.ts').exists())
check('p95b_missing_current_alignment_module',not (args.p95b_tree/'lib/market-integrity/risk-history-current-alignment.ts').exists())
check('p95a_build_delta_exact',set(x['path'] for x in pa['changedBuildRelevantFiles'])=={
 'components/market-integrity/RiskHistoryControl.tsx','components/market-integrity/ShieldRealMarketsParityClient.tsx','lib/market-integrity/risk-history-current-alignment.ts'})
check('p95b_build_delta_exact',set(x['path'] for x in pb['changedBuildRelevantFiles'])=={
 'components/market-integrity/RiskHistoryControl.tsx','lib/market-integrity/risk-history-contract.ts','lib/market-integrity/risk-history-customer-client.ts','lib/market-integrity/risk-history-customer-request-binding.ts','lib/server/market-integrity-route-modules/history.ts'})
exact_a=['components/market-integrity/ShieldRealMarketsParityClient.tsx','lib/market-integrity/risk-history-current-alignment.ts']
exact_b=['lib/market-integrity/risk-history-contract.ts','lib/market-integrity/risk-history-customer-client.ts','lib/market-integrity/risk-history-customer-request-binding.ts','lib/server/market-integrity-route-modules/history.ts']
for p in exact_a: check('p96_preserves_p95a_'+p.replace('/','_'),sha(root/p)==sha(args.p95a_tree/p))
for p in exact_b: check('p96_preserves_p95b_'+p.replace('/','_'),sha(root/p)==sha(args.p95b_tree/p))
ui=root/'components/market-integrity/RiskHistoryControl.tsx'
uit=ui.read_text(encoding='utf-8')
check('shared_ui_is_new_merge_result',sha(ui) not in {sha(args.p95a_tree/ui.relative_to(root)),sha(args.p95b_tree/ui.relative_to(root)),sha(args.p94_tree/ui.relative_to(root))},sha(ui))
check('shared_ui_contains_alignment_contract','alignRiskHistoryCurrentObservation' in uit and 'currentObservation: RiskHistoryCurrentObservation' in uit)
check('shared_ui_contains_request_page_contract','mergeRiskHistoryCustomerPages' in uit and 'pageSource === "DATABASE"' in uit)
check('shared_ui_has_no_merge_markers',not any(x in uit for x in ['<<<<<<<','=======','>>>>>>>']))
check('active_pass_is_unique_successor',(root/'VELMERE_ACTIVE_PASS.txt').read_text().strip()=='P96R1')
check('no_current_p95_receipt_collision',not (root/'artifacts/p95').exists() and not (root/'receipts/p95').exists())
check('frozen_sibling_receipts_present',(root/'artifacts/frozen-sibling-checkpoints/p95-a/P95R1_CHECKPOINT_RECEIPT.json').is_file() and (root/'artifacts/frozen-sibling-checkpoints/p95-b/P95R1_CHECKPOINT_RECEIPT.json').is_file())
failed=[x for x in checks if x['status']!='PASS']
receipt={
 'schemaVersion':'velmere.p96.sibling-checkpoint-reconciliation.v1',
 'generatedAt':'2026-08-21T05:00:00.000Z',
 'status':'PASS_BOUNDED_FORMAL_SIBLING_MERGE' if not failed else 'FAIL',
 'governanceConflict':{
   'logicalId':'P95R1','classification':'DUPLICATE_CHECKPOINT_ID_DIFFERENT_BYTES',
   'commonAncestor':z94,'p95AAlignment':za,'p95BRequestProvenance':zb,
   'decision':'FREEZE_BOTH_AS_SIBLING_BRANCHES_AND_PROMOTE_ONLY_P96_AFTER_UNION_RERUN',
   'historyRewritten':False,
 },
 'branchStatus':{'p95A':ca['status'],'p95B':cb['status']},
 'branchProductProjection':{'p95A':pa['currentCandidateProjection'],'p95B':pb['currentCandidateProjection']},
 'branchTreeDelta':{'p95A':{k:len(v) for k,v in da.items()},'p95B':{k:len(v) for k,v in db.items()}},
 'conflictResolution':{
   'overlap':['components/market-integrity/RiskHistoryControl.tsx'],
   'strategy':'THREE_WAY_MERGE_FROM_VERIFIED_P94_COMMON_ANCESTOR',
   'preservedGuarantees':['P95-A current score versus stored history identity/time/version alignment','P95-B exact customer request/page binding and per-page storage provenance'],
   'mergedUiSha256':'sha256:'+sha(ui),
 },
 'checks':{'total':len(checks),'passed':len(checks)-len(failed),'failed':len(failed),'rows':checks},
 'zeroFakeCredit':{'eitherP95PromotedAsSoleCanonical':False,'siblingReceiptsInheritedWithoutRerun':False,'customerFinal':'0/20'},
 'truthBoundary':'This receipt proves the local package collision, common ancestor and source-level union on available exact bytes. It does not prove staging, Browser, whole-project build, exact Windows or Customer FINAL.'
}
for rel in ['receipts/p96/P96_P95_SIBLING_BRANCH_RECONCILIATION.json','artifacts/p96/P96_P95_SIBLING_BRANCH_RECONCILIATION.json']:
 p=root/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(receipt,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps({'status':receipt['status'],'checks':receipt['checks'],'conflict':receipt['governanceConflict']},indent=2,ensure_ascii=False))
raise SystemExit(1 if failed else 0)
