#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, os, subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
NODE=['node','--import','./scripts/pass11/register-offline-ts-loader.mjs']
SPECS=[
 {'id':'canonical_resolution_runtime','command':NODE+['scripts/p93/test-p93-risk-history-canonical-resolution-runtime.mjs'],'receipt':'receipts/p93/P93_RISK_HISTORY_CANONICAL_RESOLUTION_RUNTIME.json'},
 {'id':'durable_canonical_compatibility','command':NODE+['scripts/p93/test-p93-risk-history-durable-canonical-compatibility-runtime.mjs'],'receipt':'receipts/p93/P93_RISK_HISTORY_DURABLE_CANONICAL_COMPATIBILITY_RUNTIME.json'},
 {'id':'canonical_resolution_static','command':['python3','scripts/p93/test-p93-risk-history-canonical-resolution-static.py'],'receipt':'receipts/p93/P93_RISK_HISTORY_CANONICAL_RESOLUTION_STATIC.json'},
 {'id':'cross_product_propagation_static','command':['python3','scripts/p93/test-p93-cross-product-risk-history-propagation-static.py'],'receipt':'receipts/p93/P93_CROSS_PRODUCT_RISK_HISTORY_PROPAGATION_STATIC.json'},
 {'id':'changed_module_reachability','command':NODE+['scripts/p93/test-p93-changed-module-reachability.mjs'],'receipt':'receipts/p93/P93_CHANGED_MODULE_REACHABILITY.json'},
 {'id':'targeted_typescript','command':['python3','scripts/p93/test-p93-targeted-typescript.py'],'receipt':'receipts/p93/P93_TARGETED_STRICT_TYPESCRIPT.json'},
]
def sha(data): return hashlib.sha256(data).hexdigest()
env=dict(os.environ); env.setdefault('TERM','dumb')
rows=[]
for spec in SPECS:
    attempts=[]
    for iteration in (1,2):
        result=subprocess.run(spec['command'],cwd=ROOT,env=env,capture_output=True)
        receipt_path=ROOT/spec['receipt']; receipt_bytes=receipt_path.read_bytes() if receipt_path.exists() else b''
        log=ROOT/f"artifacts/p93/logs/repeatability/{spec['id']}_{iteration}.log"; log.parent.mkdir(parents=True,exist_ok=True)
        log.write_bytes(result.stdout+(b'\n--- STDERR ---\n'+result.stderr if result.stderr else b''))
        attempts.append({'iteration':iteration,'returnCode':result.returncode,'stdoutSha256':sha(result.stdout),'stderrSha256':sha(result.stderr),'receiptSha256':sha(receipt_bytes),'log':log.relative_to(ROOT).as_posix(),'logSha256':sha(log.read_bytes())})
    equal=all(attempts[0][key]==attempts[1][key] for key in ['returnCode','stdoutSha256','stderrSha256','receiptSha256'])
    passed=equal and attempts[0]['returnCode']==0
    rows.append({'id':spec['id'],'status':'PASS' if passed else 'FAIL','byteIdentical':equal,'attempts':attempts})
checks=[]
for row in rows:
    checks += [
      {'id':f"{row['id']}_return_code",'status':row['status']},
      {'id':f"{row['id']}_stdout_identical",'status':'PASS' if row['byteIdentical'] else 'FAIL'},
      {'id':f"{row['id']}_stderr_identical",'status':'PASS' if row['byteIdentical'] else 'FAIL'},
      {'id':f"{row['id']}_receipt_identical",'status':'PASS' if row['byteIdentical'] else 'FAIL'},
    ]
failed=[c for c in checks if c['status']!='PASS']
receipt={
 'schemaVersion':'velmere.p93.runtime-repeatability.v1','generatedAt':'2026-08-20T12:00:00.000Z',
 'status':'PASS_BOUNDED_2_OF_2_BYTE_IDENTICAL' if not failed else 'FAIL',
 'checks':{'total':len(checks),'passed':len(checks)-len(failed),'failed':len(failed),'rows':checks},'executions':rows,
 'zeroFakeCredit':{'browserRendered':False,'postgresqlExecuted':False,'deployedRouteExecuted':False,'wholeProjectBuild':False,'customerFinal':'0/20'},
 'truthBoundary':'Two local executions of each P93 bounded harness produced identical return codes, stdout, stderr and receipt bytes. This does not convert no-socket, static or closed-ambient TypeScript proof into Browser, PostgreSQL, staging, build or Customer FINAL evidence.'
}
for rel in ['receipts/p93/P93_RUNTIME_REPEATABILITY.json','artifacts/p93/P93_RUNTIME_REPEATABILITY.json']:
    target=ROOT/rel; target.parent.mkdir(parents=True,exist_ok=True); target.write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'status':receipt['status'],'checks':receipt['checks'],'executions':rows},indent=2))
raise SystemExit(0 if not failed else 1)
