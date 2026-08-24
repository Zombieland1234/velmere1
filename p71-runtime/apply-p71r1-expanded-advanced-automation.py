from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

BASE_FILE_COUNT=1597
BASE_PAYLOAD=20973841
BASE_PATHSET='b8d9b3c2753e3f7f0c0b3a6054cf8c254d2a91b9c9c5d8f37310add478ac3f73'
BASE_AGG='ac82b075bf53541b4d0a2fcec32e337aa75d007e9db9a82e652ceb447fe4e048'
FINAL_FILE_COUNT=1597
FINAL_PAYLOAD=20981079
FINAL_PATHSET=BASE_PATHSET
FINAL_AGG='95782c40150ef9d4fb86543a0e9e70a3ee3f6ba37b71a7accdb5471841dcb740'
SPEC_SHA='c19d5b270a9f5b6f1f226fcdf05b24e64fa80139cf8b6696f0784ac613119fe7'
PARTS=[f'p71r1-spec.part{i}' for i in range(5)]

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()

def projection_identity(rows):
    payload=sum(int(r['byteLength']) for r in rows)
    pathset=hashlib.sha256('\n'.join(r['path'] for r in rows).encode()).hexdigest()
    agg=hashlib.sha256()
    for r in rows: agg.update(f"{r['path']}\0{r['byteLength']}\0{r['sha256']}\n".encode())
    return len(rows),payload,pathset,agg.hexdigest()

ap=argparse.ArgumentParser()
ap.add_argument('--source-root',required=True)
ap.add_argument('--manifest',required=True)
ap.add_argument('--output-manifest',required=True)
ap.add_argument('--receipt',required=True)
a=ap.parse_args()
root=Path(a.source_root)
manifest=json.loads(Path(a.manifest).read_text(encoding='utf-8'))
proj=manifest.get('projection',{})
actual=(proj.get('fileCount'),proj.get('payloadBytes'),proj.get('pathSetSha256'),proj.get('sourceContentAggregateSha256'))
expected=(BASE_FILE_COUNT,BASE_PAYLOAD,BASE_PATHSET,BASE_AGG)
if actual!=expected: raise SystemExit(f'P71R1 base manifest mismatch: {actual}')
parts_root=Path(__file__).resolve().parent
spec_bytes=''.join((parts_root/p).read_text(encoding='utf-8') for p in PARTS).encode('utf-8')
if sha(spec_bytes)!=SPEC_SHA: raise SystemExit(f'P71R1 patch-spec SHA mismatch {len(spec_bytes)} {sha(spec_bytes)}')
spec=json.loads(spec_bytes.decode('utf-8'))
rows={r['path']:r for r in manifest['files']}
changed=[]
for rel,cfg in spec.items():
    p=root/rel
    before=p.read_bytes()
    if len(before)!=cfg['beforeBytes'] or sha(before)!=cfg['beforeSha256']:
        raise SystemExit(f'P71R1 source preimage mismatch {rel} {len(before)} {sha(before)}')
    lines=before.decode('utf-8').splitlines(keepends=True)
    for op in reversed(cfg['ops']):
        lines[int(op['i1']):int(op['i2'])]=[op['new']] if op['new'] else []
    out=''.join(lines).encode('utf-8')
    if len(out)!=cfg['afterBytes'] or sha(out)!=cfg['afterSha256']:
        raise SystemExit(f'P71R1 source output mismatch {rel} {len(out)} {sha(out)}')
    row=rows.get(rel)
    if not row or row['sha256']!=cfg['beforeSha256'] or int(row['byteLength'])!=cfg['beforeBytes']:
        raise SystemExit(f'P71R1 manifest row preimage mismatch {rel}')
    p.write_bytes(out)
    row['byteLength']=cfg['afterBytes'];row['sha256']=cfg['afterSha256']
    changed.append({'path':rel,'beforeSha256':cfg['beforeSha256'],'afterSha256':cfg['afterSha256'],'afterBytes':cfg['afterBytes']})
identity=projection_identity(manifest['files'])
if identity!=(FINAL_FILE_COUNT,FINAL_PAYLOAD,FINAL_PATHSET,FINAL_AGG):
    raise SystemExit(f'P71R1 projection identity mismatch {identity}')
manifest['projection']['payloadBytes']=FINAL_PAYLOAD
manifest['projection']['pathSetSha256']=FINAL_PATHSET
manifest['projection']['sourceContentAggregateSha256']=FINAL_AGG
truth='P71R1 completes the owner-bound Advanced automation repair across active intake, history, orchestration, source spine/quorum, legacy queue compatibility, customer delivery, optional operator-console observability and PDF wording. Mandatory human review/payment/manual sign-off cannot unlock or block current Advanced; Advanced remains NOT_FOR_SALE. No customer-final, rights, paid-value, sale, LIVE or WORLD_CLASS promotion.'
manifest['p71r1Delta']={'classification':'OWNER_BOUND_ADVANCED_AUTOMATION_ACTIVE_PATH_REPAIR','changedBuildRelevantFiles':changed,'customerFinalOutputCredit':0,'auditFinalCustomerPdfCredit':0,'rightsCredit':0,'paidValueCredit':0,'saleCredit':0,'live':False,'truthBoundary':truth}
Path(a.output_manifest).write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
receipt={'schemaVersion':'velmere.p71r1.expanded-advanced-automation-projection-patch.v1','status':'PASS','patchSpecSha256':SPEC_SHA,'changedFiles':changed,'fileCount':FINAL_FILE_COUNT,'payloadBytes':FINAL_PAYLOAD,'pathSetSha256':FINAL_PATHSET,'aggregateSha256':FINAL_AGG,'failedP71RunZeroCredit':'32017932946','customerFinalOutputCredit':0,'auditFinalCustomerPdfCredit':0,'rightsCredit':0,'paidValueCredit':0,'saleCredit':0,'live':False,'truthBoundary':truth}
Path(a.receipt).write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps(receipt,indent=2))
