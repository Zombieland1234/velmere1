from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

TARGET='lib/product/vlm-canonical-product-topology.ts'
BEFORE_SHA='e0be119fd341dd226a2501ae617f6f399b6b671299654a2344d60cc7e642e042'
BEFORE_BYTES=21001
AFTER_SHA='e29792e10ca10f56c752d00f35a7bd08399a21ff084e06eb93f91547786e6e5b'
AFTER_BYTES=20986
EXPECTED_PAYLOAD=20956802
EXPECTED_PATHSET='b8d9b3c2753e3f7f0c0b3a6054cf8c254d2a91b9c9c5d8f37310add478ac3f73'
EXPECTED_AGG='c512eb907ea6733bba2f932ff23fd4b5e5cf74c07c02c0505ff3bc3fd9604281'

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()

ap=argparse.ArgumentParser(); ap.add_argument('--source-root',required=True); ap.add_argument('--manifest',required=True)
a=ap.parse_args(); root=Path(a.source_root); p=root/TARGET
b=p.read_bytes()
if len(b)!=BEFORE_BYTES or sha(b)!=BEFORE_SHA: raise SystemExit(f'topology pre-finalize mismatch {len(b)} {sha(b)}')
s=b.decode('utf-8')
count=s.count('"shield-pro-tier"')
if count!=3: raise SystemExit(f'expected 3 collision-safe temporary ids, got {count}')
s=s.replace('"shield-pro-tier"','"shield-pro"')
out=s.encode('utf-8')
if len(out)!=AFTER_BYTES or sha(out)!=AFTER_SHA: raise SystemExit(f'topology final identity mismatch {len(out)} {sha(out)}')
p.write_bytes(out)
mp=Path(a.manifest); m=json.loads(mp.read_text(encoding='utf-8')); rows=m['files']
hits=[r for r in rows if r['path']==TARGET]
if len(hits)!=1 or hits[0]['byteLength']!=BEFORE_BYTES or hits[0]['sha256']!=BEFORE_SHA: raise SystemExit('manifest topology pre-finalize mismatch')
hits[0]['byteLength']=AFTER_BYTES; hits[0]['sha256']=AFTER_SHA
m['projection']['payloadBytes']=EXPECTED_PAYLOAD; m['projection']['sourceContentAggregateSha256']=EXPECTED_AGG
m['schemaVersion']='velmere.p66.owner-corrected-exact-current-build-relevant-projection.v3'
m['p66Delta']['ownerTopology']='10 real product families / 20 customer rows / 5 tiered families / 5 standalone no-tier products / 20 current execution profiles / legacy 33 retired as product-completion denominator; Shield family Pro row uses canonical rowId shield-pro'
pathset=hashlib.sha256('\n'.join(x['path'] for x in rows).encode()).hexdigest(); agg=hashlib.sha256(); payload=0
for x in rows:
 payload+=x['byteLength']; agg.update(f"{x['path']}\0{x['byteLength']}\0{x['sha256']}\n".encode())
if pathset!=EXPECTED_PATHSET or payload!=EXPECTED_PAYLOAD or agg.hexdigest()!=EXPECTED_AGG: raise SystemExit(f'final manifest aggregate mismatch {pathset} {payload} {agg.hexdigest()}')
mp.write_text(json.dumps(m,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':'PASS_P66_FINAL_CANONICAL_SHIELD_PRO_ROW_ID','topologySha256':AFTER_SHA,'topologyBytes':AFTER_BYTES,'payloadBytes':EXPECTED_PAYLOAD,'aggregateSha256':EXPECTED_AGG},indent=2))
