#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, platform, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
TARGET=ROOT/'receipts/p88/P88_AUDIT_EXACT_IMMUTABLE_PDF_RUNTIME.json'
OUT=ROOT/'receipts/p88/P88_AUDIT_EXACT_IMMUTABLE_PDF_REPEATABILITY.json'
CMD=['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','scripts/p88/test-p88-audit-exact-immutable-pdf-runtime.mjs']
def d(b): return hashlib.sha256(b).hexdigest()
runs=[]
for i in range(2):
 p=subprocess.run(CMD,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 if p.returncode: raise SystemExit(f'P88 repeatability run {i+1} failed:\n{p.stderr.decode(errors="replace")}\n{p.stdout.decode(errors="replace")}')
 if not TARGET.is_file(): raise SystemExit(f'P88 repeatability run {i+1} missing receipt')
 runs.append((p.stdout,p.stderr,TARGET.read_bytes()))
checks=[
 {'id':'p88_repeat_run1_exit_zero','status':'PASS'},
 {'id':'p88_repeat_run2_exit_zero','status':'PASS'},
 {'id':'p88_repeat_stdout_byte_identical','status':'PASS' if runs[0][0]==runs[1][0] else 'FAIL'},
 {'id':'p88_repeat_receipt_byte_identical','status':'PASS' if runs[0][2]==runs[1][2] else 'FAIL'},
 {'id':'p88_repeat_stderr_empty','status':'PASS' if runs[0][1]==b'' and runs[1][1]==b'' else 'FAIL'},
]
payload={
 'schemaVersion':'velmere.p88.audit-exact-immutable-pdf-repeatability.v1',
 'generatedAt':'2026-08-20T13:35:00.000Z',
 'status':'PASS' if all(x['status']=='PASS' for x in checks) else 'FAIL',
 'runtime':{'python':platform.python_version(),'nodeCommand':' '.join(CMD)},
 'runs':[{'stdoutBytes':len(o),'stdoutSha256':d(o),'stderrBytes':len(e),'stderrSha256':d(e),'receiptBytes':len(r),'receiptSha256':d(r)} for o,e,r in runs],
 'checks':{'total':len(checks),'passed':sum(x['status']=='PASS' for x in checks),'failed':sum(x['status']=='FAIL' for x in checks),'rows':checks},
 'failureHistoryPreserved':True,
 'truthBoundary':'Two byte-identical local controlled-fixture executions only. No PostgreSQL/Supabase, deployed HTTP, real JWT/RLS, rights/currentness, Customer FINAL, Audit FINAL PDF, build or exact Windows credit.',
}
OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(payload,indent=2)+'\n')
art=ROOT/'artifacts/p88/P88_AUDIT_EXACT_IMMUTABLE_PDF_REPEATABILITY.json'; art.parent.mkdir(parents=True,exist_ok=True); art.write_bytes(OUT.read_bytes())
print(json.dumps({'status':payload['status'],'passed':payload['checks']['passed'],'total':payload['checks']['total'],'receiptSha256':payload['runs'][0]['receiptSha256']},indent=2))
raise SystemExit(0 if payload['status']=='PASS' else 1)
