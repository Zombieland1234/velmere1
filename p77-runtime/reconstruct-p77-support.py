from pathlib import Path
import argparse,base64,hashlib,zipfile
EXPECTED_SHA="26e0fddc72d8f64479cb82eba898251536be6447577be19e5a9a371557977a24"
EXPECTED_PARTS=1
ap=argparse.ArgumentParser();ap.add_argument('--parts-dir',default='p77-runtime');ap.add_argument('--output-dir',default='p77-runtime');a=ap.parse_args();d=Path(a.parts_dir);parts=sorted(d.glob('support.part*'))
if len(parts)!=EXPECTED_PARTS:raise SystemExit(f'P77 support part count mismatch:{len(parts)}/{EXPECTED_PARTS}')
raw=base64.b64decode(''.join(p.read_text(encoding='ascii').strip() for p in parts));observed=hashlib.sha256(raw).hexdigest()
if observed!=EXPECTED_SHA:raise SystemExit(f'P77 support bundle SHA mismatch:{observed}')
out=Path(a.output_dir);out.mkdir(parents=True,exist_ok=True);z=out/'p77-support-bundle.zip';z.write_bytes(raw)
with zipfile.ZipFile(z) as archive:archive.extractall(out)
print(f'PASS P77 support {len(raw)} {observed}')
