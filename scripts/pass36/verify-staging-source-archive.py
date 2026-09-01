#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import stat
import struct
import unicodedata
import zipfile


DIGEST = 64
SUPPORTED_COMPRESSION = {zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED}


def sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def canonical(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


def safe_path(value: str) -> bool:
    return (
        bool(value)
        and not value.startswith("/")
        and "\\" not in value
        and "\x00" not in value
        and all(part not in ("", ".", "..") for part in value.split("/"))
    )


def collision_key(value: str) -> str:
    return (
        unicodedata.normalize("NFKC", value)
        .casefold()
        .replace("ß", "ss")
        .replace("ς", "σ")
    )


def local_header(raw: bytes, info: zipfile.ZipInfo) -> dict[str, object]:
    offset = info.header_offset
    if offset < 0 or offset + 30 > len(raw):
        raise ValueError("local_header_bounds")
    fields = struct.unpack_from("<IHHHHHIIIHH", raw, offset)
    if fields[0] != 0x04034B50:
        raise ValueError("local_header_signature")
    name_length, extra_length = fields[9], fields[10]
    name_start = offset + 30
    name_end = name_start + name_length
    if name_end + extra_length > len(raw):
        raise ValueError("local_header_name_bounds")
    name_bytes = raw[name_start:name_end]
    encoding = "utf-8" if fields[2] & 0x0800 else "cp437"
    name = name_bytes.decode(encoding)
    return {
        "flags": fields[2],
        "compression": fields[3],
        "crc": fields[6],
        "compressed": fields[7],
        "uncompressed": fields[8],
        "name": name,
    }


def verify(args: argparse.Namespace) -> dict[str, object]:
    archive_path = pathlib.Path(args.archive).resolve()
    raw = archive_path.read_bytes()
    failures: list[dict[str, object]] = []
    checks: list[dict[str, object]] = []

    def add(identifier: str, passed: bool, detail: object = None) -> None:
        row = {"id": identifier, "passed": bool(passed), "detail": detail}
        checks.append(row)
        if not passed:
            failures.append({"id": identifier, "detail": detail})

    add("archive:sha", sha256(raw) == args.expected_archive_sha256)
    add("archive:bytes", len(raw) == args.expected_archive_bytes)
    try:
        with zipfile.ZipFile(archive_path) as archive:
            infos = archive.infolist()
            names = [info.filename for info in infos]
            add("zip:crc", archive.testzip() is None)
            add("zip:entry-count-positive", len(infos) > 1, len(infos))
            add("zip:paths-safe", all(safe_path(name) for name in names))
            add("zip:paths-raw-unique", len(names) == len(set(names)))
            folded = [collision_key(name) for name in names]
            add("zip:paths-nfkc-casefold-unique", len(folded) == len(set(folded)))
            add("zip:not-encrypted", all(not (info.flag_bits & 1) for info in infos))
            add("zip:compression-supported", all(info.compress_type in SUPPORTED_COMPRESSION for info in infos))
            add("zip:no-data-descriptors", all(not (info.flag_bits & 0x0008) for info in infos))

            modes = [(info.external_attr >> 16) & 0xFFFF for info in infos]
            add(
                "zip:regular-files-only",
                all(stat.S_IFMT(mode) == stat.S_IFREG for mode in modes),
                [name for name, mode in zip(names, modes) if stat.S_IFMT(mode) != stat.S_IFREG][:20],
            )

            parity_failures = []
            for info in infos:
                try:
                    local = local_header(raw, info)
                    if (
                        local["name"] != info.filename
                        or local["flags"] != info.flag_bits
                        or local["compression"] != info.compress_type
                        or local["crc"] != info.CRC
                        or local["compressed"] != info.compress_size
                        or local["uncompressed"] != info.file_size
                    ):
                        parity_failures.append(info.filename)
                except Exception as error:  # noqa: BLE001
                    parity_failures.append(f"{info.filename}:{type(error).__name__}")
            add("zip:central-local-header-parity", not parity_failures, parity_failures[:20])

            manifest_paths = [
                name
                for name in names
                if name.startswith("_velmere/") and name.endswith("_SOURCE_ONLY_MANIFEST.json")
            ]
            add("manifest:exactly-one", len(manifest_paths) == 1, manifest_paths)
            if len(manifest_paths) != 1:
                raise ValueError("source_manifest_count")
            manifest_path = manifest_paths[0]
            manifest = json.loads(archive.read(manifest_path))
            core = dict(manifest)
            declared_manifest_sha = core.pop("manifestSha256", None)
            actual_manifest_sha = sha256(canonical(core))
            add("manifest:self-hash", declared_manifest_sha == actual_manifest_sha)
            add("manifest:expected-hash", declared_manifest_sha == args.expected_manifest_sha256)
            add("manifest:revision", manifest.get("revisionId") == args.expected_revision)
            add(
                "manifest:no-promotion",
                manifest.get("globalDecision") == "NO_GO"
                and manifest.get("live") is False
                and manifest.get("saleEnabled") is False
                and manifest.get("productionApproved") is False
                and manifest.get("worldClassProven") is False,
            )

            entries = manifest.get("entries")
            add("manifest:entries-array", isinstance(entries, list))
            if not isinstance(entries, list):
                raise ValueError("manifest_entries")
            actual_names = [name for name in names if name != manifest_path]
            declared_names = [row.get("path") for row in entries]
            add("manifest:exact-path-set-and-order", actual_names == declared_names)
            add("manifest:file-count", manifest.get("fileCount") == len(entries))
            add(
                "manifest:byte-length",
                manifest.get("byteLength") == sum(int(row.get("byteLength", -1)) for row in entries),
            )

            rows_by_path = {row.get("path"): row for row in entries}
            entry_failures = []
            for info, mode in zip(infos, modes):
                if info.filename == manifest_path:
                    continue
                data = archive.read(info.filename)
                actual = {
                    "path": info.filename,
                    "byteLength": len(data),
                    "sha256": sha256(data),
                    "mode": mode,
                }
                if rows_by_path.get(info.filename) != actual:
                    entry_failures.append(info.filename)
            add("manifest:entry-bytes-hashes-modes", not entry_failures, entry_failures[:20])

            path_set = sha256("\n".join(declared_names).encode())
            aggregate = sha256(
                "\n".join(
                    f"{row['path']}\0{row['byteLength']}\0{row['sha256']}\0{row['mode']}"
                    for row in entries
                ).encode()
            )
            add("manifest:path-set-digest", manifest.get("pathSetSha256") == path_set)
            add("manifest:aggregate-digest", manifest.get("aggregateSha256") == aggregate)
    except Exception as error:  # noqa: BLE001
        add("zip:parse-and-manifest", False, f"{type(error).__name__}:{error}")
        declared_manifest_sha = None
        actual_manifest_sha = None
        manifest_path = None
        infos = []

    return {
        "schemaVersion": "velmere.pass36.staging-source-archive-verification.v1",
        "status": "PASS_STAGING_SOURCE_ARCHIVE_STRUCTURAL_BINDING" if not failures else "FAIL_STAGING_SOURCE_ARCHIVE",
        "archiveSha256": sha256(raw),
        "archiveBytes": len(raw),
        "entryCount": len(infos),
        "manifestPath": manifest_path,
        "manifestSha256": declared_manifest_sha,
        "manifestCoreSha256": actual_manifest_sha,
        "checks": len(checks),
        "passed": len(checks) - len(failures),
        "failed": len(failures),
        "failures": failures,
        "promotionCredit": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--archive", required=True)
    parser.add_argument("--expected-archive-sha256", required=True)
    parser.add_argument("--expected-archive-bytes", required=True, type=int)
    parser.add_argument("--expected-manifest-sha256", required=True)
    parser.add_argument("--expected-revision", required=True)
    args = parser.parse_args()
    result = verify(args)
    print(json.dumps(result, ensure_ascii=False, separators=(",", ":")))
    return 0 if result["failed"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
