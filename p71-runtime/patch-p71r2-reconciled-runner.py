from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

BEFORE_SHA='8a4189c865764d68dcd5addffef696702294116bb0773246d886e3e26277196b'
OLD_CURRENT_PAYLOAD='20981079'
NEW_CURRENT_PAYLOAD='20981115'
OLD_CURRENT_AGG='95782c40150ef9d4fb86543a0e9e70a3ee3f6ba37b71a7accdb5471841dcb740'
NEW_CURRENT_AGG='51cd449db3554dda727f6ae637949883a4be58b31d95ba9ac60838a284bab519'
OLD_GENERATED_PAYLOAD='20981064'
NEW_GENERATED_PAYLOAD='20981100'
OLD_GENERATED_AGG='e72e22302786ed1ed687295712b8fd4e3deb382e8ef3d1ce88eab251efac3e42'
NEW_GENERATED_AGG='97c489e3ca1ecbae455a4f4eb109c794355fb1c8efeeee150452e851d126699e'

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
ap=argparse.ArgumentParser();ap.add_argument('--runner',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args()
p=Path(a.runner);b=p.read_bytes()
if sha(b)!=BEFORE_SHA:raise SystemExit(f'P71R2 runner preimage mismatch:{len(b)}:{sha(b)}')
s=b.decode('utf-8')
for old,new,label in [
    (OLD_CURRENT_PAYLOAD,NEW_CURRENT_PAYLOAD,'current_payload'),
    (OLD_CURRENT_AGG,NEW_CURRENT_AGG,'current_aggregate'),
    (OLD_GENERATED_PAYLOAD,NEW_GENERATED_PAYLOAD,'generated_payload'),
    (OLD_GENERATED_AGG,NEW_GENERATED_AGG,'generated_aggregate'),
]:
    if s.count(old)!=1:raise SystemExit(f'P71R2 runner anchor mismatch:{label}:{s.count(old)}')
    s=s.replace(old,new,1)
out=s.encode('utf-8');after=sha(out);p.write_bytes(out)
r={'schemaVersion':'velmere.p71r2.current-generated-next-env-policy-runner-patch.v1','status':'PASS','inputSha256':BEFORE_SHA,'outputSha256':after,'bytes':len(out),'currentProjectionPayloadBytes':int(NEW_CURRENT_PAYLOAD),'currentProjectionAggregateSha256':NEW_CURRENT_AGG,'generatedNextEnvProjectionPayloadBytes':int(NEW_GENERATED_PAYLOAD),'generatedNextEnvProjectionAggregateSha256':NEW_GENERATED_AGG,'failedRunsZeroCredit':['32017932946','32019595944'],'truthBoundary':'P71R2 corrects both the explicit optional-internal-QA source status and the exact controlled Next.js next-env projection identity. It grants no customer-final, rights, paid-value, sale, LIVE or WORLD_CLASS credit.'}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r,indent=2))
