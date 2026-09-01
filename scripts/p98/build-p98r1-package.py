#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, re, shutil, tempfile, zipfile
from pathlib import Path
FIXED_TIME=(1980,1,1,0,0,0)
IDENTITY_REL='artifacts/closure/p98r1/P98R1_TREE_IDENTITY_EXCLUDING_SELF.json'
MANIFEST_REL='PACKAGE_CONTENT_MANIFEST.tsv'
PRIVATE_KEY_RE=re.compile(rb'-----BEGIN (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----\r?\n(?:[A-Za-z0-9+/=]{16,}\r?\n){2,}-----END (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----')
TOKEN_PATTERNS={
 'aws_access_key_id':re.compile(rb'AKIA[0-9A-Z]{16}'),
 'stripe_live_secret':re.compile(rb'sk_live_[A-Za-z0-9]{16,}'),
 'stripe_webhook_secret':re.compile(rb'whsec_[A-Za-z0-9]{16,}'),
 'github_fine_grained_pat':re.compile(rb'github_pat_[A-Za-z0-9_]{20,}'),
 'github_classic_pat':re.compile(rb'ghp_[A-Za-z0-9]{30,}'),
 'openai_api_key':re.compile(rb'(?<![A-Za-z0-9_-])sk-(?:proj-)?[A-Za-z0-9_-]{24,}'),
 'google_api_key':re.compile(rb'AIza[0-9A-Za-z_-]{30,}'),
}
def sha(p:Path)->str:
 h=hashlib.sha256()
 with p.open('rb') as f:
  for c in iter(lambda:f.read(4*1024*1024),b''): h.update(c)
 return h.hexdigest()
def projection(rows):
 ordered=sorted(rows,key=lambda r:r['path']); ph=hashlib.sha256('\n'.join(r['path'] for r in ordered).encode()).hexdigest(); agg=hashlib.sha256()
 for r in ordered: agg.update(f"{r['path']}\0{r['byteLength']}\0{r['sha256']}\n".encode())
 return {'fileCount':len(ordered),'payloadBytes':sum(r['byteLength'] for r in ordered),'pathSetSha256':ph,'sourceContentAggregateSha256':agg.hexdigest()}
def source_rows(root:Path):
 out=[]
 for p in sorted((x for x in root.rglob('*') if x.is_file()),key=lambda x:x.relative_to(root).as_posix()):
  rel=p.relative_to(root).as_posix()
  if p.is_symlink(): raise RuntimeError(f'symlink:{rel}')
  if rel.endswith(('.pyc','.pyo')) or '/__pycache__/' in f'/{rel}/': raise RuntimeError(f'python_cache:{rel}')
  if rel.startswith('node_modules/'): raise RuntimeError(f'node_modules:{rel}')
  out.append({'path':rel,'byteLength':p.stat().st_size,'sha256':sha(p)})
 return out
def parse_manifest(root):
 lines=(root/MANIFEST_REL).read_text().splitlines()
 if not lines or lines[0]!='relative_path\tbyte_length\tsha256': raise RuntimeError('manifest_header')
 out=[]
 for line in lines[1:]:
  rel,size,digest=line.split('\t'); out.append({'path':rel,'byteLength':int(size),'sha256':digest})
 if [r['path'] for r in out]!=sorted(r['path'] for r in out) or len({r['path'] for r in out})!=len(out): raise RuntimeError('manifest_order_or_duplicate')
 return out
def scan(root,rows):
 findings=[]
 for r in rows:
  data=(root/r['path']).read_bytes()
  if PRIVATE_KEY_RE.search(data): findings.append({'path':r['path'],'pattern':'private_key_block'})
  for name,pat in TOKEN_PATTERNS.items():
   if pat.search(data): findings.append({'path':r['path'],'pattern':name})
 return findings
def build_zip(root,out,rows):
 with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=1,strict_timestamps=False) as z:
  for r in rows:
   info=zipfile.ZipInfo(r['path'],FIXED_TIME); info.compress_type=zipfile.ZIP_DEFLATED; info.create_system=0; info.external_attr=(0o600&0xFFFF)<<16; info.flag_bits=0
   with (root/r['path']).open('rb') as src,z.open(info,'w',force_zip64=True) as dst: shutil.copyfileobj(src,dst,length=4*1024*1024)
def identical(a,b):
 if a.stat().st_size!=b.stat().st_size:return False
 with a.open('rb') as x,b.open('rb') as y:
  while True:
   p=x.read(8*1024*1024); q=y.read(8*1024*1024)
   if p!=q:return False
   if not p:return True
def verify_zip(path,rows):
 expected=[r['path'] for r in rows]; mapping={r['path']:r for r in rows}
 with zipfile.ZipFile(path) as z:
  infos=z.infolist(); names=[i.filename for i in infos]
  if names!=expected or names!=sorted(names):raise RuntimeError('zip_order')
  if any(i.is_dir() or i.filename.endswith('/') for i in infos):raise RuntimeError('directory_entry')
  if any(i.date_time!=FIXED_TIME for i in infos):raise RuntimeError('timestamp')
  if any(i.create_system!=0 for i in infos):raise RuntimeError('create_system')
  if any(((i.external_attr>>16)&0xffff)!=0o600 for i in infos):raise RuntimeError('mode')
  if any(i.file_size!=mapping[i.filename]['byteLength'] for i in infos):raise RuntimeError('size')
  bad=z.testzip()
  if bad:raise RuntimeError(f'crc:{bad}')
 return {'entryCount':len(rows),'bytes':path.stat().st_size,'sha256':sha(path),'crc':'PASS','ordering':'lexicographic','timestamp':'1980-01-01T00:00:00Z','directoryEntries':0,'createSystem':0,'externalMode':'0600'}
def clean_unpack(zp,rows):
 with tempfile.TemporaryDirectory(prefix='p98-clean-') as td:
  t=Path(td)
  with zipfile.ZipFile(zp) as z:z.extractall(t)
  if source_rows(t)!=rows:raise RuntimeError('clean_unpack')
 return 'PASS_PATH_AND_CONTENT_IDENTITY'
def main():
 ap=argparse.ArgumentParser(); ap.add_argument('--root',required=True); ap.add_argument('--output',required=True); ap.add_argument('--verification',required=True); args=ap.parse_args()
 root=Path(args.root).resolve(); output=Path(args.output).resolve(); verification=Path(args.verification).resolve(); rows=source_rows(root)
 identity=json.loads((root/IDENTITY_REL).read_text())
 if identity['fullPackageFileCountIncludingThisIdentityFile']!=len(rows):raise RuntimeError('identity_count')
 nonself=[r for r in rows if r['path']!=IDENTITY_REL]; ip={k:identity[k] for k in ('fileCount','payloadBytes','pathSetSha256','sourceContentAggregateSha256')}
 if projection(nonself)!=ip:raise RuntimeError('identity_projection')
 manifest=parse_manifest(root); expected=[r for r in rows if r['path'] not in (MANIFEST_REL,IDENTITY_REL)]
 if manifest!=expected:raise RuntimeError('package_manifest_mismatch')
 findings=scan(root,rows)
 if findings:raise RuntimeError(f'secret:{findings[:20]}')
 current_binaries=[r['path'] for r in rows if r['path'].startswith(('receipts/p98/','artifacts/p98/','scripts/p98/','artifacts/closure/p98r1/')) and Path(r['path']).suffix.lower() in {'.pdf','.zip','.woff','.woff2','.ttf','.otf','.exe','.dll','.bin','.pyc','.pyo'}]
 if current_binaries:raise RuntimeError(f'unexpected_current_binary:{current_binaries}')
 with tempfile.TemporaryDirectory(prefix='p98-package-') as td:
  a=Path(td)/'a.zip'; b=Path(td)/'b.zip'; build_zip(root,a,rows); build_zip(root,b,rows)
  if not identical(a,b):raise RuntimeError('not_deterministic')
  va=verify_zip(a,rows); vb=verify_zip(b,rows); clean=clean_unpack(a,rows); output.parent.mkdir(parents=True,exist_ok=True); shutil.copyfile(a,output)
 final={**va,'sha256':sha(output),'cleanUnpack':clean}
 if final['sha256']!=va['sha256'] or output.stat().st_size!=va['bytes']:raise RuntimeError('final_copy_identity')
 payload={'schemaVersion':'velmere.p98r1.package-verification.v1','status':'PASS','output':output.name,'deterministicRebuild':'2/2 BYTE_IDENTICAL','buildA':va,'buildB':vb,'final':final,'treeIdentity':ip,'packageContentManifest':{'path':MANIFEST_REL,'bytes':(root/MANIFEST_REL).stat().st_size,'sha256':sha(root/MANIFEST_REL),'listedFiles':len(manifest),'verifiedExact':True},'privateKeySecretScan':{'matches':0},'unexpectedCurrentBinaryScan':{'matches':0},'truthBoundary':'SOURCE_ONLY identity, determinism, CRC, clean unpack and full-tree secret/current-binary scanning only. No deployment, Browser rendering, exact Windows or Customer FINAL credit.'}
 verification.parent.mkdir(parents=True,exist_ok=True); verification.write_text(json.dumps(payload,indent=2)+"\n"); print(json.dumps(payload,indent=2))
if __name__=='__main__':main()
