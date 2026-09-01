#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, os, subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
SPECS=[
  ('risk_history_core_semantic','tsconfig.p91-risk-history-core.json','artifacts/p93/logs/typescript/P93_RISK_HISTORY_CORE_TYPESCRIPT.log'),
  ('risk_history_server_closed_ambient','tsconfig.p93-risk-history-server-targeted.json','artifacts/p93/logs/typescript/P93_RISK_HISTORY_SERVER_TYPESCRIPT.log'),
  ('risk_history_ui_closed_ambient','tsconfig.p92-risk-history-ui-targeted.json','artifacts/p93/logs/typescript/P93_RISK_HISTORY_UI_TYPESCRIPT.log'),
]
rows=[]; env=dict(os.environ); env.setdefault('TERM','dumb')
for ident,config,log_rel in SPECS:
    result=subprocess.run(['tsc','-p',config,'--pretty','false'],cwd=ROOT,env=env,capture_output=True)
    log=ROOT/log_rel; log.parent.mkdir(parents=True,exist_ok=True)
    log.write_bytes(result.stdout+(b'\n--- STDERR ---\n'+result.stderr if result.stderr else b''))
    rows.append({'id':ident,'status':'PASS' if result.returncode==0 else 'FAIL','returnCode':result.returncode,'config':config,'log':log_rel,'logSha256':hashlib.sha256(log.read_bytes()).hexdigest()})
failed=[r for r in rows if r['status']!='PASS']
receipt={
 'schemaVersion':'velmere.p93.targeted-strict-typescript.v1',
 'generatedAt':'2026-08-20T12:00:00.000Z',
 'status':'PASS_BOUNDED_TARGETED_STRICT_TYPESCRIPT' if not failed else 'FAIL',
 'checks':{'total':len(rows),'passed':len(rows)-len(failed),'failed':len(failed),'rows':rows},
 'zeroFakeCredit':{'wholeProjectSemanticTypeScript':False,'realReactNextDependencyGraph':False,'eslint':False,'webpack':False,'turbopack':False,'exactWindows':False,'customerFinal':'0/20'},
 'truthBoundary':'The Risk History core compiles against its bounded real source graph. Server and TSX modules compile strictly against closed ambient declarations because SOURCE_ONLY lacks the installed Next/React dependency graph. Whole-project semantic TypeScript remains WITHHELD.'
}
for rel in ['receipts/p93/P93_TARGETED_STRICT_TYPESCRIPT.json','artifacts/p93/P93_TARGETED_STRICT_TYPESCRIPT.json']:
    target=ROOT/rel; target.parent.mkdir(parents=True,exist_ok=True); target.write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'status':receipt['status'],'checks':receipt['checks']},indent=2))
raise SystemExit(0 if not failed else 1)
