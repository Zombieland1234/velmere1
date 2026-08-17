from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
BEFORE_SHA='7c65a5011465b6e91c1321893186544a96cc5ddc30b6bf312a45c5d3a56e1433'
OLD_CURRENT_PAYLOAD='20981047';NEW_CURRENT_PAYLOAD='20988558'
OLD_CURRENT_AGG='ad00eb69fef750a106ed36828dfa22e5590181e9903d062132596519f494af5d';NEW_CURRENT_AGG='712aaefaf774d59f3b329cfd107fbbc5519329dd5ad71d3cd2262a1e8042ea9b'
OLD_GENERATED_PAYLOAD='20981032';NEW_GENERATED_PAYLOAD='20988543'
OLD_GENERATED_AGG='1cbe5f5896f5ed8ca21f2668b74afab938a7e0e5980f33e0c4a5e363fe7b394c';NEW_GENERATED_AGG='58ae973a516f0705b97df2ca3f3965d9fa1f231e4bede91b324dbb491b9c4f04'
def sha(b):return hashlib.sha256(b).hexdigest()
ap=argparse.ArgumentParser();ap.add_argument('--runner',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args();p=Path(a.runner);b=p.read_bytes()
if sha(b)!=BEFORE_SHA:raise SystemExit(f'P72 runner preimage mismatch:{len(b)}:{sha(b)}')
s=b.decode('utf-8')
for old,new,label in [(OLD_CURRENT_PAYLOAD,NEW_CURRENT_PAYLOAD,'current-payload'),(OLD_CURRENT_AGG,NEW_CURRENT_AGG,'current-aggregate'),(OLD_GENERATED_PAYLOAD,NEW_GENERATED_PAYLOAD,'generated-payload'),(OLD_GENERATED_AGG,NEW_GENERATED_AGG,'generated-aggregate')]:
    if s.count(old)!=1:raise SystemExit(f'P72 runner anchor mismatch:{label}:{s.count(old)}')
    s=s.replace(old,new,1)
out=s.encode();p.write_bytes(out)
r={'schemaVersion':'velmere.p72.reconciled-runner-patch.v2','status':'PASS','inputSha256':BEFORE_SHA,'outputSha256':sha(out),'bytes':len(out),'currentProjectionPayloadBytes':int(NEW_CURRENT_PAYLOAD),'currentProjectionAggregateSha256':NEW_CURRENT_AGG,'generatedNextEnvProjectionPayloadBytes':int(NEW_GENERATED_PAYLOAD),'generatedNextEnvProjectionAggregateSha256':NEW_GENERATED_AGG,'calibrationReceipt':'P72_OUTPUT_METADATA_CALIBRATION_RECEIPT.json','truthBoundary':'Exact control-plane adaptation for calibrated P72 commercial/readiness measurement bytes only. Product ops are unchanged. No final-output, rights, value, sale, LIVE or WORLD_CLASS credit.'}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r,indent=2))
