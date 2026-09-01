#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

def sha_file(p):
 h=hashlib.sha256()
 with Path(p).open('rb') as f:
  for c in iter(lambda:f.read(1024*1024),b''):h.update(c)
 return h.hexdigest()
def stable(v):
 if isinstance(v,list):return '['+','.join(stable(x) for x in v)+']'
 if isinstance(v,dict):return '{'+','.join(json.dumps(k,ensure_ascii=False)+':'+stable(v[k]) for k in sorted(v))+'}'
 return json.dumps(v,ensure_ascii=False,separators=(',',':'))
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--manifest',required=True);ap.add_argument('--output',required=True);a=ap.parse_args()
 manifest_path=Path(a.manifest).resolve();m=json.loads(manifest_path.read_text(encoding='utf-8'));copy=dict(m);expected_integrity=copy.pop('integritySha256',None);actual_integrity=hashlib.sha256(stable(copy).encode()).hexdigest()
 if expected_integrity!=actual_integrity:raise RuntimeError(f'manifest_integrity_mismatch:{expected_integrity}:{actual_integrity}')
 out=Path(a.output).resolve();out.parent.mkdir(parents=True,exist_ok=True);total=0
 with out.open('wb') as target:
  for row in sorted(m['chunks'],key=lambda r:r['index']):
   part=manifest_path.parent/row['path'];
   if part.stat().st_size!=row['byteLength'] or sha_file(part)!=row['sha256']:raise RuntimeError('chunk_mismatch:'+row['path'])
   data=part.read_bytes();target.write(data);total+=len(data)
 if total!=m['bundle']['byteLength'] or sha_file(out)!=m['bundle']['sha256']:raise RuntimeError('assembled_bundle_mismatch')
 print(json.dumps({'status':'PASS','output':str(out),'byteLength':total,'sha256':sha_file(out),'chunks':len(m['chunks'])}))
if __name__=='__main__':main()
