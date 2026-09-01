#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUTDIR=ROOT/'artifacts/p90/logs/repeatability'
OUTDIR.mkdir(parents=True,exist_ok=True)
NODE=['node','--import','./scripts/pass11/register-offline-ts-loader.mjs']
commands=[
 ('rights',NODE+['./scripts/p90/test-p90-audit-provider-rights-currentness-runtime.mjs'],'receipts/p90/P90_AUDIT_PROVIDER_RIGHTS_CURRENTNESS_RUNTIME.json'),
 ('sourcify',NODE+['./scripts/p90/test-p90-sourcify-parser-runtime.mjs'],'receipts/p90/P90_SOURCIFY_MINIMAL_PARSER_RUNTIME.json'),
 ('static',['python3','./scripts/p90/test-p90-commercial-path-static.py'],'receipts/p90/P90_AUDIT_COMMERCIAL_PATH_STATIC.json'),
 ('imports',NODE+['./scripts/p90/test-p90-changed-module-imports.mjs'],None),
 ('pdf',NODE+['./scripts/p90/test-p90-audit-pdf-rights-currentness-runtime.mjs'],'receipts/p90/P90_AUDIT_PDF_RIGHTS_CURRENTNESS_RUNTIME.json'),
 ('blocked_projection',NODE+['./scripts/p90/test-p90-blocked-customer-projection-runtime.mjs'],'receipts/p90/P90_AUDIT_BLOCKED_CUSTOMER_PROJECTION_RUNTIME.json'),
 ('blocked_payload',NODE+['./scripts/p90/test-p90-blocked-customer-payload-runtime.mjs'],'receipts/p90/P90_AUDIT_BLOCKED_CUSTOMER_PAYLOAD_RUNTIME.json'),
 ('targeted_ts',['python3','./scripts/p90/test-p90-targeted-typescript.py'],'receipts/p90/P90_TARGETED_STRICT_TYPESCRIPT.json'),
]
def sha(b:bytes):return hashlib.sha256(b).hexdigest()
rows=[];checks=[]
for name,cmd,receipt in commands:
 runs=[]
 for label in ('A','B'):
  p=subprocess.run(cmd,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=180)
  blob=p.stdout+(b'\n--- STDERR ---\n'+p.stderr if p.stderr else b'')
  (OUTDIR/f'{name}_{label}.log').write_bytes(blob)
  receipt_bytes=(ROOT/receipt).read_bytes() if receipt else None
  runs.append({'rc':p.returncode,'output':blob,'receipt':receipt_bytes})
 checks.append({'id':f'{name}_both_zero_exit','status':'PASS' if runs[0]['rc']==0 and runs[1]['rc']==0 else 'FAIL','detail':[runs[0]['rc'],runs[1]['rc']]})
 checks.append({'id':f'{name}_stdout_stderr_byte_identical','status':'PASS' if runs[0]['output']==runs[1]['output'] else 'FAIL','detail':{'runA':sha(runs[0]['output']),'runB':sha(runs[1]['output'])}})
 if receipt:
  checks.append({'id':f'{name}_receipt_byte_identical','status':'PASS' if runs[0]['receipt']==runs[1]['receipt'] else 'FAIL','detail':{'runA':sha(runs[0]['receipt'] or b''),'runB':sha(runs[1]['receipt'] or b'')}})
 rows.append({'name':name,'command':cmd,'runAOutputSha256':sha(runs[0]['output']),'runBOutputSha256':sha(runs[1]['output']),'receipt':receipt,'receiptSha256':sha(runs[1]['receipt']) if receipt else None})
failed=[x for x in checks if x['status']!='PASS']
payload={'schemaVersion':'velmere.p90.runtime-repeatability.v1','generatedAt':'2026-08-20T21:35:00.000Z','status':'PASS_BYTE_IDENTICAL' if not failed else 'FAIL','checks':{'total':len(checks),'passed':len(checks)-len(failed),'failed':len(failed),'rows':checks},'commands':rows,'truthBoundary':'Two immediate executions of each bounded P90 local proof produced byte-identical combined output and, where applicable, byte-identical receipts. This does not prove deployed determinism, provider determinism, database determinism or exact-Windows reproducibility.'}
path=ROOT/'receipts/p90/P90_RUNTIME_REPEATABILITY.json';path.write_text(json.dumps(payload,indent=2)+'\n')
print(json.dumps({'status':payload['status'],'checks':payload['checks'],'commands':len(rows)},indent=2))
raise SystemExit(0 if not failed else 1)
