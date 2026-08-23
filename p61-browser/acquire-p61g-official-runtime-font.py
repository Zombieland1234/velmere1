#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen

EXPECTED_REPOSITORY = "terrapkg/pkg-manrope-fonts"
EXPECTED_FONT_BLOB_SHA1 = "cf7cea3879019206c6e084ac14ada8e2d3e4dd70"
EXPECTED_FONT_BYTES = 134800
EXPECTED_FONT_SHA256 = "67d5c238a5058f56a361c7fea054cf3be26d602bd03b418a09bff73a25a17250"
EXPECTED_LICENSE_BLOB_SHA1 = "472064afc4b8dec9079fab03b8ffafb617a1b2d8"
EXPECTED_LICENSE_BYTES = 4384
EXPECTED_LICENSE_SHA256 = "e01b637272e0cbdfb240184dd98ea5cc671556d9894dae2668d92ab2c906787c"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def stable_sha(value: object) -> str:
    return sha256_bytes(
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    )


def fetch_blob(repository: str, blob_sha: str, token: str) -> bytes:
    request = Request(
        f"https://api.github.com/repos/{repository}/git/blobs/{blob_sha}",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "velmere-p61g-runtime-font",
        },
    )
    with urlopen(request, timeout=60) as response:
        payload: dict[str, Any] = json.loads(response.read())
    if payload.get("sha") != blob_sha or payload.get("encoding") != "base64":
        raise RuntimeError(
            f"github_blob_identity_mismatch:{blob_sha}:{payload.get('sha')}:{payload.get('encoding')}"
        )
    return base64.b64decode(str(payload["content"]).replace("\n", ""), validate=True)


def append_line(path: Path | None, value: str) -> None:
    if path is None:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8", newline="\n") as handle:
        handle.write(value + "\n")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", required=True)
    parser.add_argument("--receipt", required=True)
    parser.add_argument("--repository", default=EXPECTED_REPOSITORY)
    parser.add_argument("--token-env", default="GH_TOKEN")
    parser.add_argument("--github-env")
    parser.add_argument("--github-output")
    args = parser.parse_args()

    target = Path(args.target).resolve()
    receipt_path = Path(args.receipt).resolve()
    github_env = Path(args.github_env).resolve() if args.github_env else None
    github_output = Path(args.github_output).resolve() if args.github_output else None
    token = os.environ.get(args.token_env, "").strip()
    if not token:
        raise RuntimeError(f"github_token_missing:{args.token_env}")
    if args.repository != EXPECTED_REPOSITORY:
        raise RuntimeError(f"upstream_repository_mismatch:{args.repository}")

    try:
        font_bytes = fetch_blob(args.repository, EXPECTED_FONT_BLOB_SHA1, token)
        observed_font_sha256 = sha256_bytes(font_bytes)
        if len(font_bytes) != EXPECTED_FONT_BYTES:
            raise RuntimeError(f"font_byte_length_mismatch:{len(font_bytes)}:{EXPECTED_FONT_BYTES}")
        if observed_font_sha256 != EXPECTED_FONT_SHA256:
            raise RuntimeError(f"font_sha256_mismatch:{observed_font_sha256}:{EXPECTED_FONT_SHA256}")

        license_bytes = fetch_blob(args.repository, EXPECTED_LICENSE_BLOB_SHA1, token)
        observed_license_sha256 = sha256_bytes(license_bytes)
        if len(license_bytes) != EXPECTED_LICENSE_BYTES:
            raise RuntimeError(f"license_byte_length_mismatch:{len(license_bytes)}:{EXPECTED_LICENSE_BYTES}")
        if observed_license_sha256 != EXPECTED_LICENSE_SHA256:
            raise RuntimeError(
                f"license_sha256_mismatch:{observed_license_sha256}:{EXPECTED_LICENSE_SHA256}"
            )
        license_text = license_bytes.decode("utf-8")
        if "SIL OPEN FONT LICENSE" not in license_text.upper() or "Version 1.1" not in license_text:
            raise RuntimeError("license_not_recognized_as_ofl_1_1")

        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(font_bytes)
        if target.stat().st_size != EXPECTED_FONT_BYTES or sha256_bytes(target.read_bytes()) != EXPECTED_FONT_SHA256:
            raise RuntimeError("runtime_font_postwrite_identity_mismatch")

        receipt: dict[str, Any] = {
            "schemaVersion": "velmere.p61g.runtime-font-acquisition.v1",
            "status": "PASS",
            "decision": "PASS_EXACT_OFFICIAL_MANROPE_RUNTIME_FONT_ACQUIRED_OUTSIDE_ARTIFACT_ROOT",
            "upstream": {
                "repository": args.repository,
                "fontGitBlobSha1": EXPECTED_FONT_BLOB_SHA1,
                "fontByteLength": EXPECTED_FONT_BYTES,
                "fontSha256": EXPECTED_FONT_SHA256,
                "licenseGitBlobSha1": EXPECTED_LICENSE_BLOB_SHA1,
                "licenseByteLength": EXPECTED_LICENSE_BYTES,
                "licenseSha256": EXPECTED_LICENSE_SHA256,
                "licenseId": "OFL-1.1",
            },
            "retention": {
                "runtimePathClass": "RUNNER_TEMP_OUTSIDE_ARTIFACT_ROOT",
                "fontCommittedToSource": False,
                "fontCommittedToMaterials": False,
                "fontUploadedAsEvidence": False,
                "deleteBeforeArtifactUploadRequired": True,
            },
            "truthBoundary": (
                "PASS proves exact upstream acquisition identity and an exact OFL-1.1 text match only. "
                "Browser, independent PDF replay, customer value, sale, GO, LIVE and WORLD_CLASS remain separate."
            ),
        }
        receipt["integritySha256"] = stable_sha(receipt)
        receipt_path.parent.mkdir(parents=True, exist_ok=True)
        receipt_path.write_text(
            json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n"
        )
        append_line(github_env, f"RUNTIME_FONT_PATH={target}")
        append_line(github_output, f"path={target}")
        append_line(github_output, f"sha256={EXPECTED_FONT_SHA256}")
        print(json.dumps(receipt, ensure_ascii=False, indent=2))
        return 0
    except Exception:
        target.unlink(missing_ok=True)
        raise


if __name__ == "__main__":
    raise SystemExit(main())
