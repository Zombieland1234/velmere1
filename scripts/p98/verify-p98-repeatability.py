#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
commands=[
 ('runtime',['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','./scripts/p98/test-p98-paid-tier-exact-delivery-runtime.mjs'],'receipts/p98/P98_PAID_TIER_EXACT_DELIVERY_RUNTIME.json'),
 ('static',['python','./scripts/p98/test-p98-paid-tier-exact-delivery-static.py'],'receipts/p98/P98_PAID_TIER_EXACT_DELIVERY_STATIC.json'),
 ('typescript',['python','./scripts/p98/test-p98-targeted-typescript.py'],'receipts/p98/P98_TARGETED_STRICT_TYPESCRIPT.json'),
 ('reachability',['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','./scripts/p98/test-p98-changed-module-reachability.mjs'],'receipts/p98/P98_CHANGED_MODULE_REACHABILITY.json'),
]
rows=[]
for name,cmd,rel in commands:
 hashes=[]; outs=[]; codes=[]
 for n in range(2):
  proc=subprocess.run(cmd,cwd=ROOT,text=True,capture_output=True)
  codes.append(proc.returncode);outs.append((proc.stdout+proc.stderr)[-2000:])
  p=ROOT/rel
  hashes.append(hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else None)
 ok=codes==[0,0] and hashes[0] is not None and hashes[0]==hashes[1]
 rows.append({'id':name,'status':'PASS' if ok else 'FAIL','exitCodes':codes,'receiptSha256Runs':['sha256:'+x if x else None for x in hashes],'byteIdentical':hashes[0]==hashes[1] if hashes[0] else False,'diagnostic':None if ok else outs})
failed=[r for r in rows if r['status']!='PASS']
receipt={'schemaVersion':'velmere.p98.runtime-repeatability.v1','generatedAt':'2026-08-21T12:00:00.000Z','status':'PASS_BOUNDED_2_OF_2_BYTE_IDENTICAL' if not failed else 'FAIL','checks':{'total':len(rows),'passed':len(rows)-len(failed),'failed':len(failed),'rows':rows},'truthBoundary':'Two clean executions and byte-identical receipts for four bounded P98 proof commands. This does not prove production determinism, route execution, providers, database, builds, exact Windows or Customer FINAL.'}
raw=json.dumps(receipt,indent=2)+'\n'
for rel in ['receipts/p98/P98_RUNTIME_REPEATABILITY.json','artifacts/p98/P98_RUNTIME_REPEATABILITY.json']:
 p=ROOT/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(raw)
print(json.dumps(receipt))
raise SystemExit(1 if failed else 0)
