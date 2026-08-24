from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

BASE_FILE_COUNT=1597
BASE_PAYLOAD=20981079
BASE_PATHSET='b8d9b3c2753e3f7f0c0b3a6054cf8c254d2a91b9c9c5d8f37310add478ac3f73'
BASE_AGG='95782c40150ef9d4fb86543a0e9e70a3ee3f6ba37b71a7accdb5471841dcb740'
FINAL_PAYLOAD=20981115
FINAL_AGG='51cd449db3554dda727f6ae637949883a4be58b31d95ba9ac60838a284bab519'
REL='lib/security/audit-source-spine.ts'
BEFORE_BYTES=15996
BEFORE_SHA='d12e06665bb1f74f62d82fdcc33d7b1d8c5cbae9d1b4704b2d15067bc40da00b'
AFTER_BYTES=16032
AFTER_SHA='fe3c97408c3ba1b4cfce199428aab47b07b543e1bcf2d0d41ee39cb0298ace24'

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
def projection(rows):
    payload=sum(int(r['byteLength']) for r in rows)
    h=hashlib.sha256()
    for r in rows:h.update(f"{r['path']}\0{r['byteLength']}\0{r['sha256']}\n".encode())
    return len(rows),payload,h.hexdigest()

ap=argparse.ArgumentParser();ap.add_argument('--source-root',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--output-manifest',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args()
root=Path(a.source_root);m=json.loads(Path(a.manifest).read_text(encoding='utf-8'));p=m.get('projection',{})
actual=(p.get('fileCount'),p.get('payloadBytes'),p.get('pathSetSha256'),p.get('sourceContentAggregateSha256'))
expected=(BASE_FILE_COUNT,BASE_PAYLOAD,BASE_PATHSET,BASE_AGG)
if actual!=expected:raise SystemExit(f'P71R2 manifest preimage mismatch:{actual}')
f=root/REL;b=f.read_bytes()
if len(b)!=BEFORE_BYTES or sha(b)!=BEFORE_SHA:raise SystemExit(f'P71R2 source preimage mismatch:{len(b)}:{sha(b)}')
s=b.decode('utf-8')
old='  | "advanced_manual"\n  | "missing_allowed"\n'
new='  | "advanced_manual"\n  | "optional_internal_qa"\n  | "missing_allowed"\n'
if s.count(old)!=1:raise SystemExit('P71R2 status-union anchor mismatch')
s=s.replace(old,new,1)
old='      status: "unavailable",\n      sourceFamily: "Optional internal QA only; zero customer feature credit",\n'
new='      status: "optional_internal_qa",\n      sourceFamily: "Optional internal QA only; zero customer feature credit",\n'
if s.count(old)!=1:raise SystemExit('P71R2 optional-QA status anchor mismatch')
s=s.replace(old,new,1);out=s.encode('utf-8')
if len(out)!=AFTER_BYTES or sha(out)!=AFTER_SHA:raise SystemExit(f'P71R2 source output mismatch:{len(out)}:{sha(out)}')
f.write_bytes(out)
row=next((r for r in m['files'] if r['path']==REL),None)
if not row or int(row['byteLength'])!=BEFORE_BYTES or row['sha256']!=BEFORE_SHA:raise SystemExit('P71R2 manifest-row preimage mismatch')
row['byteLength']=AFTER_BYTES;row['sha256']=AFTER_SHA
count,payload,agg=projection(m['files'])
if (count,payload,agg)!=(BASE_FILE_COUNT,FINAL_PAYLOAD,FINAL_AGG):raise SystemExit(f'P71R2 projection mismatch:{count}:{payload}:{agg}')
m['projection']['payloadBytes']=FINAL_PAYLOAD;m['projection']['sourceContentAggregateSha256']=FINAL_AGG
truth='P71R2 models optional internal human QA with an explicit non-product source-lane status instead of misusing unavailable or legacy advanced_manual. Optional QA remains outside scoring/customer value/release gates. P71/P71R1 failed exact-Windows runs remain zero credit. No final-output, rights, paid-value, sale, LIVE or WORLD_CLASS promotion.'
m['p71r2Delta']={'classification':'OPTIONAL_INTERNAL_QA_EXPLICIT_NON_PRODUCT_STATUS','changedBuildRelevantFiles':[{'path':REL,'beforeSha256':BEFORE_SHA,'afterSha256':AFTER_SHA,'afterBytes':AFTER_BYTES}],'customerFinalOutputCredit':0,'auditFinalCustomerPdfCredit':0,'rightsCredit':0,'paidValueCredit':0,'saleCredit':0,'live':False,'truthBoundary':truth}
Path(a.output_manifest).write_text(json.dumps(m,indent=2)+'\n',encoding='utf-8')
r={'schemaVersion':'velmere.p71r2.optional-internal-qa-source-lane-status.v1','status':'PASS','changedFile':m['p71r2Delta']['changedBuildRelevantFiles'][0],'fileCount':count,'payloadBytes':payload,'pathSetSha256':BASE_PATHSET,'aggregateSha256':agg,'failedRunsZeroCredit':['32017932946','32019595944'],'customerFinalOutputCredit':0,'auditFinalCustomerPdfCredit':0,'rightsCredit':0,'paidValueCredit':0,'saleCredit':0,'live':False,'truthBoundary':truth}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r,indent=2))
