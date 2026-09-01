#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SPECS=[
 ('P90_RIGHTS_CURRENTNESS',35,'receipts/p90/P90_AUDIT_PROVIDER_RIGHTS_CURRENTNESS_RUNTIME.json','checks',35,'artifacts/p91/logs/regression/current/01_P90_RIGHTS_CURRENTNESS.log'),
 ('P90_SOURCIFY',46,'receipts/p90/P90_SOURCIFY_MINIMAL_PARSER_RUNTIME.json','checks',46,'artifacts/p91/logs/regression/current/02_P90_SOURCIFY.log'),
 ('P90_COMMERCIAL_STATIC',37,'receipts/p90/P90_AUDIT_COMMERCIAL_PATH_STATIC.json','checks',37,'artifacts/p91/logs/regression/current/03_P90_COMMERCIAL_STATIC.log'),
 ('P90_IMPORTS',13,None,'marker','P90 changed production module imports: PASS (13/13)','artifacts/p91/logs/regression/current/04_P90_IMPORTS.log'),
 ('P90_PDF_RIGHTS',18,'receipts/p90/P90_AUDIT_PDF_RIGHTS_CURRENTNESS_RUNTIME.json','checks',18,'artifacts/p91/logs/regression/current/05_P90_PDF_RIGHTS.log'),
 ('P90_TARGETED_TYPESCRIPT',2,'receipts/p90/P90_TARGETED_STRICT_TYPESCRIPT.json','checks',2,'artifacts/p91/logs/regression/current/06_P90_TARGETED_TYPESCRIPT.log'),
 ('P90_BLOCKED_PROJECTION',11,'receipts/p90/P90_AUDIT_BLOCKED_CUSTOMER_PROJECTION_RUNTIME.json','checks',11,'artifacts/p91/logs/regression/current/07_P90_BLOCKED_PROJECTION.log'),
 ('P90_BLOCKED_PAYLOAD',39,'receipts/p90/P90_AUDIT_BLOCKED_CUSTOMER_PAYLOAD_RUNTIME.json','checks',39,'artifacts/p91/logs/regression/current/08_P90_BLOCKED_PAYLOAD.log'),
 ('P90_REPEATABILITY',23,'receipts/p90/P90_RUNTIME_REPEATABILITY.json','checks',23,'artifacts/p91/logs/regression/current/09_P90_REPEATABILITY.log'),
 ('P90_SEGMENT_B',910,'receipts/p90/P90_CURRENT_REGRESSION_SEGMENT_B.json','aggregate',910,'artifacts/p91/logs/regression/current/10_P90_SEGMENT_B_DIRECT.log'),
 ('P90_CROSS_WORKSTREAM',179,'receipts/p90/P90_CROSS_WORKSTREAM_REGRESSION.json','aggregate',179,'artifacts/p91/logs/regression/current/11_P90_CROSS_WORKSTREAM_DIRECT.log'),
]
def sha(path:Path):return hashlib.sha256(path.read_bytes()).hexdigest()
rows=[]
for ident,count,receipt_rel,mode,expected,log_rel in SPECS:
 log=ROOT/log_rel; ok=log.exists();detail={}
 if mode=='marker':
  text=log.read_text('utf-8',errors='replace') if ok else '';ok=ok and expected in text;detail={'marker':expected,'matched':expected in text}
 else:
  path=ROOT/receipt_rel
  try:
   data=json.loads(path.read_text());status=str(data.get('status',''));ok=ok and status.startswith('PASS')
   if mode=='checks':actual=data.get('checks',{}).get('total')
   else:actual=data.get('aggregateExecutedChecksAcrossOverlappingHarnesses')
   ok=ok and actual==expected;detail={'receipt':receipt_rel,'receiptStatus':status,'actual':actual,'expected':expected,'receiptSha256':sha(path)}
  except Exception as error:ok=False;detail={'error':str(error)}
 rows.append({'id':ident,'status':'PASS' if ok else 'FAIL','checks':count,'log':log_rel,'logSha256':sha(log) if log.exists() else None,**detail})
failed=[r for r in rows if r['status']!='PASS']
receipt={
 'schemaVersion':'velmere.p91.current-regression.v1','generatedAt':'2026-08-20T19:10:00.000Z',
 'status':'PASS_BOUNDED_CURRENT_REGRESSION' if not failed else 'FAIL',
 'commands':{'expected':len(rows),'passed':len(rows)-len(failed),'failed':len(failed)},
 'aggregateExecutedChecksAcrossOverlappingHarnesses':sum(r['checks'] for r in rows if r['status']=='PASS'),
 'rows':rows,
 'failureAdjudication':{'abortedCombinedRunner':'WITHHELD_NO_CREDIT','reason':'outer_process_limit_before_segment_B','segmentBAndCrossWorkstreamReexecutedSeparately':True},
 'truthBoundary':'Current P91 bytes replay the P90 core, segment-B and cross-workstream harnesses. Counts overlap and grant no provider, rights, database, staging, Customer FINAL, PDF FINAL, build or exact-Windows credit. Historical outputs are restored and independently checked against the canonical P90 parent after execution.'}
for target in [ROOT/'receipts/p91/P91_CURRENT_REGRESSION.json',ROOT/'artifacts/p91/P91_CURRENT_REGRESSION.json']:
 target.parent.mkdir(parents=True,exist_ok=True);target.write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'status':receipt['status'],'commands':receipt['commands'],'checks':receipt['aggregateExecutedChecksAcrossOverlappingHarnesses']},indent=2))
raise SystemExit(0 if not failed else 1)
