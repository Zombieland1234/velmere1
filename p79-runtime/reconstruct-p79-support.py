from __future__ import annotations
import argparse,base64,hashlib,json,zipfile
from pathlib import Path

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()

def safe_extract(z:zipfile.ZipFile,out:Path):
    out=out.resolve()
    for info in z.infolist():
        target=(out/info.filename).resolve()
        if target!=out and out not in target.parents:
            raise SystemExit(f'P79 zip traversal blocked:{info.filename}')
    z.extractall(out)

ap=argparse.ArgumentParser();ap.add_argument('--parts-dir',required=True);ap.add_argument('--output-dir',required=True);a=ap.parse_args()
parts_dir=Path(a.parts_dir);out=Path(a.output_dir);manifest=json.loads((parts_dir/'P79_SUPPORT_BUNDLE_MANIFEST.json').read_text(encoding='utf-8'))
expected=manifest['parts'];actual=sorted(parts_dir.glob('support.part*'),key=lambda p:p.name)
if [p.name for p in actual]!=[r['name'] for r in expected]:raise SystemExit(f"P79 support part set mismatch:{[p.name for p in actual]}")
chunks=[]
for p,row in zip(actual,expected):
    s=p.read_text(encoding='ascii').strip(); observed=sha(s.encode('ascii'))
    if len(s)!=row['chars'] or observed!=row['sha256']:raise SystemExit(f"P79 support part mismatch:{p.name}:{len(s)}/{row['chars']}:{observed}/{row['sha256']}")
    chunks.append(s)
joined=''.join(chunks)
if len(joined)!=manifest['base64Chars']:raise SystemExit(f"P79 base64 length mismatch:{len(joined)}/{manifest['base64Chars']}")
raw=base64.b64decode(joined,validate=True)
if len(raw)!=manifest['bundleBytes'] or sha(raw)!=manifest['bundleSha256']:raise SystemExit(f"P79 bundle mismatch:{len(raw)}/{manifest['bundleBytes']}:{sha(raw)}/{manifest['bundleSha256']}")
out.mkdir(parents=True,exist_ok=True);zpath=out/'p79-support-bundle.zip';zpath.write_bytes(raw)
with zipfile.ZipFile(zpath) as z:
    names=sorted(i.filename for i in z.infolist() if not i.is_dir())
    if names!=sorted(manifest['members']):raise SystemExit('P79 support bundle member set mismatch')
    bad=z.testzip()
    if bad:raise SystemExit(f'P79 support CRC failure:{bad}')
    safe_extract(z,out)
receipt={'schemaVersion':'velmere.p79.support-reconstruction.v1','status':'PASS','bundleBytes':len(raw),'bundleSha256':sha(raw),'partCount':len(actual),'memberCount':len(manifest['members']),'outputDir':str(out),'truthBoundary':manifest['truthBoundary']}
(out/'P79_SUPPORT_RECONSTRUCTION.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8');print(json.dumps(receipt,indent=2))
