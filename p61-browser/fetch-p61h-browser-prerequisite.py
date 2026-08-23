#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
from typing import Any, Iterable
from urllib.parse import quote
from urllib.request import Request, urlopen
from zipfile import ZipFile

WORKFLOW_FILE = "p61g2-browser-three-sku-official-manrope-renderer-only.yml"
ARTIFACT_NAME = "p61g2-browser-three-sku-official-manrope-renderer-only"
BROWSER_RECEIPT_NAME = "P61_BROWSER_THREE_PHYSICAL_SKU_EXECUTIONS.json"
SOURCE_RECEIPT_NAME = "P61G_OFFICIAL_MANROPE_RENDERER_SOURCE_ENGINEERING_RECEIPT.json"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def stable_sha(value: object) -> str:
    return sha256_bytes(
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    )


def github_json(url: str, token: str) -> dict[str, Any]:
    request = Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "velmere-p61h-prerequisite-binding",
        },
    )
    with urlopen(request, timeout=90) as response:
        return json.loads(response.read())


def github_bytes(url: str, token: str) -> bytes:
    request = Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "velmere-p61h-prerequisite-binding",
        },
    )
    with urlopen(request, timeout=120) as response:
        return response.read()


def safe_extract(zip_bytes: bytes, destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    with ZipFile(io.BytesIO(zip_bytes)) as archive:
        for member in archive.infolist():
            name = PurePosixPath(member.filename)
            if name.is_absolute() or ".." in name.parts:
                raise RuntimeError(f"unsafe_zip_member:{member.filename}")
            target = destination.joinpath(*name.parts)
            target_resolved = target.resolve()
            if destination.resolve() not in target_resolved.parents and target_resolved != destination.resolve():
                raise RuntimeError(f"zip_member_escape:{member.filename}")
            if member.is_dir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(archive.read(member))


def find_unique(root: Path, name: str) -> Path:
    matches = list(root.rglob(name))
    if len(matches) != 1:
        raise RuntimeError(f"expected_unique_file:{name}:count={len(matches)}")
    return matches[0]


def collect_pdf_evidence(value: Any) -> Iterable[dict[str, Any]]:
    if isinstance(value, dict):
        path = value.get("path")
        if isinstance(path, str) and path.lower().endswith(".pdf"):
            yield value
        for nested in value.values():
            yield from collect_pdf_evidence(nested)
    elif isinstance(value, list):
        for nested in value:
            yield from collect_pdf_evidence(nested)


def resolve_receipt_path(extracted_root: Path, relative_path: str) -> Path | None:
    normalized = PurePosixPath(relative_path)
    direct_candidates = [
        extracted_root.joinpath(*normalized.parts),
        extracted_root / "browser" / Path(*normalized.parts),
    ]
    for candidate in direct_candidates:
        if candidate.is_file():
            return candidate
    suffix = normalized.as_posix().lower()
    matches = [
        path
        for path in extracted_root.rglob("*.pdf")
        if path.as_posix().lower().endswith(suffix)
    ]
    return matches[0] if len(matches) == 1 else None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repository", required=True)
    parser.add_argument("--branch", required=True)
    parser.add_argument("--output-root", required=True)
    parser.add_argument("--token-env", default="GH_TOKEN")
    args = parser.parse_args()

    token = os.environ.get(args.token_env, "").strip()
    if not token:
        raise RuntimeError(f"github_token_missing:{args.token_env}")

    output_root = Path(args.output_root).resolve()
    extracted_root = output_root / "prerequisite"
    reference_root = output_root / "reference"
    output_root.mkdir(parents=True, exist_ok=True)
    reference_root.mkdir(parents=True, exist_ok=True)

    api_root = f"https://api.github.com/repos/{args.repository}"
    workflow = quote(WORKFLOW_FILE, safe="")
    branch = quote(args.branch, safe="")
    runs = github_json(
        f"{api_root}/actions/workflows/{workflow}/runs?branch={branch}&status=success&per_page=20",
        token,
    ).get("workflow_runs", [])
    successful = [run for run in runs if run.get("conclusion") == "success"]
    if not successful:
        raise RuntimeError("no_successful_p61g2_browser_run_found")
    run = successful[0]
    run_id = int(run["id"])

    artifacts = github_json(f"{api_root}/actions/runs/{run_id}/artifacts?per_page=100", token).get(
        "artifacts", []
    )
    candidates = [artifact for artifact in artifacts if artifact.get("name") == ARTIFACT_NAME]
    if len(candidates) != 1:
        raise RuntimeError(f"p61g2_artifact_count_mismatch:{len(candidates)}")
    artifact = candidates[0]
    if artifact.get("expired"):
        raise RuntimeError("p61g2_artifact_expired")
    artifact_id = int(artifact["id"])
    zip_bytes = github_bytes(f"{api_root}/actions/artifacts/{artifact_id}/zip", token)
    artifact_zip_sha256 = sha256_bytes(zip_bytes)
    safe_extract(zip_bytes, extracted_root)

    browser_receipt_path = find_unique(extracted_root, BROWSER_RECEIPT_NAME)
    source_receipt_path = find_unique(extracted_root, SOURCE_RECEIPT_NAME)
    browser_receipt = json.loads(browser_receipt_path.read_text(encoding="utf-8-sig"))
    source_receipt = json.loads(source_receipt_path.read_text(encoding="utf-8-sig"))
    if browser_receipt.get("status") != "PASS":
        raise RuntimeError(f"browser_prerequisite_not_pass:{browser_receipt.get('decision')}")
    if browser_receipt.get("summary", {}).get("distinctTierSpecificPhysicalExecutions") != 3:
        raise RuntimeError("browser_prerequisite_not_three_of_three")
    if browser_receipt.get("summary", {}).get("exactBasicPreviewAndBlob") is not True:
        raise RuntimeError("browser_prerequisite_basic_preview_missing")
    if source_receipt.get("status") != "PASS":
        raise RuntimeError(f"source_prerequisite_not_pass:{source_receipt.get('decision')}")

    evidence_rows: list[tuple[int, dict[str, Any], Path]] = []
    for item in collect_pdf_evidence(browser_receipt.get("rows", [])):
        relative_path = item.get("path")
        if not isinstance(relative_path, str):
            continue
        resolved = resolve_receipt_path(extracted_root, relative_path)
        if resolved is None:
            continue
        data = resolved.read_bytes()
        observed_sha = sha256_bytes(data)
        if isinstance(item.get("sha256"), str) and observed_sha != item["sha256"]:
            raise RuntimeError(f"browser_pdf_receipt_sha_mismatch:{relative_path}")
        score = 0
        lower = relative_path.lower()
        if "blob" in lower:
            score += 20
        if "browser-response" in lower or "captured" in lower:
            score += 10
        if "basic" in lower and "en" in lower:
            score += 5
        evidence_rows.append((score, item, resolved))

    if not evidence_rows:
        fallback_pdfs = sorted(extracted_root.rglob("*.pdf"))
        if not fallback_pdfs:
            raise RuntimeError("browser_reference_pdf_missing")
        selected_path = fallback_pdfs[0]
        selected_item: dict[str, Any] = {}
    else:
        evidence_rows.sort(key=lambda row: (-row[0], row[2].as_posix()))
        _, selected_item, selected_path = evidence_rows[0]

    reference_bytes = selected_path.read_bytes()
    reference_path = reference_root / "browser-basic-reference.pdf"
    reference_path.write_bytes(reference_bytes)
    reference_identity = {
        "path": reference_path.relative_to(output_root).as_posix(),
        "byteLength": len(reference_bytes),
        "sha256": sha256_bytes(reference_bytes),
        "sourceArtifactPath": selected_path.relative_to(extracted_root).as_posix(),
        "receiptPath": selected_item.get("path"),
    }

    receipt: dict[str, Any] = {
        "schemaVersion": "velmere.p61h.browser-prerequisite-binding.v1",
        "status": "PASS",
        "decision": "PASS_LATEST_SUCCESSFUL_P61G2_BROWSER_THREE_OF_THREE_BOUND",
        "repository": args.repository,
        "branch": args.branch,
        "workflowFile": WORKFLOW_FILE,
        "run": {
            "id": run_id,
            "runNumber": run.get("run_number"),
            "headSha": run.get("head_sha"),
            "createdAt": run.get("created_at"),
            "updatedAt": run.get("updated_at"),
            "conclusion": run.get("conclusion"),
        },
        "artifact": {
            "id": artifact_id,
            "name": artifact.get("name"),
            "digest": artifact.get("digest"),
            "byteLength": len(zip_bytes),
            "downloadedZipSha256": artifact_zip_sha256,
        },
        "browserReceipt": {
            "path": browser_receipt_path.relative_to(output_root).as_posix(),
            "byteLength": browser_receipt_path.stat().st_size,
            "sha256": sha256_bytes(browser_receipt_path.read_bytes()),
            "decision": browser_receipt.get("decision"),
            "distinctTierSpecificPhysicalExecutions": browser_receipt.get("summary", {}).get(
                "distinctTierSpecificPhysicalExecutions"
            ),
            "exactBasicPreviewAndBlob": browser_receipt.get("summary", {}).get(
                "exactBasicPreviewAndBlob"
            ),
        },
        "sourceEngineeringReceipt": {
            "path": source_receipt_path.relative_to(output_root).as_posix(),
            "byteLength": source_receipt_path.stat().st_size,
            "sha256": sha256_bytes(source_receipt_path.read_bytes()),
            "decision": source_receipt.get("decision"),
        },
        "referencePdf": reference_identity,
        "creditBoundary": {
            "browserPrerequisiteCredit": True,
            "independentPdfReplayCredit": False,
            "customerCredit": False,
            "saleCredit": False,
            "goCredit": False,
            "liveCredit": False,
            "worldClassCredit": False,
        },
        "truthBoundary": (
            "PASS binds the latest successful P61G2 three-SKU Browser execution and one Basic reference PDF. "
            "It does not itself prove the independent PDF replay or any customer, sale, GO, LIVE or WORLD_CLASS gate."
        ),
    }
    receipt["integritySha256"] = stable_sha(receipt)
    receipt_path = output_root / "P61H_BROWSER_PREREQUISITE_BINDING.json"
    receipt_path.write_text(
        json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n"
    )
    print(json.dumps(receipt, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
