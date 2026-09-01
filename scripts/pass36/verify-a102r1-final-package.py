#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, pathlib, stat, unicodedata, zipfile

REV = "VELMERE_PASS36_A102R1_OUT_OF_TIME_REPEATED_SLO_VENDOR_EXIT_OBSERVATION_INDEPENDENT_WITNESS_AND_FROZEN_SOURCE_DIVERSITY_TRUTH_BOUNDARY"
SOURCE_MANIFEST = "_velmere/PASS36_A102R1_SOURCE_ONLY_MANIFEST.json"
MATERIALS_MANIFEST = "MANIFESTS/PASS36_A102R1_MATERIALS_MANIFEST.json"


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical(value) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode()


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


def inspect_zip(path: pathlib.Path, kind: str):
    manifest_relative = SOURCE_MANIFEST if kind == "source" else MATERIALS_MANIFEST
    checks = []
    failures = []

    def add(identifier, passed, detail=None):
        checks.append({"id": identifier, "passed": bool(passed), "detail": detail})
        if not passed:
            failures.append({"id": identifier, "detail": detail})

    raw = path.read_bytes()
    add("archive_nonempty", len(raw) > 0, len(raw))
    with zipfile.ZipFile(path) as archive:
        infos = archive.infolist()
        names = [info.filename for info in infos]
        bad_crc = archive.testzip()
        add("crc", bad_crc is None, bad_crc)
        add("paths_safe", all(safe_path(name) for name in names),
            [name for name in names if not safe_path(name)][:30])
        add("raw_unique", len(names) == len(set(names)),
            len(names) - len(set(names)))
        folded = [collision_key(name) for name in names]
        add("nfkc_casefold_unique", len(folded) == len(set(folded)),
            len(folded) - len(set(folded)))
        add("not_encrypted", all(not (info.flag_bits & 1) for info in infos))
        symlinks = [
            info.filename
            for info in infos
            if stat.S_IFMT((info.external_attr >> 16) & 0xFFFF)
            == stat.S_IFLNK
        ]
        add("no_symlinks", not symlinks, symlinks[:30])
        add("manifest_present", manifest_relative in names, manifest_relative)
        manifest = json.loads(archive.read(manifest_relative))
        core = dict(manifest)
        declared = core.pop("manifestSha256", None)
        add("manifest_self_hash", declared == sha(canonical(core)),
            {"declared": declared, "actual": sha(canonical(core))})
        add("manifest_revision", manifest.get("revisionId") == REV,
            manifest.get("revisionId"))
        add(
            "manifest_no_promotion",
            manifest.get("checkpointClass") == "ACTION_REQUIRED_NON_PASS"
            and manifest.get("globalDecision") == "NO_GO"
            and manifest.get("live") is False
            and manifest.get("saleEnabled") is False
            and manifest.get("productionApproved") is False
            and manifest.get("worldClassProven") is False,
        )
        entries = manifest.get("entries", [])
        declared_rows = {entry["path"]: entry for entry in entries}
        actual_names = [name for name in names if name != manifest_relative]
        add("entry_order", actual_names == sorted(actual_names))
        add("exact_path_set", actual_names == [entry["path"] for entry in entries],
            {"declared": len(entries), "actual": len(actual_names)})
        mismatches = []
        for info in infos:
            if info.filename == manifest_relative:
                continue
            data = archive.read(info.filename)
            mode = (info.external_attr >> 16) & 0xFFFF
            row = {
                "path": info.filename,
                "byteLength": len(data),
                "sha256": sha(data),
                "mode": mode,
            }
            if declared_rows.get(info.filename) != row:
                mismatches.append(
                    {
                        "path": info.filename,
                        "declared": declared_rows.get(info.filename),
                        "actual": row,
                    }
                )
        add("all_entry_bytes_modes", not mismatches, mismatches[:30])
        add("manifest_count", manifest.get("fileCount") == len(entries))
        add("manifest_bytes",
            manifest.get("byteLength")
            == sum(entry["byteLength"] for entry in entries))
        path_set = sha("\n".join(entry["path"] for entry in entries).encode())
        aggregate = sha(
            "\n".join(
                f"{entry['path']}\0{entry['byteLength']}\0"
                f"{entry['sha256']}\0{entry['mode']}"
                for entry in entries
            ).encode()
        )
        add("manifest_pathset", manifest.get("pathSetSha256") == path_set)
        add("manifest_aggregate", manifest.get("aggregateSha256") == aggregate)
    return {
        "kind": kind,
        "fileName": path.name,
        "byteLength": len(raw),
        "sha256": sha(raw),
        "entries": len(infos),
        "manifestSha256": declared,
        "sourceArchiveBinding": manifest.get("sourceArchiveBinding"),
        "checks": len(checks),
        "passed": len(checks) - len(failures),
        "failed": len(failures),
        "failures": failures,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-zip", required=True)
    parser.add_argument("--materials-zip", required=True)
    parser.add_argument("--output")
    args = parser.parse_args()
    source = inspect_zip(pathlib.Path(args.source_zip).resolve(), "source")
    materials = inspect_zip(pathlib.Path(args.materials_zip).resolve(), "materials")
    binding = materials.get("sourceArchiveBinding") or {}
    binding_ok = (
        binding.get("fileName") == source["fileName"]
        and binding.get("byteLength") == source["byteLength"]
        and binding.get("sha256") == source["sha256"]
    )
    failures = []
    if source["failed"]:
        failures.append({"id": "source_package", "detail": source["failures"]})
    if materials["failed"]:
        failures.append({"id": "materials_package", "detail": materials["failures"]})
    if not binding_ok:
        failures.append(
            {
                "id": "materials_source_binding",
                "detail": {
                    "binding": binding,
                    "source": {
                        key: source[key]
                        for key in ("fileName", "byteLength", "sha256")
                    },
                },
            }
        )
    result = {
        "schemaVersion": "velmere.pass36.a102r1.final-package-verification.v1",
        "revisionId": REV,
        "status": (
            "PASS_A102R1_FINAL_PACKAGES_ACTION_REQUIRED_NO_PROMOTION"
            if not failures
            else "FAIL_A102R1_FINAL_PACKAGES"
        ),
        "source": source,
        "materials": materials,
        "materialsSourceBindingPassed": binding_ok,
        "failed": len(failures),
        "failures": failures,
        "globalDecision": "NO_GO",
        "live": False,
        "saleEnabled": False,
        "productionApproved": False,
        "worldClassProven": False,
    }
    output = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        pathlib.Path(args.output).write_text(output, encoding="utf-8")
    print(output, end="")
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
