from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

BASE_FILE_COUNT=1597
BASE_PAYLOAD=20981115
BASE_PATHSET='b8d9b3c2753e3f7f0c0b3a6054cf8c254d2a91b9c9c5d8f37310add478ac3f73'
BASE_AGG='51cd449db3554dda727f6ae637949883a4be58b31d95ba9ac60838a284bab519'
FINAL_PAYLOAD=20981047
FINAL_AGG='ad00eb69fef750a106ed36828dfa22e5590181e9903d062132596519f494af5d'
REL='lib/security/audit-source-quorum-runtime.ts'
BEFORE_BYTES=21426
BEFORE_SHA='4a2267199c47dc3cb78e43025c107e5defa4fe2b667414540360e06f4b0f119c'
AFTER_BYTES=21358
AFTER_SHA='707da47be62e60c7731b46cacb065633b3c8b2178aff784bde17e3e9c85387a1'

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
def projection(rows):
    payload=sum(int(r['byteLength']) for r in rows);h=hashlib.sha256()
    for r in rows:h.update(f"{r['path']}\0{r['byteLength']}\0{r['sha256']}\n".encode())
    return len(rows),payload,h.hexdigest()

ap=argparse.ArgumentParser();ap.add_argument('--source-root',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--output-manifest',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args()
root=Path(a.source_root);m=json.loads(Path(a.manifest).read_text(encoding='utf-8'));p=m.get('projection',{})
actual=(p.get('fileCount'),p.get('payloadBytes'),p.get('pathSetSha256'),p.get('sourceContentAggregateSha256'))
if actual!=(BASE_FILE_COUNT,BASE_PAYLOAD,BASE_PATHSET,BASE_AGG):raise SystemExit(f'P71R3 manifest preimage mismatch:{actual}')
f=root/REL;b=f.read_bytes()
if len(b)!=BEFORE_BYTES or sha(b)!=BEFORE_SHA:raise SystemExit(f'P71R3 source preimage mismatch:{len(b)}:{sha(b)}')
s=b.decode('utf-8');old='  const hasDisclosure = Boolean(contactEmail || input.bountyScope);\n'
if s.count(old)!=1:raise SystemExit(f'P71R3 stale-disclosure anchor mismatch:{s.count(old)}')
out=s.replace(old,'',1).encode('utf-8')
if len(out)!=AFTER_BYTES or sha(out)!=AFTER_SHA:raise SystemExit(f'P71R3 source output mismatch:{len(out)}:{sha(out)}')
f.write_bytes(out);row=next((r for r in m['files'] if r['path']==REL),None)
if not row or int(row['byteLength'])!=BEFORE_BYTES or row['sha256']!=BEFORE_SHA:raise SystemExit('P71R3 manifest row mismatch')
row['byteLength']=AFTER_BYTES;row['sha256']=AFTER_SHA
count,payload,agg=projection(m['files'])
if (count,payload,agg)!=(BASE_FILE_COUNT,FINAL_PAYLOAD,FINAL_AGG):raise SystemExit(f'P71R3 projection mismatch:{count}:{payload}:{agg}')
m['projection']['payloadBytes']=FINAL_PAYLOAD;m['projection']['sourceContentAggregateSha256']=FINAL_AGG
truth='P71R3 removes the now-dead disclosure variable after optional human/disclosure evidence was deliberately removed from the current automated Advanced scoring denominator. This is a correctness/lint closure only; prior failed P71/P71R1/P71R2 attempts grant zero current credit. No final-output, rights, paid-value, sale, LIVE or WORLD_CLASS promotion.'
m['p71r3Delta']={'classification':'REMOVE_STALE_HUMAN_DISCLOSURE_SCORING_VARIABLE','changedBuildRelevantFiles':[{'path':REL,'beforeSha256':BEFORE_SHA,'afterSha256':AFTER_SHA,'afterBytes':AFTER_BYTES}],'customerFinalOutputCredit':0,'auditFinalCustomerPdfCredit':0,'rightsCredit':0,'paidValueCredit':0,'saleCredit':0,'live':False,'truthBoundary':truth}
Path(a.output_manifest).write_text(json.dumps(m,indent=2)+'\n',encoding='utf-8')
r={'schemaVersion':'velmere.p71r3.remove-stale-disclosure.v1','status':'PASS','changedFile':m['p71r3Delta']['changedBuildRelevantFiles'][0],'fileCount':count,'payloadBytes':payload,'pathSetSha256':BASE_PATHSET,'aggregateSha256':agg,'failedRunsZeroCredit':['32017932946','32019595944','32020195719'],'customerFinalOutputCredit':0,'auditFinalCustomerPdfCredit':0,'rightsCredit':0,'paidValueCredit':0,'saleCredit':0,'live':False,'truthBoundary':truth}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r,indent=2))
