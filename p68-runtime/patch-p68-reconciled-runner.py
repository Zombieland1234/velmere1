from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

BEFORE_SHA='080024211d415360e5d83d1bb91a841174684ba6d6b165faa92e45831e75d4e3'
OLD_PAYLOAD='20956787'
NEW_PAYLOAD='20958909'
OLD_AGG='b98854da4f8eec535dc0a0294ff7e7c2ea27f28f1a70a51c820b9758ee98d123'
NEW_AGG='80849d7b41f3e902ed1f1ae033a8b08e83e9ea57f48fa1974465d8ce727d4434'
CURRENT_PAYLOAD=20958924
CURRENT_AGG='d4bddcf0df467142e022e59a0840c37695076be65acd6f29e5339e21a87c574c'

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
ap=argparse.ArgumentParser();ap.add_argument('--runner',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args()
p=Path(a.runner);b=p.read_bytes()
if sha(b)!=BEFORE_SHA: raise SystemExit(f'P68 runner preimage mismatch {len(b)} {sha(b)}')
s=b.decode('utf-8')
if s.count(OLD_PAYLOAD)!=1 or s.count(OLD_AGG)!=1: raise SystemExit('P68 runner generated-next-env preimage mismatch')
s=s.replace(OLD_PAYLOAD,NEW_PAYLOAD).replace(OLD_AGG,NEW_AGG)
if s.count(NEW_PAYLOAD)!=1 or s.count(NEW_AGG)!=1: raise SystemExit('P68 runner generated-next-env output mismatch')
out=s.encode('utf-8');after=sha(out);p.write_bytes(out)
r={'schemaVersion':'velmere.p68.current-generated-next-env-policy-runner-patch.v1','status':'PASS','inputSha256':BEFORE_SHA,'outputSha256':after,'bytes':len(out),'currentProjectionPayloadBytes':CURRENT_PAYLOAD,'currentProjectionAggregateSha256':CURRENT_AGG,'generatedNextEnvProjectionPayloadBytes':int(NEW_PAYLOAD),'generatedNextEnvProjectionAggregateSha256':NEW_AGG,'truthBoundary':'Control-plane adaptation only. It constrains the known deterministic next-env.d.ts rewrite for the P68 current projection and grants no customer, rights, paid-value, sale, LIVE or WORLD_CLASS credit.'}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8')
print(json.dumps(r,indent=2))
