#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, os, subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
NODE=["node","--import","./scripts/pass11/register-offline-ts-loader.mjs"]
CASES=[
    {"id":"runtime","cmd":NODE+["scripts/p94/test-p94-risk-history-public-pagination-runtime.mjs"],"receipt":"receipts/p94/P94_RISK_HISTORY_PUBLIC_PAGINATION_RUNTIME.json"},
    {"id":"static","cmd":["python3","scripts/p94/test-p94-risk-history-public-pagination-static.py"],"receipt":"receipts/p94/P94_RISK_HISTORY_PUBLIC_PAGINATION_STATIC.json"},
    {"id":"reachability","cmd":NODE+["scripts/p94/test-p94-changed-module-reachability.mjs"],"receipt":"receipts/p94/P94_CHANGED_MODULE_REACHABILITY.json"},
    {"id":"targeted_typescript","cmd":["python3","scripts/p94/test-p94-targeted-typescript.py"],"receipt":"receipts/p94/P94_TARGETED_STRICT_TYPESCRIPT.json"},
]
logs=ROOT/"artifacts/p94/logs/repeatability"; logs.mkdir(parents=True,exist_ok=True)
rows=[]
for case in CASES:
    runs=[]
    for run in (1,2):
        proc=subprocess.run(case["cmd"],cwd=ROOT,text=True,capture_output=True,env={**os.environ,"NO_COLOR":"1","TERM":"dumb"})
        output=(proc.stdout+proc.stderr).replace(str(ROOT),"<ROOT>")
        (logs/f"{case['id']}_run{run}.log").write_text(output,encoding="utf-8")
        receipt_path=ROOT/case["receipt"]
        receipt_bytes=receipt_path.read_bytes() if receipt_path.exists() else b""
        runs.append({
            "exitCode":proc.returncode,
            "stdoutSha256":"sha256:"+hashlib.sha256(output.encode()).hexdigest(),
            "receiptSha256":"sha256:"+hashlib.sha256(receipt_bytes).hexdigest(),
            "receiptBytes":len(receipt_bytes),
        })
    stable=runs[0]==runs[1] and runs[0]["exitCode"]==0
    rows.append({"id":case["id"],"status":"PASS" if stable else "FAIL","runs":runs})
failed=[row for row in rows if row["status"]!="PASS"]
receipt={
    "schemaVersion":"velmere.p94.runtime-repeatability.v1",
    "generatedAt":"2026-08-21T00:00:00.000Z",
    "status":"PASS_2_OF_2_BYTE_IDENTICAL" if not failed else "FAIL",
    "checks":{"total":len(rows),"passed":len(rows)-len(failed),"failed":len(failed),"rows":rows},
    "zeroFakeCredit":{"flakinessAdjudicatedOnlyForListedBoundedCommands":True,"wholeProject":False,"browser":False,"database":False,"exactWindows":False,"customerFinal":"0/20"},
    "truthBoundary":"This verifies two consecutive byte-identical executions for the four listed P94 bounded commands. It does not establish whole-project determinism, Browser determinism, PostgreSQL determinism, exact Windows or Customer FINAL.",
}
for rel in ["receipts/p94/P94_RUNTIME_REPEATABILITY.json","artifacts/p94/P94_RUNTIME_REPEATABILITY.json"]:
    p=ROOT/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(receipt,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"status":receipt["status"],"checks":receipt["checks"]},indent=2))
raise SystemExit(1 if failed else 0)
