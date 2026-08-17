from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
BEFORE_SHA='7d10a9ae8a3243981e368aa4c468d95230df99fa92e765ad9ae3c543b285657e'
OLD_PAYLOAD='20973277'; NEW_PAYLOAD='20976140'
OLD_AGG='59c64fedd078e5e4f9f0989f8fe9a973c23ff0dc4cb810b8da564447ad08e172'
NEW_AGG='1d21b0453e655cc5ace105ea2ee0284e1b29b84c5b34c83f4d1ee829067df2f9'
CURRENT_PAYLOAD=20976155
CURRENT_AGG='406ef7545190872c7aa97bff31128f0d9496bed388dae950e47d71d0864acb9f'
def sha(b): return hashlib.sha256(b).hexdigest()
ap=argparse.ArgumentParser();ap.add_argument('--runner',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args();p=Path(a.runner);b=p.read_bytes()
if sha(b)!=BEFORE_SHA: raise SystemExit(f'P71 runner preimage mismatch {len(b)} {sha(b)}')
s=b.decode()
if s.count(OLD_PAYLOAD)!=1 or s.count(OLD_AGG)!=1: raise SystemExit('P71 generated-next-env preimage mismatch')
s=s.replace(OLD_PAYLOAD,NEW_PAYLOAD,1).replace(OLD_AGG,NEW_AGG,1);out=s.encode();p.write_bytes(out)
r={'schemaVersion':'velmere.p71.current-generated-next-env-policy-runner-patch.v1','status':'PASS','inputSha256':BEFORE_SHA,'outputSha256':sha(out),'bytes':len(out),'currentProjectionPayloadBytes':CURRENT_PAYLOAD,'currentProjectionAggregateSha256':CURRENT_AGG,'generatedNextEnvProjectionPayloadBytes':int(NEW_PAYLOAD),'generatedNextEnvProjectionAggregateSha256':NEW_AGG,'truthBoundary':'Control-plane adaptation only for exact P71 current product bytes. No customer-final, vulnerability, rights, value, sale, LIVE or WORLD_CLASS credit.'}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
