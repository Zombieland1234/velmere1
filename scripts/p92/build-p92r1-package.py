#!/usr/bin/env python3
from __future__ import annotations
import argparse,hashlib,json,re,shutil,tempfile,zipfile
from pathlib import Path
from typing import Any
FIXED_TIME=(1980,1,1,0,0,0)
IDENTITY_REL='artifacts/closure/p92r1/P92R1_TREE_IDENTITY_EXCLUDING_SELF.json'
MANIFEST_REL='PACKAGE_CONTENT_MANIFEST.tsv'
PRIVATE_KEY_RE=re.compile(rb'-----BEGIN (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----\r?\n(?:[A-Za-z0-9+/=]{16,}\r?\n){2,}-----END (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----')
TOKEN_PATTERNS={'aws_access_key_id':re.compile(rb'AKIA[0-9A-Z]{16}'),'stripe_live_secret':re.compile(rb'sk_live_[A-Za-z0-9]{16,}'),'stripe_webhook_secret':re.compile(rb'whsec_[A-Za-z0-9]{16,}'),'github_fine_grained_pat':re.compile(rb'github_pat_[A-Za-z0-9_]{20,}'),'github_classic_pat':re.compile(rb'ghp_[A-Za-z0-9]{30,}'),'openai_api_key':re.compile(rb'(?<![A-Za-z0-9_-])sk-(?:proj-)?[A-Za-z0-9_-]{24,}'),'google_api_key':re.compile(rb'AIza[0-9A-Za-z_-]{30,}')}
def sha(p:Path):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for chunk in iter(lambda:f.read(4*1024*1024),b''):h.update(chunk)
 return h.hexdigest()
def projection(rows:list[dict[str,Any]]):
 rows=sorted(rows,key=lambda x:x['path']);ph=hashlib.sha256('\n'.join(x['path'] for x in rows).encode()).hexdigest();agg=hashlib.sha256()
 for x in rows:agg.update(f"{x['path']}\0{x['byteLength']}\0{x['sha256']}\n".encode())
 return {'fileCount':len(rows),'payloadBytes':sum(x['byteLength'] for x in rows),'pathSetSha256':ph,'sourceContentAggregateSha256':agg.hexdigest()}
def source_rows(root:Path):
 out=[]
 for p in sorted((x for x in root.rglob('*') if x.is_file()),key=lambda x:x.relative_to(root).as_posix()):
  rel=p.relative_to(root).as_posix()
  if p.is_symlink():raise RuntimeError(f'symlink:{rel}')
  if rel.endswith(('.pyc','.pyo')) or '/__pycache__/' in f'/{rel}/':raise RuntimeError(f'python_cache:{rel}')
  if rel.startswith('node_modules/'):raise RuntimeError(f'node_modules:{rel}')
  out.append({'path':rel,'byteLength':p.stat().st_size,'sha256':sha(p)})
 return out
def parse_manifest(root:Path):
 lines=(root/MANIFEST_REL).read_text('utf-8').splitlines()
 if not lines or lines[0]!='relative_path\tbyte_length\tsha256':raise RuntimeError('manifest_header')
 out=[]
 for line in lines[1:]:
  rel,size,digest=line.split('\t');out.append({'path':rel,'byteLength':int(size),'sha256':digest})
 if [x['path'] for x in out]!=sorted(x['path'] for x in out) or len({x['path'] for x in out})!=len(out):raise RuntimeError('manifest_order_or_duplicate')
 return out
def scan(root:Path,rows):
 findings=[]
 for x in rows:
  data=(root/x['path']).read_bytes()
  if PRIVATE_KEY_RE.search(data):findings.append({'path':x['path'],'pattern':'private_key_block'})
  for name,pattern in TOKEN_PATTERNS.items():
   if pattern.search(data):findings.append({'path':x['path'],'pattern':name})
 return findings
def build_zip(root:Path,out:Path,rows):
 with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=1,strict_timestamps=False) as zf:
  for x in rows:
   info=zipfile.ZipInfo(x['path'],FIXED_TIME);info.compress_type=zipfile.ZIP_DEFLATED;info.create_system=0;info.external_attr=(0o600&0xFFFF)<<16;info.flag_bits=0
   with (root/x['path']).open('rb') as src,zf.open(info,'w',force_zip64=True) as dst:shutil.copyfileobj(src,dst,length=4*1024*1024)
def identical(a:Path,b:Path):
 if a.stat().st_size!=b.stat().st_size:return False
 with a.open('rb') as left,b.open('rb') as right:
  while True:
   x=left.read(8*1024*1024);y=right.read(8*1024*1024)
   if x!=y:return False
   if not x:return True
def verify_zip(path:Path,rows):
 expected=[x['path'] for x in rows];mapping={x['path']:x for x in rows}
 with zipfile.ZipFile(path) as z:
  infos=z.infolist();names=[i.filename for i in infos]
  if names!=expected or names!=sorted(names):raise RuntimeError('zip_order')
  if any(i.is_dir() or i.filename.endswith('/') for i in infos):raise RuntimeError('dir_entry')
  if any(i.date_time!=FIXED_TIME for i in infos):raise RuntimeError('timestamp')
  if any(i.create_system!=0 for i in infos):raise RuntimeError('create_system')
  if any(((i.external_attr>>16)&0xFFFF)!=0o600 for i in infos):raise RuntimeError('mode')
  if any(i.file_size!=mapping[i.filename]['byteLength'] for i in infos):raise RuntimeError('size')
  bad=z.testzip()
  if bad:raise RuntimeError(f'crc:{bad}')
 return {'entryCount':len(rows),'bytes':path.stat().st_size,'sha256':sha(path),'crc':'PASS','ordering':'lexicographic','timestamp':'1980-01-01T00:00:00Z','directoryEntries':0,'createSystem':0,'externalMode':'0600'}
def clean_unpack(zip_path:Path,rows):
 with tempfile.TemporaryDirectory(prefix='p92-clean-') as td:
  target=Path(td)
  with zipfile.ZipFile(zip_path) as z:z.extractall(target)
  if source_rows(target)!=rows:raise RuntimeError('clean_unpack')
 return 'PASS_PATH_AND_CONTENT_IDENTITY'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',required=True);ap.add_argument('--output',required=True);ap.add_argument('--verification',required=True);args=ap.parse_args();root=Path(args.root).resolve();output=Path(args.output).resolve();verification=Path(args.verification).resolve()
 rows=source_rows(root);identity=json.loads((root/IDENTITY_REL).read_text())
 if identity['fullPackageFileCountIncludingThisIdentityFile']!=len(rows):raise RuntimeError('identity_count')
 nonself=[x for x in rows if x['path']!=IDENTITY_REL]
 if projection(nonself)!={k:identity[k] for k in ('fileCount','payloadBytes','pathSetSha256','sourceContentAggregateSha256')}:raise RuntimeError('identity_projection')
 manifest=parse_manifest(root);expected_manifest=[x for x in rows if x['path'] not in (MANIFEST_REL,IDENTITY_REL)]
 if manifest!=expected_manifest:raise RuntimeError('package_manifest_mismatch')
 findings=scan(root,rows)
 if findings:raise RuntimeError(f'secret:{findings[:20]}')
 current_binaries=[x['path'] for x in rows if x['path'].startswith(('receipts/p92/','artifacts/p92/','scripts/p92/')) and Path(x['path']).suffix.lower() in {'.pdf','.zip','.woff','.woff2','.ttf','.otf','.exe','.dll','.bin','.pyc','.pyo'}]
 if current_binaries:raise RuntimeError(f'unexpected_current_binary:{current_binaries}')
 with tempfile.TemporaryDirectory(prefix='p92-package-') as td:
  build_a=Path(td)/'a.zip';build_b=Path(td)/'b.zip';build_zip(root,build_a,rows);build_zip(root,build_b,rows)
  if not identical(build_a,build_b):raise RuntimeError('not_deterministic')
  verify_a=verify_zip(build_a,rows);verify_b=verify_zip(build_b,rows);clean=clean_unpack(build_a,rows);output.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(build_a,output)
 final={**verify_a,'sha256':sha(output),'cleanUnpack':clean}
 if final['sha256']!=verify_a['sha256'] or output.stat().st_size!=verify_a['bytes']:raise RuntimeError('final_copy')
 payload={'schemaVersion':'velmere.p92r1.deterministic-package-verification.v1','status':'PASS','output':output.name,'deterministicRebuild':'2/2 BYTE_IDENTICAL','buildA':verify_a,'buildB':verify_b,'final':final,'treeIdentity':projection(rows),'packageContentManifest':{'path':MANIFEST_REL,'sha256':sha(root/MANIFEST_REL),'listedFiles':len(manifest),'verifiedExact':True},'privateKeySecretScan':{'status':'PASS','matches':0},'unexpectedCurrentBinaryScan':{'status':'PASS','matches':0},'ledgerInsideZip':False,'identityReceiptExcludesOnlySelf':True,'truthBoundary':'External verification binds final ZIP bytes after two deterministic builds, CRC of both, exact package-manifest validation, full secret scan and clean-unpack replay. It grants no Browser, staging, customer FINAL, provider rights or exact-Windows credit.'}
 verification.parent.mkdir(parents=True,exist_ok=True);verification.write_text(json.dumps(payload,indent=2)+'\n');print(json.dumps(payload,indent=2))
if __name__=='__main__':main()
