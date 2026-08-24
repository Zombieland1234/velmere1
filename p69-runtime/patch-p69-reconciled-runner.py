from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

BEFORE_SHA='424656f758839f659e53fa7c5a8597ef26aed744ef65e3110958ee3c16d4bfac'
OLD_PAYLOAD='20958752'
NEW_PAYLOAD='20972910'
OLD_AGG='6f75972cdef164a84410455732822dda6a552581a9a1ff59c5c4a10fa41444cf'
NEW_AGG='5d5670a7a20d1e0ea320c29be3df9a38b75269d9251f304871f941827ccee3be'
CURRENT_PAYLOAD=20972925
CURRENT_AGG='5454819675a912e9791e143d48d61385622e1ab3f494253ea28c6a9a10895d71'

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
ap=argparse.ArgumentParser();ap.add_argument('--runner',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args()
p=Path(a.runner);b=p.read_bytes()
if sha(b)!=BEFORE_SHA: raise SystemExit(f'P69 runner preimage mismatch {len(b)} {sha(b)}')
s=b.decode('utf-8')
if s.count(OLD_PAYLOAD)!=1 or s.count(OLD_AGG)!=1: raise SystemExit('P69 runner generated-next-env preimage mismatch')
s=s.replace(OLD_PAYLOAD,NEW_PAYLOAD).replace(OLD_AGG,NEW_AGG)
if s.count(NEW_PAYLOAD)!=1 or s.count(NEW_AGG)!=1: raise SystemExit('P69 runner generated-next-env output mismatch')
out=s.encode('utf-8');after=sha(out);p.write_bytes(out)
r={'schemaVersion':'velmere.p69.current-generated-next-env-policy-runner-patch.v1','status':'PASS','inputSha256':BEFORE_SHA,'outputSha256':after,'bytes':len(out),'currentProjectionPayloadBytes':CURRENT_PAYLOAD,'currentProjectionAggregateSha256':CURRENT_AGG,'generatedNextEnvProjectionPayloadBytes':int(NEW_PAYLOAD),'generatedNextEnvProjectionAggregateSha256':NEW_AGG,'truthBoundary':'Control-plane adaptation only. It constrains the known deterministic next-env.d.ts rewrite for the P69 current projection and grants no customer-final, paid-value, sale, LIVE or WORLD_CLASS credit.'}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8')
print(json.dumps(r,indent=2))
