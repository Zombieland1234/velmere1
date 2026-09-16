from pathlib import Path
import subprocess, os, json, time, signal, urllib.request
from datetime import datetime, timezone

out = Path('r13f-evidence'); out.mkdir(exist_ok=True)
sha = subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
env = {**os.environ, 'NEXT_TELEMETRY_DISABLED':'1', 'R13F_SOURCE_SHA':sha}
results=[]
def run(name, command, timeout=300, required=True, expected=0, extra_env=None):
 started=time.monotonic(); status='FAIL'; code=None
 with (out/(name+'.log')).open('w') as log:
  try:
   result=subprocess.run(command,stdout=log,stderr=subprocess.STDOUT,env={**env,**(extra_env or {})},timeout=timeout)
   code=result.returncode;status='PASS' if code==expected else 'FAIL'
  except subprocess.TimeoutExpired: status='TIMEOUT'
  except Exception as e: log.write('\nRunner exception: '+type(e).__name__+'\n')
 row={'name':name,'command':command,'exitCode':code,'expectedExitCode':expected,'status':status,'required':required,'seconds':round(time.monotonic()-started,3),'log':name+'.log'}
 results.append(row)
 print(json.dumps(row),flush=True)
 (out/'running-status.json').write_text(json.dumps({'sourceCommit':sha,'results':results},indent=2)+'\n')
 return status=='PASS'

node=['node','--experimental-strip-types','--experimental-vm-modules','--test','--test-reporter=tap']
newtests=sorted(str(p) for p in Path('scripts/r13f').glob('*.test.mjs'))
run('negative-control-predecessor',node+newtests,expected=1,extra_env={'R13F_TEST_BASE_REF':'7120c9104ede447f436a39dc62a5bbb8ca176924'})
run('r13f-regression',node+newtests)
run('entitlement-regression',node+sorted(str(p) for folder in ['scripts/r13','scripts/r13b'] for p in Path(folder).glob('*.test.mjs')))
loader=['node','--import','./scripts/pass11/register-offline-ts-loader.mjs']
run('existing-redteam',loader+['--test','--test-reporter=tap','test/security/adversarial-red-team.test.ts'])
run('existing-market-delivery-gate',loader+['scripts/pass6/test-market-risk-delivery-gate.ts'])
run('existing-shield-identity',loader+['tests/security/a85-shield-map-exact-identity.test.ts'])
run('existing-account-session',loader+['tests/unit/auth-session-rls-tenant-isolation.test.ts'])
run('backend-eslint',['npx','--no-install','eslint','lib','scripts','test','tests','app/api','.agents','--format','json'],timeout=300)
try:
 rows=json.loads((out/'backend-eslint.log').read_text())
 summary={'errors':sum(r.get('errorCount',0) for r in rows),'warnings':sum(r.get('warningCount',0) for r in rows),'files':len(rows),'errorDetails':[{'path':r['filePath'].split('/velmere1/')[-1],'messages':[m for m in r.get('messages',[]) if m.get('severity')==2]} for r in rows if r.get('errorCount')]}
 (out/'eslint-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
except Exception as e:
 results.append({'name':'eslint-result-parse','status':'FAIL','required':True,'error':type(e).__name__})
run('typescript-all-partitions',['npm','run','typecheck'],timeout=900)
run('dependency-audit-all',['npm','audit','--json'])
run('dependency-audit-production',['npm','audit','--omit=dev','--json'])
run('source-integrity',['npm','run','audit:source'],required=True)
built=run('production-build-with-type-validation',['npm','run','build'],timeout=900)
if built:
 server_log=(out/'production-server.log').open('w')
 server=subprocess.Popen(['npm','run','start'],stdout=server_log,stderr=subprocess.STDOUT,env={**env,'NODE_ENV':'production'},start_new_session=True)
 ready=False
 try:
  for _ in range(90):
   if server.poll() is not None: break
   try:
    with urllib.request.urlopen('http://127.0.0.1:3000/robots.txt',timeout=1) as response: ready=response.status==200
    if ready: break
   except Exception: time.sleep(0.5)
  if ready: run('local-production-http',['node','scripts/r13f/http-contract.mjs'],extra_env={'BASE_URL':'http://127.0.0.1:3000'})
  else: results.append({'name':'local-production-http','status':'FAIL_SERVER_START','required':True})
 finally:
  try: os.killpg(server.pid,signal.SIGTERM)
  except ProcessLookupError: pass
  try: server.wait(timeout=10)
  except subprocess.TimeoutExpired:
   os.killpg(server.pid,signal.SIGKILL);server.wait()
  server_log.close()
else:
 results.append({'name':'local-production-http','status':'NOT_TESTED_BUILD_FAILED','required':True})

for name,cmd in [
 ('secret-scan-observation',['node','scripts/security/scan-all-secrets.mjs']),
 ('database-contract-observation',['npm','run','audit:database']),
 ('provider-rights-observation',['npm','run','audit:provider-rights']),
 ('merchant-observation',['npm','run','audit:merchant-legal']),
 ('product-readiness-observation',['npm','run','audit:product-readiness']),
]: run(name,cmd,required=False)

passed=all(r['status']=='PASS' for r in results if r['required'])
summary={'schemaVersion':'velmere.r13f.qualification.v1','executedAt':datetime.now(timezone.utc).isoformat(),'sourceCommit':sha,'technicalPassed':passed,'releaseDecision':'NO_GO','commerciallyQualifiedVariants':0,'results':results,'limits':['VM module tests use controlled dependencies; existing offline loader uses SDK shims.','HTTP covers rejection paths against a local production build, not nine paid products or real two-tenant E2E.','Observation steps retain their real command exits but are not release approval.','Provider rights, merchant approval, payment lifecycle, backup/restore and independent validation remain unqualified.']}
(out/'QUALIFICATION.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2),flush=True)
raise SystemExit(0 if passed else 1)
