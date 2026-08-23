#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
from pathlib import Path, PurePosixPath
from typing import Any

ROOT_FILES = [
    '.node-version', '.npmrc', '.nvmrc', 'eslint.config.mjs', 'i18n.ts',
    'navigation.ts', 'next-env.d.ts', 'next.config.mjs', 'package-lock.json',
    'package.json', 'postcss.config.js', 'proxy.ts', 'routing.ts',
    'tailwind.config.ts', 'tsconfig.json',
]
RECURSIVE_ROOTS = ['app', 'components', 'lib', 'store', 'data', 'messages']
EXPLICIT_CONFIG_FILES = [
    'config/pass21/merchant-legal-profile.json',
    'config/pass35/product-cell-catalog.json',
    'config/pass36/a102r44p18-official-provider-rights-decision-matrix.json',
    'config/pass36/a89-public-trust-intake-index.json',
    'config/pass36/current-release-authority.json',
]


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


def collect_paths(checkout_root: Path) -> list[str]:
    selected: set[str] = set(ROOT_FILES)
    selected.update(EXPLICIT_CONFIG_FILES)
    for root_name in RECURSIVE_ROOTS:
        root = safe_path(checkout_root, root_name)
        if not root.is_dir():
            raise RuntimeError(f'required_projection_root_missing:{root_name}')
        for path in root.rglob('*'):
            if path.is_file():
                selected.add(path.relative_to(checkout_root).as_posix())
    return sorted(selected)


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


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def write_receipt(path: Path, receipt: dict[str, Any]) -> None:
    integrity_input = dict(receipt)
    integrity_input.pop('integritySha256', None)
    receipt['integritySha256'] = stable_sha(integrity_input)
    write_json(path, receipt)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--checkout-root', required=True)
    parser.add_argument('--meta', required=True)
    parser.add_argument('--output-root', required=True)
    parser.add_argument('--receipt', required=True)
    parser.add_argument('--rows-output', required=True)
    args = parser.parse_args()

    checkout_root = Path(args.checkout_root).resolve()
    meta_path = Path(args.meta).resolve()
    output_root = Path(args.output_root).resolve()
    receipt_path = Path(args.receipt).resolve()
    rows_output = Path(args.rows_output).resolve()
    meta = json.loads(meta_path.read_text(encoding='utf-8'))
    expected = meta['projection']

    receipt: dict[str, Any] = {
        'schemaVersion': 'velmere.p50.existing-branch-selection-projection-reconstruction.v1',
        'status': 'IN_PROGRESS',
        'classification': 'EXACT_P46_BUILD_RELEVANT_PROJECTION_FROM_DETERMINISTIC_SELECTION_RULE',
        'checkoutRoot': str(checkout_root),
        'meta': {'path': str(meta_path), 'sha256': sha256_file(meta_path)},
        'selectionRule': {
            'rootFiles': ROOT_FILES,
            'recursiveRoots': RECURSIVE_ROOTS,
            'explicitConfigFiles': EXPLICIT_CONFIG_FILES,
        },
        'expectedProjection': expected,
        'fullP46SourceBinding': meta['fullP46SourceBinding'],
        'truthBoundary': 'PASS proves only that the deterministically selected 1597 build-relevant files on this GitHub branch exactly match the P46 projection aggregate. Full P46 source, Browser, PDF, customer outputs, rights, value and sale remain excluded.',
    }

    try:
        paths = collect_paths(checkout_root)
        rows: list[dict[str, Any]] = []
        missing: list[str] = []
        for relative in paths:
            source = safe_path(checkout_root, relative)
            if not source.is_file():
                missing.append(relative)
                continue
            rows.append({'path': relative, 'byteLength': source.stat().st_size, 'sha256': sha256_file(source)})
        write_json(rows_output, {'schemaVersion': 'velmere.p50.observed-branch-projection-rows.v1', 'files': rows})
        observed = identity(rows)
        expected_identity = {
            'fileCount': expected['fileCount'],
            'payloadBytes': expected['payloadBytes'],
            'pathSetSha256': expected['pathSetSha256'],
            'sourceContentAggregateSha256': expected['sourceContentAggregateSha256'],
        }
        exact = not missing and observed == expected_identity
        receipt['observedProjection'] = observed
        receipt['observedRows'] = {'path': str(rows_output), 'sha256': sha256_file(rows_output), 'count': len(rows)}
        receipt['missingSelectedFiles'] = missing
        receipt['exactIdentityPass'] = exact
        if not exact:
            receipt['status'] = 'FAIL'
            receipt['decision'] = 'FAIL_EXISTING_BRANCH_SELECTION_NOT_EXACT_P46_BUILD_PROJECTION'
            receipt['credit'] = 'WITHHELD'
            write_receipt(receipt_path, receipt)
            print(json.dumps(receipt, indent=2, ensure_ascii=False))
            return 2

        if output_root.exists():
            shutil.rmtree(output_root)
        output_root.mkdir(parents=True, exist_ok=True)
        for row in rows:
            source = safe_path(checkout_root, row['path'])
            target = safe_path(output_root, row['path'])
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
            try:
                os.chmod(target, 0o644)
            except OSError:
                pass
        copied_rows = [
            {'path': row['path'], 'byteLength': safe_path(output_root, row['path']).stat().st_size, 'sha256': sha256_file(safe_path(output_root, row['path']))}
            for row in rows
        ]
        copied_identity = identity(copied_rows)
        if copied_identity != expected_identity:
            raise RuntimeError(f'copied_projection_identity_mismatch:{copied_identity}')
        runtime_manifest = {
            'schemaVersion': 'velmere.p50.runtime-build-projection-manifest.v1',
            'classification': 'EXACT_P46_BUILD_RELEVANT_PROJECTION_FROM_EXISTING_GITHUB_BRANCH',
            'fullP46SourceBinding': meta['fullP46SourceBinding'],
            'projection': expected,
            'files': rows,
            'truthBoundary': meta['truthBoundary'],
        }
        runtime_manifest_path = output_root.parent / 'P50_RUNTIME_PROJECTION_MANIFEST.json'
        write_json(runtime_manifest_path, runtime_manifest)
        receipt['copiedProjection'] = copied_identity
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
        receipt['decision'] = 'FAIL_CLOSED_EXISTING_BRANCH_SELECTION_RECONSTRUCTION'
        receipt['error'] = f'{type(error).__name__}: {error}'
        receipt['credit'] = 'WITHHELD'
        write_receipt(receipt_path, receipt)
        print(json.dumps(receipt, indent=2, ensure_ascii=False))
        return 3


if __name__ == '__main__':
    raise SystemExit(main())
