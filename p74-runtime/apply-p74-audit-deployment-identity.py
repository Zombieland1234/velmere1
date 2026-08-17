from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

PARENT = (1598, 21014913, '9cb47f15e73ec678e32fe214b8e2947a4bfbaa624d8fb5101650296700d3dd25', 'b25efb6aeb017989e96ed1c4bc1fee02a4f181fc5103e9396091d23333a7c92b')
PREIMAGES = {
    'lib/security/audit-adjudicated-authority-evidence.ts': (19142, '242868a1a746a6d256c01ce6f902929d964b97e42102644517d6e5b0bb042b54'),
    'lib/security/audit-provider-runtime-client.ts': (39628, '090c7377c7a963395adbd7446339d1a4ef91e68fc59dcee7ab8dc068db107bcd'),
    'lib/security/audit-customer-report-pipeline.ts': (24885, 'd78b55074bcc8e0b8e90f4c0752c639ca86e7ffb148da561f58ceccafab286e8'),
    'lib/security/audit-claim-ledger.ts': (15965, '9f799c6322f1be59df3e3add2bb559251f41b92f296896ece6f26e142d3ad18a'),
    'lib/server/security-route-modules/audit-report-assembler.ts': (13129, '3876162367a12c2d05f522bf1fd2fef8b2c5f5a2e7ac87f2651268b8cf8087cb'),
}
NEW_PATH = 'lib/security/audit-deployment-identity-evidence.ts'
DELTA_ROOT = Path(__file__).resolve().parent / 'product-delta'

def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()

def projection_identity(rows: list[dict]):
    ordered = sorted(rows, key=lambda row: row['path'])
    payload = sum(int(row['byteLength']) for row in ordered)
    path_set = hashlib.sha256('\n'.join(row['path'] for row in ordered).encode()).hexdigest()
    aggregate = hashlib.sha256()
    for row in ordered:
        aggregate.update(f"{row['path']}\0{row['byteLength']}\0{row['sha256']}\n".encode())
    return len(ordered), payload, path_set, aggregate.hexdigest(), ordered

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-root', required=True)
    parser.add_argument('--manifest', required=True)
    parser.add_argument('--output-manifest', required=True)
    parser.add_argument('--receipt', required=True)
    args = parser.parse_args()

    source_root = Path(args.source_root)
    manifest = json.loads(Path(args.manifest).read_text(encoding='utf-8'))
    projection = manifest['projection']
    got_parent = (
        int(projection['fileCount']), int(projection['payloadBytes']),
        projection['pathSetSha256'], projection['sourceContentAggregateSha256'],
    )
    if got_parent != PARENT:
        raise SystemExit(f'P74 P73R7 parent identity mismatch: {got_parent} != {PARENT}')

    rows = {row['path']: dict(row) for row in manifest['files']}
    if NEW_PATH in rows:
        raise SystemExit(f'P74 new path unexpectedly exists in parent manifest: {NEW_PATH}')

    changes = []
    for rel, (expected_bytes, expected_sha) in PREIMAGES.items():
        target = source_root / rel
        before = target.read_bytes()
        if len(before) != expected_bytes or sha(before) != expected_sha:
            raise SystemExit(f'P74 preimage mismatch:{rel}:{len(before)}:{sha(before)}')
        delta = DELTA_ROOT / rel
        after = delta.read_bytes()
        target.write_bytes(after)
        rows[rel]['byteLength'] = len(after)
        rows[rel]['sha256'] = sha(after)
        changes.append({
            'path': rel,
            'kind': 'modified',
            'beforeBytes': len(before), 'beforeSha256': expected_sha,
            'afterBytes': len(after), 'afterSha256': sha(after),
        })

    new_delta = DELTA_ROOT / NEW_PATH
    new_bytes = new_delta.read_bytes()
    new_target = source_root / NEW_PATH
    if new_target.exists():
        raise SystemExit(f'P74 new target already exists:{NEW_PATH}')
    new_target.parent.mkdir(parents=True, exist_ok=True)
    new_target.write_bytes(new_bytes)
    rows[NEW_PATH] = {'path': NEW_PATH, 'byteLength': len(new_bytes), 'sha256': sha(new_bytes)}
    changes.append({
        'path': NEW_PATH, 'kind': 'added',
        'beforeBytes': 0, 'beforeSha256': None,
        'afterBytes': len(new_bytes), 'afterSha256': sha(new_bytes),
    })

    count, payload, path_set, aggregate, ordered = projection_identity(list(rows.values()))
    manifest['files'] = ordered
    manifest['projection']['fileCount'] = count
    manifest['projection']['payloadBytes'] = payload
    manifest['projection']['pathSetSha256'] = path_set
    manifest['projection']['sourceContentAggregateSha256'] = aggregate
    truth = (
        'P74 integrates the P74R5 exact Ancient8 Multicall3 source/compiler/current-runtime identity into the real Audit authority/claim/customer/route path; '
        'A8Scan/Conduit remains one non-independent provider family, independent runtime-provider quorum remains OPEN, no vulnerability ground truth is invented, '
        'Pro/Advanced authority isolation remains intact, Pass4644 receipt sealing is centralized, and source-bound provider/blockchain clocks may be fresh while transport clocks remain non-commercial.'
    )
    manifest['p74Delta'] = {
        'classification': 'AUDIT_CURRENT_DEPLOYMENT_IDENTITY_PRODUCT_INTEGRATION',
        'parentRevision': 'P73R7',
        'parentAggregateSha256': PARENT[3],
        'p74r5ReplayRunId': '32063820844',
        'p74r5ReplayArtifactId': '9299112031',
        'changedBuildRelevantFiles': changes,
        'boundedCurrentRuntimeIdentityCredit': 1,
        'boundedSourceDeploymentIdentityCredit': 1,
        'independentRuntimeProviderQuorum': 'OPEN',
        'vulnerabilityGroundTruthCredit': 0,
        'customerFinalOutputCredit': 0,
        'auditFinalPdfCredit': 0,
        'rights': '2/203',
        'paidValue': '0/10',
        'sale': '0/20',
        'live': False,
        'truthBoundary': truth,
    }
    Path(args.output_manifest).write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    receipt = {
        'schemaVersion': 'velmere.p74.audit-current-deployment-identity-product-patch.v1',
        'status': 'PASS_PATCH_APPLIED_NOT_YET_ENGINEERING_PROVEN',
        'parentRevision': 'P73R7',
        'parentAggregateSha256': PARENT[3],
        'p74r5ReplayRunId': '32063820844',
        'p74r5ReplayArtifactId': '9299112031',
        'changes': changes,
        'projection': {
            'fileCount': count, 'payloadBytes': payload,
            'pathSetSha256': path_set, 'sourceContentAggregateSha256': aggregate,
        },
        'boundedCurrentRuntimeIdentityCredit': 1,
        'boundedSourceDeploymentIdentityCredit': 1,
        'independentRuntimeProviderQuorum': 'OPEN',
        'vulnerabilityGroundTruthCredit': 0,
        'customerFinalOutputCredit': 0,
        'auditFinalPdfCredit': 0,
        'rights': '2/203', 'paidValue': '0/10', 'sale': '0/20', 'live': False,
        'truthBoundary': truth,
    }
    Path(args.receipt).write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(receipt, indent=2))

if __name__ == '__main__':
    main()
