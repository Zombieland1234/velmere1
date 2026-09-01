#!/usr/bin/env python3
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
rows=[]
for p in sorted((ROOT/'artifacts/p98/regressions').glob('P98_CURRENT_BYTE_*.json')):
 d=json.loads(p.read_text())
 c=d.get('checks',{})
 rows.append({'id':p.stem,'status':'PASS' if c.get('failed',0)==0 and str(d.get('status','')).startswith('PASS') else 'FAIL','sourceStatus':d.get('status'),'checks':c.get('total',0),'passed':c.get('passed',0),'failed':c.get('failed',0),'sha256':'sha256:'+hashlib.sha256(p.read_bytes()).hexdigest()})
failed=[r for r in rows if r['status']!='PASS']
receipt={'schemaVersion':'velmere.p98.affected-scope-regression.v1','generatedAt':'2026-08-21T12:00:00.000Z','status':'PASS_BOUNDED' if not failed else 'FAIL','commands':{'total':len(rows),'passed':len(rows)-len(failed),'failed':len(failed),'rows':rows},'aggregateChecks':sum(r['checks'] for r in rows),'zeroFakeCredit':{'independentEvidenceCount':False,'wholeProjectRegression':False,'routeEndToEnd':False,'realProvider':False,'realDatabase':False,'exactWindows':False,'customerFinal':'0/20'},'truthBoundary':'Fresh current-byte regression of selected affected Browser, Real Markets exact-PDF, Audit blocked-projection and commercial-path contracts. Checks overlap and are not an independent-evidence count or full-project regression.'}
raw=json.dumps(receipt,indent=2)+'\n'
for rel in ['receipts/p98/P98_AFFECTED_SCOPE_REGRESSION.json','artifacts/p98/P98_AFFECTED_SCOPE_REGRESSION.json']:
 p=ROOT/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(raw)
print(json.dumps(receipt))
raise SystemExit(1 if failed else 0)
