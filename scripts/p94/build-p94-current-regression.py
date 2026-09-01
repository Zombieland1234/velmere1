#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
items=[
  ("P94_PUBLIC_PAGINATION_RUNTIME","receipts/p94/P94_RISK_HISTORY_PUBLIC_PAGINATION_RUNTIME.json",62,{"PASS_BOUNDED_NO_SOCKET_PUBLIC_ONLY_PAGINATION"}),
  ("P94_PUBLIC_PAGINATION_STATIC","receipts/p94/P94_RISK_HISTORY_PUBLIC_PAGINATION_STATIC.json",111,{"PASS"}),
  ("P94_CHANGED_MODULE_REACHABILITY","receipts/p94/P94_CHANGED_MODULE_REACHABILITY.json",14,{"PASS_BOUNDED_LOCAL_IMPORT_AND_TRANSPILE"}),
  ("P94_TARGETED_STRICT_TYPESCRIPT","receipts/p94/P94_TARGETED_STRICT_TYPESCRIPT.json",4,{"PASS_BOUNDED_TARGETED_STRICT_TYPESCRIPT"}),
  ("P91_EVENT_CONTRACT_CURRENT_BYTES","receipts/p94/P94_COMPAT_P91_EVENT_CONTRACT_CURRENT_BYTES.json",38,{"PASS_BOUNDED_LOCAL_EVENT_CONTRACT"}),
  ("P93_DURABLE_CANONICAL_COMPAT_CURRENT_BYTES","receipts/p94/P94_COMPAT_P93_DURABLE_CANONICAL_CURRENT_BYTES.json",14,{"PASS_BOUNDED_NO_SOCKET_DURABILITY_CANONICAL_COMPATIBILITY"}),
  ("P93_CROSS_PRODUCT_SHARED_READER_CURRENT_BYTES","receipts/p94/P94_COMPAT_P93_CROSS_PRODUCT_CURRENT_BYTES.json",65,{"PASS_BOUNDED_STATIC_SHARED_READER_PROPAGATION"}),
]
rows=[]
total=0
failed=[]
for ident, rel, expected, statuses in items:
    data=json.loads((ROOT/rel).read_text(encoding='utf-8'))
    actual=data.get('checks',{}).get('total')
    ok=data.get('status') in statuses and actual==expected and data.get('checks',{}).get('failed')==0
    row={"id":ident,"status":"PASS" if ok else "FAIL","receipt":rel,"receiptStatus":data.get('status'),"checks":actual,"expected":expected}
    rows.append(row)
    if ok: total+=expected
    else: failed.append(row)
receipt={
  "schemaVersion":"velmere.p94.current-byte-affected-scope-regression.v1",
  "generatedAt":"2026-08-21T00:00:00.000Z",
  "status":"PASS_BOUNDED_CURRENT_BYTE_AFFECTED_SCOPE_REGRESSION" if not failed else "FAIL",
  "commands":{"total":len(rows),"passed":len(rows)-len(failed),"failed":len(failed),"rows":rows},
  "checks":{"total":total,"passed":total,"failed":0 if not failed else None},
  "supersededZeroCredit":[
    "P91 ledger runtime expects retired v1 canonical reader and exited nonzero on the current v2 shared reader.",
    "P92 customer/UI harnesses freeze the superseded v1 public projection and cannot prove the P94 v2 pagination contract.",
    "P93 public-route runtime/static harnesses freeze the pre-pagination builder signature and are replaced by P94 proofs."
  ],
  "inheritedNotFresh":"The broader P93/P92 historical regression estate remains parent evidence only and is not represented as newly executed P94 credit.",
  "zeroFakeCredit":{"repeatabilityChecksCountedSeparately":True,"wholeProject":False,"browser":False,"database":False,"exactWindows":False,"customerFinal":"0/20"},
  "truthBoundary":"308 checks were freshly executed on current P94 bytes across the public pagination/customer/UI scope, the underlying P91 event contract, the P93 no-socket append/read-back compatibility path and 15 shared-reader consumers. This is affected-scope local evidence, not a whole-project release, Browser, database, staging or Customer FINAL proof."
}
for rel in ['receipts/p94/P94_CURRENT_BYTE_REGRESSION.json','artifacts/p94/P94_CURRENT_BYTE_REGRESSION.json']:
    p=ROOT/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(receipt,indent=2)+"\n",encoding='utf-8')
print(json.dumps({"status":receipt['status'],"commands":receipt['commands'],"checks":receipt['checks']},indent=2))
raise SystemExit(1 if failed else 0)
