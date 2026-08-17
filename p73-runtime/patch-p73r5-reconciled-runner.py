from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path

BEFORE_SHA='1cbe49331bd231761513f1997575608e30fabe4b9d7acbd9de18273d2b680c48'
OLD_GENERATED_PAYLOAD='21015505'
NEW_GENERATED_PAYLOAD='21015229'
OLD_GENERATED_AGG='7040ed310df042104f9628d68a18f0afa7a4497b1aaab5ead0434b452a65a076'
NEW_GENERATED_AGG='9a35dffe5b69481699e8b0d4c8b494b280560dfc05522181f9a2d98e0439f0a9'
CURRENT_PAYLOAD=21015244
CURRENT_AGG='c65b31b5efb03da359947c2939179b4f41a58cc0a15067770f37ef7e371b7f63'
CURRENT_PATHSET='9cb47f15e73ec678e32fe214b8e2947a4bfbaa624d8fb5101650296700d3dd25'

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
ap=argparse.ArgumentParser();ap.add_argument('--runner',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args();p=Path(a.runner);b=p.read_bytes()
if sha(b)!=BEFORE_SHA:raise SystemExit(f'P73R5 runner preimage mismatch:{len(b)}:{sha(b)}')
s=b.decode('utf-8')
for old,new,label in [(OLD_GENERATED_PAYLOAD,NEW_GENERATED_PAYLOAD,'generated_payload'),(OLD_GENERATED_AGG,NEW_GENERATED_AGG,'generated_aggregate')]:
    if s.count(old)!=1:raise SystemExit(f'P73R5 runner anchor mismatch:{label}:{s.count(old)}')
    s=s.replace(old,new,1)
out=s.encode('utf-8');p.write_bytes(out)
r={'schemaVersion':'velmere.p73r5.reconciled-runner-patch.v1','status':'PASS','inputSha256':BEFORE_SHA,'outputSha256':sha(out),'bytes':len(out),'currentProjectionFileCount':1598,'currentProjectionPayloadBytes':CURRENT_PAYLOAD,'currentProjectionPathSetSha256':CURRENT_PATHSET,'currentProjectionAggregateSha256':CURRENT_AGG,'currentProjectionBinding':'RUNTIME_MANIFEST_NOT_LITERAL_PATCH','generatedNextEnvProjectionPayloadBytes':int(NEW_GENERATED_PAYLOAD),'generatedNextEnvProjectionAggregateSha256':NEW_GENERATED_AGG,'patchedAnchors':['controlledGeneratedFile.generatedProjectionPayloadBytes','controlledGeneratedFile.generatedProjectionAggregateSha256'],'truthBoundary':'Control-plane adaptation only for P73R5 frozen-README authority projection and deterministic next-env mutation. Product source remains runtime-manifest bound; no customer FINAL/PDF, rights, paid-value, sale, LIVE or WORLD_CLASS credit.'}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r,indent=2))
