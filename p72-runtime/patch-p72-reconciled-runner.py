from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path

BEFORE_SHA='7c65a5011465b6e91c1321893186544a96cc5ddc30b6bf312a45c5d3a56e1433'
CURRENT_PAYLOAD=20988558
CURRENT_AGG='712aaefaf774d59f3b329cfd107fbbc5519329dd5ad71d3cd2262a1e8042ea9b'
OLD_GENERATED_PAYLOAD='20981032'
NEW_GENERATED_PAYLOAD='20988543'
OLD_GENERATED_AGG='1cbe5f5896f5ed8ca21f2668b74afab938a7e0e5980f33e0c4a5e363fe7b394c'
NEW_GENERATED_AGG='58ae973a516f0705b97df2ca3f3965d9fa1f231e4bede91b324dbb491b9c4f04'

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()

ap=argparse.ArgumentParser();ap.add_argument('--runner',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args()
p=Path(a.runner);b=p.read_bytes()
if sha(b)!=BEFORE_SHA:raise SystemExit(f'P72 runner preimage mismatch:{len(b)}:{sha(b)}')
s=b.decode('utf-8')
for old,new,label in [
    (OLD_GENERATED_PAYLOAD,NEW_GENERATED_PAYLOAD,'generated-payload'),
    (OLD_GENERATED_AGG,NEW_GENERATED_AGG,'generated-aggregate'),
]:
    if s.count(old)!=1:raise SystemExit(f'P72 runner anchor mismatch:{label}:{s.count(old)}')
    s=s.replace(old,new,1)
if s.count(NEW_GENERATED_PAYLOAD)!=1 or s.count(NEW_GENERATED_AGG)!=1:
    raise SystemExit('P72 runner calibrated generated identity output mismatch')
out=s.encode('utf-8');p.write_bytes(out)
r={
    'schemaVersion':'velmere.p72.reconciled-runner-patch.v3',
    'status':'PASS',
    'inputSha256':BEFORE_SHA,
    'outputSha256':sha(out),
    'bytes':len(out),
    'currentProjectionPayloadBytes':CURRENT_PAYLOAD,
    'currentProjectionAggregateSha256':CURRENT_AGG,
    'currentProjectionBinding':'RUNTIME_MANIFEST_NOT_LITERAL_PATCH',
    'generatedNextEnvProjectionPayloadBytes':int(NEW_GENERATED_PAYLOAD),
    'generatedNextEnvProjectionAggregateSha256':NEW_GENERATED_AGG,
    'calibrationReceipt':'P72_OUTPUT_METADATA_CALIBRATION_RECEIPT.json',
    'patchedAnchors':['controlledGeneratedFile.generatedProjectionPayloadBytes','controlledGeneratedFile.generatedProjectionAggregateSha256'],
    'truthBoundary':'P72 current product identity is read from the exact runtime manifest and is therefore not patched as a runner literal. This control-plane adaptation changes only the two deterministic next-env.d.ts generated-projection anchors for exact P72 bytes. No product ops, final-output, rights, value, sale, LIVE or WORLD_CLASS credit.'
}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r,indent=2))
