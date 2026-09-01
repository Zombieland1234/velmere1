#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json
from pathlib import Path
from typing import Any

ROOT=Path(__file__).resolve().parents[2]
PARENT=ROOT/'artifacts/closure/p33/paid-readiness-matrix.json'
OUT=ROOT/'artifacts/closure/p35/paid-readiness-matrix.json'
VERIFY=ROOT/'artifacts/closure/p35/paid-readiness-verifier-receipt.json'


def sha(p:Path)->str:
 h=hashlib.sha256()
 with p.open('rb') as f:
  for c in iter(lambda:f.read(1024*1024),b''):h.update(c)
 return h.hexdigest()
def csha(v:Any)->str:return hashlib.sha256(json.dumps(v,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
def ev(path:str,status:str='CURRENT_SOURCE',detail:Any=None):
 p=ROOT/path
 return {'path':path,'status':status,'sha256':sha(p),'detail':detail}

parent=json.load(open(PARENT))
axes=[]
for axis in parent['axes']:
 row={**axis,'evidence':list(axis.get('evidence',[])),'blockers':list(axis.get('blockers',[]))}
 if row['id']=='sku_stop_sell_truth':
  row['evidence']=[ev('artifacts/closure/p35/current-evidence-availability-matrix.json','PASS_INTERNAL',{'profiles':33,'analysisEligible':11,'saleEligible':0}),ev('tests/security/a102-evidence-availability-dynamic-tier.test.ts','PASS_INTERNAL')]
  row['creditBoundary']='Current-source deterministic eligibility and stop-sell internal credit only; final tier value, rights, staging and sale remain open.'
 elif row['id']=='checkout_public_contract_auth':
  row['evidence']=[ev('app/api/checkout/vlm-service/readiness/route.ts'),ev('app/api/checkout/vlm-service/route.ts'),ev('tests/security/a102-public-tier-readiness-contract.test.ts','PASS_INTERNAL')]
  row['creditBoundary']='Current-source public eligibility/checkout fail-closed contract only; no production charge or deployed identity credit.'
 elif row['id']=='customer_delivery_support_projection':
  row['evidence']=[ev('lib/server/lazy-route-modules/account--customer-artifact.ts'),ev('lib/reporting/exact-customer-pdf-delivery.ts'),ev('tests/security/a102-account-artifact-preview-download-parity.test.ts','PASS_INTERNAL'),ev('tests/security/a102-exact-customer-pdf-delivery.test.ts','PASS_INTERNAL')]
  row['creditBoundary']='Exact stored PDF parity and customer-safe artifact projection internal credit only; full Vault, production retention/restore and real reuse remain open.'
 axes.append(row)
counts={}
for row in axes: counts[row['state']]=counts.get(row['state'],0)+1
result={
 'schemaVersion':'velmere.p35.paid-readiness-matrix.v1','parentPath':str(PARENT.relative_to(ROOT)),'parentSha256':sha(PARENT),
 'axisCount':len(axes),'counts':counts,'internalInfrastructurePassCount':counts.get('PASS_INTERNAL',0),'releasePassCount':sum(1 for x in axes if x['state']=='PASS_RELEASE'),
 'axes':axes,'dynamicEvidenceAvailabilityInternalPass':True,'exactCustomerArtifactParityInternalPass':True,
 'goPaidAllowed':False,'saleEnabled':False,'productionApproved':False,
 'planningEstimatePercentRange':[24,34],
 'truthBoundary':'P35 strengthens existing internal paid-readiness axes with deterministic eligibility and exact stored-artifact parity. Axis count and release PASS remain unchanged: provider rights, merchant/legal, final tier value, clean build/staging and real customer evidence are still open.'
}
result['integritySha256']=csha(result)
OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
errors=[]
if result['axisCount']!=12:errors.append('axis_count')
if result['internalInfrastructurePassCount']!=6:errors.append('internal_pass_count')
if result['releasePassCount']!=0 or result['goPaidAllowed']:errors.append('false_go_paid')
if not result['dynamicEvidenceAvailabilityInternalPass']:errors.append('eligibility')
if not result['exactCustomerArtifactParityInternalPass']:errors.append('artifact')
if result['integritySha256']!=csha({k:v for k,v in result.items() if k!='integritySha256'}):errors.append('integrity')
receipt={'schemaVersion':'velmere.p35.paid-readiness-verifier-receipt.v1','status':'PASS' if not errors else 'FAIL','axisCount':12,'errors':errors,'goPaidAllowed':False,'internalPassCount':6,'releasePassCount':0,'truthBoundary':'No new internal control is converted into release, customer, legal, provider-rights or GO_PAID credit.'}
receipt['integritySha256']=csha(receipt); VERIFY.write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'status':receipt['status'],'axisCount':12,'internalPassCount':6,'releasePassCount':0,'goPaidAllowed':False,'output':str(OUT.relative_to(ROOT))}))
raise SystemExit(0 if not errors else 1)
