#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, os, pathlib, stat, sys, unicodedata, zipfile

REV='VELMERE_PASS36_A97R0_STRIPE_TEST_RUNTIME_RECEIPT_REFUND_REPLAY_AND_RECONCILIATION_CONTROL'
PARENT='VELMERE_PASS36_A96R0_RLS_19_CASE_EXECUTABLE_REPLAY_AND_CUSTOMER_ARTIFACT_USER_CLIENT_BOUNDARY'
TS='1980-01-01T00:00:00.000Z'
SOURCE_MANIFEST='_velmere/PASS36_A97R0_SOURCE_ONLY_MANIFEST.json'
MATERIALS_MANIFEST='MANIFESTS/PASS36_A97R0_MATERIALS_MANIFEST.json'
IMMUTABLE_LOG='fixtures/pass35/a42/windows-global-json-crash.log'


def sha256_bytes(data:bytes)->str: return hashlib.sha256(data).hexdigest()
def canonical(value)->bytes: return json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode('utf-8')
def portable(p:pathlib.Path)->str: return p.as_posix()
def mode_for(p:pathlib.Path)->int: return 0o100755 if os.stat(p,follow_symlinks=False).st_mode & 0o111 else 0o100644

def collision_key_casefold(s:str)->str:
    return unicodedata.normalize('NFKC',s).casefold().replace('ß','ss').replace('ς','σ')

def validate_paths(paths:list[str]):
    seen_sets=[('raw',lambda s:s),('nfkc',lambda s:unicodedata.normalize('NFKC',s)),('casefold',collision_key_casefold),('separator',lambda s:s.replace('\\','/'))]
    for label,fn in seen_sets:
        seen={}
        for p in paths:
            if not p or p.startswith('/') or '\\' in p or '\x00' in p or any(x in ('','.','..') for x in p.split('/')):
                raise RuntimeError(f'unsafe_path:{p!r}')
            k=fn(p)
            if k in seen: raise RuntimeError(f'{label}_collision:{seen[k]}:{p}')
            seen[k]=p

def source_excluded(rel:str)->bool:
    top=rel.split('/',1)[0]
    if top in {'.git','.velmere','.next','.turbo','_velmere','artifacts','coverage','node_modules','dist','out','.cache','cache'} or top.startswith('.next-'):
        return True
    segments=rel.split('/')
    base=rel.rsplit('/',1)[-1]
    if '__pycache__' in segments or base.endswith('.pyc'): return True
    if base=='.env' or base.startswith('.env.'): return True
    if base in {'.eslintcache'} or base.endswith('.tsbuildinfo'): return True
    if base.endswith('.log') and rel!=IMMUTABLE_LOG: return True
    if base.endswith(('.db','.sqlite','.sqlite3')): return True
    return False

def collect(root:pathlib.Path, kind:str, manifest_rel:str):
    rows=[]
    for p in sorted(root.rglob('*'),key=lambda x:x.relative_to(root).as_posix()):
        rel=p.relative_to(root).as_posix()
        if rel==manifest_rel: continue
        if p.is_symlink(): raise RuntimeError(f'symlink_forbidden:{rel}')
        if p.is_dir(): continue
        if not p.is_file(): raise RuntimeError(f'special_file_forbidden:{rel}')
        if kind=='source' and source_excluded(rel): continue
        data=p.read_bytes(); rows.append({'path':rel,'byteLength':len(data),'sha256':sha256_bytes(data),'mode':mode_for(p),'_bytes':data})
    paths=[r['path'] for r in rows]; validate_paths(paths)
    return rows

def inventory_fields(rows):
    clean=[{k:r[k] for k in ('path','byteLength','sha256','mode')} for r in rows]
    return clean, sum(r['byteLength'] for r in rows), sha256_bytes('\n'.join(r['path'] for r in rows).encode()), sha256_bytes('\n'.join(f"{r['path']}\0{r['byteLength']}\0{r['sha256']}\0{r['mode']}" for r in rows).encode())

def source_manifest(rows):
    entries,total,pathset,agg=inventory_fields(rows)
    core={'schemaVersion':'velmere.pass36.a97r0.source-only-package-manifest.v1','revisionId':REV,'parentRevisionId':PARENT,'normalizedTimestamp':TS,'fileCount':len(entries),'byteLength':total,'pathSetSha256':pathset,'aggregateSha256':agg,'entries':entries,'manifestPath':SOURCE_MANIFEST,'manifestExcludedFromOwnInventory':True,'checkpointClass':'ACTION_REQUIRED_NON_PASS','completedThrough':89,'a90ToA97PassCredit':False,'exactReleaseCredit':False,'globalDecision':'NO_GO','live':False,'saleEnabled':False,'productionApproved':False,'worldClassProven':False}
    return {**core,'manifestSha256':sha256_bytes(canonical(core))}

def materials_manifest(rows,source_zip:pathlib.Path|None):
    entries,total,pathset,agg=inventory_fields(rows)
    core={'schemaVersion':'velmere.pass36.a97r0.materials-package-manifest.v1','revisionId':REV,'parentRevisionId':PARENT,'normalizedTimestamp':TS,'fileCount':len(entries),'byteLength':total,'pathSetSha256':pathset,'aggregateSha256':agg,'entries':entries,'manifestPath':MATERIALS_MANIFEST,'manifestExcludedFromOwnInventory':True,'checkpointClass':'ACTION_REQUIRED_NON_PASS','globalDecision':'NO_GO','live':False,'saleEnabled':False,'productionApproved':False,'worldClassProven':False,'sourceArchiveBinding':None}
    if source_zip:
        b=source_zip.read_bytes(); core['sourceArchiveBinding']={'fileName':source_zip.name,'byteLength':len(b),'sha256':sha256_bytes(b)}
    return {**core,'manifestSha256':sha256_bytes(canonical(core))}

def write_manifest(root:pathlib.Path,rel:str,value):
    p=root/rel; p.parent.mkdir(parents=True,exist_ok=True); p.write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n',encoding='utf-8'); os.chmod(p,0o644)

def build_zip(root:pathlib.Path,kind:str,out:pathlib.Path,source_zip:pathlib.Path|None):
    manifest_rel=SOURCE_MANIFEST if kind=='source' else MATERIALS_MANIFEST
    rows=collect(root,kind,manifest_rel)
    manifest=source_manifest(rows) if kind=='source' else materials_manifest(rows,source_zip)
    write_manifest(root,manifest_rel,manifest)
    manifest_path=root/manifest_rel
    manifest_data=manifest_path.read_bytes()
    all_rows=rows+[{ 'path':manifest_rel,'byteLength':len(manifest_data),'sha256':sha256_bytes(manifest_data),'mode':0o100644,'_bytes':manifest_data }]
    all_rows.sort(key=lambda r:r['path']); validate_paths([r['path'] for r in all_rows])
    out.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9,strict_timestamps=True) as z:
        for row in all_rows:
            info=zipfile.ZipInfo(row['path'],date_time=(1980,1,1,0,0,0)); info.create_system=3; info.compress_type=zipfile.ZIP_DEFLATED; info.external_attr=(row['mode'] & 0xFFFF)<<16; info.flag_bits|=0x800
            z.writestr(info,row['_bytes'],compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
    b=out.read_bytes(); return {'kind':kind,'output':str(out),'fileName':out.name,'byteLength':len(b),'sha256':sha256_bytes(b),'entries':len(all_rows),'manifestPath':manifest_rel,'manifestSha256':manifest['manifestSha256']}

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--kind',choices=['source','materials'],required=True); ap.add_argument('--root',required=True); ap.add_argument('--output',required=True); ap.add_argument('--source-zip'); args=ap.parse_args()
    result=build_zip(pathlib.Path(args.root).resolve(),args.kind,pathlib.Path(args.output).resolve(),pathlib.Path(args.source_zip).resolve() if args.source_zip else None)
    print(json.dumps(result,indent=2)); return 0
if __name__=='__main__': raise SystemExit(main())
