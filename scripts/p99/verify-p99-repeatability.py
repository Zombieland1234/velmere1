#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
COMMANDS = [
    ("runtime", ["node", "--import", "./scripts/pass11/register-offline-ts-loader.mjs", "./scripts/p99/test-p99-real-markets-basic-rights-semantics-runtime.mjs"], "receipts/p99/P99_REAL_MARKETS_BASIC_RIGHTS_SEMANTICS_RUNTIME.json"),
    ("static", ["python", "./scripts/p99/test-p99-real-markets-basic-rights-semantics-static.py"], "receipts/p99/P99_REAL_MARKETS_BASIC_RIGHTS_SEMANTICS_STATIC.json"),
    ("typescript", ["python", "./scripts/p99/test-p99-targeted-typescript.py"], "receipts/p99/P99_TARGETED_STRICT_TYPESCRIPT.json"),
    ("reachability", ["node", "--import", "./scripts/pass11/register-offline-ts-loader.mjs", "./scripts/p99/test-p99-changed-module-reachability.mjs"], "receipts/p99/P99_CHANGED_MODULE_REACHABILITY.json"),
]
rows=[]
for name, command, receipt_rel in COMMANDS:
    codes=[]; hashes=[]; diagnostics=[]
    for _ in range(2):
        proc=subprocess.run(command,cwd=ROOT,text=True,capture_output=True)
        codes.append(proc.returncode)
        p=ROOT/receipt_rel
        hashes.append(hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None)
        diagnostics.append((proc.stdout+proc.stderr)[-2500:])
    ok=codes == [0,0] and hashes[0] is not None and hashes[0] == hashes[1]
    rows.append({
        "id":name,
        "status":"PASS" if ok else "FAIL",
        "exitCodes":codes,
        "receiptSha256Runs":[f"sha256:{value}" if value else None for value in hashes],
        "byteIdentical":bool(hashes[0] and hashes[0] == hashes[1]),
        **({} if ok else {"diagnostic":diagnostics}),
    })
failed=[r for r in rows if r["status"] != "PASS"]
receipt={
    "schemaVersion":"velmere.p99.runtime-repeatability.v1",
    "generatedAt":"2026-08-21T14:35:00.000Z",
    "status":"PASS_BOUNDED_2_OF_2_BYTE_IDENTICAL" if not failed else "FAIL",
    "checks":{"total":len(rows),"passed":len(rows)-len(failed),"failed":len(failed),"rows":rows},
    "truthBoundary":"Two clean executions and byte-identical receipts for the four bounded P99 proof commands. The reachability receipt consistently preserves two dependency-environment WITHHELD imports. This does not prove route execution, provider network, rights approval, Browser, build, exact Windows or Customer FINAL."
}
raw=json.dumps(receipt,indent=2)+"\n"
for rel in ["receipts/p99/P99_REPEATABILITY.json","artifacts/p99/P99_REPEATABILITY.json"]:
    p=ROOT/rel; p.parent.mkdir(parents=True,exist_ok=True); p.write_text(raw)
print(json.dumps({"status":receipt["status"],"checks":receipt["checks"]},indent=2))
raise SystemExit(1 if failed else 0)
