from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

BEFORE_SHA='ef85eadfc168f557eb2ce42ab94e318f69d411ecd8b3fcf9798c4b40d56bea94'
OLD_GENERATED_PAYLOAD='20973826'
NEW_GENERATED_PAYLOAD='20981064'
OLD_GENERATED_AGG='12b6a643c8a94d3c46579dd0448d6b2c79aa772912cf6ff5c4b1ebf9e24ca4fe'
NEW_GENERATED_AGG='e72e22302786ed1ed687295712b8fd4e3deb382e8ef3d1ce88eab251efac3e42'
CURRENT_PAYLOAD=20981079
CURRENT_AGG='95782c40150ef9d4fb86543a0e9e70a3ee3f6ba37b71a7accdb5471841dcb740'

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
ap=argparse.ArgumentParser();ap.add_argument('--runner',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args()
p=Path(a.runner);b=p.read_bytes()
if sha(b)!=BEFORE_SHA: raise SystemExit(f'P71R1 runner preimage mismatch {len(b)} {sha(b)}')
s=b.decode('utf-8')
if s.count(OLD_GENERATED_PAYLOAD)!=1 or s.count(OLD_GENERATED_AGG)!=1: raise SystemExit('P71R1 generated-next-env preimage mismatch')
s=s.replace(OLD_GENERATED_PAYLOAD,NEW_GENERATED_PAYLOAD,1).replace(OLD_GENERATED_AGG,NEW_GENERATED_AGG,1)
if s.count(NEW_GENERATED_PAYLOAD)!=1 or s.count(NEW_GENERATED_AGG)!=1: raise SystemExit('P71R1 generated-next-env output mismatch')
out=s.encode('utf-8');after=sha(out);p.write_bytes(out)
r={'schemaVersion':'velmere.p71r1.current-generated-next-env-policy-runner-patch.v1','status':'PASS','inputSha256':BEFORE_SHA,'outputSha256':after,'bytes':len(out),'currentProjectionPayloadBytes':CURRENT_PAYLOAD,'currentProjectionAggregateSha256':CURRENT_AGG,'generatedNextEnvProjectionPayloadBytes':int(NEW_GENERATED_PAYLOAD),'generatedNextEnvProjectionAggregateSha256':NEW_GENERATED_AGG,'truthBoundary':'Control-plane adaptation only for exact P71R1 expanded Advanced-automation product bytes. Failed P71 run 32017932946 grants zero credit. No customer-final, rights, paid-value, sale, LIVE or WORLD_CLASS credit.'}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r,indent=2))
