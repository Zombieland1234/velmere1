#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
configs = [
    "tsconfig.p91-risk-history-core.json",
    "tsconfig.p92-risk-history-customer-client.json",
    "tsconfig.p94-risk-history-server-targeted.json",
    "tsconfig.p94-risk-history-ui-targeted.json",
]
rows=[]
logs=ROOT/"artifacts/p94/logs/typescript"
logs.mkdir(parents=True,exist_ok=True)
for index, config in enumerate(configs, start=1):
    proc=subprocess.run(["tsc","-p",config,"--pretty","false"],cwd=ROOT,text=True,capture_output=True)
    output=(proc.stdout+proc.stderr).replace(str(ROOT),"<ROOT>")
    (logs/f"{index:02d}_{Path(config).stem}.log").write_text(output,encoding="utf-8")
    rows.append({
        "id": config,
        "status": "PASS" if proc.returncode==0 else "FAIL",
        "exitCode": proc.returncode,
        "configSha256": "sha256:"+hashlib.sha256((ROOT/config).read_bytes()).hexdigest(),
        "diagnostic": output[:4000],
    })
failed=[r for r in rows if r["status"]!="PASS"]
receipt={
    "schemaVersion":"velmere.p94.targeted-strict-typescript.v1",
    "generatedAt":"2026-08-21T00:00:00.000Z",
    "status":"PASS_BOUNDED_TARGETED_STRICT_TYPESCRIPT" if not failed else "FAIL",
    "checks":{"total":len(rows),"passed":len(rows)-len(failed),"failed":len(failed),"rows":rows},
    "environment":{"typescript":"5.8.3-global","node":"v22.16.0","platform":"linux-x64"},
    "zeroFakeCredit":{"wholeProjectSemanticTypeScript":False,"eslint":False,"webpackBuild":False,"turbopackBuild":False,"exactWindows":False,"customerFinal":"0/20"},
    "truthBoundary":"Targeted strict TypeScript covers the P91 core, P92 customer parser, P94 server/public pagination and P94 UI contracts under bounded ambient declarations. It does not prove the complete Next/React dependency graph, whole-project semantic TypeScript, lint, production builds or exact Windows.",
}
for rel in ["receipts/p94/P94_TARGETED_STRICT_TYPESCRIPT.json","artifacts/p94/P94_TARGETED_STRICT_TYPESCRIPT.json"]:
    p=ROOT/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(receipt,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"status":receipt["status"],"checks":receipt["checks"]},indent=2))
raise SystemExit(1 if failed else 0)
