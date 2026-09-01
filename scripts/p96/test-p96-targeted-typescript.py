#!/usr/bin/env python3
from __future__ import annotations
import hashlib
import json
import subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
configs = [
    "tsconfig.p96-risk-history-alignment-targeted.json",
    "tsconfig.p96-risk-history-ui-targeted.json",
    "tsconfig.p96-risk-history-server-targeted.json",
]
rows=[]
logs=ROOT/"artifacts/p96/logs/typescript"; logs.mkdir(parents=True,exist_ok=True)
for i,config in enumerate(configs,1):
    proc=subprocess.run(["tsc","-p",config,"--pretty","false"],cwd=ROOT,text=True,capture_output=True)
    output=(proc.stdout+proc.stderr).replace(str(ROOT),"<ROOT>")
    (logs/f"{i:02d}_{Path(config).stem}.log").write_text(output,encoding="utf-8")
    rows.append({"id":config,"status":"PASS" if proc.returncode==0 else "FAIL","exitCode":proc.returncode,"configSha256":"sha256:"+hashlib.sha256((ROOT/config).read_bytes()).hexdigest(),"diagnostic":output[:4000]})
failed=[r for r in rows if r["status"]!="PASS"]
receipt={
 "schemaVersion":"velmere.p96.targeted-strict-typescript.v1",
 "generatedAt":"2026-08-21T05:00:00.000Z",
 "status":"PASS_BOUNDED_TARGETED_STRICT_TYPESCRIPT" if not failed else "FAIL",
 "checks":{"total":len(rows),"passed":len(rows)-len(failed),"failed":len(failed),"rows":rows},
 "environment":{"typescript":"5.8.3-global","node":"v22.16.0","platform":"linux-x64"},
 "zeroFakeCredit":{"wholeProjectSemanticTypeScript":False,"eslint":False,"webpackBuild":False,"turbopackBuild":False,"exactWindows":False,"customerFinal":"0/20"},
 "truthBoundary":"Targeted strict TypeScript covers the integrated alignment core, request-bound server/client contract and merged RiskHistoryControl under bounded ambient declarations. It does not prove the complete dependency graph, Shield dependency graph, whole-project TypeScript, lint, production builds or exact Windows."
}
for rel in ["receipts/p96/P96_TARGETED_STRICT_TYPESCRIPT.json","artifacts/p96/P96_TARGETED_STRICT_TYPESCRIPT.json"]:
 p=ROOT/rel; p.parent.mkdir(parents=True,exist_ok=True); p.write_text(json.dumps(receipt,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"status":receipt["status"],"checks":receipt["checks"]},indent=2))
raise SystemExit(1 if failed else 0)
