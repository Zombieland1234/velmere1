#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,os,platform,subprocess,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
PARENT=Path('/mnt/data/velmere_p86_work/base')
OUT=ROOT/'receipts/p86/P86_P85_COMPATIBILITY.json'
LOG=ROOT/'artifacts/p86/logs/P85_OWNER_VISIBLE_RUNTIME_CURRENT_P86.log'
FROZEN=[
 'lib/reporting/account-customer-artifact-owner-visible-read.ts',
 'lib/reporting/audit-exact-artifact-owner-readable-publisher.ts',
 'supabase/migrations/20260820000001_p83_audit_exact_artifact_atomic_publication.sql',
 'supabase/migrations/20260820000002_p84_audit_customer_artifact_owner_read_path.sql',
 'supabase/migrations/20260820000003_p85_audit_customer_artifact_publication_visibility_rls.sql',
]
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
checks=[]
def add(i,ok,detail=None): checks.append({'id':i,'status':'PASS' if ok else 'FAIL',**({} if detail is None else {'detail':detail})})
for rel in FROZEN:
 a=PARENT/rel; b=ROOT/rel; add('p86_frozen_'+rel.replace('/','_').replace('.','_'),a.is_file() and b.is_file() and a.read_bytes()==b.read_bytes(),{'parentSha256':sha(a),'currentSha256':sha(b)})
# Execute the frozen P85 runtime against current source, then restore its historical receipt.
target=ROOT/'receipts/p85/P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_RUNTIME.json'; original=target.read_bytes()
try:
 p=subprocess.run(['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','scripts/p85/test-p85-owner-visible-artifact-runtime.mjs'],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 LOG.parent.mkdir(parents=True,exist_ok=True); LOG.write_bytes(p.stdout+(b'\n--- STDERR ---\n'+p.stderr if p.stderr else b''))
 runtime=json.loads(target.read_text()) if p.returncode==0 else {}
 add('p86_p85_runtime_executes_on_current_source',p.returncode==0,p.stderr.decode(errors='replace'))
 add('p86_p85_runtime_45_of_45',runtime.get('checks',{}).get('passed')==45 and runtime.get('checks',{}).get('total')==45,runtime.get('checks'))
finally:
 target.write_bytes(original)
add('p86_p85_historical_receipt_restored',target.read_bytes()==original,sha(target))
# New gate is insert-only and does not alter P85 read RPC or publication links.
m=(ROOT/'supabase/migrations/20260820000004_p86_customer_artifact_exact_pdf_new_write_gate.sql').read_text()
add('p86_gate_insert_only','before insert on public.velmere_customer_artifact_snapshots' in m and not __import__('re').search(r'\b(?:update|delete)\s+public\.velmere_customer_artifact_snapshots\b',m,__import__('re').I))
add('p86_p85_rpc_names_preserved','velmere_list_owner_visible_customer_artifacts_v1' in (ROOT/FROZEN[0]).read_text() and 'velmere_get_owner_visible_customer_artifact_v1' in (ROOT/FROZEN[0]).read_text())
status='PASS' if all(x['status']=='PASS' for x in checks) else 'FAIL'
payload={'schemaVersion':'velmere.p86.p85-compatibility.v1','generatedAt':'2026-08-20T04:00:00Z','status':status,'runtime':{'python':platform.python_version(),'node':subprocess.check_output(['node','--version'],cwd=ROOT,text=True).strip()},'frozenFiles':FROZEN,'checks':{'total':len(checks),'passed':sum(x['status']=='PASS' for x in checks),'failed':sum(x['status']=='FAIL' for x in checks),'rows':checks},'historicalReceiptRestored':True,'truthBoundary':'P85 owner-visible/JWT-bound source semantics and P83/P84 publication migrations remain byte-identical. P86 only prevents new legacy PDF obligations and removes rerender delivery. PostgreSQL/deployed runtime remains WITHHELD.'}
OUT.write_text(json.dumps(payload,indent=2)+'\n'); print(json.dumps(payload,indent=2)); raise SystemExit(0 if status=='PASS' else 1)
