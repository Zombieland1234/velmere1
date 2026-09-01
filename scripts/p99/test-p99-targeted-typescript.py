#!/usr/bin/env python3
from pathlib import Path
import subprocess,json,hashlib
root=Path(__file__).resolve().parents[2]
cmd=['tsc','-p','tsconfig.p99-real-markets-basic-targeted.json']
r=subprocess.run(cmd,cwd=root,text=True,capture_output=True)
rows=[{'id':'real_markets_basic_field_policy_strict_typescript','status':'PASS' if r.returncode==0 else 'FAIL','exitCode':r.returncode,'stdout':r.stdout,'stderr':r.stderr}]
receipt={'schemaVersion':'velmere.p99.targeted-strict-typescript.v1','generatedAt':'2026-08-21T14:25:00.000Z','status':'PASS_BOUNDED' if r.returncode==0 else 'FAIL','checks':{'total':1,'passed':1 if r.returncode==0 else 0,'failed':0 if r.returncode==0 else 1,'rows':rows},'compiler':'global TypeScript 5.8.3','scope':['lib/market-integrity/real-markets-basic-field-policy.ts','lib/security/canonical-json.ts','lib/security/cryptographic-digest.ts','lib/compliance/provider-delivery-rights-gate.d.mts'],'truthBoundary':'Strict TypeScript for the exact new P99 policy boundary only. No market-row gate, customer route, whole-project, dependency closure, build, exact Windows or FINAL credit.'}
out=root/'receipts/p99/P99_TARGETED_STRICT_TYPESCRIPT.json';out.write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'status':receipt['status'],'checks':receipt['checks']['total']},indent=2))
if r.returncode: raise SystemExit(r.returncode)
