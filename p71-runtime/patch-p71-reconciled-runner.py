from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

BEFORE_SHA='c2e347e8be3daf0ec54d3786509e4424746b0e96f36ff4814ef632a12492c815'
OLD_GENERATED_PAYLOAD='20973094'
NEW_GENERATED_PAYLOAD='20973826'
OLD_GENERATED_AGG='c849b13a85258c766b561cb491b6217228ba79345819f74e1a5afa4c9a2bb450'
NEW_GENERATED_AGG='12b6a643c8a94d3c46579dd0448d6b2c79aa772912cf6ff5c4b1ebf9e24ca4fe'
CURRENT_PAYLOAD=20973841
CURRENT_AGG='ac82b075bf53541b4d0a2fcec32e337aa75d007e9db9a82e652ceb447fe4e048'

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
ap=argparse.ArgumentParser();ap.add_argument('--runner',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args()
p=Path(a.runner);b=p.read_bytes()
if sha(b)!=BEFORE_SHA: raise SystemExit(f'P71 runner preimage mismatch {len(b)} {sha(b)}')
s=b.decode('utf-8')
if s.count(OLD_GENERATED_PAYLOAD)!=1 or s.count(OLD_GENERATED_AGG)!=1: raise SystemExit('P71 generated-next-env preimage mismatch')
s=s.replace(OLD_GENERATED_PAYLOAD,NEW_GENERATED_PAYLOAD,1).replace(OLD_GENERATED_AGG,NEW_GENERATED_AGG,1)
if s.count(NEW_GENERATED_PAYLOAD)!=1 or s.count(NEW_GENERATED_AGG)!=1: raise SystemExit('P71 generated-next-env output mismatch')
out=s.encode('utf-8');after=sha(out);p.write_bytes(out)
r={'schemaVersion':'velmere.p71.current-generated-next-env-policy-runner-patch.v1','status':'PASS','inputSha256':BEFORE_SHA,'outputSha256':after,'bytes':len(out),'currentProjectionPayloadBytes':CURRENT_PAYLOAD,'currentProjectionAggregateSha256':CURRENT_AGG,'generatedNextEnvProjectionPayloadBytes':int(NEW_GENERATED_PAYLOAD),'generatedNextEnvProjectionAggregateSha256':NEW_GENERATED_AGG,'truthBoundary':'Control-plane adaptation only for P71 owner-bound Advanced automation current product bytes. No customer-final, rights, paid-value, sale, LIVE or WORLD_CLASS credit.'}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r,indent=2))
