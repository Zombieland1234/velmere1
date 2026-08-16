from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

BEFORE_SHA='032123359552bac43fae900ca719f19cce4301790ba5aef8a79fe5b4424fe93b'
AFTER_SHA='af7fee5e7b1aabc125dd5c62f75394ba0a4bf4336852568163fadcbea9f6e70a'
AFTER_BYTES=21998
OLD='''  const pinnedLookup: LookupFunction = (_hostname, _options, callback) => {\n    callback(null, pinned.address, pinned.family);\n  };'''
NEW='''  const pinnedLookup: LookupFunction = (_hostname, lookupOptions, callback) => {\n    if (typeof lookupOptions === "object" && lookupOptions !== null && "all" in lookupOptions && lookupOptions.all === true) {\n      const callbackAll = callback as unknown as (\n        error: NodeJS.ErrnoException | null,\n        addresses: Array<{ address: string; family: number }>,\n      ) => void;\n      callbackAll(null, [{ address: pinned.address, family: pinned.family }]);\n      return;\n    }\n    callback(null, pinned.address, pinned.family);\n  };'''
EXPECTED_FILE_COUNT=1597
EXPECTED_PAYLOAD=20973332
EXPECTED_PATHSET='b8d9b3c2753e3f7f0c0b3a6054cf8c254d2a91b9c9c5d8f37310add478ac3f73'
EXPECTED_AGG='eb7808e9779801228894e9f0eb179d816fe30a4810a0f50144ee5094cac7515b'

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
def projection(manifest,root):
    rows=[]; total=0; agg=hashlib.sha256()
    for expected in manifest['files']:
        rel=expected['path']; b=(root/rel).read_bytes(); size=len(b); digest=sha(b)
        rows.append({'path':rel,'byteLength':size,'sha256':digest}); total+=size
        agg.update(f'{rel}\0{size}\0{digest}\n'.encode())
    pathset=sha('\n'.join(r['path'] for r in rows).encode())
    return rows,total,pathset,agg.hexdigest()

ap=argparse.ArgumentParser();ap.add_argument('--source-root',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--output-manifest',required=True);a=ap.parse_args()
root=Path(a.source_root); manifest=json.load(open(a.manifest,encoding='utf-8-sig'))
path=root/'lib/network/safe-egress.ts'; before=path.read_bytes()
if sha(before)!=BEFORE_SHA: raise SystemExit(f'safe-egress preimage mismatch {len(before)} {sha(before)}')
s=before.decode('utf-8')
if s.count(OLD)!=1: raise SystemExit(f'safe-egress patch anchor count {s.count(OLD)}')
out=s.replace(OLD,NEW).encode('utf-8')
if len(out)!=AFTER_BYTES or sha(out)!=AFTER_SHA: raise SystemExit(f'safe-egress output mismatch {len(out)} {sha(out)}')
path.write_bytes(out)
files,total,pathset,aggregate=projection(manifest,root)
if len(files)!=EXPECTED_FILE_COUNT or total!=EXPECTED_PAYLOAD or pathset!=EXPECTED_PATHSET or aggregate!=EXPECTED_AGG:
    raise SystemExit(f'P69R1 projection mismatch files={len(files)} bytes={total} pathset={pathset} agg={aggregate}')
manifest['files']=files
manifest['projection']['fileCount']=len(files);manifest['projection']['payloadBytes']=total;manifest['projection']['pathSetSha256']=pathset;manifest['projection']['sourceContentAggregateSha256']=aggregate
manifest['p69r1SafeEgressDelta']={'changedFiles':[{'path':'lib/network/safe-egress.ts','beforeSha256':BEFORE_SHA,'afterSha256':AFTER_SHA,'afterBytes':AFTER_BYTES}],'generatedNextEnv':{'path':'next-env.d.ts','sourceByteLength':262,'sourceSha256':'e02cf94f68fe440954d3213106a7e943e5424cc867d7cd3ab406dc31263e6767','generatedByteLength':247,'generatedSha256':'7b550dda9686c16f36a17bf9051d5dbf31e98555b30d114ac49fc49a1e712651','generatedProjectionPayloadBytes':20973317,'generatedProjectionAggregateSha256':'eea147d722fd8f552f84597443a40524fb344c10a9de55b19551cbfc29e1c919'},'truthBoundary':'Repairs Node 24 custom DNS lookup all:true semantics for pinned HTTPS without weakening DNS pinning, redirect policy, TLS hostname verification, or allowlist rules. Grants no customer/right/value/sale/LIVE credit by itself.'}
Path(a.output_manifest).write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'schemaVersion':'velmere.p69r1.safe-egress-node24-fix.v1','status':'PASS','changedFile':'lib/network/safe-egress.ts','beforeSha256':BEFORE_SHA,'afterSha256':AFTER_SHA,'projection':manifest['projection'],'generatedNextEnv':manifest['p69r1SafeEgressDelta']['generatedNextEnv'],'truthBoundary':manifest['p69r1SafeEgressDelta']['truthBoundary']},indent=2))
