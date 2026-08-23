from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
BEFORE_SHA='5aad9b936e28e6cff426d32962f096a25555c2984b9947ae84110d7b9a2f3692'
OLD_PAYLOAD='21037218';OLD_AGG='2e6870c204cd47bfe815b7a9e9236bd53fa02d0bd05a24f97a128a937f6c4fed'
NEW_PAYLOAD='21083681';NEW_AGG='15406f94c0c3f89d29100092ba8db6654ce79fd5cc444c55f1daaf03cc40eb9e'
EXPECTED={'fileCount':1605,'payloadBytes':21083696,'pathSetSha256':'cdea67737bc0ae20b0de1968b0dba7736293eebf45c137009d9958eac2354800','sourceContentAggregateSha256':'249e79a1c39cc3e76af3e4152606785e4ff34bc7ac98d7357c2ab081a7c9aeb4'}
def sha(b):return hashlib.sha256(b).hexdigest()
ap=argparse.ArgumentParser();ap.add_argument('--runner',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args();p=Path(a.runner);b=p.read_bytes()
if sha(b)!=BEFORE_SHA:raise SystemExit(f'P79 runner preimage mismatch:{len(b)}:{sha(b)}')
m=json.loads(Path(a.manifest).read_text(encoding='utf-8'))
for k,v in EXPECTED.items():
    if m['projection'].get(k)!=v:raise SystemExit(f'P79 runner manifest mismatch:{k}:{m["projection"].get(k)}:{v}')
s=b.decode('utf-8')
if s.count(OLD_PAYLOAD)!=1 or s.count(OLD_AGG)!=1:raise SystemExit(f'P79 generated anchors mismatch:{s.count(OLD_PAYLOAD)}:{s.count(OLD_AGG)}')
s=s.replace(OLD_PAYLOAD,NEW_PAYLOAD,1).replace(OLD_AGG,NEW_AGG,1);out=s.encode('utf-8');p.write_bytes(out)
r={'schemaVersion':'velmere.p79.reconciled-runner-patch.v1','status':'PASS','inputSha256':BEFORE_SHA,'outputSha256':sha(out),'bytes':len(out),'currentProjection':m['projection'],'generatedNextEnvProjectionPayloadBytes':int(NEW_PAYLOAD),'generatedNextEnvProjectionAggregateSha256':NEW_AGG,'truthBoundary':'P79 runner adaptation binds only exact current projection plus the known deterministic next-env.d.ts mutation. No Customer FINAL/PDF FINAL/rights/value/sale/LIVE promotion.'};Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r,indent=2))
