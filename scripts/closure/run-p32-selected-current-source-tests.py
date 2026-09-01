#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, subprocess, time
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
OLD=ROOT/'artifacts/closure/p32/test-ledger.json'
OUT=ROOT/'artifacts/closure/p32/final-selected-test-ledger.json'
LOG=ROOT/'artifacts/closure/p32/final-selected-test-logs'
NODE=Path('/opt/nvm/versions/node/v22.16.0/bin/node')
LOADER=ROOT/'scripts/pass11/register-offline-ts-loader.mjs'

def sha(p:Path): return hashlib.sha256(p.read_bytes()).hexdigest()
paths=[r['path'] for r in json.loads(OLD.read_text())['results']]
LOG.mkdir(parents=True,exist_ok=True)
results=[]
for rel in paths:
    cmd=[str(NODE)]
    if rel.endswith(('.ts','.tsx')): cmd += ['--import','./scripts/pass11/register-offline-ts-loader.mjs']
    cmd += [rel]
    started=time.monotonic()
    try:
        cp=subprocess.run(cmd,cwd=ROOT,text=True,capture_output=True,timeout=180)
        state='PASS' if cp.returncode==0 else 'FAIL'
        timed=False
        rc=cp.returncode
        out,err=cp.stdout,cp.stderr
    except subprocess.TimeoutExpired as e:
        state='TIMEOUT'; timed=True; rc=124
        out=(e.stdout or '') if isinstance(e.stdout,str) else ''
        err=(e.stderr or '') if isinstance(e.stderr,str) else ''
    dur=round(time.monotonic()-started,3)
    safe=rel.replace('/','__')
    (LOG/(safe+'.stdout.log')).write_text(out,encoding='utf-8')
    (LOG/(safe+'.stderr.log')).write_text(err,encoding='utf-8')
    results.append({'path':rel,'state':state,'exitCode':rc,'timedOut':timed,'durationSeconds':dur,'command':cmd,'stdoutSha256':hashlib.sha256(out.encode()).hexdigest(),'stderrSha256':hashlib.sha256(err.encode()).hexdigest(),'stdoutTail':out[-3000:],'stderrTail':err[-2000:]})
counts={}
for r in results: counts[r['state']]=counts.get(r['state'],0)+1
ledger={'schemaVersion':'velmere.p32-final-selected-test-ledger.v1','generatedAt':datetime.now(timezone.utc).isoformat(),'runner':{'nodePath':str(NODE),'nodeVersion':subprocess.check_output([str(NODE),'--version'],text=True).strip(),'nodeSha256':sha(NODE),'loader':str(LOADER.relative_to(ROOT)),'loaderSha256':sha(LOADER),'creditClass':'RUNTIME_TEST_UNDER_NON_EXACT_NODE_NO_PRODUCTION_BUILD_CREDIT'},'counts':counts,'testCount':len(results),'results':results}
OUT.write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'testCount':len(results),'counts':counts,'out':str(OUT.relative_to(ROOT))},indent=2))
raise SystemExit(0 if counts.get('PASS')==len(results) else 1)
