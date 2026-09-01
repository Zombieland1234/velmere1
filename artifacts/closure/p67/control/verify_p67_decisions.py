from __future__ import annotations
import hashlib, json, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4]
OUT=ROOT/'artifacts/closure/p67/receipts'
A=OUT/'P67_CURRENT_DECISION_MATRIX_RUN_A.json'
B=OUT/'P67_CURRENT_DECISION_MATRIX_RUN_B.json'
sha=lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
a=json.loads(A.read_text()); b=json.loads(B.read_text())
checks=[]
def c(name,ok,detail=None): checks.append({'name':name,'passed':bool(ok),'detail':detail})
c('run_a_b_byte_identical', A.read_bytes()==B.read_bytes(), {'a':sha(A),'b':sha(B)})
c('topology_20_rows',a['topology']['customerFacingRows']==20 and len(a['customerRows'])==20,len(a['customerRows']))
c('topology_20_profiles',a['topology']['currentExecutionProfiles']==20 and len(a['internalProfiles'])==20,len(a['internalProfiles']))
c('topology_10_transitions',a['topology']['paidValueTransitions']==10 and len(a['paidValueTransitions'])==10,len(a['paidValueTransitions']))
c('no_fake_standalone_tiers',all(r['tier'] is None for r in a['customerRows'] if r['family'] in {'angel','whale-watch','market-impact','shield-map','risk-indicator'}),None)
c('all_rows_decision_digest',all(str(r.get('decisionDigest','')).startswith('sha256:') for r in a['customerRows']),None)
c('all_profiles_decision_digest',all(str(r.get('decisionDigest','')).startswith('sha256:') for r in a['internalProfiles']),None)
c('all_rows_final_credit_false',all(not r['finalCustomerOutputCredit'] for r in a['customerRows']),None)
c('all_profiles_final_credit_false',all(not r['finalCustomerOutputCredit'] for r in a['internalProfiles']),None)
c('all_rights_false',all(not r['rightsPassed'] for r in a['customerRows']) and all(not r['rightsPassed'] for r in a['internalProfiles']),None)
c('sale_zero',a['runtimeSummary']['saleEligibleCustomerFacingRowCount']==0 and all(not r['saleEligible'] for r in a['customerRows']),None)
c('value_transitions_withheld',all(not t['valuePassed'] and t['valueResult']=='WITHHELD_NO_CURRENT_MATCHED_INPUT_VALUE_EVIDENCE' for t in a['paidValueTransitions']),None)
c('release_state_false',not any(a['releaseState'].values()),a['releaseState'])
receipt={'schemaVersion':'velmere.p67.current-decision-verifier.v1','generatedAt':'2026-08-16T18:45:00.000Z','checks':checks,'summary':{'checks':len(checks),'passed':sum(x['passed'] for x in checks),'failed':sum(not x['passed'] for x in checks)},'runA':{'path':str(A.relative_to(ROOT)),'bytes':A.stat().st_size,'sha256':sha(A)},'runB':{'path':str(B.relative_to(ROOT)),'bytes':B.stat().st_size,'sha256':sha(B)},'status':'PASS' if all(x['passed'] for x in checks) else 'FAIL','truthBoundary':a['truthBoundary']}
raw=(json.dumps(receipt,sort_keys=True,separators=(',',':'))+'\n').encode()
receipt['integritySha256']=hashlib.sha256(raw).hexdigest()
(OUT/'P67_CURRENT_DECISION_VERIFIER.json').write_text(json.dumps(receipt,indent=2,sort_keys=True)+'\n')
print(json.dumps({'status':receipt['status'],**receipt['summary'],'sha256':receipt['integritySha256']},indent=2))
if receipt['status']!='PASS': sys.exit(2)
