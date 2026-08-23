from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

BEFORE_SHA='8a4189c865764d68dcd5addffef696702294116bb0773246d886e3e26277196b'
OLD_GENERATED_PAYLOAD='20981064'
NEW_GENERATED_PAYLOAD='20981032'
OLD_GENERATED_AGG='e72e22302786ed1ed687295712b8fd4e3deb382e8ef3d1ce88eab251efac3e42'
NEW_GENERATED_AGG='1cbe5f5896f5ed8ca21f2668b74afab938a7e0e5980f33e0c4a5e363fe7b394c'
CURRENT_PAYLOAD=20981047
CURRENT_AGG='ad00eb69fef750a106ed36828dfa22e5590181e9903d062132596519f494af5d'

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
ap=argparse.ArgumentParser();ap.add_argument('--runner',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args()
p=Path(a.runner);b=p.read_bytes()
if sha(b)!=BEFORE_SHA:raise SystemExit(f'P71R3 runner preimage mismatch:{len(b)}:{sha(b)}')
s=b.decode('utf-8')
for old,new,label in [(OLD_GENERATED_PAYLOAD,NEW_GENERATED_PAYLOAD,'generated_payload'),(OLD_GENERATED_AGG,NEW_GENERATED_AGG,'generated_aggregate')]:
    if s.count(old)!=1:raise SystemExit(f'P71R3 runner anchor mismatch:{label}:{s.count(old)}')
    s=s.replace(old,new,1)
out=s.encode('utf-8');after=sha(out);p.write_bytes(out)
r={'schemaVersion':'velmere.p71r3.current-generated-next-env-policy-runner-patch.v1','status':'PASS','inputSha256':BEFORE_SHA,'outputSha256':after,'bytes':len(out),'currentProjectionPayloadBytes':CURRENT_PAYLOAD,'currentProjectionAggregateSha256':CURRENT_AGG,'generatedNextEnvProjectionPayloadBytes':int(NEW_GENERATED_PAYLOAD),'generatedNextEnvProjectionAggregateSha256':NEW_GENERATED_AGG,'failedRunsZeroCredit':['32017932946','32019595944','32020195719'],'truthBoundary':'P71R3 updates the reconciled exact-Windows controlled next-env identity to the exact final Advanced-automation product bytes. No customer-final, rights, paid-value, sale, LIVE or WORLD_CLASS credit.'}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r,indent=2))
