from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

PARENT = (1598, 21015520, '9cb47f15e73ec678e32fe214b8e2947a4bfbaa624d8fb5101650296700d3dd25', 'd0306b565af73939691a34554e4f7e57543f6d3b91d778a9c93ebf25f5ffd377')
REL = 'lib/security/audit-adjudicated-authority-evidence.ts'
BEFORE_BYTES = 19749
BEFORE_SHA = '0d9ad2b771ad4d19c61853ed5d5562f54c2549b07493690f28edc5383aff6521'
AFTER_BYTES = 19473
AFTER_SHA = 'c65afbd9b51b18d8bd12a39cb856c15faa39073c1979326efb41295713460d0a'
NEXT_ENV_SOURCE_BYTES = 262
NEXT_ENV_SOURCE_SHA = 'e02cf94f68fe440954d3213106a7e943e5424cc867d7cd3ab406dc31263e6767'
NEXT_ENV_GENERATED_BYTES = 247
NEXT_ENV_GENERATED_SHA = '7b550dda9686c16f36a17bf9051d5dbf31e98555b30d114ac49fc49a1e712651'


def identity(rows: list[dict]) -> tuple[int, int, str, str]:
    ordered = sorted(rows, key=lambda row: row['path'])
    payload = sum(int(row['byteLength']) for row in ordered)
    pathset = hashlib.sha256('\n'.join(row['path'] for row in ordered).encode()).hexdigest()
    digest = hashlib.sha256()
    for row in ordered:
        digest.update(f"{row['path']}\0{row['byteLength']}\0{row['sha256']}\n".encode())
    return len(ordered), payload, pathset, digest.hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--manifest', required=True)
    ap.add_argument('--replacement', required=True)
    ap.add_argument('--receipt', required=True)
    args = ap.parse_args()

    manifest = json.loads(Path(args.manifest).read_text(encoding='utf-8'))
    projection = manifest['projection']
    observed_parent = (projection['fileCount'], projection['payloadBytes'], projection['pathSetSha256'], projection['sourceContentAggregateSha256'])
    if observed_parent != PARENT:
        raise SystemExit(f'P73R5 parent identity mismatch:{observed_parent}')

    replacement = Path(args.replacement).read_text(encoding='utf-8').replace('\r\n', '\n').replace('\r', '\n').encode('utf-8')
    replacement_sha = hashlib.sha256(replacement).hexdigest()
    if len(replacement) != AFTER_BYTES or replacement_sha != AFTER_SHA:
        raise SystemExit(f'P73R5 replacement identity mismatch:{len(replacement)}:{replacement_sha}')

    rows = [dict(row) for row in manifest['files']]
    target = next((row for row in rows if row['path'] == REL), None)
    if not target or int(target['byteLength']) != BEFORE_BYTES or target['sha256'] != BEFORE_SHA:
        raise SystemExit(f'P73R5 target row preimage mismatch:{target}')
    target['byteLength'] = AFTER_BYTES
    target['sha256'] = AFTER_SHA
    current = identity(rows)

    next_env = next((row for row in rows if row['path'] == 'next-env.d.ts'), None)
    if not next_env or int(next_env['byteLength']) != NEXT_ENV_SOURCE_BYTES or next_env['sha256'] != NEXT_ENV_SOURCE_SHA:
        raise SystemExit(f'P73R5 next-env source preimage mismatch:{next_env}')
    next_env['byteLength'] = NEXT_ENV_GENERATED_BYTES
    next_env['sha256'] = NEXT_ENV_GENERATED_SHA
    generated = identity(rows)

    receipt = {
        'schemaVersion': 'velmere.p73r5.projection-calibration.v1',
        'status': 'PASS_CALIBRATION_ZERO_PRODUCT_CREDIT',
        'parentProjection': {'fileCount': PARENT[0], 'payloadBytes': PARENT[1], 'pathSetSha256': PARENT[2], 'aggregateSha256': PARENT[3]},
        'replacement': {'path': REL, 'beforeBytes': BEFORE_BYTES, 'beforeSha256': BEFORE_SHA, 'afterBytes': AFTER_BYTES, 'afterSha256': AFTER_SHA},
        'currentProjection': {'fileCount': current[0], 'payloadBytes': current[1], 'pathSetSha256': current[2], 'aggregateSha256': current[3]},
        'generatedNextEnvProjection': {'fileCount': generated[0], 'payloadBytes': generated[1], 'pathSetSha256': generated[2], 'aggregateSha256': generated[3]},
        'customerFinalOutputCredit': 0,
        'auditFinalPdfCredit': 0,
        'rightsCredit': 0,
        'paidValueCredit': 0,
        'saleCredit': 0,
        'live': False,
        'truthBoundary': 'Calibration only. Computes exact P73R5 current and deterministic Next.js-generated projection identities by changing one manifest row in memory after verifying exact P73R4R3 parent and replacement bytes. Product source is not modified and receives zero release credit.',
    }
    Path(args.receipt).write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps(receipt, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
