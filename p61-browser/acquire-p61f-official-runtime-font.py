#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.request

REPOSITORY = "terrapkg/pkg-manrope-fonts"
FONT_PATH = "Manrope-ExtraLight.ttf"
FONT_GIT_BLOB_SHA1 = "cf7cea3879019206c6e084ac14ada8e2d3e4dd70"
FONT_BYTES = 134800
FONT_SHA256 = "67d5c238a5058f56a361c7fea054cf3be26d602bd03b418a09bff73a25a17250"
LICENSE_PATH = "OFL.txt"
LICENSE_GIT_BLOB_SHA1 = "472064afc4b8dec9079fab03b8ffafb617a1b2d8"
LICENSE_BYTES = 4384
LICENSE_SHA256 = "e01b637272e0cbdfb240184dd98ea5cc671556d9894dae2668d92ab2c906787c"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def github_json(url: str, token: str) -> dict:
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "velmere-p61f-runtime-font-acquisition",
        },
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read())


def fetch_blob(blob_sha: str, token: str) -> bytes:
    payload = github_json(f"https://api.github.com/repos/{REPOSITORY}/git/blobs/{blob_sha}", token)
    if payload.get("sha") != blob_sha or payload.get("encoding") != "base64":
        raise RuntimeError(
            f"upstream_blob_identity_mismatch:{blob_sha}:{payload.get('sha')}:{payload.get('encoding')}"
        )
    return base64.b64decode(str(payload["content"]).replace("\n", ""), validate=True)


def stable_sha(value: object) -> str:
    return sha256_bytes(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode())


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--font-output", required=True)
    parser.add_argument("--receipt-output", required=True)
    parser.add_argument("--github-output")
    args = parser.parse_args()

    token = os.environ.get("GH_TOKEN", "").strip() or os.environ.get("GITHUB_TOKEN", "").strip()
    if not token:
        raise RuntimeError("github_token_required")

    font_output = Path(args.font_output).resolve()
    receipt_output = Path(args.receipt_output).resolve()
    font_output.parent.mkdir(parents=True, exist_ok=True)
    receipt_output.parent.mkdir(parents=True, exist_ok=True)

    font_bytes = fetch_blob(FONT_GIT_BLOB_SHA1, token)
    if len(font_bytes) != FONT_BYTES:
        raise RuntimeError(f"font_byte_length_mismatch:{len(font_bytes)}:{FONT_BYTES}")
    observed_font_sha256 = sha256_bytes(font_bytes)
    if observed_font_sha256 != FONT_SHA256:
        raise RuntimeError(f"font_sha256_mismatch:{observed_font_sha256}:{FONT_SHA256}")
    font_output.write_bytes(font_bytes)
    observed_git_sha = subprocess.check_output(["git", "hash-object", str(font_output)], text=True).strip()
    if observed_git_sha != FONT_GIT_BLOB_SHA1:
        raise RuntimeError(f"font_git_blob_mismatch:{observed_git_sha}:{FONT_GIT_BLOB_SHA1}")

    license_bytes = fetch_blob(LICENSE_GIT_BLOB_SHA1, token)
    if len(license_bytes) != LICENSE_BYTES:
        raise RuntimeError(f"license_byte_length_mismatch:{len(license_bytes)}:{LICENSE_BYTES}")
    observed_license_sha256 = sha256_bytes(license_bytes)
    if observed_license_sha256 != LICENSE_SHA256:
        raise RuntimeError(f"license_sha256_mismatch:{observed_license_sha256}:{LICENSE_SHA256}")
    license_text = license_bytes.decode("utf-8")
    if "SIL OPEN FONT LICENSE" not in license_text.upper() or "Version 1.1" not in license_text:
        raise RuntimeError("license_text_not_recognized_as_ofl_1_1")

    receipt: dict[str, object] = {
        "schemaVersion": "velmere.p61f.official-manrope-runtime-font-acquisition-receipt.v1",
        "status": "PASS",
        "decision": "PASS_OFFICIAL_MANROPE_RUNTIME_FONT_ACQUIRED_EXACT_HASH",
        "runtimeFont": {
            "path": str(font_output),
            "repository": REPOSITORY,
            "sourcePath": FONT_PATH,
            "gitBlobSha1": FONT_GIT_BLOB_SHA1,
            "byteLength": FONT_BYTES,
            "sha256": FONT_SHA256,
        },
        "license": {
            "sourcePath": LICENSE_PATH,
            "gitBlobSha1": LICENSE_GIT_BLOB_SHA1,
            "byteLength": LICENSE_BYTES,
            "sha256": LICENSE_SHA256,
            "licenseId": "OFL-1.1",
            "reviewState": "INTERNAL_EXACT_LICENSE_TEXT_MATCH_NOT_EXTERNAL_LEGAL_OPINION",
        },
        "retention": {
            "fontCommittedToSource": False,
            "fontCommittedToMaterials": False,
            "fontUploadedAsEvidence": False,
            "deleteBeforeArtifactUploadRequired": True,
        },
        "truthBoundary": "PASS proves deterministic runtime acquisition of the exact official upstream font and exact OFL-1.1 text identity. Browser, PDF independent replay, customer value, sale, GO, LIVE and WORLD_CLASS remain separate.",
    }
    receipt["integritySha256"] = stable_sha(receipt)
    receipt_output.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")

    if args.github_output:
        with Path(args.github_output).open("a", encoding="utf-8", newline="\n") as handle:
            handle.write(f"font_path={font_output}\n")
            handle.write(f"font_sha256={FONT_SHA256}\n")
            handle.write(f"font_bytes={FONT_BYTES}\n")
    print(json.dumps(receipt, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"P61F_RUNTIME_FONT_ACQUISITION_FAILED {type(error).__name__}: {error}", file=sys.stderr)
        raise
