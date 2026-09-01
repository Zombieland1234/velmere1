#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]

def sha(p:Path)->str: return hashlib.sha256(p.read_bytes()).hexdigest()

def load(rel:str):
    p=ROOT/rel; d=json.loads(p.read_text())
    checks=d.get('checks',{})
    return {
        'id':p.stem,
        'path':rel,
        'status':'PASS' if checks.get('failed',0)==0 and str(d.get('status','')).startswith('PASS') else 'FAIL',
        'sourceStatus':d.get('status'),
        'total':int(checks.get('total',0)),
        'passed':int(checks.get('passed',0)),
        'withheld':int(checks.get('withheld',0)),
        'failed':int(checks.get('failed',0)),
        'sha256':'sha256:'+sha(p),
    }
rows=[]
for rel in [
 'receipts/p99/P99_REAL_MARKETS_BASIC_RIGHTS_SEMANTICS_RUNTIME.json',
 'receipts/p99/P99_REAL_MARKETS_BASIC_RIGHTS_SEMANTICS_STATIC.json',
 'receipts/p99/P99_TARGETED_STRICT_TYPESCRIPT.json',
 'receipts/p99/P99_CHANGED_MODULE_REACHABILITY.json',
 'artifacts/p99/regressions/P99_CURRENT_BYTE_P98_PAID_TIER_RUNTIME.json',
 'artifacts/p99/regressions/P99_CURRENT_BYTE_P98_PAID_TIER_STATIC.json',
 'artifacts/p99/regressions/P99_CURRENT_BYTE_P87_REAL_MARKETS_EXACT_PDF_RUNTIME.json',
 'artifacts/p99/regressions/P99_CURRENT_BYTE_P97_BROWSER_BASIC_DURABLE_PDF_RUNTIME.json',
 'artifacts/p99/regressions/P99_CURRENT_BYTE_BINANCE_FALLBACK_CONTRACT.json',
]: rows.append(load(rel))
failed=[r for r in rows if r['status']!='PASS']
receipt={
 'schemaVersion':'velmere.p99.affected-scope-regression.v1',
 'generatedAt':'2026-08-21T14:40:00.000Z',
 'status':'PASS_BOUNDED_WITH_DEPENDENCY_WITHHELD' if not failed else 'FAIL',
 'commands':{'total':len(rows),'passed':len(rows)-len(failed),'failed':len(failed),'rows':rows},
 'overlappingChecks':{
   'total':sum(r['total'] for r in rows),
   'passed':sum(r['passed'] for r in rows),
   'withheld':sum(r['withheld'] for r in rows),
   'failed':sum(r['failed'] for r in rows),
 },
 'supersededOrEnvironmentCommandsExcludedFromPass':[
   {'id':'pass36_local_reference_transition','state':'SUPERSEDED_NO_CREDIT'},
   {'id':'pass6_market_risk_delivery_gate','state':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING'},
 ],
 'zeroFakeCredit':{
   'independentEvidenceCount':False,'wholeProjectRegression':False,'routeEndToEnd':False,
   'realProvider':False,'rightsApproved':False,'realDatabase':False,'renderedBrowser':False,
   'exactWindows':False,'customerFinal':'0/20'
 },
 'truthBoundary':'Fresh current-byte proof for P99 field rights/semantic fail-closed behavior plus selected exact-tier, exact-PDF, Browser durability and Binance fallback regressions. Two imports remain dependency-environment WITHHELD. Counts overlap and are not an independent-evidence count, provider count, customer count, full-project regression or FINAL numerator.'
}
raw=json.dumps(receipt,indent=2)+'\n'
for rel in ['receipts/p99/P99_AFFECTED_SCOPE_REGRESSION.json','artifacts/p99/P99_AFFECTED_SCOPE_REGRESSION.json']:
 p=ROOT/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(raw)
print(json.dumps({'status':receipt['status'],'commands':receipt['commands'],'checks':receipt['overlappingChecks']},indent=2))
raise SystemExit(1 if failed else 0)
