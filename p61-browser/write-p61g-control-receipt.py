#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

EXPECTED_FONT_SHA256 = "67d5c238a5058f56a361c7fea054cf3be26d602bd03b418a09bff73a25a17250"
EXPECTED_RENDERER_PATH = "lib/search/lens-pdf-renderer.ts"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def stable_sha(value: object) -> str:
    return sha256_bytes(
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--github-sha", required=True)
    parser.add_argument("--contract", required=True)
    parser.add_argument("--file", action="append", default=[])
    args = parser.parse_args()

    output = Path(args.output).resolve()
    contract_path = Path(args.contract).resolve()
    paths = [Path(value).resolve() for value in args.file]
    if contract_path not in paths:
        paths.insert(0, contract_path)

    contract: dict[str, Any] = json.loads(contract_path.read_text(encoding="utf-8"))
    if contract.get("upstream", {}).get("fontSha256") != EXPECTED_FONT_SHA256:
        raise RuntimeError("contract_font_sha256_mismatch")
    if contract.get("upstream", {}).get("licenseId") != "OFL-1.1":
        raise RuntimeError("contract_license_id_mismatch")
    mutation = contract.get("projectionMutation", {})
    if mutation.get("path") != EXPECTED_RENDERER_PATH:
        raise RuntimeError("contract_renderer_path_mismatch")
    if mutation.get("externalPolicyFileMutation") is not False:
        raise RuntimeError("contract_external_policy_boundary_mismatch")
    if mutation.get("fileCountChange") != 0 or mutation.get("payloadByteChange") != 0:
        raise RuntimeError("contract_projection_denominator_change_mismatch")

    rows = []
    for path in paths:
        if not path.is_file():
            raise RuntimeError(f"control_file_missing:{path}")
        data = path.read_bytes()
        rows.append(
            {
                "path": path.as_posix(),
                "byteLength": len(data),
                "sha256": sha256_bytes(data),
            }
        )

    receipt: dict[str, Any] = {
        "schemaVersion": "velmere.p61g.control-identity.v1",
        "status": "PASS",
        "decision": "PASS_P61G_CONTROLS_BOUND_TO_WORKFLOW_COMMIT",
        "githubSha": args.github_sha,
        "files": rows,
        "truthBoundary": (
            "This receipt binds P61G control bytes and the renderer-only acquisition contract to the workflow commit. "
            "It grants no Browser, PDF output, customer, sale, GO, LIVE or WORLD_CLASS credit."
        ),
    }
    receipt["integritySha256"] = stable_sha(receipt)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps(receipt, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
