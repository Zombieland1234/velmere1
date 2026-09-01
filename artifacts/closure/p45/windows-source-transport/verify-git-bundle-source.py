#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, os, subprocess
from pathlib import Path

def sha_bytes(v:bytes)->str:return hashlib.sha256(v).hexdigest()
def sha_file(p:Path)->str:
    h=hashlib.sha256()
    with p.open('rb') as f:
        for c in iter(lambda:f.read(1024*1024),b''):h.update(c)
    return h.hexdigest()
def stable(v):
    if isinstance(v,list): return '['+','.join(stable(x) for x in v)+']'
    if isinstance(v,dict): return '{'+','.join(json.dumps(k,ensure_ascii=False)+':'+stable(v[k]) for k in sorted(v))+'}'
    return json.dumps(v,ensure_ascii=False,separators=(',',':'))
def run(args,cwd):
    p=subprocess.run(args,cwd=cwd,capture_output=True)
    if p.returncode: raise RuntimeError((p.stderr or p.stdout).decode('utf-8','replace'))
    return p.stdout

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--root',required=True)
    ap.add_argument('--identity',required=True)
    ap.add_argument('--output',required=True)
    ap.add_argument('--expected-commit',required=True)
    a=ap.parse_args()
    root=Path(a.root).resolve(); identity=json.loads(Path(a.identity).read_text(encoding='utf-8'))
    head=run(['git','rev-parse','HEAD'],root).decode().strip()
    if head != a.expected_commit: raise RuntimeError(f'commit_mismatch:{head}:{a.expected_commit}')
    raw=run(['git','ls-files','--stage','-z'],root)
    index={}; symlinks=[]; submodules=[]; non_stage_zero=[]
    for item in raw.split(b'\0'):
        if not item: continue
        meta,pathb=item.split(b'\t',1); mode,blob,stage=meta.decode().split()
        path=pathb.decode('utf-8')
        if stage!='0': non_stage_zero.append(path)
        if mode=='120000': symlinks.append(path)
        if mode=='160000': submodules.append(path)
        normalized=493 if mode=='100755' else 420 if mode=='100644' else None
        if normalized is None: raise RuntimeError(f'unsupported_git_mode:{mode}:{path}')
        index[path]={'gitMode':mode,'normalizedMode':normalized,'blobSha1':blob}
    expected={r['path']:r for r in identity['files']}
    missing=sorted(set(expected)-set(index)); extra=sorted(set(index)-set(expected))
    if missing or extra or non_stage_zero or symlinks or submodules:
        raise RuntimeError(f'path_or_mode_set_failure:missing={len(missing)} extra={len(extra)} stage={len(non_stage_zero)} symlink={len(symlinks)} submodule={len(submodules)}')
    rows=[]; mode_mismatch=[]; byte_mismatch=[]
    for path in sorted(expected,key=lambda p:p.encode('utf-8')):
        e=expected[path]; i=index[path]; p=root/path
        actual_size=p.stat().st_size; actual_sha=sha_file(p)
        if actual_size!=e['byteLength'] or actual_sha!=e['sha256']: byte_mismatch.append(path)
        if i['normalizedMode']!=e['mode']: mode_mismatch.append(path)
        rows.append({'path':path,'byteLength':actual_size,'mode':i['normalizedMode'],'sha256':actual_sha})
    if byte_mismatch or mode_mismatch: raise RuntimeError(f'content_or_mode_failure:bytes={len(byte_mismatch)} modes={len(mode_mismatch)}')
    path_set=sha_bytes('\n'.join(r['path'] for r in rows).encode())
    aggregate=sha_bytes(b''.join(f"{r['path']}\0{r['byteLength']}\0{r['mode']}\0{r['sha256']}\n".encode() for r in rows))
    if len(rows)!=identity['fileCount'] or sum(r['byteLength'] for r in rows)!=identity['payloadBytes'] or path_set!=identity['pathSetSha256'] or aggregate!=identity['sourceAggregateSha256']:
        raise RuntimeError('identity_aggregate_mismatch')
    status=subprocess.run(['git','status','--porcelain=v1','--untracked-files=no'],cwd=root,capture_output=True,text=True)
    if status.returncode or status.stdout.strip(): raise RuntimeError('git_worktree_not_clean:'+status.stdout)
    receipt={
      'schemaVersion':'velmere.p45.cross-platform-git-index-source-identity.v1',
      'status':'PASS','runtime':{'platform':os.name,'sysPlatform':__import__('sys').platform},
      'git':{'head':head,'trackedFiles':len(index),'executableModes':sum(1 for v in index.values() if v['gitMode']=='100755'),'regularModes':sum(1 for v in index.values() if v['gitMode']=='100644'),'symlinks':0,'submodules':0,'nonStageZero':0},
      'sourceIdentity':{'fileCount':len(rows),'payloadBytes':sum(r['byteLength'] for r in rows),'pathSetSha256':path_set,'sourceAggregateSha256':aggregate},
      'verificationMethod':{'content':'filesystem bytes SHA-256','mode':'Git index 100644/100755, not Windows filesystem executable bits','lineEndings':'exact checked-out bytes; workflow forces core.autocrlf=false and core.eol=lf'},
      'creditBoundary':'Exact source transport/identity only. This receipt does not grant semantic, build, Browser, PDF, rights, value or release credit.'
    }
    receipt['integritySha256']=hashlib.sha256(stable(receipt).encode()).hexdigest()
    out=Path(a.output);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(receipt,indent=2))
if __name__=='__main__':main()
