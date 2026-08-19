from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path

def sha(p:Path):return hashlib.sha256(p.read_bytes()).hexdigest()
def walk(root:Path):
    rows=[]
    for p in root.rglob('*'):
        if not p.is_file():continue
        rel=p.relative_to(root).as_posix(); top=rel.split('/')[0]
        if top=='node_modules' or top.startswith('.next'):continue
        rows.append(rel)
    return sorted(rows)
ap=argparse.ArgumentParser();ap.add_argument('--source-root',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args();root=Path(a.source_root);m=json.loads(Path(a.manifest).read_text(encoding='utf-8'));expected={r['path']:r for r in m['files']};actual=walk(root);actualset=set(actual);expset=set(expected);missing=sorted(expset-actualset);unexpected=sorted(actualset-expset);rows=[];mismatch=[]
for rel in sorted(expset & actualset):
    p=root/rel;b=p.stat().st_size;s=sha(p);r={'path':rel,'byteLength':b,'sha256':s};rows.append(r);e=expected[rel]
    if b!=e['byteLength'] or s!=e['sha256']:mismatch.append({'path':rel,'expectedByteLength':e['byteLength'],'actualByteLength':b,'expectedSha256':e['sha256'],'actualSha256':s})
pathset=hashlib.sha256('\n'.join(r['path'] for r in rows).encode()).hexdigest();h=hashlib.sha256()
for r in rows:h.update(f"{r['path']}\0{r['byteLength']}\0{r['sha256']}\n".encode())
observed={'fileCount':len(rows),'payloadBytes':sum(r['byteLength'] for r in rows),'pathSetSha256':pathset,'sourceContentAggregateSha256':h.hexdigest()};exp=m['projection'];passed=not missing and not unexpected and not mismatch and all(observed[k]==exp[k] for k in observed)
receipt={'schemaVersion':'velmere.p79.projection-verification.v1','status':'PASS' if passed else 'FAIL','projection':observed,'expectedProjection':{k:exp[k] for k in observed},'missing':missing,'unexpected':unexpected,'mismatches':mismatch};Path(a.receipt).parent.mkdir(parents=True,exist_ok=True);Path(a.receipt).write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2));raise SystemExit(0 if passed else 1)
