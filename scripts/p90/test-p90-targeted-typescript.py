#!/usr/bin/env python3
from __future__ import annotations
import json, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
FIXED_AT='2026-08-20T12:40:00.000Z'
base=['tsc','--noEmit','--target','ES2022','--lib','ES2022,DOM','--module','ESNext','--moduleResolution','Bundler','--skipLibCheck','--strict','--noResolve']
commands=[
  ('evidence_dimensions_implementation', base+['lib/security/audit-provider-evidence-dimensions.ts']),
  ('rights_currentness_implementation', base+['scripts/p90/p90-targeted-types.d.ts','lib/security/audit-provider-rights-currentness.ts']),
]
rows=[]
for ident,cmd in commands:
  p=subprocess.run(cmd,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
  rows.append({'id':ident,'status':'PASS' if p.returncode==0 else 'FAIL','returnCode':p.returncode,'diagnostic':(p.stdout+p.stderr).strip()[:4000] or None})
failed=[r for r in rows if r['status']!='PASS']
receipt={
  'schemaVersion':'velmere.p90.targeted-strict-typescript.v1',
  'generatedAt':FIXED_AT,
  'status':'PASS_BOUNDED_TARGETED_STRICT_TYPESCRIPT' if not failed else 'FAIL',
  'checks':{'total':len(rows),'passed':len(rows)-len(failed),'failed':len(failed),'rows':rows},
  'environment':{'compiler':'global tsc','scope':'two P90 core implementations','wholeProjectSemanticTypeScript':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING'},
  'truthBoundary':'This compiles the P90 evidence-dimension implementation directly and the P90 rights/currentness implementation against a narrow ambient import contract. It is not whole-project semantic TypeScript, ESLint, production build or exact-Windows proof.',
}
path=ROOT/'receipts/p90/P90_TARGETED_STRICT_TYPESCRIPT.json'
path.parent.mkdir(parents=True,exist_ok=True)
path.write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'status':receipt['status'],'checks':receipt['checks']},indent=2))
raise SystemExit(0 if not failed else 1)
