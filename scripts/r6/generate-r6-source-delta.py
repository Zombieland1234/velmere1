#!/usr/bin/env python3
from __future__ import annotations
import argparse, datetime as dt, hashlib, json, os
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
DEFAULT_BASE=Path('/mnt/data/_velmere_r6_base')
EXCLUDED_PREFIXES=('.git/','.velmere/','node_modules/','.next/','.pytest_cache/')
SELF_PATHS={
 'CURRENT_CANDIDATE_CONTENT_MANIFEST.tsv','CURRENT_CANDIDATE_RECEIPT.json',
 'CURRENT_CANDIDATE_TREE_IDENTITY_EXCLUDING_SELF.json','VELMERE_R6_CURRENT_SOURCE_MANIFEST.tsv',
 'artifacts/r6/VELMERE_R6_SOURCE_DELTA_FROM_R4.json','artifacts/r6/VELMERE_R6_SOURCE_DELTA_FROM_R4.tsv',
}

def excluded(rel:str)->bool:
    return rel in SELF_PATHS or rel.startswith(EXCLUDED_PREFIXES) or '/__pycache__/' in f'/{rel}/' or rel.endswith('.pyc')

def inventory(root:Path):
    result={}
    for base,dirs,files in os.walk(root):
        rd=Path(base).relative_to(root)
        dirs[:]=sorted(d for d in dirs if not excluded((rd/d).as_posix()+'/'))
        for name in sorted(files):
            rel=(rd/name).as_posix()
            if excluded(rel): continue
            p=root/rel; data=p.read_bytes()
            result[rel]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
    return result

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--base',default=str(DEFAULT_BASE)); a=ap.parse_args()
    base=Path(a.base).resolve(); before=inventory(base); after=inventory(ROOT)
    added=sorted(set(after)-set(before),key=lambda x:x.encode())
    removed=sorted(set(before)-set(after),key=lambda x:x.encode())
    modified=sorted((set(before)&set(after)),key=lambda x:x.encode())
    modified=[p for p in modified if before[p]['sha256']!=after[p]['sha256']]
    unchanged=len(set(before)&set(after))-len(modified)
    rows=[]
    for status,paths in [('ADDED',added),('MODIFIED',modified),('REMOVED',removed)]:
        for p in paths:
            rows.append({'status':status,'path':p,'before':before.get(p),'after':after.get(p)})
    counts={'added':len(added),'modified':len(modified),'removed':len(removed),'unchanged':unchanged}
    payload={
      'schemaVersion':'velmere.r6.source-delta-from-r4.v1',
      'generatedAt':dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00','Z'),
      'base':'VELMERE_P101R1_V4_AUDITED_CURRENT_SOURCE_CANDIDATE_R4_2026-08-22',
      'candidate':'VELMERE_P101R1_V4_AUDITED_CURRENT_SOURCE_CANDIDATE_R6_2026-08-23',
      'counts':counts,'changedPathCount':len(rows),'beforeFileCount':len(before),'afterFileCount':len(after),
      'excludedSelfPaths':sorted(SELF_PATHS),'runtimeExclusions':list(EXCLUDED_PREFIXES)+['**/__pycache__/**','**/*.pyc'],
      'rows':rows,'truthBoundary':'Byte/hash delta against the physically extracted R4 SOURCE_ONLY. Self-referential R6 delta/manifests and transient runtime directories are excluded.'
    }
    out=ROOT/'artifacts/r6/VELMERE_R6_SOURCE_DELTA_FROM_R4.json'; out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(payload,indent=2,ensure_ascii=False)+'\n')
    tsv='status\tpath\tbefore_bytes\tbefore_sha256\tafter_bytes\tafter_sha256\n'
    for r in rows:
        b=r['before'] or {}; c=r['after'] or {}
        tsv+=f"{r['status']}\t{r['path']}\t{b.get('bytes','')}\t{b.get('sha256','')}\t{c.get('bytes','')}\t{c.get('sha256','')}\n"
    (ROOT/'artifacts/r6/VELMERE_R6_SOURCE_DELTA_FROM_R4.tsv').write_text(tsv)
    print(json.dumps({'counts':counts,'changedPathCount':len(rows),'beforeFileCount':len(before),'afterFileCount':len(after)},indent=2))
if __name__=='__main__': main()
