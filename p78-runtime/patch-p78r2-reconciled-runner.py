from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
BEFORE_SHA='5aad9b936e28e6cff426d32962f096a25555c2984b9947ae84110d7b9a2f3692'
OLD_PAYLOAD='21037218';OLD_AGG='2e6870c204cd47bfe815b7a9e9236bd53fa02d0bd05a24f97a128a937f6c4fed'
NEW_PAYLOAD='21046493';NEW_AGG='d813caafa491beeeb69f61ae381f95f965c8bdcec5cd011c7933062b335fd67c'
EXPECTED={'fileCount':1601,'payloadBytes':21046508,'pathSetSha256':'40b966b3bc2497a1d1d18b967ec867f182f76030af23d15329e42c6057268d59','sourceContentAggregateSha256':'fa003ce6e6280b4027158f0440cbaebe680578a2fa358ab2e91f3b947cfe8a99'}
def sha(b):return hashlib.sha256(b).hexdigest()
ap=argparse.ArgumentParser();ap.add_argument('--runner',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args();p=Path(a.runner);b=p.read_bytes()
if sha(b)!=BEFORE_SHA:raise SystemExit(f'P78R2 runner preimage mismatch:{len(b)}:{sha(b)}')
m=json.loads(Path(a.manifest).read_text(encoding='utf-8'))
for k,v in EXPECTED.items():
 if m['projection'].get(k)!=v:raise SystemExit(f'P78R2 manifest mismatch:{k}:{m["projection"].get(k)}:{v}')
s=b.decode('utf-8')
if s.count(OLD_PAYLOAD)!=1 or s.count(OLD_AGG)!=1:raise SystemExit(f'P78R2 generated anchors mismatch:{s.count(OLD_PAYLOAD)}:{s.count(OLD_AGG)}')
out=s.replace(OLD_PAYLOAD,NEW_PAYLOAD,1).replace(OLD_AGG,NEW_AGG,1).encode('utf-8');p.write_bytes(out)
r={'schemaVersion':'velmere.p78r2.reconciled-runner-patch.v1','status':'PASS','inputSha256':BEFORE_SHA,'outputSha256':sha(out),'bytes':len(out),'currentProjection':m['projection'],'generatedNextEnvProjectionPayloadBytes':int(NEW_PAYLOAD),'generatedNextEnvProjectionAggregateSha256':NEW_AGG,'truthBoundary':'P78R2 runner adaptation only; no customer FINAL/PDF/rights/value/sale/LIVE promotion.'};Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r,indent=2))
