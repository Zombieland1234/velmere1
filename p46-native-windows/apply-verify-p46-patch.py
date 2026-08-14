#!/usr/bin/env python3
from __future__ import annotations
import argparse, base64, gzip, hashlib, json, os, subprocess
from pathlib import Path, PurePosixPath
from typing import Any

MAGIC=b'P43I8\0'

def sha256_bytes(data: bytes)->str: return hashlib.sha256(data).hexdigest()
def sha256_file(path: Path)->str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()
def stable_hash(value: object)->str: return sha256_bytes(json.dumps(value,sort_keys=True,separators=(',',':')).encode())
def varint(data: bytes, offset: int)->tuple[int,int]:
    value=shift=0
    while True:
        if offset>=len(data): raise RuntimeError('truncated_varint')
        byte=data[offset];offset+=1;value|=(byte&127)<<shift
        if not byte&128:return value,offset
        shift+=7
        if shift>63:raise RuntimeError('varint_overflow')
def decode_identity(path: Path)->dict[str,Any]:
    data=path.read_bytes()
    if not data.startswith(MAGIC):raise RuntimeError('identity_magic_mismatch')
    offset=len(MAGIC);aggregate=data[offset:offset+32].hex();offset+=32;path_set=data[offset:offset+32].hex();offset+=32
    count,offset=varint(data,offset);payload,offset=varint(data,offset);rows=[];previous=''
    for _ in range(count):
        common,offset=varint(data,offset);suffix_len,offset=varint(data,offset);suffix=data[offset:offset+suffix_len].decode();offset+=suffix_len
        prefix=data[offset:offset+4].hex();offset+=4;size,offset=varint(data,offset);mode=493 if data[offset] else 420;offset+=1
        rel=previous[:common]+suffix;rows.append({'path':rel,'sha256Prefix32':prefix,'byteLength':size,'mode':mode});previous=rel
    if offset!=len(data):raise RuntimeError(f'identity_trailing_bytes:{len(data)-offset}')
    return {'sourceAggregateSha256':aggregate,'pathSetSha256':path_set,'fileCount':count,'payloadBytes':payload,'files':rows}
def safe_target(root: Path, rel: str)->Path:
    p=PurePosixPath(rel)
    if not rel or p.is_absolute() or '..' in p.parts or '\\' in rel or ':' in p.parts[0]:raise RuntimeError(f'unsafe_change_path:{rel}')
    target=(root/Path(*p.parts)).resolve()
    if root not in target.parents:raise RuntimeError(f'change_outside_root:{rel}')
    return target
def run_git_apply(root: Path, patch: Path, check: bool)->dict[str,Any]:
    cmd=['git','apply','--unsafe-paths','--whitespace=nowarn']
    if check:cmd.append('--check')
    cmd.append(str(patch))
    proc=subprocess.run(cmd,cwd=root,capture_output=True,text=True,encoding='utf-8',errors='replace')
    result={'command':cmd,'cwd':str(root),'exitCode':proc.returncode,'stdout':proc.stdout,'stderr':proc.stderr}
    if proc.returncode!=0:raise RuntimeError(f'git_apply_{"check" if check else "execute"}_failed:{proc.returncode}:{proc.stderr[-8000:]}:{proc.stdout[-8000:]}')
    return result


def load_patch_base64(manifest_path: Path, contract: dict[str, Any], override: str | None) -> tuple[bytes, list[dict[str, Any]]]:
    sources: list[tuple[Path, dict[str, Any] | None]] = []
    if override:
        sources.append((Path(override).resolve(), None))
    else:
        parts = contract.get('base64Parts')
        if isinstance(parts, list) and parts:
            manifest_root = manifest_path.parent.resolve()
            for index, row in enumerate(parts):
                if not isinstance(row, dict) or not isinstance(row.get('path'), str):
                    raise RuntimeError(f'patch_part_contract_invalid:{index}')
                relative = PurePosixPath(row['path'])
                if relative.is_absolute() or '..' in relative.parts or '\\' in row['path'] or ':' in relative.parts[0]:
                    raise RuntimeError(f'patch_part_path_unsafe:{row["path"]}')
                part_path = (manifest_root / Path(*relative.parts)).resolve()
                if manifest_root not in part_path.parents:
                    raise RuntimeError(f'patch_part_outside_manifest_root:{row["path"]}')
                sources.append((part_path, row))
        else:
            relative_path = contract.get('path')
            if not isinstance(relative_path, str):
                raise RuntimeError('patch_base64_transport_not_declared')
            relative = PurePosixPath(relative_path)
            if relative.is_absolute() or '..' in relative.parts or '\\' in relative_path or ':' in relative.parts[0]:
                raise RuntimeError(f'patch_path_unsafe:{relative_path}')
            # Older manifests used a repository-relative path; use only the basename beside the manifest.
            sources.append(((manifest_path.parent / relative.name).resolve(), None))

    joined: list[bytes] = []
    evidence: list[dict[str, Any]] = []
    for index, (part_path, row) in enumerate(sources):
        if not part_path.is_file():
            raise RuntimeError(f'patch_part_missing:{index}:{part_path}')
        raw = part_path.read_bytes()
        if row is not None:
            if len(raw) != row.get('byteLength') or sha256_bytes(raw) != row.get('sha256'):
                raise RuntimeError(f'patch_part_integrity_mismatch:{index}:{part_path}')
        joined.append(raw)
        evidence.append({
            'index': index,
            'path': str(part_path),
            'byteLength': len(raw),
            'sha256': sha256_bytes(raw),
            'contractBound': row is not None,
        })
    if not joined:
        raise RuntimeError('patch_base64_transport_empty')
    return b''.join(joined), evidence

def main()->int:
    ap=argparse.ArgumentParser();ap.add_argument('--base-root',required=True);ap.add_argument('--identity-bin',required=True);ap.add_argument('--base-coverage-receipt',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--patch-b64');ap.add_argument('--output',required=True);a=ap.parse_args()
    root=Path(a.base_root).resolve();identity_path=Path(a.identity_bin).resolve();coverage_path=Path(a.base_coverage_receipt).resolve();manifest_path=Path(a.manifest).resolve();output=Path(a.output).resolve();output.parent.mkdir(parents=True,exist_ok=True)
    manifest=json.loads(manifest_path.read_text());coverage=json.loads(coverage_path.read_text());base=manifest['baseSource'];target=manifest['targetSource'];contract=manifest['patch'];changes=manifest['changes']
    reconstruction=coverage.get('reconstruction') or {};cov=coverage.get('coverage') or {}
    base_ok=(coverage.get('status')=='PASS' and cov.get('complete') is True and reconstruction.get('exactIdentityPass') is True and all(reconstruction.get(k)==base[k] for k in ('fileCount','payloadBytes','pathSetSha256','sourceAggregateSha256')))
    if not base_ok:raise RuntimeError('base_reconstruction_receipt_not_exact_p43')
    compact=decode_identity(identity_path)
    if any(compact[k]!=base[k] for k in ('fileCount','payloadBytes','pathSetSha256','sourceAggregateSha256')):raise RuntimeError('compact_identity_not_bound_p43')
    expected_paths={row['path'] for row in compact['files']}
    if len(changes)!=contract['changedFileCount'] or len({row['path'] for row in changes})!=len(changes):raise RuntimeError('change_denominator_mismatch')
    preimage={}
    for row in changes:
        if row['path'] not in expected_paths:raise RuntimeError(f'change_not_in_bound_pathset:{row["path"]}')
        p=safe_target(root,row['path']);before=row['before']
        observed={'byteLength':p.stat().st_size,'sha256':sha256_file(p)}
        if observed['byteLength']!=before['byteLength'] or observed['sha256']!=before['sha256']:raise RuntimeError(f'preimage_mismatch:{row["path"]}:{observed}')
        preimage[row['path']]=observed
    b64,part_evidence=load_patch_base64(manifest_path,contract,a.patch_b64)
    if len(b64)!=contract['base64ByteLength'] or sha256_bytes(b64)!=contract['base64Sha256']:raise RuntimeError('patch_base64_integrity_mismatch')
    gz=base64.b64decode(b64,validate=True)
    if len(gz)!=contract['gzipByteLength'] or sha256_bytes(gz)!=contract['gzipSha256']:raise RuntimeError('patch_gzip_integrity_mismatch')
    patch_bytes=gzip.decompress(gz)
    if len(patch_bytes)!=contract['uncompressedByteLength'] or sha256_bytes(patch_bytes)!=contract['uncompressedSha256']:raise RuntimeError('patch_uncompressed_integrity_mismatch')
    patch_file=output.parent/'P46_P43_TO_P46_EXACT.patch';patch_file.write_bytes(patch_bytes)
    check=run_git_apply(root,patch_file,True);execute=run_git_apply(root,patch_file,False)
    postimage={}
    for row in changes:
        p=safe_target(root,row['path']);after=row['after'];observed={'byteLength':p.stat().st_size,'sha256':sha256_file(p)}
        if observed['byteLength']!=after['byteLength'] or observed['sha256']!=after['sha256']:raise RuntimeError(f'postimage_mismatch:{row["path"]}:{observed}')
        postimage[row['path']]=observed
    metadata={row['path']:{'path':row['path'],'byteLength':row['byteLength'],'mode':row['mode']} for row in compact['files']}
    for row in changes:metadata[row['path']]={'path':row['path'],'byteLength':row['after']['byteLength'],'mode':row['after']['mode']}
    rows=[metadata[k] for k in sorted(metadata)];observed_paths=sorted(p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file());expected=[row['path'] for row in rows]
    if observed_paths!=expected:
        missing=sorted(set(expected)-set(observed_paths));extra=sorted(set(observed_paths)-set(expected));raise RuntimeError(f'filesystem_pathset_mismatch:missing={missing[:20]}:extra={extra[:20]}')
    exact_rows=[];total=0
    for row in rows:
        p=safe_target(root,row['path']);size=p.stat().st_size;digest=sha256_file(p)
        if size!=row['byteLength']:raise RuntimeError(f'file_size_mismatch:{row["path"]}:{size}:{row["byteLength"]}')
        exact_rows.append({'path':row['path'],'byteLength':size,'mode':row['mode'],'sha256':digest});total+=size
    path_set=sha256_bytes('\n'.join(row['path'] for row in exact_rows).encode())
    aggregate=sha256_bytes(b''.join(f"{row['path']}\0{row['byteLength']}\0{row['mode']}\0{row['sha256']}\n".encode() for row in exact_rows))
    exact=(len(exact_rows)==target['fileCount'] and total==target['payloadBytes'] and path_set==target['pathSetSha256'] and aggregate==target['sourceAggregateSha256'])
    receipt={'schemaVersion':'velmere.p46.github-p43-base-unified-patch-reconstruction.v1','status':'PASS' if exact else 'FAIL','classification':'EXACT_P46_SOURCE_RECONSTRUCTED_FROM_BOUND_P43_BASE_AND_HASHED_PATCH' if exact else 'P46_SOURCE_IDENTITY_MISMATCH','baseCoverageReceipt':{'path':str(coverage_path),'sha256':sha256_file(coverage_path),'exactP43Pass':base_ok},'compactBaseIdentity':{'path':str(identity_path),'sha256':sha256_file(identity_path),'fileCount':compact['fileCount'],'payloadBytes':compact['payloadBytes'],'pathSetSha256':compact['pathSetSha256'],'sourceAggregateSha256':compact['sourceAggregateSha256']},'patchTransport':{'manifestPath':str(manifest_path),'manifestSha256':sha256_file(manifest_path),'patchBase64Parts':part_evidence,'patchBase64Sha256':sha256_bytes(b64),'patchGzipSha256':sha256_bytes(gz),'patchSha256':sha256_bytes(patch_bytes),'preimage':preimage,'postimage':postimage,'gitApplyCheck':{k:v for k,v in check.items() if k not in ('stdout','stderr')},'gitApplyExecute':{k:v for k,v in execute.items() if k not in ('stdout','stderr')}},'targetSourceIdentity':{'fileCount':len(exact_rows),'payloadBytes':total,'pathSetSha256':path_set,'sourceAggregateSha256':aggregate,'expected':target,'exactIdentityPass':exact},'truthBoundary':'PASS proves exact P46 source reconstruction only. Native-Windows semantic/build credit requires the separate exact runner receipt; Browser/PDF/value/rights/sale remain open.'}
    receipt['integritySha256']=stable_hash(receipt);output.write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2));return 0 if exact else 2
if __name__=='__main__':raise SystemExit(main())
