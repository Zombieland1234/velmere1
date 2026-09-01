#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
LOG=ROOT/'artifacts/p88/logs/regression'
OUT=ROOT/'receipts/p88/P88_CURRENT_SOURCE_SEGMENTED_REGRESSION.json'

def sha(path:Path)->str:return hashlib.sha256(path.read_bytes()).hexdigest()

def lane(name:str,count:int,path:str,markers:list[str],credit:str='REGRESSION'):
    p=ROOT/path
    if not p.is_file(): raise AssertionError(f'{name}: missing {path}')
    text=p.read_text('utf-8',errors='replace')
    missing=[m for m in markers if m not in text]
    if missing: raise AssertionError(f'{name}: missing markers {missing!r}')
    return {'name':name,'checks':count,'status':'PASS','creditClass':credit,'evidencePath':path,'evidenceSha256':sha(p),'requiredMarkers':markers}

rows=[
 lane('P88 exact immutable paid Audit PDF runtime',74,'artifacts/p88/logs/regression/00_P88_RUNTIME.log',['"checks": 74','"passed": 74'],'CURRENT_P88'),
 lane('P88 runtime repeatability',5,'artifacts/p88/logs/regression/01_P88_REPEATABILITY.log',['"status": "PASS"','"total": 5'],'CURRENT_P88'),
 lane('P88 exact immutable paid Audit PDF static',161,'artifacts/p88/logs/regression/02_P88_STATIC.log',['"passed": 161','"total": 161'],'CURRENT_P88'),
 lane('P88 changed production imports',9,'artifacts/p88/logs/regression/03_P88_IMPORTS.log',['PASS (9/9)'],'CURRENT_P88'),
 lane('P88 targeted strict TypeScript',1,'artifacts/p88/logs/regression/04_P88_TARGETED_TYPESCRIPT.log',['PASS targeted strict TypeScript P88'],'CURRENT_P88'),
 lane('P88 parent compatibility and supersession',19,'receipts/p88/P88_P87_COMPATIBILITY_AND_SUPERSESSION.json',['"status": "PASS"','"total": 19'],'CURRENT_P88'),
 lane('P88 Audit paid provider capacity',35,'artifacts/p88/logs/regression/34_P88_AUDIT_PAID_PROVIDER_CAPACITY.log',['PASS_BOUNDED_STRUCTURAL_BLOCKER_CONFIRMED','"total": 35'],'CURRENT_P88'),
 lane('P87 Real Markets exact PDF runtime',43,'artifacts/p88/logs/regression/05_P87_RUNTIME.log',['"status": "PASS_BOUNDED"','"total": 43']),
 lane('P87 runtime repeatability',5,'artifacts/p88/logs/regression/06_P87_REPEATABILITY.log',['"status": "PASS"','"total": 5']),
 lane('P87 static',100,'artifacts/p88/logs/regression/07_P87_STATIC.log',['"passed": 100','"total": 100']),
 lane('P87 changed production imports',3,'artifacts/p88/logs/regression/08_P87_IMPORTS.log',['PASS (3/3)']),
 lane('P87 targeted strict TypeScript',1,'artifacts/p88/logs/regression/09_P87_TARGETED_TYPESCRIPT.log',['PASS targeted strict TypeScript P87']),
 lane('P86 repeatability',5,'artifacts/p88/logs/regression/11_P86_REPEATABILITY.log',['"status": "PASS"','"total": 5']),
 lane('P86/P85 compatibility exact parent rerun',10,'artifacts/p88/logs/regression/12_P86_P85_COMPATIBILITY_RERUN_WITH_EXACT_P85_BASE.log',['"status": "PASS"','"total": 10']),
 lane('P86 changed production imports',3,'artifacts/p88/logs/regression/13_P86_IMPORTS.log',['PASS (3/3)']),
 lane('P86 targeted strict TypeScript',1,'artifacts/p88/logs/regression/14_P86_TARGETED_TYPESCRIPT.log',['PASS targeted strict TypeScript P86']),
 lane('P86 exact PDF fail-closed runtime',61,'artifacts/p88/logs/regression/33_P86_EXACT_PDF_RUNTIME.log',['"status": "PASS_BOUNDED_LOCAL_ROUTE_HANDLER_EXACT_BYTES_ONLY"','"total": 61']),
 lane('P84 owner read runtime',59,'artifacts/p88/logs/regression/15_P84_OWNER_READ_RUNTIME.log',['"status": "PASS_BOUNDED_LOCAL_MOCKED_RPC"','"total": 59']),
 lane('P84 owner read repeatability',5,'artifacts/p88/logs/regression/16_P84_OWNER_READ_REPEATABILITY.log',['"status": "PASS"','"total": 5']),
 lane('P84/P83 atomic compatibility',7,'artifacts/p88/logs/regression/17_P84_P83_ATOMIC_COMPATIBILITY.log',['"status": "PASS"','"total": 7']),
 lane('P82 quorum runtime',167,'artifacts/p88/logs/regression/18_P82_QUORUM_RUNTIME.log',['PASS (167/167)']),
 lane('P82 quorum static',129,'artifacts/p88/logs/regression/19_P82_QUORUM_STATIC.log',['"checkCount": 129','"passed": 129']),
 lane('P80 immutable Audit artifact runtime',67,'artifacts/p88/logs/regression/20_P80_IMMUTABLE_AUDIT_RUNTIME.log',['"checkCount": 67','"failed": 0']),
 lane('P79 historical deployment runtime',93,'artifacts/p88/logs/regression/21_P79_HISTORICAL_RUNTIME.log',['"checkCount": 93','"failed": []']),
 lane('P79 customer path static',98,'artifacts/p88/logs/regression/22_P79_CUSTOMER_PATH_STATIC.log',['"checkCount": 98','"failed": []']),
 lane('P78 private provider runtime',27,'artifacts/p88/logs/regression/23_P78_PRIVATE_PROVIDER_RUNTIME.log',['"status": "PASS"','"checks": [']),
 lane('P78 standard-json runtime',38,'artifacts/p88/logs/regression/24_P78_STANDARD_JSON_RUNTIME.log',['"status": "PASS"','"total": 38']),
 lane('P78 thirdweb bounded corpus',58,'artifacts/p88/logs/regression/25_P78_THIRDWEB_RUNTIME.log',['"status": "PASS"','"passed": 58']),
 lane('P78 dataflow static',38,'artifacts/p88/logs/regression/26_P78_DATAFLOW_STATIC.log',['"status": "PASS"','"checkCount": 38']),
 lane('P78R3 customer path static',54,'artifacts/p88/logs/regression/27_P78R3_CUSTOMER_PATH_STATIC.log',['"checkCount": 54','"failed": []']),
 lane('P77 deterministic delivery static',23,'artifacts/p88/logs/regression/29_P77_DETERMINISTIC_DELIVERY_STATIC.log',['"status": "PASS"','"checkCount": 23']),
 lane('Exact customer PDF unit',22,'artifacts/p88/logs/regression/30_EXACT_PDF_UNIT.log',['PASS (22/22)','# fail 0']),
 lane('Exact customer PDF integration',61,'artifacts/p88/logs/regression/31_EXACT_PDF_INTEGRATION.log',['"assertions": 61','# fail 0']),
 lane('Account artifact preview/download parity',28,'artifacts/p88/logs/regression/32_ACCOUNT_ARTIFACT_PARITY_STATIC.log',['PASS (28/28)']),
]
# Parent history must remain exact after all historical executions.
history_path=ROOT/'artifacts/p88/P88_PARENT_HISTORY_RESTORE.json'
history=json.loads(history_path.read_text())
if history.get('status')!='PASS_BYTE_IDENTICAL' or history.get('historyMismatchAfterRestore')!=0:
    raise AssertionError('parent history restore not clean')
aggregate=sum(r['checks'] for r in rows)
if aggregate != 1510: raise AssertionError(f'aggregate mismatch: {aggregate}')
receipt={
 'schemaVersion':'velmere.p88.current-source-segmented-regression.v1',
 'generatedAt':'2026-08-20T14:40:00.000Z',
 'status':'PASS_BOUNDED_CURRENT_SEGMENTED_EXECUTION',
 'commandsOrReceiptsPassed':len(rows),
 'commandsOrReceiptsFailedCurrent':0,
 'aggregateExecutedChecksAcrossOverlappingHarnesses':aggregate,
 'lanes':rows,
 'executionAdjudication':[
   {'event':'initial_monolithic_orchestrator_timeout','result':'NO_CREDIT','classification':'HARNESS_ORCHESTRATION_FAILURE_NOT_PRODUCT_RESULT','detail':'The first all-in-one runner timed out after producing logs through the P82 static lane and emitted no aggregate receipt. Remaining commands were executed individually; this segmented receipt verifies the complete current evidence set.'},
   {'event':'p87_p86_historical_compatibility_nonzero','result':'SUPERSEDED_NOT_COUNTED','detail':'The old lane lacked its exact P86 base locally and freezes schema identity. P88 intentionally appends an ordered exact-PDF migration; replacement P88 compatibility verifies 19/19 without granting old semantics new guarantees.'},
   {'event':'p75_advanced_automation_historical_nonzero','result':'SUPERSEDED_NOT_COUNTED','detail':'Exactly two v1 atomic-completion assertions fail because P88 requires the stronger exact-PDF v2 operation. The 35 passing assertions from this nonzero harness are not partially credited.'},
   {'event':'p86_p85_first_attempt_missing_parent','result':'NO_CREDIT_FIRST_ATTEMPT','detail':'The first attempt lacked the exact P85 base. After extracting the supplied exact P85 SOURCE_ONLY, the same compatibility proof passed 10/10; only that rerun is counted.'},
   {'event':'p88_provider_capacity_first_attempt_import_resolution','result':'NO_CREDIT_FIRST_ATTEMPT','detail':'Direct Node import failed on an extensionless TypeScript dependency in the harness environment. The first failure log is retained; the repaired independent source-contract verifier passed 35/35.'},
   {'event':'segmented_regression_verifier_first_attempt_marker_mismatch','result':'NO_CREDIT_FIRST_ATTEMPT','detail':'The verifier initially looked for a nested total field while the current P88 runtime stdout uses checks: 74. The execution evidence itself was unchanged; the marker contract was corrected and the failed verifier log retained.'},
 ],
 'supersededLogs':[
   {'path':'artifacts/p88/logs/regression/10_P87_P86_COMPATIBILITY.log','credit':'NONE'},
   {'path':'artifacts/p88/logs/regression/28_P75_ADVANCED_AUTOMATION_RUNTIME.log','credit':'NONE'},
   {'path':'artifacts/p88/logs/regression/12_P86_P85_COMPATIBILITY.log','credit':'NONE'},
   {'path':'artifacts/p88/logs/regression/34A_P88_AUDIT_PAID_PROVIDER_CAPACITY_FAILED_IMPORT.log','credit':'NONE'},
   {'path':'artifacts/p88/logs/regression/35A_P88_SEGMENTED_REGRESSION_VERIFIER_FAILED_MARKER.log','credit':'NONE'},
 ],
 'historyIntegrity':{'receiptPath':'artifacts/p88/P88_PARENT_HISTORY_RESTORE.json','receiptSha256':sha(history_path),'verifiedFiles':history.get('verifiedHistoricalFiles'),'restoredFiles':len(history.get('restoredFiles',[])),'mismatchesAfterRestore':0},
 'zeroFakeCredit':{'countsAreOverlapping':True,'independentEvidenceCount':None,'detectorAccuracy':None,'realProvidersExecutedByP88':False,'customerFinal':'0/20','auditFinalPdf':'0/3','saleEligible':'0/20','exactWindows':'WITHHELD'},
 'truthBoundary':'1510 is the sum of overlapping local/static/runtime/regression assertions whose evidence files are verified here. It is not an independent-evidence count, accuracy result, provider quorum, customer count, FINAL numerator, database/staging proof, deployed HTTP proof, rights proof or exact-Windows proof.'
}
OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'status':receipt['status'],'lanes':len(rows),'aggregateOverlappingChecks':aggregate,'receiptSha256':sha(OUT)},indent=2))
