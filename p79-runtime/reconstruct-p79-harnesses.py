from __future__ import annotations
import argparse,base64,gzip,hashlib,tarfile,io,json
from pathlib import Path

def sha(b):return hashlib.sha256(b).hexdigest()
ap=argparse.ArgumentParser();ap.add_argument('--bundle-b64',required=True);ap.add_argument('--output-dir',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args();encoded=Path(a.bundle_b64).read_text().strip();raw=gzip.decompress(base64.b64decode(encoded,validate=True));out=Path(a.output_dir).resolve();out.mkdir(parents=True,exist_ok=True);members=[]
with tarfile.open(fileobj=io.BytesIO(raw),mode='r:') as tf:
    for m in tf.getmembers():
        if not m.isfile():raise SystemExit(f'P79 harness non-file member:{m.name}')
        target=(out/m.name).resolve()
        if out not in target.parents:raise SystemExit(f'P79 harness traversal blocked:{m.name}')
        data=tf.extractfile(m).read();target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data);members.append({'path':m.name,'bytes':len(data),'sha256':sha(data)})
receipt={'schemaVersion':'velmere.p79.harness-reconstruction.v1','status':'PASS','bundleCompressedSha256':sha(base64.b64decode(encoded)),'tarSha256':sha(raw),'memberCount':len(members),'members':members};Path(a.receipt).parent.mkdir(parents=True,exist_ok=True);Path(a.receipt).write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({'status':'PASS','memberCount':len(members)},indent=2))
