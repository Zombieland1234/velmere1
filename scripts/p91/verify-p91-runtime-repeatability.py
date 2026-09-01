#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
NODE=["node","--import","./scripts/pass11/register-offline-ts-loader.mjs"]
CASES=[
    ("risk_history_contract", NODE+["scripts/p91/test-p91-risk-history-contract-runtime.mjs"], ROOT/"receipts/p91/P91_RISK_HISTORY_CONTRACT_RUNTIME.json"),
    ("risk_history_ledger", NODE+["scripts/p91/test-p91-risk-history-ledger-runtime.mjs"], ROOT/"receipts/p91/P91_RISK_HISTORY_LEDGER_RUNTIME.json"),
]
def digest(data: bytes)->str: return hashlib.sha256(data).hexdigest()
rows=[]
for ident,cmd,receipt_path in CASES:
    executions=[]
    for run_index in (1,2):
        run=subprocess.run(cmd,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        receipt=receipt_path.read_bytes() if receipt_path.exists() else b""
        executions.append({
            "run":run_index,
            "returnCode":run.returncode,
            "stdoutSha256":digest(run.stdout),
            "stderrSha256":digest(run.stderr),
            "receiptSha256":digest(receipt),
            "stdoutBytes":len(run.stdout),
            "receiptBytes":len(receipt),
        })
    identical=(executions[0]["stdoutSha256"]==executions[1]["stdoutSha256"] and executions[0]["stderrSha256"]==executions[1]["stderrSha256"] and executions[0]["receiptSha256"]==executions[1]["receiptSha256"])
    passed=all(row["returnCode"]==0 for row in executions) and identical
    rows.append({"id":ident,"status":"PASS" if passed else "FAIL","byteIdentical":identical,"executions":executions})
failed=[row for row in rows if row["status"]!="PASS"]
receipt={
    "schemaVersion":"velmere.p91.runtime-repeatability.v1",
    "generatedAt":"2026-08-20T18:58:00.000Z",
    "status":"PASS_2_OF_2_BYTE_IDENTICAL" if not failed else "FAIL",
    "checks":{"total":len(rows)*5,"passed":len(rows)*5 if not failed else sum(5 for row in rows if row["status"]=="PASS"),"failed":len(failed)*5,"rows":rows},
    "truthBoundary":"Two local executions of each P91 runtime harness produced identical stdout, stderr and receipt bytes. This does not prove database, network, staging, production or exact-Windows determinism.",
}
for target in [ROOT/'receipts/p91/P91_RUNTIME_REPEATABILITY.json',ROOT/'artifacts/p91/P91_RUNTIME_REPEATABILITY.json']:
    target.parent.mkdir(parents=True,exist_ok=True); target.write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({"status":receipt["status"],"checks":receipt["checks"]},indent=2))
raise SystemExit(0 if not failed else 1)
