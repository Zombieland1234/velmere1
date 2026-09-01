from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
BEFORE_SHA='298a4c459dd25e9ae5103b51cda1506728f308743582c56b46699179348dcba5'
OLD_GENERATED_PAYLOAD='21037734';OLD_GENERATED_AGG='872ce72e992a9ae54e71f22254231f5ce6eb15cdf692b1c757f83ae283defc40'
NEXT_ENV_PATH='next-env.d.ts';GENERATED_BYTES=247;GENERATED_SHA='7b550dda9686c16f36a17bf9051d5dbf31e98555b30d114ac49fc49a1e712651'
def sha(b):return hashlib.sha256(b).hexdigest()
def generated_identity(m):
 rows=[]
 for r in m['files']:
  row=dict(r)
  if row['path']==NEXT_ENV_PATH:row['byteLength']=GENERATED_BYTES;row['sha256']=GENERATED_SHA
  rows.append(row)
 rows=sorted(rows,key=lambda r:r['path']);payload=sum(int(r['byteLength']) for r in rows);h=hashlib.sha256()
 for r in rows:h.update(f"{r['path']}\0{r['byteLength']}\0{r['sha256']}\n".encode())
 return payload,h.hexdigest()
ap=argparse.ArgumentParser();ap.add_argument('--runner',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args();p=Path(a.runner);b=p.read_bytes()
if sha(b)!=BEFORE_SHA:raise SystemExit(f'P76 runner preimage mismatch:{len(b)}:{sha(b)}')
m=json.loads(Path(a.manifest).read_text());gp,ga=generated_identity(m);s=b.decode()
if s.count(OLD_GENERATED_PAYLOAD)!=1 or s.count(OLD_GENERATED_AGG)!=1:raise SystemExit('P76 generated identity anchors mismatch')
s=s.replace(OLD_GENERATED_PAYLOAD,str(gp),1).replace(OLD_GENERATED_AGG,ga,1);out=s.encode();p.write_bytes(out)
r={'schemaVersion':'velmere.p76.reconciled-runner-patch.v1','status':'PASS','inputSha256':BEFORE_SHA,'outputSha256':sha(out),'bytes':len(out),'currentProjection':m['projection'],'generatedNextEnvProjectionPayloadBytes':gp,'generatedNextEnvProjectionAggregateSha256':ga,'truthBoundary':'P76 exact-runner adaptation only; no customer FINAL/PDF, rights, paid-value, sale, LIVE or WORLD_CLASS credit.'}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
