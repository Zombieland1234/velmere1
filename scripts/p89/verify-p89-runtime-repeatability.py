#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,platform,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'receipts/p89/P89_AUDIT_PROVIDER_EVIDENCE_DIMENSIONS_REPEATABILITY.json'
ART=ROOT/'artifacts/p89/P89_AUDIT_PROVIDER_EVIDENCE_DIMENSIONS_REPEATABILITY.json'
CASES=[
 ('dimensions','scripts/p89/test-p89-audit-provider-evidence-dimensions-runtime.mjs','receipts/p89/P89_AUDIT_PROVIDER_EVIDENCE_DIMENSIONS_RUNTIME.json'),
 ('pdf_schema','scripts/p89/test-p89-audit-pdf-evidence-dimensions-runtime.mjs','receipts/p89/P89_AUDIT_PDF_EVIDENCE_DIMENSIONS_RUNTIME.json'),
]
def d(b):return hashlib.sha256(b).hexdigest()
runs={}
for name,script,receipt in CASES:
 rows=[]
 cmd=['node','--import','./scripts/pass11/register-offline-ts-loader.mjs',script]
 for i in range(2):
  p=subprocess.run(cmd,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
  if p.returncode:
   raise SystemExit(f'{name} repeatability run {i+1} failed\nSTDOUT:\n{p.stdout.decode(errors="replace")}\nSTDERR:\n{p.stderr.decode(errors="replace")}')
  target=ROOT/receipt
  if not target.is_file():raise SystemExit(f'{name} run {i+1} missing {receipt}')
  rows.append({'stdout':p.stdout,'stderr':p.stderr,'receipt':target.read_bytes()})
 runs[name]={'command':' '.join(cmd),'rows':rows}
checks=[]
def check(i,c):checks.append({'id':i,'status':'PASS' if c else 'FAIL'})
for name in runs:
 rows=runs[name]['rows']
 check(f'{name}_run1_exit_zero',True);check(f'{name}_run2_exit_zero',True)
 check(f'{name}_stdout_byte_identical',rows[0]['stdout']==rows[1]['stdout'])
 check(f'{name}_receipt_byte_identical',rows[0]['receipt']==rows[1]['receipt'])
 check(f'{name}_stderr_empty',rows[0]['stderr']==b'' and rows[1]['stderr']==b'')
check('first_failure_log_preserved',(ROOT/'artifacts/p89/logs/regression/00A_P89_BASIC_SCHEMA_FIRST_FAIL.log').is_file())
failed=[x for x in checks if x['status']=='FAIL']
payload={
 'schemaVersion':'velmere.p89.audit-provider-evidence-dimensions-repeatability.v1',
 'generatedAt':'2026-08-20T18:30:00.000Z',
 'status':'PASS' if not failed else 'FAIL',
 'runtime':{'python':platform.python_version(),'node':subprocess.check_output(['node','--version'],text=True).strip()},
 'runs':{name:{'command':data['command'],'executions':[{'stdoutBytes':len(r['stdout']),'stdoutSha256':d(r['stdout']),'stderrBytes':len(r['stderr']),'stderrSha256':d(r['stderr']),'receiptBytes':len(r['receipt']),'receiptSha256':d(r['receipt'])} for r in data['rows']]} for name,data in runs.items()},
 'checks':{'total':len(checks),'passed':len(checks)-len(failed),'failed':len(failed),'rows':checks},
 'failureHistoryPreserved':True,
 'truthBoundary':'Two byte-identical local controlled-fixture executions of each P89 runtime harness. This is not live provider, rights, staging, deployed HTTP, Customer FINAL, Audit FINAL PDF or exact-Windows proof.'
}
OUT.parent.mkdir(parents=True,exist_ok=True);ART.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(json.dumps(payload,indent=2)+'\n');ART.write_bytes(OUT.read_bytes())
print(json.dumps({'status':payload['status'],'passed':payload['checks']['passed'],'total':payload['checks']['total'],'receiptSha256':d(OUT.read_bytes())},indent=2))
raise SystemExit(0 if not failed else 1)
