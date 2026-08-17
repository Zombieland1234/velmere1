from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path

BEFORE_SHA='98721db9e976d0fe8fb2a7985c66db44c0a8891586734dfa87204778afa7eff0'
CURRENT_PAYLOAD=20988569
CURRENT_AGG='4db46e951d3f7f2cc04f61418279b9347bc21b4300b7152aa3e2c77395216252'
OLD_GENERATED_PAYLOAD='20988543'
NEW_GENERATED_PAYLOAD='20988554'
OLD_GENERATED_AGG='58ae973a516f0705b97df2ca3f3965d9fa1f231e4bede91b324dbb491b9c4f04'
NEW_GENERATED_AGG='9eda1cb4d61b81887f8ab5fe623305647ec20e90493ed5dc059adc0979f9d25c'

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
ap=argparse.ArgumentParser();ap.add_argument('--runner',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args()
p=Path(a.runner);b=p.read_bytes()
if sha(b)!=BEFORE_SHA:raise SystemExit(f'P72R3 runner preimage mismatch:{len(b)}:{sha(b)}')
s=b.decode('utf-8')
for old,new,label in [(OLD_GENERATED_PAYLOAD,NEW_GENERATED_PAYLOAD,'generated-payload'),(OLD_GENERATED_AGG,NEW_GENERATED_AGG,'generated-aggregate')]:
    if s.count(old)!=1:raise SystemExit(f'P72R3 runner anchor mismatch:{label}:{s.count(old)}')
    s=s.replace(old,new,1)
if s.count(NEW_GENERATED_PAYLOAD)!=1 or s.count(NEW_GENERATED_AGG)!=1:raise SystemExit('P72R3 runner output identity mismatch')
out=s.encode('utf-8');p.write_bytes(out)
r={'schemaVersion':'velmere.p72r3.reconciled-runner-patch.v1','status':'PASS','inputSha256':BEFORE_SHA,'outputSha256':sha(out),'bytes':len(out),'currentProjectionPayloadBytes':CURRENT_PAYLOAD,'currentProjectionAggregateSha256':CURRENT_AGG,'currentProjectionBinding':'RUNTIME_MANIFEST_NOT_LITERAL_PATCH','generatedNextEnvProjectionPayloadBytes':int(NEW_GENERATED_PAYLOAD),'generatedNextEnvProjectionAggregateSha256':NEW_GENERATED_AGG,'patchedAnchors':['controlledGeneratedFile.generatedProjectionPayloadBytes','controlledGeneratedFile.generatedProjectionAggregateSha256'],'truthBoundary':'Control-plane adaptation only for the two-file P72R3 TypeScript correctness repair. Current product identity remains runtime-manifest bound; only deterministic next-env.d.ts generated identity is patched. No release numerator promotion.'}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r,indent=2))
