#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
A_OUT=ROOT/'receipts/p89/P89_CURRENT_REGRESSION_SEGMENT_A_VERIFIED.json'
FINAL=ROOT/'receipts/p89/P89_CURRENT_SOURCE_SEGMENTED_REGRESSION.json'
FINAL_ART=ROOT/'artifacts/p89/P89_CURRENT_SOURCE_SEGMENTED_REGRESSION.json'

def sha(p:Path):return hashlib.sha256(p.read_bytes()).hexdigest()

def verify_log(name,path,checks,patterns):
 p=ROOT/path
 if not p.is_file():raise AssertionError(f'missing:{path}')
 text=p.read_text('utf-8',errors='replace')
 markers=[{'pattern':x,'matched':bool(re.search(x,text))} for x in patterns]
 if not all(x['matched'] for x in markers):raise AssertionError(f'marker:{name}:{markers}')
 return {'name':name,'checks':checks,'status':'PASS','evidencePath':path,'evidenceSha256':sha(p),'markers':markers}

segment_a_specs=[
 ('P89 provider dimensions runtime','artifacts/p89/logs/regression/current-stack/01_P89_PROVIDER_DIMENSIONS_RUNTIME.log',36,[r'"total": 36',r'"failed": 0']),
 ('P89 PDF dimensions runtime','artifacts/p89/logs/regression/current-stack/02_P89_PDF_DIMENSIONS_RUNTIME.log',32,[r'"total": 32',r'"failed": 0']),
 ('P89 provider dimensions static','artifacts/p89/logs/regression/current-stack/03_P89_PROVIDER_DIMENSIONS_STATIC.log',81,[r'"passed": 81',r'"total": 81']),
 ('P89 runtime repeatability','artifacts/p89/logs/regression/current-stack/04_P89_RUNTIME_REPEATABILITY.log',11,[r'"passed": 11',r'"total": 11']),
 ('P89 changed imports','artifacts/p89/logs/regression/current-stack/05_P89_CHANGED_IMPORTS.log',12,[r'PASS \(12/12\)']),
 ('P89 targeted strict TypeScript','artifacts/p89/logs/regression/04_P89_TARGETED_TYPESCRIPT.log',1,[r'PASS targeted strict TypeScript P89 \(1/1\)']),
 ('P89/P88 compatibility and history','artifacts/p89/logs/regression/current-stack/07_P89_P88_COMPATIBILITY.log',40,[r'"passed": 40',r'"total": 40']),
 ('P87 Real Markets runtime','artifacts/p89/logs/regression/current-stack/08_P87_REAL_MARKETS_RUNTIME.log',43,[r'"total": 43',r'"failed": 0']),
 ('P87 runtime repeatability','artifacts/p89/logs/regression/current-stack/09_P87_RUNTIME_REPEATABILITY.log',5,[r'"status": "PASS"',r'"total": 5']),
 ('P87 imports','artifacts/p89/logs/regression/current-stack/10_P87_IMPORTS.log',3,[r'PASS \(3/3\)']),
 ('P86 repeatability','artifacts/p89/logs/regression/current-stack/11_P86_REPEATABILITY.log',5,[r'"status": "PASS"',r'"total": 5']),
 ('P86 imports','artifacts/p89/logs/regression/current-stack/12_P86_IMPORTS.log',3,[r'PASS \(3/3\)']),
 ('P86 exact PDF runtime','artifacts/p89/logs/regression/current-stack/13_P86_EXACT_PDF_RUNTIME.log',61,[r'"total": 61',r'"status": "PASS_BOUNDED_LOCAL_ROUTE_HANDLER_EXACT_BYTES_ONLY"']),
 ('P84 owner-read runtime','artifacts/p89/logs/regression/current-stack/14_P84_OWNER_READ_RUNTIME.log',59,[r'"total": 59',r'"failed": 0']),
]
lanes_a=[verify_log(*x) for x in segment_a_specs]
aggregate_a=sum(x['checks'] for x in lanes_a)
if aggregate_a!=392:raise AssertionError(aggregate_a)
segment_a={'schemaVersion':'velmere.p89.current-regression-segment-a-verified.v1','generatedAt':'2026-08-20T20:25:00.000Z','status':'PASS','lanes':lanes_a,'aggregateExecutedChecksAcrossOverlappingHarnesses':aggregate_a,'orchestrationBoundary':'Individual zero-exit closed-marker logs were independently verified. The later orchestration timeout has no aggregate credit and does not erase these completed per-command results.','truthBoundary':'Current local evidence only; heavily overlapping; no provider, rights, staging, deployment, Customer FINAL or exact-Windows credit.'}
A_OUT.write_text(json.dumps(segment_a,indent=2)+'\n')

segment_b=json.loads((ROOT/'receipts/p89/P89_CURRENT_REGRESSION_SEGMENT_B.json').read_text())
if segment_b['status']!='PASS' or segment_b['commandsPassed']!=15 or segment_b['aggregateExecutedChecksAcrossOverlappingHarnesses']!=910:raise AssertionError('segment_b')
for row in segment_b['rows']:
 p=ROOT/row['log']
 if not p.is_file() or sha(p)!=row['logSha256'] or row['status']!='PASS' or row['returnCode']!=0:raise AssertionError(f"segment_b_row:{row['name']}")

history=json.loads((ROOT/'receipts/p89/P89_PARENT_HISTORY_RESTORE.json').read_text())
if history['status']!='PASS' or history['mismatchCount']!=0:raise AssertionError('history')
compat=json.loads((ROOT/'receipts/p89/P89_P88_COMPATIBILITY_AND_HISTORY.json').read_text())
if compat['status']!='PASS' or compat['checks']['total']!=40:raise AssertionError('compat')

superseded=[
 {'path':'artifacts/p89/logs/regression/00A_P89_BASIC_SCHEMA_FIRST_FAIL.log','classification':'FIRST_IMPLEMENTATION_FAILURE_REPAIRED','credit':'NONE'},
 {'path':'artifacts/p89/logs/regression/05_P88_RUNTIME_SUPERSEDED.log','classification':'P88_HARNESS_MISSING_P89_VERSIONED_FIELDS','credit':'NONE'},
 {'path':'artifacts/p89/logs/regression/06_P88_STATIC_SUPERSEDED.log','classification':'P88_ACTIVE_PASS_FROZEN_ASSERTION','credit':'NONE'},
 {'path':'artifacts/p89/logs/regression/07_P88_PROVIDER_CAPACITY_SUPERSEDED.log','classification':'P88_CONFLATED_DIMENSION_TEST_DEFECT','credit':'NONE'},
 {'path':'artifacts/p89/logs/regression/current-stack/10_P87_STATIC.log','classification':'P87_ACTIVE_PASS_FROZEN_ASSERTION','credit':'NONE'},
 {'path':'artifacts/p89/logs/regression/08A_P89_MONOLITHIC_RUNNER_TIMEOUT.log','classification':'ORCHESTRATION_PROCESS_TREE_TIMEOUT','credit':'NONE'},
]
for row in superseded:
 p=ROOT/row['path']
 if not p.is_file() or p.stat().st_size==0:raise AssertionError(f"missing_superseded:{row['path']}")
 row['sha256']=sha(p)

total=aggregate_a+segment_b['aggregateExecutedChecksAcrossOverlappingHarnesses']
if total!=1302:raise AssertionError(total)
payload={
 'schemaVersion':'velmere.p89.current-source-segmented-regression.v1',
 'generatedAt':'2026-08-20T20:30:00.000Z',
 'status':'PASS_BOUNDED_CURRENT_SEGMENTED_EXECUTION',
 'segments':[
  {'id':'A','receipt':A_OUT.relative_to(ROOT).as_posix(),'receiptSha256':sha(A_OUT),'checks':aggregate_a,'lanes':len(lanes_a)},
  {'id':'B','receipt':'receipts/p89/P89_CURRENT_REGRESSION_SEGMENT_B.json','receiptSha256':sha(ROOT/'receipts/p89/P89_CURRENT_REGRESSION_SEGMENT_B.json'),'checks':910,'lanes':15},
 ],
 'commandsOrReceiptsPassed':len(lanes_a)+15,
 'aggregateExecutedChecksAcrossOverlappingHarnesses':total,
 'historicalIntegrity':{'receipt':'receipts/p89/P89_PARENT_HISTORY_RESTORE.json','receiptSha256':sha(ROOT/'receipts/p89/P89_PARENT_HISTORY_RESTORE.json'),'verifiedHistoricalFiles':history['verifiedHistoricalFiles'],'restoredFiles':history['restoredCount'],'mismatchCount':0},
 'supersededOrFailedNoCredit':superseded,
 'environment':{'node':'v22.16.0','npm':'10.9.2','typescript':'5.8.3','platform':'Linux x86_64','dependencyGraphPresent':False,'exactTarget':'Windows Server 2025 / Node 24.18.0 / npm 11.16.0'},
 'zeroFakeCredit':{'countsOverlap':True,'independentEvidenceCount':None,'realProvidersExecuted':False,'providerRightsExpanded':False,'customerFinal':'0/20','auditFinalPdf':'0/3','rights':'2/203 inherited only','paidValue':'0/10','saleEligible':'0/20','live':False,'exactWindows':'WITHHELD'},
 'truthBoundary':'1,302 is the sum of overlapping local/static/runtime/regression checks whose individual evidence is independently verified here. It is not accuracy, provider independence, real currentness, rights, customer count, FINAL, staging, deployed HTTP, database or exact-Windows proof.'
}
FINAL.write_text(json.dumps(payload,indent=2)+'\n');FINAL_ART.write_bytes(FINAL.read_bytes())
print(json.dumps({'status':payload['status'],'segmentA':aggregate_a,'segmentB':910,'aggregate':total,'lanes':payload['commandsOrReceiptsPassed'],'receiptSha256':sha(FINAL)},indent=2))
