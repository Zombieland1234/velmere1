#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, os, signal, subprocess, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
LOGDIR=ROOT/'artifacts/p91/logs/regression/current'
LOGDIR.mkdir(parents=True,exist_ok=True)
NODE=['node','--import','./scripts/pass11/register-offline-ts-loader.mjs']
COMMANDS=[
  {'id':'P90_RIGHTS_CURRENTNESS','cmd':NODE+['scripts/p90/test-p90-audit-provider-rights-currentness-runtime.mjs'],'checks':35,'receipt':'receipts/p90/P90_AUDIT_PROVIDER_RIGHTS_CURRENTNESS_RUNTIME.json','expectedTotal':35},
  {'id':'P90_SOURCIFY','cmd':NODE+['scripts/p90/test-p90-sourcify-parser-runtime.mjs'],'checks':46,'receipt':'receipts/p90/P90_SOURCIFY_MINIMAL_PARSER_RUNTIME.json','expectedTotal':46},
  {'id':'P90_COMMERCIAL_STATIC','cmd':['python3','scripts/p90/test-p90-commercial-path-static.py'],'checks':37,'receipt':'receipts/p90/P90_AUDIT_COMMERCIAL_PATH_STATIC.json','expectedTotal':37},
  {'id':'P90_IMPORTS','cmd':NODE+['scripts/p90/test-p90-changed-module-imports.mjs'],'checks':13,'stdoutMarker':'P90 changed production module imports: PASS (13/13)'},
  {'id':'P90_PDF_RIGHTS','cmd':NODE+['scripts/p90/test-p90-audit-pdf-rights-currentness-runtime.mjs'],'checks':18,'receipt':'receipts/p90/P90_AUDIT_PDF_RIGHTS_CURRENTNESS_RUNTIME.json','expectedTotal':18},
  {'id':'P90_TARGETED_TYPESCRIPT','cmd':['python3','scripts/p90/test-p90-targeted-typescript.py'],'checks':2,'receipt':'receipts/p90/P90_TARGETED_STRICT_TYPESCRIPT.json','expectedTotal':2},
  {'id':'P90_BLOCKED_PROJECTION','cmd':NODE+['scripts/p90/test-p90-blocked-customer-projection-runtime.mjs'],'checks':11,'receipt':'receipts/p90/P90_AUDIT_BLOCKED_CUSTOMER_PROJECTION_RUNTIME.json','expectedTotal':11},
  {'id':'P90_BLOCKED_PAYLOAD','cmd':NODE+['scripts/p90/test-p90-blocked-customer-payload-runtime.mjs'],'checks':39,'receipt':'receipts/p90/P90_AUDIT_BLOCKED_CUSTOMER_PAYLOAD_RUNTIME.json','expectedTotal':39},
  {'id':'P90_REPEATABILITY','cmd':['python3','scripts/p90/verify-p90-runtime-repeatability.py'],'checks':23,'receipt':'receipts/p90/P90_RUNTIME_REPEATABILITY.json','expectedTotal':23},
  {'id':'P90_SEGMENT_B','cmd':['python3','scripts/p90/run-p90-regression-segment-b.py'],'checks':910,'receipt':'receipts/p90/P90_CURRENT_REGRESSION_SEGMENT_B.json','expectedAggregate':910,'timeout':900},
  {'id':'P90_CROSS_WORKSTREAM','cmd':['python3','scripts/p90/run-p90-cross-workstream-regressions.py'],'checks':179,'receipt':'receipts/p90/P90_CROSS_WORKSTREAM_REGRESSION.json','expectedAggregate':179,'timeout':600},
]
def sha(data:bytes)->str:return hashlib.sha256(data).hexdigest()
def execute(command:list[str],timeout:int):
    process=subprocess.Popen(command,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,start_new_session=True)
    try:
        out,err=process.communicate(timeout=timeout);return process.returncode,out,err,False
    except subprocess.TimeoutExpired:
        os.killpg(process.pid,signal.SIGKILL);out,err=process.communicate();return 124,out,err+b'\nPROCESS_GROUP_TIMEOUT\n',True
rows=[]
for index,spec in enumerate(COMMANDS,1):
    started=time.monotonic();rc,out,err,timed=execute(spec['cmd'],spec.get('timeout',300));elapsed=round(time.monotonic()-started,3)
    log=LOGDIR/f"{index:02d}_{spec['id']}.log";log.write_bytes(out+(b'\n--- STDERR ---\n'+err if err else b''))
    evidence_ok=False;detail={}
    if spec.get('receipt'):
        path=ROOT/spec['receipt']
        try:
            data=json.loads(path.read_text())
            status=str(data.get('status',''))
            checks=data.get('checks') if isinstance(data.get('checks'),dict) else {}
            total=checks.get('total')
            aggregate=data.get('aggregateExecutedChecksAcrossOverlappingHarnesses')
            evidence_ok=status.startswith('PASS')
            if 'expectedTotal' in spec:evidence_ok=evidence_ok and total==spec['expectedTotal']
            if 'expectedAggregate' in spec:evidence_ok=evidence_ok and aggregate==spec['expectedAggregate']
            detail={'receipt':spec['receipt'],'receiptStatus':status,'receiptTotal':total,'receiptAggregate':aggregate,'receiptSha256':sha(path.read_bytes())}
        except Exception as error:
            detail={'receiptError':str(error)}
    else:
        text=(out+err).decode('utf-8','replace');marker=spec['stdoutMarker'];evidence_ok=marker in text;detail={'stdoutMarker':marker,'matched':evidence_ok}
    passed=rc==0 and not timed and evidence_ok
    row={'id':spec['id'],'status':'PASS' if passed else 'FAIL','checks':spec['checks'],'returnCode':rc,'timedOut':timed,'elapsedSeconds':elapsed,'command':spec['cmd'],'log':log.relative_to(ROOT).as_posix(),'logSha256':sha(log.read_bytes()),**detail}
    rows.append(row);print(f"{row['status']} {spec['id']} checks={spec['checks']} rc={rc} elapsed={elapsed}s",flush=True)
    if not passed:break
failed=[row for row in rows if row['status']!='PASS']
complete=len(rows)==len(COMMANDS)
receipt={
  'schemaVersion':'velmere.p91.current-regression.v1',
  'generatedAt':'2026-08-20T19:10:00.000Z',
  'status':'PASS_BOUNDED_CURRENT_REGRESSION' if complete and not failed else 'FAIL',
  'commands':{'expected':len(COMMANDS),'executed':len(rows),'passed':sum(row['status']=='PASS' for row in rows),'failed':len(failed)},
  'aggregateExecutedChecksAcrossOverlappingHarnesses':sum(row['checks'] for row in rows if row['status']=='PASS'),
  'rows':rows,
  'truthBoundary':'Current P91 bytes replay the P90 core, segment-B and cross-workstream harnesses. Counts overlap and grant no provider, rights, database, staging, Customer FINAL, PDF FINAL, build or exact-Windows credit. Historical outputs are restored and independently checked against the canonical P90 parent after execution.',
}
for target in [ROOT/'receipts/p91/P91_CURRENT_REGRESSION.json',ROOT/'artifacts/p91/P91_CURRENT_REGRESSION.json']:
    target.parent.mkdir(parents=True,exist_ok=True);target.write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'status':receipt['status'],'commands':receipt['commands'],'checks':receipt['aggregateExecutedChecksAcrossOverlappingHarnesses']},indent=2))
raise SystemExit(0 if receipt['status'].startswith('PASS') else 1)
