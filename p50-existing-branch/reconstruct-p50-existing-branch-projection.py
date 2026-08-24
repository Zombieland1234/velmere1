#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import lzma
import os
import shutil
from pathlib import Path, PurePosixPath
from typing import Any


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def stable_sha(value: object) -> str:
    return sha256_bytes(json.dumps(value, sort_keys=True, separators=(',', ':')).encode('utf-8'))


def safe_path(root: Path, relative: str) -> Path:
    posix = PurePosixPath(relative)
    if not relative or posix.is_absolute() or '..' in posix.parts or '\\' in relative or ':' in posix.parts[0]:
        raise RuntimeError(f'unsafe_projection_path:{relative}')
    target = (root / Path(*posix.parts)).resolve()
    if target != root and root not in target.parents:
        raise RuntimeError(f'projection_path_outside_root:{relative}')
    return target


def parse_rows(payload: bytes) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    previous = None
    for line_number, raw in enumerate(payload.decode('utf-8').splitlines(), 1):
        fields = raw.split('\t')
        if len(fields) != 3:
            raise RuntimeError(f'manifest_tsv_invalid_line:{line_number}')
        path, byte_length_raw, digest = fields
        try:
            byte_length = int(byte_length_raw)
        except ValueError as error:
            raise RuntimeError(f'manifest_tsv_invalid_size:{line_number}:{byte_length_raw}') from error
        if len(digest) != 64 or any(ch not in '0123456789abcdef' for ch in digest):
            raise RuntimeError(f'manifest_tsv_invalid_sha256:{line_number}:{digest}')
        if previous is not None and path <= previous:
            raise RuntimeError(f'manifest_path_order_or_duplicate:{line_number}:{path}')
        safe_path(Path('/tmp/p50-safe-root').resolve(), path)
        rows.append({'path': path, 'byteLength': byte_length, 'sha256': digest})
        previous = path
    return rows


def identity(rows: list[dict[str, Any]]) -> dict[str, Any]:
    path_set = sha256_bytes('\n'.join(row['path'] for row in rows).encode('utf-8'))
    aggregate = hashlib.sha256()
    payload_bytes = 0
    for row in rows:
        payload_bytes += row['byteLength']
        aggregate.update(f"{row['path']}\0{row['byteLength']}\0{row['sha256']}\n".encode('utf-8'))
    return {
        'fileCount': len(rows),
        'payloadBytes': payload_bytes,
        'pathSetSha256': path_set,
        'sourceContentAggregateSha256': aggregate.hexdigest(),
    }


def write_receipt(path: Path, receipt: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    integrity_input = dict(receipt)
    integrity_input.pop('integritySha256', None)
    receipt['integritySha256'] = stable_sha(integrity_input)
    path.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--checkout-root', required=True)
    parser.add_argument('--manifest-b64', required=True)
    parser.add_argument('--meta', required=True)
    parser.add_argument('--output-root', required=True)
    parser.add_argument('--receipt', required=True)
    args = parser.parse_args()

    checkout_root = Path(args.checkout_root).resolve()
    manifest_b64_path = Path(args.manifest_b64).resolve()
    meta_path = Path(args.meta).resolve()
    output_root = Path(args.output_root).resolve()
    receipt_path = Path(args.receipt).resolve()
    meta = json.loads(meta_path.read_text(encoding='utf-8'))

    receipt: dict[str, Any] = {
        'schemaVersion': 'velmere.p50.existing-github-branch-projection-reconstruction.v1',
        'status': 'IN_PROGRESS',
        'classification': 'EXACT_P46_BUILD_RELEVANT_PROJECTION_FROM_EXISTING_GITHUB_BRANCH',
        'checkoutRoot': str(checkout_root),
        'meta': {'path': str(meta_path), 'sha256': sha256_file(meta_path)},
        'manifestTransport': {},
        'expectedProjection': meta['projection'],
        'fullP46SourceBinding': meta['fullP46SourceBinding'],
        'truthBoundary': 'This receipt may prove only whether the existing GitHub branch already contains the exact 1597 P46 build-relevant files. Full P46 source, Browser, PDF, customer-output, rights, value and sale credit remain excluded.',
    }

    try:
        b64 = manifest_b64_path.read_bytes()
        if len(b64) != meta['base64ByteLength'] or sha256_bytes(b64) != meta['base64Sha256']:
            raise RuntimeError('manifest_base64_integrity_mismatch')
        try:
            xz = base64.b64decode(b64, validate=True)
        except Exception as error:
            raise RuntimeError(f'manifest_strict_base64_decode_failed:{type(error).__name__}:{error}') from error
        if len(xz) != meta['xzByteLength'] or sha256_bytes(xz) != meta['xzSha256']:
            raise RuntimeError('manifest_xz_integrity_mismatch')
        try:
            tsv = lzma.decompress(xz, format=lzma.FORMAT_XZ)
        except Exception as error:
            raise RuntimeError(f'manifest_xz_decompression_failed:{type(error).__name__}:{error}') from error
        if len(tsv) != meta['tsvByteLength'] or sha256_bytes(tsv) != meta['tsvSha256']:
            raise RuntimeError('manifest_tsv_integrity_mismatch')
        rows = parse_rows(tsv)
        expected_identity = meta['projection']
        observed_manifest_identity = identity(rows)
        if observed_manifest_identity != {
            'fileCount': expected_identity['fileCount'],
            'payloadBytes': expected_identity['payloadBytes'],
            'pathSetSha256': expected_identity['pathSetSha256'],
            'sourceContentAggregateSha256': expected_identity['sourceContentAggregateSha256'],
        }:
            raise RuntimeError(f'manifest_projection_identity_mismatch:{observed_manifest_identity}')
        receipt['manifestTransport'] = {
            'base64': {'path': str(manifest_b64_path), 'byteLength': len(b64), 'sha256': sha256_bytes(b64)},
            'xz': {'byteLength': len(xz), 'sha256': sha256_bytes(xz)},
            'tsv': {'byteLength': len(tsv), 'sha256': sha256_bytes(tsv)},
            'rows': len(rows),
            'identity': observed_manifest_identity,
        }

        if output_root.exists():
            shutil.rmtree(output_root)
        output_root.mkdir(parents=True, exist_ok=True)

        missing: list[str] = []
        mismatches: list[dict[str, Any]] = []
        verified: list[dict[str, Any]] = []
        for row in rows:
            source = safe_path(checkout_root, row['path'])
            if not source.is_file():
                missing.append(row['path'])
                continue
            size = source.stat().st_size
            digest = sha256_file(source)
            if size != row['byteLength'] or digest != row['sha256']:
                mismatches.append({
                    'path': row['path'],
                    'expectedByteLength': row['byteLength'],
                    'actualByteLength': size,
                    'expectedSha256': row['sha256'],
                    'actualSha256': digest,
                })
                continue
            target = safe_path(output_root, row['path'])
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
            try:
                os.chmod(target, 0o644)
            except OSError:
                pass
            verified.append(row)

        receipt['branchScan'] = {
            'expectedFiles': len(rows),
            'verifiedFiles': len(verified),
            'missingCount': len(missing),
            'mismatchCount': len(mismatches),
            'missing': missing,
            'mismatches': mismatches,
        }
        if missing or mismatches:
            receipt['status'] = 'FAIL'
            receipt['decision'] = 'FAIL_EXISTING_BRANCH_NOT_EXACT_P46_BUILD_PROJECTION'
            receipt['credit'] = 'WITHHELD'
            write_receipt(receipt_path, receipt)
            print(json.dumps(receipt, indent=2, ensure_ascii=False))
            return 2

        copied_rows: list[dict[str, Any]] = []
        for row in rows:
            path = safe_path(output_root, row['path'])
            copied_rows.append({'path': row['path'], 'byteLength': path.stat().st_size, 'sha256': sha256_file(path)})
        copied_identity = identity(copied_rows)
        if copied_identity != observed_manifest_identity:
            raise RuntimeError(f'copied_projection_identity_mismatch:{copied_identity}')
        receipt['copiedProjection'] = copied_identity
        runtime_manifest = {
            'schemaVersion': 'velmere.p50.runtime-build-projection-manifest.v1',
            'classification': 'EXACT_P46_BUILD_RELEVANT_PROJECTION_FROM_EXISTING_GITHUB_BRANCH',
            'fullP46SourceBinding': meta['fullP46SourceBinding'],
            'projection': meta['projection'],
            'files': rows,
            'truthBoundary': meta['truthBoundary'],
        }
        runtime_manifest_path = output_root.parent / 'P50_RUNTIME_PROJECTION_MANIFEST.json'
        runtime_manifest_path.write_text(json.dumps(runtime_manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
        receipt['runtimeManifest'] = {
            'path': str(runtime_manifest_path),
            'byteLength': runtime_manifest_path.stat().st_size,
            'sha256': sha256_file(runtime_manifest_path),
        }
        receipt['status'] = 'PASS'
        receipt['decision'] = 'PASS_EXISTING_BRANCH_CONTAINS_EXACT_P46_BUILD_PROJECTION'
        receipt['credit'] = 'EXACT_1597_FILE_PROJECTION_RECONSTRUCTED_READY_FOR_NATIVE_WINDOWS_EXECUTION'
        write_receipt(receipt_path, receipt)
        print(json.dumps(receipt, indent=2, ensure_ascii=False))
        return 0
    except Exception as error:
        receipt['status'] = 'FAIL'
        receipt['decision'] = 'FAIL_CLOSED_EXISTING_BRANCH_PROJECTION_RECONSTRUCTION'
        receipt['error'] = f'{type(error).__name__}: {error}'
        receipt['credit'] = 'WITHHELD'
        write_receipt(receipt_path, receipt)
        print(json.dumps(receipt, indent=2, ensure_ascii=False))
        return 3


if __name__ == '__main__':
    raise SystemExit(main())
