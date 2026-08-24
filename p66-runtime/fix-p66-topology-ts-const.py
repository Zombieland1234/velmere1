from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

TARGET='lib/product/vlm-canonical-product-topology.ts'
BEFORE_SHA='e29792e10ca10f56c752d00f35a7bd08399a21ff084e06eb93f91547786e6e5b'
AFTER_SHA='fc5214b3b9bfb65614e4eb5f47d291ffc773cfadaf65133afc1495cbb18db220'
BYTES=20986
EXPECTED_PAYLOAD=20956802
EXPECTED_PATHSET='b8d9b3c2753e3f7f0c0b3a6054cf8c254d2a91b9c9c5d8f37310add478ac3f73'
EXPECTED_AGG='0778ac3f6ae71785495b8e6bbb228b30d8e3bb10ba73eb9de7d3da7f08a19cd3'
OLD='''}) as const satisfies Readonly<Record<(typeof VLM_CANONICAL_STANDALONE_PRODUCTS)[number], string>>;'''
NEW='''} as const) satisfies Readonly<Record<(typeof VLM_CANONICAL_STANDALONE_PRODUCTS)[number], string>>;'''

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()

ap=argparse.ArgumentParser(); ap.add_argument('--source-root',required=True); ap.add_argument('--manifest',required=True)
a=ap.parse_args(); root=Path(a.source_root); p=root/TARGET
b=p.read_bytes()
if len(b)!=BYTES or sha(b)!=BEFORE_SHA: raise SystemExit(f'topology TS-fix preimage mismatch {len(b)} {sha(b)}')
s=b.decode('utf-8')
if s.count(OLD)!=1: raise SystemExit(f'expected exactly one invalid const assertion, got {s.count(OLD)}')
out=s.replace(OLD,NEW).encode('utf-8')
if len(out)!=BYTES or sha(out)!=AFTER_SHA: raise SystemExit(f'topology TS-fix identity mismatch {len(out)} {sha(out)}')
p.write_bytes(out)
mp=Path(a.manifest); m=json.loads(mp.read_text(encoding='utf-8')); rows=m['files']
hits=[r for r in rows if r['path']==TARGET]
if len(hits)!=1 or hits[0]['byteLength']!=BYTES or hits[0]['sha256']!=BEFORE_SHA: raise SystemExit('manifest topology TS-fix preimage mismatch')
hits[0]['sha256']=AFTER_SHA
m['projection']['sourceContentAggregateSha256']=EXPECTED_AGG
m['schemaVersion']='velmere.p66.owner-corrected-exact-current-build-relevant-projection.v4'
m['p66Delta']['ownerTopology']='10 real product families / 20 customer rows / 5 tiered families / 5 standalone no-tier products / 20 current execution profiles / legacy 33 retired as product-completion denominator; canonical Shield Pro row id; TypeScript const assertion corrected'
pathset=hashlib.sha256('\n'.join(x['path'] for x in rows).encode()).hexdigest(); agg=hashlib.sha256(); payload=0
for x in rows:
    payload+=x['byteLength']; agg.update(f"{x['path']}\0{x['byteLength']}\0{x['sha256']}\n".encode())
if pathset!=EXPECTED_PATHSET or payload!=EXPECTED_PAYLOAD or agg.hexdigest()!=EXPECTED_AGG: raise SystemExit(f'final TS-fix manifest aggregate mismatch {pathset} {payload} {agg.hexdigest()}')
mp.write_text(json.dumps(m,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':'PASS_P66_TOPOLOGY_TYPESCRIPT_CONST_ASSERTION_FIX','topologySha256':AFTER_SHA,'topologyBytes':BYTES,'payloadBytes':EXPECTED_PAYLOAD,'aggregateSha256':EXPECTED_AGG},indent=2))
