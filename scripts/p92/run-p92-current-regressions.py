#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,os,signal,subprocess,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
LOGDIR=ROOT/'artifacts/p92/logs/regression/current-byte';LOGDIR.mkdir(parents=True,exist_ok=True)
NODE=['node','--import','./scripts/pass11/register-offline-ts-loader.mjs']
SPECS=[
 {'id':'P91_CONTRACT','cmd':NODE+['scripts/p91/test-p91-risk-history-contract-runtime.mjs'],'checks':38,'receipt':'receipts/p91/P91_RISK_HISTORY_CONTRACT_RUNTIME.json','total':38},
 {'id':'P91_LEDGER','cmd':NODE+['scripts/p91/test-p91-risk-history-ledger-runtime.mjs'],'checks':24,'receipt':'receipts/p91/P91_RISK_HISTORY_LEDGER_RUNTIME.json','total':24},
 {'id':'P91_STATIC','cmd':['python3','scripts/p91/test-p91-risk-history-static.py'],'checks':100,'receipt':'receipts/p91/P91_RISK_HISTORY_STATIC.json','total':100},
 {'id':'P91_TYPESCRIPT','cmd':['python3','scripts/p91/test-p91-targeted-typescript.py'],'checks':2,'receipt':'receipts/p91/P91_TARGETED_STRICT_TYPESCRIPT.json','total':2},
 {'id':'P91_IMPORTS','cmd':NODE+['scripts/p91/test-p91-changed-module-imports.mjs'],'checks':6,'receipt':'receipts/p91/P91_CHANGED_MODULE_IMPORTS.json','imports':5},
 {'id':'P91_REPEATABILITY','cmd':['python3','scripts/p91/verify-p91-runtime-repeatability.py'],'checks':10,'receipt':'receipts/p91/P91_RUNTIME_REPEATABILITY.json','total':10},
 {'id':'P90_RIGHTS','cmd':NODE+['scripts/p90/test-p90-audit-provider-rights-currentness-runtime.mjs'],'checks':35,'receipt':'receipts/p90/P90_AUDIT_PROVIDER_RIGHTS_CURRENTNESS_RUNTIME.json','total':35},
 {'id':'P90_SOURCIFY','cmd':NODE+['scripts/p90/test-p90-sourcify-parser-runtime.mjs'],'checks':46,'receipt':'receipts/p90/P90_SOURCIFY_MINIMAL_PARSER_RUNTIME.json','total':46},
 {'id':'P90_STATIC','cmd':['python3','scripts/p90/test-p90-commercial-path-static.py'],'checks':37,'receipt':'receipts/p90/P90_AUDIT_COMMERCIAL_PATH_STATIC.json','total':37},
 {'id':'P90_IMPORTS','cmd':NODE+['scripts/p90/test-p90-changed-module-imports.mjs'],'checks':13,'marker':'P90 changed production module imports: PASS (13/13)'},
 {'id':'P90_PDF','cmd':NODE+['scripts/p90/test-p90-audit-pdf-rights-currentness-runtime.mjs'],'checks':18,'receipt':'receipts/p90/P90_AUDIT_PDF_RIGHTS_CURRENTNESS_RUNTIME.json','total':18},
 {'id':'P90_TYPESCRIPT','cmd':['python3','scripts/p90/test-p90-targeted-typescript.py'],'checks':2,'receipt':'receipts/p90/P90_TARGETED_STRICT_TYPESCRIPT.json','total':2},
 {'id':'P90_BLOCKED_PROJECTION','cmd':NODE+['scripts/p90/test-p90-blocked-customer-projection-runtime.mjs'],'checks':11,'receipt':'receipts/p90/P90_AUDIT_BLOCKED_CUSTOMER_PROJECTION_RUNTIME.json','total':11},
 {'id':'P90_BLOCKED_PAYLOAD','cmd':NODE+['scripts/p90/test-p90-blocked-customer-payload-runtime.mjs'],'checks':39,'receipt':'receipts/p90/P90_AUDIT_BLOCKED_CUSTOMER_PAYLOAD_RUNTIME.json','total':39},
 {'id':'P90_REPEATABILITY','cmd':['python3','scripts/p90/verify-p90-runtime-repeatability.py'],'checks':23,'receipt':'receipts/p90/P90_RUNTIME_REPEATABILITY.json','total':23},
 {'id':'P90_SEGMENT_B','cmd':['python3','scripts/p90/run-p90-regression-segment-b.py'],'checks':910,'receipt':'receipts/p90/P90_CURRENT_REGRESSION_SEGMENT_B.json','aggregate':910,'timeout':1200},
 {'id':'P90_CROSS','cmd':['python3','scripts/p90/run-p90-cross-workstream-regressions.py'],'checks':179,'receipt':'receipts/p90/P90_CROSS_WORKSTREAM_REGRESSION.json','aggregate':179,'timeout':900},
 {'id':'P92_RISK_DOMAIN','cmd':['python3','scripts/p92/run-p92-risk-domain-regressions.py'],'checks':8,'receipt':'receipts/p92/P92_RISK_DOMAIN_REGRESSION.json','aggregate':8},
]
def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
def run(cmd,log,timeout):
 start=time.monotonic()
 with log.open('wb') as stream:
  p=subprocess.Popen(cmd,cwd=ROOT,stdout=stream,stderr=subprocess.STDOUT,start_new_session=True)
  try: rc=p.wait(timeout=timeout);timed=False
  except subprocess.TimeoutExpired:
   os.killpg(p.pid,signal.SIGKILL);rc=p.wait();stream.write(b'\nPROCESS_GROUP_TIMEOUT\n');timed=True
 return rc,timed,round(time.monotonic()-start,3)
def receipt_ok(spec):
 if 'receipt' not in spec:return True,{}
 p=ROOT/spec['receipt']
 try:d=json.loads(p.read_text())
 except Exception as e:return False,{'receiptError':str(e)}
 status=str(d.get('status',''))
 checks=d.get('checks') if isinstance(d.get('checks'),dict) else {}
 total=checks.get('total');aggregate=d.get('aggregateExecutedChecksAcrossOverlappingHarnesses')
 ok=status.startswith('PASS')
 if 'total' in spec:ok=ok and total==spec['total']
 if 'aggregate' in spec:ok=ok and aggregate==spec['aggregate']
 if 'imports' in spec:ok=ok and d.get('executableImports',{}).get('total')==spec['imports'] and d.get('staticDependencyBoundaryChecks')==1
 return ok,{'receipt':spec['receipt'],'receiptStatus':status,'receiptTotal':total,'receiptAggregate':aggregate,'receiptSha256':sha(p.read_bytes())}
rows=[]
for i,spec in enumerate(SPECS,1):
 log=LOGDIR/f"{i:02d}_{spec['id']}.log";rc,timed,elapsed=run(spec['cmd'],log,spec.get('timeout',300));text=log.read_text('utf-8',errors='replace')
 evidence,detail=receipt_ok(spec)
 if 'marker' in spec:evidence=evidence and spec['marker'] in text;detail['marker']=spec['marker'];detail['markerMatched']=spec['marker'] in text
 passed=rc==0 and not timed and evidence
 row={'id':spec['id'],'status':'PASS' if passed else 'FAIL','checks':spec['checks'],'returnCode':rc,'timedOut':timed,'elapsedSeconds':elapsed,'command':spec['cmd'],'log':log.relative_to(ROOT).as_posix(),'logSha256':sha(log.read_bytes()),**detail}
 rows.append(row);print(f"{row['status']} {row['id']} checks={row['checks']} rc={rc} elapsed={elapsed}s",flush=True)
 if not passed:break
failed=[r for r in rows if r['status']!='PASS'];complete=len(rows)==len(SPECS)
receipt={
 'schemaVersion':'velmere.p92.current-byte-regression.v1','generatedAt':'2026-08-20T20:45:00.000Z',
 'status':'PASS_BOUNDED_CURRENT_BYTE_REGRESSION' if complete and not failed else 'FAIL',
 'commands':{'expected':len(SPECS),'executed':len(rows),'passed':sum(r['status']=='PASS' for r in rows),'failed':len(failed)},
 'aggregateExecutedChecksAcrossOverlappingHarnesses':sum(r['checks'] for r in rows if r['status']=='PASS'),
 'rows':rows,
 'zeroFakeCredit':{'overlappingChecks':True,'independentEvidenceCount':False,'browserRendered':False,'deployedRoute':False,'customerFinal':'0/20'},
 'truthBoundary':'Fresh current-byte replay of the P91 backend, P90 product/regression stack and risk-domain safety lanes on P92 source. Counts overlap. Historical receipt paths are restored byte-for-byte from P91 after this P92 receipt is emitted.'
}
for target in [ROOT/'receipts/p92/P92_CURRENT_BYTE_REGRESSION.json',ROOT/'artifacts/p92/P92_CURRENT_BYTE_REGRESSION.json']:
 target.parent.mkdir(parents=True,exist_ok=True);target.write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'status':receipt['status'],'commands':receipt['commands'],'checks':receipt['aggregateExecutedChecksAcrossOverlappingHarnesses']},indent=2))
raise SystemExit(0 if receipt['status'].startswith('PASS') else 1)
