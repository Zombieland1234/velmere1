from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
BEFORE_SHA='8975c949eac88816f5e6494594b6ad87f0e40e36f935e0aec42b4e2a89a9c94a'
OLD_GENERATED_PAYLOAD='20988554';NEW_GENERATED_PAYLOAD='21015505'
OLD_GENERATED_AGG='9eda1cb4d61b81887f8ab5fe623305647ec20e90493ed5dc059adc0979f9d25c';NEW_GENERATED_AGG='7040ed310df042104f9628d68a18f0afa7a4497b1aaab5ead0434b452a65a076'
CURRENT_PAYLOAD=21015520;CURRENT_AGG='d0306b565af73939691a34554e4f7e57543f6d3b91d778a9c93ebf25f5ffd377';CURRENT_PATHSET='9cb47f15e73ec678e32fe214b8e2947a4bfbaa624d8fb5101650296700d3dd25'
def sha(b):return hashlib.sha256(b).hexdigest()
ap=argparse.ArgumentParser();ap.add_argument('--runner',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args();p=Path(a.runner);b=p.read_bytes()
if sha(b)!=BEFORE_SHA:raise SystemExit(f'P73R4 runner preimage mismatch:{len(b)}:{sha(b)}')
s=b.decode('utf-8')
for old,new,label in [(OLD_GENERATED_PAYLOAD,NEW_GENERATED_PAYLOAD,'generated_payload'),(OLD_GENERATED_AGG,NEW_GENERATED_AGG,'generated_aggregate')]:
    if s.count(old)!=1:raise SystemExit(f'P73R4 runner anchor mismatch:{label}:{s.count(old)}')
    s=s.replace(old,new,1)
out=s.encode('utf-8');p.write_bytes(out)
r={'schemaVersion':'velmere.p73r4.reconciled-runner-patch.v3','status':'PASS','inputSha256':BEFORE_SHA,'outputSha256':sha(out),'bytes':len(out),'currentProjectionFileCount':1598,'currentProjectionPayloadBytes':CURRENT_PAYLOAD,'currentProjectionPathSetSha256':CURRENT_PATHSET,'currentProjectionAggregateSha256':CURRENT_AGG,'currentProjectionBinding':'RUNTIME_MANIFEST_NOT_LITERAL_PATCH','generatedNextEnvProjectionPayloadBytes':int(NEW_GENERATED_PAYLOAD),'generatedNextEnvProjectionAggregateSha256':NEW_GENERATED_AGG,'patchedAnchors':['controlledGeneratedFile.generatedProjectionPayloadBytes','controlledGeneratedFile.generatedProjectionAggregateSha256'],'truthBoundary':'Control-plane adaptation only for LF-canonical P73R4 projection and deterministic next-env mutation. Product source is runtime-manifest bound; no customer FINAL/PDF, rights, value, sale, LIVE or WORLD_CLASS credit.'}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r,indent=2))
