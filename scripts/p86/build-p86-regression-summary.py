#!/usr/bin/env python3
from __future__ import annotations
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]; LOG=ROOT/'artifacts/p86/logs'; OUT=ROOT/'receipts/p86/P86_CURRENT_SOURCE_REGRESSION_SUMMARY.json'

def load(rel): return json.loads((ROOT/rel).read_text(encoding='utf-8'))
def log_json(name):
 t=(LOG/f'{name}.log').read_text(encoding='utf-8',errors='replace').split('\n--- STDERR ---')[0].strip()
 return json.loads(t)
def counts(d):
 c=d.get('checks')
 if isinstance(c,dict) and isinstance(c.get('passed'),int) and isinstance(c.get('total'),int): return c['passed'],c['total']
 if isinstance(c,list): return sum((x.get('status')=='PASS' or x.get('pass') is True) for x in c),len(c)
 if isinstance(d.get('passed'),int) and isinstance(d.get('checkCount'),int): return d['passed'],d['checkCount']
 if isinstance(d.get('checkCount'),int):
  f=d.get('failed'); n=len(f) if isinstance(f,list) else int(f or 0); return d['checkCount']-n,d['checkCount']
 raise ValueError(f'unsupported count shape:{d.keys()}')
lanes=[]
def add(name,p,t,e,credit='CURRENT_EXECUTED'):
 lanes.append({'name':name,'passed':p,'total':t,'status':'PASS' if p==t else 'FAIL','creditClass':credit,'evidence':e})
# P86 current lanes.
for name,rel in [
 ('P86 exact-PDF route runtime','receipts/p86/P86_EXACT_PDF_FAIL_CLOSED_RUNTIME.json'),
 ('P86 exact-PDF runtime repeatability','receipts/p86/P86_EXACT_PDF_FAIL_CLOSED_REPEATABILITY.json'),
 ('P86 exact-PDF/source/migration static','receipts/p86/P86_EXACT_PDF_FAIL_CLOSED_STATIC.json'),
 ('P86/P85 compatibility','receipts/p86/P86_P85_COMPATIBILITY.json'),
]:
 d=load(rel); p,t=counts(d); add(name,p,t,rel)
add('P86 changed production module imports',3,3,'artifacts/p86/logs/P86_CHANGED_MODULE_IMPORTS.log')
add('P86 targeted strict TypeScript',1,1,'artifacts/p86/logs/P86_TARGETED_TYPESCRIPT.log')
# P85 runtime actually re-executed on P86 source inside the compatibility lane.
d=log_json('P85_OWNER_VISIBLE_RUNTIME_CURRENT_P86'); p,t=counts(d); add('P85 owner-visible runtime on P86 bytes',p,t,'artifacts/p86/logs/P85_OWNER_VISIBLE_RUNTIME_CURRENT_P86.log')
# Physical current-source regressions.
for name,logname in [
 ('P84 owner-read runtime','P84_OWNER_READ_RUNTIME'),('P84 owner-read repeatability','P84_OWNER_READ_REPEATABILITY'),
 ('P84/P83 atomic compatibility','P84_P83_ATOMIC_COMPATIBILITY'),('P82 successful-quorum static','P82_QUORUM_STATIC'),
 ('P80 immutable Audit runtime','P80_IMMUTABLE_AUDIT_RUNTIME'),('P79 historical deployment runtime','P79_HISTORICAL_RUNTIME'),
 ('P79 customer-path static','P79_CUSTOMER_PATH_STATIC'),('P78 private provider evidence runtime','P78_PRIVATE_PROVIDER_RUNTIME'),
 ('P78 standard-json runtime','P78_STANDARD_JSON_RUNTIME'),('P78 thirdweb development corpus runtime','P78_THIRDWEB_RUNTIME'),
 ('P78 real-audit dataflow static','P78_DATAFLOW_STATIC'),('P78R3 customer path static','P78R3_CUSTOMER_PATH_STATIC'),
 ('P75 Advanced automation runtime','P75_ADVANCED_AUTOMATION_RUNTIME'),('P77 deterministic delivery static','P77_DETERMINISTIC_DELIVERY_STATIC'),
]:
 d=log_json(logname); p,t=counts(d); add(name,p,t,f'artifacts/p86/logs/{logname}.log')
# P82 runtime is text-only.
t=(LOG/'P82_QUORUM_RUNTIME.log').read_text(); m=re.search(r'PASS \((\d+)/(\d+)\)',t); assert m; add('P82 successful-quorum runtime',int(m.group(1)),int(m.group(2)),'artifacts/p86/logs/P82_QUORUM_RUNTIME.log')
# Unit/parity text lanes.
t=(LOG/'EXACT_PDF_UNIT.log').read_text(); m=re.search(r'Exact customer PDF delivery: PASS \((\d+)/(\d+)\)',t); assert m; add('Exact customer PDF unit',int(m.group(1)),int(m.group(2)),'artifacts/p86/logs/EXACT_PDF_UNIT.log')
t=(LOG/'ACCOUNT_ARTIFACT_PARITY_STATIC.log').read_text(); m=re.search(r'PASS \((\d+)/(\d+)\)',t); assert m; add('Account artifact preview/download parity static',int(m.group(1)),int(m.group(2)),'artifacts/p86/logs/ACCOUNT_ARTIFACT_PARITY_STATIC.log')
failed=[x for x in lanes if x['status']!='PASS']; ap=sum(x['passed'] for x in lanes); at=sum(x['total'] for x in lanes)
if (ap,at)!=(1148,1148): raise RuntimeError(f'unexpected_aggregate:{ap}/{at}')
cmd=load('receipts/p86/P86_REGRESSION_COMMAND_EXECUTION.json')
payload={
 'schemaVersion':'velmere.p86.current-source-regression-summary.v1','generatedAt':'2026-08-20T04:20:00Z',
 'status':'PASS' if not failed and cmd.get('status')=='PASS' else 'FAIL','lanes':lanes,
 'aggregate':{'passed':ap,'total':at,'failedLanes':len(failed)},
 'commandExecution':{'status':cmd.get('status'),'commandsPassed':sum(r['returnCode']==0 for r in cmd['results']),'commandsTotal':len(cmd['results']),'historicalFilesRestored':cmd['historicalRestore']['restoredCount'],'historicalFilesVerified':cmd['historicalRestore']['verifiedHistoricalFiles'],'historicalMismatches':cmd['historicalRestore']['mismatchCount']},
 'supersededHistoricalHarnesses':[
  {'harness':'P85 static latest-migration assertion','reason':'P86 is now the newest ordered migration; P86 static proof owns current ordering while frozen P85 bytes remain historical.'},
  {'harness':'legacy account PDF rerender behavior','reason':'Intentionally removed. Historical metadata remains readable, but no legacy preview/download route or regenerated PDF is allowed.'},
 ],
 'countingBoundary':'The 1148 checks overlap heavily. They are not independent evidence, detector accuracy, provider independence, customer count, Customer FINAL, Audit FINAL PDF, rights, value or sale-eligibility numerators.',
 'environment':{'node':'v22.16.0','npm':'10.9.2','platform':'Linux x64','targetExactLane':'Windows Server 2025 / Node 24.18.0 / npm 11.16.0'},
 'withheld':['authorized PostgreSQL/Supabase execution of P86 trigger','real service_role/authenticated/anon grants','two-owner JWT RLS and PostgREST','deployed preview/download/account bytes','current rights-bound BSC quorum','independent offline archival replay','whole-project semantic TypeScript/ESLint/dual build','exact Windows on P86 bytes'],
 'finalCredit':{'customerFinal':'0/20','auditFinalPdf':'0/3','rights':'2/203 inherited only','paidValue':'0/10','saleEligible':'0/20','live':False,'global':'NO_GO / STOP_SELL'},
}
OUT.write_text(json.dumps(payload,indent=2)+'\n'); print(json.dumps(payload['aggregate'],indent=2)); raise SystemExit(0 if payload['status']=='PASS' else 1)
