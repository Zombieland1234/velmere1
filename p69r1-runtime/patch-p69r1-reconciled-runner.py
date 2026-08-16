from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path
BEFORE_SHA='45e9253e8591dcf412117b54ec1f6d4574da9ec8bd38794d5baf920773ea5606'
AFTER_SHA='32f764862c8e8aa8133bca81d5df26fc894a8926ad0d058ad4beaf154a4c5cbc'
OLD_PAYLOAD='20972910';NEW_PAYLOAD='20973317'
OLD_AGG='5d5670a7a20d1e0ea320c29be3df9a38b75269d9251f304871f941827ccee3be';NEW_AGG='eea147d722fd8f552f84597443a40524fb344c10a9de55b19551cbfc29e1c919'
CURRENT_PAYLOAD=20973332;CURRENT_AGG='eb7808e9779801228894e9f0eb179d816fe30a4810a0f50144ee5094cac7515b'
def sha(b): return hashlib.sha256(b).hexdigest()
ap=argparse.ArgumentParser();ap.add_argument('--runner',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args();p=Path(a.runner);b=p.read_bytes()
if len(b)!=18911 or sha(b)!=BEFORE_SHA: raise SystemExit(f'P69R1 runner preimage mismatch {len(b)} {sha(b)}')
s=b.decode();
if s.count(OLD_PAYLOAD)!=1 or s.count(OLD_AGG)!=1: raise SystemExit('P69R1 runner generated-next-env anchor mismatch')
s=s.replace(OLD_PAYLOAD,NEW_PAYLOAD).replace(OLD_AGG,NEW_AGG);out=s.encode();
if len(out)!=18911 or sha(out)!=AFTER_SHA: raise SystemExit(f'P69R1 runner output mismatch {len(out)} {sha(out)}')
p.write_bytes(out)
r={'schemaVersion':'velmere.p69r1.current-generated-next-env-policy-runner-patch.v1','status':'PASS','inputSha256':BEFORE_SHA,'outputSha256':AFTER_SHA,'bytes':len(out),'currentProjectionPayloadBytes':CURRENT_PAYLOAD,'currentProjectionAggregateSha256':CURRENT_AGG,'generatedNextEnvProjectionPayloadBytes':int(NEW_PAYLOAD),'generatedNextEnvProjectionAggregateSha256':NEW_AGG,'truthBoundary':'Control-plane adaptation only. It binds exact next-env.d.ts post-build identity to the P69R1 six-file product source including the Node24 safe-egress fix. No customer/right/value/sale/LIVE credit.'}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
