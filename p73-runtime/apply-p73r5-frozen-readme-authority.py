from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

BASE_COUNT=1598
BASE_PAYLOAD=21015520
BASE_PATHSET='9cb47f15e73ec678e32fe214b8e2947a4bfbaa624d8fb5101650296700d3dd25'
BASE_AGG='d0306b565af73939691a34554e4f7e57543f6d3b91d778a9c93ebf25f5ffd377'
FINAL_COUNT=1598
FINAL_PAYLOAD=21015244
FINAL_PATHSET=BASE_PATHSET
FINAL_AGG='c65b31b5efb03da359947c2939179b4f41a58cc0a15067770f37ef7e371b7f63'
REL='lib/security/audit-adjudicated-authority-evidence.ts'
BEFORE_BYTES=19749
BEFORE_SHA='0d9ad2b771ad4d19c61853ed5d5562f54c2549b07493690f28edc5383aff6521'
AFTER_BYTES=19473
AFTER_SHA='c65afbd9b51b18d8bd12a39cb856c15faa39073c1979326efb41295713460d0a'
TEMPLATE='p73r5-authority-evidence-source.ts'

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
if actual!=(BASE_COUNT,BASE_PAYLOAD,BASE_PATHSET,BASE_AGG):raise SystemExit(f'P73R5 parent identity mismatch:{actual}')
rows={r['path']:dict(r) for r in m['files']};row=rows.get(REL)
if not row or int(row['byteLength'])!=BEFORE_BYTES or row['sha256']!=BEFORE_SHA:raise SystemExit(f'P73R5 manifest preimage mismatch:{row}')
f=root/REL;b=f.read_bytes()
if len(b)!=BEFORE_BYTES or sha(b)!=BEFORE_SHA:raise SystemExit(f'P73R5 source preimage mismatch:{len(b)}:{sha(b)}')
control=Path(__file__).resolve().parent
template=(control/TEMPLATE).read_text(encoding='utf-8').replace('\r\n','\n').replace('\r','\n').encode('utf-8')
if len(template)!=AFTER_BYTES or sha(template)!=AFTER_SHA:raise SystemExit(f'P73R5 template identity mismatch:{len(template)}:{sha(template)}')
# Safety anchors: replacement must be commit-bound and old mutable API runtime authority must be absent.
text=template.decode('utf-8')
required=[
    'raw.githubusercontent.com/mds1/multicall3/b667d67ecfa5361a81e8f110234ce242613b0012/README.md',
    'frozenRepositoryAuthorityUrlMatches',
    'repo-commit:${reference.sourceRepo}@${reference.sourceCommit}',
    'current_runtime_bytecode_quorum_unavailable',
]
for anchor in required:
    if anchor not in text:raise SystemExit(f'P73R5 required authority anchor missing:{anchor}')
for forbidden in ['api.github.com/repos/mds1/multicall3/issues/comments/2495504312','github-owner:${reference.sourceRepo}','maintainerJson','authorAssociation']:
    if forbidden in text:raise SystemExit(f'P73R5 legacy authority anchor remains:{forbidden}')
f.write_bytes(template);row['byteLength']=AFTER_BYTES;row['sha256']=AFTER_SHA;rows[REL]=row
ident=identity(list(rows.values()))
if ident[:4]!=(FINAL_COUNT,FINAL_PAYLOAD,FINAL_PATHSET,FINAL_AGG):raise SystemExit(f'P73R5 projection identity mismatch:{ident[:4]}')
m['files']=ident[4]
m['projection']['fileCount']=FINAL_COUNT;m['projection']['payloadBytes']=FINAL_PAYLOAD;m['projection']['pathSetSha256']=FINAL_PATHSET;m['projection']['sourceContentAggregateSha256']=FINAL_AGG
truth='P73R5 replaces only the P73R4 project-authority transport: runtime evidence now binds to the exact P70-frozen official Multicall3 README at commit b667d67 instead of the unstable GitHub API issue-comment endpoint. Ancient8 official docs remain the independent second authority root; safe-egress, digest binding, Basic-only supplemental readiness, explicit runtime-unverified blocker, and Pro/Advanced isolation remain unchanged. No customer FINAL/PDF, rights, paid-value, sale, LIVE or WORLD_CLASS promotion.'
m['p73r5Delta']={'classification':'FROZEN_REPOSITORY_PROJECT_AUTHORITY_TRANSPORT_REPAIR','changedBuildRelevantFiles':[{'path':REL,'beforeSha256':BEFORE_SHA,'afterSha256':AFTER_SHA,'afterBytes':AFTER_BYTES}],'customerFinalOutputCredit':0,'auditFinalPdfCredit':0,'rightsCredit':0,'paidValueCredit':0,'saleCredit':0,'live':False,'truthBoundary':truth}
Path(a.output_manifest).write_text(json.dumps(m,indent=2)+'\n',encoding='utf-8')
r={'schemaVersion':'velmere.p73r5.frozen-readme-authority-patch.v1','status':'PASS','changedFile':{'path':REL,'beforeBytes':BEFORE_BYTES,'beforeSha256':BEFORE_SHA,'afterBytes':AFTER_BYTES,'afterSha256':AFTER_SHA},'fileCount':ident[0],'payloadBytes':ident[1],'pathSetSha256':ident[2],'aggregateSha256':ident[3],'customerFinalOutputCredit':0,'auditFinalPdfCredit':0,'rightsCredit':0,'paidValueCredit':0,'saleCredit':0,'live':False,'truthBoundary':truth}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r,indent=2))
