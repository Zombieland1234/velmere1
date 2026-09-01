#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, os, subprocess, sys
from pathlib import Path
MAGIC=b'P43I8\0'
def sha(b): return hashlib.sha256(b).hexdigest()
def varint(d,o):
    v=s=0
    while True:
        if o>=len(d): raise RuntimeError('truncated_varint')
        b=d[o];o+=1;v|=(b&127)<<s
        if not b&128:return v,o
        s+=7
        if s>63: raise RuntimeError('varint_overflow')
def decode(p):
    d=p.read_bytes()
    if not d.startswith(MAGIC): raise RuntimeError('identity_magic_mismatch')
    o=len(MAGIC); agg=d[o:o+32].hex();o+=32; ps=d[o:o+32].hex();o+=32
    n,o=varint(d,o); total,o=varint(d,o); rows=[]; prev=''
    for _ in range(n):
        common,o=varint(d,o); sl,o=varint(d,o); suffix=d[o:o+sl].decode();o+=sl
        prefix=d[o:o+4].hex();o+=4; size,o=varint(d,o); mode=493 if d[o] else 420;o+=1
        path=prev[:common]+suffix; rows.append({'path':path,'sha256Prefix32':prefix,'byteLength':size,'mode':mode});prev=path
    if o!=len(d): raise RuntimeError(f'identity_trailing_bytes:{len(d)-o}')
    return {'sourceAggregateSha256':agg,'pathSetSha256':ps,'fileCount':n,'payloadBytes':total,'files':rows}
def parse_batch(data,count):
    o=0
    for _ in range(count):
        e=data.find(b'\n',o)
        if e<0: raise RuntimeError('batch_ended_early')
        header=data[o:e];o=e+1; parts=header.split()
        if len(parts)<3: raise RuntimeError(f'invalid_batch_header:{header!r}')
        oid=parts[0].decode();typ=parts[1].decode();size=int(parts[2]);payload=data[o:o+size];o+=size
        if len(payload)!=size or data[o:o+1]!=b'\n': raise RuntimeError(f'invalid_batch_payload:{oid}')
        o+=1; yield oid,typ,size,payload
    if o!=len(data):
        # git may append nothing; fail only on non-whitespace
        if data[o:].strip(): raise RuntimeError(f'batch_trailing_bytes:{len(data)-o}')
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--repo',required=True);ap.add_argument('--identity-bin',required=True);ap.add_argument('--output-dir',required=True);ap.add_argument('--reconstruct',action='store_true');a=ap.parse_args()
    repo=Path(a.repo).resolve(); identp=Path(a.identity_bin).resolve(); out=Path(a.output_dir).resolve();out.mkdir(parents=True,exist_ok=True);ident=decode(identp);rows=ident['files']
    refs=subprocess.run(['git','for-each-ref','--format=%(refname)','refs/heads','refs/remotes','refs/tags'],cwd=repo,check=True,capture_output=True,text=True).stdout.splitlines()
    rev=subprocess.run(['git','rev-list','--objects','--all'],cwd=repo,check=True,capture_output=True,text=True).stdout.splitlines();oids=[];seen=set()
    for r in rev:
        oid=r.split(' ',1)[0]
        if oid not in seen:seen.add(oid);oids.append(oid)
    proc=subprocess.run(['git','cat-file','--batch'],cwd=repo,input=('\n'.join(oids)+'\n').encode(),capture_output=True,check=True)
    cand={};blob_count=blob_bytes=0
    for oid,typ,size,payload in parse_batch(proc.stdout,len(oids)):
        if typ!='blob': continue
        blob_count+=1;blob_bytes+=size;full=sha(payload);cand.setdefault((full[:8],size),{})[full]={'oid':oid,'sha256':full,'size':size}
    covered=[];missing=[];amb=[]
    for r in rows:
        ms=list(cand.get((r['sha256Prefix32'],r['byteLength']),{}).values())
        if not ms: missing.append(r)
        elif len(ms)>1: amb.append({'expected':r,'matches':ms})
        else: covered.append({**r,**ms[0]})
    pathset=sha('\n'.join(r['path'] for r in rows).encode());recon=None;agg=None
    if a.reconstruct and not missing and not amb:
        root=out/'reconstructed-current-source';root.mkdir(parents=True,exist_ok=True); exact=[]
        for r in covered:
            p=root/r['path'];p.parent.mkdir(parents=True,exist_ok=True)
            b=subprocess.run(['git','cat-file','blob',r['oid']],cwd=repo,check=True,capture_output=True).stdout
            if len(b)!=r['byteLength'] or sha(b)!=r['sha256']: raise RuntimeError('reconstruction_drift:'+r['path'])
            p.write_bytes(b)
            try: os.chmod(p,r['mode'])
            except OSError: pass
            exact.append({'path':r['path'],'byteLength':r['byteLength'],'mode':r['mode'],'sha256':r['sha256']})
        agg=sha(b''.join(f"{r['path']}\0{r['byteLength']}\0{r['mode']}\0{r['sha256']}\n".encode() for r in exact))
        recon={'root':str(root),'fileCount':len(exact),'payloadBytes':sum(r['byteLength'] for r in exact),'pathSetSha256':pathset,'sourceAggregateSha256':agg,'exactIdentityPass':pathset==ident['pathSetSha256'] and agg==ident['sourceAggregateSha256']}
    result={'schemaVersion':'velmere.p44.compact-identity-local-reconstruction-replay.v1','status':'PASS' if not missing and not amb and (not a.reconstruct or recon and recon['exactIdentityPass']) else 'FAIL','classification':'ALL_CURRENT_SOURCE_BLOBS_FOUND_LOCAL_REPLAY' if not missing and not amb else 'PARTIAL_SOURCE_BLOB_COVERAGE','runtime':{'platform':sys.platform,'python':sys.version.split()[0]},'identityBinding':{'compactIdentitySha256':sha(identp.read_bytes()),'expectedFileCount':ident['fileCount'],'expectedPayloadBytes':ident['payloadBytes'],'expectedPathSetSha256':ident['pathSetSha256'],'expectedSourceAggregateSha256':ident['sourceAggregateSha256'],'recomputedPathSetSha256':pathset,'pathSetPass':pathset==ident['pathSetSha256'],'hashPrefixBits':32,'exactAggregateVerifiedAfterReconstruction':agg},'gitObjectInventory':{'refCount':len(refs),'refs':refs,'revListObjectCount':len(oids),'blobCount':blob_count,'blobBytes':blob_bytes,'candidateBuckets':len(cand)},'coverage':{'coveredFiles':len(covered),'missingFiles':len(missing),'ambiguousFiles':len(amb),'coveredBytes':sum(r['byteLength'] for r in covered),'missingBytes':sum(r['byteLength'] for r in missing),'fileCoveragePercent':round(100*len(covered)/ident['fileCount'],6),'byteCoveragePercent':round(100*sum(r['byteLength'] for r in covered)/ident['payloadBytes'],6),'complete':not missing and not amb},'reconstruction':recon,'truthBoundary':'Local replay proves the repaired compact identity and reconstruction algorithm against a local Git object store; it does not prove GitHub all-ref availability or exact Windows semantic/build execution.'}
    result['integritySha256']=sha(json.dumps(result,sort_keys=True,separators=(',',':')).encode());(out/'P44_COMPACT_IDENTITY_LOCAL_RECONSTRUCTION_REPLAY.json').write_text(json.dumps(result,indent=2)+'\n');(out/'P44_MISSING_OR_AMBIGUOUS_ROWS.json').write_text(json.dumps({'missing':missing,'ambiguous':amb},indent=2)+'\n');print(json.dumps(result,indent=2));return 0 if result['status']=='PASS' else 2
if __name__=='__main__':raise SystemExit(main())
