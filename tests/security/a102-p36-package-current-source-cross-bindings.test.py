#!/usr/bin/env python3
"""Pure mutation tests for P36 SOURCE_ONLY package authority cross-bindings."""

from __future__ import annotations

import copy
import hashlib
import importlib.util
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "scripts/closure/package-p36-current-source.py"
SPEC = importlib.util.spec_from_file_location("p36_package", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
package = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(package)


def digest_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def json_bytes(value: object) -> bytes:
    return (json.dumps(value, indent=2, ensure_ascii=False) + "\n").encode("utf-8")


def row_for_bytes(relative: str, value: bytes) -> dict[str, object]:
    return {
        "path": relative,
        "byteLength": len(value),
        "mode": 0o644,
        "sha256": digest_bytes(value),
    }


def seal(relative: str, value: dict[str, object]) -> None:
    value.pop("integritySha256", None)
    value.pop("integrity", None)
    form = package.INTEGRITY_FORM_BY_PATH[relative]
    if form == "integritySha256":
        value["integritySha256"] = digest_bytes(package.canonical_json(value))
    elif form == "integrity.payloadSha256":
        value["integrity"] = {
            "algorithm": "sha256",
            "payloadSha256": digest_bytes(package.canonical_json(value)),
        }
    else:
        raise AssertionError(form)


def build_a45() -> dict[str, object]:
    rows: list[dict[str, object]] = []
    for index in range(56):
        row: dict[str, object] = {"ok": True, "screenshotPath": None, "screenshotSha256": None}
        if index < 28:
            row["screenshotPath"] = f"artifacts/pass35/a45/screenshots/route-{index:02d}.png"
            row["screenshotSha256"] = f"{index + 1:064x}"
        rows.append(row)
    return {
        "schemaVersion": "velmere.pass35.a45.browser-acceptance.v2",
        "baseUrl": "http://127.0.0.1:4173",
        "transport": {"scheme": "http", "loopbackOnly": True, "productionCertificateVerified": False},
        "bindings": {
            "sourceManifestSha256": "5" * 64,
            "runtimeInstanceSha256": "2" * 64,
            "browserExecutableSha256": "3" * 64,
            "buildId": "p36-targeted-test-build",
        },
        "summary": {"checks": 57, "passed": 57, "failed": 0},
        "qaFixture": {
            "enabled": True,
            "generated": True,
            "generatorId": "p36-targeted-a45-fixture",
            "fixtureRelativePath": "artifacts/pass35/a45/A45_DETERMINISTIC_LOCAL_REFERENCE_QA_FIXTURE.json",
            "fixtureSha256": "4" * 64,
            "fixtureByteLength": 1234,
            "liveProven": False,
            "saleEnabled": False,
            "providerCredit": False,
            "durableStorageCredit": False,
            "realDataCredit": False,
        },
        "rows": rows,
        "popup": {
            "ok": True,
            "screenshotPath": "artifacts/pass35/a45/screenshots/popup.png",
            "screenshotSha256": "f" * 64,
        },
        "failures": [],
        "truthBoundary": "Loopback QA fixture only. NO_GO and no paid, provider or customer credit.",
    }


def build_fixture() -> tuple[
    dict[str, dict[str, object]],
    dict[str, dict[str, object]],
    dict[str, str],
]:
    payloads: dict[str, dict[str, object]] = {
        package.SOURCE_IDENTITY_PATH: {
            "schemaVersion": "velmere.p36.source-identity.v1",
            "sourceAggregateSha256": "5" * 64,
        },
        package.A45_PATH: build_a45(),
    }
    for relative, schema in package.REQUIRED_CURRENT_FILES.items():
        if schema is None or relative in payloads:
            continue
        if relative in {package.STATUS_PATH, package.AUTHORITY_PATH, package.HANDOFF_PATH}:
            continue
        payloads[relative] = {"schemaVersion": schema, "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS"}
        if relative == package.AUTHORITY_EVIDENCE_PATHS["build"]:
            payloads[relative]["buildOutputs"] = {
                "turbopack": {"buildId": "p36-targeted-test-build"},
            }
        if relative != package.A45_PATH:
            seal(relative, payloads[relative])

    texts = {
        package.METHODOLOGY_V14: "VELMERE V14 current source authority\n",
        package.GROWTH_R12: "VELMERE Growth R12 current source closure\n",
        package.REPORT_PATH: "VELMERE P36 CURRENT SOURCE\nSTATE: NO_GO\n",
    }
    rows = {relative: row_for_bytes(relative, value.encode("utf-8")) for relative, value in texts.items()}
    for relative, payload in payloads.items():
        if relative == package.AUTHORITY_EVIDENCE_PATHS["browserProfiles"]:
            continue
        rows[relative] = row_for_bytes(relative, json_bytes(payload))

    browser_profiles_path = package.AUTHORITY_EVIDENCE_PATHS["browserProfiles"]
    browser_profiles = payloads[browser_profiles_path]
    browser_profiles["bindings"] = {
        "a45BrowserReceipt": {
            "path": package.A45_PATH,
            "byteLength": rows[package.A45_PATH]["byteLength"],
            "sha256": rows[package.A45_PATH]["sha256"],
        },
    }
    seal(browser_profiles_path, browser_profiles)
    rows[browser_profiles_path] = row_for_bytes(browser_profiles_path, json_bytes(browser_profiles))

    truth_boundary = "P36 is CURRENT_SOURCE_ONLY_IN_PROGRESS and NO_GO; sale and LIVE credit are zero."
    status = {
        "schemaVersion": "velmere.p36.status.v1",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "releaseState": "NO_GO",
        "goInternal": False,
        "goPaid": False,
        "live": False,
        "saleEnabled": False,
        "productionApproved": False,
        "worldClassProven": False,
        "truthBoundary": truth_boundary,
    }
    seal(package.STATUS_PATH, status)
    payloads[package.STATUS_PATH] = status
    rows[package.STATUS_PATH] = row_for_bytes(package.STATUS_PATH, json_bytes(status))

    evidence_bindings = {
        key: {
            "path": relative,
            "byteLength": rows[relative]["byteLength"],
            "sha256": rows[relative]["sha256"],
        }
        for key, relative in package.AUTHORITY_EVIDENCE_PATHS.items()
    }
    release_decision = {
        "state": "NO_GO",
        "goInternal": False,
        "goPaid": False,
        "saleEnabled": False,
        "live": False,
        "worldClassProven": False,
        "openRequiredForGoInternal": ["FINAL_HOLDOUTS_OPEN"],
        "externalOpenRequiredForPaid": ["REAL_CUSTOMERS_OPEN"],
    }
    authority = {
        "schemaVersion": "velmere.p36.current-authority.v1",
        "state": status["state"],
        "authorityFiles": {
            "methodology": copy.deepcopy(evidence_bindings["methodology"]),
            "growthIntel": copy.deepcopy(evidence_bindings["growth"]),
        },
        "source": copy.deepcopy(evidence_bindings["sourceIdentity"]),
        "status": {"path": package.STATUS_PATH, "sha256": rows[package.STATUS_PATH]["sha256"]},
        "evidenceBindings": evidence_bindings,
        "releaseDecision": release_decision,
        "truthBoundary": truth_boundary,
    }
    seal(package.AUTHORITY_PATH, authority)
    payloads[package.AUTHORITY_PATH] = authority
    rows[package.AUTHORITY_PATH] = row_for_bytes(package.AUTHORITY_PATH, json_bytes(authority))

    handoff = {
        "schemaVersion": "velmere.p36.handoff-manifest.v1",
        "state": status["state"],
        "currentAuthority": {
            "path": package.AUTHORITY_PATH,
            "sha256": rows[package.AUTHORITY_PATH]["sha256"],
        },
        "releaseDecision": copy.deepcopy(release_decision),
        "truthBoundary": truth_boundary,
    }
    seal(package.HANDOFF_PATH, handoff)
    payloads[package.HANDOFF_PATH] = handoff
    rows[package.HANDOFF_PATH] = row_for_bytes(package.HANDOFF_PATH, json_bytes(handoff))
    return rows, payloads, texts


def reseal_chain(
    rows: dict[str, dict[str, object]],
    payloads: dict[str, dict[str, object]],
    *,
    status_changed: bool = False,
    authority_changed: bool = False,
    handoff_changed: bool = False,
) -> None:
    if status_changed:
        seal(package.STATUS_PATH, payloads[package.STATUS_PATH])
        rows[package.STATUS_PATH] = row_for_bytes(package.STATUS_PATH, json_bytes(payloads[package.STATUS_PATH]))
        payloads[package.AUTHORITY_PATH]["status"]["sha256"] = rows[package.STATUS_PATH]["sha256"]
        authority_changed = True
    if authority_changed:
        seal(package.AUTHORITY_PATH, payloads[package.AUTHORITY_PATH])
        rows[package.AUTHORITY_PATH] = row_for_bytes(package.AUTHORITY_PATH, json_bytes(payloads[package.AUTHORITY_PATH]))
        payloads[package.HANDOFF_PATH]["currentAuthority"]["sha256"] = rows[package.AUTHORITY_PATH]["sha256"]
        handoff_changed = True
    if handoff_changed:
        seal(package.HANDOFF_PATH, payloads[package.HANDOFF_PATH])
        rows[package.HANDOFF_PATH] = row_for_bytes(package.HANDOFF_PATH, json_bytes(payloads[package.HANDOFF_PATH]))


assertions = 0
mutations = 0


def validate(rows: dict[str, dict[str, object]], payloads: dict[str, dict[str, object]], texts: dict[str, str]) -> None:
    global assertions
    package.validate_required_payload_contract(rows, payloads, texts)
    assertions += 1


def expect_failure(label: str, mutator, expected_fragment: str) -> None:
    global assertions, mutations
    rows, payloads, texts = build_fixture()
    mutator(rows, payloads, texts)
    try:
        package.validate_required_payload_contract(rows, payloads, texts)
    except RuntimeError as error:
        assertions += 1
        mutations += 1
        if expected_fragment not in str(error):
            raise AssertionError(f"{label}: expected {expected_fragment!r}, got {error!r}") from error
        return
    raise AssertionError(f"{label}: mutation was accepted")


baseline_rows, baseline_payloads, baseline_texts = build_fixture()
validate(baseline_rows, baseline_payloads, baseline_texts)


expect_failure(
    "status integrity missing",
    lambda _rows, payloads, _texts: payloads[package.STATUS_PATH].pop("integritySha256"),
    "required_receipt_integrity_missing",
)
expect_failure(
    "campaign integrity form missing",
    lambda _rows, payloads, _texts: payloads[package.AUTHORITY_EVIDENCE_PATHS["campaign"]].pop("integrity"),
    "required_receipt_integrity_missing",
)
expect_failure(
    "receipt integrity mismatch",
    lambda _rows, payloads, _texts: payloads[package.AUTHORITY_EVIDENCE_PATHS["matrix"]].__setitem__("state", "FORGED"),
    "required_receipt_integrity_mismatch",
)
expect_failure(
    "authority evidence key missing",
    lambda rows, payloads, _texts: (
        payloads[package.AUTHORITY_PATH]["evidenceBindings"].pop("pdf"),
        reseal_chain(rows, payloads, authority_changed=True),
    ),
    "current_authority_evidence_binding_keys_mismatch",
)
expect_failure(
    "authority evidence key extra",
    lambda rows, payloads, _texts: (
        payloads[package.AUTHORITY_PATH]["evidenceBindings"].__setitem__("forged", {"path": "x", "sha256": "0" * 64}),
        reseal_chain(rows, payloads, authority_changed=True),
    ),
    "current_authority_evidence_binding_keys_mismatch",
)
expect_failure(
    "authority evidence exact path",
    lambda rows, payloads, _texts: (
        payloads[package.AUTHORITY_PATH]["evidenceBindings"]["pdf"].__setitem__("path", "artifacts/forged.json"),
        reseal_chain(rows, payloads, authority_changed=True),
    ),
    "current_authority_evidence:pdf_path_mismatch",
)
expect_failure(
    "authority evidence exact sha",
    lambda rows, payloads, _texts: (
        payloads[package.AUTHORITY_PATH]["evidenceBindings"]["pdf"].__setitem__("sha256", "0" * 64),
        reseal_chain(rows, payloads, authority_changed=True),
    ),
    "current_authority_evidence:pdf_sha_mismatch",
)
expect_failure(
    "authority status exact path",
    lambda rows, payloads, _texts: (
        payloads[package.AUTHORITY_PATH]["status"].__setitem__("path", "artifacts/forged-status.json"),
        reseal_chain(rows, payloads, authority_changed=True),
    ),
    "current_authority_status_path_mismatch",
)
expect_failure(
    "authority status exact sha",
    lambda rows, payloads, _texts: (
        payloads[package.AUTHORITY_PATH]["status"].__setitem__("sha256", "0" * 64),
        reseal_chain(rows, payloads, authority_changed=True),
    ),
    "current_authority_status_sha_mismatch",
)
expect_failure(
    "handoff authority exact path",
    lambda rows, payloads, _texts: (
        payloads[package.HANDOFF_PATH]["currentAuthority"].__setitem__("path", "artifacts/forged-authority.json"),
        reseal_chain(rows, payloads, handoff_changed=True),
    ),
    "handoff_current_authority_path_mismatch",
)
expect_failure(
    "handoff authority exact sha",
    lambda rows, payloads, _texts: (
        payloads[package.HANDOFF_PATH]["currentAuthority"].__setitem__("sha256", "0" * 64),
        reseal_chain(rows, payloads, handoff_changed=True),
    ),
    "handoff_current_authority_sha_mismatch",
)
expect_failure(
    "status false promotion",
    lambda rows, payloads, _texts: (
        payloads[package.STATUS_PATH].__setitem__("goInternal", True),
        reseal_chain(rows, payloads, status_changed=True),
    ),
    "p36_status_false_promotion:goInternal",
)
expect_failure(
    "authority false promotion",
    lambda rows, payloads, _texts: (
        payloads[package.AUTHORITY_PATH]["releaseDecision"].__setitem__("goPaid", True),
        reseal_chain(rows, payloads, authority_changed=True),
    ),
    "p36_authority_status_decision_mismatch:goPaid",
)
expect_failure(
    "handoff authority decision mismatch",
    lambda rows, payloads, _texts: (
        payloads[package.HANDOFF_PATH]["releaseDecision"].__setitem__("live", True),
        reseal_chain(rows, payloads, handoff_changed=True),
    ),
    "p36_handoff_authority_decision_mismatch",
)
expect_failure(
    "a45 summary false promotion",
    lambda _rows, payloads, _texts: payloads[package.A45_PATH]["summary"].__setitem__("failed", 1),
    "a45_receipt_summary_invalid",
)
expect_failure(
    "a45 non-loopback origin",
    lambda _rows, payloads, _texts: payloads[package.A45_PATH].__setitem__("baseUrl", "https://example.com"),
    "a45_receipt_base_url_not_loopback",
)
expect_failure(
    "a45 paid truth promotion",
    lambda _rows, payloads, _texts: payloads[package.A45_PATH]["qaFixture"].__setitem__("saleEnabled", True),
    "a45_receipt_qa_truth_boundary_invalid",
)
expect_failure(
    "a45 source identity binding",
    lambda _rows, payloads, _texts: payloads[package.A45_PATH]["bindings"].__setitem__("sourceManifestSha256", "0" * 64),
    "a45_receipt_source_identity_binding_mismatch",
)
expect_failure(
    "a45 turbopack build id binding",
    lambda _rows, payloads, _texts: payloads[package.A45_PATH]["bindings"].__setitem__("buildId", "forged-build"),
    "a45_receipt_turbopack_build_id_binding_mismatch",
)
expect_failure(
    "browser profiles a45 cross-binding",
    lambda rows, payloads, _texts: (
        payloads[package.AUTHORITY_EVIDENCE_PATHS["browserProfiles"]]["bindings"]["a45BrowserReceipt"].__setitem__("sha256", "0" * 64),
        seal(package.AUTHORITY_EVIDENCE_PATHS["browserProfiles"], payloads[package.AUTHORITY_EVIDENCE_PATHS["browserProfiles"]]),
    ),
    "browser_profiles_a45_sha_mismatch",
)
expect_failure(
    "report empty",
    lambda _rows, _payloads, texts: texts.__setitem__(package.REPORT_PATH, ""),
    "p36_report_nonempty_no_go_required",
)
expect_failure(
    "report no-go marker missing",
    lambda _rows, _payloads, texts: texts.__setitem__(package.REPORT_PATH, "P36 report only\n"),
    "p36_report_nonempty_no_go_required",
)

print(json.dumps({
    "status": "PASS_P36_PACKAGE_CURRENT_SOURCE_CROSS_BINDINGS",
    "assertions": assertions,
    "mutationsRejected": mutations,
    "sharedArtifactsWritten": 0,
}, separators=(",", ":")))
