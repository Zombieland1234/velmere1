#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,os,re,signal,subprocess,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
LOGDIR=ROOT/'artifacts/p89/logs/regression/segment-b'
OUT=ROOT/'receipts/p89/P89_CURRENT_REGRESSION_SEGMENT_B.json'
LOGDIR.mkdir(parents=True,exist_ok=True)
NODE=['node','--import','./scripts/pass11/register-offline-ts-loader.mjs']
COMMANDS=[
 ('P84_P83_COMPATIBILITY',['python3','scripts/p84/verify-p84-p83-atomic-publication-compatibility.py'],7,[r'"status": "PASS"',r'"total": 7']),
 ('P82_QUORUM_RUNTIME',NODE+['scripts/p82/test-p82-successful-quorum-integrity-runtime.mjs'],167,[r'PASS \(167/167\)']),
 ('P82_QUORUM_STATIC',['python3','scripts/p82/test-p82-successful-quorum-integrity-static.py'],129,[r'"checkCount": 129',r'"passed": 129']),
 ('P80_IMMUTABLE_AUDIT_RUNTIME',NODE+['scripts/p80/test-p80-audit-exact-immutable-artifact-runtime.mjs'],67,[r'"checkCount": 67',r'"failed": 0']),
 ('P79_HISTORICAL_RUNTIME',NODE+['scripts/p79/test-p79-historical-deployment-customer-path-runtime.mjs'],93,[r'"checkCount": 93',r'"failed": \[\]']),
 ('P79_CUSTOMER_PATH_STATIC',['python3','scripts/p79/test-p79-customer-path-static.py'],98,[r'"checkCount": 98',r'"failed": \[\]']),
 ('P78_PRIVATE_PROVIDER_RUNTIME',NODE+['scripts/p78/test-p78-private-provider-evidence-runtime.mjs'],27,[r'"status": "PASS"']),
 ('P78_STANDARD_JSON_RUNTIME',NODE+['scripts/p78/test-p78-standard-json-customer-path-runtime.mjs'],38,[r'"total": 38',r'"failed": 0']),
 ('P78_THIRDWEB_RUNTIME',NODE+['scripts/p78/test-p78-thirdweb-micro-corpus-runtime.mjs'],58,[r'"passed": 58',r'"failed": 0']),
 ('P78_DATAFLOW_STATIC',['python3','scripts/p78/test-p78-static.py'],38,[r'"checkCount": 38',r'"status": "PASS"']),
 ('P78R3_CUSTOMER_PATH_STATIC',['python3','scripts/p78/test-p78r3-customer-path-static.py'],54,[r'"checkCount": 54',r'"failed": \[\]']),
 ('P77_DETERMINISTIC_DELIVERY_STATIC',['python3','scripts/p81/test-p77-deterministic-delivery-current-static.py','--source-root',str(ROOT),'--receipt',str(ROOT/'receipts/p89/P89_P77_DETERMINISTIC_DELIVERY_CURRENT_STATIC_REGRESSION.json')],23,[r'"checkCount": 23',r'"status": "PASS"']),
 ('EXACT_PDF_UNIT',NODE+['--test','tests/security/a102-exact-customer-pdf-delivery.test.ts'],22,[r'PASS \(22/22\)',r'# fail 0']),
 ('EXACT_PDF_INTEGRATION',NODE+['--test','tests/security/a102-p36-exact-customer-pdf-integration.test.ts'],61,[r'"assertions": 61',r'# fail 0']),
 ('ACCOUNT_ARTIFACT_PARITY_STATIC',NODE+['tests/security/a102-account-artifact-preview-download-parity.test.ts'],28,[r'PASS \(28/28\)']),
]
def sha(p:Path):return hashlib.sha256(p.read_bytes()).hexdigest()
def run(cmd,timeout=180):
 p=subprocess.Popen(cmd,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,start_new_session=True)
 try:
  out,err=p.communicate(timeout=timeout);return p.returncode,out,err,False
 except subprocess.TimeoutExpired:
  os.killpg(p.pid,signal.SIGKILL);out,err=p.communicate();return 124,out,err+b'\nPROCESS_GROUP_TIMEOUT\n',True
rows=[]
for i,(name,cmd,checks,patterns) in enumerate(COMMANDS,1):
 start=time.monotonic();rc,out,err,timed=run(cmd);elapsed=round(time.monotonic()-start,3)
 log=LOGDIR/f'{i:02d}_{name}.log';log.write_bytes(out+(b'\n--- STDERR ---\n'+err if err else b''))
 text=log.read_text('utf-8',errors='replace');markers=[{'pattern':x,'matched':bool(re.search(x,text))} for x in patterns]
 status='PASS' if rc==0 and all(x['matched'] for x in markers) else 'FAIL'
 row={'name':name,'command':cmd,'returnCode':rc,'timedOut':timed,'elapsedSeconds':elapsed,'checks':checks,'status':status,'markers':markers,'log':log.relative_to(ROOT).as_posix(),'logSha256':sha(log)};rows.append(row)
 print(f'{status} {name} {checks} rc={rc} {elapsed}s',flush=True)
 if status!='PASS':break
status='PASS' if len(rows)==len(COMMANDS) and all(x['status']=='PASS' for x in rows) else 'FAIL'
payload={'schemaVersion':'velmere.p89.current-regression-segment-b.v1','generatedAt':'2026-08-20T20:15:00.000Z','status':status,'commandsPassed':sum(x['status']=='PASS' for x in rows),'commandsExpected':len(COMMANDS),'aggregateExecutedChecksAcrossOverlappingHarnesses':sum(x['checks'] for x in rows if x['status']=='PASS'),'rows':rows,'truthBoundary':'Process-group-bounded current-byte segment. Counts overlap and grant no provider, rights, staging, deployment, Customer FINAL or exact-Windows credit.'}
OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_text(json.dumps(payload,indent=2)+'\n')
print(json.dumps({'status':status,'commands':f"{payload['commandsPassed']}/{payload['commandsExpected']}",'checks':payload['aggregateExecutedChecksAcrossOverlappingHarnesses']},indent=2))
raise SystemExit(0 if status=='PASS' else 1)
