#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, os, signal, subprocess, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
LOGDIR=ROOT/'artifacts/p93/logs/regression/current-byte'; LOGDIR.mkdir(parents=True,exist_ok=True)
NODE=['node','--import','./scripts/pass11/register-offline-ts-loader.mjs']
SPECS=[
 {'id':'P93_CANONICAL_RUNTIME','cmd':NODE+['scripts/p93/test-p93-risk-history-canonical-resolution-runtime.mjs'],'checks':42,'receipt':'receipts/p93/P93_RISK_HISTORY_CANONICAL_RESOLUTION_RUNTIME.json','total':42},
 {'id':'P93_DURABLE_COMPAT','cmd':NODE+['scripts/p93/test-p93-risk-history-durable-canonical-compatibility-runtime.mjs'],'checks':14,'receipt':'receipts/p93/P93_RISK_HISTORY_DURABLE_CANONICAL_COMPATIBILITY_RUNTIME.json','total':14},
 {'id':'P93_CANONICAL_STATIC','cmd':['python3','scripts/p93/test-p93-risk-history-canonical-resolution-static.py'],'checks':84,'receipt':'receipts/p93/P93_RISK_HISTORY_CANONICAL_RESOLUTION_STATIC.json','total':84},
 {'id':'P93_CROSS_PRODUCT_STATIC','cmd':['python3','scripts/p93/test-p93-cross-product-risk-history-propagation-static.py'],'checks':65,'receipt':'receipts/p93/P93_CROSS_PRODUCT_RISK_HISTORY_PROPAGATION_STATIC.json','total':65},
 {'id':'P93_REACHABILITY','cmd':NODE+['scripts/p93/test-p93-changed-module-reachability.mjs'],'checks':12,'receipt':'receipts/p93/P93_CHANGED_MODULE_REACHABILITY.json','total':12},
 {'id':'P93_TYPESCRIPT','cmd':['python3','scripts/p93/test-p93-targeted-typescript.py'],'checks':3,'receipt':'receipts/p93/P93_TARGETED_STRICT_TYPESCRIPT.json','total':3},
 {'id':'P93_REPEATABILITY','cmd':['python3','scripts/p93/verify-p93-runtime-repeatability.py'],'checks':24,'receipt':'receipts/p93/P93_RUNTIME_REPEATABILITY.json','total':24,'timeout':300},
 {'id':'P91_CONTRACT_COMPAT','cmd':NODE+['scripts/p91/test-p91-risk-history-contract-runtime.mjs'],'checks':38,'receipt':'receipts/p91/P91_RISK_HISTORY_CONTRACT_RUNTIME.json','total':38},
 {'id':'P91_IMPORT_COMPAT','cmd':NODE+['scripts/p91/test-p91-changed-module-imports.mjs'],'checks':6,'receipt':'receipts/p91/P91_CHANGED_MODULE_IMPORTS.json','imports':5},
 {'id':'P92_CUSTOMER_CLIENT_COMPAT','cmd':NODE+['scripts/p92/test-p92-risk-history-customer-client-runtime.mjs'],'checks':48,'receipt':'receipts/p92/P92_RISK_HISTORY_CUSTOMER_CLIENT_RUNTIME.json','total':48},
 {'id':'P92_TARGETED_TS_COMPAT','cmd':['python3','scripts/p92/test-p92-targeted-typescript.py'],'checks':2,'receipt':'receipts/p92/P92_TARGETED_STRICT_TYPESCRIPT.json','total':2},
 {'id':'P92_RISK_DOMAIN_COMPAT','cmd':['python3','scripts/p92/run-p92-risk-domain-regressions.py'],'checks':8,'receipt':'receipts/p92/P92_RISK_DOMAIN_REGRESSION.json','aggregate':8,'withheld':2},
]
def sha(path:Path): return hashlib.sha256(path.read_bytes()).hexdigest()
def execute(spec,log):
    start=time.monotonic()
    with log.open('wb') as stream:
        process=subprocess.Popen(spec['cmd'],cwd=ROOT,stdout=stream,stderr=subprocess.STDOUT,start_new_session=True)
        try:
            rc=process.wait(timeout=spec.get('timeout',180)); timed=False
        except subprocess.TimeoutExpired:
            os.killpg(process.pid,signal.SIGKILL); rc=process.wait(); timed=True; stream.write(b'\nPROCESS_GROUP_TIMEOUT\n')
    return rc,timed,round(time.monotonic()-start,3)
def validate(spec):
    path=ROOT/spec['receipt']
    try: data=json.loads(path.read_text('utf-8'))
    except Exception as error: return False,{'receiptError':str(error)}
    status=str(data.get('status','')); ok=status.startswith('PASS')
    checks=data.get('checks') if isinstance(data.get('checks'),dict) else {}
    if 'total' in spec: ok=ok and checks.get('total')==spec['total']
    if 'aggregate' in spec: ok=ok and data.get('aggregateExecutedChecksAcrossOverlappingHarnesses')==spec['aggregate']
    if 'withheld' in spec: ok=ok and data.get('commands',{}).get('withheld')==spec['withheld']
    if 'imports' in spec: ok=ok and data.get('executableImports',{}).get('total')==spec['imports'] and data.get('staticDependencyBoundaryChecks')==1
    return ok,{'receipt':spec['receipt'],'receiptStatus':status,'receiptSha256':sha(path)}
rows=[]
for index,spec in enumerate(SPECS,1):
    log=LOGDIR/f'{index:02d}_{spec["id"]}.log'
    rc,timed,elapsed=execute(spec,log)
    evidence,detail=validate(spec)
    passed=rc==0 and not timed and evidence
    row={'id':spec['id'],'status':'PASS' if passed else 'FAIL','checks':spec['checks'],'returnCode':rc,'timedOut':timed,'elapsedSeconds':elapsed,'command':spec['cmd'],'log':log.relative_to(ROOT).as_posix(),'logSha256':sha(log),**detail}
    rows.append(row); print(f"{row['status']} {row['id']} checks={row['checks']} rc={rc} elapsed={elapsed}s",flush=True)
    if not passed: break
failed=[row for row in rows if row['status']!='PASS']; complete=len(rows)==len(SPECS)
adjudication=ROOT/'receipts/p93/P93_FAILURE_ADJUDICATION.json'; adjudication_data=json.loads(adjudication.read_text())
if adjudication_data.get('status')!='PASS_COMPLETE_FAILURE_ADJUDICATION_ZERO_CREDIT': failed.append({'id':'FAILURE_ADJUDICATION','status':'FAIL'})
receipt={
 'schemaVersion':'velmere.p93.current-byte-regression.v1',
 'generatedAt':'2026-08-20T14:00:00.000Z',
 'status':'PASS_BOUNDED_CURRENT_BYTE_AFFECTED_SCOPE_REGRESSION' if complete and not failed else 'FAIL',
 'commands':{'expected':len(SPECS),'executed':len(rows),'passed':sum(row['status']=='PASS' for row in rows),'failed':sum(row['status']!='PASS' for row in rows)},
 'aggregateExecutedChecksAcrossOverlappingHarnesses':sum(row['checks'] for row in rows if row['status']=='PASS'),
 'rows':rows,
 'failureAdjudication':{'receipt':adjudication.relative_to(ROOT).as_posix(),'sha256':sha(adjudication),'zeroCreditRows':adjudication_data.get('failures',{}).get('zeroCredit')},
 'supersededHistoricalRows':[
  'P91 ledger v1-only runtime','P91 static old public projection','P91 stale closed-ambient TypeScript','P91 composite repeatability',
  'P92 UI static old limit/header contract','P92 historical reachability timeout',
 ],
 'parentUnchangedScopeEvidence':{'p92ParentCurrentRegressionChecks':1501,'freshP93Credit':False,'reason':'Unchanged Audit/PDF/Real-Markets scopes retain parent evidence identity but were not re-counted as fresh current-byte P93 executions.'},
 'explicitEnvironmentWithholds':2,
 'zeroFakeCredit':{'countsOverlap':True,'independentEvidenceCount':False,'failedOrTimedOutRowsCredited':False,'withheldCommandsCredited':False,'browserRendered':False,'postgresqlExecuted':False,'deployedRoute':False,'wholeProjectBuild':False,'customerFinal':'0/20'},
 'truthBoundary':'Fresh P93 core plus affected P91/P92 compatibility and risk-domain replay on current bytes. Unchanged parent scopes are not inflated into the P93 fresh aggregate. PostgreSQL, RLS, deployed HTTP, Browser, whole-project build, exact Windows and Customer FINAL remain WITHHELD.',
}
for relative in ['receipts/p93/P93_CURRENT_BYTE_REGRESSION.json','artifacts/p93/P93_CURRENT_BYTE_REGRESSION.json']:
    target=ROOT/relative; target.parent.mkdir(parents=True,exist_ok=True); target.write_text(json.dumps(receipt,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps({'status':receipt['status'],'commands':receipt['commands'],'checks':receipt['aggregateExecutedChecksAcrossOverlappingHarnesses']},indent=2))
raise SystemExit(0 if receipt['status'].startswith('PASS') else 1)
