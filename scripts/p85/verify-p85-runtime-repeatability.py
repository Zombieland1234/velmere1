#!/usr/bin/env python3
import hashlib,json,platform,subprocess,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]; TARGET=ROOT/'receipts/p85/P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_RUNTIME.json'; OUT=ROOT/'receipts/p85/P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_REPEATABILITY.json'
cmd=['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','./scripts/p85/test-p85-owner-visible-artifact-runtime.mjs']; runs=[]
for i in range(2):
 p=subprocess.run(cmd,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 if p.returncode: raise SystemExit(f'run {i+1} failed: {p.stderr.decode(errors="replace")}')
 runs.append((p.stdout,p.stderr,TARGET.read_bytes()))
h=lambda b:hashlib.sha256(b).hexdigest(); checks=[
 {'id':'p85_repeat_run1_exit_zero','status':'PASS'},{'id':'p85_repeat_run2_exit_zero','status':'PASS'},
 {'id':'p85_repeat_stdout_byte_identical','status':'PASS' if runs[0][0]==runs[1][0] else 'FAIL'},
 {'id':'p85_repeat_receipt_byte_identical','status':'PASS' if runs[0][2]==runs[1][2] else 'FAIL'},
 {'id':'p85_repeat_stderr_empty','status':'PASS' if runs[0][1]==b'' and runs[1][1]==b'' else 'FAIL'}]
payload={'schemaVersion':'velmere.p85.owner-visible-customer-artifact-repeatability.v1','status':'PASS' if all(x['status']=='PASS' for x in checks) else 'FAIL','runtime':{'python':platform.python_version(),'nodeCommand':' '.join(cmd)},'runs':[{'stdoutBytes':len(r[0]),'stdoutSha256':h(r[0]),'receiptBytes':len(r[2]),'receiptSha256':h(r[2]),'stderrBytes':len(r[1])} for r in runs],'checks':{'total':5,'passed':sum(x['status']=='PASS' for x in checks),'failed':sum(x['status']=='FAIL' for x in checks),'rows':checks},'truthBoundary':'Byte-identical local mocked-owner-RPC execution only. PostgreSQL, real JWT/RLS, deployed HTTP and exact Windows remain WITHHELD.'}
OUT.write_text(json.dumps(payload,indent=2)+'\n'); print(json.dumps(payload,indent=2)); raise SystemExit(0 if payload['status']=='PASS' else 1)
