from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

BASE_COUNT=1597
BASE_PAYLOAD=20988558
PATHSET='b8d9b3c2753e3f7f0c0b3a6054cf8c254d2a91b9c9c5d8f37310add478ac3f73'
BASE_AGG='712aaefaf774d59f3b329cfd107fbbc5519329dd5ad71d3cd2262a1e8042ea9b'
FINAL_PAYLOAD=20988569
FINAL_AGG='4db46e951d3f7f2cc04f61418279b9347bc21b4300b7152aa3e2c77395216252'

FILES={
  'app/api/checkout/vlm-service/readiness/route.ts': {
    'beforeBytes':5194,
    'beforeSha256':'c17cdba840c45c919e21aa5ffbbf79b6d1b838e5281b0c57961e83a5c0fbfd08',
    'afterBytes':5200,
    'afterSha256':'647e63900a14f23af12f56c8e54aec5c4caac669023957164fb4bfd4525ad929',
    'old':'      commercial = tier && family',
    'new':'      const commercial = tier && family',
    'count':1,
  },
  'lib/commerce/vlm-field-level-readiness.ts': {
    'beforeBytes':34191,
    'beforeSha256':'3878c7e9a8f403338c3896fa1e3ddebefcd9324c4712aafd13fb275a11554ab7',
    'afterBytes':34196,
    'afterSha256':'0106ebfca1018494a8930fe6400b99dd1354b5e4c2506498972f48a0765a1159',
    'old':'NO_SAE_SUBSTITUTE',
    'new':'NO_SAFE_SUBSTITUTE',
    'count':5,
  },
}

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
def identity(rows):
    payload=sum(int(r['byteLength']) for r in rows)
    pathset=hashlib.sha256('\n'.join(r['path'] for r in rows).encode()).hexdigest()
    h=hashlib.sha256()
    for r in rows:h.update(f"{r['path']}\0{r['byteLength']}\0{r['sha256']}\n".encode())
    return len(rows),payload,pathset,h.hexdigest()

ap=argparse.ArgumentParser();ap.add_argument('--source-root',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--output-manifest',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args()
root=Path(a.source_root);m=json.loads(Path(a.manifest).read_text(encoding='utf-8'));p=m.get('projection',{})
actual=(p.get('fileCount'),p.get('payloadBytes'),p.get('pathSetSha256'),p.get('sourceContentAggregateSha256'))
if actual!=(BASE_COUNT,BASE_PAYLOAD,PATHSET,BASE_AGG):raise SystemExit(f'P72R3 parent identity mismatch:{actual}')
rows={r['path']:r for r in m['files']};changed=[]
for rel,cfg in FILES.items():
    f=root/rel;b=f.read_bytes()
    if len(b)!=cfg['beforeBytes'] or sha(b)!=cfg['beforeSha256']:raise SystemExit(f'P72R3 source preimage mismatch:{rel}:{len(b)}:{sha(b)}')
    s=b.decode('utf-8')
    if s.count(cfg['old'])!=cfg['count']:raise SystemExit(f"P72R3 replacement anchor mismatch:{rel}:{s.count(cfg['old'])}")
    out=s.replace(cfg['old'],cfg['new']).encode('utf-8')
    if len(out)!=cfg['afterBytes'] or sha(out)!=cfg['afterSha256']:raise SystemExit(f'P72R3 output mismatch:{rel}:{len(out)}:{sha(out)}')
    row=rows.get(rel)
    if not row or int(row['byteLength'])!=cfg['beforeBytes'] or row['sha256']!=cfg['beforeSha256']:raise SystemExit(f'P72R3 manifest preimage mismatch:{rel}')
    f.write_bytes(out);row['byteLength']=cfg['afterBytes'];row['sha256']=cfg['afterSha256']
    changed.append({'path':rel,'beforeSha256':cfg['beforeSha256'],'afterSha256':cfg['afterSha256'],'afterBytes':cfg['afterBytes'],'replacementCount':cfg['count']})
ident=identity(m['files'])
if ident!=(BASE_COUNT,FINAL_PAYLOAD,PATHSET,FINAL_AGG):raise SystemExit(f'P72R3 projection identity mismatch:{ident}')
m['projection']['payloadBytes']=FINAL_PAYLOAD;m['projection']['sourceContentAggregateSha256']=FINAL_AGG
truth='P72R3 repairs only the concrete TypeScript contract defects exposed by exact Windows P72R2: the missing commercial declaration and five invalid alternative-strategy enum literals. Owner-bound 10-family/20-row semantics are unchanged. No final-output, rights, paid-value, sale, LIVE or WORLD_CLASS promotion.'
m['p72r3Delta']={'classification':'TYPESCRIPT_CONTRACT_CORRECTNESS_REPAIR','changedBuildRelevantFiles':changed,'failedRunZeroCredit':'32027667575','customerFinalOutputCredit':0,'rightsCredit':0,'paidValueCredit':0,'saleCredit':0,'live':False,'truthBoundary':truth}
Path(a.output_manifest).write_text(json.dumps(m,indent=2)+'\n',encoding='utf-8')
r={'schemaVersion':'velmere.p72r3.typescript-contract-repair.v1','status':'PASS','changedFiles':changed,'fileCount':ident[0],'payloadBytes':ident[1],'pathSetSha256':ident[2],'aggregateSha256':ident[3],'failedRunZeroCredit':'32027667575','customerFinalOutputCredit':0,'rightsCredit':0,'paidValueCredit':0,'saleCredit':0,'live':False,'truthBoundary':truth}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r,indent=2))
