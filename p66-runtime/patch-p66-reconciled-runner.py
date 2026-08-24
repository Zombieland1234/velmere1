from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

BEFORE_SHA='805d80391fd2b4def259e896e1aadcd3b4bbe130c6374a5bc28a00f760abb6d2'
AFTER_SHA='080024211d415360e5d83d1bb91a841174684ba6d6b165faa92e45831e75d4e3'
BYTES=18911
OLD_PAYLOAD='20952819'
NEW_PAYLOAD='20956787'
OLD_AGG='1faa444439bff86564eb95bf283c91eca829053d16de70628c45df9d25eda405'
NEW_AGG='b98854da4f8eec535dc0a0294ff7e7c2ea27f28f1a70a51c820b9758ee98d123'

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()

ap=argparse.ArgumentParser(); ap.add_argument('--runner',required=True); ap.add_argument('--receipt',required=True)
a=ap.parse_args(); p=Path(a.runner); b=p.read_bytes()
if len(b)!=BYTES or sha(b)!=BEFORE_SHA: raise SystemExit(f'runner preimage mismatch {len(b)} {sha(b)}')
s=b.decode('utf-8')
if s.count(OLD_PAYLOAD)!=1 or s.count(OLD_AGG)!=1: raise SystemExit('runner generated-projection policy preimage mismatch')
s=s.replace(OLD_PAYLOAD,NEW_PAYLOAD).replace(OLD_AGG,NEW_AGG)
out=s.encode('utf-8')
if len(out)!=BYTES or sha(out)!=AFTER_SHA: raise SystemExit(f'runner output identity mismatch {len(out)} {sha(out)}')
p.write_bytes(out)
r={'schemaVersion':'velmere.p66.current-generated-next-env-policy-runner-patch.v1','status':'PASS','inputSha256':BEFORE_SHA,'outputSha256':AFTER_SHA,'bytes':BYTES,'currentProjectionPayloadBytes':20956802,'currentProjectionAggregateSha256':'0778ac3f6ae71785495b8e6bbb228b30d8e3bb10ba73eb9de7d3da7f08a19cd3','generatedNextEnvProjectionPayloadBytes':20956787,'generatedNextEnvProjectionAggregateSha256':NEW_AGG,'truthBoundary':'Control-plane adaptation only: updates the P60 reconciled runner expected one-file next-env.d.ts generated identity to the current P66 projection. It does not change product source or grant customer/value/rights/sale/LIVE credit.'}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8')
print(json.dumps(r,indent=2))
