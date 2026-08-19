from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
def identity(rows):
    rows=sorted(rows,key=lambda r:r['path'])
    ps=hashlib.sha256('\n'.join(r['path'] for r in rows).encode()).hexdigest();h=hashlib.sha256()
    for r in rows:h.update(f"{r['path']}\0{r['byteLength']}\0{r['sha256']}\n".encode())
    return {'fileCount':len(rows),'payloadBytes':sum(int(r['byteLength']) for r in rows),'pathSetSha256':ps,'sourceContentAggregateSha256':h.hexdigest()}

def eq_projection(a,b):return all(a.get(k)==b.get(k) for k in ('fileCount','payloadBytes','pathSetSha256','sourceContentAggregateSha256'))

ap=argparse.ArgumentParser();ap.add_argument('--source-root',required=True);ap.add_argument('--parent-manifest',required=True);ap.add_argument('--payload-root',required=True);ap.add_argument('--spec',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args()
root=Path(a.source_root);payload=Path(a.payload_root);spec=json.loads(Path(a.spec).read_text(encoding='utf-8'));parent=json.loads(Path(a.parent_manifest).read_text(encoding='utf-8'))
if not eq_projection(parent['projection'],spec['parentProjection']):raise SystemExit(f"P79 parent projection mismatch:{parent['projection']} != {spec['parentProjection']}")
rows={r['path']:dict(r) for r in parent['files']};changed=[]
for row in spec['files']:
    rel=row['path'];dst=root/rel;src=payload/rel
    if not src.is_file():raise SystemExit(f'P79 payload missing:{rel}')
    new=src.read_bytes();newsha=sha(new)
    if len(new)!=row['newBytes'] or newsha!=row['newSha256']:raise SystemExit(f'P79 payload output mismatch:{rel}:{len(new)}:{newsha}')
    if row['change']=='MODIFY':
        if not dst.is_file():raise SystemExit(f'P79 preimage missing:{rel}')
        old=dst.read_bytes();oldsha=sha(old)
        if len(old)!=row['oldBytes'] or oldsha!=row['oldSha256']:raise SystemExit(f'P79 preimage mismatch:{rel}:{len(old)}:{oldsha}')
    elif row['change']=='ADD':
        if dst.exists():raise SystemExit(f'P79 add preimage unexpectedly exists:{rel}')
        dst.parent.mkdir(parents=True,exist_ok=True)
    else:raise SystemExit(f"P79 unsupported change:{row['change']}:{rel}")
    dst.write_bytes(new);rows[rel]={'path':rel,'byteLength':len(new),'sha256':newsha}
    changed.append({'path':rel,'change':row['change'],'oldBytes':row['oldBytes'],'oldSha256':row['oldSha256'],'newBytes':len(new),'newSha256':newsha})
final_rows=sorted(rows.values(),key=lambda r:r['path']);observed=identity(final_rows)
if not eq_projection(observed,spec['expectedProjection']):raise SystemExit(f"P79 projection mismatch:{observed} != {spec['expectedProjection']}")
manifest=dict(parent);manifest['schemaVersion']='velmere.p79.build-relevant-projection.v1';manifest['classification']='CURRENT_PRODUCT_PROJECTION_P79_HISTORICAL_AUDIT_CUSTOMER_PATH';manifest['projection']=dict(parent['projection']);manifest['projection'].update(observed);manifest['projection']['purpose']='Exact Windows proof for P78 private verified-source plumbing plus P79 deployment-bound historical exploit evidence propagation and deterministic Audit artifact candidate.';manifest['projection']['excludedFromCredit']=['production deployment','current deployment exploitability','real customer FINAL','Audit FINAL PDF accessibility','rights expansion','paid value','sale eligibility','LIVE','world-class proof'];manifest['files']=final_rows;manifest['p79Delta']={'parent':'P77R3','changedBuildRelevantFiles':changed,'historicalExploitGroundTruth':1,'currentExploitability':0,'customerFinal':'0/20','auditFinalPdf':'0/3','live':False,'truthBoundary':spec['truthBoundary']}
Path(a.manifest).write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
receipt={'schemaVersion':'velmere.p79.current-customer-path-source-patch.v1','status':'PASS','parentProjection':spec['parentProjection'],'projection':observed,'changedFiles':changed,'zeroFakeCredit':{'historicalExploitedDeploymentGroundTruth':1,'currentExploitability':0,'customerFinal':'0/20','auditFinalPdf':'0/3','rights':'2/203','paidValue':'0/10','saleEligible':'0/20','live':False},'truthBoundary':spec['truthBoundary']};Path(a.receipt).parent.mkdir(parents=True,exist_ok=True);Path(a.receipt).write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8');print(json.dumps(receipt,indent=2))
