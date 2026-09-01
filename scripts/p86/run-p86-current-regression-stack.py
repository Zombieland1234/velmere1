#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,os,shutil,subprocess,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
PARENT=Path('/mnt/data/velmere_p86_work/base')
LOGDIR=ROOT/'artifacts/p86/logs'; OUT=ROOT/'receipts/p86/P86_REGRESSION_COMMAND_EXECUTION.json'
LOGDIR.mkdir(parents=True,exist_ok=True)
commands=[
 ('P84_OWNER_READ_RUNTIME',['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','scripts/p84/test-p84-audit-customer-artifact-owner-read-runtime.mjs']),
 ('P84_OWNER_READ_REPEATABILITY',['python3','scripts/p84/verify-p84-runtime-repeatability.py']),
 ('P84_P83_ATOMIC_COMPATIBILITY',['python3','scripts/p84/verify-p84-p83-atomic-publication-compatibility.py']),
 ('P82_QUORUM_RUNTIME',['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','scripts/p82/test-p82-successful-quorum-integrity-runtime.mjs']),
 ('P82_QUORUM_STATIC',['python3','scripts/p82/test-p82-successful-quorum-integrity-static.py']),
 ('P80_IMMUTABLE_AUDIT_RUNTIME',['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','scripts/p80/test-p80-audit-exact-immutable-artifact-runtime.mjs']),
 ('P79_HISTORICAL_RUNTIME',['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','scripts/p79/test-p79-historical-deployment-customer-path-runtime.mjs']),
 ('P79_CUSTOMER_PATH_STATIC',['python3','scripts/p79/test-p79-customer-path-static.py']),
 ('P78_PRIVATE_PROVIDER_RUNTIME',['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','scripts/p78/test-p78-private-provider-evidence-runtime.mjs']),
 ('P78_STANDARD_JSON_RUNTIME',['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','scripts/p78/test-p78-standard-json-customer-path-runtime.mjs']),
 ('P78_THIRDWEB_RUNTIME',['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','scripts/p78/test-p78-thirdweb-micro-corpus-runtime.mjs']),
 ('P78_DATAFLOW_STATIC',['python3','scripts/p78/test-p78-static.py']),
 ('P78R3_CUSTOMER_PATH_STATIC',['python3','scripts/p78/test-p78r3-customer-path-static.py']),
 ('P75_ADVANCED_AUTOMATION_RUNTIME',['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','scripts/p75/test-p75-advanced-automation-runtime.mjs']),
 ('P77_DETERMINISTIC_DELIVERY_STATIC',['python3','scripts/p81/test-p77-deterministic-delivery-current-static.py','--source-root',str(ROOT),'--receipt',str(ROOT/'receipts/p86/P86_P77_DETERMINISTIC_DELIVERY_CURRENT_STATIC_REGRESSION.json')]),
 ('EXACT_PDF_UNIT',['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','--test','tests/security/a102-exact-customer-pdf-delivery.test.ts']),
 ('ACCOUNT_ARTIFACT_PARITY_STATIC',['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','tests/security/a102-account-artifact-preview-download-parity.test.ts']),
]
results=[]
for name,cmd in commands:
 start=time.monotonic(); p=subprocess.run(cmd,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE); elapsed=round(time.monotonic()-start,3)
 log=LOGDIR/f'{name}.log'; log.write_bytes(p.stdout+(b'\n--- STDERR ---\n'+p.stderr if p.stderr else b''))
 results.append({'name':name,'command':cmd,'returnCode':p.returncode,'elapsedSeconds':elapsed,'log':str(log.relative_to(ROOT))})
 if p.returncode:
  break
# Restore every frozen historical receipt/closure file from exact P85 parent.
restored=[]
for base_rel in ('receipts','artifacts/closure'):
 base=PARENT/base_rel
 for src in base.rglob('*'):
  if not src.is_file(): continue
  rel=src.relative_to(PARENT); dst=ROOT/rel; dst.parent.mkdir(parents=True,exist_ok=True)
  if not dst.exists() or dst.read_bytes()!=src.read_bytes():
   shutil.copyfile(src,dst); restored.append(rel.as_posix())
for rel in ('artifacts/p80/P80_AUDIT_LOCAL_FIXTURE_NOT_CUSTOMER_FINAL.pdf','artifacts/p82/P82_LOCAL_READONLY_QUORUM_HARDENING_FIXTURE_RECEIPT.json'):
 src=PARENT/rel; dst=ROOT/rel
 if src.is_file() and (not dst.is_file() or dst.read_bytes()!=src.read_bytes()):
  dst.parent.mkdir(parents=True,exist_ok=True); shutil.copyfile(src,dst); restored.append(rel)
# Verify all parent historical bytes now exact.
h=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest(); mism=[]; verified=0
for base_rel in ('receipts','artifacts/closure'):
 for src in (PARENT/base_rel).rglob('*'):
  if not src.is_file(): continue
  verified+=1; dst=ROOT/src.relative_to(PARENT)
  if not dst.is_file() or src.stat().st_size!=dst.stat().st_size or h(src)!=h(dst): mism.append(src.relative_to(PARENT).as_posix())
status='PASS' if len(results)==len(commands) and all(r['returnCode']==0 for r in results) and not mism else 'FAIL'
payload={'schemaVersion':'velmere.p86.current-regression-command-execution.v1','generatedAt':'2026-08-20T04:15:00Z','status':status,'results':results,'historicalRestore':{'parentCheckpoint':'P85R1','restoredCount':len(restored),'restoredPaths':restored,'verifiedHistoricalFiles':verified,'mismatchCount':len(mism),'mismatches':mism},'rootStillExists':ROOT.is_dir(),'truthBoundary':'Physical current-source command execution on local Linux/Node. Historical receipt and closure artifacts are restored byte-for-byte from verified P85 after execution. This grants no PostgreSQL, deployed, customer FINAL or exact-Windows credit.'}
OUT.write_text(json.dumps(payload,indent=2)+'\n'); print(json.dumps(payload,indent=2)); raise SystemExit(0 if status=='PASS' else 1)
