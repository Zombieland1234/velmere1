from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
BEFORE_SHA='c09f22c4b3e814166d92e84053ec02779d3c28e8a8199bd07adcbc0a8aa9158c';OLD_PAYLOAD='21035247';OLD_AGG='f8202bd95396d3b43aa03a7393c79790475d3b8260857d55ae270220aa73928c';NEW_PAYLOAD='21035352';NEW_AGG='fd749287df3de54a67bf94a079af19b6449f3b87a3747a6c65fcd6fcbea12250'
def sha(b):return hashlib.sha256(b).hexdigest()
ap=argparse.ArgumentParser();ap.add_argument('--runner',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args();p=Path(a.runner);b=p.read_bytes()
if sha(b)!=BEFORE_SHA:raise SystemExit(f'P76R2 runner preimage mismatch:{len(b)}:{sha(b)}')
m=json.loads(Path(a.manifest).read_text(encoding='utf-8'));s=b.decode('utf-8')
if s.count(OLD_PAYLOAD)!=1 or s.count(OLD_AGG)!=1:raise SystemExit(f'P76R2 generated anchors mismatch:{s.count(OLD_PAYLOAD)}:{s.count(OLD_AGG)}')
s=s.replace(OLD_PAYLOAD,NEW_PAYLOAD,1).replace(OLD_AGG,NEW_AGG,1);out=s.encode('utf-8');p.write_bytes(out)
r={'schemaVersion':'velmere.p76r2.reconciled-runner-patch.v1','status':'PASS','inputSha256':BEFORE_SHA,'outputSha256':sha(out),'bytes':len(out),'currentProjection':m['projection'],'generatedNextEnvProjectionPayloadBytes':int(NEW_PAYLOAD),'generatedNextEnvProjectionAggregateSha256':NEW_AGG,'truthBoundary':'P76R2 runner adaptation only; no customer FINAL/PDF, rights, paid-value, sale, LIVE or WORLD_CLASS credit.'};Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r,indent=2))
