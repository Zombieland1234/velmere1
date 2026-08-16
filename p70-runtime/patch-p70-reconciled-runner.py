from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

BEFORE_SHA='c2e347e8be3daf0ec54d3786509e4424746b0e96f36ff4814ef632a12492c815'
OLD_PAYLOAD='20973094'
NEW_PAYLOAD='20973264'
OLD_AGG='c849b13a85258c766b561cb491b6217228ba79345819f74e1a5afa4c9a2bb450'
NEW_AGG='6cf4f3c230cc2049cca0bd1386343cc43e228a3f7632f29de29b8fb5ea6c1413'
CURRENT_PAYLOAD=20973279
CURRENT_AGG='a06455eba15fc74a8f3b04a73d637872d2657d743768fb321a9bb0ae9df68892'

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
ap=argparse.ArgumentParser();ap.add_argument('--runner',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args()
p=Path(a.runner);b=p.read_bytes()
if sha(b)!=BEFORE_SHA: raise SystemExit(f'P70 runner preimage mismatch {len(b)} {sha(b)}')
s=b.decode('utf-8')
if s.count(OLD_PAYLOAD)!=1 or s.count(OLD_AGG)!=1: raise SystemExit('P70 runner generated-next-env preimage mismatch')
s=s.replace(OLD_PAYLOAD,NEW_PAYLOAD).replace(OLD_AGG,NEW_AGG)
if s.count(NEW_PAYLOAD)!=1 or s.count(NEW_AGG)!=1: raise SystemExit('P70 runner generated-next-env output mismatch')
out=s.encode('utf-8');after=sha(out);p.write_bytes(out)
r={'schemaVersion':'velmere.p70.current-generated-next-env-policy-runner-patch.v1','status':'PASS','inputSha256':BEFORE_SHA,'outputSha256':after,'bytes':len(out),'currentProjectionPayloadBytes':CURRENT_PAYLOAD,'currentProjectionAggregateSha256':CURRENT_AGG,'generatedNextEnvProjectionPayloadBytes':int(NEW_PAYLOAD),'generatedNextEnvProjectionAggregateSha256':NEW_AGG,'truthBoundary':'Control-plane adaptation only for exact P70 current product bytes. No customer-final, rights, value, sale, LIVE or WORLD_CLASS credit.'}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
