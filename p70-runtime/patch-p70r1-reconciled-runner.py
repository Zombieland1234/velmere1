from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

BEFORE_SHA='d594a9b5ef1f1fd84a32566eba7b90d8269f27417f900f6598cdf5162aee8def'
OLD_PAYLOAD='20973264'
NEW_PAYLOAD='20973277'
OLD_AGG='6cf4f3c230cc2049cca0bd1386343cc43e228a3f7632f29de29b8fb5ea6c1413'
NEW_AGG='59c64fedd078e5e4f9f0989f8fe9a973c23ff0dc4cb810b8da564447ad08e172'
CURRENT_PAYLOAD=20973292
CURRENT_AGG='6d400af1c8a042b9f1b9876744dc4e00d8786bb480a989cb78b477674760ee54'

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
ap=argparse.ArgumentParser();ap.add_argument('--runner',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args()
p=Path(a.runner);b=p.read_bytes()
if sha(b)!=BEFORE_SHA: raise SystemExit(f'P70R1 runner preimage mismatch {len(b)} {sha(b)}')
s=b.decode('utf-8')
if s.count(OLD_PAYLOAD)!=1 or s.count(OLD_AGG)!=1: raise SystemExit('P70R1 runner generated-next-env preimage mismatch')
s=s.replace(OLD_PAYLOAD,NEW_PAYLOAD).replace(OLD_AGG,NEW_AGG)
if s.count(NEW_PAYLOAD)!=1 or s.count(NEW_AGG)!=1: raise SystemExit('P70R1 runner generated-next-env output mismatch')
out=s.encode('utf-8');after=sha(out);p.write_bytes(out)
r={'schemaVersion':'velmere.p70r1.current-generated-next-env-policy-runner-patch.v1','status':'PASS','inputSha256':BEFORE_SHA,'outputSha256':after,'bytes':len(out),'currentProjectionPayloadBytes':CURRENT_PAYLOAD,'currentProjectionAggregateSha256':CURRENT_AGG,'generatedNextEnvProjectionPayloadBytes':int(NEW_PAYLOAD),'generatedNextEnvProjectionAggregateSha256':NEW_AGG,'truthBoundary':'Control-plane adaptation only for exact P70R1 current product bytes. No customer-final, rights, value, sale, LIVE or WORLD_CLASS credit.'}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
