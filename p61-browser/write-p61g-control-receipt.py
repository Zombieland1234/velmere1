#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from pathlib import Path
from typing import Any

EXPECTED_FONT_SHA256 = "67d5c238a5058f56a361c7fea054cf3be26d602bd03b418a09bff73a25a17250"
EXPECTED_RENDERER_PATH = "lib/search/lens-pdf-renderer.ts"
RUNNER_NAME = "run-p61g-official-manrope-renderer-engineering.mjs"
RUNNER_BASELINE_SHA256 = "8c65836d90179b3dff38adb092f081e908bc14c5db9ac6e8288349b15299190a"

OLD_EXPECTED_ROWS = """  const expectedRows = manifest.files
    .map((row) => overrides.get(row.path) ?? row)
    .slice()
    .sort((left, right) => left.path.localeCompare(right.path));"""
NEW_EXPECTED_ROWS = """  // Preserve canonical manifest order. P49/P60 identity hashes are defined over
  // manifest order, not locale-dependent filesystem sorting.
  const expectedRows = manifest.files.map((row) => overrides.get(row.path) ?? row);"""
OLD_ROWS_SORT = "  rows.sort((left, right) => left.path.localeCompare(right.path));\n"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def file_identity(path: Path) -> dict[str, Any]:
    data = path.read_bytes()
    return {"path": path.as_posix(), "byteLength": len(data), "sha256": sha256_bytes(data)}


def stable_sha(value: object) -> str:
    return sha256_bytes(
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    )


def build_manifest_order_runner(paths: list[Path]) -> dict[str, Any]:
    candidates = [path for path in paths if path.name == RUNNER_NAME]
    if len(candidates) != 1:
        raise RuntimeError(f"p61g_runner_candidate_count_mismatch:{len(candidates)}")
    runner = candidates[0]
    before = file_identity(runner)
    if before["sha256"] != RUNNER_BASELINE_SHA256:
        raise RuntimeError(f"p61g_runner_baseline_sha_mismatch:{before['sha256']}")

    text = runner.read_text(encoding="utf-8")
    if text.count(OLD_EXPECTED_ROWS) != 1:
        raise RuntimeError(f"p61g_runner_expected_rows_anchor_count:{text.count(OLD_EXPECTED_ROWS)}")
    if text.count(OLD_ROWS_SORT) != 1:
        raise RuntimeError(f"p61g_runner_rows_sort_anchor_count:{text.count(OLD_ROWS_SORT)}")

    text = text.replace(OLD_EXPECTED_ROWS, NEW_EXPECTED_ROWS, 1)
    text = text.replace(OLD_ROWS_SORT, "", 1)
    runner.write_text(text, encoding="utf-8", newline="\n")

    after = file_identity(runner)
    if after["sha256"] == before["sha256"]:
        raise RuntimeError("p61g_runner_manifest_order_repair_noop")
    parse = subprocess.run(["node", "--check", str(runner)], capture_output=True, text=True, check=False)
    if parse.returncode != 0:
        raise RuntimeError(f"p61g_runner_manifest_order_repair_parse_failed:{parse.stderr[-2000:]}")
    return {
        "status": "PASS",
        "decision": "PASS_P61G_RUNNER_CANONICAL_MANIFEST_ORDER_REPAIR",
        "reason": (
            "P49/P60 projection path-set and content aggregate are defined by P47_BUILD_PROJECTION_MANIFEST.json row order. "
            "The P61G diagnostic runner incorrectly re-sorted those rows with JavaScript localeCompare, producing a false identity mismatch despite 1597/1597 byte matches."
        ),
        "before": before,
        "after": after,
        "anchors": {"expectedRows": 1, "rowsSort": 1},
        "nodeParseCheck": "PASS",
        "semanticScope": "diagnostic/control runner only; no product source bytes changed",
    }


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

    for path in paths:
        if not path.is_file():
            raise RuntimeError(f"control_file_missing:{path}")

    runtime_repair = build_manifest_order_runner(paths)
    rows = [file_identity(path) for path in paths]

    receipt: dict[str, Any] = {
        "schemaVersion": "velmere.p61g2.control-identity-and-runner-repair.v2",
        "status": "PASS",
        "decision": "PASS_P61G_CONTROLS_BOUND_AND_FALSE_IDENTITY_ORDERING_REPAIRED",
        "githubSha": args.github_sha,
        "runtimeRepair": runtime_repair,
        "files": rows,
        "truthBoundary": (
            "This receipt binds P61G control bytes and deterministically repairs only the diagnostic runner's ordering bug. "
            "It changes no product source bytes and grants no Browser, PDF output, customer, sale, GO, LIVE or WORLD_CLASS credit."
        ),
    }
    receipt["integritySha256"] = stable_sha(receipt)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps(receipt, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
