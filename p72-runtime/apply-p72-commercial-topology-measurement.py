from __future__ import annotations
import argparse, base64, hashlib, json
from pathlib import Path

BASE_COUNT=1597
BASE_PAYLOAD=20981047
PATHSET='b8d9b3c2753e3f7f0c0b3a6054cf8c254d2a91b9c9c5d8f37310add478ac3f73'
BASE_AGG='ad00eb69fef750a106ed36828dfa22e5590181e9903d062132596519f494af5d'
FINAL_PAYLOAD=20988558
FINAL_AGG='712aaefaf774d59f3b329cfd107fbbc5519329dd5ad71d3cd2262a1e8042ea9b'
SPEC_SHA='0aa7cf1978f1a30b7ff28b3c84a2ba3e1aa92d86c0a7920a5986385c7a2c5ea0'

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
def identity(rows):
    payload=sum(int(r['byteLength']) for r in rows)
    pathset=hashlib.sha256('\n'.join(r['path'] for r in rows).encode()).hexdigest()
    h=hashlib.sha256()
    for r in rows:h.update(f"{r['path']}\0{r['byteLength']}\0{r['sha256']}\n".encode())
    return len(rows),payload,pathset,h.hexdigest()

ap=argparse.ArgumentParser();ap.add_argument('--source-root',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--output-manifest',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args()
root=Path(a.source_root);m=json.loads(Path(a.manifest).read_text(encoding='utf-8'));p=m.get('projection',{})
actual=(p.get('fileCount'),p.get('payloadBytes'),p.get('pathSetSha256'),p.get('sourceContentAggregateSha256'))
if actual!=(BASE_COUNT,BASE_PAYLOAD,PATHSET,BASE_AGG):raise SystemExit(f'P72 parent identity mismatch:{actual}')
spec_b64=(Path(__file__).resolve().parent/'p72-product-patch-spec.b64').read_text(encoding='utf-8').strip()
spec_bytes=base64.b64decode(spec_b64,validate=True)
if sha(spec_bytes)!=SPEC_SHA:raise SystemExit(f'P72 spec SHA mismatch:{len(spec_bytes)}:{sha(spec_bytes)}')
spec=json.loads(spec_bytes.decode('utf-8'));rows={r['path']:r for r in m['files']};changed=[]
for rel,cfg in spec.items():
    f=root/rel;b=f.read_bytes()
    if len(b)!=cfg['beforeBytes'] or sha(b)!=cfg['beforeSha256']:raise SystemExit(f'P72 source preimage mismatch:{rel}:{len(b)}:{sha(b)}')
    lines=b.decode('utf-8').splitlines(keepends=True)
    for op in reversed(cfg['ops']): lines[int(op['i1']):int(op['i2'])]=[op['new']] if op['new'] else []
    out=''.join(lines).encode('utf-8')
    if len(out)!=cfg['afterBytes'] or sha(out)!=cfg['afterSha256']:raise SystemExit(f'P72 output mismatch:{rel}:{len(out)}:{sha(out)}')
    row=rows.get(rel)
    if not row or int(row['byteLength'])!=cfg['beforeBytes'] or row['sha256']!=cfg['beforeSha256']:raise SystemExit(f'P72 manifest preimage mismatch:{rel}')
    f.write_bytes(out);row['byteLength']=cfg['afterBytes'];row['sha256']=cfg['afterSha256']
    changed.append({'path':rel,'beforeSha256':cfg['beforeSha256'],'afterSha256':cfg['afterSha256'],'afterBytes':cfg['afterBytes']})
ident=identity(m['files'])
if ident!=(BASE_COUNT,FINAL_PAYLOAD,PATHSET,FINAL_AGG):raise SystemExit(f'P72 projection identity mismatch:{ident}')
m['projection']['payloadBytes']=FINAL_PAYLOAD;m['projection']['sourceContentAggregateSha256']=FINAL_AGG
truth='P72 repairs commercial/readiness measurement to the owner-bound 10-family/20-row topology. PDF becomes artifact scope, Shield Pro is independent, standalone products have one customer row with no customer tier, and ambiguous legacy PDF/Shield IDs fail closed. This measurement repair grants zero final-output, rights, paid-value, sale, LIVE or WORLD_CLASS promotion.'
m['p72Delta']={'classification':'OWNER_BOUND_COMMERCIAL_TOPOLOGY_MEASUREMENT_REBIND','changedBuildRelevantFiles':changed,'customerFinalOutputCredit':0,'rightsCredit':0,'paidValueCredit':0,'saleCredit':0,'live':False,'truthBoundary':truth}
Path(a.output_manifest).write_text(json.dumps(m,indent=2)+'\n',encoding='utf-8')
r={'schemaVersion':'velmere.p72.commercial-topology-measurement-patch.v1','status':'PASS','patchSpecSha256':SPEC_SHA,'changedFiles':changed,'fileCount':ident[0],'payloadBytes':ident[1],'pathSetSha256':ident[2],'aggregateSha256':ident[3],'customerFinalOutputCredit':0,'rightsCredit':0,'paidValueCredit':0,'saleCredit':0,'live':False,'truthBoundary':truth}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r,indent=2))
