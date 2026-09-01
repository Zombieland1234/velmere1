#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SNAP=ROOT/'artifacts/p92/snapshots/current-regression'
LOG=ROOT/'artifacts/p92/logs/regression/current-byte'

def sha(path:Path)->str:return hashlib.sha256(path.read_bytes()).hexdigest()
def load(name:str):
 p=SNAP/name;return p,json.loads(p.read_text())
def check_receipt(name:str,checks:int,*,total:bool=True,aggregate:bool=False,imports:bool=False):
 p,d=load(name);status=str(d.get('status',''));ok=status.startswith('PASS')
 if total:ok=ok and d.get('checks',{}).get('total')==checks
 if aggregate:ok=ok and d.get('aggregateExecutedChecksAcrossOverlappingHarnesses')==checks
 if imports:ok=ok and d.get('executableImports',{}).get('total')==5 and d.get('staticDependencyBoundaryChecks')==1
 return ok,{'snapshot':p.relative_to(ROOT).as_posix(),'snapshotSha256':sha(p),'sourceStatus':status}
rows=[]
def add(id,checks,ok,detail):
 rows.append({'id':id,'status':'PASS' if ok else 'FAIL','checks':checks,**detail})
# P91 current backend receipts.
for ident,name,count,opts in [
 ('P91_CONTRACT','P91_RISK_HISTORY_CONTRACT_RUNTIME.json',38,{}),
 ('P91_LEDGER','P91_RISK_HISTORY_LEDGER_RUNTIME.json',24,{}),
 ('P91_STATIC','P91_RISK_HISTORY_STATIC.json',100,{}),
 ('P91_TYPESCRIPT','P91_TARGETED_STRICT_TYPESCRIPT.json',2,{}),
 ('P91_IMPORTS','P91_CHANGED_MODULE_IMPORTS.json',6,{'total':False,'imports':True}),
 ('P91_REPEATABILITY','P91_RUNTIME_REPEATABILITY.json',10,{}),
]:
 ok,detail=check_receipt(name,count,**opts);add(ident,count,ok,detail)
# P90 fast core receipts.
for ident,name,count in [
 ('P90_RIGHTS','P90_AUDIT_PROVIDER_RIGHTS_CURRENTNESS_RUNTIME.json',35),
 ('P90_SOURCIFY','P90_SOURCIFY_MINIMAL_PARSER_RUNTIME.json',46),
 ('P90_STATIC','P90_AUDIT_COMMERCIAL_PATH_STATIC.json',37),
 ('P90_PDF','P90_AUDIT_PDF_RIGHTS_CURRENTNESS_RUNTIME.json',18),
 ('P90_TYPESCRIPT','P90_TARGETED_STRICT_TYPESCRIPT.json',2),
 ('P90_BLOCKED_PROJECTION','P90_AUDIT_BLOCKED_CUSTOMER_PROJECTION_RUNTIME.json',11),
 ('P90_BLOCKED_PAYLOAD','P90_AUDIT_BLOCKED_CUSTOMER_PAYLOAD_RUNTIME.json',39),
 ('P90_REPEATABILITY','P90_RUNTIME_REPEATABILITY.json',23),
]:
 ok,detail=check_receipt(name,count);add(ident,count,ok,detail)
# P90 imports are stdout-marker based.
p90_import_log=LOG/'10_P90_IMPORTS.log'; text=p90_import_log.read_text('utf-8',errors='replace')
add('P90_IMPORTS',13,'P90 changed production module imports: PASS (13/13)' in text,{'log':p90_import_log.relative_to(ROOT).as_posix(),'logSha256':sha(p90_import_log)})
# Segment B snapshot and copied exact individual logs.
p,d=load('P90_CURRENT_REGRESSION_SEGMENT_B.json');seg_ok=d.get('status')=='PASS' and d.get('commandsPassed')==15 and d.get('commandsExpected')==15 and d.get('aggregateExecutedChecksAcrossOverlappingHarnesses')==910
segdir=LOG/'segment-b-individual'; seglogs=sorted(segdir.glob('*.log'));seg_ok=seg_ok and len(seglogs)==15
add('P90_SEGMENT_B',910,seg_ok,{'snapshot':p.relative_to(ROOT).as_posix(),'snapshotSha256':sha(p),'copiedIndividualLogs':len(seglogs),'copiedLogAggregateSha256':hashlib.sha256('\n'.join(f'{x.name}:{sha(x)}' for x in seglogs).encode()).hexdigest()})
# Cross-workstream is reconstructed from seven current closed logs because the historical wrapper hung after command five.
cross_specs=[
 ('01_P87_REAL_MARKETS_RUNTIME.log',43,[r'"total": 43',r'"failed": 0']),
 ('02_P87_REPEATABILITY.log',5,[r'"status": "PASS"']),
 ('03_P87_IMPORTS.log',3,[r'PASS \(3/3\)']),
 ('04_P86_REPEATABILITY.log',5,[r'"status": "PASS"']),
 ('05_P86_IMPORTS.log',3,[r'PASS \(3/3\)']),
 ('06_P86_EXACT_PDF_RUNTIME.log',61,[r'"total": 61',r'"failed": 0']),
 ('07_P84_OWNER_READ_RUNTIME.log',59,[r'"total": 59',r'"failed": 0']),
]
cross_rows=[];cross_ok=True
for name,count,patterns in cross_specs:
 path=LOG/'cross-individual'/name;text=path.read_text('utf-8',errors='replace') if path.exists() else ''
 matched=all(re.search(pat,text) for pat in patterns);cross_ok=cross_ok and path.exists() and matched
 cross_rows.append({'log':path.relative_to(ROOT).as_posix(),'checks':count,'markersMatched':bool(matched),'sha256':sha(path) if path.exists() else None})
add('P90_CROSS_WORKSTREAM',179,cross_ok,{'commands':'7/7 reconstructed from closed current logs','rows':cross_rows})
# P92 risk domain.
p,d=load('P92_RISK_DOMAIN_REGRESSION.json');risk_ok=d.get('status')=='PASS_BOUNDED_WITH_EXPLICIT_ENVIRONMENT_WITHHELDS' and d.get('aggregateExecutedChecksAcrossOverlappingHarnesses')==8 and d.get('commands',{}).get('withheld')==2
add('P92_RISK_DOMAIN',8,risk_ok,{'snapshot':p.relative_to(ROOT).as_posix(),'snapshotSha256':sha(p),'explicitWithholds':2})
failed=[x for x in rows if x['status']!='PASS']
receipt={
 'schemaVersion':'velmere.p92.current-byte-regression.v1','generatedAt':'2026-08-20T20:50:00.000Z',
 'status':'PASS_BOUNDED_CURRENT_BYTE_REGRESSION' if not failed else 'FAIL',
 'commands':{'logicalRows':len(rows),'passed':len(rows)-len(failed),'failed':len(failed)},
 'aggregateExecutedChecksAcrossOverlappingHarnesses':sum(x['checks'] for x in rows if x['status']=='PASS'),
 'rows':rows,
 'orchestration':{
   'initialP91MonolithicRunner':'TIMEOUT_AFTER_9_OF_11_ZERO_CREDIT',
   'initialP92Aggregator':'DESCRIPTOR_HANG_AFTER_COMPLETE_P90_REPEATABILITY_ZERO_CREDIT',
   'crossWrapperSecondAttempt':'TIMEOUT_AFTER_5_OF_7_ZERO_CREDIT',
   'finalMethod':'CLOSED_CURRENT_LOGS_PLUS_IMMUTABLE_P92_SNAPSHOTS',
 },
 'zeroFakeCredit':{'countsOverlap':True,'independentEvidenceCount':False,'withheldCommandsCredited':False,'browserRendered':False,'deployedRoute':False,'customerFinal':'0/20'},
 'truthBoundary':'Fresh current-byte P91 backend, P90 stack and risk-domain replay on P92 source. Counts overlap. Historical receipts are copied only into P92 snapshots for this proof and the canonical P91 history is restored byte-for-byte afterward. Browser, staging, provider, whole-project build, exact Windows and Customer FINAL remain WITHHELD.'
}
for target in [ROOT/'receipts/p92/P92_CURRENT_BYTE_REGRESSION.json',ROOT/'artifacts/p92/P92_CURRENT_BYTE_REGRESSION.json']:
 target.parent.mkdir(parents=True,exist_ok=True);target.write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'status':receipt['status'],'commands':receipt['commands'],'checks':receipt['aggregateExecutedChecksAcrossOverlappingHarnesses']},indent=2))
raise SystemExit(0 if not failed else 1)
