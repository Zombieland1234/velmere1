#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import shutil
import tempfile
import zipfile
from pathlib import Path

ROOT = Path.cwd()
OUTPUT = Path('/mnt/data/VELMERE_P101R1_V4_AUDITED_CURRENT_SOURCE_CANDIDATE_R5_2026-08-23.zip')
ARCHIVE_RECEIPT = Path('/mnt/data/VELMERE_R5_ARCHIVE_RECEIPT_2026-08-23.json')
GENERATED_AT = '2026-08-23T02:35:00.000Z'
SELF_EXCLUSIONS = {
    'CURRENT_CANDIDATE_CONTENT_MANIFEST.tsv',
    'CURRENT_CANDIDATE_RECEIPT.json',
    'CURRENT_CANDIDATE_TREE_IDENTITY_EXCLUDING_SELF.json',
    'VELMERE_R5_CURRENT_SOURCE_MANIFEST.tsv',
}
RUNTIME_PREFIXES = ('.git/', '.velmere/', 'node_modules/')
TIMESTAMP = (1980, 1, 1, 0, 0, 0)

sha256_bytes = lambda value: hashlib.sha256(value).hexdigest()
sha256_file = lambda value: sha256_bytes(Path(value).read_bytes())

def runtime_excluded(path: str) -> bool:
    return path.startswith(RUNTIME_PREFIXES)

def collect_source_files() -> list[str]:
    output: list[str] = []
    for base, dirs, files in os.walk(ROOT):
        rel_dir = Path(base).relative_to(ROOT)
        dirs[:] = sorted(
            d for d in dirs
            if not runtime_excluded((rel_dir / d).as_posix() + '/')
        )
        for name in sorted(files):
            rel = (rel_dir / name).as_posix()
            if runtime_excluded(rel):
                continue
            output.append(rel)
    return sorted(output, key=lambda value: value.encode('utf-8'))

def manifest_rows(paths: list[str]) -> list[tuple[str, int, str]]:
    rows = []
    for rel in paths:
        data = (ROOT / rel).read_bytes()
        rows.append((rel, len(data), sha256_bytes(data)))
    return rows

def manifest_bytes(rows: list[tuple[str, int, str]]) -> bytes:
    text = 'path\tbytes\tsha256\n' + ''.join(f'{path}\t{size}\t{digest}\n' for path, size, digest in rows)
    return text.encode('utf-8')

def build_identity_and_receipt() -> dict:
    all_before = collect_source_files()
    identity_paths = [path for path in all_before if path not in SELF_EXCLUSIONS]
    rows = manifest_rows(identity_paths)
    manifest = manifest_bytes(rows)
    body = b''.join(f'{path}\t{size}\t{digest}\n'.encode('utf-8') for path, size, digest in rows)
    path_bytes = b''.join(f'{path}\n'.encode('utf-8') for path, _, _ in rows)
    identity = {
        'schemaVersion': 'velmere.current-candidate-tree-identity-excluding-self.v5',
        'generatedAt': GENERATED_AT,
        'canonicalParent': 'P101R1',
        'candidate': 'R5',
        'excludedPaths': sorted(SELF_EXCLUSIONS),
        'runtimePrefixExclusions': list(RUNTIME_PREFIXES),
        'fileCount': len(rows),
        'totalBytes': sum(size for _, size, _ in rows),
        'pathSetSha256': sha256_bytes(path_bytes),
        'aggregateIdentitySha256': sha256_bytes(body),
        'manifestBodySha256': sha256_bytes(body),
        'manifestWithHeaderSha256': sha256_bytes(manifest),
        'truthBoundary': 'Exact identity of all R5 candidate files except the four self-referential manifest/receipt/identity paths and runtime-only .git/.velmere/node_modules paths. No product-final credit.',
    }
    (ROOT / 'CURRENT_CANDIDATE_CONTENT_MANIFEST.tsv').write_bytes(manifest)
    (ROOT / 'VELMERE_R5_CURRENT_SOURCE_MANIFEST.tsv').write_bytes(manifest)
    (ROOT / 'CURRENT_CANDIDATE_TREE_IDENTITY_EXCLUDING_SELF.json').write_text(json.dumps(identity, indent=2) + '\n')

    campaign = json.loads((ROOT / 'artifacts/r5/VELMERE_R5_CURRENT_EXECUTION_CAMPAIGN.json').read_text())
    dependencies = json.loads((ROOT / 'artifacts/r5/VELMERE_R5_EXACT_DEPENDENCY_SOURCE_CLOSURE.json').read_text())
    repeatability = json.loads((ROOT / 'artifacts/r5/VELMERE_R5_CAMPAIGN_REPEATABILITY.json').read_text())
    shim = json.loads((ROOT / 'artifacts/r5/VELMERE_R5_TEST_ONLY_SHIM_BOUNDARY.json').read_text())
    market_boundary = json.loads((ROOT / 'artifacts/r5/VELMERE_R5_CUSTOMER_OWNED_MARKET_EVIDENCE_BOUNDARY.json').read_text())
    market_receipt = json.loads((ROOT / 'artifacts/r5/VELMERE_R5_MARKET_IMPACT_CUSTOMER_OWNED_EVIDENCE_RECEIPT.json').read_text())
    real_markets = json.loads((ROOT / 'artifacts/r3/VELMERE_R3_REAL_MARKETS_CURRENT_FIELD_AUTHORITY.json').read_text())
    delta = json.loads((ROOT / 'artifacts/r5/VELMERE_R5_SOURCE_DELTA_FROM_R4.json').read_text())
    receipt = {
        'schemaVersion': 'velmere.current-candidate-receipt.r5.v1',
        'generatedAt': GENERATED_AT,
        'classification': 'AUDITED_CURRENT_SOURCE_CANDIDATE_R5',
        'canonicalParent': 'P101R1',
        'parentCandidate': 'R4',
        'notCanonicalCheckpoint': True,
        'notFinalCandidate': True,
        'globalState': 'NO_GO_STOP_SELL',
        'customerFinal': '0/20',
        'paidValueFinal': '0/10',
        'ownerExecutionOrder': 'INTERNAL_20_OF_20_THEN_CUSTOMER_CAMPAIGNS',
        'identity': identity,
        'manifests': {
            'currentCandidate': 'CURRENT_CANDIDATE_CONTENT_MANIFEST.tsv',
            'r5Source': 'VELMERE_R5_CURRENT_SOURCE_MANIFEST.tsv',
            'currentCandidateSha256': sha256_bytes(manifest),
            'r5SourceSha256': sha256_bytes(manifest),
        },
        'sourceDeltaFromR4': {
            'counts': delta['counts'],
            'changedPathCount': delta['changedPathCount'],
            'receipt': 'artifacts/r5/VELMERE_R5_SOURCE_DELTA_FROM_R4.json',
        },
        'localCampaign': {
            'selectedTests': campaign['selectedTests'],
            'summary': campaign['summary'],
            'actualFailureCount': campaign['actualFailureCount'],
            'classification': campaign['classification'],
        },
        'exactDependencySourceClosure': {
            'status': dependencies['status'],
            'binding': dependencies['binding'],
            'denominator': dependencies['denominator'],
            'remainingDependencyTestCount': len(dependencies['remainingDependencyTests']),
        },
        'campaignRepeatability': {
            'status': repeatability['status'],
            'selectedTests': repeatability['selectedTests'],
            'perTest': repeatability['perTest'],
            'byteIdenticalCampaignClaim': repeatability['byteIdenticalCampaignClaim'],
        },
        'testOnlyShimBoundary': {
            'status': shim['status'],
            'scannedProductionFiles': shim['scannedProductionFiles'],
            'productionNextRuntimeCredit': shim['productionNextRuntimeCredit'],
        },
        'marketImpactCustomerOwnedEvidence': {
            'status': market_boundary['status'],
            'checks': len(market_boundary['checks']),
            'failures': len(market_boundary['failures']),
            'executionStatus': market_receipt['status'],
            'providerNetworkCredit': False,
            'liveMarketDataCredit': False,
            'customerFinalCredit': False,
        },
        'realMarkets': {
            'catalogAssets': real_markets['catalogAssetDenominator'],
            'assetClasses': len(real_markets['supportedAssetClasses']),
            'tiers': len(real_markets['tiers']),
            'ruleRows': real_markets['ruleRowCount'],
            'criticalRuleRows': real_markets['criticalRuleRowCount'],
            'currentExecutionBaseline': real_markets['currentExecutionBaseline'],
        },
        'exactDependencyTreeCredit': False,
        'productionNextReactPgliteCredit': False,
        'exactWindowsCredit': False,
        'authorizedStagingCredit': False,
        'fieldRightsLegalApprovalCredit': False,
        'customerFinalCredit': False,
        'truthBoundary': 'R5 materially adds a real account/asset/snapshot-bound customer-owned Market Impact evidence path and repeatable adversarial local proof. It does not fabricate authorized staging, durable receipt storage/restore, independent rights/quorum, calibrated impact, complete npm tree, exact Windows or row-level Customer FINAL; Customer FINAL remains 0/20.',
    }
    (ROOT / 'CURRENT_CANDIDATE_RECEIPT.json').write_text(json.dumps(receipt, indent=2) + '\n')
    return identity

def write_zip(destination: Path, paths: list[str]) -> None:
    with zipfile.ZipFile(destination, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=1, allowZip64=True) as zf:
        for rel in paths:
            data = (ROOT / rel).read_bytes()
            info = zipfile.ZipInfo(rel, TIMESTAMP)
            info.create_system = 0
            info.external_attr = 0o600 << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            info.flag_bits = 0
            zf.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=1)

def verify_zip(archive: Path, paths: list[str]) -> dict:
    expected = {rel: sha256_file(ROOT / rel) for rel in paths}
    with zipfile.ZipFile(archive, 'r') as zf:
        infos = zf.infolist()
        names = [info.filename for info in infos]
        if names != paths:
            raise RuntimeError('zip_path_order_mismatch')
        if any(info.is_dir() for info in infos):
            raise RuntimeError('unexpected_directory_entry')
        if any(info.date_time != TIMESTAMP for info in infos):
            raise RuntimeError('zip_timestamp_mismatch')
        if any(info.create_system != 0 for info in infos):
            raise RuntimeError('zip_create_system_mismatch')
        for info in infos:
            data = zf.read(info.filename)
            if sha256_bytes(data) != expected[info.filename]:
                raise RuntimeError(f'zip_entry_hash_mismatch:{info.filename}')
    return {'entryCount': len(paths), 'allEntryHashesMatchSource': True, 'pathOrderExact': True, 'timestampsExact': True, 'createSystemExact': True}

def main() -> None:
    identity = build_identity_and_receipt()
    paths = collect_source_files()
    if any(path.startswith(RUNTIME_PREFIXES) for path in paths):
        raise RuntimeError('runtime_exclusion_failed')
    with tempfile.TemporaryDirectory(prefix='velmere-r5-package-') as temp:
        first = Path(temp) / 'r5-first.zip'
        second = Path(temp) / 'r5-second.zip'
        write_zip(first, paths)
        write_zip(second, paths)
        first_sha = sha256_file(first)
        second_sha = sha256_file(second)
        if first_sha != second_sha or first.read_bytes() != second.read_bytes():
            raise RuntimeError('deterministic_rebuild_mismatch')
        verify = verify_zip(first, paths)
        shutil.copyfile(first, OUTPUT)
    archive_sha = sha256_file(OUTPUT)
    delta = json.loads((ROOT / 'artifacts/r5/VELMERE_R5_SOURCE_DELTA_FROM_R4.json').read_text())
    receipt = {
        'schemaVersion': 'velmere.r5.deterministic-source-archive-receipt.v1',
        'generatedAt': GENERATED_AT,
        'archive': OUTPUT.name,
        'archiveByteLength': OUTPUT.stat().st_size,
        'archiveSha256': archive_sha,
        'entryCount': len(paths),
        'sourceIdentityExcludingSelf': identity,
        'sourceDeltaFromR4': {'counts': delta['counts'], 'changedPathCount': delta['changedPathCount']},
        'buildRecipe': 'P101R1_R5_PACKAGE_BUILD_RECIPE.json',
        'deterministicRebuilds': 2,
        'byteIdenticalRebuilds': True,
        'firstSha256': archive_sha,
        'secondSha256': archive_sha,
        'verification': verify,
        'runtimeExclusions': list(RUNTIME_PREFIXES),
        'customerFinal': '0/20',
        'paidValueFinal': '0/10',
        'globalState': 'NO_GO_STOP_SELL',
        'customerFinalCredit': False,
        'truthBoundary': 'Deterministic source packaging and entry/source byte identity only. It does not prove complete dependencies, production runtime, rights, staging, exact Windows, Customer FINAL, GO_PAID or LIVE.',
    }
    ARCHIVE_RECEIPT.write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps(receipt, indent=2))

if __name__ == '__main__':
    main()
