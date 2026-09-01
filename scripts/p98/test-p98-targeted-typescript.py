#!/usr/bin/env python3
import hashlib, json, platform, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
config=ROOT/'tsconfig.p98-paid-tier-exact-targeted.json'
proc=subprocess.run(['tsc','-p',config.name,'--pretty','false'],cwd=ROOT,text=True,capture_output=True)
out=(proc.stdout+proc.stderr).replace(str(ROOT),'<ROOT>')
log=ROOT/'artifacts/p98/logs/P98_TARGETED_TYPESCRIPT.log';log.parent.mkdir(parents=True,exist_ok=True);log.write_text(out,encoding='utf-8')
receipt={
 'schemaVersion':'velmere.p98.targeted-strict-typescript.v1','generatedAt':'2026-08-21T12:00:00.000Z',
 'status':'PASS_BOUNDED_TARGETED_STRICT_TYPESCRIPT' if proc.returncode==0 else 'FAIL',
 'checks':{'total':4,'passed':4 if proc.returncode==0 else 0,'failed':0 if proc.returncode==0 else 4,
   'rows':[{'id':x,'status':'PASS' if proc.returncode==0 else 'FAIL'} for x in ['exact_delivery_policy','entitlement_access','tier_value','commercial_policy']]},
 'configSha256':'sha256:'+hashlib.sha256(config.read_bytes()).hexdigest(),'exitCode':proc.returncode,'diagnostic':out[:4000],
 'environment':{'typescript':subprocess.check_output(['tsc','--version'],text=True).strip(),'python':platform.python_version(),'platform':platform.platform()},
 'zeroFakeCredit':{'deliveryPolicyStrictTypeScript':False,'payloadStrictTypeScript':False,'routesStrictTypeScript':False,'wholeProjectSemanticTypeScript':False,'eslint':False,'webpack':False,'turbopack':False,'exactWindows':False,'customerFinal':'0/20'},
 'truthBoundary':'Strict TypeScript covers only four P98 core modules with bounded ambient declarations. All changed files are separately transpiled. This does not prove the complete dependency graph, routes, whole-project semantic TypeScript, lint, builds, exact Windows or Customer FINAL.'
}
raw=json.dumps(receipt,indent=2)+'\n'
for rel in ['receipts/p98/P98_TARGETED_STRICT_TYPESCRIPT.json','artifacts/p98/P98_TARGETED_STRICT_TYPESCRIPT.json']:
 p=ROOT/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(raw,encoding='utf-8')
print(json.dumps(receipt))
raise SystemExit(proc.returncode)
