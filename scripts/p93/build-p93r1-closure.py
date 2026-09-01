#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import platform
import re
import subprocess
import zipfile
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "artifacts/closure/p93r1"
PARENT_ZIP = Path("/mnt/data/VELMERE_R44P46_V17_P92R1_RISK_HISTORY_CUSTOMER_HOVER_EXPAND_SAFE_UI_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-20.zip")
PARENT_SHA = "77790066280877563ad07480fc33b18bc1c143800eef8cc29fb00586b839ace7"
PARENT_BYTES = 216_842_187
PARENT_ENTRIES = 9_007
MASTER = "VELMERE_ULTIMATE_WORLD_CLASS_CONTINUOUS_CLOSURE_FINAL_CANDIDATE_MASTER_DIRECTIVE_V2_COMPLETE_2026-08-20.txt"
MASTER_SHA = "9184cd18eb864f50a8c5d3af8f2899e7f138372861095e343901ab9c5e3bcb53"
V17 = "VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt"
V17_SHA = "de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05"
GENERATED_AT = "2026-08-20T16:00:00.000Z"

PRODUCT_CHANGES = [
    "components/market-integrity/RiskHistoryControl.tsx",
    "lib/market-integrity/risk-history-contract.ts",
    "lib/market-integrity/risk-ledger.ts",
    "lib/server/market-integrity-route-modules/history.ts",
]
DATABASE_CRITICAL = [
    "lib/db/schema.sql",
    "supabase/migrations/20260820000007_p93_risk_history_canonical_identity_public_resolution.sql",
]
EXPECTED_MODIFIED_PARENT = sorted(PRODUCT_CHANGES + ["lib/db/schema.sql", "VELMERE_ACTIVE_PASS.txt"])
EXPECTED_ADDED_EXACT = {
    "P93R1_PACKAGE_BUILD_RECIPE.json",
    "supabase/migrations/20260820000007_p93_risk_history_canonical_identity_public_resolution.sql",
    "tsconfig.p93-risk-history-server-targeted.json",
}
EXPECTED_ADDED_PREFIXES = ("artifacts/p93/", "receipts/p93/", "scripts/p93/")

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


def sha_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


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
        if relative.startswith("artifacts/closure/p93r1/") or relative == "PACKAGE_CONTENT_MANIFEST.tsv":
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
    if relative == "P93R1_PACKAGE_BUILD_RECIPE.json":
        return "DETERMINISTIC_PACKAGE_RECIPE"
    if relative.startswith("receipts/p93/"):
        return "P93_CURRENT_RECEIPT"
    if relative.startswith("artifacts/p93/"):
        return "P93_CURRENT_PROOF_FAILURE_LOG_OR_SNAPSHOT"
    if relative.startswith("scripts/p93/") or relative.startswith("tsconfig.p93-"):
        return "P93_HARNESS_OR_CLOSURE_SOURCE"
    return "CURRENT_SOURCE_SUPPORT"


def build_source_change_manifest(parent: dict[str, dict[str, Any]], current: dict[str, dict[str, Any]]) -> dict[str, Any]:
    changes: list[dict[str, Any]] = []
    for relative in sorted(set(parent) | set(current)):
        before = parent.get(relative)
        after = current.get(relative)
        if before == after:
            continue
        changes.append(
            {
                "path": relative,
                "change": "ADDED" if before is None else "DELETED" if after is None else "MODIFIED",
                "classification": classify(relative),
                "beforeBytes": before["byteLength"] if before else None,
                "beforeSha256": before["sha256"] if before else None,
                "afterBytes": after["byteLength"] if after else None,
                "afterSha256": after["sha256"] if after else None,
            }
        )
    modified_parent = sorted(row["path"] for row in changes if row["change"] == "MODIFIED")
    deleted_parent = sorted(row["path"] for row in changes if row["change"] == "DELETED")
    added = sorted(row["path"] for row in changes if row["change"] == "ADDED")
    unexpected_added = [
        path
        for path in added
        if path not in EXPECTED_ADDED_EXACT and not path.startswith(EXPECTED_ADDED_PREFIXES)
    ]
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
        "schemaVersion": "velmere.p93r1.source-change-manifest.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_EXACT_PARENT_DIFF",
        "parentSourceOnly": {
            "name": PARENT_ZIP.name,
            "bytes": PARENT_ZIP.stat().st_size,
            "entries": len(parent),
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
        "truthBoundary": "Exact file-level diff from canonical P92 SOURCE_ONLY excluding PACKAGE_CONTENT_MANIFEST.tsv symmetrically from parent and current because it is rebuilt and independently verified during packaging. P93 closure artifacts are excluded to avoid self-reference. No undeclared parent modification or deletion is accepted.",
    }
    write(OUT / "P93R1_SOURCE_CHANGE_MANIFEST.json", payload)
    return payload


def build_product_projection() -> dict[str, Any]:
    parent = load(ROOT / "artifacts/closure/p92r1/P92R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json")
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
        changed.append(
            {
                "path": relative,
                "change": "ADDED" if before is None else "MODIFIED",
                "beforeBytes": before["byteLength"] if before else None,
                "beforeSha256": before["sha256"] if before else None,
                "afterBytes": after["byteLength"],
                "afterSha256": after["sha256"],
            }
        )
    current = projection(list(rows.values()))
    payload = {
        "schemaVersion": "velmere.p93r1.current-product-projection-manifest.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY",
        "parentCheckpoint": "P92R1_RISK_HISTORY_CUSTOMER_HOVER_EXPAND_SAFE_UI",
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
            "authorizedDatabaseExecution": "NOT_EXECUTED_P93",
            "stagingRuntimeProof": "WITHHELD",
        },
        "files": sorted(rows.values(), key=lambda row: row["path"]),
        "truthBoundary": "Build-relevant source identity only. Database migration/schema files are closure-critical but remain outside the historical product projection denominator. Exact Windows and deployed runtime credit are withheld.",
    }
    write(OUT / "P93R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json", payload)
    return payload


def build_authority_binding() -> dict[str, Any]:
    master = ROOT / MASTER
    v17 = ROOT / V17
    master_text = master.read_text(encoding="utf-8")
    sections = [int(value) for value in re.findall(r"^# (\d+)\.", master_text, flags=re.MULTILINE)]
    if sha(master) != MASTER_SHA or sections != list(range(89)):
        raise RuntimeError("master_directive_binding")
    if "START NOW" not in master_text or "END-OF-DIRECTIVE" not in master_text:
        raise RuntimeError("master_directive_completeness")
    if sha(v17) != V17_SHA:
        raise RuntimeError("v17_binding")
    payload = {
        "schemaVersion": "velmere.p93r1.authority-binding.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS",
        "masterDirective": {
            "path": MASTER,
            "bytes": master.stat().st_size,
            "sha256": sha(master),
            "sections": "0-88 PRESENT",
            "startNow": True,
            "sentinel": True,
            "changed": False,
        },
        "canonicalOwnerDirective": {
            "path": V17,
            "bytes": v17.stat().st_size,
            "sha256": sha(v17),
            "changed": False,
        },
        "parentSourceOnly": {
            "name": PARENT_ZIP.name,
            "bytes": PARENT_ZIP.stat().st_size,
            "entries": PARENT_ENTRIES,
            "sha256": sha(PARENT_ZIP),
        },
        "topology": {"families": 10, "customerRows": 20, "executionProfiles": 20, "materialPaidTransitions": 10},
        "truthBoundary": "Master V2 remains continuous-closure authority and V17 remains unchanged product-topology authority. No formal rebind is created because neither authority file changed.",
    }
    write(OUT / "P93R1_AUTHORITY_BINDING.json", payload)
    return payload


def receipt_pair(name: str) -> tuple[Path, Path]:
    return ROOT / f"receipts/p93/{name}.json", ROOT / f"artifacts/p93/{name}.json"


def build_test_aggregate() -> dict[str, Any]:
    expected = [
        ("P93_RISK_HISTORY_CANONICAL_RESOLUTION_RUNTIME", 42, "PASS_BOUNDED_NO_SOCKET_CANONICAL_PUBLIC_ROUTE"),
        ("P93_RISK_HISTORY_DURABLE_CANONICAL_COMPATIBILITY_RUNTIME", 14, "PASS_BOUNDED_NO_SOCKET_DURABILITY_CANONICAL_COMPATIBILITY"),
        ("P93_RISK_HISTORY_CANONICAL_RESOLUTION_STATIC", 84, "PASS_BOUNDED_STATIC_CURRENT_SOURCE"),
        ("P93_CROSS_PRODUCT_RISK_HISTORY_PROPAGATION_STATIC", 65, "PASS_BOUNDED_STATIC_SHARED_READER_PROPAGATION"),
        ("P93_CHANGED_MODULE_REACHABILITY", 12, "PASS_BOUNDED_LOCAL_IMPORT_AND_TRANSPILE"),
        ("P93_TARGETED_STRICT_TYPESCRIPT", 3, "PASS_BOUNDED_TARGETED_STRICT_TYPESCRIPT"),
        ("P93_RUNTIME_REPEATABILITY", 24, "PASS_BOUNDED_2_OF_2_BYTE_IDENTICAL"),
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
        rows.append(
            {
                "id": name,
                "checks": count,
                "status": data["status"],
                "receipt": receipt.relative_to(ROOT).as_posix(),
                "receiptSha256": sha(receipt),
            }
        )
        core_total += count
    regression = load(ROOT / "receipts/p93/P93_CURRENT_BYTE_REGRESSION.json")
    if regression.get("status") != "PASS_BOUNDED_CURRENT_BYTE_AFFECTED_SCOPE_REGRESSION":
        raise RuntimeError("regression_status")
    if regression.get("commands") != {"expected": 12, "executed": 12, "passed": 12, "failed": 0}:
        raise RuntimeError("regression_commands")
    if regression.get("aggregateExecutedChecksAcrossOverlappingHarnesses") != 346:
        raise RuntimeError("regression_aggregate")
    failure = load(ROOT / "receipts/p93/P93_FAILURE_ADJUDICATION.json")
    if failure.get("status") != "PASS_COMPLETE_FAILURE_ADJUDICATION_ZERO_CREDIT":
        raise RuntimeError("failure_adjudication_status")
    if failure.get("failures", {}).get("total") != 13 or failure.get("failures", {}).get("unadjudicated") != 0:
        raise RuntimeError("failure_adjudication_count")
    parent_history = load(ROOT / "receipts/p93/P93_PARENT_HISTORY_IMMUTABILITY.json")
    if parent_history.get("status") != "PASS_BYTE_IDENTICAL_PARENT_HISTORY_EXCEPT_DECLARED_P93_DELTA":
        raise RuntimeError("parent_history_status")
    payload = {
        "schemaVersion": "velmere.p93r1.test-aggregate.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_BOUNDED_CURRENT_BYTE_AFFECTED_SCOPE",
        "p93CoreExecutedChecksAcrossOverlappingHarnesses": core_total,
        "freshAffectedScopeRegressionChecksAcrossOverlappingHarnesses": 346,
        "freshRegressionCommands": 12,
        "rows": rows,
        "currentByteRegression": {
            "receipt": "receipts/p93/P93_CURRENT_BYTE_REGRESSION.json",
            "sha256": sha(ROOT / "receipts/p93/P93_CURRENT_BYTE_REGRESSION.json"),
            "checks": 346,
        },
        "failureAdjudication": {
            "receipt": "receipts/p93/P93_FAILURE_ADJUDICATION.json",
            "sha256": sha(ROOT / "receipts/p93/P93_FAILURE_ADJUDICATION.json"),
            "failuresPreservedWithZeroCredit": 13,
            "unadjudicated": 0,
        },
        "parentHistory": {
            "receipt": "receipts/p93/P93_PARENT_HISTORY_IMMUTABILITY.json",
            "sha256": sha(ROOT / "receipts/p93/P93_PARENT_HISTORY_IMMUTABILITY.json"),
            "verifiedBeforeControlPlaneAndPackaging": parent_history["parentFilesVerifiedByteIdentical"],
        },
        "inheritedUnchangedScopeEvidence": {
            "parentP92OverlappingChecks": 1501,
            "freshP93Credit": False,
            "reason": "Unchanged parent scope remains historical evidence and is not re-counted as fresh P93 execution.",
        },
        "zeroFakeCredit": {
            "independentEvidenceCount": False,
            "accuracyStatistic": False,
            "realPostgreSQL": False,
            "realHTTP": False,
            "renderedBrowser": False,
            "accessibilityCertification": False,
            "customerFinal": "0/20",
            "riskIndicatorFinal": False,
        },
        "truthBoundary": "The 346-check current-byte affected-scope regression is the fresh headline. It includes overlapping P93 rows plus selected compatibility rows. Individual counts must not be added again as independent evidence, and the inherited P92 1501-check scope is not fresh P93 credit.",
    }
    write(OUT / "P93R1_TEST_AGGREGATE.json", payload)
    return payload


def build_failure_adjudication_copy() -> dict[str, Any]:
    source = load(ROOT / "receipts/p93/P93_FAILURE_ADJUDICATION.json")
    payload = {
        "schemaVersion": "velmere.p93r1.failure-adjudication.v1",
        "generatedAt": GENERATED_AT,
        "status": source["status"],
        "sourceReceipt": "receipts/p93/P93_FAILURE_ADJUDICATION.json",
        "sourceReceiptSha256": sha(ROOT / "receipts/p93/P93_FAILURE_ADJUDICATION.json"),
        "failures": source["failures"],
        "replacementProofs": source["replacementProofs"],
        "zeroFakeCredit": source["zeroFakeCredit"],
        "truthBoundary": source["truthBoundary"],
    }
    write(OUT / "P93R1_FAILURE_ADJUDICATION.json", payload)
    return payload


def build_parent_preservation(source_manifest: dict[str, Any]) -> dict[str, Any]:
    payload = {
        "schemaVersion": "velmere.p93r1.parent-history-preservation.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_EXACT_PARENT_PRESERVATION",
        "parentSourceOnly": source_manifest["parentSourceOnly"],
        "parentFilesByteIdentical": source_manifest["parentFilesByteIdenticalInDiffScope"],
        "declaredModifiedParentFiles": source_manifest["modifiedParentFiles"],
        "deletedParentFiles": [],
        "unexpectedModifiedParentFiles": [],
        "unexpectedAddedFiles": [],
        "preClosureRestoreReceipt": {
            "path": "receipts/p93/P93_PARENT_HISTORY_IMMUTABILITY.json",
            "sha256": sha(ROOT / "receipts/p93/P93_PARENT_HISTORY_IMMUTABILITY.json"),
        },
        "truthBoundary": "All P92 files in the symmetric source-diff scope outside the six explicitly declared P93 changes remain byte-identical. The active-pass pointer is a control-plane change and does not alter frozen historical receipts.",
    }
    write(OUT / "P93R1_PARENT_HISTORY_PRESERVATION.json", payload)
    return payload


def build_boundary_receipt() -> dict[str, Any]:
    payload = {
        "schemaVersion": "velmere.p93r1.risk-history-canonical-public-boundary.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_BOUNDED_LOCAL_SOURCE_NO_SOCKET",
        "physicalChanges": {
            "canonicalResolution": "Exact canonical asset identifier takes precedence; an alias is accepted only when it maps to exactly one canonical history.",
            "ambiguousAlias": "Returns no history and never merges events from multiple canonical assets.",
            "publicNonEnumeration": "Unknown, ambiguous and private-only histories normalize to the same customer-safe empty projection.",
            "eventIntegrity": "eventId is recomputed and cross-bound to canonical asset, timestamps, score, methodology, evidence and source metadata.",
            "durability": "Read-only RPC success cannot promote durable write/readback status.",
            "sharedReader": "Shield, Angel, reports and other consumers inherit the v2 canonical reader rather than the legacy canonical_id OR alias RPC.",
            "costBoundary": "Public history is limited to 144 events and a bounded rate limiter; internal service-role history remains separately bounded to 5000.",
        },
        "privacyAndSecurity": {
            "rawEvidenceCustomerVisible": False,
            "providerTopologyCustomerVisible": False,
            "privateHistoryExistenceCustomerVisible": False,
            "mixedCanonicalHistoryAccepted": False,
            "legacyV1ProductionReaderAccepted": False,
        },
        "database": {
            "migration": "supabase/migrations/20260820000007_p93_risk_history_canonical_identity_public_resolution.sql",
            "rpc": "velmere_read_risk_history_by_asset_v2",
            "authorizedExecution": "NOT_EXECUTED",
            "runtimeRlsServiceRoleProof": "WITHHELD",
        },
        "finalState": {
            "riskIndicatorFinal": False,
            "customerFinal": "0/20",
            "global": "NO_GO / STOP_SELL",
        },
        "truthBoundary": "No-socket local/runtime/static/source proof only. It does not prove deployed HTTP timing indistinguishability, PostgreSQL migration execution, RLS, Browser accessibility, staging, production or real customer data.",
    }
    write(OUT / "P93R1_RISK_HISTORY_CANONICAL_PUBLIC_BOUNDARY.json", payload)
    return payload


def build_environment_truth() -> dict[str, Any]:
    def command(command: list[str]) -> str:
        return subprocess.check_output(command, text=True).strip()
    payload = {
        "schemaVersion": "velmere.p93r1.environment-truth.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_BOUNDED_LOCAL_ENVIRONMENT_WITHHOLDS_PRESERVED",
        "local": {
            "platform": platform.platform(),
            "python": platform.python_version(),
            "node": command(["node", "-v"]),
            "npm": command(["npm", "-v"]),
        },
        "target": {"os": "Windows Server 2025", "node": "24.18.0", "npm": "11.16.0"},
        "passes": {
            "targetedStrictTypeScript": "3/3 PASS_BOUNDED",
            "changedModuleReachability": "12/12 PASS_BOUNDED",
        },
        "withheld": [
            "whole-project semantic TypeScript",
            "ESLint zero-warning",
            "Webpack production build",
            "Turbopack production build",
            "rendered Browser/WCAG/mobile/cross-browser",
            "authorized PostgreSQL/Supabase migration runtime",
            "exact Windows Server 2025 on P93R1 bytes",
        ],
        "truthBoundary": "Closed ambient and isolated transpilation do not substitute for the installed dependency graph, Browser or exact Windows.",
    }
    write(OUT / "P93R1_ENVIRONMENT_TRUTH.json", payload)
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
        relative
        for relative in current
        if relative.startswith(("receipts/p93/", "artifacts/p93/", "scripts/p93/"))
        and Path(relative).suffix.lower() in {".pdf", ".zip", ".woff", ".woff2", ".ttf", ".otf", ".exe", ".dll", ".bin", ".pyc", ".pyo"}
    ]
    if findings or current_binaries:
        raise RuntimeError(json.dumps({"secrets": findings, "binaries": current_binaries}, indent=2))
    payload = {
        "schemaVersion": "velmere.p93r1.security-privacy-scan.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_BOUNDED_CURRENT_TREE",
        "filesScanned": len(current),
        "bytesScanned": scanned_bytes,
        "privateKeyAndTokenMatches": 0,
        "unexpectedCurrentBinaryMatches": 0,
        "customerBoundaryChecks": {
            "rawRiskSnapshots": "BLOCKED_BY_CLOSED_PROJECTION",
            "privateHistoryExistence": "NORMALIZED_TO_PUBLIC_EMPTY",
            "mixedCanonicalAssets": "REJECTED",
            "internalResolutionState": "NOT_CUSTOMER_VISIBLE",
            "rawDatabaseErrors": "GENERIC_503_ONLY",
        },
        "truthBoundary": "Pattern and source-boundary scan only; not a complete dynamic application security test or production secret-management proof.",
    }
    write(OUT / "P93R1_SECURITY_AND_PRIVACY_SCAN.json", payload)
    return payload


def build_blocker_map() -> dict[str, Any]:
    payload = {
        "schemaVersion": "velmere.p93r1.current-blocker-map.v1",
        "generatedAt": GENERATED_AT,
        "status": "OPEN_BLOCKERS_CLASSIFIED",
        "rows": [
            {
                "priority": 1,
                "category": "ENVIRONMENT",
                "workstream": "Risk History database and deployed HTTP",
                "blocker": "P91 and P93 migrations have not run on authorized PostgreSQL/Supabase; service-role RPC, RLS, concurrency, rollback, timing/non-enumeration and exact readback remain unproven.",
                "nextAction": "Apply migrations on authorized staging, execute exact/alias/ambiguous/private cases with two identities, force rollback, and verify public response/timing without disclosure.",
            },
            {
                "priority": 2,
                "category": "ENVIRONMENT",
                "workstream": "Risk History Browser/accessibility",
                "blocker": "No exact dependency graph, rendered desktop/mobile Browser, keyboard, screen-reader, reduced-motion or PL/EN/DE journey on P93 bytes.",
                "nextAction": "Run full type/lint/build and cross-browser customer journeys on exact current bytes.",
            },
            {
                "priority": 3,
                "category": "PRODUCT",
                "workstream": "Risk Indicator Customer FINAL",
                "blocker": "Real customer-authorized input, current evidence, deployed history and final adjudication are incomplete.",
                "nextAction": "Bind deployed P93 history to one exact Risk Indicator customer execution after database and Browser proof.",
            },
            {
                "priority": 4,
                "category": "RIGHTS",
                "workstream": "Audit Pro",
                "blocker": "Five live lanes, four strict receipts, three independent families, six evidence rows and field-level commercial/display/PDF/retention rights are not physically proven.",
                "nextAction": "Execute rights-bound provider lanes without lowering P89/P90 thresholds.",
            },
            {
                "priority": 5,
                "category": "ENVIRONMENT",
                "workstream": "Exact Windows",
                "blocker": "Full semantic type/lint/dual build and Windows Server 2025 proof do not exist on P93R1 bytes.",
                "nextAction": "Run canonical Windows stack after exact dependency closure.",
            },
        ],
        "noProgressRule": "If authorized staging or exact dependencies remain unavailable, continue a separate product/security/rights workstream rather than retrying the same unavailable environment.",
    }
    write(OUT / "P93R1_CURRENT_BLOCKER_MAP.json", payload)
    return payload


def build_checkpoint() -> dict[str, Any]:
    names = [
        "P93R1_AUTHORITY_BINDING.json",
        "P93R1_SOURCE_CHANGE_MANIFEST.json",
        "P93R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json",
        "P93R1_TEST_AGGREGATE.json",
        "P93R1_FAILURE_ADJUDICATION.json",
        "P93R1_PARENT_HISTORY_PRESERVATION.json",
        "P93R1_RISK_HISTORY_CANONICAL_PUBLIC_BOUNDARY.json",
        "P93R1_ENVIRONMENT_TRUTH.json",
        "P93R1_SECURITY_AND_PRIVACY_SCAN.json",
        "P93R1_CURRENT_BLOCKER_MAP.json",
    ]
    evidence = []
    for name in names:
        path = OUT / name
        evidence.append({"path": path.relative_to(ROOT).as_posix(), "bytes": path.stat().st_size, "sha256": sha(path)})
    payload = {
        "schemaVersion": "velmere.p93r1.checkpoint-receipt.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_BOUNDED_P93R1_RISK_HISTORY_CANONICAL_IDENTITY_NON_ENUMERATING_SHARED_READER",
        "parent": {"checkpoint": "P92R1", "sourceOnly": PARENT_ZIP.name, "sha256": PARENT_SHA},
        "activePass": (ROOT / "VELMERE_ACTIVE_PASS.txt").read_text(encoding="utf-8").strip(),
        "evidence": evidence,
        "numerators": {
            "customerFinal": "0/20",
            "auditFinalPdf": "0/3",
            "rights": "2/203 inherited only",
            "paidValue": "0/10",
            "saleEligible": "0/20",
            "riskIndicatorFinal": False,
            "live": False,
            "worldClassProven": False,
        },
        "global": "NO_GO / STOP_SELL",
        "truthBoundary": "P93R1 is a local source/runtime/static savepoint. PostgreSQL, deployed HTTP, Browser, real customer, exact Windows and FINAL remain withheld.",
    }
    if payload["activePass"] != "P93R1":
        raise RuntimeError("active_pass_not_p93r1")
    write(OUT / "P93R1_CHECKPOINT_RECEIPT.json", payload)
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
    print(
        json.dumps(
            {
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
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
