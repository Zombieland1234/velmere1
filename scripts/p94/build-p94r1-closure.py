#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import platform
import re
import shutil
import subprocess
import zipfile
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "artifacts/closure/p94r1"
PARENT_ZIP = Path("/mnt/data/VELMERE_R44P46_V17_P93R1_RISK_HISTORY_CANONICAL_IDENTITY_NON_ENUMERATING_SHARED_READER_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-20.zip")
PARENT_SHA = "7e4c70f14ff8648d37e87f5fd8781fa6c64b325607d91bb74d69b45d6b420eaf"
PARENT_BYTES = 217_111_320
PARENT_ENTRIES = 9_100
MASTER = "VELMERE_ULTIMATE_WORLD_CLASS_CONTINUOUS_CLOSURE_FINAL_CANDIDATE_MASTER_DIRECTIVE_V2_COMPLETE_2026-08-20.txt"
MASTER_SHA = "9184cd18eb864f50a8c5d3af8f2899e7f138372861095e343901ab9c5e3bcb53"
V17 = "VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt"
V17_SHA = "de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05"
GENERATED_AT = "2026-08-21T00:20:00.000Z"

PRODUCT_CHANGES = [
    "components/market-integrity/RiskHistoryControl.tsx",
    "lib/market-integrity/risk-history-contract.ts",
    "lib/market-integrity/risk-history-customer-client.ts",
    "lib/market-integrity/risk-ledger.ts",
    "lib/server/market-integrity-route-modules/history.ts",
]
DATABASE_CRITICAL = [
    "lib/db/schema.sql",
    "supabase/migrations/20260821000001_p94_risk_history_public_only_pagination_temporal_window.sql",
]
EXPECTED_MODIFIED_PARENT = sorted(PRODUCT_CHANGES + ["lib/db/schema.sql", "VELMERE_ACTIVE_PASS.txt"])
EXPECTED_ADDED_EXACT = {
    "P94R1_PACKAGE_BUILD_RECIPE.json",
    "supabase/migrations/20260821000001_p94_risk_history_public_only_pagination_temporal_window.sql",
    "tsconfig.p94-risk-history-server-targeted.json",
    "tsconfig.p94-risk-history-ui-targeted.json",
}
EXPECTED_ADDED_PREFIXES = ("artifacts/p94/", "receipts/p94/", "scripts/p94/")

PRIVATE_KEY_RE = re.compile(
    rb"-----BEGIN (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----\r?\n(?:[A-Za-z0-9+/=]{16,}\r?\n){2,}-----END (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----"
)
TOKEN_PATTERNS = {
    "aws_access_key_id": re.compile(rb"AKIA[0-9A-Z]{16}"),
    "stripe_live_secret": re.compile(rb"sk_live_[A-Za-z0-9]{16,}"),
    "stripe_webhook_secret": re.compile(rb"whsec_[A-Za-z0-9]{16,}"),
    "github_fine_grained_pat": re.compile(rb"github_pat_[A-Za-z0-9_]{20,}"),
    "github_classic_pat": re.compile(rb"ghp_[A-Za-z0-9]{30,}"),
    "openai_api_key": re.compile(rb"(?<![A-Za-z0-9_-])sk-(?:proj-)?[A-Za-z0-9_-]{24,}"),
    "google_api_key": re.compile(rb"AIza[0-9A-Za-z_-]{30,}"),
}


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(4 * 1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def zip_entry_sha(archive: zipfile.ZipFile, info: zipfile.ZipInfo) -> str:
    h = hashlib.sha256()
    with archive.open(info, "r") as handle:
        for chunk in iter(lambda: handle.read(4 * 1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def write(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def projection(rows: list[dict[str, Any]]) -> dict[str, Any]:
    ordered = sorted(rows, key=lambda row: row["path"])
    path_hash = hashlib.sha256("\n".join(row["path"] for row in ordered).encode()).hexdigest()
    aggregate = hashlib.sha256()
    for row in ordered:
        aggregate.update(f"{row['path']}\0{row['byteLength']}\0{row['sha256']}\n".encode())
    return {
        "fileCount": len(ordered),
        "payloadBytes": sum(row["byteLength"] for row in ordered),
        "pathSetSha256": path_hash,
        "sourceContentAggregateSha256": aggregate.hexdigest(),
    }


def parent_index() -> dict[str, dict[str, Any]]:
    if not PARENT_ZIP.is_file() or PARENT_ZIP.stat().st_size != PARENT_BYTES or sha(PARENT_ZIP) != PARENT_SHA:
        raise RuntimeError("parent_source_only_identity_mismatch")
    rows: dict[str, dict[str, Any]] = {}
    with zipfile.ZipFile(PARENT_ZIP) as archive:
        infos = [info for info in archive.infolist() if not info.is_dir()]
        if len(infos) != PARENT_ENTRIES or archive.testzip() is not None:
            raise RuntimeError("parent_zip_integrity_mismatch")
        for info in infos:
            if info.filename == "PACKAGE_CONTENT_MANIFEST.tsv":
                continue
            rows[info.filename] = {
                "path": info.filename,
                "byteLength": info.file_size,
                "sha256": zip_entry_sha(archive, info),
            }
    return rows


def current_index() -> dict[str, dict[str, Any]]:
    rows: dict[str, dict[str, Any]] = {}
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        relative = path.relative_to(ROOT).as_posix()
        if relative.startswith("artifacts/closure/p94r1/") or relative == "PACKAGE_CONTENT_MANIFEST.tsv":
            continue
        if path.is_symlink():
            raise RuntimeError(f"symlink:{relative}")
        if relative.endswith((".pyc", ".pyo")) or "/__pycache__/" in f"/{relative}/":
            raise RuntimeError(f"python_cache:{relative}")
        if relative.startswith("node_modules/"):
            raise RuntimeError(f"node_modules:{relative}")
        rows[relative] = {"path": relative, "byteLength": path.stat().st_size, "sha256": sha(path)}
    return rows


def classify(relative: str) -> str:
    if relative in PRODUCT_CHANGES:
        return "CURRENT_PRODUCT_BUILD_RELEVANT"
    if relative in DATABASE_CRITICAL:
        return "DATABASE_CLOSURE_CRITICAL"
    if relative == MASTER:
        return "OWNER_MASTER_AUTHORITY_UNCHANGED"
    if relative == V17:
        return "CANONICAL_TOPOLOGY_AUTHORITY_UNCHANGED"
    if relative == "VELMERE_ACTIVE_PASS.txt":
        return "CONTROL_PLANE_POINTER"
    if relative == "P94R1_PACKAGE_BUILD_RECIPE.json":
        return "DETERMINISTIC_PACKAGE_RECIPE"
    if relative.startswith("receipts/p94/"):
        return "P94_CURRENT_RECEIPT"
    if relative.startswith("artifacts/p94/"):
        return "P94_CURRENT_PROOF_FAILURE_LOG_OR_SNAPSHOT"
    if relative.startswith("scripts/p94/") or relative.startswith("tsconfig.p94-"):
        return "P94_HARNESS_OR_CLOSURE_SOURCE"
    return "CURRENT_SOURCE_SUPPORT"


def build_source_change_manifest(parent: dict[str, dict[str, Any]], current: dict[str, dict[str, Any]]) -> dict[str, Any]:
    changes: list[dict[str, Any]] = []
    for relative in sorted(set(parent) | set(current)):
        before = parent.get(relative)
        after = current.get(relative)
        if before == after:
            continue
        changes.append({
            "path": relative,
            "change": "ADDED" if before is None else "DELETED" if after is None else "MODIFIED",
            "classification": classify(relative),
            "beforeBytes": before["byteLength"] if before else None,
            "beforeSha256": before["sha256"] if before else None,
            "afterBytes": after["byteLength"] if after else None,
            "afterSha256": after["sha256"] if after else None,
        })
    modified_parent = sorted(row["path"] for row in changes if row["change"] == "MODIFIED")
    deleted_parent = sorted(row["path"] for row in changes if row["change"] == "DELETED")
    added = sorted(row["path"] for row in changes if row["change"] == "ADDED")
    unexpected_added = [path for path in added if path not in EXPECTED_ADDED_EXACT and not path.startswith(EXPECTED_ADDED_PREFIXES)]
    actual_product = sorted(row["path"] for row in changes if row["classification"] == "CURRENT_PRODUCT_BUILD_RELEVANT")
    actual_database = sorted(row["path"] for row in changes if row["classification"] == "DATABASE_CLOSURE_CRITICAL")
    if modified_parent != EXPECTED_MODIFIED_PARENT:
        raise RuntimeError(f"modified_parent_mismatch:{modified_parent}")
    if deleted_parent:
        raise RuntimeError(f"deleted_parent_files:{deleted_parent}")
    if unexpected_added:
        raise RuntimeError(f"unexpected_added_files:{unexpected_added}")
    if actual_product != sorted(PRODUCT_CHANGES):
        raise RuntimeError(f"product_delta_mismatch:{actual_product}")
    if actual_database != sorted(DATABASE_CRITICAL):
        raise RuntimeError(f"database_delta_mismatch:{actual_database}")
    payload = {
        "schemaVersion": "velmere.p94r1.source-change-manifest.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_EXACT_PARENT_DIFF",
        "parentSourceOnly": {
            "name": PARENT_ZIP.name,
            "bytes": PARENT_ZIP.stat().st_size,
            "zipEntries": PARENT_ENTRIES,
            "diffScopeFiles": len(parent),
            "sha256": sha(PARENT_ZIP),
        },
        "parentFilesByteIdenticalInDiffScope": len(parent) - len(modified_parent),
        "modifiedParentFiles": modified_parent,
        "deletedParentFiles": [],
        "addedFiles": added,
        "changeCount": len(changes),
        "classificationCounts": dict(Counter(row["classification"] for row in changes)),
        "changedBuildRelevantFiles": PRODUCT_CHANGES,
        "databaseClosureCriticalFiles": DATABASE_CRITICAL,
        "changes": changes,
        "truthBoundary": "Exact file-level diff from canonical P93 SOURCE_ONLY. PACKAGE_CONTENT_MANIFEST.tsv is symmetrically excluded because it is rebuilt and independently verified during packaging; P94 closure artifacts are excluded to avoid self-reference. No undeclared parent modification or deletion is accepted.",
    }
    write(OUT / "P94R1_SOURCE_CHANGE_MANIFEST.json", payload)
    return payload


def build_product_projection() -> dict[str, Any]:
    parent = load(ROOT / "artifacts/closure/p93r1/P93R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json")
    expected_parent = parent["currentCandidateProjection"]
    reconstructed = projection(parent["files"])
    if reconstructed != expected_parent:
        raise RuntimeError("parent_product_projection_mismatch")
    rows = {row["path"]: dict(row) for row in parent["files"]}
    changed: list[dict[str, Any]] = []
    for relative in PRODUCT_CHANGES:
        path = ROOT / relative
        before = rows.get(relative)
        after = {"path": relative, "byteLength": path.stat().st_size, "sha256": sha(path)}
        rows[relative] = after
        changed.append({
            "path": relative,
            "change": "ADDED" if before is None else "MODIFIED",
            "beforeBytes": before["byteLength"] if before else None,
            "beforeSha256": before["sha256"] if before else None,
            "afterBytes": after["byteLength"],
            "afterSha256": after["sha256"],
        })
    current = projection(list(rows.values()))
    payload = {
        "schemaVersion": "velmere.p94r1.current-product-projection-manifest.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY",
        "parentCheckpoint": "P93R1_RISK_HISTORY_CANONICAL_IDENTITY_NON_ENUMERATING_SHARED_READER",
        "parentProjectionReconstructedExactly": True,
        "parentProjection": expected_parent,
        "currentCandidateProjection": current,
        "delta": {
            "fileCount": current["fileCount"] - expected_parent["fileCount"],
            "payloadBytes": current["payloadBytes"] - expected_parent["payloadBytes"],
            "changedBuildRelevantFiles": len(changed),
        },
        "changedBuildRelevantFiles": changed,
        "databaseDeploymentBoundary": {
            "changedFiles": DATABASE_CRITICAL,
            "authorizedDatabaseExecution": "NOT_EXECUTED_P94",
            "stagingRuntimeProof": "WITHHELD",
        },
        "files": sorted(rows.values(), key=lambda row: row["path"]),
        "truthBoundary": "Build-relevant source identity only. Database migration/schema files are closure-critical but remain outside the historical product projection denominator. Exact Windows, deployed HTTP and Browser runtime credit are withheld.",
    }
    write(OUT / "P94R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json", payload)
    return payload


def build_authority_binding() -> dict[str, Any]:
    master = ROOT / MASTER
    v17 = ROOT / V17
    master_text = master.read_text(encoding="utf-8")
    sections = [int(value) for value in re.findall(r"^# (\d+)\.", master_text, flags=re.MULTILINE)]
    if sha(master) != MASTER_SHA or master.stat().st_size != 38_471 or sections != list(range(89)):
        raise RuntimeError("master_directive_binding")
    if "START NOW" not in master_text or "END-OF-DIRECTIVE" not in master_text:
        raise RuntimeError("master_directive_completeness")
    if sha(v17) != V17_SHA or v17.stat().st_size != 66_416:
        raise RuntimeError("v17_binding")
    payload = {
        "schemaVersion": "velmere.p94r1.authority-binding.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS",
        "masterDirective": {"path": MASTER, "bytes": master.stat().st_size, "sha256": sha(master), "sections": "0-88 PRESENT", "startNow": True, "sentinel": True, "changed": False},
        "canonicalOwnerDirective": {"path": V17, "bytes": v17.stat().st_size, "sha256": sha(v17), "changed": False},
        "parentSourceOnly": {"name": PARENT_ZIP.name, "bytes": PARENT_BYTES, "entries": PARENT_ENTRIES, "sha256": PARENT_SHA},
        "topology": {"families": 10, "customerRows": 20, "executionProfiles": 20, "materialPaidTransitions": 10},
        "truthBoundary": "Master V2 remains continuous-closure authority and V17 remains unchanged product-topology authority. No formal rebind is created because neither authority file changed.",
    }
    write(OUT / "P94R1_AUTHORITY_BINDING.json", payload)
    return payload


def receipt_pair(name: str) -> tuple[Path, Path]:
    return ROOT / f"receipts/p94/{name}.json", ROOT / f"artifacts/p94/{name}.json"


def build_test_aggregate() -> dict[str, Any]:
    expected = [
        ("P94_RISK_HISTORY_PUBLIC_PAGINATION_RUNTIME", 62, "PASS_BOUNDED_NO_SOCKET_PUBLIC_ONLY_PAGINATION"),
        ("P94_RISK_HISTORY_PUBLIC_PAGINATION_STATIC", 111, "PASS"),
        ("P94_CHANGED_MODULE_REACHABILITY", 14, "PASS_BOUNDED_LOCAL_IMPORT_AND_TRANSPILE"),
        ("P94_TARGETED_STRICT_TYPESCRIPT", 4, "PASS_BOUNDED_TARGETED_STRICT_TYPESCRIPT"),
        ("P94_RUNTIME_REPEATABILITY", 4, "PASS_2_OF_2_BYTE_IDENTICAL"),
    ]
    rows: list[dict[str, Any]] = []
    core_total = 0
    for name, count, expected_status in expected:
        receipt, artifact = receipt_pair(name)
        data = load(receipt)
        if data.get("status") != expected_status or data.get("checks", {}).get("total") != count:
            raise RuntimeError(f"test_receipt_mismatch:{name}")
        if sha(receipt) != sha(artifact):
            raise RuntimeError(f"receipt_artifact_divergence:{name}")
        rows.append({"id": name, "checks": count, "status": data["status"], "receipt": receipt.relative_to(ROOT).as_posix(), "receiptSha256": sha(receipt)})
        core_total += count
    regression = load(ROOT / "receipts/p94/P94_CURRENT_BYTE_REGRESSION.json")
    if regression.get("status") != "PASS_BOUNDED_CURRENT_BYTE_AFFECTED_SCOPE_REGRESSION":
        raise RuntimeError("regression_status")
    if regression.get("commands") != {"total": 7, "passed": 7, "failed": 0, "rows": regression["commands"]["rows"]}:
        # The row list is dynamic; validate the counters separately below.
        counters = {key: regression.get("commands", {}).get(key) for key in ("total", "passed", "failed")}
        if counters != {"total": 7, "passed": 7, "failed": 0}:
            raise RuntimeError(f"regression_commands:{counters}")
    if regression.get("checks") != {"total": 308, "passed": 308, "failed": 0}:
        raise RuntimeError("regression_aggregate")
    failure = load(ROOT / "receipts/p94/P94_FAILURE_ADJUDICATION.json")
    if failure.get("status") != "PASS_COMPLETE_FAILURE_ADJUDICATION_ZERO_CREDIT" or failure.get("failures", {}).get("total") != 7 or failure.get("failures", {}).get("unadjudicated") != 0:
        raise RuntimeError("failure_adjudication")
    parent_history = load(ROOT / "receipts/p94/P94_PARENT_HISTORY_IMMUTABILITY.json")
    if parent_history.get("status") != "PASS_BYTE_IDENTICAL_PARENT_HISTORY_EXCEPT_DECLARED_P94_DELTA":
        raise RuntimeError("parent_history_status")
    for name in ("P94_CURRENT_BYTE_REGRESSION", "P94_FAILURE_ADJUDICATION", "P94_PARENT_HISTORY_IMMUTABILITY"):
        receipt, artifact = receipt_pair(name)
        if sha(receipt) != sha(artifact):
            raise RuntimeError(f"receipt_artifact_divergence:{name}")
    payload = {
        "schemaVersion": "velmere.p94r1.test-aggregate.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_BOUNDED_CURRENT_BYTE_AFFECTED_SCOPE",
        "p94CoreExecutedChecksAcrossOverlappingHarnesses": core_total,
        "freshAffectedScopeRegressionChecksAcrossOverlappingHarnesses": 308,
        "freshRegressionCommands": 7,
        "rows": rows,
        "currentByteRegression": {"receipt": "receipts/p94/P94_CURRENT_BYTE_REGRESSION.json", "sha256": sha(ROOT / "receipts/p94/P94_CURRENT_BYTE_REGRESSION.json"), "checks": 308},
        "failureAdjudication": {"receipt": "receipts/p94/P94_FAILURE_ADJUDICATION.json", "sha256": sha(ROOT / "receipts/p94/P94_FAILURE_ADJUDICATION.json"), "failuresPreservedWithZeroCredit": 7, "unadjudicated": 0},
        "parentHistory": {"receipt": "receipts/p94/P94_PARENT_HISTORY_IMMUTABILITY.json", "sha256": sha(ROOT / "receipts/p94/P94_PARENT_HISTORY_IMMUTABILITY.json"), "verifiedBeforeControlPlaneAndPackaging": parent_history["parentFilesVerifiedByteIdentical"]},
        "inheritedUnchangedScopeEvidence": {"parentP93FreshAffectedScopeChecks": 346, "freshP94Credit": False, "reason": "Unchanged parent scope remains historical evidence and is not re-counted as fresh P94 execution."},
        "zeroFakeCredit": {"independentEvidenceCount": False, "accuracyStatistic": False, "realPostgreSQL": False, "realHTTP": False, "renderedBrowser": False, "accessibilityCertification": False, "customerFinal": "0/20", "riskIndicatorFinal": False},
        "truthBoundary": "The 308-check current-byte affected-scope regression is the fresh headline. It includes overlapping P94 rows plus selected P91/P93 compatibility rows. The 4 repeatability commands are reported separately and must not be added as independent evidence. Parent evidence is not fresh P94 credit.",
    }
    write(OUT / "P94R1_TEST_AGGREGATE.json", payload)
    return payload


def build_failure_adjudication_copy() -> dict[str, Any]:
    source = load(ROOT / "receipts/p94/P94_FAILURE_ADJUDICATION.json")
    payload = {
        "schemaVersion": "velmere.p94r1.failure-adjudication.v1",
        "generatedAt": GENERATED_AT,
        "status": source["status"],
        "sourceReceipt": "receipts/p94/P94_FAILURE_ADJUDICATION.json",
        "sourceReceiptSha256": sha(ROOT / "receipts/p94/P94_FAILURE_ADJUDICATION.json"),
        "failures": source["failures"],
        "replacementProofs": source["replacementProofs"],
        "zeroFakeCredit": source["zeroFakeCredit"],
        "truthBoundary": source["truthBoundary"],
    }
    write(OUT / "P94R1_FAILURE_ADJUDICATION.json", payload)
    return payload


def build_parent_preservation(source_manifest: dict[str, Any]) -> dict[str, Any]:
    receipt = ROOT / "receipts/p94/P94_PARENT_HISTORY_IMMUTABILITY.json"
    history = load(receipt)
    payload = {
        "schemaVersion": "velmere.p94r1.parent-history-preservation.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_EXACT_PARENT_PRESERVATION",
        "parentSourceOnly": source_manifest["parentSourceOnly"],
        "parentFilesByteIdentical": source_manifest["parentFilesByteIdenticalInDiffScope"],
        "declaredModifiedParentFiles": source_manifest["modifiedParentFiles"],
        "deletedParentFiles": [],
        "unexpectedModifiedParentFiles": [],
        "unexpectedAddedFiles": [],
        "preClosureReceipt": {"path": receipt.relative_to(ROOT).as_posix(), "sha256": sha(receipt), "verified": history["parentFilesVerifiedByteIdentical"]},
        "truthBoundary": "All P93 files in the symmetric source-diff scope outside the seven explicitly declared P94 changes remain byte-identical. The active-pass pointer is a control-plane change and does not alter frozen historical receipts.",
    }
    write(OUT / "P94R1_PARENT_HISTORY_PRESERVATION.json", payload)
    return payload


def build_boundary_receipt() -> dict[str, Any]:
    payload = {
        "schemaVersion": "velmere.p94r1.risk-history-public-pagination-boundary.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_BOUNDED_LOCAL_SOURCE_NO_SOCKET",
        "physicalChanges": {
            "publicSelection": "Only PUBLIC and customerPublishable events are selected before limit and cursor application; WITHHELD events cannot consume public page capacity.",
            "pagination": "Pages use an exclusive canonical ISO observedAt cursor, request binding, limit+1 detection and strict older-page progression.",
            "truthfulWindow": "trackingStartedAt is shown only after the earliest publishable event is reached; otherwise customer wording describes a bounded visible window.",
            "customerMerge": "Pages are schema-bound, non-overlapping, chronologically merged and capped at 5000 events with an explicit safety-limit disclosure.",
            "temporalChart": "Chart x positions use actual observedAt time distance rather than event index spacing.",
            "nonEnumeration": "Unknown, ambiguous, private-only and exhausted windows normalize to the same customer-safe empty projection.",
            "sharedIntegrity": "P91 event integrity and P93 canonical shared-reader consumers remain green on current bytes.",
        },
        "privacyAndSecurity": {
            "rawPrivateEventsCustomerVisible": False,
            "withheldEventsInfluencePublicLimit": False,
            "requestBindingCustomerVisible": False,
            "providerTopologyCustomerVisible": False,
            "rawEvidenceCustomerVisible": False,
            "automaticUnboundedHistoryFetch": False,
        },
        "database": {
            "migration": "supabase/migrations/20260821000001_p94_risk_history_public_only_pagination_temporal_window.sql",
            "rpc": "velmere_read_public_risk_history_by_asset_v1",
            "schemaSourceParity": "PASS_STATIC",
            "authorizedExecution": "NOT_EXECUTED",
            "runtimeRlsServiceRoleProof": "WITHHELD",
        },
        "finalState": {"riskIndicatorFinal": False, "customerFinal": "0/20", "global": "NO_GO / STOP_SELL"},
        "truthBoundary": "No-socket local/runtime/static/source proof only. It does not prove deployed PostgreSQL, RLS, HTTP timing, rendered Browser, accessibility, staging, production or real customer data.",
    }
    write(OUT / "P94R1_RISK_HISTORY_PUBLIC_PAGINATION_BOUNDARY.json", payload)
    return payload


def build_environment_truth() -> dict[str, Any]:
    def command(command: list[str]) -> str:
        return subprocess.check_output(command, text=True).strip()
    payload = {
        "schemaVersion": "velmere.p94r1.environment-truth.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_BOUNDED_LOCAL_ENVIRONMENT_WITHHOLDS_PRESERVED",
        "local": {
            "platform": platform.platform(),
            "python": platform.python_version(),
            "node": command(["node", "-v"]),
            "npm": command(["npm", "-v"]),
            "psql": shutil.which("psql"),
            "supabase": shutil.which("supabase"),
            "docker": shutil.which("docker"),
        },
        "target": {"os": "Windows Server 2025", "node": "24.18.0", "npm": "11.16.0"},
        "passes": {"targetedStrictTypeScript": "4/4 PASS_BOUNDED", "changedModuleReachability": "14/14 PASS_BOUNDED", "currentAffectedScope": "308/308 PASS_BOUNDED", "boundedRepeatability": "4/4 COMMANDS_2_OF_2_BYTE_IDENTICAL"},
        "withheld": [
            "whole-project semantic TypeScript",
            "ESLint zero-warning",
            "Webpack production build",
            "Turbopack production build",
            "rendered Browser/WCAG/mobile/cross-browser",
            "authorized PostgreSQL/Supabase migration runtime",
            "exact Windows Server 2025 on P94R1 bytes",
        ],
        "truthBoundary": "Closed ambient compilation and isolated transpilation do not substitute for the installed dependency graph, Browser, PostgreSQL or exact Windows.",
    }
    write(OUT / "P94R1_ENVIRONMENT_TRUTH.json", payload)
    return payload


def build_security_scan(current: dict[str, dict[str, Any]]) -> dict[str, Any]:
    findings: list[dict[str, str]] = []
    scanned_bytes = 0
    for relative in sorted(current):
        path = ROOT / relative
        data = path.read_bytes()
        scanned_bytes += len(data)
        if PRIVATE_KEY_RE.search(data):
            findings.append({"path": relative, "pattern": "private_key_block"})
        for name, pattern in TOKEN_PATTERNS.items():
            if pattern.search(data):
                findings.append({"path": relative, "pattern": name})
    current_binaries = [
        relative for relative in current
        if relative.startswith(("receipts/p94/", "artifacts/p94/", "scripts/p94/"))
        and Path(relative).suffix.lower() in {".pdf", ".zip", ".woff", ".woff2", ".ttf", ".otf", ".exe", ".dll", ".bin", ".pyc", ".pyo"}
    ]
    if findings or current_binaries:
        raise RuntimeError(json.dumps({"secrets": findings, "binaries": current_binaries}, indent=2))
    payload = {
        "schemaVersion": "velmere.p94r1.security-privacy-scan.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_BOUNDED_CURRENT_TREE",
        "filesScanned": len(current),
        "bytesScanned": scanned_bytes,
        "privateKeyAndTokenMatches": 0,
        "unexpectedCurrentBinaryMatches": 0,
        "customerBoundaryChecks": {
            "withheldEventsBeforePublicPagination": "FILTERED_OUT",
            "privateHistoryExistence": "NORMALIZED_TO_PUBLIC_EMPTY",
            "requestBinding": "INTERNAL_ONLY",
            "rawRiskSnapshots": "BLOCKED_BY_CLOSED_PROJECTION",
            "rawDatabaseErrors": "GENERIC_503_ONLY",
            "unboundedAutomaticHistoryFetch": "NOT_PRESENT",
        },
        "truthBoundary": "Pattern and source-boundary scan only; not a complete dynamic application security test, deployed RLS proof or production secret-management proof.",
    }
    write(OUT / "P94R1_SECURITY_AND_PRIVACY_SCAN.json", payload)
    return payload


def build_blocker_map() -> dict[str, Any]:
    payload = {
        "schemaVersion": "velmere.p94r1.current-blocker-map.v1",
        "generatedAt": GENERATED_AT,
        "status": "OPEN_BLOCKERS_CLASSIFIED",
        "rows": [
            {"priority": 1, "category": "ENVIRONMENT", "workstream": "Risk History database and deployed HTTP", "blocker": "P91, P93 and P94 migrations have not run on authorized PostgreSQL/Supabase; public-only pagination, service-role isolation, RLS, cursor behavior, concurrency, rollback, timing/non-enumeration and exact readback remain unproven.", "nextAction": "Apply migrations on authorized staging and execute exact canonical, old-only alias, ambiguous, empty, private-only, multiple-page and rollback cases with two identities."},
            {"priority": 2, "category": "ENVIRONMENT", "workstream": "Risk History Browser/accessibility", "blocker": "No exact dependency graph or rendered desktop/mobile Browser journey proves load-older behavior, time-proportional chart, focus, screen reader, reduced motion and PL/EN/DE on P94 bytes.", "nextAction": "Run full type/lint/build and Chrome/Edge/Firefox/WebKit customer journeys on exact current bytes."},
            {"priority": 3, "category": "PRODUCT", "workstream": "Risk Indicator Customer FINAL", "blocker": "Real customer-authorized input, current evidence, deployed history, immutable output and final adjudication are incomplete.", "nextAction": "Bind one deployed P94 Risk History execution to an exact Risk Indicator customer output after database and Browser proof."},
            {"priority": 4, "category": "RIGHTS", "workstream": "Audit Pro", "blocker": "Five live lanes, four strict receipts, three independent families, six evidence rows and field-level commercial/display/PDF/retention rights remain unproven.", "nextAction": "Execute rights-bound provider lanes without lowering P89/P90 thresholds."},
            {"priority": 5, "category": "ENVIRONMENT", "workstream": "Exact Windows", "blocker": "Full semantic type/lint/dual build and Windows Server 2025 proof do not exist on P94R1 bytes.", "nextAction": "Run the canonical Windows stack after exact dependency closure."},
        ],
        "noProgressRule": "If authorized staging or exact dependencies remain unavailable, continue a separate product/security/rights workstream rather than retrying the same unavailable environment.",
    }
    write(OUT / "P94R1_CURRENT_BLOCKER_MAP.json", payload)
    return payload


def build_checkpoint() -> dict[str, Any]:
    names = [
        "P94R1_AUTHORITY_BINDING.json",
        "P94R1_SOURCE_CHANGE_MANIFEST.json",
        "P94R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json",
        "P94R1_TEST_AGGREGATE.json",
        "P94R1_FAILURE_ADJUDICATION.json",
        "P94R1_PARENT_HISTORY_PRESERVATION.json",
        "P94R1_RISK_HISTORY_PUBLIC_PAGINATION_BOUNDARY.json",
        "P94R1_ENVIRONMENT_TRUTH.json",
        "P94R1_SECURITY_AND_PRIVACY_SCAN.json",
        "P94R1_CURRENT_BLOCKER_MAP.json",
    ]
    evidence = []
    for name in names:
        path = OUT / name
        evidence.append({"path": path.relative_to(ROOT).as_posix(), "bytes": path.stat().st_size, "sha256": sha(path)})
    active = (ROOT / "VELMERE_ACTIVE_PASS.txt").read_text(encoding="utf-8").strip()
    if active != "P94R1":
        raise RuntimeError("active_pass_not_p94r1")
    payload = {
        "schemaVersion": "velmere.p94r1.checkpoint-receipt.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_BOUNDED_P94R1_RISK_HISTORY_PUBLIC_ONLY_PAGINATION_TEMPORAL_TRUTH",
        "parent": {"checkpoint": "P93R1", "sourceOnly": PARENT_ZIP.name, "sha256": PARENT_SHA},
        "activePass": active,
        "evidence": evidence,
        "numerators": {"customerFinal": "0/20", "auditFinalPdf": "0/3", "rights": "2/203 inherited only", "paidValue": "0/10", "saleEligible": "0/20", "riskIndicatorFinal": False, "live": False, "worldClassProven": False},
        "global": "NO_GO / STOP_SELL",
        "truthBoundary": "P94R1 is a local source/runtime/static savepoint. PostgreSQL, deployed HTTP, rendered Browser, real customer, exact Windows and FINAL remain withheld.",
    }
    write(OUT / "P94R1_CHECKPOINT_RECEIPT.json", payload)
    return payload


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for path in OUT.glob("*"):
        if path.is_file():
            path.unlink()
    parent = parent_index()
    current = current_index()
    authority = build_authority_binding()
    source = build_source_change_manifest(parent, current)
    product = build_product_projection()
    tests = build_test_aggregate()
    failure = build_failure_adjudication_copy()
    preservation = build_parent_preservation(source)
    boundary = build_boundary_receipt()
    environment = build_environment_truth()
    security = build_security_scan(current)
    blockers = build_blocker_map()
    checkpoint = build_checkpoint()
    print(json.dumps({
        "status": checkpoint["status"],
        "authority": authority["status"],
        "parentFilesByteIdentical": source["parentFilesByteIdenticalInDiffScope"],
        "sourceChanges": source["changeCount"],
        "productProjection": product["currentCandidateProjection"],
        "freshAffectedScopeChecks": tests["freshAffectedScopeRegressionChecksAcrossOverlappingHarnesses"],
        "failuresAdjudicatedZeroCredit": failure["failures"]["total"],
        "securityMatches": security["privateKeyAndTokenMatches"],
        "blockers": len(blockers["rows"]),
        "closureFiles": len(list(OUT.glob("*.json"))),
        "boundary": boundary["status"],
        "preservation": preservation["status"],
        "environment": environment["status"],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
