#!/usr/bin/env python3
"""Create two deterministic, CRC-verified P36 CURRENT_SOURCE_ONLY archives."""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
from typing import Iterable
from urllib.parse import urlsplit
import zipfile


ROOT = Path(__file__).resolve().parents[2]
ARTIFACT_ROOT = ROOT / "artifacts/closure/p36"
MANIFEST = ARTIFACT_ROOT / "P36_SOURCE_MANIFEST.json"
EXCLUSIONS = ARTIFACT_ROOT / "P36_PACKAGE_EXCLUSIONS.json"
FIXED_ZIP_TIME = (1980, 1, 1, 0, 0, 0)

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
EXCLUDED_ROOT_DIRECTORIES = {"coverage", "temp", "tmp"}
EXCLUDED_PREFIXES = (
    "artifacts/pass36/a83/browser-lens-pdf-corpus",
    "artifacts/pass36/a83/renders",
    "artifacts/pass35/a45/screenshots",
    "artifacts/closure/p33/paid-tests",
    "artifacts/closure/p33/paid-tests-rerun",
    "artifacts/closure/p33/paid-tests-current",
    "artifacts/closure/p32/final-selected-test-logs",
)
EXCLUDED_EXACT_PATHS = {
    MANIFEST.relative_to(ROOT).as_posix(),
    "artifacts/pass35/a45/A45_DETERMINISTIC_LOCAL_REFERENCE_QA_FIXTURE.json",
    "artifacts/closure/p34/internal-ai-assessments.jsonl",
    "artifacts/closure/p35/internal-ai-assessments.jsonl",
}
EXCLUDED_SUFFIXES = {".pyc", ".pyo"}
EXTERNAL_FONT_NAMES = {"manrope-pdf-latin-plus-ext.ttf"}
COMPACT_P36_RECEIPT_SUFFIXES = {".csv", ".json", ".jsonl", ".txt"}
METHODOLOGY_V14 = "docs/authority/VELMERE_METODOLOGIA_FINISHOWANIA_CANONICAL_V14_CURRENT_SOURCE_EVIDENCE_BINDING_2026-08-13.txt"
GROWTH_R12 = "docs/authority/VELMERE_GROWTH_INTEL_TOP_WORLD_R12_CURRENT_SOURCE_CLOSURE_2026-08-13.txt"
REQUIRED_CURRENT_FILES = {
    METHODOLOGY_V14: None,
    GROWTH_R12: None,
    "artifacts/closure/p36/source-identity.json": "velmere.p36.source-identity.v1",
    "artifacts/closure/p36/P36_CURRENT_BYTE_BUILD_GATES.json": "velmere.p36.current-byte-build-gates.v1",
    "artifacts/closure/p36/P36_CURRENT_EVIDENCE_AVAILABILITY_MATRIX.json": "velmere.current-evidence-availability-matrix.v2",
    "artifacts/closure/p36/P36_INTERNAL_FINAL_TIER_CAMPAIGN.json": "velmere.p36.internal-final-tier-campaign.v1",
    "artifacts/closure/p36/P36_AI_FINAL_OUTPUT_REVALIDATION.json": "velmere.p36.ai-final-output-revalidation.v1",
    "artifacts/closure/p36/P36_EXACT_CUSTOMER_PDF_INTEGRATION.json": "velmere.p36.exact-customer-pdf-integration.v1",
    "artifacts/pass35/a45/PASS35_A45_BROWSER_ACCEPTANCE.json": "velmere.pass35.a45.browser-acceptance.v2",
    "artifacts/closure/p36/P36_BROWSER_TIER_RUNTIME_PROFILES.json": "velmere.p36.browser-tier-runtime-profiles.v1",
    "artifacts/closure/p36/P36_BOUNDED_CONVERGENCE.json": "velmere.p36.bounded-frozen-source-convergence.v1",
    "artifacts/closure/p36/P36_STATUS.json": "velmere.p36.status.v1",
    "artifacts/closure/p36/CURRENT_AUTHORITY_P36.json": "velmere.p36.current-authority.v1",
    "artifacts/closure/p36/P36_HANDOFF_MANIFEST.json": "velmere.p36.handoff-manifest.v1",
    "artifacts/closure/p36/P36_REPORT_IN_PROGRESS.txt": None,
}
AUTHORITY_EVIDENCE_PATHS = {
    "methodology": METHODOLOGY_V14,
    "growth": GROWTH_R12,
    "sourceIdentity": "artifacts/closure/p36/source-identity.json",
    "build": "artifacts/closure/p36/P36_CURRENT_BYTE_BUILD_GATES.json",
    "matrix": "artifacts/closure/p36/P36_CURRENT_EVIDENCE_AVAILABILITY_MATRIX.json",
    "campaign": "artifacts/closure/p36/P36_INTERNAL_FINAL_TIER_CAMPAIGN.json",
    "ai": "artifacts/closure/p36/P36_AI_FINAL_OUTPUT_REVALIDATION.json",
    "pdf": "artifacts/closure/p36/P36_EXACT_CUSTOMER_PDF_INTEGRATION.json",
    "browserA45": "artifacts/pass35/a45/PASS35_A45_BROWSER_ACCEPTANCE.json",
    "browserProfiles": "artifacts/closure/p36/P36_BROWSER_TIER_RUNTIME_PROFILES.json",
    "convergence": "artifacts/closure/p36/P36_BOUNDED_CONVERGENCE.json",
}
STATUS_PATH = "artifacts/closure/p36/P36_STATUS.json"
AUTHORITY_PATH = "artifacts/closure/p36/CURRENT_AUTHORITY_P36.json"
HANDOFF_PATH = "artifacts/closure/p36/P36_HANDOFF_MANIFEST.json"
REPORT_PATH = "artifacts/closure/p36/P36_REPORT_IN_PROGRESS.txt"
SOURCE_IDENTITY_PATH = AUTHORITY_EVIDENCE_PATHS["sourceIdentity"]
A45_PATH = AUTHORITY_EVIDENCE_PATHS["browserA45"]
INTEGRITY_FORM_BY_PATH = {
    AUTHORITY_EVIDENCE_PATHS["build"]: "integritySha256",
    AUTHORITY_EVIDENCE_PATHS["matrix"]: "integritySha256",
    AUTHORITY_EVIDENCE_PATHS["campaign"]: "integrity.payloadSha256",
    AUTHORITY_EVIDENCE_PATHS["ai"]: "integrity.payloadSha256",
    AUTHORITY_EVIDENCE_PATHS["pdf"]: "integritySha256",
    AUTHORITY_EVIDENCE_PATHS["browserProfiles"]: "integritySha256",
    AUTHORITY_EVIDENCE_PATHS["convergence"]: "integritySha256",
    STATUS_PATH: "integritySha256",
    AUTHORITY_PATH: "integritySha256",
    HANDOFF_PATH: "integritySha256",
}
SHA256_PATTERN = re.compile(r"^[a-f0-9]{64}$")
SENSITIVE_SUFFIXES = {".key", ".p12", ".pfx", ".pem"}
SENSITIVE_FILE_NAMES = {
    "credentials.json",
    "service-account.json",
    "service_account.json",
    "client-secret.json",
    "client_secret.json",
}
ACTIVE_SOURCE_ROOTS = {"app", "components", "lib"}
ACTIVE_SOURCE_SUFFIXES = {".js", ".jsx", ".mjs", ".ts", ".tsx", ".json"}
ACTIVE_CREDENTIAL_PATTERN = re.compile(
    rb"(?:sk|pk)_(?:live|test)_[A-Za-z0-9_-]{24,}|"
    rb"whsec_[A-Za-z0-9_-]{24,}|"
    rb"Bearer\s+[A-Za-z0-9._~+/=-]{24,}|"
    rb"-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----[\s\S]*?"
    rb"-----END (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----",
    re.IGNORECASE,
)


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def files_equal(left: Path, right: Path) -> bool:
    if left.stat().st_size != right.stat().st_size:
        return False
    with left.open("rb") as left_stream, right.open("rb") as right_stream:
        while True:
            left_chunk = left_stream.read(1024 * 1024)
            right_chunk = right_stream.read(1024 * 1024)
            if left_chunk != right_chunk:
                return False
            if not left_chunk:
                return True


def normalized_mode(mode: int) -> int:
    return 0o755 if mode & 0o111 else 0o644


def within_root(path: Path) -> str | None:
    try:
        return path.resolve().relative_to(ROOT.resolve()).as_posix()
    except ValueError:
        return None


def reject_unsafe_output(path: Path, label: str) -> None:
    if path.is_symlink():
        raise RuntimeError(f"{label}_symlink_forbidden:{path}")
    if path.exists() and not path.is_file():
        raise RuntimeError(f"{label}_non_regular_forbidden:{path}")
    absolute = path.absolute()
    for parent in [absolute.parent, *absolute.parents]:
        if parent.exists() and parent.is_symlink():
            raise RuntimeError(f"{label}_parent_symlink_forbidden:{parent}")


def is_artifact_noise(rel: str, pure: PurePosixPath) -> bool:
    if not rel.startswith("artifacts/"):
        return False
    lower_name = pure.name.lower()
    if pure.suffix.lower() in {".log", ".sqlite", ".sqlite3"}:
        return True
    if lower_name.endswith(".exitcode") or lower_name.endswith(".stdout") or lower_name.endswith(".stderr"):
        return True
    if ".stdout." in lower_name or ".stderr." in lower_name:
        return True
    if any(part.lower() in {"logs", "test-logs", "temporary-receipts"} for part in pure.parts):
        return True
    if pure.suffix.lower() == ".zip":
        return True
    if re.fullmatch(r"P\d+_SOURCE_MANIFEST\.json", pure.name, flags=re.IGNORECASE):
        return True
    if (
        pure.name != EXCLUSIONS.name
        and re.fullmatch(r"P\d+_PACKAGE_EXCLUSIONS\.json", pure.name, flags=re.IGNORECASE)
    ):
        return True
    return False


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
    if pure.name == ".env" or pure.name.startswith(".env."):
        return True
    if pure.suffix.lower() in SENSITIVE_SUFFIXES or pure.name.lower() in SENSITIVE_FILE_NAMES:
        return True
    if pure.name.lower() in EXTERNAL_FONT_NAMES:
        return True
    if any(part.upper() == "MATERIALS" for part in parts):
        return True
    if pure.suffix.lower() == ".zip" and "MATERIALS" in pure.name.upper():
        return True
    return is_artifact_noise(rel, pure)


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


def inventory(dynamic_exact: set[str]) -> list[dict[str, object]]:
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
    return rows


def canonical_json(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def normalized_sha256(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    normalized = value.removeprefix("sha256:")
    return normalized if SHA256_PATTERN.fullmatch(normalized) else None


def validate_integrity_payload(
    relative: str,
    payload: dict[str, object],
    required_form: str,
) -> None:
    """Require the receipt's declared, path-specific canonical integrity form."""
    if required_form == "integritySha256":
        expected = normalized_sha256(payload.get("integritySha256"))
        if expected is None:
            raise RuntimeError(f"required_receipt_integrity_missing:{relative}:integritySha256")
        body = {key: value for key, value in payload.items() if key != "integritySha256"}
        if sha256_bytes(canonical_json(body)) != expected:
            raise RuntimeError(f"required_receipt_integrity_mismatch:{relative}")
        return
    if required_form == "integrity.payloadSha256":
        integrity = payload.get("integrity")
        if not isinstance(integrity, dict):
            raise RuntimeError(f"required_receipt_integrity_missing:{relative}:integrity.payloadSha256")
        expected = normalized_sha256(integrity.get("payloadSha256"))
        if integrity.get("algorithm") != "sha256" or expected is None:
            raise RuntimeError(f"required_receipt_integrity_missing:{relative}:integrity.payloadSha256")
        body = {key: value for key, value in payload.items() if key != "integrity"}
        if sha256_bytes(canonical_json(body)) != expected:
            raise RuntimeError(f"required_receipt_payload_integrity_mismatch:{relative}")
        return
    raise RuntimeError(f"unknown_required_integrity_form:{relative}:{required_form}")


def recompute_source_identity(dynamic_exact: set[str]) -> dict[str, object]:
    builder_path = ROOT / "scripts/closure/build-p36-source-identity.py"
    spec = importlib.util.spec_from_file_location("velmere_p36_source_identity", builder_path)
    if spec is None or spec.loader is None:
        raise RuntimeError("source_identity_builder_import_failed")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    rows = []
    for path, rel, entry_stat in module.iter_regular_files(dynamic_exact):
        rows.append({
            "path": rel,
            "byteLength": entry_stat.st_size,
            "mode": module.normalized_mode(entry_stat.st_mode),
            "sha256": module.sha256_file(path),
        })
    return {
        "fileCount": len(rows),
        "payloadBytes": sum(int(row["byteLength"]) for row in rows),
        "pathSetSha256": sha256_bytes("\n".join(str(row["path"]) for row in rows).encode("utf-8")),
        "sourceAggregateSha256": sha256_bytes(b"".join(
            f'{row["path"]}\0{row["byteLength"]}\0{row["mode"]}\0{row["sha256"]}\n'.encode("utf-8")
            for row in rows
        )),
    }


def validate_current_source_identity(dynamic_exact: set[str]) -> None:
    relative = "artifacts/closure/p36/source-identity.json"
    stored = json.loads((ROOT / relative).read_text(encoding="utf-8"))
    current = recompute_source_identity(dynamic_exact)
    for field in ("fileCount", "payloadBytes", "pathSetSha256", "sourceAggregateSha256"):
        if stored.get(field) != current[field]:
            raise RuntimeError(f"current_source_identity_stale:{field}:{stored.get(field)}:{current[field]}")


def validate_secret_boundaries(rows: list[dict[str, object]]) -> None:
    for row in rows:
        relative = str(row["path"])
        pure = PurePosixPath(relative)
        if pure.name == ".env" or pure.name.startswith(".env."):
            raise RuntimeError(f"environment_file_in_package:{relative}")
        if pure.suffix.lower() in SENSITIVE_SUFFIXES or pure.name.lower() in SENSITIVE_FILE_NAMES:
            raise RuntimeError(f"credential_file_in_package:{relative}")
        if pure.name == ".npmrc":
            text = (ROOT / relative).read_text(encoding="utf-8", errors="replace")
            if re.search(r"(?im)(?:_authToken|_password|username|always-auth)\s*=", text):
                raise RuntimeError(f"npmrc_auth_material_in_package:{relative}")
        if (
            pure.parts[0] in ACTIVE_SOURCE_ROOTS
            and pure.suffix.lower() in ACTIVE_SOURCE_SUFFIXES
            and not any(part.lower() in {"__tests__", "fixtures", "test", "tests"} for part in pure.parts)
        ):
            data = (ROOT / relative).read_bytes()
            if ACTIVE_CREDENTIAL_PATTERN.search(data):
                raise RuntimeError(f"active_credential_literal_in_package:{relative}")


def require_exact_binding(
    binding: object,
    expected_path: str,
    row_by_path: dict[str, dict[str, object]],
    label: str,
    *,
    require_byte_length: bool = True,
) -> None:
    if not isinstance(binding, dict):
        raise RuntimeError(f"{label}_binding_invalid")
    if binding.get("path") != expected_path:
        raise RuntimeError(f"{label}_path_mismatch:{binding.get('path')}:{expected_path}")
    row = row_by_path.get(expected_path)
    if row is None:
        raise RuntimeError(f"{label}_not_packaged:{expected_path}")
    if normalized_sha256(binding.get("sha256")) is None or binding.get("sha256") != row.get("sha256"):
        raise RuntimeError(f"{label}_sha_mismatch:{expected_path}")
    if require_byte_length and binding.get("byteLength") != row.get("byteLength"):
        raise RuntimeError(f"{label}_byte_length_mismatch:{expected_path}")


def validate_a45_exempt_receipt(
    payload: dict[str, object],
    row_by_path: dict[str, dict[str, object]],
    browser_profiles: dict[str, object],
) -> None:
    """Deep-check the legacy A45 receipt, whose schema has no self-integrity field."""
    summary = payload.get("summary")
    if not isinstance(summary, dict) or any(
        summary.get(key) != value for key, value in {"checks": 57, "passed": 57, "failed": 0}.items()
    ):
        raise RuntimeError("a45_receipt_summary_invalid")
    parsed_base_url = urlsplit(str(payload.get("baseUrl", "")))
    if (
        parsed_base_url.scheme not in {"http", "https"}
        or parsed_base_url.hostname not in {"127.0.0.1", "::1", "localhost"}
        or parsed_base_url.username is not None
        or parsed_base_url.password is not None
        or parsed_base_url.query
        or parsed_base_url.fragment
        or parsed_base_url.path not in {"", "/"}
    ):
        raise RuntimeError("a45_receipt_base_url_not_loopback")
    transport = payload.get("transport")
    if (
        not isinstance(transport, dict)
        or transport.get("scheme") != parsed_base_url.scheme
        or transport.get("loopbackOnly") is not True
        or transport.get("productionCertificateVerified") is not False
    ):
        raise RuntimeError("a45_receipt_transport_boundary_invalid")
    bindings = payload.get("bindings")
    if not isinstance(bindings, dict):
        raise RuntimeError("a45_receipt_runtime_bindings_missing")
    for key in ("sourceManifestSha256", "runtimeInstanceSha256", "browserExecutableSha256"):
        if normalized_sha256(bindings.get(key)) is None:
            raise RuntimeError(f"a45_receipt_runtime_binding_invalid:{key}")
    if not isinstance(bindings.get("buildId"), str) or not bindings["buildId"].strip():
        raise RuntimeError("a45_receipt_runtime_binding_invalid:buildId")
    qa_fixture = payload.get("qaFixture")
    if not isinstance(qa_fixture, dict):
        raise RuntimeError("a45_receipt_qa_fixture_missing")
    required_qa_truth = {
        "enabled": True,
        "generated": True,
        "liveProven": False,
        "saleEnabled": False,
        "providerCredit": False,
        "durableStorageCredit": False,
        "realDataCredit": False,
    }
    if any(qa_fixture.get(key) != value for key, value in required_qa_truth.items()):
        raise RuntimeError("a45_receipt_qa_truth_boundary_invalid")
    fixture_relative = qa_fixture.get("fixtureRelativePath")
    if (
        not isinstance(fixture_relative, str)
        or not fixture_relative.startswith("artifacts/pass35/a45/")
        or PurePosixPath(fixture_relative).is_absolute()
        or ".." in PurePosixPath(fixture_relative).parts
        or not isinstance(qa_fixture.get("generatorId"), str)
        or not qa_fixture["generatorId"].strip()
    ):
        raise RuntimeError("a45_receipt_qa_fixture_path_or_generator_invalid")
    if normalized_sha256(qa_fixture.get("fixtureSha256")) is None:
        raise RuntimeError("a45_receipt_qa_fixture_sha_invalid")
    if not isinstance(qa_fixture.get("fixtureByteLength"), int) or qa_fixture["fixtureByteLength"] <= 0:
        raise RuntimeError("a45_receipt_qa_fixture_length_invalid")
    rows = payload.get("rows")
    popup = payload.get("popup")
    failures = payload.get("failures")
    if not isinstance(rows, list) or len(rows) != 56 or not all(
        isinstance(row, dict) and row.get("ok") is True for row in rows
    ):
        raise RuntimeError("a45_receipt_route_rows_invalid")
    if not isinstance(popup, dict) or popup.get("ok") is not True or failures != []:
        raise RuntimeError("a45_receipt_popup_or_failures_invalid")
    screenshot_rows = [row for row in [*rows, popup] if row.get("screenshotPath") is not None]
    screenshot_paths: list[str] = []
    for screenshot in screenshot_rows:
        screenshot_path = screenshot.get("screenshotPath")
        if (
            not isinstance(screenshot_path, str)
            or not screenshot_path.startswith("artifacts/pass35/a45/screenshots/")
            or not screenshot_path.endswith(".png")
            or PurePosixPath(screenshot_path).is_absolute()
            or ".." in PurePosixPath(screenshot_path).parts
            or normalized_sha256(screenshot.get("screenshotSha256")) is None
        ):
            raise RuntimeError("a45_receipt_screenshot_binding_invalid")
        screenshot_paths.append(screenshot_path)
    if len(screenshot_paths) != 29 or len(set(screenshot_paths)) != 29:
        raise RuntimeError("a45_receipt_screenshot_denominator_invalid")
    if not isinstance(payload.get("truthBoundary"), str) or not payload["truthBoundary"].strip():
        raise RuntimeError("a45_receipt_truth_boundary_missing")
    profile_bindings = browser_profiles.get("bindings")
    if not isinstance(profile_bindings, dict):
        raise RuntimeError("browser_profiles_bindings_missing")
    require_exact_binding(
        profile_bindings.get("a45BrowserReceipt"),
        A45_PATH,
        row_by_path,
        "browser_profiles_a45",
    )


def validate_no_go_contract(
    status: dict[str, object],
    authority: dict[str, object],
    handoff: dict[str, object],
) -> None:
    if status.get("state") != "CURRENT_SOURCE_ONLY_IN_PROGRESS" or status.get("releaseState") != "NO_GO":
        raise RuntimeError("p36_status_not_current_no_go")
    for key in ("goInternal", "goPaid", "live", "saleEnabled", "productionApproved", "worldClassProven"):
        if status.get(key) is not False:
            raise RuntimeError(f"p36_status_false_promotion:{key}")
    authority_decision = authority.get("releaseDecision")
    if not isinstance(authority_decision, dict) or authority_decision.get("state") != "NO_GO":
        raise RuntimeError("p36_authority_not_no_go")
    for key in ("goInternal", "goPaid", "saleEnabled", "live", "worldClassProven"):
        if authority_decision.get(key) is not False or authority_decision.get(key) != status.get(key):
            raise RuntimeError(f"p36_authority_status_decision_mismatch:{key}")
    if authority.get("state") != status.get("state"):
        raise RuntimeError("p36_authority_status_state_mismatch")
    if authority.get("truthBoundary") != status.get("truthBoundary"):
        raise RuntimeError("p36_authority_status_truth_boundary_mismatch")
    if handoff.get("state") != status.get("state"):
        raise RuntimeError("p36_handoff_status_state_mismatch")
    if handoff.get("releaseDecision") != authority_decision:
        raise RuntimeError("p36_handoff_authority_decision_mismatch")
    if handoff.get("truthBoundary") != status.get("truthBoundary"):
        raise RuntimeError("p36_handoff_status_truth_boundary_mismatch")


def validate_required_payload_contract(
    row_by_path: dict[str, dict[str, object]],
    payload_by_path: dict[str, dict[str, object]],
    text_by_path: dict[str, str],
) -> None:
    """Pure contract validation used by packaging and targeted mutation tests."""
    for relative, schema in REQUIRED_CURRENT_FILES.items():
        if schema is None or not relative.endswith(".json"):
            continue
        payload = payload_by_path.get(relative)
        if not isinstance(payload, dict):
            raise RuntimeError(f"required_receipt_payload_missing:{relative}")
        if payload.get("schemaVersion") != schema:
            raise RuntimeError(f"required_receipt_schema_mismatch:{relative}:{payload.get('schemaVersion')}")
        required_form = INTEGRITY_FORM_BY_PATH.get(relative)
        if required_form is not None:
            validate_integrity_payload(relative, payload, required_form)
        elif relative not in {SOURCE_IDENTITY_PATH, A45_PATH}:
            raise RuntimeError(f"required_receipt_integrity_policy_missing:{relative}")

    authority = payload_by_path[AUTHORITY_PATH]
    status = payload_by_path[STATUS_PATH]
    handoff = payload_by_path[HANDOFF_PATH]
    evidence_bindings = authority.get("evidenceBindings")
    if not isinstance(evidence_bindings, dict):
        raise RuntimeError("current_authority_evidence_bindings_missing")
    actual_keys = set(evidence_bindings)
    expected_keys = set(AUTHORITY_EVIDENCE_PATHS)
    if actual_keys != expected_keys:
        raise RuntimeError(
            "current_authority_evidence_binding_keys_mismatch:"
            f"missing={','.join(sorted(expected_keys - actual_keys))}:"
            f"extra={','.join(sorted(actual_keys - expected_keys))}"
        )
    for key, expected_path in AUTHORITY_EVIDENCE_PATHS.items():
        require_exact_binding(
            evidence_bindings[key],
            expected_path,
            row_by_path,
            f"current_authority_evidence:{key}",
        )
    require_exact_binding(
        authority.get("status"),
        STATUS_PATH,
        row_by_path,
        "current_authority_status",
        require_byte_length=False,
    )
    require_exact_binding(
        handoff.get("currentAuthority"),
        AUTHORITY_PATH,
        row_by_path,
        "handoff_current_authority",
        require_byte_length=False,
    )
    authority_files = authority.get("authorityFiles")
    if not isinstance(authority_files, dict):
        raise RuntimeError("current_authority_files_missing")
    if authority_files.get("methodology") != evidence_bindings["methodology"]:
        raise RuntimeError("current_authority_methodology_binding_mismatch")
    if authority_files.get("growthIntel") != evidence_bindings["growth"]:
        raise RuntimeError("current_authority_growth_binding_mismatch")
    if authority.get("source") != evidence_bindings["sourceIdentity"]:
        raise RuntimeError("current_authority_source_binding_mismatch")
    a45 = payload_by_path[A45_PATH]
    source_identity = payload_by_path[SOURCE_IDENTITY_PATH]
    build = payload_by_path[AUTHORITY_EVIDENCE_PATHS["build"]]
    a45_bindings = a45.get("bindings")
    if (
        not isinstance(a45_bindings, dict)
        or a45_bindings.get("sourceManifestSha256") != source_identity.get("sourceAggregateSha256")
    ):
        raise RuntimeError("a45_receipt_source_identity_binding_mismatch")
    turbopack_build = build.get("buildOutputs")
    if isinstance(turbopack_build, dict):
        turbopack_build = turbopack_build.get("turbopack")
    if (
        not isinstance(turbopack_build, dict)
        or a45_bindings.get("buildId") != turbopack_build.get("buildId")
    ):
        raise RuntimeError("a45_receipt_turbopack_build_id_binding_mismatch")
    validate_a45_exempt_receipt(
        a45,
        row_by_path,
        payload_by_path[AUTHORITY_EVIDENCE_PATHS["browserProfiles"]],
    )
    validate_no_go_contract(status, authority, handoff)
    report = text_by_path.get(REPORT_PATH, "")
    if not report.strip() or "NO_GO" not in report:
        raise RuntimeError("p36_report_nonempty_no_go_required")


def validate_required_files(rows: list[dict[str, object]]) -> None:
    row_by_path = {str(row["path"]): row for row in rows}
    missing = sorted(set(REQUIRED_CURRENT_FILES) - set(row_by_path))
    if missing:
        raise RuntimeError(f"required_current_files_missing:{','.join(missing)}")
    payload_by_path: dict[str, dict[str, object]] = {}
    text_by_path: dict[str, str] = {}
    for relative in REQUIRED_CURRENT_FILES:
        if relative.endswith(".json"):
            payload = json.loads((ROOT / relative).read_text(encoding="utf-8"))
            if not isinstance(payload, dict):
                raise RuntimeError(f"required_receipt_json_object_required:{relative}")
            payload_by_path[relative] = payload
        elif relative.endswith(".txt"):
            text_by_path[relative] = (ROOT / relative).read_text(encoding="utf-8")
    validate_required_payload_contract(row_by_path, payload_by_path, text_by_path)


def required_bindings(rows: list[dict[str, object]]) -> dict[str, list[str]]:
    paths = [str(row["path"]) for row in rows]
    methodology = [path for path in paths if path == METHODOLOGY_V14]
    growth = [path for path in paths if path == GROWTH_R12]
    compact_receipts = sorted(path for path in REQUIRED_CURRENT_FILES if path.startswith("artifacts/"))
    if methodology != [METHODOLOGY_V14]:
        raise RuntimeError("required_current_authority_not_exactly_one:methodology_v14")
    if growth != [GROWTH_R12]:
        raise RuntimeError("required_current_authority_not_exactly_one:growth_intel_r12")
    return {
        "methodologyV14": methodology,
        "growthIntelR12": growth,
        "p36CurrentReceipts": compact_receipts,
    }


def build_manifest(rows: list[dict[str, object]]) -> dict[str, object]:
    bindings = required_bindings(rows)
    path_set_sha256 = sha256_bytes("\n".join(str(row["path"]) for row in rows).encode("utf-8"))
    aggregate_sha256 = sha256_bytes(b"".join(
        f'{row["path"]}\0{row["byteLength"]}\0{row["mode"]}\0{row["sha256"]}\n'.encode("utf-8")
        for row in rows
    ))
    manifest = {
        "schemaVersion": "velmere.p36.source-only-package-manifest.v1",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "manifestSelfExcluded": True,
        "fileCountExcludingManifestSelf": len(rows),
        "payloadBytesExcludingManifestSelf": sum(int(row["byteLength"]) for row in rows),
        "pathSetSha256": path_set_sha256,
        "sourceAggregateSha256": aggregate_sha256,
        "requiredBindings": bindings,
        "entries": rows,
        "evidenceBoundary": {
            "a83PhysicalPdfCorpusIncluded": False,
            "a83RasterRendersIncluded": False,
            "a45ScreenshotsIncluded": False,
            "a45QaFixtureIncluded": False,
            "externalExactFontIncluded": False,
            "externalMaterialsIncluded": False,
            "physicalEvidenceReplayCredit": False,
            "realCustomerCredit": False,
            "independentReviewerCredit": False,
            "providerRightsCredit": False,
            "saleOrGoPaidCredit": False,
            "activeCredentialLiteralHits": 0,
        },
        "truthBoundary": (
            "P36 SOURCE_ONLY contains current code/configuration, V14/R12 authority and bounded current P36 "
            "receipts. The embedded manifest excludes itself. Dependencies, all .next* build trees, caches, "
            "large/repeated artifact logs, temporary receipts, A83 PDF/raster corpora, A45 screenshots/QA fixture, "
            "and external font/material inputs are excluded. Therefore the physical campaigns cannot be replayed "
            "from this archive alone. Packaging determinism, hashes and CRC grant no Browser replay, real-customer, "
            "independent-review, provider-rights, retention, sale, GO_PAID, external-proof or world-class credit."
        ),
    }
    manifest["integritySha256"] = sha256_bytes(canonical_json(manifest))
    return manifest


def write_zip(output: Path, rows: list[dict[str, object]]) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    manifest_rel = MANIFEST.relative_to(ROOT).as_posix()
    package_rows = rows + [{
        "path": manifest_rel,
        "byteLength": MANIFEST.stat().st_size,
        "mode": normalized_mode(MANIFEST.stat().st_mode),
        "sha256": sha256_file(MANIFEST),
    }]
    with zipfile.ZipFile(
        output,
        "w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=9,
        strict_timestamps=False,
    ) as archive:
        for row in sorted(package_rows, key=lambda value: str(value["path"]).encode("utf-8")):
            rel = str(row["path"])
            source = ROOT / rel
            data = source.read_bytes()
            actual_sha256 = sha256_bytes(data)
            if len(data) != int(row["byteLength"]) or actual_sha256 != str(row["sha256"]):
                raise RuntimeError(f"source_changed_during_packaging:{rel}")
            info = zipfile.ZipInfo(rel, FIXED_ZIP_TIME)
            mode = int(row["mode"])
            info.create_system = 3
            info.external_attr = ((stat.S_IFREG | mode) & 0xFFFF) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)


def verify_archive(path: Path, expected_rows: list[dict[str, object]]) -> dict[str, object]:
    expected_by_path = {str(row["path"]): row for row in expected_rows}
    expected_paths = list(expected_by_path)
    with zipfile.ZipFile(path, "r") as archive:
        infos = archive.infolist()
        names = [info.filename for info in infos]
        if names != sorted(expected_paths, key=lambda value: value.encode("utf-8")):
            raise RuntimeError(f"archive_inventory_mismatch:{path}")
        if len(names) != len(set(names)):
            raise RuntimeError(f"archive_duplicate_path:{path}")
        for info in infos:
            pure = PurePosixPath(info.filename)
            if info.is_dir() or pure.is_absolute() or ".." in pure.parts or "\\" in info.filename:
                raise RuntimeError(f"archive_unsafe_path:{path}:{info.filename}")
            entry_type = (info.external_attr >> 16) & 0o170000
            if entry_type != stat.S_IFREG:
                raise RuntimeError(f"archive_non_regular_entry:{path}:{info.filename}:{entry_type:o}")
            data = archive.read(info)
            expected = expected_by_path[info.filename]
            if len(data) != int(expected["byteLength"]) or sha256_bytes(data) != str(expected["sha256"]):
                raise RuntimeError(f"archive_entry_content_mismatch:{path}:{info.filename}")
            archived_mode = (info.external_attr >> 16) & 0o777
            if archived_mode != int(expected["mode"]):
                raise RuntimeError(f"archive_entry_mode_mismatch:{path}:{info.filename}:{archived_mode:o}")
        bad_entry = archive.testzip()
        return {
            "crcPass": bad_entry is None,
            "badEntry": bad_entry,
            "entries": len(infos),
            "uncompressedBytes": sum(info.file_size for info in infos),
        }


def validate_output_paths(output: Path, copy_b: Path, receipt: Path) -> None:
    if output == copy_b:
        raise RuntimeError("output_and_copy_b_must_differ")
    if len({output, copy_b, receipt}) != 3:
        raise RuntimeError("output_copy_b_and_receipt_must_be_distinct")
    if output.suffix.lower() != ".zip" or copy_b.suffix.lower() != ".zip":
        raise RuntimeError("output_and_copy_b_must_be_zip_files")
    if receipt.suffix.lower() != ".json":
        raise RuntimeError("receipt_must_be_json")
    protected = {MANIFEST.resolve(), EXCLUSIONS.resolve()}
    if output in protected or copy_b in protected or receipt in protected:
        raise RuntimeError("output_path_conflicts_with_embedded_metadata")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--copy-b", required=True)
    parser.add_argument("--receipt", required=True)
    args = parser.parse_args()

    requested_output = Path(args.output)
    requested_copy_b = Path(args.copy_b)
    requested_receipt = Path(args.receipt)
    reject_unsafe_output(requested_output, "output")
    reject_unsafe_output(requested_copy_b, "copy_b")
    reject_unsafe_output(requested_receipt, "receipt")
    reject_unsafe_output(MANIFEST, "manifest")
    reject_unsafe_output(EXCLUSIONS, "exclusions")
    if ARTIFACT_ROOT.is_symlink():
        raise RuntimeError(f"artifact_root_symlink_forbidden:{ARTIFACT_ROOT}")
    output = requested_output.resolve()
    copy_b = requested_copy_b.resolve()
    receipt_path = requested_receipt.resolve()
    validate_output_paths(output, copy_b, receipt_path)

    dynamic_exact = {
        rel for rel in (
            within_root(output),
            within_root(copy_b),
            within_root(receipt_path),
        )
        if rel is not None
    }

    ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)
    exclusions_payload = {
        "schemaVersion": "velmere.p36.source-only-package-exclusions.v1",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "excludedComponents": sorted(EXCLUDED_COMPONENTS),
        "excludedRootDirectories": sorted(EXCLUDED_ROOT_DIRECTORIES),
        "excludedPrefixes": list(EXCLUDED_PREFIXES),
        "excludedExactPaths": sorted(EXCLUDED_EXACT_PATHS),
        "dynamicOutputSelfExclusions": sorted(dynamic_exact),
        "artifactNoisePolicy": (
            "Exclude artifact logs/stdout/stderr/exit codes/SQLite/archive payloads, test-log directories, "
            "and prior package manifests while retaining code and bounded P36 JSON/CSV/TXT receipts."
        ),
        "allDotNextComponentsExcluded": True,
        "manifestSelfExcluded": True,
        "symlinksAndSpecialFilesAllowed": False,
        "a83PhysicalPdfCorpusIncluded": False,
        "a83RasterRendersIncluded": False,
        "a45ScreenshotsAndQaFixtureIncluded": False,
        "externalExactFontAndMaterialsIncluded": False,
        "physicalEvidenceReplayCredit": False,
        "realExternalPaidCredit": False,
    }
    exclusions_payload["integritySha256"] = sha256_bytes(canonical_json(exclusions_payload))
    EXCLUSIONS.write_text(
        json.dumps(exclusions_payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    rows = inventory(dynamic_exact)
    validate_secret_boundaries(rows)
    validate_current_source_identity(dynamic_exact)
    validate_required_files(rows)
    manifest = build_manifest(rows)
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    write_zip(output, rows)
    write_zip(copy_b, rows)
    sha_a = sha256_file(output)
    sha_b = sha256_file(copy_b)
    byte_identical = sha_a == sha_b and files_equal(output, copy_b)
    manifest_row = {
        "path": MANIFEST.relative_to(ROOT).as_posix(),
        "byteLength": MANIFEST.stat().st_size,
        "mode": normalized_mode(MANIFEST.stat().st_mode),
        "sha256": sha256_file(MANIFEST),
    }
    expected_rows = rows + [manifest_row]
    verify_a = verify_archive(output, expected_rows)
    verify_b = verify_archive(copy_b, expected_rows)

    receipt = {
        "schemaVersion": "velmere.p36.deterministic-source-only-package-receipt.v1",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "archive": str(output),
        "copyB": str(copy_b),
        "sha256": sha_a,
        "copyBSha256": sha_b,
        "byteIdentical": byte_identical,
        "crcPass": bool(verify_a["crcPass"] and verify_b["crcPass"]),
        "badEntry": verify_a["badEntry"] or verify_b["badEntry"],
        "entries": verify_a["entries"],
        "uncompressedBytes": verify_a["uncompressedBytes"],
        "zipBytes": output.stat().st_size,
        "embeddedManifestSha256": sha256_file(MANIFEST),
        "embeddedManifestSourceAggregateSha256": manifest["sourceAggregateSha256"],
        "manifestSelfExcluded": True,
        "symlinksOrSpecialEntries": 0,
        "activeCredentialLiteralHits": 0,
        "physicalEvidenceReplayCredit": False,
        "realCustomerCredit": False,
        "independentReviewerCredit": False,
        "providerRightsCredit": False,
        "saleOrGoPaidCredit": False,
        "truthBoundary": (
            "Two byte-identical ZIPs and CRC verify deterministic SOURCE_ONLY packaging only. Physical A83/A45 "
            "corpora and external font/material inputs are excluded, so this receipt grants no physical replay, "
            "real-customer, independent-review, provider-rights, sale, GO_PAID, external-proof or world-class credit."
        ),
    }
    receipt["integritySha256"] = sha256_bytes(canonical_json(receipt))
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(receipt, ensure_ascii=False))
    return 0 if receipt["byteIdentical"] and receipt["crcPass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
