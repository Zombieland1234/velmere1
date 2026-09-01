#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,re,subprocess,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
LOGDIR=ROOT/'artifacts/p90/logs/regression/cross-workstream'
OUT=ROOT/'receipts/p90/P90_CROSS_WORKSTREAM_REGRESSION.json'
LOGDIR.mkdir(parents=True,exist_ok=True)
NODE=['node','--import','./scripts/pass11/register-offline-ts-loader.mjs']
COMMANDS=[
 ('P87_REAL_MARKETS_RUNTIME',NODE+['scripts/p87/test-p87-real-markets-exact-pdf-runtime.mjs'],43,[r'"total": 43',r'"failed": 0']),
 ('P87_REPEATABILITY',['python3','scripts/p87/verify-p87-runtime-repeatability.py'],5,[r'"status": "PASS"']),
 ('P87_IMPORTS',NODE+['scripts/p87/test-p87-changed-module-imports.mjs'],3,[r'PASS \(3/3\)']),
 ('P86_REPEATABILITY',['python3','scripts/p86/verify-p86-runtime-repeatability.py'],5,[r'"status": "PASS"']),
 ('P86_IMPORTS',NODE+['scripts/p86/test-p86-changed-module-imports.mjs'],3,[r'PASS \(3/3\)']),
 ('P86_EXACT_PDF_RUNTIME',['python3','scripts/p86/run-p86-exact-pdf-fail-closed-runtime.py'],61,[r'"total": 61',r'"failed": 0']),
 ('P84_OWNER_READ_RUNTIME',NODE+['scripts/p84/test-p84-audit-customer-artifact-owner-read-runtime.mjs'],59,[r'"total": 59',r'"failed": 0']),
]
def sha(p:Path): return hashlib.sha256(p.read_bytes()).hexdigest()
def run_to_closed_log(cmd,log:Path,timeout_seconds=90):
 start=time.monotonic()
 bounded=['/usr/bin/timeout','--kill-after=5s',f'{timeout_seconds}s',*cmd]
 with log.open('wb') as stream:
  try:
   p=subprocess.run(bounded,cwd=ROOT,stdout=stream,stderr=subprocess.STDOUT,timeout=timeout_seconds+15)
   rc=p.returncode
  except subprocess.TimeoutExpired:
   rc=124
   stream.write(b'\nPYTHON_OUTER_TIMEOUT\n')
 return rc,round(time.monotonic()-start,3)
rows=[]
for i,(name,cmd,count,patterns) in enumerate(COMMANDS,1):
 log=LOGDIR/f'{i:02d}_{name}.log'
 rc,elapsed=run_to_closed_log(cmd,log)
 text=log.read_text('utf-8',errors='replace')
 markers=[{'pattern':x,'matched':bool(re.search(x,text))} for x in patterns]
 timed=rc in (124,137)
 status='PASS' if rc==0 and all(x['matched'] for x in markers) else 'FAIL'
 rows.append({'name':name,'command':cmd,'returnCode':rc,'timedOut':timed,'elapsedSeconds':elapsed,'checks':count,'status':status,'markers':markers,'log':log.relative_to(ROOT).as_posix(),'logSha256':sha(log)})
 print(f'{status} {name} {count} rc={rc} {elapsed}s',flush=True)
 if status!='PASS':break
status='PASS' if len(rows)==len(COMMANDS) and all(x['status']=='PASS' for x in rows) else 'FAIL'
payload={'schemaVersion':'velmere.p90.cross-workstream-regression.v2','generatedAt':'2026-08-20T22:05:00.000Z','status':status,'commandsPassed':sum(x['status']=='PASS' for x in rows),'commandsExpected':len(COMMANDS),'aggregateExecutedChecksAcrossOverlappingHarnesses':sum(x['checks'] for x in rows if x['status']=='PASS'),'rows':rows,'orchestration':{'closedFileLogs':True,'externalProcessGroupTimeoutSeconds':90,'firstTimedOutAttemptCredited':False},'truthBoundary':'Current-byte local cross-workstream regression only. Counts overlap and grant no provider, rights, staging, deployment, Customer FINAL or exact-Windows credit.'}
OUT.write_text(json.dumps(payload,indent=2)+'\n')
print(json.dumps({'status':status,'commands':f"{payload['commandsPassed']}/{payload['commandsExpected']}",'checks':payload['aggregateExecutedChecksAcrossOverlappingHarnesses']},indent=2))
raise SystemExit(0 if status=='PASS' else 1)
