#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,os,platform,subprocess,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'receipts/p86/P86_EXACT_PDF_FAIL_CLOSED_REPEATABILITY.json'
cmd=['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','tests/security/a102-p36-exact-customer-pdf-integration.test.ts']
runs=[]
with tempfile.TemporaryDirectory(prefix='velmere-p86-repeat-') as td:
 for i in range(2):
  target=Path(td)/f'run-{i+1}.json'; env=dict(os.environ); env['P36_TEST_RECEIPT_OUTPUT']=str(target)
  p=subprocess.run(cmd,cwd=ROOT,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
  if p.returncode: raise SystemExit(f'run {i+1} failed:{p.stderr.decode(errors="replace")}')
  runs.append((p.stdout,p.stderr,target.read_bytes()))
h=lambda b:hashlib.sha256(b).hexdigest()
checks=[
 {'id':'p86_repeat_run1_exit_zero','status':'PASS'},
 {'id':'p86_repeat_run2_exit_zero','status':'PASS'},
 {'id':'p86_repeat_stdout_byte_identical','status':'PASS' if runs[0][0]==runs[1][0] else 'FAIL'},
 {'id':'p86_repeat_receipt_byte_identical','status':'PASS' if runs[0][2]==runs[1][2] else 'FAIL'},
 {'id':'p86_repeat_stderr_empty','status':'PASS' if runs[0][1]==b'' and runs[1][1]==b'' else 'FAIL'},
]
payload={'schemaVersion':'velmere.p86.exact-pdf-fail-closed-repeatability.v1','generatedAt':'2026-08-20T03:55:00Z','status':'PASS' if all(x['status']=='PASS' for x in checks) else 'FAIL','runtime':{'python':platform.python_version(),'nodeCommand':' '.join(cmd)},'runs':[{'stdoutBytes':len(r[0]),'stdoutSha256':h(r[0]),'receiptBytes':len(r[2]),'receiptSha256':h(r[2]),'stderrBytes':len(r[1])} for r in runs],'checks':{'total':len(checks),'passed':sum(x['status']=='PASS' for x in checks),'failed':sum(x['status']=='FAIL' for x in checks),'rows':checks},'truthBoundary':'Byte-identical local route/in-memory integration only. Durable database, deployed HTTP, real customer and exact Windows remain WITHHELD.'}
OUT.write_text(json.dumps(payload,indent=2)+'\n',encoding='utf-8'); print(json.dumps(payload,indent=2)); raise SystemExit(0 if payload['status']=='PASS' else 1)
