from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

BASE_COUNT=1597
BASE_PAYLOAD=20988569
BASE_PATHSET='b8d9b3c2753e3f7f0c0b3a6054cf8c254d2a91b9c9c5d8f37310add478ac3f73'
BASE_AGG='4db46e951d3f7f2cc04f61418279b9347bc21b4300b7152aa3e2c77395216252'
FINAL_COUNT=1598
FINAL_PAYLOAD=21015520
FINAL_PATHSET='9cb47f15e73ec678e32fe214b8e2947a4bfbaa624d8fb5101650296700d3dd25'
FINAL_AGG='d0306b565af73939691a34554e4f7e57543f6d3b91d778a9c93ebf25f5ffd377'
SPEC_SHA='0784e970b6a77a936cd8414f42a76a0cbf404aaedab1d2511b7c30ae6f6365cd'
NEW_REL='lib/security/audit-adjudicated-authority-evidence.ts'
NEW_BYTES=19749
NEW_SHA='0d9ad2b771ad4d19c61853ed5d5562f54c2549b07493690f28edc5383aff6521'

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
def identity(rows):
    ordered=sorted(rows,key=lambda row:row['path'])
    payload=sum(int(r['byteLength']) for r in ordered)
    pathset=hashlib.sha256('\n'.join(r['path'] for r in ordered).encode()).hexdigest()
    h=hashlib.sha256()
    for r in ordered:h.update(f"{r['path']}\0{r['byteLength']}\0{r['sha256']}\n".encode())
    return len(ordered),payload,pathset,h.hexdigest(),ordered

ap=argparse.ArgumentParser();ap.add_argument('--source-root',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--output-manifest',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args()
root=Path(a.source_root);m=json.loads(Path(a.manifest).read_text(encoding='utf-8'));p=m.get('projection',{})
actual=(p.get('fileCount'),p.get('payloadBytes'),p.get('pathSetSha256'),p.get('sourceContentAggregateSha256'))
if actual!=(BASE_COUNT,BASE_PAYLOAD,BASE_PATHSET,BASE_AGG):raise SystemExit(f'P73R4 parent identity mismatch:{actual}')
control=Path(__file__).resolve().parent
spec_bytes=(control/'p73r4-product-patch-spec.json').read_bytes()
if sha(spec_bytes)!=SPEC_SHA:raise SystemExit(f'P73R4 spec SHA mismatch:{len(spec_bytes)}:{sha(spec_bytes)}')
spec=json.loads(spec_bytes.decode('utf-8'))
rows={r['path']:dict(r) for r in m['files']};changed=[]
for rel,cfg in spec.items():
    f=root/rel;b=f.read_bytes()
    if len(b)!=cfg['beforeBytes'] or sha(b)!=cfg['beforeSha256']:raise SystemExit(f'P73R4 source preimage mismatch:{rel}:{len(b)}:{sha(b)}')
    row=rows.get(rel)
    if not row or int(row['byteLength'])!=cfg['beforeBytes'] or row['sha256']!=cfg['beforeSha256']:raise SystemExit(f'P73R4 manifest preimage mismatch:{rel}')
    lines=b.decode('utf-8').splitlines(keepends=True)
    for op in reversed(cfg['ops']): lines[int(op['i1']):int(op['i2'])]=[op['new']] if op['new'] else []
    out=''.join(lines).encode('utf-8')
    if len(out)!=cfg['afterBytes'] or sha(out)!=cfg['afterSha256']:raise SystemExit(f'P73R4 output mismatch:{rel}:{len(out)}:{sha(out)}')
    f.write_bytes(out);row['byteLength']=cfg['afterBytes'];row['sha256']=cfg['afterSha256'];rows[rel]=row
    changed.append({'path':rel,'beforeSha256':cfg['beforeSha256'],'afterSha256':cfg['afterSha256'],'afterBytes':cfg['afterBytes']})
new_source=(control/'p73r4-new-audit-adjudicated-authority-evidence.ts').read_bytes()
if len(new_source)!=NEW_BYTES or sha(new_source)!=NEW_SHA:raise SystemExit(f'P73R4 new source identity mismatch:{len(new_source)}:{sha(new_source)}')
new_path=root/NEW_REL
if new_path.exists() or NEW_REL in rows:raise SystemExit('P73R4 new source already exists')
new_path.parent.mkdir(parents=True,exist_ok=True);new_path.write_bytes(new_source)
rows[NEW_REL]={'path':NEW_REL,'byteLength':NEW_BYTES,'sha256':NEW_SHA}
changed.append({'path':NEW_REL,'beforeSha256':None,'afterSha256':NEW_SHA,'afterBytes':NEW_BYTES})
ident=identity(list(rows.values()))
if ident[:4]!=(FINAL_COUNT,FINAL_PAYLOAD,FINAL_PATHSET,FINAL_AGG):raise SystemExit(f'P73R4 projection identity mismatch:{ident[:4]}')
m['files']=ident[4]
m['projection']['fileCount']=FINAL_COUNT;m['projection']['payloadBytes']=FINAL_PAYLOAD;m['projection']['pathSetSha256']=FINAL_PATHSET;m['projection']['sourceContentAggregateSha256']=FINAL_AGG
truth='P73R4 adds a server-fetched, digest-bound dual-authority adverse deployment-identity evidence engine, fixes Ancient8 chain binding, projects confirmed authority evidence into claims/risk, and permits that verified authority bundle to supplement Basic readiness only. Existing strict provider-lane semantics are not weakened and Pro/Advanced cannot be unlocked by authority pages alone. No customer FINAL/PDF, rights, paid-value, sale, LIVE or WORLD_CLASS credit is granted by this source patch.'
m['p73r4Delta']={'classification':'ADJUDICATED_DUAL_AUTHORITY_DEPLOYMENT_IDENTITY_ENGINE','changedBuildRelevantFiles':changed,'customerFinalOutputCredit':0,'auditFinalPdfCredit':0,'rightsCredit':0,'paidValueCredit':0,'saleCredit':0,'live':False,'truthBoundary':truth}
Path(a.output_manifest).write_text(json.dumps(m,indent=2)+'\n',encoding='utf-8')
r={'schemaVersion':'velmere.p73r4.adjudicated-authority-engine-patch.v1','status':'PASS','patchSpecSha256':SPEC_SHA,'newSourceSha256':NEW_SHA,'changedFiles':changed,'fileCount':ident[0],'payloadBytes':ident[1],'pathSetSha256':ident[2],'aggregateSha256':ident[3],'customerFinalOutputCredit':0,'auditFinalPdfCredit':0,'rightsCredit':0,'paidValueCredit':0,'saleCredit':0,'live':False,'truthBoundary':truth}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r,indent=2))
