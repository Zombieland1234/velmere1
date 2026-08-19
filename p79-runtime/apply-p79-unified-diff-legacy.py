from __future__ import annotations
import argparse,base64,gzip,hashlib,json,re
from pathlib import Path

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
def identity(rows):
    rows=sorted(rows,key=lambda r:r['path']); ps=hashlib.sha256('\n'.join(r['path'] for r in rows).encode()).hexdigest(); h=hashlib.sha256()
    for r in rows:h.update(f"{r['path']}\0{r['byteLength']}\0{r['sha256']}\n".encode())
    return {'fileCount':len(rows),'payloadBytes':sum(int(r['byteLength']) for r in rows),'pathSetSha256':ps,'sourceContentAggregateSha256':h.hexdigest()}
def same(a,b):return all(a.get(k)==b.get(k) for k in ('fileCount','payloadBytes','pathSetSha256','sourceContentAggregateSha256'))
HUNK=re.compile(r'^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@')
def apply_file(old:list[str], diff:list[str], rel:str)->list[str]:
    out=[]; cursor=0; i=0
    while i<len(diff):
        m=HUNK.match(diff[i]);
        if not m: raise SystemExit(f'P79 malformed hunk header:{rel}:{diff[i].rstrip()}')
        old_start=int(m.group(1)); old_count=int(m.group(2) or '1'); expected_cursor=0 if old_start==0 else old_start-1
        if expected_cursor<cursor: raise SystemExit(f'P79 overlapping hunk:{rel}')
        out.extend(old[cursor:expected_cursor]); cursor=expected_cursor; consumed=0; i+=1
        while i<len(diff) and not diff[i].startswith('@@ '):
            line=diff[i]
            if line.startswith(' '):
                val=line[1:]
                if cursor>=len(old) or old[cursor]!=val: raise SystemExit(f'P79 context mismatch:{rel}:{cursor+1}')
                out.append(val); cursor+=1; consumed+=1
            elif line.startswith('-'):
                val=line[1:]
                if cursor>=len(old) or old[cursor]!=val: raise SystemExit(f'P79 delete mismatch:{rel}:{cursor+1}')
                cursor+=1; consumed+=1
            elif line.startswith('+'): out.append(line[1:])
            elif line.startswith('\\ No newline at end of file'): pass
            else: raise SystemExit(f'P79 unsupported diff line:{rel}:{line.rstrip()}')
            i+=1
        if consumed!=old_count: raise SystemExit(f'P79 hunk old-count mismatch:{rel}:{consumed}/{old_count}')
    out.extend(old[cursor:]); return out

def parse_patch(text:str):
    lines=text.splitlines(keepends=True); files=[]; i=0
    while i<len(lines):
        if not lines[i].startswith('--- '): i+=1; continue
        old_name=lines[i][4:].strip(); i+=1
        if i>=len(lines) or not lines[i].startswith('+++ '): raise SystemExit('P79 diff missing +++ header')
        new_name=lines[i][4:].strip(); i+=1
        rel=new_name[2:] if new_name.startswith('b/') else new_name
        hunks=[]
        while i<len(lines) and not lines[i].startswith('--- '): hunks.append(lines[i]); i+=1
        files.append((rel,old_name,new_name,hunks))
    return files

ap=argparse.ArgumentParser(); ap.add_argument('--source-root',required=True);ap.add_argument('--parent-manifest',required=True);ap.add_argument('--spec',required=True);ap.add_argument('--patch-b64',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args()
root=Path(a.source_root);spec=json.loads(Path(a.spec).read_text());parent=json.loads(Path(a.parent_manifest).read_text())
if not same(parent['projection'],spec['parentProjection']):raise SystemExit('P79 parent projection mismatch')
for r in spec['files']:
    p=root/r['path']
    if r['change']=='MODIFY':
        if not p.is_file():raise SystemExit(f"P79 preimage missing:{r['path']}")
        b=p.read_bytes();
        if len(b)!=r['oldBytes'] or sha(b)!=r['oldSha256']:raise SystemExit(f"P79 preimage mismatch:{r['path']}:{len(b)}:{sha(b)}")
    elif r['change']=='ADD' and p.exists():raise SystemExit(f"P79 add preimage exists:{r['path']}")
raw=gzip.decompress(base64.b64decode(Path(a.patch_b64).read_text().strip(),validate=True)); patch_sha=sha(raw); parsed=parse_patch(raw.decode('utf-8'))
specmap={r['path']:r for r in spec['files']}
if {r[0] for r in parsed}!=set(specmap):raise SystemExit(f"P79 diff path set mismatch:{sorted(r[0] for r in parsed)}")
changed=[]
for rel,_,_,hunks in parsed:
    row=specmap[rel];p=root/rel; old=[] if row['change']=='ADD' else p.read_text(encoding='utf-8').splitlines(keepends=True); new=''.join(apply_file(old,hunks,rel)).encode('utf-8')
    if len(new)!=row['newBytes'] or sha(new)!=row['newSha256']:raise SystemExit(f'P79 patched output mismatch:{rel}:{len(new)}:{sha(new)}')
    p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(new);changed.append({'path':rel,'change':row['change'],'newBytes':len(new),'newSha256':sha(new)})
rows={r['path']:dict(r) for r in parent['files']}
for r in spec['files']: rows[r['path']]={'path':r['path'],'byteLength':r['newBytes'],'sha256':r['newSha256']}
rows=sorted(rows.values(),key=lambda r:r['path']);observed=identity(rows)
if not same(observed,spec['expectedProjection']):raise SystemExit(f'P79 projection mismatch:{observed}')
manifest=dict(parent);manifest['schemaVersion']='velmere.p79.build-relevant-projection.v1';manifest['classification']='CURRENT_PRODUCT_PROJECTION_P79_HISTORICAL_AUDIT_CUSTOMER_PATH';manifest['projection']=dict(parent['projection']);manifest['projection'].update(observed);manifest['projection']['purpose']='Exact Windows proof for P78 private verified-source plumbing plus P79 deployment-bound historical exploit evidence propagation and deterministic Audit artifact candidate.';manifest['projection']['excludedFromCredit']=['production deployment','current deployment exploitability','real customer FINAL','Audit FINAL PDF accessibility','rights expansion','paid value','sale eligibility','LIVE','world-class proof'];manifest['files']=rows;manifest['p79Delta']={'parent':'P77R3','patchSha256':patch_sha,'changedBuildRelevantFiles':changed,'historicalExploitGroundTruth':1,'currentExploitability':0,'customerFinal':'0/20','auditFinalPdf':'0/3','live':False,'truthBoundary':spec['truthBoundary']}
Path(a.manifest).write_text(json.dumps(manifest,indent=2)+'\n');receipt={'schemaVersion':'velmere.p79.unified-diff-source-patch.v1','status':'PASS','patchSha256':patch_sha,'patchBytes':len(raw),'projection':observed,'changedFiles':changed,'zeroFakeCredit':{'historicalExploitedDeploymentGroundTruth':1,'currentExploitability':0,'customerFinal':'0/20','auditFinalPdf':'0/3','rights':'2/203','paidValue':'0/10','saleEligible':'0/20','live':False},'truthBoundary':spec['truthBoundary']};Path(a.receipt).parent.mkdir(parents=True,exist_ok=True);Path(a.receipt).write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2))
