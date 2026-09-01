#!/usr/bin/env python3
"""Build a non-circular identity for the P36 current-source input tree.

This deliberately excludes generated closure evidence and heavyweight physical
acceptance corpora.  It is a source identity, not a release or evidence replay
receipt.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import stat
from typing import Iterable


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT = ROOT / "artifacts/closure/p36/source-identity.json"
METHODOLOGY_V14 = (
    "docs/authority/"
    "VELMERE_METODOLOGIA_FINISHOWANIA_CANONICAL_V14_CURRENT_SOURCE_EVIDENCE_BINDING_2026-08-13.txt"
)
GROWTH_INTEL_R12 = (
    "docs/authority/"
    "VELMERE_GROWTH_INTEL_TOP_WORLD_R12_CURRENT_SOURCE_CLOSURE_2026-08-13.txt"
)

EXCLUDED_COMPONENTS = {
    ".git",
    ".cache",
    ".mypy_cache",
    ".npm",
    ".parcel-cache",
    ".pnpm-store",
    ".pytest_cache",
    ".ruff_cache",
    ".turbo",
    ".velmere",
    "__pycache__",
    "node_modules",
}
EXCLUDED_ROOT_DIRECTORIES = {"artifacts", "coverage", "temp", "tmp"}
EXCLUDED_PREFIXES = (
    "artifacts/closure",
    "artifacts/pass36/a83/browser-lens-pdf-corpus",
    "artifacts/pass36/a83/renders",
    "artifacts/pass35/a45/screenshots",
)
EXCLUDED_EXACT_PATHS = {
    "artifacts/pass35/a45/A45_DETERMINISTIC_LOCAL_REFERENCE_QA_FIXTURE.json",
}
EXCLUDED_SUFFIXES = {".pyc", ".pyo"}
EXTERNAL_FONT_NAMES = {"manrope-pdf-latin-plus-ext.ttf"}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def normalized_mode(mode: int) -> int:
    return 0o755 if mode & 0o111 else 0o644


def within_root(path: Path) -> str | None:
    try:
        return path.resolve().relative_to(ROOT.resolve()).as_posix()
    except ValueError:
        return None


def reject_unsafe_output(path: Path) -> None:
    if path.is_symlink():
        raise RuntimeError(f"output_symlink_forbidden:{path}")
    if path.exists() and not path.is_file():
        raise RuntimeError(f"output_non_regular_forbidden:{path}")
    absolute = path.absolute()
    for parent in [absolute.parent, *absolute.parents]:
        if parent.exists() and parent.is_symlink():
            raise RuntimeError(f"output_parent_symlink_forbidden:{parent}")


def excluded(rel: str, dynamic_exact: set[str]) -> bool:
    pure = PurePosixPath(rel)
    parts = pure.parts
    if not parts:
        return True
    if rel in dynamic_exact or rel in EXCLUDED_EXACT_PATHS:
        return True
    if any(part in EXCLUDED_COMPONENTS or part.startswith(".next") for part in parts):
        return True
    if parts[0] in EXCLUDED_ROOT_DIRECTORIES:
        return True
    if len(parts) >= 2 and parts[0] == ".yarn" and parts[1] == "cache":
        return True
    if any(rel == prefix or rel.startswith(f"{prefix}/") for prefix in EXCLUDED_PREFIXES):
        return True
    if pure.suffix.lower() in EXCLUDED_SUFFIXES:
        return True
    if pure.name.lower() in EXTERNAL_FONT_NAMES:
        return True
    if any(part.upper() == "MATERIALS" for part in parts):
        return True
    if pure.suffix.lower() == ".zip" and "MATERIALS" in pure.name.upper():
        return True
    return False


def iter_regular_files(dynamic_exact: set[str]) -> Iterable[tuple[Path, str, os.stat_result]]:
    """Walk without following links and reject any included non-regular entry."""

    def walk(directory: Path, rel_directory: PurePosixPath) -> Iterable[tuple[Path, str, os.stat_result]]:
        with os.scandir(directory) as scan:
            entries = sorted(scan, key=lambda item: item.name.encode("utf-8"))
        for entry in entries:
            rel_path = rel_directory / entry.name
            rel = rel_path.as_posix()
            if excluded(rel, dynamic_exact):
                continue
            if entry.is_symlink():
                raise RuntimeError(f"included_symlink_forbidden:{rel}")
            entry_path = Path(entry.path)
            entry_stat = entry.stat(follow_symlinks=False)
            if stat.S_ISDIR(entry_stat.st_mode):
                yield from walk(entry_path, rel_path)
            elif stat.S_ISREG(entry_stat.st_mode):
                yield entry_path, rel, entry_stat
            else:
                raise RuntimeError(f"included_special_file_forbidden:{rel}:{entry_stat.st_mode:o}")

    yield from walk(ROOT, PurePosixPath())


def authority_bindings(rows: list[dict[str, object]]) -> dict[str, list[str]]:
    paths = {str(row["path"]) for row in rows}
    if METHODOLOGY_V14 not in paths:
        raise RuntimeError("required_current_authority_missing:methodology_v14")
    if GROWTH_INTEL_R12 not in paths:
        raise RuntimeError("required_current_authority_missing:growth_intel_r12")
    return {
        "methodologyV14": [METHODOLOGY_V14],
        "growthIntelR12": [GROWTH_INTEL_R12],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    args = parser.parse_args()

    requested_output = Path(args.output)
    reject_unsafe_output(requested_output)
    output = requested_output.resolve()
    dynamic_exact = {rel for rel in (within_root(output),) if rel is not None}
    rows: list[dict[str, object]] = []
    casefold_paths: dict[str, str] = {}
    for path, rel, entry_stat in iter_regular_files(dynamic_exact):
        folded = rel.casefold()
        previous = casefold_paths.get(folded)
        if previous is not None and previous != rel:
            raise RuntimeError(f"casefold_path_collision:{previous}:{rel}")
        casefold_paths[folded] = rel
        rows.append({
            "path": rel,
            "byteLength": entry_stat.st_size,
            "mode": normalized_mode(entry_stat.st_mode),
            "sha256": sha256_file(path),
        })

    bindings = authority_bindings(rows)
    path_set_sha256 = sha256_bytes("\n".join(str(row["path"]) for row in rows).encode("utf-8"))
    aggregate_sha256 = sha256_bytes(b"".join(
        f'{row["path"]}\0{row["byteLength"]}\0{row["mode"]}\0{row["sha256"]}\n'.encode("utf-8")
        for row in rows
    ))
    result = {
        "schemaVersion": "velmere.p36.source-identity.v1",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "classification": "CURRENT_SOURCE_INPUT_EXCLUDES_GENERATED_AND_PHYSICAL_EVIDENCE",
        "fileCount": len(rows),
        "payloadBytes": sum(int(row["byteLength"]) for row in rows),
        "pathSetSha256": path_set_sha256,
        "sourceAggregateSha256": aggregate_sha256,
        "requiredAuthorityBindings": bindings,
        "exclusionPolicy": {
            "components": sorted(EXCLUDED_COMPONENTS),
            "rootDirectories": sorted(EXCLUDED_ROOT_DIRECTORIES),
            "prefixes": list(EXCLUDED_PREFIXES),
            "exactPaths": sorted(EXCLUDED_EXACT_PATHS),
            "allDotNextComponents": True,
            "allArtifacts": True,
            "allGeneratedClosureReceipts": True,
            "a83PhysicalPdfCorpus": True,
            "a83RasterRenders": True,
            "a45ScreenshotsAndQaFixture": True,
            "externalFontAndMaterials": True,
            "dynamicOutputSelfExclusion": True,
        },
        "files": rows,
        "truthBoundary": (
            "This identity binds P36 current source inputs and the V14/R12 authority files. "
            "It excludes generated closure receipts, dependencies, build/cache trees, A83 PDF/raster "
            "corpora, A45 screenshots/QA fixture, and external font/material inputs. The excluded physical "
            "bytes cannot be replayed from this identity. It grants no clean-build, Browser, real-customer, "
            "independent-review, provider-rights, retention, sale, GO_PAID, external-proof or world-class credit."
        ),
    }

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": "PASS_P36_CURRENT_SOURCE_IDENTITY_BUILT",
        "fileCount": result["fileCount"],
        "payloadBytes": result["payloadBytes"],
        "pathSetSha256": path_set_sha256,
        "sourceAggregateSha256": aggregate_sha256,
        "manifestSha256": sha256_file(output),
        "output": within_root(output) or str(output),
        "physicalEvidenceReplayCredit": False,
        "realExternalPaidCredit": False,
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
