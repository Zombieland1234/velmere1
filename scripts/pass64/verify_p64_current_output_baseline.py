#!/usr/bin/env python3
import json,hashlib,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]

def rb(p): return (ROOT/p).read_bytes()
def j(p): return json.loads(rb(p))
def sha(b): return hashlib.sha256(b).hexdigest()
base=j('artifacts/closure/p64/P64_CURRENT_OUTPUT_BASELINE.json')
ver=j('artifacts/closure/p64/P64_CURRENT_OUTPUT_BASELINE_VERIFICATION.json')
reach=j('artifacts/closure/p64/P64_REACHABILITY_BASELINE.json')
man=j('artifacts/closure/p63/P63_PACKAGE_CONTENT_MANIFEST.json')
idx={x['path']:(x['bytes'],x['sha256']) for x in man['files']}
checks=[]
def ck(i,p,d=None): checks.append({'id':i,'passed':bool(p),'detail':d})
ck('denom:families',base['denominators']['productFamilies']==11)
ck('denom:customer-baseline',base['denominators']['customerFacingRowsBaselineCaptured']==17)
ck('denom:profiles-baseline',base['denominators']['internalProfilesBaselineCaptured']==33)
ck('denom:final-customer-zero',base['denominators']['customerFacingRowsFinalCustomerOutput']==0)
ck('denom:final-profile-zero',base['denominators']['internalProfilesFinalCustomerOutput']==0)
ck('denom:rights-zero',base['denominators']['legalSourceFieldsPassed']==0)
ck('denom:sale-zero',base['denominators']['saleEligibleRows']==0)
ck('profiles:count',len(base['profiles'])==33)
ck('rows:count',len(base['customerRows'])==17)
ck('reach:all-static-entry',reach['summary']['staticCustomerEntryPointPresent']==11)
# Source bindings must match exact P63 manifest.
source_bad=[]
for p in base['profiles']:
    for b in p['sourceBindings']:
        if idx.get(b['path']) != (b['bytes'],b['sha256']): source_bad.append(b['path'])
ck('source:p63-manifest-bindings',not source_bad,source_bad[:10])
# Capture artifacts exact bytes/hash and contents.
cap_bad=[]; empty=[]; promote=[]
for p in base['profiles']:
    c=p['captureArtifact']; q=ROOT/c['path']
    if not q.is_file(): cap_bad.append(c['path']); continue
    raw=q.read_bytes()
    if len(raw)!=c['bytes'] or sha(raw)!=c['sha256']: cap_bad.append(c['path'])
    x=json.loads(raw)
    if x['itemCount']<=0: empty.append(c['path'])
    if x.get('finalCustomerOutputCredit') or x.get('saleEligible') or x.get('live') or x.get('currentLiveDataProven'): promote.append(c['path'])
ck('captures:exact',not cap_bad,cap_bad[:10])
ck('captures:nonempty',not empty,empty[:10])
ck('truth:no-promotion',not promote,promote[:10])
ck('verification:local-10-of-10',ver['summary']=={'checks':10,'failed':0,'passed':10},ver['summary'])
status='PASS_P64_EXACT_CURRENT_SOURCE_BOUND_BASELINE_PACKET' if all(x['passed'] for x in checks) else 'FAIL_P64_BASELINE_PACKET'
out={'schemaVersion':'velmere.p64.current-output-baseline-independent-verifier.v1','status':status,'checks':checks,'summary':{'checks':len(checks),'passed':sum(x['passed'] for x in checks),'failed':sum(not x['passed'] for x in checks)},'truthBoundary':'Verifies the P64 17/17 row and 33/33 profile CURRENT-SOURCE-BOUND baseline capture packet against exact P63 manifest bindings. It does not re-execute production customer routes or promote fixture/synthetic data to final customer output, rights, current provider, value, sale, LIVE or WORLD_CLASS credit.'}
print(json.dumps(out,sort_keys=True,indent=2))
sys.exit(0 if status.startswith('PASS') else 1)
