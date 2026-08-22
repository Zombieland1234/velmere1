from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path

BEFORE_SHA='1cbe49331bd231761513f1997575608e30fabe4b9d7acbd9de18273d2b680c48'
OLD_GENERATED_PAYLOAD='21015505'
OLD_GENERATED_AGG='7040ed310df042104f9628d68a18f0afa7a4497b1aaab5ead0434b452a65a076'
NEXT_ENV_PATH='next-env.d.ts'
GENERATED_BYTES=247
GENERATED_SHA='7b550dda9686c16f36a17bf9051d5dbf31e98555b30d114ac49fc49a1e712651'

def sha(b):return hashlib.sha256(b).hexdigest()
def generated_identity(m):
    rows=[]
    for r in m['files']:
        row=dict(r)
        if row['path']==NEXT_ENV_PATH:
            row['byteLength']=GENERATED_BYTES;row['sha256']=GENERATED_SHA
        rows.append(row)
    rows=sorted(rows,key=lambda r:r['path']);payload=sum(int(r['byteLength']) for r in rows);h=hashlib.sha256()
    for r in rows:h.update(f"{r['path']}\0{r['byteLength']}\0{r['sha256']}\n".encode())
    return payload,h.hexdigest()

ap=argparse.ArgumentParser();ap.add_argument('--runner',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args()
p=Path(a.runner);b=p.read_bytes()
if sha(b)!=BEFORE_SHA:raise SystemExit(f'P73R7 runner preimage mismatch:{len(b)}:{sha(b)}')
m=json.loads(Path(a.manifest).read_text(encoding='utf-8'));current=m['projection'];gp,ga=generated_identity(m)
s=b.decode('utf-8')
if s.count(OLD_GENERATED_PAYLOAD)!=1:raise SystemExit(f'P73R7 generated payload anchor mismatch:{s.count(OLD_GENERATED_PAYLOAD)}')
if s.count(OLD_GENERATED_AGG)!=1:raise SystemExit(f'P73R7 generated aggregate anchor mismatch:{s.count(OLD_GENERATED_AGG)}')
s=s.replace(OLD_GENERATED_PAYLOAD,str(gp),1).replace(OLD_GENERATED_AGG,ga,1)
out=s.encode('utf-8');p.write_bytes(out)
r={'schemaVersion':'velmere.p73r7.reconciled-runner-patch.v1','status':'PASS','inputSha256':BEFORE_SHA,'outputSha256':sha(out),'bytes':len(out),'currentProjectionFileCount':current['fileCount'],'currentProjectionPayloadBytes':current['payloadBytes'],'currentProjectionPathSetSha256':current['pathSetSha256'],'currentProjectionAggregateSha256':current['sourceContentAggregateSha256'],'currentProjectionBinding':'RUNTIME_MANIFEST_NOT_LITERAL_PATCH','generatedNextEnvProjectionPayloadBytes':gp,'generatedNextEnvProjectionAggregateSha256':ga,'patchedAnchors':['controlledGeneratedFile.generatedProjectionPayloadBytes','controlledGeneratedFile.generatedProjectionAggregateSha256'],'truthBoundary':'Manifest-bound control-plane adaptation for exact P73R7 product bytes. It computes only the deterministic next-env.d.ts generated identity and grants no customer FINAL/PDF, rights, paid-value, sale, LIVE or WORLD_CLASS credit.'}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r,indent=2))
