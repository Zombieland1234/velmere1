from __future__ import annotations
import argparse,hashlib
from pathlib import Path
EXPECTED_PARTS=4
EXPECTED_SHA='73d5378a6645b9d82caa43cbf25786435d4f377bbbfe7a63b31f4bbe75e83561'
ap=argparse.ArgumentParser();ap.add_argument('--parts-dir',default='p76-runtime');ap.add_argument('--output',default='p76-runtime/apply-p76-advanced-release-automation.py');a=ap.parse_args();parts=sorted(Path(a.parts_dir).glob('apply.part*'))
if len(parts)!=EXPECTED_PARTS:raise SystemExit(f'P76 base apply part count mismatch:{len(parts)}')
data=b''.join(p.read_bytes() for p in parts);digest=hashlib.sha256(data).hexdigest()
if digest!=EXPECTED_SHA:raise SystemExit(f'P76 base apply transport SHA mismatch:{digest}')
Path(a.output).write_bytes(data);print(f'PASS {len(data)} {digest}')
