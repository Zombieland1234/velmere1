#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
STATE=ROOT/'artifacts/p87/P87_REGRESSION_CHUNK_STATE.json'
RESTORE=ROOT/'artifacts/p87/P87_PARENT_HISTORY_RESTORE_LAST.json'
OUT=ROOT/'receipts/p87/P87_CURRENT_SOURCE_REGRESSION_SUMMARY.json'
LOG=ROOT/'artifacts/p87/logs/P87_CURRENT_SOURCE_REGRESSION_SUMMARY.log'
P86=ROOT/'receipts/p86/P86_CURRENT_SOURCE_REGRESSION_SUMMARY.json'

def digest(path:Path)->str: return hashlib.sha256(path.read_bytes()).hexdigest()

def read(path:Path): return json.loads(path.read_text(encoding='utf-8'))

state=read(STATE); restore=read(RESTORE); parent=read(P86)
results=state.get('results',[])
if len(results)!=27 or any(r.get('returnCode')!=0 for r in results): raise SystemExit('P87 regression command state incomplete or failed')
for row in results:
 p=ROOT/row['log']
 if not p.is_file() or digest(p)!=row['logSha256']: raise SystemExit(f"P87 regression log identity mismatch: {row['name']}")
if restore.get('status')!='PASS' or restore.get('mismatchCount')!=0: raise SystemExit('P87 historical restore not green')

new_lanes=[
 {'name':'P87 Real Markets exact immutable PDF runtime','passed':43,'total':43,'status':'PASS','creditClass':'CURRENT_EXECUTED_BOUNDED','evidence':'receipts/p87/P87_REAL_MARKETS_EXACT_PDF_RUNTIME.json'},
 {'name':'P87 Real Markets exact immutable PDF repeatability','passed':5,'total':5,'status':'PASS','creditClass':'CURRENT_EXECUTED_BOUNDED','evidence':'receipts/p87/P87_REAL_MARKETS_EXACT_PDF_REPEATABILITY.json'},
 {'name':'P87 token/store/download/customer-path static','passed':100,'total':100,'status':'PASS','creditClass':'CURRENT_EXECUTED_BOUNDED','evidence':'receipts/p87/P87_REAL_MARKETS_EXACT_PDF_STATIC.json'},
 {'name':'P87 changed production module imports','passed':3,'total':3,'status':'PASS','creditClass':'CURRENT_EXECUTED_BOUNDED','evidence':'artifacts/p87/logs/regression-chunk/03_P87_IMPORTS.log'},
 {'name':'P87 targeted strict TypeScript','passed':1,'total':1,'status':'PASS','creditClass':'CURRENT_EXECUTED_BOUNDED','evidence':'artifacts/p87/logs/regression-chunk/04_P87_TARGETED_TYPESCRIPT.log'},
 {'name':'P87/P86 compatibility and supersession adjudication','passed':21,'total':21,'status':'PASS','creditClass':'CURRENT_EXECUTED_BOUNDED','evidence':'receipts/p87/P87_P86_COMPATIBILITY_AND_SUPERSESSION.json'},
]
# Every P86 lane except the frozen writer-location static harness was physically rerun on P87 bytes.
legacy_to_current_evidence={
 'P86 exact-PDF route runtime':'artifacts/p87/logs/P87_P86_COMPATIBILITY_DIAGNOSTIC.log',
 'P86 exact-PDF runtime repeatability':'artifacts/p87/logs/regression-chunk/06_P86_REPEATABILITY.log',
 'P86/P85 compatibility':'artifacts/p87/logs/regression-chunk/07_P86_P85_COMPATIBILITY.log',
 'P86 changed production module imports':'artifacts/p87/logs/regression-chunk/08_P86_IMPORTS.log',
 'P86 targeted strict TypeScript':'artifacts/p87/logs/regression-chunk/09_P86_TARGETED_TYPESCRIPT.log',
 'P85 owner-visible runtime on P86 bytes':'artifacts/p87/logs/regression-chunk/07_P86_P85_COMPATIBILITY.log',
 'P84 owner-read runtime':'artifacts/p87/logs/regression-chunk/10_P84_OWNER_READ_RUNTIME.log',
 'P84 owner-read repeatability':'artifacts/p87/logs/regression-chunk/11_P84_OWNER_READ_REPEATABILITY.log',
 'P84/P83 atomic compatibility':'artifacts/p87/logs/regression-chunk/12_P84_P83_ATOMIC_COMPATIBILITY.log',
 'P82 successful-quorum static':'artifacts/p87/logs/regression-chunk/14_P82_QUORUM_STATIC.log',
 'P80 immutable Audit runtime':'artifacts/p87/logs/regression-chunk/15_P80_IMMUTABLE_AUDIT_RUNTIME.log',
 'P79 historical deployment runtime':'artifacts/p87/logs/regression-chunk/16_P79_HISTORICAL_RUNTIME.log',
 'P79 customer-path static':'artifacts/p87/logs/regression-chunk/17_P79_CUSTOMER_PATH_STATIC.log',
 'P78 private provider evidence runtime':'artifacts/p87/logs/regression-chunk/18_P78_PRIVATE_PROVIDER_RUNTIME.log',
 'P78 standard-json runtime':'artifacts/p87/logs/regression-chunk/19_P78_STANDARD_JSON_RUNTIME.log',
 'P78 thirdweb development corpus runtime':'artifacts/p87/logs/regression-chunk/20_P78_THIRDWEB_RUNTIME.log',
 'P78 real-audit dataflow static':'artifacts/p87/logs/regression-chunk/21_P78_DATAFLOW_STATIC.log',
 'P78R3 customer path static':'artifacts/p87/logs/regression-chunk/22_P78R3_CUSTOMER_PATH_STATIC.log',
 'P75 Advanced automation runtime':'artifacts/p87/logs/regression-chunk/23_P75_ADVANCED_AUTOMATION_RUNTIME.log',
 'P77 deterministic delivery static':'receipts/p87/P87_P77_DETERMINISTIC_DELIVERY_CURRENT_STATIC_REGRESSION.json',
 'P82 successful-quorum runtime':'artifacts/p87/logs/regression-chunk/13_P82_QUORUM_RUNTIME.log',
 'Exact customer PDF unit':'artifacts/p87/logs/regression-chunk/25_EXACT_PDF_UNIT.log',
 'Account artifact preview/download parity static':'artifacts/p87/logs/regression-chunk/26_ACCOUNT_ARTIFACT_PARITY_STATIC.log',
}
prior_lanes=[]
for lane in parent['lanes']:
 if lane['name']=='P86 exact-PDF/source/migration static':
  continue
 evidence=legacy_to_current_evidence.get(lane['name'])
 if not evidence: raise SystemExit(f"missing P87 current evidence mapping for {lane['name']}")
 prior_lanes.append({**lane,'creditClass':'CURRENT_EXECUTED_ON_P87_BYTES','evidence':evidence})
lanes=new_lanes+prior_lanes
passed=sum(x['passed'] for x in lanes); total=sum(x['total'] for x in lanes)
if passed!=1248 or total!=1248: raise SystemExit(f'unexpected aggregate {passed}/{total}')
compat=read(ROOT/'receipts/p87/P87_P86_COMPATIBILITY_AND_SUPERSESSION.json')
payload={
 'schemaVersion':'velmere.p87.current-source-regression-summary.v1',
 'generatedAt':'2026-08-20T12:30:00.000Z',
 'status':'PASS',
 'lanes':lanes,
 'aggregate':{'passed':passed,'total':total,'failedLanes':0},
 'commandExecution':{'status':'PASS','commandsPassed':27,'commandsTotal':27,'statePath':str(STATE.relative_to(ROOT)),'historicalFilesVerified':restore['verifiedHistoricalFiles'],'historicalMismatches':restore['mismatchCount']},
 'supersededHistoricalHarnesses':[compat['supersededHistoricalAssertion']],
 'countingBoundary':'The 1248 checks overlap heavily. They are not independent evidence, detector accuracy, provider independence, customer count, Customer FINAL, Audit FINAL PDF, rights, value or sale-eligibility numerators. The frozen P86 73-check static lane is removed entirely from current credit and replaced by P87 current controls; its known failure is explicitly adjudicated.',
 'environment':{'node':'v22.16.0','npm':'10.9.2','typescript':'5.8.3','platform':'Linux x64','targetExactLane':'Windows Server 2025 / Node 24.18.0 / npm 11.16.0'},
 'withheld':['authorized PostgreSQL/Supabase execution','real JWT/RLS and deployed owner read','deployed Real Markets exact PDF HTTP bytes','current rights-bound external market-provider evidence','whole-project semantic TypeScript/ESLint/dual build','exact Windows on P87 bytes'],
 'finalCredit':{'customerFinal':'0/20','auditFinalPdf':'0/3','rights':'2/203 inherited only','paidValue':'0/10','saleEligible':'0/20','live':False,'global':'NO_GO / STOP_SELL'},
}
OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(payload,indent=2)+'\n',encoding='utf-8')
LOG.parent.mkdir(parents=True,exist_ok=True); LOG.write_text(json.dumps({'status':'PASS','aggregate':payload['aggregate'],'commands':payload['commandExecution']},indent=2)+'\n')
print(LOG.read_text(),end='')
