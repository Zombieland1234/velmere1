#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, os, subprocess, time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
STATE=ROOT/'artifacts/p87/P87_REGRESSION_CHUNK_STATE.json'
LOGDIR=ROOT/'artifacts/p87/logs/regression-chunk'
LOGDIR.mkdir(parents=True,exist_ok=True)

COMMANDS=[
 ('P87_RUNTIME',['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','scripts/p87/test-p87-real-markets-exact-pdf-runtime.mjs'],{}),
 ('P87_REPEATABILITY',['python3','scripts/p87/verify-p87-runtime-repeatability.py'],{}),
 ('P87_STATIC',['python3','scripts/p87/test-p87-real-markets-exact-pdf-static.py'],{}),
 ('P87_IMPORTS',['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','scripts/p87/test-p87-changed-module-imports.mjs'],{}),
 ('P87_TARGETED_TYPESCRIPT',['tsc','--pretty','false','--noEmit','--target','ES2022','--lib','ES2022,DOM','--module','ESNext','--moduleResolution','Bundler','--skipLibCheck','--strict','--noResolve','scripts/p87/p87-targeted-types.d.ts','lib/market-integrity/customer-report-exact-pdf-token.ts'],{'TERM':'xterm'}),
 ('P87_P86_COMPATIBILITY',['python3','scripts/p87/verify-p87-p86-compatibility.py'],{}),
 ('P86_REPEATABILITY',['python3','scripts/p86/verify-p86-runtime-repeatability.py'],{}),
 ('P86_P85_COMPATIBILITY',['python3','scripts/p86/verify-p86-p85-compatibility.py'],{}),
 ('P86_IMPORTS',['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','scripts/p86/test-p86-changed-module-imports.mjs'],{}),
 ('P86_TARGETED_TYPESCRIPT',['tsc','--pretty','false','--noEmit','--target','ES2022','--lib','ES2022,DOM','--module','ESNext','--moduleResolution','Bundler','--skipLibCheck','--strict','--noResolve','scripts/p86/p86-targeted-types.d.ts','lib/reporting/customer-artifact-pdf-availability.ts'],{'TERM':'xterm'}),
 ('P84_OWNER_READ_RUNTIME',['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','scripts/p84/test-p84-audit-customer-artifact-owner-read-runtime.mjs'],{}),
 ('P84_OWNER_READ_REPEATABILITY',['python3','scripts/p84/verify-p84-runtime-repeatability.py'],{}),
 ('P84_P83_ATOMIC_COMPATIBILITY',['python3','scripts/p84/verify-p84-p83-atomic-publication-compatibility.py'],{}),
 ('P82_QUORUM_RUNTIME',['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','scripts/p82/test-p82-successful-quorum-integrity-runtime.mjs'],{}),
 ('P82_QUORUM_STATIC',['python3','scripts/p82/test-p82-successful-quorum-integrity-static.py'],{}),
 ('P80_IMMUTABLE_AUDIT_RUNTIME',['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','scripts/p80/test-p80-audit-exact-immutable-artifact-runtime.mjs'],{}),
 ('P79_HISTORICAL_RUNTIME',['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','scripts/p79/test-p79-historical-deployment-customer-path-runtime.mjs'],{}),
 ('P79_CUSTOMER_PATH_STATIC',['python3','scripts/p79/test-p79-customer-path-static.py'],{}),
 ('P78_PRIVATE_PROVIDER_RUNTIME',['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','scripts/p78/test-p78-private-provider-evidence-runtime.mjs'],{}),
 ('P78_STANDARD_JSON_RUNTIME',['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','scripts/p78/test-p78-standard-json-customer-path-runtime.mjs'],{}),
 ('P78_THIRDWEB_RUNTIME',['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','scripts/p78/test-p78-thirdweb-micro-corpus-runtime.mjs'],{}),
 ('P78_DATAFLOW_STATIC',['python3','scripts/p78/test-p78-static.py'],{}),
 ('P78R3_CUSTOMER_PATH_STATIC',['python3','scripts/p78/test-p78r3-customer-path-static.py'],{}),
 ('P75_ADVANCED_AUTOMATION_RUNTIME',['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','scripts/p75/test-p75-advanced-automation-runtime.mjs'],{}),
 ('P77_DETERMINISTIC_DELIVERY_STATIC',['python3','scripts/p81/test-p77-deterministic-delivery-current-static.py','--source-root',str(ROOT),'--receipt',str(ROOT/'receipts/p87/P87_P77_DETERMINISTIC_DELIVERY_CURRENT_STATIC_REGRESSION.json')],{}),
 ('EXACT_PDF_UNIT',['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','--test','tests/security/a102-exact-customer-pdf-delivery.test.ts'],{}),
 ('ACCOUNT_ARTIFACT_PARITY_STATIC',['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','tests/security/a102-account-artifact-preview-download-parity.test.ts'],{}),
]

def digest(data:bytes)->str: return hashlib.sha256(data).hexdigest()

def load_state():
 if not STATE.is_file(): return {'schemaVersion':'velmere.p87.regression-chunk-state.v1','commandCount':len(COMMANDS),'results':[]}
 return json.loads(STATE.read_text())

def save_state(state): STATE.parent.mkdir(parents=True,exist_ok=True); STATE.write_text(json.dumps(state,indent=2)+'\n')

parser=argparse.ArgumentParser(); parser.add_argument('--start',type=int,required=True); parser.add_argument('--end',type=int,required=True); parser.add_argument('--reset',action='store_true'); args=parser.parse_args()
if args.reset and STATE.exists(): STATE.unlink()
if not (0<=args.start<=args.end<=len(COMMANDS)): raise SystemExit('invalid range')
state=load_state(); by_index={r['index']:r for r in state['results']}
for index in range(args.start,args.end):
 name,cmd,env_delta=COMMANDS[index]
 if index in by_index and by_index[index].get('returnCode')==0:
  print(f'SKIP already PASS {index:02d} {name}')
  continue
 env=dict(os.environ); env.update(env_delta)
 started=time.monotonic(); p=subprocess.run(cmd,cwd=ROOT,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE); elapsed=round(time.monotonic()-started,3)
 log=LOGDIR/f'{index:02d}_{name}.log'; combined=p.stdout+(b'\n--- STDERR ---\n'+p.stderr if p.stderr else b''); log.write_bytes(combined)
 row={'index':index,'name':name,'command':cmd,'returnCode':p.returncode,'elapsedSeconds':elapsed,'stdoutBytes':len(p.stdout),'stdoutSha256':digest(p.stdout),'stderrBytes':len(p.stderr),'stderrSha256':digest(p.stderr),'log':str(log.relative_to(ROOT)),'logSha256':digest(combined)}
 by_index[index]=row; state['results']=[by_index[i] for i in sorted(by_index)]; save_state(state)
 print(json.dumps({'index':index,'name':name,'returnCode':p.returncode,'elapsedSeconds':elapsed},separators=(',',':')))
 if p.returncode!=0: raise SystemExit(p.returncode)
print(json.dumps({'status':'PASS_CHUNK','start':args.start,'end':args.end,'completed':len(state['results']),'total':len(COMMANDS)},indent=2))
