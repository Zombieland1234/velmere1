from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
BEFORE_SHA='f3ea2a940ed7e6f0359c9dd2df34626d34a57bb21751fcd35f7b3d760dfa63ce'
OLD_PAYLOAD='21035352';OLD_AGG='fd749287df3de54a67bf94a079af19b6449f3b87a3747a6c65fcd6fcbea12250'
NEW_PAYLOAD='21037218';NEW_AGG='2e6870c204cd47bfe815b7a9e9236bd53fa02d0bd05a24f97a128a937f6c4fed'
def sha(b):return hashlib.sha256(b).hexdigest()
ap=argparse.ArgumentParser();ap.add_argument('--runner',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args();p=Path(a.runner);b=p.read_bytes()
if sha(b)!=BEFORE_SHA:raise SystemExit(f'P77 runner preimage mismatch:{len(b)}:{sha(b)}')
m=json.loads(Path(a.manifest).read_text(encoding='utf-8'));s=b.decode('utf-8')
if s.count(OLD_PAYLOAD)!=1 or s.count(OLD_AGG)!=1:raise SystemExit(f'P77 generated anchors mismatch:{s.count(OLD_PAYLOAD)}:{s.count(OLD_AGG)}')
s=s.replace(OLD_PAYLOAD,NEW_PAYLOAD,1).replace(OLD_AGG,NEW_AGG,1);out=s.encode();p.write_bytes(out)
r={'schemaVersion':'velmere.p77.reconciled-runner-patch.v1','status':'PASS','inputSha256':BEFORE_SHA,'outputSha256':sha(out),'bytes':len(out),'currentProjection':m['projection'],'generatedNextEnvProjectionPayloadBytes':int(NEW_PAYLOAD),'generatedNextEnvProjectionAggregateSha256':NEW_AGG,'truthBoundary':'P77 runner adaptation only; no customer FINAL/PDF/rights/value/sale/LIVE promotion.'};Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r,indent=2))
