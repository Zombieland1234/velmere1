#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, os, pathlib, stat, unicodedata, zipfile

REV = "VELMERE_PASS36_A102R1_OUT_OF_TIME_REPEATED_SLO_VENDOR_EXIT_OBSERVATION_INDEPENDENT_WITNESS_AND_FROZEN_SOURCE_DIVERSITY_TRUTH_BOUNDARY"
PARENT = "VELMERE_PASS36_A102R0_OUT_OF_TIME_REPEATED_SLO_VENDOR_EXIT_OBSERVATION_INDEPENDENT_WITNESS_AND_FROZEN_SOURCE_DIVERSITY_TRUTH_BOUNDARY"
TS = "1980-01-01T00:00:00.000Z"
SOURCE_MANIFEST = "_velmere/PASS36_A102R1_SOURCE_ONLY_MANIFEST.json"
MATERIALS_MANIFEST = "MANIFESTS/PASS36_A102R1_MATERIALS_MANIFEST.json"
IMMUTABLE_LOG = "fixtures/pass35/a42/windows-global-json-crash.log"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical(value) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")


def mode_for(path: pathlib.Path) -> int:
    return (
        0o100755
        if os.stat(path, follow_symlinks=False).st_mode & 0o111
        else 0o100644
    )


def collision_key_casefold(value: str) -> str:
    return (
        unicodedata.normalize("NFKC", value)
        .casefold()
        .replace("ß", "ss")
        .replace("ς", "σ")
    )


def validate_paths(paths: list[str]):
    transforms = [
        ("raw", lambda value: value),
        ("nfkc", lambda value: unicodedata.normalize("NFKC", value)),
        ("casefold", collision_key_casefold),
        ("separator", lambda value: value.replace("\\", "/")),
    ]
    for label, transform in transforms:
        seen: dict[str, str] = {}
        for relative in paths:
            if (
                not relative
                or relative.startswith("/")
                or "\\" in relative
                or "\x00" in relative
                or any(part in ("", ".", "..") for part in relative.split("/"))
            ):
                raise RuntimeError(f"unsafe_path:{relative!r}")
            key = transform(relative)
            if key in seen:
                raise RuntimeError(f"{label}_collision:{seen[key]}:{relative}")
            seen[key] = relative


def source_excluded(relative: str) -> bool:
    top = relative.split("/", 1)[0]
    if (
        top
        in {
            ".git",
            ".velmere",
            ".next",
            ".turbo",
            "_velmere",
            "artifacts",
            "coverage",
            "node_modules",
            "dist",
            "out",
            ".cache",
            "cache",
        }
        or top.startswith(".next-")
    ):
        return True
    segments = relative.split("/")
    base = relative.rsplit("/", 1)[-1]
    if "__pycache__" in segments or base.endswith(".pyc"):
        return True
    if base == ".env" or base.startswith(".env."):
        return True
    if base == ".eslintcache" or base.endswith(".tsbuildinfo"):
        return True
    if base.endswith(".log") and relative != IMMUTABLE_LOG:
        return True
    return base.endswith((".db", ".sqlite", ".sqlite3"))


def collect(root: pathlib.Path, kind: str, manifest_relative: str):
    rows = []
    for path in sorted(
        root.rglob("*"),
        key=lambda item: item.relative_to(root).as_posix(),
    ):
        relative = path.relative_to(root).as_posix()
        if relative == manifest_relative:
            continue
        if kind == "source" and source_excluded(relative):
            continue
        if path.is_symlink():
            raise RuntimeError(f"symlink_forbidden:{relative}")
        if path.is_dir():
            continue
        if not path.is_file():
            raise RuntimeError(f"special_file_forbidden:{relative}")
        data = path.read_bytes()
        rows.append(
            {
                "path": relative,
                "byteLength": len(data),
                "sha256": sha256_bytes(data),
                "mode": mode_for(path),
                "_bytes": data,
            }
        )
    validate_paths([row["path"] for row in rows])
    return rows


def inventory_fields(rows):
    entries = [
        {key: row[key] for key in ("path", "byteLength", "sha256", "mode")}
        for row in rows
    ]
    return (
        entries,
        sum(row["byteLength"] for row in rows),
        sha256_bytes("\n".join(row["path"] for row in rows).encode()),
        sha256_bytes(
            "\n".join(
                f"{row['path']}\0{row['byteLength']}\0{row['sha256']}\0{row['mode']}"
                for row in rows
            ).encode()
        ),
    )


def source_manifest(rows):
    entries, total, path_set, aggregate = inventory_fields(rows)
    core = {
        "schemaVersion": "velmere.pass36.a102r1.source-only-package-manifest.v1",
        "revisionId": REV,
        "parentRevisionId": PARENT,
        "normalizedTimestamp": TS,
        "fileCount": len(entries),
        "byteLength": total,
        "pathSetSha256": path_set,
        "aggregateSha256": aggregate,
        "entries": entries,
        "manifestPath": SOURCE_MANIFEST,
        "manifestExcludedFromOwnInventory": True,
        "checkpointClass": "ACTION_REQUIRED_NON_PASS",
        "completedThrough": 89,
        "a90ToA102PassCredit": False,
        "exactReleaseCredit": False,
        "globalDecision": "NO_GO",
        "live": False,
        "saleEnabled": False,
        "productionApproved": False,
        "worldClassProven": False,
    }
    return {**core, "manifestSha256": sha256_bytes(canonical(core))}


def materials_manifest(rows, source_zip: pathlib.Path | None):
    entries, total, path_set, aggregate = inventory_fields(rows)
    core = {
        "schemaVersion": "velmere.pass36.a102r1.materials-package-manifest.v1",
        "revisionId": REV,
        "parentRevisionId": PARENT,
        "normalizedTimestamp": TS,
        "fileCount": len(entries),
        "byteLength": total,
        "pathSetSha256": path_set,
        "aggregateSha256": aggregate,
        "entries": entries,
        "manifestPath": MATERIALS_MANIFEST,
        "manifestExcludedFromOwnInventory": True,
        "checkpointClass": "ACTION_REQUIRED_NON_PASS",
        "globalDecision": "NO_GO",
        "live": False,
        "saleEnabled": False,
        "productionApproved": False,
        "worldClassProven": False,
        "sourceArchiveBinding": None,
    }
    if source_zip:
        data = source_zip.read_bytes()
        core["sourceArchiveBinding"] = {
            "fileName": source_zip.name,
            "byteLength": len(data),
            "sha256": sha256_bytes(data),
        }
    return {**core, "manifestSha256": sha256_bytes(canonical(core))}


def write_manifest(root: pathlib.Path, relative: str, value):
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    os.chmod(path, 0o644)


def build_zip(
    root: pathlib.Path,
    kind: str,
    output: pathlib.Path,
    source_zip: pathlib.Path | None,
):
    manifest_relative = SOURCE_MANIFEST if kind == "source" else MATERIALS_MANIFEST
    rows = collect(root, kind, manifest_relative)
    manifest = (
        source_manifest(rows)
        if kind == "source"
        else materials_manifest(rows, source_zip)
    )
    write_manifest(root, manifest_relative, manifest)
    manifest_data = (root / manifest_relative).read_bytes()
    all_rows = rows + [
        {
            "path": manifest_relative,
            "byteLength": len(manifest_data),
            "sha256": sha256_bytes(manifest_data),
            "mode": 0o100644,
            "_bytes": manifest_data,
        }
    ]
    all_rows.sort(key=lambda row: row["path"])
    validate_paths([row["path"] for row in all_rows])
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(
        output,
        "w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=9,
        strict_timestamps=True,
    ) as archive:
        for row in all_rows:
            info = zipfile.ZipInfo(row["path"], date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (row["mode"] & 0xFFFF) << 16
            info.flag_bits |= 0x800
            archive.writestr(
                info,
                row["_bytes"],
                compress_type=zipfile.ZIP_DEFLATED,
                compresslevel=9,
            )
    data = output.read_bytes()
    return {
        "kind": kind,
        "output": str(output),
        "fileName": output.name,
        "byteLength": len(data),
        "sha256": sha256_bytes(data),
        "entries": len(all_rows),
        "manifestPath": manifest_relative,
        "manifestSha256": manifest["manifestSha256"],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--kind", choices=["source", "materials"], required=True)
    parser.add_argument("--root", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--source-zip")
    args = parser.parse_args()
    result = build_zip(
        pathlib.Path(args.root).resolve(),
        args.kind,
        pathlib.Path(args.output).resolve(),
        pathlib.Path(args.source_zip).resolve() if args.source_zip else None,
    )
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
