from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

BEFORE_SHA='45e9253e8591dcf412117b54ec1f6d4574da9ec8bd38794d5baf920773ea5606'
OLD_GENERATED_PAYLOAD='20972910'
NEW_GENERATED_PAYLOAD='20973094'
OLD_GENERATED_AGG='5d5670a7a20d1e0ea320c29be3df9a38b75269d9251f304871f941827ccee3be'
NEW_GENERATED_AGG='c849b13a85258c766b561cb491b6217228ba79345819f74e1a5afa4c9a2bb450'
CURRENT_PAYLOAD=20973109
CURRENT_AGG='e0b5f045c7c20f87c0704b6c8fff8be70655ec98e69c5cf2f4f588207b0bab6f'


def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
ap=argparse.ArgumentParser();ap.add_argument('--runner',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args()
p=Path(a.runner);b=p.read_bytes()
if sha(b)!=BEFORE_SHA: raise SystemExit(f'P69R2 runner preimage mismatch {len(b)} {sha(b)}')
s=b.decode('utf-8')
if s.count(OLD_GENERATED_PAYLOAD)!=1 or s.count(OLD_GENERATED_AGG)!=1: raise SystemExit('P69R2 generated-next-env preimage mismatch')
s=s.replace(OLD_GENERATED_PAYLOAD,NEW_GENERATED_PAYLOAD,1).replace(OLD_GENERATED_AGG,NEW_GENERATED_AGG,1)
if s.count(NEW_GENERATED_PAYLOAD)!=1 or s.count(NEW_GENERATED_AGG)!=1: raise SystemExit('P69R2 generated-next-env output mismatch')
out=s.encode('utf-8');after=sha(out);p.write_bytes(out)
r={'schemaVersion':'velmere.p69r2.current-generated-next-env-policy-runner-patch.v1','status':'PASS','inputSha256':BEFORE_SHA,'outputSha256':after,'bytes':len(out),'currentProjectionPayloadBytes':CURRENT_PAYLOAD,'currentProjectionAggregateSha256':CURRENT_AGG,'generatedNextEnvProjectionPayloadBytes':int(NEW_GENERATED_PAYLOAD),'generatedNextEnvProjectionAggregateSha256':NEW_GENERATED_AGG,'truthBoundary':'Control-plane adaptation only for the P69R2 TypeScript-valid Node24 pinned-egress product bytes. It grants no final customer, rights, paid-value, sale, LIVE or WORLD_CLASS credit.'}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8')
print(json.dumps(r,indent=2))
