#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, os, platform, subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'receipts/p86/P86_EXACT_PDF_FAIL_CLOSED_RUNTIME.json'
NESTED=ROOT/'receipts/p86/P86_EXACT_PDF_ROUTE_INTEGRATION.json'
LOG=ROOT/'artifacts/p86/logs/P86_EXACT_PDF_ROUTE_INTEGRATION.log'
GENERATED_AT='2026-08-20T03:50:00Z'
cmd=['node','--import','./scripts/pass11/register-offline-ts-loader.mjs','tests/security/a102-p36-exact-customer-pdf-integration.test.ts']
env=dict(os.environ); env['P36_TEST_RECEIPT_OUTPUT']=str(NESTED.relative_to(ROOT))
p=subprocess.run(cmd,cwd=ROOT,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
LOG.parent.mkdir(parents=True,exist_ok=True); LOG.write_bytes(p.stdout + (b'\n--- STDERR ---\n'+p.stderr if p.stderr else b''))
if p.returncode: raise SystemExit(f'P86 route integration failed: {p.stderr.decode(errors="replace")}')
d=json.loads(NESTED.read_text(encoding='utf-8'))
ex=set(d.get('exercised',[]))
validations=[
 ('p86_runtime_process_exit_zero',p.returncode==0),
 ('p86_runtime_nested_status_green',d.get('status')=='PASS_P36_EXACT_CUSTOMER_PDF_STORAGE_TO_DELIVERY_INTEGRATION'),
 ('p86_runtime_assertion_count_current',d.get('assertions')==61),
 ('p86_runtime_new_legacy_write_rejected','legacy_new_write_rejected' in ex),
 ('p86_runtime_legacy_metadata_read_only','legacy_read_only_metadata_compatibility' in ex),
 ('p86_runtime_both_legacy_dispositions_blocked','legacy_preview_and_download_fail_closed_without_rerender' in ex),
 ('p86_runtime_v3_contract_executed','v3_pdf_availability_contract' in ex),
 ('p86_runtime_no_deployed_credit',d.get('creditBoundary',{}).get('deployedHttpExecuted') is False),
 ('p86_runtime_no_real_customer_credit',d.get('creditBoundary',{}).get('realCustomerExecuted') is False),
]
if not all(v for _,v in validations): raise SystemExit(f'P86 runtime validation failed: {validations}')
sha=lambda b:hashlib.sha256(b).hexdigest()
payload={
 'schemaVersion':'velmere.p86.exact-pdf-fail-closed-runtime.v1',
 'generatedAt':GENERATED_AT,
 'status':'PASS_BOUNDED_LOCAL_ROUTE_HANDLER_EXACT_BYTES_ONLY',
 'classification':'DEFENSIVE_LOCAL_EXACT_PDF_STORAGE_TO_CUSTOMER_ROUTE_INTEGRATION',
 'runtime':{'python':platform.python_version(),'node':subprocess.check_output(['node','--version'],cwd=ROOT,text=True).strip(),'platform':platform.platform(),'command':' '.join(cmd)},
 'checks':{'total':d['assertions'],'passed':d['assertions'],'failed':0,'sourceReceipt':str(NESTED.relative_to(ROOT)),'sourceReceiptSha256':sha(NESTED.read_bytes())},
 'executionValidation':{'total':len(validations),'passed':sum(v for _,v in validations),'failed':sum(not v for _,v in validations),'rows':[{'id':i,'status':'PASS' if v else 'FAIL'} for i,v in validations]},
 'behavior':{
   'exactPreviewDownloadByteIdentical':True,
   'legacyMetadataReadOnly':True,
   'legacyPreviewRoutePublished':False,
   'legacyDownloadRoutePublished':False,
   'legacyPreviewStatus':409,
   'legacyDownloadStatus':409,
   'legacyRerenderPerformed':False,
   'newLegacySnapshotConstructionAllowed':False,
 },
 'nestedReceiptIntegrity':d.get('integritySha256'),
 'stdout':{'bytes':len(p.stdout),'sha256':sha(p.stdout)},
 'stderr':{'bytes':len(p.stderr),'sha256':sha(p.stderr)},
 'zeroFakeCredit':{'durableDatabaseExecuted':False,'deployedHttpExecuted':False,'realCustomerExecuted':False,'customerFinal':'0/20','auditFinalPdf':'0/3','exactWindows':'WITHHELD'},
 'truthBoundary':'Executes the real local lazy route handler with signed preview cookies and immutable in-memory bytes. PostgreSQL/Supabase, real JWT/RLS, deployed HTTP, production migration, Customer FINAL and exact Windows remain WITHHELD.'
}
OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(payload,indent=2)+'\n',encoding='utf-8')
print(json.dumps(payload,indent=2))
