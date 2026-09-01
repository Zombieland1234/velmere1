#!/usr/bin/env python3
"""Build and verify the minimal exact GitHub/Windows transport surface.

The generated workflow is deliberately outside the execution slice.  It binds
the slice and full-source identities without introducing a workflow -> bundle
-> workflow hash cycle.  The tar and zstd payloads are each rebuilt twice and
must be byte-identical before any surface is emitted.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import shutil
import stat
import subprocess
import tarfile
import tempfile
from typing import Any

try:
    import zstandard as zstd
except ImportError:  # exact system-zstd fallback is resolved fail-closed below
    zstd = None


SOURCE_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_TEMPLATE = SOURCE_ROOT / "scripts/r7/templates/r7-final-exact-windows.yml.template"
DEFAULT_BRANCH = "velmere-r7-final-exact-windows-20260824"
GENERATED_AT = "2026-08-24T00:00:00.000Z"
TAR_MTIME = 315_532_800  # 1980-01-01T00:00:00Z
PART_CHARS = 700_000  # divisible by four and below the connector blob boundary
EXPECTED_ZSTANDARD_PYTHON = "0.25.0"
EXPECTED_LIBZSTD = (1, 5, 7)
EXPECTED_ZSTD_CLI = "1.5.7"
PDF_FONT_LOGICAL_PATH = "r7-runtime/external-assets/manrope-pdf-latin-plus-ext.ttf"
PDF_FONT_EXPECTED_BYTE_LENGTH = 46_464
PDF_FONT_EXPECTED_SHA256 = "a07eea516ecb22957f162d68a559462c9af0534487669969d500f8e92aece0fa"
PDF_FONT_EXPECTED_GIT_BLOB_SHA1 = "716393b0614fdceaf6f5578694479466ed495b14"
PDF_FONT_LICENSE_LOGICAL_PATH = "r7-runtime/external-assets/OFL-Manrope.txt"
PDF_FONT_LICENSE_EXPECTED_BYTE_LENGTH = 4_384
PDF_FONT_LICENSE_EXPECTED_SHA256 = "e01b637272e0cbdfb240184dd98ea5cc671556d9894dae2668d92ab2c906787c"
PDF_FONT_LICENSE_EXPECTED_GIT_BLOB_SHA1 = "472064afc4b8dec9079fab03b8ffafb617a1b2d8"
PDF_FONT_LICENSE_REQUIRED_MARKERS = (
    b"Copyright 2018 The Manrope Project Authors",
    b"SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007",
)


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def git_blob_sha1(value: bytes) -> str:
    digest = hashlib.sha1(usedforsecurity=False)
    digest.update(f"blob {len(value)}\0".encode("ascii"))
    digest.update(value)
    return digest.hexdigest()


def verify_external_runtime_asset(
    path: Path,
    *,
    label: str,
    logical_path: str,
    expected_byte_length: int,
    expected_sha256: str,
    expected_git_blob_sha1: str,
    required_markers: tuple[bytes, ...] = (),
) -> tuple[bytes, dict[str, Any]]:
    if path.is_symlink():
        raise RuntimeError(f"{label}_symbolic_link_denied:{path}")
    if not path.is_file() or not stat.S_ISREG(path.stat().st_mode):
        raise RuntimeError(f"{label}_regular_file_required:{path}")
    resolved_path = path.resolve()
    try:
        resolved_path.relative_to(SOURCE_ROOT.resolve())
    except ValueError:
        pass
    else:
        raise RuntimeError(f"{label}_must_remain_external_to_source_only:{resolved_path}")
    data = path.read_bytes()
    observed_sha256 = sha256_bytes(data)
    observed_git_blob_sha1 = git_blob_sha1(data)
    if len(data) != expected_byte_length:
        raise RuntimeError(f"{label}_byte_length_mismatch:{len(data)}")
    if observed_sha256 != expected_sha256:
        raise RuntimeError(f"{label}_sha256_mismatch:{observed_sha256}")
    if observed_git_blob_sha1 != expected_git_blob_sha1:
        raise RuntimeError(f"{label}_git_blob_sha1_mismatch:{observed_git_blob_sha1}")
    for marker in required_markers:
        if marker not in data:
            raise RuntimeError(f"{label}_required_license_marker_missing")
    return data, {
        "logicalPath": logical_path,
        "byteLength": len(data),
        "sha256": observed_sha256,
        "gitBlobSha1": observed_git_blob_sha1,
    }


def verify_external_runtime_font_assets(pdf_font: Path, pdf_font_license: Path) -> tuple[bytes, bytes, dict[str, Any]]:
    font_bytes, font_receipt = verify_external_runtime_asset(
        pdf_font,
        label="pdf_font",
        logical_path=PDF_FONT_LOGICAL_PATH,
        expected_byte_length=PDF_FONT_EXPECTED_BYTE_LENGTH,
        expected_sha256=PDF_FONT_EXPECTED_SHA256,
        expected_git_blob_sha1=PDF_FONT_EXPECTED_GIT_BLOB_SHA1,
    )
    license_bytes, license_receipt = verify_external_runtime_asset(
        pdf_font_license,
        label="pdf_font_license",
        logical_path=PDF_FONT_LICENSE_LOGICAL_PATH,
        expected_byte_length=PDF_FONT_LICENSE_EXPECTED_BYTE_LENGTH,
        expected_sha256=PDF_FONT_LICENSE_EXPECTED_SHA256,
        expected_git_blob_sha1=PDF_FONT_LICENSE_EXPECTED_GIT_BLOB_SHA1,
        required_markers=PDF_FONT_LICENSE_REQUIRED_MARKERS,
    )
    return font_bytes, license_bytes, {
        "mode": "EXTERNAL_RUNTIME_FONT_EXACT_HASH_REQUIRED",
        "environmentVariable": "VELMERE_PDF_FONT_PATH",
        "fontBytesIncludedInSource": False,
        "fontBytesIncludedInExecutionSlice": False,
        "transportedInGitHubExecutionSurface": True,
        "materializedIntoRuntimeProjectBeforeBuild": True,
        "pdfFont": font_receipt,
        "license": license_receipt,
    }


def canonical_json(value: Any) -> bytes:
    return (json.dumps(value, indent=2, ensure_ascii=False) + "\n").encode("utf-8")


def safe_relative_path(value: str) -> str:
    if not isinstance(value, str) or not value or "\x00" in value or "\\" in value:
        raise RuntimeError(f"unsafe_relative_path:{value!r}")
    path = PurePosixPath(value)
    if path.is_absolute() or any(part in {"", ".", ".."} for part in path.parts):
        raise RuntimeError(f"unsafe_relative_path:{value!r}")
    return path.as_posix()


def regular_files(root: Path) -> list[str]:
    rows: list[str] = []
    for path in root.rglob("*"):
        if path.is_symlink():
            raise RuntimeError(f"symbolic_link_denied:{path.relative_to(root).as_posix()}")
        if path.is_file():
            if not stat.S_ISREG(path.stat().st_mode):
                raise RuntimeError(f"non_regular_file_denied:{path.relative_to(root).as_posix()}")
            rows.append(path.relative_to(root).as_posix())
    return sorted(rows, key=lambda value: value.encode("utf-8"))


def assert_unique_paths(paths: list[str], label: str) -> None:
    if len(paths) != len(set(paths)):
        raise RuntimeError(f"{label}_duplicate_path")
    folded: dict[str, str] = {}
    for path in paths:
        key = path.casefold()
        if key in folded and folded[key] != path:
            raise RuntimeError(f"{label}_windows_case_collision:{folded[key]}:{path}")
        folded[key] = path


def verify_slice(slice_root: Path) -> dict[str, Any]:
    manifest_path = slice_root / "R7_EXECUTION_SLICE_MANIFEST.json"
    if not manifest_path.is_file():
        raise RuntimeError("missing_execution_slice_manifest")
    manifest_bytes = manifest_path.read_bytes()
    manifest = json.loads(manifest_bytes)
    if manifest.get("schemaVersion") != "velmere.r7.execution-slice-manifest.v3":
        raise RuntimeError(f"execution_slice_schema_mismatch:{manifest.get('schemaVersion')}")
    if manifest.get("candidate") != "R7_MERGED_CURRENT_SOURCE":
        raise RuntimeError("execution_slice_candidate_mismatch")
    if manifest.get("testDenominator") != 52:
        raise RuntimeError("execution_slice_test_denominator_mismatch")

    rows = manifest.get("files")
    if not isinstance(rows, list) or manifest.get("fileCount") != len(rows):
        raise RuntimeError("execution_slice_file_denominator_mismatch")
    row_paths = [safe_relative_path(row.get("path")) for row in rows]
    additional_paths = [safe_relative_path(path) for path in manifest.get("archiveAdditionalPaths", [])]
    assert_unique_paths(row_paths + additional_paths, "execution_slice")
    expected_paths = sorted(row_paths + additional_paths, key=lambda value: value.encode("utf-8"))
    observed_paths = regular_files(slice_root)
    if observed_paths != expected_paths:
        missing = sorted(set(expected_paths) - set(observed_paths))[:20]
        extra = sorted(set(observed_paths) - set(expected_paths))[:20]
        raise RuntimeError(f"execution_slice_path_set_mismatch:missing={missing}:extra={extra}")

    body = bytearray()
    payload_bytes = 0
    for row, rel in zip(rows, row_paths, strict=True):
        path = slice_root / rel
        data = path.read_bytes()
        observed_sha = sha256_bytes(data)
        if len(data) != row.get("byteLength") or observed_sha != row.get("sha256"):
            raise RuntimeError(f"execution_slice_byte_identity_mismatch:{rel}")
        body.extend(f"{row['sha256']}\t{row['byteLength']}\t{rel}\n".encode("utf-8"))
        payload_bytes += len(data)
    aggregate = sha256_bytes(bytes(body))
    if aggregate != manifest.get("aggregateIdentitySha256"):
        raise RuntimeError(f"execution_slice_aggregate_mismatch:{aggregate}")
    if payload_bytes != manifest.get("payloadByteLength"):
        raise RuntimeError("execution_slice_payload_length_mismatch")
    if (slice_root / "R7_EXECUTION_SLICE_MANIFEST.tsv").read_bytes() != bytes(body):
        raise RuntimeError("execution_slice_tsv_mismatch")

    package_sha = sha256_file(slice_root / "package.json")
    lock_sha = sha256_file(slice_root / "package-lock.json")
    if package_sha != manifest.get("packageJsonSha256"):
        raise RuntimeError("execution_slice_package_json_mismatch")
    if lock_sha != manifest.get("packageLockSha256"):
        raise RuntimeError("execution_slice_package_lock_mismatch")

    full_source = manifest.get("fullSource") or {}
    full_identity_path = slice_root / safe_relative_path(full_source.get("identityPath"))
    full_manifest_path = slice_root / safe_relative_path(full_source.get("manifestPath"))
    full_identity = json.loads(full_identity_path.read_text(encoding="utf-8"))
    if sha256_file(full_manifest_path) != full_source.get("manifestWithHeaderSha256"):
        raise RuntimeError("full_source_manifest_hash_mismatch")
    for key in [
        "fileCount",
        "pathSetSha256",
        "aggregateIdentitySha256",
        "manifestWithHeaderSha256",
        "packageJsonSha256",
        "packageLockSha256",
    ]:
        if full_identity.get(key) != full_source.get(key):
            raise RuntimeError(f"full_source_identity_field_mismatch:{key}")
    if full_identity.get("totalBytes") != full_source.get("payloadByteLength"):
        raise RuntimeError("full_source_payload_length_mismatch")
    if full_source.get("packageJsonSha256") != package_sha or full_source.get("packageLockSha256") != lock_sha:
        raise RuntimeError("full_source_dependency_binding_mismatch")
    copied_identity = slice_root / "artifacts/r7/VELMERE_R7_FULL_SOURCE_IDENTITY.json"
    if not copied_identity.is_file() or json.loads(copied_identity.read_text(encoding="utf-8")) != full_identity:
        raise RuntimeError("full_source_identity_copy_mismatch")

    return {
        "manifest": manifest,
        "manifestSha256": sha256_bytes(manifest_bytes),
        "paths": observed_paths,
        "packageJsonSha256": package_sha,
        "packageLockSha256": lock_sha,
        "fullSource": full_source,
    }


def build_tar(slice_root: Path, paths: list[str], output: Path) -> bytes:
    with output.open("wb") as stream:
        with tarfile.open(fileobj=stream, mode="w", format=tarfile.PAX_FORMAT) as archive:
            for rel in paths:
                data = (slice_root / rel).read_bytes()
                info = tarfile.TarInfo(rel)
                info.size = len(data)
                info.mtime = TAR_MTIME
                info.uid = 0
                info.gid = 0
                info.uname = ""
                info.gname = ""
                info.mode = 0o644
                info.type = tarfile.REGTYPE
                info.pax_headers = {}
                archive.addfile(info, io.BytesIO(data))
    return output.read_bytes()


def resolve_zstd_runtime() -> dict[str, Any]:
    if zstd is not None:
        python_version = getattr(zstd, "__version__", None)
        lib_version = tuple(getattr(zstd, "ZSTD_VERSION", ()))
        if python_version == EXPECTED_ZSTANDARD_PYTHON and lib_version == EXPECTED_LIBZSTD:
            return {
                "mode": "PYTHON_ZSTANDARD",
                "pythonZstandardVersion": python_version,
                "libzstdVersion": ".".join(map(str, lib_version)),
            }

    executable = shutil.which("zstd")
    if executable is None:
        observed_python = getattr(zstd, "__version__", None) if zstd is not None else None
        observed_lib = tuple(getattr(zstd, "ZSTD_VERSION", ())) if zstd is not None else ()
        raise RuntimeError(
            f"zstd_runtime_unavailable:python={observed_python}:lib={observed_lib}:cli=missing"
        )
    probe = subprocess.run(
        [executable, "--version"],
        text=True,
        capture_output=True,
        check=False,
    )
    version_text = f"{probe.stdout}\n{probe.stderr}".strip()
    if probe.returncode != 0 or f"v{EXPECTED_ZSTD_CLI}" not in version_text:
        raise RuntimeError(f"zstd_cli_runtime_mismatch:exit={probe.returncode}:version={version_text!r}")
    return {
        "mode": "SYSTEM_ZSTD_CLI",
        "zstdCliVersion": EXPECTED_ZSTD_CLI,
        "zstdExecutable": str(Path(executable).resolve()),
        "libzstdVersion": EXPECTED_ZSTD_CLI,
        "pythonZstandardVersion": None,
    }


def compress_tar(tar_bytes: bytes, runtime: dict[str, Any]) -> bytes:
    if runtime["mode"] == "PYTHON_ZSTANDARD":
        assert zstd is not None
        compressor = zstd.ZstdCompressor(
            level=10,
            threads=1,
            write_checksum=True,
            write_content_size=True,
            write_dict_id=False,
        )
        return compressor.compress(tar_bytes)

    executable = runtime["zstdExecutable"]
    with tempfile.TemporaryDirectory(prefix="velmere-r7-zstd-cli-") as temp_name:
        temp = Path(temp_name)
        input_path = temp / "input.tar"
        output_path = temp / "output.tar.zst"
        input_path.write_bytes(tar_bytes)
        result = subprocess.run(
            [
                executable,
                "-10",
                "-T1",
                "--check",
                "--no-dictID",
                "--quiet",
                "--force",
                str(input_path),
                "-o",
                str(output_path),
            ],
            text=True,
            capture_output=True,
            check=False,
        )
        if result.returncode != 0 or not output_path.is_file():
            raise RuntimeError(f"zstd_cli_compression_failed:exit={result.returncode}")
        return output_path.read_bytes()


def write_bytes(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def render_workflow(template_path: Path, values: dict[str, str]) -> bytes:
    text = template_path.read_text(encoding="utf-8")
    for key, value in values.items():
        text = text.replace(f"@@{key}@@", value)
    if "@@" in text:
        unresolved = sorted(set(part.split("@@", 1)[0] for part in text.split("@@")[1::2]))
        raise RuntimeError(f"unresolved_workflow_template_token:{unresolved}")
    return text.encode("utf-8")


def run_secret_scan(slice_root: Path, surface: Path, output: Path) -> dict[str, Any]:
    node = shutil.which("node")
    scanner = SOURCE_ROOT / "scripts/r7/scan-r7-successor-secrets.mjs"
    if node is None:
        raise RuntimeError("node_required_for_existing_project_secret_scanner")
    if not scanner.is_file():
        raise RuntimeError("missing_existing_project_secret_scan_bridge")
    result = subprocess.run(
        [
            node,
            str(scanner),
            "--source-root",
            str(SOURCE_ROOT),
            "--slice",
            str(slice_root),
            "--surface",
            str(surface),
            "--output",
            str(output),
        ],
        cwd=SOURCE_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if not output.is_file():
        raise RuntimeError(f"secret_scanner_failed_without_receipt:exit={result.returncode}")
    receipt = json.loads(output.read_text(encoding="utf-8"))
    if result.returncode != 0 or receipt.get("status") != "PASS_SECRETS_0" or receipt.get("findingCount") != 0:
        # The bridge emits only redacted fingerprints, but fail without copying
        # any scanner stdout/stderr into a transport or operator receipt.
        raise RuntimeError(f"secret_scan_fail_closed:exit={result.returncode}:findings={receipt.get('findingCount')}")
    if receipt.get("rawSecretValuesRetained") is not False:
        raise RuntimeError("secret_scan_redaction_contract_mismatch")
    return receipt


def build_surface(
    slice_root: Path,
    surface: Path,
    template: Path,
    branch: str,
    pdf_font: Path,
    pdf_font_license: Path,
) -> dict[str, Any]:
    if surface.exists() and any(surface.iterdir()):
        raise RuntimeError(f"surface_must_be_new_or_empty:{surface}")
    font_bytes, font_license_bytes, external_runtime_assets = verify_external_runtime_font_assets(
        pdf_font,
        pdf_font_license,
    )
    surface.mkdir(parents=True, exist_ok=True)
    verified = verify_slice(slice_root)
    manifest = verified["manifest"]

    zstd_runtime = resolve_zstd_runtime()

    with tempfile.TemporaryDirectory(prefix="velmere-r7-successor-transport-") as temp_name:
        temp = Path(temp_name)
        tar_a = build_tar(slice_root, verified["paths"], temp / "a.tar")
        tar_b = build_tar(slice_root, verified["paths"], temp / "b.tar")
        if tar_a != tar_b:
            raise RuntimeError("deterministic_tar_rebuild_mismatch")
        bundle_a = compress_tar(tar_a, zstd_runtime)
        bundle_b = compress_tar(tar_b, zstd_runtime)
        if bundle_a != bundle_b:
            raise RuntimeError("deterministic_zstd_rebuild_mismatch")

    encoded = base64.b64encode(bundle_a).decode("ascii")
    chunks = [encoded[index:index + PART_CHARS] for index in range(0, len(encoded), PART_CHARS)]
    width = max(2, len(str(max(len(chunks) - 1, 0))))
    parts_directory = surface / "r7-runtime/parts"
    parts_directory.mkdir(parents=True, exist_ok=True)
    part_rows: list[dict[str, Any]] = []
    for index, chunk in enumerate(chunks):
        name = f"R7_EXECUTION_SLICE.tar.zst.part-{index:0{width}d}.b64"
        data = f"{chunk}\n".encode("ascii")
        path = parts_directory / name
        write_bytes(path, data)
        part_rows.append({
            "path": f"parts/{name}",
            "byteLength": len(data),
            "base64CharacterLength": len(chunk),
            "sha256": sha256_bytes(data),
        })

    write_bytes(surface / PDF_FONT_LOGICAL_PATH, font_bytes)
    write_bytes(surface / PDF_FONT_LICENSE_LOGICAL_PATH, font_license_bytes)

    with tempfile.TemporaryDirectory(prefix="velmere-r7-successor-pre-scan-") as scan_temp_name:
        preliminary_scan = run_secret_scan(
            slice_root,
            surface,
            Path(scan_temp_name) / "R7_PRELIMINARY_SECRET_SCAN.json",
        )

    full_source = verified["fullSource"]
    source_binding = {
        "fileCount": manifest["fileCount"],
        "payloadByteLength": manifest["payloadByteLength"],
        "executionSliceAggregateSha256": manifest["aggregateIdentitySha256"],
        "executionSliceManifestSha256": verified["manifestSha256"],
        "fullSourceFileCount": full_source["fileCount"],
        "fullSourcePayloadByteLength": full_source["payloadByteLength"],
        "fullSourceAggregateSha256": full_source["aggregateIdentitySha256"],
        "fullSourceManifestSha256": full_source["manifestWithHeaderSha256"],
        "packageJsonSha256": verified["packageJsonSha256"],
        "packageLockSha256": verified["packageLockSha256"],
        "testDenominator": manifest["testDenominator"],
        "ancestry": manifest["ancestry"],
    }
    transport_receipt = {
        "schemaVersion": "velmere.r7.windows-execution-transport.v4",
        "generatedAt": GENERATED_AT,
        "candidate": manifest["candidate"],
        "bundle": {
            "logicalPath": "R7_EXECUTION_SLICE.tar.zst",
            "byteLength": len(bundle_a),
            "sha256": sha256_bytes(bundle_a),
            "encoding": "zstd-tar",
            "compressionLevel": 10,
            "threads": 1,
            "frameChecksum": True,
        },
        "tar": {
            "byteLength": len(tar_a),
            "sha256": sha256_bytes(tar_a),
            "format": "pax",
            "mtime": "1980-01-01T00:00:00Z",
            "uid": 0,
            "gid": 0,
            "fileMode": "0644",
            "directoriesStored": 0,
        },
        "archiveEntryCount": len(verified["paths"]),
        "base64EncodedLength": len(encoded),
        "partCharacterLimit": PART_CHARS,
        "partCount": len(part_rows),
        "parts": part_rows,
        "externalRuntimeAssets": external_runtime_assets,
        "sourceBinding": source_binding,
        "determinism": {
            "tarBuilds": 2,
            "zstdBuilds": 2,
            "tarByteIdentical": True,
            "zstdByteIdentical": True,
            **zstd_runtime,
        },
        "secretScan": {
            "schemaVersion": preliminary_scan["schemaVersion"],
            "scannerAuthority": preliminary_scan["scannerAuthority"],
            "status": "PASS_SECRETS_0",
            "sourceFindingCount": preliminary_scan["source"]["findingCount"],
            "archiveFindingCount": preliminary_scan["archive"]["findingCount"],
            "findingCount": preliminary_scan["source"]["findingCount"] + preliminary_scan["archive"]["findingCount"],
            "secrets": 0,
            "rawSecretValuesRetained": False,
        },
        "secrets": 0,
        "customerFinalCredit": False,
        "truthBoundary": "Exact deterministic transport identity only. Hosted Windows engineering and customer-route gates remain separate.",
    }
    transport_path = surface / "r7-runtime/R7_WINDOWS_EXECUTION_TRANSPORT_RECEIPT.json"
    write_bytes(transport_path, canonical_json(transport_receipt))
    transport_sha = sha256_file(transport_path)

    replacements = {
        "TARGET_BRANCH": branch,
        "CANDIDATE": manifest["candidate"],
        "PART_COUNT": str(len(part_rows)),
        "FILE_COUNT": str(manifest["fileCount"]),
        "PAYLOAD_BYTE_LENGTH": str(manifest["payloadByteLength"]),
        "BUNDLE_SHA256": sha256_bytes(bundle_a),
        "EXECUTION_SLICE_AGGREGATE_SHA256": manifest["aggregateIdentitySha256"],
        "EXECUTION_SLICE_MANIFEST_SHA256": verified["manifestSha256"],
        "FULL_SOURCE_AGGREGATE_SHA256": full_source["aggregateIdentitySha256"],
        "FULL_SOURCE_MANIFEST_SHA256": full_source["manifestWithHeaderSha256"],
        "PACKAGE_JSON_SHA256": verified["packageJsonSha256"],
        "PACKAGE_LOCK_SHA256": verified["packageLockSha256"],
        "TRANSPORT_RECEIPT_SHA256": transport_sha,
        "PDF_FONT_PATH": PDF_FONT_LOGICAL_PATH,
        "PDF_FONT_BYTE_LENGTH": str(PDF_FONT_EXPECTED_BYTE_LENGTH),
        "PDF_FONT_SHA256": PDF_FONT_EXPECTED_SHA256,
        "PDF_FONT_GIT_BLOB_SHA1": PDF_FONT_EXPECTED_GIT_BLOB_SHA1,
        "PDF_FONT_LICENSE_PATH": PDF_FONT_LICENSE_LOGICAL_PATH,
        "PDF_FONT_LICENSE_BYTE_LENGTH": str(PDF_FONT_LICENSE_EXPECTED_BYTE_LENGTH),
        "PDF_FONT_LICENSE_SHA256": PDF_FONT_LICENSE_EXPECTED_SHA256,
        "PDF_FONT_LICENSE_GIT_BLOB_SHA1": PDF_FONT_LICENSE_EXPECTED_GIT_BLOB_SHA1,
    }
    workflow_path = surface / ".github/workflows/r7-final-exact-windows.yml"
    write_bytes(workflow_path, render_workflow(template, replacements))
    write_bytes(surface / ".gitattributes", b"* -text\n")

    with tempfile.TemporaryDirectory(prefix="velmere-r7-successor-final-scan-") as scan_temp_name:
        final_secret_scan = run_secret_scan(
            slice_root,
            surface,
            Path(scan_temp_name) / "R7_SUCCESSOR_SECRET_SCAN_RECEIPT.json",
        )
    final_secret_scan["surface"]["generatedReceiptSelfExclusions"] = [
        "R7_GITHUB_EXECUTION_SURFACE_RECEIPT.json",
        "r7-runtime/R7_SUCCESSOR_SECRET_SCAN_RECEIPT.json",
    ]
    final_secret_scan["surface"]["generatedReceiptSelfExclusionReason"] = (
        "Both excluded files are deterministic scanner/tree metadata created only after the scan; "
        "they contain no source credentials or externally supplied values and are byte-bound by the Git tree."
    )
    secret_receipt_path = surface / "r7-runtime/R7_SUCCESSOR_SECRET_SCAN_RECEIPT.json"
    write_bytes(secret_receipt_path, canonical_json(final_secret_scan))
    secret_receipt_sha = sha256_file(secret_receipt_path)

    receipt_name = "R7_GITHUB_EXECUTION_SURFACE_RECEIPT.json"
    file_rows = []
    for rel in regular_files(surface):
        if rel == receipt_name:
            continue
        path = surface / rel
        data = path.read_bytes()
        file_rows.append({
            "path": rel,
            "byteLength": len(data),
            "sha256": sha256_bytes(data),
            "gitBlobSha1": git_blob_sha1(data),
        })
    surface_receipt = {
        "schemaVersion": "velmere.r7.github-execution-surface.v4",
        "generatedAt": GENERATED_AT,
        "candidate": manifest["candidate"],
        "targetBranch": branch,
        "workflow": {
            "path": ".github/workflows/r7-final-exact-windows.yml",
            "sha256": sha256_file(workflow_path),
            "runner": "windows-2025",
            "node": "24.18.0",
            "npm": "11.16.0",
            "npmCiIgnoreScripts": False,
            "testRuns": 2,
            "testDenominator": 52,
        },
        "sourceBinding": source_binding,
        "bundle": transport_receipt["bundle"],
        "externalRuntimeAssets": external_runtime_assets,
        "transportReceiptSha256": transport_sha,
        "secretScanReceiptSha256": secret_receipt_sha,
        "secretScan": {
            "status": final_secret_scan["status"],
            "findingCount": final_secret_scan["findingCount"],
            "secrets": 0,
            "sourceScannedFileCount": final_secret_scan["source"]["scannedFileCount"],
            "archiveScannedFileCount": final_secret_scan["archive"]["scannedFileCount"],
            "surfaceScannedFileCount": final_secret_scan["surface"]["scannedFileCount"],
            "encodedPayloadFileCount": final_secret_scan["surface"]["encodedPayloadFileCount"],
            "rawSecretValuesRetained": False,
        },
        "secrets": 0,
        "partCount": len(part_rows),
        "files": file_rows,
        "selfExcludedPath": receipt_name,
        "expectedTrackedFileCount": len(file_rows) + 1,
        "gitTreeContract": {
            "freshTreeRequired": True,
            "baseTree": None,
            "blobMode": "100644",
            "singleCommitSingleRefUpdate": True,
            "forceUpdateAllowed": False,
        },
        "customerFinalCredit": False,
        "truthBoundary": "Minimal exact GitHub control tree. Hosted PASS, server authority binding and product-route FINAL remain separate.",
    }
    write_bytes(surface / receipt_name, canonical_json(surface_receipt))

    observed_surface_paths = regular_files(surface)
    expected_surface_paths = sorted(
        [row["path"] for row in file_rows] + [receipt_name], key=lambda value: value.encode("utf-8")
    )
    if observed_surface_paths != expected_surface_paths:
        raise RuntimeError("generated_surface_path_set_mismatch")
    for row in file_rows:
        path = surface / row["path"]
        if path.stat().st_size != row["byteLength"] or sha256_file(path) != row["sha256"]:
            raise RuntimeError(f"generated_surface_byte_mismatch:{row['path']}")

    return {
        "schemaVersion": "velmere.r7.successor-transport-build.v1",
        "status": "PASS_DETERMINISTIC_SUCCESSOR_SURFACE_BUILT",
        "surface": str(surface),
        "candidate": manifest["candidate"],
        "fullSourceAggregateSha256": full_source["aggregateIdentitySha256"],
        "executionSliceAggregateSha256": manifest["aggregateIdentitySha256"],
        "executionSliceManifestSha256": verified["manifestSha256"],
        "bundleSha256": sha256_bytes(bundle_a),
        "workflowSha256": sha256_file(workflow_path),
        "transportReceiptSha256": transport_sha,
        "secretScanReceiptSha256": secret_receipt_sha,
        "surfaceReceiptSha256": sha256_file(surface / receipt_name),
        "surfaceReceiptGitBlobSha1": git_blob_sha1((surface / receipt_name).read_bytes()),
        "secrets": 0,
        "partCount": len(part_rows),
        "externalRuntimeAssets": external_runtime_assets,
        "trackedFileCount": len(expected_surface_paths),
        "customerFinalCredit": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--slice", type=Path, required=True)
    parser.add_argument("--surface", type=Path, required=True)
    parser.add_argument("--workflow-template", type=Path, default=DEFAULT_TEMPLATE)
    parser.add_argument("--branch", default=DEFAULT_BRANCH)
    parser.add_argument("--pdf-font", type=Path, required=True)
    parser.add_argument("--pdf-font-license", type=Path, required=True)
    args = parser.parse_args()
    result = build_surface(
        slice_root=args.slice.resolve(),
        surface=args.surface.resolve(),
        template=args.workflow_template.resolve(),
        branch=args.branch,
        pdf_font=args.pdf_font.absolute(),
        pdf_font_license=args.pdf_font_license.absolute(),
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(json.dumps({"status": "FAIL_CLOSED", "error": str(error)}, indent=2), file=__import__("sys").stderr)
        raise SystemExit(1)
