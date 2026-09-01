#!/usr/bin/env python3
from __future__ import annotations
import json, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
COMMANDS=[
    ("risk_history_core", ["tsc","-p","tsconfig.p91-risk-history-core.json"]),
    ("risk_history_ledger_and_route", ["tsc","-p","tsconfig.p91-risk-history-server-targeted.json"]),
]
rows=[]
for ident,cmd in COMMANDS:
    run=subprocess.run(cmd,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    rows.append({"id":ident,"status":"PASS" if run.returncode==0 else "FAIL","returnCode":run.returncode,"diagnostic":(run.stdout+run.stderr).strip()[:8000] or None})
failed=[row for row in rows if row["status"]!="PASS"]
receipt={
    "schemaVersion":"velmere.p91.targeted-strict-typescript.v1",
    "generatedAt":"2026-08-20T18:56:00.000Z",
    "status":"PASS_BOUNDED_TARGETED_STRICT_TYPESCRIPT" if not failed else "FAIL",
    "checks":{"total":len(rows),"passed":len(rows)-len(failed),"failed":len(failed),"rows":rows},
    "environment":{"compiler":"global tsc 5.8.3","wholeProjectSemanticTypeScript":"WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING","eslint":"WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING","productionBuilds":"WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING","exactWindows":"WITHHELD"},
    "truthBoundary":"Two narrow P91 TypeScript scopes compile under explicit ambient contracts. This is not whole-project semantic TypeScript, ESLint, Webpack/Turbopack or exact-Windows proof.",
}
for target in [ROOT/'receipts/p91/P91_TARGETED_STRICT_TYPESCRIPT.json',ROOT/'artifacts/p91/P91_TARGETED_STRICT_TYPESCRIPT.json']:
    target.parent.mkdir(parents=True,exist_ok=True); target.write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({"status":receipt["status"],"checks":receipt["checks"]},indent=2))
raise SystemExit(0 if not failed else 1)
