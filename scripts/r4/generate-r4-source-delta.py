#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import zipfile
from pathlib import Path

ROOT = Path.cwd()
PARENT = Path('/mnt/data/VELMERE_P101R1_V4_AUDITED_CURRENT_SOURCE_CANDIDATE_R3_2026-08-22.zip')
TSV_OUT = ROOT / 'VELMERE_R4_SOURCE_DELTA_FROM_R3.tsv'
JSON_OUT = ROOT / 'artifacts/r4/VELMERE_R4_SOURCE_DELTA_FROM_R3.json'
GENERATED_AT = '2026-08-22T21:48:00.000Z'
EXCLUSIONS = {
    'CURRENT_CANDIDATE_CONTENT_MANIFEST.tsv',
    'CURRENT_CANDIDATE_RECEIPT.json',
    'CURRENT_CANDIDATE_TREE_IDENTITY_EXCLUDING_SELF.json',
    'VELMERE_R4_CURRENT_SOURCE_MANIFEST.tsv',
    'VELMERE_R4_SOURCE_DELTA_FROM_R3.tsv',
    'artifacts/r4/VELMERE_R4_SOURCE_DELTA_FROM_R3.json',
}
RUNTIME_PREFIXES = ('.git/', '.velmere/', 'node_modules/')

sha256 = lambda b: hashlib.sha256(b).hexdigest()

def excluded(path: str) -> bool:
    return path in EXCLUSIONS or path.startswith(RUNTIME_PREFIXES)

parent = {}
with zipfile.ZipFile(PARENT, 'r') as zf:
    for info in zf.infolist():
        if info.is_dir() or excluded(info.filename):
            continue
        data = zf.read(info.filename)
        parent[info.filename] = {'bytes': len(data), 'sha256': sha256(data)}

current = {}
for base, dirs, files in os.walk(ROOT):
    rel_dir = Path(base).relative_to(ROOT)
    dirs[:] = sorted(d for d in dirs if not excluded((rel_dir / d).as_posix() + '/'))
    for name in sorted(files):
        rel = (rel_dir / name).as_posix()
        if excluded(rel):
            continue
        data = (ROOT / rel).read_bytes()
        current[rel] = {'bytes': len(data), 'sha256': sha256(data)}

changes = []
counts = {'ADDED': 0, 'MODIFIED': 0, 'REMOVED': 0, 'UNCHANGED': 0}
for path in sorted(set(parent) | set(current), key=lambda value: value.encode('utf-8')):
    before = parent.get(path)
    after = current.get(path)
    if before is None:
        status = 'ADDED'
    elif after is None:
        status = 'REMOVED'
    elif before['bytes'] == after['bytes'] and before['sha256'] == after['sha256']:
        status = 'UNCHANGED'
    else:
        status = 'MODIFIED'
    counts[status] += 1
    if status != 'UNCHANGED':
        changes.append({
            'status': status,
            'path': path,
            'beforeBytes': before['bytes'] if before else None,
            'beforeSha256': before['sha256'] if before else None,
            'afterBytes': after['bytes'] if after else None,
            'afterSha256': after['sha256'] if after else None,
        })

lines = ['status\tpath\tbefore_bytes\tbefore_sha256\tafter_bytes\tafter_sha256']
for item in changes:
    values = [
        item['status'], item['path'],
        '' if item['beforeBytes'] is None else str(item['beforeBytes']),
        '' if item['beforeSha256'] is None else item['beforeSha256'],
        '' if item['afterBytes'] is None else str(item['afterBytes']),
        '' if item['afterSha256'] is None else item['afterSha256'],
    ]
    lines.append('\t'.join(values))
TSV_OUT.write_text('\n'.join(lines) + '\n')
payload = {
    'schemaVersion': 'velmere.r4.source-delta-from-r3.v1',
    'generatedAt': GENERATED_AT,
    'parentArchive': PARENT.name,
    'parentArchiveSha256': sha256(PARENT.read_bytes()),
    'comparisonExclusions': sorted(EXCLUSIONS),
    'runtimePrefixExclusions': list(RUNTIME_PREFIXES),
    'counts': counts,
    'changedPathCount': len(changes),
    'changes': changes,
    'truthBoundary': 'Byte/path delta from the R3 archive excluding self-referential current manifests/receipts, the delta files themselves and runtime-only .git/.velmere/node_modules paths. It does not prove product FINAL.',
}
JSON_OUT.parent.mkdir(parents=True, exist_ok=True)
JSON_OUT.write_text(json.dumps(payload, indent=2) + '\n')
print(json.dumps({'counts': counts, 'changedPathCount': len(changes), 'tsv': TSV_OUT.name, 'json': JSON_OUT.relative_to(ROOT).as_posix()}, indent=2))
