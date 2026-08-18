from pathlib import Path
import argparse,base64,hashlib,zipfile
EXPECTED={
 'analyzer.part00':(2180,'d82905e0b588f0fee5231989042c21f78668cc9f00b6de708e1109c1cb1532b4'),
 'analyzer.part01':(2180,'310feadbee4a10210bcc51c710ba79982d5a0ae4e24375f9f0514a9951d63b81'),
 'analyzer.part02':(2180,'a7a37a7fdda519fe0707b715c81364942a78550770f3112f9e2519550d5cfa63'),
 'analyzer.part03':(2180,'ab2c707b9c95e781743dbc7fabd2b5a92d4eb0b66c2474710d70efa0371a69ac'),
}
ZIP_SHA='d4ec0da927c8d0a6c7b9d98bad1b21311a54a03a9d62f6565c6f157700272960'
ANALYZER_SHA='16e51259f81553e0b80d62136ee43157b3db4020792e4664d92b69372ecc1f8d'
ANALYZER_BYTES=22792
ap=argparse.ArgumentParser();ap.add_argument('--parts-dir',default='p78-runtime');ap.add_argument('--out-dir',default='p78-runtime/current-analyzer');a=ap.parse_args()
d=Path(a.parts_dir); chunks=[]
for name in sorted(EXPECTED):
 p=d/name; s=p.read_text(encoding='ascii').strip(); n,h=EXPECTED[name]; oh=hashlib.sha256(s.encode()).hexdigest()
 if len(s)!=n or oh!=h: raise SystemExit(f'P78 analyzer part mismatch {name} {len(s)}/{n} {oh}/{h}')
 chunks.append(s)
raw=base64.b64decode(''.join(chunks),validate=True); zh=hashlib.sha256(raw).hexdigest()
if zh!=ZIP_SHA: raise SystemExit(f'P78 analyzer zip mismatch {zh}/{ZIP_SHA}')
out=Path(a.out_dir);out.mkdir(parents=True,exist_ok=True); z=out/'analyzer.zip';z.write_bytes(raw)
with zipfile.ZipFile(z) as ar: ar.extractall(out)
p=out/'solidity-structured-signal.mjs'; b=p.read_bytes(); h=hashlib.sha256(b).hexdigest()
if len(b)!=ANALYZER_BYTES or h!=ANALYZER_SHA: raise SystemExit(f'P78 analyzer source mismatch {len(b)}/{ANALYZER_BYTES} {h}/{ANALYZER_SHA}')
print(f'PASS_P78_CANONICAL_ANALYZER bytes={len(b)} sha256={h} zip={zh}')
