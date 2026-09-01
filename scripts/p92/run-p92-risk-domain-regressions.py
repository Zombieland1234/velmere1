#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, os, re, signal, subprocess, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
LOGDIR=ROOT/'artifacts/p92/logs/regression/risk-domain'; LOGDIR.mkdir(parents=True,exist_ok=True)
NODE=['node','--import','./scripts/pass11/register-offline-ts-loader.mjs']
SPECS=[
 {'id':'MARKET_RISK_DELIVERY_GATE','cmd':NODE+['scripts/pass6/test-market-risk-delivery-gate.ts'],'expected':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','checks':0,'markers':["Cannot find package 'zod'"]},
 {'id':'RISK_CALIBRATION_INVARIANTS','cmd':NODE+['scripts/pass4826/test-risk-calibration-invariants.ts'],'expected':'PASS','checks':6,'markers':['PASS equal-score isotonic aggregation','PASS validation thresholds cannot be weakened']},
 {'id':'RISK_INPUT_FAIL_CLOSED','cmd':NODE+['scripts/pass4826/test-risk-input-fail-closed.ts'],'expected':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','checks':0,'markers':["Cannot find package 'zod'"]},
 {'id':'RISK_ENGINE_SAFETY','cmd':['node','scripts/verify-risk-engine-safety.mjs'],'expected':'PASS','checks':1,'markers':['Risk engine safety checks passed.']},
 {'id':'VLM_RISK_FAIL_CLOSED','cmd':NODE+['scripts/test-vlm-risk-fail-closed.ts'],'expected':'PASS','checks':1,'markers':['PASS: VLM risk scores remain unavailable']},
]
def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
def execute(cmd,timeout=120):
 p=subprocess.Popen(cmd,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,start_new_session=True)
 try: out,err=p.communicate(timeout=timeout);return p.returncode,out,err,False
 except subprocess.TimeoutExpired:
  os.killpg(p.pid,signal.SIGKILL);out,err=p.communicate();return 124,out,err+b'\nPROCESS_GROUP_TIMEOUT\n',True
rows=[]
for i,spec in enumerate(SPECS,1):
 start=time.monotonic();rc,out,err,timed=execute(spec['cmd']);elapsed=round(time.monotonic()-start,3)
 log=LOGDIR/f"{i:02d}_{spec['id']}.log";log.write_bytes(out+(b'\n--- STDERR ---\n'+err if err else b''))
 text=log.read_text('utf-8',errors='replace');markers=all(m in text for m in spec['markers'])
 if spec['expected']=='PASS': status='PASS' if rc==0 and not timed and markers else 'FAIL'
 else: status=spec['expected'] if rc!=0 and not timed and markers else 'FAIL'
 rows.append({'id':spec['id'],'status':status,'expected':spec['expected'],'checks':spec['checks'],'returnCode':rc,'timedOut':timed,'elapsedSeconds':elapsed,'command':spec['cmd'],'markersMatched':markers,'log':log.relative_to(ROOT).as_posix(),'logSha256':sha(log.read_bytes())})
 print(f"{status} {spec['id']} checks={spec['checks']} rc={rc}",flush=True)
failed=[r for r in rows if r['status']=='FAIL']
receipt={
 'schemaVersion':'velmere.p92.risk-domain-regression.v1','generatedAt':'2026-08-20T20:30:00.000Z',
 'status':'PASS_BOUNDED_WITH_EXPLICIT_ENVIRONMENT_WITHHELDS' if not failed else 'FAIL',
 'commands':{'total':len(rows),'passed':sum(r['status']=='PASS' for r in rows),'withheld':sum(r['status'].startswith('WITHHELD') for r in rows),'failed':len(failed)},
 'aggregateExecutedChecksAcrossOverlappingHarnesses':sum(r['checks'] for r in rows if r['status']=='PASS'),
 'rows':rows,
 'zeroFakeCredit':{'withheldCommandsCredited':False,'wholeProjectDependencyGraph':False,'browserRendered':False,'customerFinal':'0/20'},
 'truthBoundary':'Three risk-domain regressions execute on P92 bytes. Two transitive route/input harnesses remain explicitly WITHHELD because SOURCE_ONLY lacks the installed zod dependency; their nonzero executions receive zero credit. This is not Browser, deployed route, provider, build or Customer FINAL proof.'
}
for target in [ROOT/'receipts/p92/P92_RISK_DOMAIN_REGRESSION.json',ROOT/'artifacts/p92/P92_RISK_DOMAIN_REGRESSION.json']:
 target.parent.mkdir(parents=True,exist_ok=True);target.write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'status':receipt['status'],'commands':receipt['commands'],'checks':receipt['aggregateExecutedChecksAcrossOverlappingHarnesses']},indent=2))
raise SystemExit(0 if not failed else 1)
