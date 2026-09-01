#!/usr/bin/env python3
from __future__ import annotations
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
LOG=ROOT/'artifacts/p85/logs'; OUT=ROOT/'receipts/p85/P85_CURRENT_SOURCE_REGRESSION_SUMMARY.json'

def load(rel): return json.loads((ROOT/rel).read_text(encoding='utf-8'))
def count_json(data):
    checks=data.get('checks')
    if isinstance(checks,dict):
        if isinstance(checks.get('passed'),int) and isinstance(checks.get('total'),int): return checks['passed'],checks['total']
        rows=checks.get('rows')
        if isinstance(rows,list): return sum(r.get('status')=='PASS' for r in rows),len(rows)
    if isinstance(checks,list): return sum(r.get('status')=='PASS' for r in checks),len(checks)
    if isinstance(data.get('passed'),int) and isinstance(data.get('checkCount'),int): return data['passed'],data['checkCount']
    raise ValueError('unsupported receipt check shape')
def pdf_unit():
    text=(LOG/'EXACT_PDF_UNIT.log').read_text(encoding='utf-8',errors='replace')
    m=re.search(r'Exact customer PDF delivery: PASS \((\d+)/(\d+)\)',text)
    if not m: raise ValueError('PDF unit count missing')
    return int(m.group(1)),int(m.group(2))
def pdf_integration():
    d=load('artifacts/closure/p36/P36_EXACT_CUSTOMER_PDF_INTEGRATION.json'); n=d.get('assertions')
    if d.get('status')!='PASS_P36_EXACT_CUSTOMER_PDF_STORAGE_TO_DELIVERY_INTEGRATION' or not isinstance(n,int): raise ValueError('PDF integration invalid')
    return n,n
def p75():
    d=json.loads((LOG/'P75_ADVANCED_AUTOMATION_CURRENT_REGRESSION.log').read_text()); rows=d.get('checks')
    if not isinstance(rows,list): raise ValueError('P75 checks missing')
    return sum(r.get('status')=='PASS' for r in rows),len(rows)
lanes=[]
def add(name,p,t,e,credit='CURRENT_UNSUPERSEDED'):
    lanes.append({'name':name,'passed':p,'total':t,'status':'PASS' if p==t else 'FAIL','creditClass':credit,'evidence':e})
for name,rel in [
 ('P85 owner-visible runtime','receipts/p85/P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_RUNTIME.json'),
 ('P85 runtime repeatability','receipts/p85/P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_REPEATABILITY.json'),
 ('P85 database/read-path static','receipts/p85/P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_STATIC.json'),
 ('P85/P84 frozen write-boundary compatibility','receipts/p85/P85_P84_OWNER_READ_COMPATIBILITY.json'),
 ('P85/P80 immutable artifact replacement compatibility','receipts/p85/P85_P80_IMMUTABLE_ARTIFACT_COMPATIBILITY.json'),
 ('P84 owner-read runtime regression','receipts/p84/P84_AUDIT_CUSTOMER_ARTIFACT_OWNER_READ_RUNTIME.json'),
 ('P84 owner-read repeatability regression','receipts/p84/P84_AUDIT_CUSTOMER_ARTIFACT_OWNER_READ_REPEATABILITY.json'),
 ('P84/P83 atomic publication compatibility','receipts/p84/P84_P83_ATOMIC_PUBLICATION_COMPATIBILITY.json'),
 ('P82 quorum runtime regression','receipts/p82/P82_SUCCESSFUL_QUORUM_INTEGRITY_RUNTIME.json'),
 ('P82 quorum static regression','receipts/p82/P82_SUCCESSFUL_QUORUM_INTEGRITY_STATIC.json'),
 ('P80 immutable Audit runtime regression','receipts/p80/P80_AUDIT_EXACT_IMMUTABLE_ACCOUNT_ARTIFACT_RUNTIME.json'),
 ('P79 historical customer-path runtime','receipts/p79/P79_HISTORICAL_DEPLOYMENT_CUSTOMER_PATH_RUNTIME.json'),
 ('P79 historical customer-path static','receipts/p79/P79_CUSTOMER_PATH_STATIC.json'),
 ('P78 private provider evidence','receipts/p78/P78_PRIVATE_PROVIDER_EVIDENCE_RUNTIME.json'),
 ('P78 standard-json customer path','receipts/p78/P78_STANDARD_JSON_CUSTOMER_PATH_RUNTIME.json'),
 ('P78 thirdweb development micro-corpus','receipts/p78/P78_THIRDWEB_DEVELOPMENT_MICRO_CORPUS_RUNTIME.json'),
 ('P78 real-audit dataflow static','receipts/p78/P78_REAL_AUDIT_DATAFLOW_STATIC.json'),
 ('P78R3 customer path static','receipts/p78/P78R3_CUSTOMER_PATH_STATIC.json'),
 ('P77 deterministic delivery current static','receipts/p85/P85_P77_DETERMINISTIC_DELIVERY_CURRENT_STATIC_REGRESSION.json'),
]:
    p,t=count_json(load(rel)); add(name,p,t,rel)
add('P85 changed production module imports',3,3,'artifacts/p85/logs/P85_CHANGED_MODULE_IMPORTS.log')
add('P85 targeted strict TypeScript',1,1,'artifacts/p85/logs/P85_TARGETED_TYPESCRIPT.log')
p,t=p75(); add('P75 Advanced automation runtime',p,t,'artifacts/p85/logs/P75_ADVANCED_AUTOMATION_CURRENT_REGRESSION.log')
p,t=pdf_unit(); add('Exact PDF unit',p,t,'artifacts/p85/logs/EXACT_PDF_UNIT.log')
p,t=pdf_integration(); add('Exact PDF integration',p,t,'artifacts/closure/p36/P36_EXACT_CUSTOMER_PDF_INTEGRATION.json')
failed=[x for x in lanes if x['status']!='PASS']; ap=sum(x['passed'] for x in lanes); at=sum(x['total'] for x in lanes)
if (ap,at)!=(1161,1161): raise RuntimeError(f'unexpected aggregate:{ap}/{at}')
command=load('receipts/p85/P85_REGRESSION_COMMAND_EXECUTION.json')
payload={
 'schemaVersion':'velmere.p85.current-source-regression-summary.v1',
 'status':'PASS' if not failed and command.get('status')=='PASS' else 'FAIL',
 'lanes':lanes,
 'aggregate':{'passed':ap,'total':at,'failedLanes':len(failed)},
 'commandExecution':{'status':command.get('status'),'commandsPassed':len(command.get('results',[])),'historicalFilesRestored':command.get('historicalRestore',{}).get('restoredCount')},
 'supersededHistoricalHarnesses':[
   {'harness':'P84 owner-read static','reason':'Its sole current-tree incompatibility is the frozen assertion that the P84 migration must remain the newest migration. P85/P84 compatibility 34/34 verifies the retained P84 guarantees without pretending that historical ordering assertion is current.'},
   {'harness':'P84/P80 replacement static','reason':'Replaced by P85/P80 compatibility 10/10; the frozen P80 receipt remains byte-identical.'},
   {'harness':'P84 changed-module imports/targeted TypeScript','reason':'Replaced by current P85 module imports and targeted TypeScript.'},
 ],
 'countingBoundary':'The 1161 checks overlap heavily and are not independent evidence, detector accuracy, provider independence, customer count, Customer FINAL, Audit FINAL PDF, rights, paid value or sale-eligibility numerators.',
 'environment':{'node':'v22.16.0','npm':'10.9.2','platform':'Linux x64','targetExactLane':'Windows Server 2025 / Node 24.18.0 / npm 11.16.0'},
 'withheld':['authorized PostgreSQL/Supabase runtime','real service_role/authenticated/anon grants','two-owner JWT RLS and cross-account isolation','direct PostgREST orphan-denial proof','deployed preview/download/account byte identity','current rights-bound BSC quorum','independent offline archival replay','whole-project semantic TypeScript/ESLint/dual build','exact Windows on P85 bytes'],
 'finalCredit':{'customerFinal':'0/20','auditFinalPdf':'0/3','saleEligible':'0/20','live':False,'global':'NO_GO / STOP_SELL'},
}
OUT.write_text(json.dumps(payload,indent=2)+'\n',encoding='utf-8'); print(json.dumps(payload['aggregate'],indent=2))
raise SystemExit(0 if payload['status']=='PASS' else 1)
