#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

ROOT=Path(__file__).resolve().parents[2]
ART=ROOT/'artifacts/closure/p35'
OUT=ART/'P35_STATIC_SCREEN.json'
NODE=Path('/opt/pyvenv/lib/python3.13/site-packages/playwright/driver/node')
LOADER=ROOT/'scripts/pass11/register-offline-ts-loader.mjs'
TS_JS=Path('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')
EXCLUDED={'.git','.next','node_modules','.velmere','__pycache__'}


def sha(p:Path)->str:
 h=hashlib.sha256()
 with p.open('rb') as f:
  for c in iter(lambda:f.read(1024*1024),b''):h.update(c)
 return h.hexdigest()
def run(name:str,cmd:list[str],timeout:int=300,env:dict[str,str]|None=None)->dict[str,Any]:
 try:
  p=subprocess.run(cmd,cwd=ROOT,text=True,capture_output=True,timeout=timeout,env={**os.environ,**(env or {}),'TERM':'dumb'})
  return {'name':name,'command':cmd,'returnCode':p.returncode,'stdoutTail':p.stdout[-4000:],'stderrTail':p.stderr[-4000:]}
 except subprocess.TimeoutExpired as e:
  return {'name':name,'command':cmd,'returnCode':None,'timeout':True,'stdoutTail':(e.stdout or '')[-4000:] if isinstance(e.stdout,str) else '', 'stderrTail':(e.stderr or '')[-4000:] if isinstance(e.stderr,str) else ''}

def main()->int:
 diff=json.load(open(ART/'p34-vs-p35-current-diff.json'))
 changed=[]
 for row in diff['changed']:
  changed.append(row['path'])
 changed.extend(diff['onlyCurrent'])
 changed=sorted(set(x for x in changed if not x.startswith('artifacts/') and (ROOT/x).is_file()))
 ts_files=[x for x in changed if Path(x).suffix in {'.ts','.tsx'}]
 js_files=[x for x in changed if Path(x).suffix in {'.js','.mjs','.cjs'}]
 py_files=[x for x in changed if Path(x).suffix=='.py']

 json_errors=[]; parsed=0
 for p in sorted(ROOT.rglob('*.json'),key=lambda x:x.as_posix().encode()):
  rel=p.relative_to(ROOT)
  if any(part in EXCLUDED for part in rel.parts):continue
  if p.name.endswith(('.stdout.json','.stderr.json')) or p.name=='P35_STATIC_SCREEN.json':continue
  try:json.loads(p.read_text('utf-8')); parsed+=1
  except Exception as e:json_errors.append({'path':rel.as_posix(),'error':str(e)})

 commands=[]
 if py_files:commands.append(run('python_compile',[sys.executable,'-m','py_compile',*py_files]))
 for x in js_files:commands.append(run(f'node_check:{x}',['node','--check',x]))

 # Syntax/transpile diagnostic only; never aliases project typecheck/build.
 transpile_script=ART/'p35-transpile-diagnostic.cjs'
 transpile_script.write_text('''
const fs=require("fs");
const ts=require(process.argv[2]);
const files=process.argv.slice(3);
const errors=[];
for(const file of files){
 const source=fs.readFileSync(file,"utf8");
 const result=ts.transpileModule(source,{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,isolatedModules:true}});
 for(const d of result.diagnostics||[]){if(d.category===ts.DiagnosticCategory.Error) errors.push({file,code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText," ")});}
}
console.log(JSON.stringify({typescriptVersion:ts.version,files:files.length,errors}));
process.exit(errors.length?1:0);
''','utf-8')
 if ts_files:commands.append(run('changed_ts_transpile_diagnostic',['node',str(transpile_script),str(TS_JS),*ts_files],timeout=300))

 tests=[
  'tests/security/a102-evidence-availability-dynamic-tier.test.ts',
  'tests/security/a102-current-evidence-availability-matrix.test.ts',
  'tests/security/a102-exact-customer-pdf-delivery.test.ts',
  'tests/security/a102-account-artifact-preview-download-parity.test.ts',
  'tests/security/a102-public-tier-readiness-contract.test.ts',
  'tests/security/a102-evidence-availability-artifact-methodology-binding.test.ts',
 ]
 for t in tests:
  commands.append(run(f'test:{t}',[str(NODE),'--import',str(LOADER),t],timeout=180,env={'VELMERE_OFFLINE_TS_FORCE_BUILTIN':'1'}))
 commands.extend([
  run('p35_ai_verifier',[sys.executable,'scripts/closure/verify-p35-internal-ai-availability-ledger.py'],timeout=300),
  run('p35_ai_test',['node','tests/security/a102-p35-internal-ai-availability-ledger.test.mjs']),
  run('p32_profile_verifier',[sys.executable,'scripts/closure/verify-p32-profile-execution-receipts.py']),
 ])

 # Credential-literal screen over changed source only; fixtures/tests are reported separately, not promoted to secret proof.
 secret_patterns=[re.compile(r'(?i)(?:sk_live_|rk_live_|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)'),re.compile(r'(?i)(?:password|secret|api[_-]?key)\s*[:=]\s*["\'][^"\']{12,}["\']')]
 secret_hits=[]
 for rel in changed:
  # The scanner source contains its own detection regex literals; that is test-harness code, not a credential.
  if rel == 'scripts/closure/build-p35-static-screen.py':continue
  if rel.startswith(('tests/','docs/','artifacts/')):continue
  p=ROOT/rel
  if p.suffix.lower() in {'.png','.jpg','.jpeg','.gif','.webp','.zip','.pdf','.ttf','.woff','.woff2','.tgz'}:continue
  try:text=p.read_text('utf-8')
  except Exception:continue
  for idx,line in enumerate(text.splitlines(),1):
   if any(rx.search(line) for rx in secret_patterns):secret_hits.append({'path':rel,'line':idx,'sample':line[:200]})

 source=json.load(open(ART/'source-identity.json'))
 summary=json.load(open(ART/'internal-ai-availability-artifact-summary.json'))
 verifier=json.load(open(ART/'internal-ai-availability-ledger-verifier-receipt.json'))
 paid=json.load(open(ART/'paid-readiness-matrix.json'))
 command_failures=[x for x in commands if x.get('returnCode')!=0]
 status='PASS' if not json_errors and not secret_hits and not command_failures else 'FAIL'
 result={
  'schemaVersion':'velmere.p35.static-screen.v1','status':status,
  'changedSourceFiles':len(changed),'changedTsTsx':len(ts_files),'changedJsMjsCjs':len(js_files),'changedPython':len(py_files),
  'jsonFilesParsed':parsed,'jsonParseErrors':json_errors,'credentialLiteralHits':secret_hits,
  'commands':commands,'commandsPassed':sum(x.get('returnCode')==0 for x in commands),'commandsTotal':len(commands),
  'sourceIdentity':{'fileCount':source['fileCount'],'payloadBytes':source['payloadBytes'],'sourceAggregateSha256':source['sourceAggregateSha256'],'receiptSha256':sha(ART/'source-identity.json')},
  'internalAi':{'rows':summary['rowsExecuted'],'denominator':summary['rowDenominator'],'cohorts':summary['cohortCount'],'profiles':summary['profilesCovered'],'mutationsDetected':verifier['checks']['mutationsDetected'],'mutationDenominator':verifier['checks']['mutationDenominator']},
  'eligibility':{'profiles':summary['availabilityMatrix']['profileDenominator'],'analysisEligible':summary['availabilityMatrix']['analysisEligibleProfileCount'],'saleEligible':summary['availabilityMatrix']['saleEligibleProfileCount']},
  'paidReadiness':{'axes':paid['axisCount'],'internalPass':paid['internalInfrastructurePassCount'],'releasePass':paid['releasePassCount'],'goPaidAllowed':paid['goPaidAllowed']},
  'truthBoundary':'Static/transpile/current-source tests do not grant exact project typecheck, production build, Browser/staging, final holdout, real-customer, legal/provider-rights, GO_PAID or external proof credit.'
 }
 OUT.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n','utf-8')
 print(json.dumps({'status':status,'changedSourceFiles':len(changed),'jsonFilesParsed':parsed,'commandsPassed':result['commandsPassed'],'commandsTotal':result['commandsTotal'],'secretHits':len(secret_hits)}))
 return 0 if status=='PASS' else 1
if __name__=='__main__':raise SystemExit(main())
