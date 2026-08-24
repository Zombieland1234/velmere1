#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import lzma
import os
import shutil
import subprocess
from collections import defaultdict
from pathlib import Path, PurePosixPath
from typing import Any, BinaryIO


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


def safe_target(root: Path, relative: str) -> Path:
    posix = PurePosixPath(relative)
    if not relative or posix.is_absolute() or '..' in posix.parts or '\\' in relative or ':' in posix.parts[0]:
        raise RuntimeError(f'unsafe_projection_path:{relative}')
    target = (root / Path(*posix.parts)).resolve()
    if target != root and root not in target.parents:
        raise RuntimeError(f'projection_path_outside_root:{relative}')
    return target


def parse_rows(payload: bytes) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    previous: str | None = None
    for line_number, raw in enumerate(payload.decode('utf-8').splitlines(), 1):
        fields = raw.split('\t')
        if len(fields) != 3:
            raise RuntimeError(f'manifest_tsv_invalid_line:{line_number}')
        path, size_raw, digest = fields
        size = int(size_raw)
        if len(digest) != 64 or any(ch not in '0123456789abcdef' for ch in digest):
            raise RuntimeError(f'manifest_tsv_invalid_sha256:{line_number}')
        if previous is not None and path <= previous:
            raise RuntimeError(f'manifest_path_order_or_duplicate:{line_number}:{path}')
        safe_target(Path('/tmp/p50-safe-root').resolve(), path)
        rows.append({'path': path, 'byteLength': size, 'sha256': digest})
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
    clean = dict(receipt)
    clean.pop('integritySha256', None)
    receipt['integritySha256'] = stable_sha(clean)
    path.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def materialize_bytes(output_root: Path, paths: list[str], data: bytes, found: dict[str, dict[str, Any]], source: str) -> int:
    created = 0
    digest = sha256_bytes(data)
    for relative in paths:
        if relative in found:
            continue
        target = safe_target(output_root, relative)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        try:
            os.chmod(target, 0o644)
        except OSError:
            pass
        found[relative] = {'path': relative, 'byteLength': len(data), 'sha256': digest, 'source': source}
        created += 1
    return created


def scan_filesystem(seed_root: Path, expected_by_key: dict[tuple[int, str], list[str]], output_root: Path, found: dict[str, dict[str, Any]]) -> dict[str, Any]:
    scanned_files = scanned_bytes = matched_files = 0
    if not seed_root.is_dir():
        return {'exists': False, 'scannedFiles': 0, 'scannedBytes': 0, 'matchedFiles': 0}
    expected_sizes = {key[0] for key in expected_by_key}
    for path in sorted((p for p in seed_root.rglob('*') if p.is_file()), key=lambda p: p.as_posix()):
        size = path.stat().st_size
        scanned_files += 1
        scanned_bytes += size
        if size not in expected_sizes:
            continue
        data = path.read_bytes()
        digest = sha256_bytes(data)
        paths = expected_by_key.get((size, digest))
        if paths:
            matched_files += materialize_bytes(output_root, paths, data, found, f'filesystem:{path.relative_to(seed_root).as_posix()}')
    return {'exists': True, 'scannedFiles': scanned_files, 'scannedBytes': scanned_bytes, 'matchedFiles': matched_files}


def git_object_ids(repo: Path) -> list[str]:
    proc = subprocess.run(['git', 'rev-list', '--objects', '--all'], cwd=repo, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if proc.returncode != 0:
        raise RuntimeError(f'git_rev_list_failed:{proc.returncode}:{proc.stderr[-4000:]}')
    return sorted({line.split(' ', 1)[0].strip() for line in proc.stdout.splitlines() if line.strip()})


def candidate_git_blobs(repo: Path, object_ids: list[str], expected_sizes: set[int]) -> tuple[list[tuple[str, int]], dict[str, Any]]:
    payload = ''.join(f'{oid}\n' for oid in object_ids).encode('ascii')
    proc = subprocess.run(
        ['git', 'cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize)'],
        cwd=repo,
        input=payload,
        capture_output=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(f'git_batch_check_failed:{proc.returncode}:{proc.stderr[-4000:].decode("utf-8", "replace")}')
    candidates: list[tuple[str, int]] = []
    blobs = blob_bytes = 0
    for raw in proc.stdout.decode('utf-8', 'replace').splitlines():
        fields = raw.split()
        if len(fields) != 3 or fields[1] != 'blob':
            continue
        size = int(fields[2])
        blobs += 1
        blob_bytes += size
        if size in expected_sizes:
            candidates.append((fields[0], size))
    return candidates, {'reachableObjects': len(object_ids), 'reachableBlobs': blobs, 'reachableBlobBytes': blob_bytes, 'candidateBlobsBySize': len(candidates)}


def read_batch_blob(stdout: BinaryIO) -> tuple[str, bytes]:
    header = stdout.readline()
    if not header:
        raise RuntimeError('git_batch_unexpected_eof')
    fields = header.decode('utf-8', 'replace').strip().split()
    if len(fields) < 3 or fields[1] != 'blob':
        raise RuntimeError(f'git_batch_invalid_header:{header!r}')
    size = int(fields[2])
    data = stdout.read(size)
    terminator = stdout.read(1)
    if len(data) != size or terminator != b'\n':
        raise RuntimeError(f'git_batch_truncated_blob:{fields[0]}:{len(data)}:{size}:{terminator!r}')
    return fields[0], data


def scan_git(repo: Path, expected_by_key: dict[tuple[int, str], list[str]], output_root: Path, found: dict[str, dict[str, Any]]) -> dict[str, Any]:
    object_ids = git_object_ids(repo)
    candidates, inventory = candidate_git_blobs(repo, object_ids, {key[0] for key in expected_by_key})
    process = subprocess.Popen(['git', 'cat-file', '--batch'], cwd=repo, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if process.stdin is None or process.stdout is None or process.stderr is None:
        raise RuntimeError('git_batch_pipe_unavailable')
    matched_files = scanned_candidates = scanned_bytes = 0
    try:
        for oid, expected_size in candidates:
            process.stdin.write(f'{oid}\n'.encode('ascii'))
            process.stdin.flush()
            returned_oid, data = read_batch_blob(process.stdout)
            if returned_oid != oid or len(data) != expected_size:
                raise RuntimeError(f'git_batch_identity_mismatch:{oid}:{returned_oid}:{expected_size}:{len(data)}')
            scanned_candidates += 1
            scanned_bytes += len(data)
            digest = sha256_bytes(data)
            paths = expected_by_key.get((len(data), digest))
            if paths:
                matched_files += materialize_bytes(output_root, paths, data, found, f'git-blob:{oid}')
    finally:
        try:
            process.stdin.close()
        except Exception:
            pass
        stderr = process.stderr.read().decode('utf-8', 'replace')
        return_code = process.wait(timeout=30)
        if return_code != 0:
            raise RuntimeError(f'git_batch_failed:{return_code}:{stderr[-4000:]}')
    return {**inventory, 'scannedCandidateBlobs': scanned_candidates, 'scannedCandidateBytes': scanned_bytes, 'matchedFiles': matched_files}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--repo', required=True)
    parser.add_argument('--seed-root', required=True)
    parser.add_argument('--manifest-b64', required=True)
    parser.add_argument('--meta', required=True)
    parser.add_argument('--output-root', required=True)
    parser.add_argument('--receipt', required=True)
    args = parser.parse_args()

    repo = Path(args.repo).resolve()
    seed_root = Path(args.seed_root).resolve()
    manifest_path = Path(args.manifest_b64).resolve()
    meta_path = Path(args.meta).resolve()
    output_root = Path(args.output_root).resolve()
    receipt_path = Path(args.receipt).resolve()
    meta = json.loads(meta_path.read_text(encoding='utf-8'))
    receipt: dict[str, Any] = {
        'schemaVersion': 'velmere.p50.all-refs-p42-exact-build-projection-reconstruction.v1',
        'status': 'IN_PROGRESS',
        'classification': 'EXACT_P46_BUILD_RELEVANT_PROJECTION_FROM_ALL_REACHABLE_GIT_AND_P42_ARTIFACT_BYTES',
        'fullP46SourceBinding': meta['fullP46SourceBinding'],
        'expectedProjection': meta['projection'],
        'truthBoundary': 'PASS can credit only exact reconstruction of the 1597-file P46 build-relevant projection and its subsequent native-Windows checks. Full source, Browser, PDF, customer, rights, value and sale remain excluded.',
    }
    try:
        b64 = manifest_path.read_bytes()
        if len(b64) != meta['base64ByteLength'] or sha256_bytes(b64) != meta['base64Sha256']:
            raise RuntimeError('manifest_base64_integrity_mismatch')
        xz = base64.b64decode(b64, validate=True)
        if len(xz) != meta['xzByteLength'] or sha256_bytes(xz) != meta['xzSha256']:
            raise RuntimeError('manifest_xz_integrity_mismatch')
        tsv = lzma.decompress(xz, format=lzma.FORMAT_XZ)
        if len(tsv) != meta['tsvByteLength'] or sha256_bytes(tsv) != meta['tsvSha256']:
            raise RuntimeError('manifest_tsv_integrity_mismatch')
        rows = parse_rows(tsv)
        manifest_identity = identity(rows)
        expected_identity = {
            'fileCount': meta['projection']['fileCount'],
            'payloadBytes': meta['projection']['payloadBytes'],
            'pathSetSha256': meta['projection']['pathSetSha256'],
            'sourceContentAggregateSha256': meta['projection']['sourceContentAggregateSha256'],
        }
        if manifest_identity != expected_identity:
            raise RuntimeError(f'manifest_identity_mismatch:{manifest_identity}')
        expected_by_key: dict[tuple[int, str], list[str]] = defaultdict(list)
        for row in rows:
            expected_by_key[(row['byteLength'], row['sha256'])].append(row['path'])
        if output_root.exists():
            shutil.rmtree(output_root)
        output_root.mkdir(parents=True, exist_ok=True)
        found: dict[str, dict[str, Any]] = {}
        receipt['p42ArtifactScan'] = scan_filesystem(seed_root, expected_by_key, output_root, found)
        receipt['gitScan'] = scan_git(repo, expected_by_key, output_root, found)
        missing = [row['path'] for row in rows if row['path'] not in found]
        receipt['coverage'] = {
            'expectedFiles': len(rows),
            'coveredFiles': len(found),
            'missingFiles': len(missing),
            'coveragePercent': round((len(found) / len(rows)) * 100, 6),
            'missing': missing,
            'covered': [found[row['path']] for row in rows if row['path'] in found],
        }
        if missing:
            receipt['status'] = 'FAIL'
            receipt['decision'] = 'FAIL_CLOSED_INCOMPLETE_P46_BUILD_PROJECTION_BYTE_POOL'
            receipt['credit'] = 'WITHHELD'
            write_receipt(receipt_path, receipt)
            print(json.dumps(receipt, indent=2, ensure_ascii=False))
            return 2
        copied_rows = [{'path': row['path'], 'byteLength': safe_target(output_root, row['path']).stat().st_size, 'sha256': sha256_file(safe_target(output_root, row['path']))} for row in rows]
        copied_identity = identity(copied_rows)
        if copied_identity != manifest_identity:
            raise RuntimeError(f'copied_projection_identity_mismatch:{copied_identity}')
        runtime_manifest = {
            'schemaVersion': 'velmere.p50.runtime-build-projection-manifest.v1',
            'classification': 'EXACT_P46_BUILD_RELEVANT_PROJECTION_FROM_ALL_REFS_AND_P42',
            'fullP46SourceBinding': meta['fullP46SourceBinding'],
            'projection': meta['projection'],
            'files': rows,
            'truthBoundary': meta['truthBoundary'],
        }
        runtime_manifest_path = output_root.parent / 'P50_RUNTIME_PROJECTION_MANIFEST.json'
        runtime_manifest_path.write_text(json.dumps(runtime_manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
        receipt['runtimeManifest'] = {'path': str(runtime_manifest_path), 'byteLength': runtime_manifest_path.stat().st_size, 'sha256': sha256_file(runtime_manifest_path)}
        receipt['copiedProjection'] = copied_identity
        receipt['status'] = 'PASS'
        receipt['decision'] = 'PASS_EXACT_P46_BUILD_PROJECTION_RECONSTRUCTED_FROM_ALL_REFS_AND_P42'
        receipt['credit'] = 'READY_FOR_NATIVE_WINDOWS_SEMANTIC_LINT_DUAL_BUILD'
        write_receipt(receipt_path, receipt)
        print(json.dumps(receipt, indent=2, ensure_ascii=False))
        return 0
    except Exception as error:
        receipt['status'] = 'FAIL'
        receipt['decision'] = 'FAIL_CLOSED_ALL_REFS_P42_PROJECTION_RECONSTRUCTION'
        receipt['error'] = f'{type(error).__name__}: {error}'
        receipt['credit'] = 'WITHHELD'
        write_receipt(receipt_path, receipt)
        print(json.dumps(receipt, indent=2, ensure_ascii=False))
        return 3


if __name__ == '__main__':
    raise SystemExit(main())
