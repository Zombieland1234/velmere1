#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, pathlib, stat, unicodedata, zipfile

REV="VELMERE_PASS36_A95R0_STAGING_SUBJECT_REBIND_ENVIRONMENT_ISOLATION_AND_ZERO_MUTATION_PREFLIGHT"
SOURCE_MANIFEST='_velmere/PASS36_A95R0_SOURCE_ONLY_MANIFEST.json'
MATERIALS_MANIFEST='MANIFESTS/PASS36_A95R0_MATERIALS_MANIFEST.json'

def sha(data:bytes)->str:return hashlib.sha256(data).hexdigest()
def canonical(v)->bytes:return json.dumps(v,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
def safe_path(p:str)->bool:return bool(p) and not p.startswith('/') and '\\' not in p and '\x00' not in p and all(s not in ('','.','..') for s in p.split('/'))
def key(p:str)->str:return unicodedata.normalize('NFKC',p).casefold().replace('ß','ss').replace('ς','σ')

def inspect_zip(path:pathlib.Path,kind:str):
    manifest_rel=SOURCE_MANIFEST if kind=='source' else MATERIALS_MANIFEST
    checks=[]; failures=[]
    def add(i,ok,d=None):
        checks.append({'id':i,'passed':bool(ok),'detail':d})
        if not ok: failures.append({'id':i,'detail':d})
    raw=path.read_bytes(); add('archive_nonempty',len(raw)>0,len(raw))
    with zipfile.ZipFile(path) as z:
        infos=z.infolist(); names=[i.filename for i in infos]
        add('crc',z.testzip() is None,z.testzip())
        add('paths_safe',all(safe_path(n) for n in names),[n for n in names if not safe_path(n)][:30])
        add('raw_unique',len(names)==len(set(names)),len(names)-len(set(names)))
        folded=[key(n) for n in names]; add('nfkc_casefold_unique',len(folded)==len(set(folded)),len(folded)-len(set(folded)))
        add('not_encrypted',all(not (i.flag_bits&1) for i in infos),None)
        syms=[i.filename for i in infos if stat.S_IFMT((i.external_attr>>16)&0xFFFF)==stat.S_IFLNK]
        add('no_symlinks',not syms,syms[:30])
        add('manifest_present',manifest_rel in names,manifest_rel)
        manifest=json.loads(z.read(manifest_rel))
        core=dict(manifest); declared=core.pop('manifestSha256',None); add('manifest_self_hash',declared==sha(canonical(core)),{'declared':declared,'actual':sha(canonical(core))})
        add('manifest_revision',manifest.get('revisionId')==REV,manifest.get('revisionId'))
        add('manifest_no_promotion',manifest.get('checkpointClass')=='ACTION_REQUIRED_NON_PASS' and manifest.get('globalDecision')=='NO_GO' and manifest.get('live') is False and manifest.get('saleEnabled') is False and manifest.get('productionApproved') is False and manifest.get('worldClassProven') is False,None)
        entries=manifest.get('entries',[]); declared_rows={e['path']:e for e in entries}; actual_names=[n for n in names if n!=manifest_rel]
        add('entry_order',actual_names==sorted(actual_names),None)
        add('exact_path_set',actual_names==[e['path'] for e in entries],{'declared':len(entries),'actual':len(actual_names)})
        mismatches=[]
        for info in infos:
            if info.filename==manifest_rel:continue
            data=z.read(info.filename); mode=(info.external_attr>>16)&0xFFFF; row={'path':info.filename,'byteLength':len(data),'sha256':sha(data),'mode':mode}
            if declared_rows.get(info.filename)!=row:mismatches.append({'path':info.filename,'declared':declared_rows.get(info.filename),'actual':row})
        add('all_entry_bytes_modes',not mismatches,mismatches[:30])
        add('manifest_count',manifest.get('fileCount')==len(entries),None)
        add('manifest_bytes',manifest.get('byteLength')==sum(e['byteLength'] for e in entries),None)
        pathset=sha('\n'.join(e['path'] for e in entries).encode()); agg=sha('\n'.join(f"{e['path']}\0{e['byteLength']}\0{e['sha256']}\0{e['mode']}" for e in entries).encode())
        add('manifest_pathset',manifest.get('pathSetSha256')==pathset,None); add('manifest_aggregate',manifest.get('aggregateSha256')==agg,None)
    return {'kind':kind,'fileName':path.name,'byteLength':len(raw),'sha256':sha(raw),'entries':len(infos),'manifestSha256':declared,'sourceArchiveBinding':manifest.get('sourceArchiveBinding'),'checks':len(checks),'passed':len(checks)-len(failures),'failed':len(failures),'failures':failures}

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--source-zip',required=True);ap.add_argument('--materials-zip',required=True);ap.add_argument('--output');args=ap.parse_args()
    source=inspect_zip(pathlib.Path(args.source_zip).resolve(),'source');materials=inspect_zip(pathlib.Path(args.materials_zip).resolve(),'materials')
    binding=materials.get('sourceArchiveBinding') or {}; binding_ok=binding.get('fileName')==source['fileName'] and binding.get('byteLength')==source['byteLength'] and binding.get('sha256')==source['sha256']
    failures=[]
    if source['failed']:failures.append({'id':'source_package','detail':source['failures']})
    if materials['failed']:failures.append({'id':'materials_package','detail':materials['failures']})
    if not binding_ok:failures.append({'id':'materials_source_binding','detail':{'binding':binding,'source':{k:source[k] for k in ('fileName','byteLength','sha256')}}})
    result={'schemaVersion':'velmere.pass36.a95r0.final-package-verification.v1','revisionId':REV,'status':'PASS_A95R0_FINAL_PACKAGES_ACTION_REQUIRED_NO_PROMOTION' if not failures else 'FAIL_A95R0_FINAL_PACKAGES','source':source,'materials':materials,'materialsSourceBindingPassed':binding_ok,'failed':len(failures),'failures':failures,'globalDecision':'NO_GO','live':False,'saleEnabled':False,'productionApproved':False,'worldClassProven':False}
    text=json.dumps(result,indent=2,ensure_ascii=False)+'\n'
    if args.output:pathlib.Path(args.output).write_text(text,encoding='utf-8')
    print(text,end='')
    return 0 if not failures else 1
if __name__=='__main__':raise SystemExit(main())
