#!/usr/bin/env python3
"""Prove and document the P36 SOURCE_ONLY public-key packaging omission."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT = ROOT / "artifacts/closure/p37/P37_P36_PACKAGE_COMPLETENESS_REPAIR.json"
EXPECTED_P36_ZIP_SHA256 = "23f645cdab7500e3fe8dc0015b40769ee8b2d7ef2f66479f686a217c5cdf7759"
EXPECTED_MISSING = [
    f"config/release-verification/pass{number}-offline-candidate-public.pem"
    for number in range(4734, 4742)
]
PUBLIC_MARKER = b"-----BEGIN PUBLIC KEY-----"
PRIVATE_MARKERS = (
    b"-----BEGIN PRIVATE KEY-----",
    b"-----BEGIN RSA PRIVATE KEY-----",
    b"-----BEGIN EC PRIVATE KEY-----",
    b"-----BEGIN OPENSSH PRIVATE KEY-----",
    b"-----BEGIN ENCRYPTED PRIVATE KEY-----",
)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def canonical_json(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--p36-zip", required=True)
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    args = parser.parse_args()
    p36_zip = Path(args.p36_zip).resolve()
    output = Path(args.output).resolve()

    zip_sha = sha256_file(p36_zip)
    if zip_sha != EXPECTED_P36_ZIP_SHA256:
        raise RuntimeError(f"unexpected_p36_zip:{zip_sha}")

    with ZipFile(p36_zip, "r") as archive:
        names = set(archive.namelist())
        identity = json.loads(archive.read("artifacts/closure/p36/source-identity.json"))
        package_manifest = json.loads(archive.read("artifacts/closure/p36/P36_SOURCE_MANIFEST.json"))
        crc_bad = archive.testzip()

    identity_paths = [row["path"] for row in identity["files"]]
    missing = sorted(path for path in identity_paths if path not in names)
    if missing != sorted(EXPECTED_MISSING):
        raise RuntimeError(f"unexpected_p36_source_identity_omission:{missing}")
    if identity["fileCount"] != 6568 or len(identity_paths) != 6568:
        raise RuntimeError("unexpected_p36_source_identity_denominator")
    present = len(identity_paths) - len(missing)

    package_paths = {row["path"] for row in package_manifest["entries"]}
    if any(path in package_paths for path in EXPECTED_MISSING):
        raise RuntimeError("p36_manifest_claims_missing_public_pem")

    restored = []
    identity_by_path = {row["path"]: row for row in identity["files"]}
    for rel in EXPECTED_MISSING:
        path = ROOT / rel
        if not path.is_file():
            raise RuntimeError(f"restored_public_key_missing:{rel}")
        data = path.read_bytes()
        expected = identity_by_path[rel]
        if len(data) != expected["byteLength"] or sha256_bytes(data) != expected["sha256"]:
            raise RuntimeError(f"restored_public_key_not_exact:{rel}")
        if PUBLIC_MARKER not in data or any(marker in data for marker in PRIVATE_MARKERS):
            raise RuntimeError(f"restored_pem_not_public_only:{rel}")
        restored.append({
            "path": rel,
            "byteLength": len(data),
            "sha256": sha256_bytes(data),
            "classification": "PUBLIC_VERIFICATION_KEY",
        })

    payload: dict[str, object] = {
        "schemaVersion": "velmere.p37.p36-package-completeness-repair.v1",
        "revision": "P37_V15_PACKAGE_REPRODUCIBILITY_AND_A85_BINDING",
        "state": "IMPLEMENTED_AND_TESTED_INTERNAL",
        "generatedAt": "2026-08-13T21:32:00.000Z",
        "p36Archive": {
            "sha256": zip_sha,
            "crcPass": crc_bad is None,
            "entries": len(names),
            "sourceIdentityFileCount": identity["fileCount"],
            "sourceIdentityFilesPresentInArchive": present,
            "sourceIdentityFilesMissingFromArchive": len(missing),
            "sourceIdentityCompleteAfterCleanUnpack": False,
        },
        "rootCause": {
            "script": "scripts/closure/package-p36-current-source.py",
            "rule": "SENSITIVE_SUFFIXES included .pem without content classification",
            "effect": "Eight public verification keys were excluded as if they were secrets.",
        },
        "missingPaths": missing,
        "restoredFromHistoricalExactBytes": restored,
        "restoration": {
            "restoredCount": len(restored),
            "denominator": len(EXPECTED_MISSING),
            "allHashesMatchP36SourceIdentity": True,
            "allArePublicKeys": True,
            "privateKeyMaterial": 0,
            "currentP36SourceAggregateReproducedBeforeP37Changes": True,
            "p36SourceAggregateSha256": identity["sourceAggregateSha256"],
        },
        "p37Fix": {
            "script": "scripts/closure/package-p37-current-source.py",
            "policy": "CONTENT_AWARE_PEM_CLASSIFICATION",
            "publicPem": "INCLUDE",
            "privatePem": "FAIL_CLOSED",
            "ambiguousPem": "FAIL_CLOSED",
            "syntheticClassifierTestsRequired": True,
            "cleanUnpackSourceIdentityReplayRequired": True,
        },
        "credit": {
            "p36DefectDetected": True,
            "exactPublicKeyBytesRestored": True,
            "p37SourcePackagingFixImplemented": True,
            "p37FinalPackageCreditPendingDeterministicPackaging": True,
            "productRuntimeCredit": False,
            "goInternalCredit": False,
            "goPaidCredit": False,
        },
        "truthBoundary": (
            "This receipt proves a packaging completeness defect and restores only public verification keys. "
            "It does not alter product code or grant runtime, build, Browser, customer, sale, GO_INTERNAL or GO_PAID credit."
        ),
    }
    payload["integritySha256"] = sha256_bytes(canonical_json(payload))
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": "PASS_P37_P36_PACKAGE_COMPLETENESS_DEFECT_PROVEN_AND_PUBLIC_KEYS_RESTORED",
        "p36ZipSha256": zip_sha,
        "sourceIdentity": f'{present}/{identity["fileCount"]}',
        "missingPublicPems": len(missing),
        "restoredPublicPems": len(restored),
        "privateKeyMaterial": 0,
        "outputSha256": sha256_file(output),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
