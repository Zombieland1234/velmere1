from pathlib import Path
import argparse,base64,hashlib,zipfile
EXPECTED_BUNDLE_SHA="844d0790fbc239bb892073740bdea7691f6d02faead7c4b88f1ba4d08e389eb8"
EXPECTED_PARTS={
    "support.part00": (2385, "513ce8fcc4b69cf369f7dbd9c01898a2ab4671c0fd7fd12ebe118288c9d84210"),
    "support.part01": (2385, "07077142c01e5136b6c4904b3695916d036edd4f78770efa50566a22db88c4ae"),
    "support.part02": (2385, "615a6ad17356bb9e78d0d8d510063533e849e0aca444f89970df3ba266f628da"),
    "support.part03": (2385, "d89b5336a5ea40928eb26733c68a719d3a1e5946d30c938e10070906cb30418e"),
    "support.part04a": (795, "c0871a420adf3d1081121b0392539be291022115c86cdb2e9dadcedd6b8c0794"),
    "support.part04b": (795, "43e3d6276d8f6529d65fe265baf1590ccdd337c32584ba1f7e0881f76d8fb7ec"),
    "support.part04c": (795, "a9f94b046ed816daee8d99aa1361ea69c0fb0249f476e0060dfa15fc5b3540c5"),
    "support.part05": (2385, "7fcb059091f9cb63c37ba199ce0e896f595dc4ab2a49c1f0ef241c8f1ef47c11"),
    "support.part06": (2385, "5696b21c9c05330ca8187a88eaa72ef27e9f93219210cd479a2cd57e73f9fbdf"),
    "support.part07": (2385, "286ef3a4f41d8bab87015d078c7b453c8d0bb667528b1450986195101ebaeb57"),
 }
ap=argparse.ArgumentParser();ap.add_argument('--parts-dir',default='p77-runtime');ap.add_argument('--output-dir',default='p77-runtime');a=ap.parse_args();d=Path(a.parts_dir)
parts=sorted(d.glob('support.part*'))
if [p.name for p in parts] != sorted(EXPECTED_PARTS): raise SystemExit(f'P77 support part set mismatch:{[p.name for p in parts]}')
chunks=[]
for p in parts:
    s=p.read_text(encoding='ascii').strip(); expected_len,expected_sha=EXPECTED_PARTS[p.name]; observed_sha=hashlib.sha256(s.encode()).hexdigest()
    if len(s)!=expected_len or observed_sha!=expected_sha: raise SystemExit(f'P77 support part mismatch:{p.name}:{len(s)}/{expected_len}:{observed_sha}/{expected_sha}')
    chunks.append(s)
joined=''.join(chunks)
raw=base64.b64decode(joined,validate=True); observed=hashlib.sha256(raw).hexdigest()
if observed!=EXPECTED_BUNDLE_SHA: raise SystemExit(f'P77 support bundle SHA mismatch:{observed}')
out=Path(a.output_dir);out.mkdir(parents=True,exist_ok=True);z=out/'p77-support-bundle.zip';z.write_bytes(raw)
with zipfile.ZipFile(z) as archive: archive.extractall(out)
print(f'PASS P77 support parts={len(parts)} chars={len(joined)} bytes={len(raw)} sha256={observed}')
