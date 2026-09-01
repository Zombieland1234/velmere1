#!/usr/bin/env python3
"""Build deterministic P84R1 closure receipts without granting FINAL credit."""
from __future__ import annotations

import argparse
import hashlib
import json
import platform
import re
import shutil
import subprocess
from collections import Counter
from pathlib import Path
from typing import Any

GENERATED_AT = "2026-08-20T00:45:00Z"
DIRECTIVE_FILE = "VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt"
DIRECTIVE_SHA256 = "de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05"
PARENT_LEDGER_SHA256 = "67e2682934438381be9772fb2e155a686867e3c31c2ea3c3b3f411d4b5acf543"
PARENT_LEDGER_BYTES = 10337
PARENT_ZIP_SHA256 = "310e0b111450065d01fca9b10045312dfc26325d7b01bc24ef1311e2cea56c1a"
PARENT_ZIP_BYTES = 214420441
PARENT_ZIP_ENTRIES = 8195
OUTPUT_NAME = "VELMERE_R44P46_V17_P84R1_AUDIT_CUSTOMER_ARTIFACT_OWNER_READ_RLS_LINK_ATOMIC_PUBLICATION_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-20.zip"
IDENTITY_REL = "artifacts/closure/p84r1/P84R1_TREE_IDENTITY_EXCLUDING_SELF.json"
PRODUCT_CHANGES = [
    "lib/account/audit-account-messages.ts",
    "lib/reporting/audit-exact-artifact-owner-readable-publisher.ts",
    "lib/security/audit-watch-post-handler.ts",
    "lib/server/lazy-route-modules/account--customer-artifact.ts",
]
DATABASE_CHANGES = [
    "lib/db/schema.sql",
    "supabase/migrations/20260820000002_p84_audit_customer_artifact_owner_read_path.sql",
]
PRIVATE_KEY_BLOCK_RE = re.compile(
    rb"-----BEGIN (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----\r?\n"
    rb"(?:[A-Za-z0-9+/=]{16,}\r?\n){2,}"
    rb"-----END (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----"
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


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(4 * 1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def file_row(root: Path, rel: str) -> dict[str, Any]:
    path = root / rel
    return {"path": rel, "byteLength": path.stat().st_size, "sha256": sha256_file(path)}


def canonical_projection(rows: list[dict[str, Any]]) -> dict[str, Any]:
    rows = sorted(rows, key=lambda row: row["path"])
    path_hash = hashlib.sha256("\n".join(row["path"] for row in rows).encode()).hexdigest()
    aggregate = hashlib.sha256()
    for row in rows:
        aggregate.update(f"{row['path']}\0{row['byteLength']}\0{row['sha256']}\n".encode())
    return {
        "fileCount": len(rows),
        "payloadBytes": sum(int(row["byteLength"]) for row in rows),
        "pathSetSha256": path_hash,
        "sourceContentAggregateSha256": aggregate.hexdigest(),
    }


def all_rows(root: Path, *, exclude_identity: bool = False) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for path in sorted((p for p in root.rglob("*") if p.is_file()), key=lambda p: p.relative_to(root).as_posix()):
        rel = path.relative_to(root).as_posix()
        if exclude_identity and rel == IDENTITY_REL:
            continue
        if path.is_symlink():
            raise RuntimeError(f"symlink_not_allowed:{rel}")
        if rel.endswith(".pyc") or "/__pycache__/" in f"/{rel}/":
            raise RuntimeError(f"python_cache_not_allowed:{rel}")
        rows.append(file_row(root, rel))
    return rows


def classify_change(rel: str) -> str:
    if rel == "VELMERE_ACTIVE_PASS.txt":
        return "CONTROL_PLANE_POINTER"
    if rel in PRODUCT_CHANGES:
        return "CURRENT_PRODUCT_BUILD_RELEVANT"
    if rel == "lib/db/schema.sql":
        return "DATABASE_CANONICAL_SCHEMA_MIRROR"
    if rel == DATABASE_CHANGES[1]:
        return "DATABASE_ORDERED_MIGRATION"
    if rel.startswith("receipts/p84/"):
        return "P84_CURRENT_RECEIPT"
    if rel.startswith("artifacts/p84/"):
        return "P84_LOCAL_PROOF_OR_LOG"
    if rel.startswith("scripts/p84/"):
        return "P84_HARNESS_OR_CLOSURE_SOURCE"
    return "CURRENT_SOURCE_SUPPORT"


def source_change_manifest(root: Path, parent: Path, out: Path) -> dict[str, Any]:
    def rows_map(base: Path) -> dict[str, dict[str, Any]]:
        result: dict[str, dict[str, Any]] = {}
        for path in base.rglob("*"):
            if not path.is_file():
                continue
            rel = path.relative_to(base).as_posix()
            if rel.startswith("artifacts/closure/p84r1/"):
                continue
            result[rel] = file_row(base, rel)
        return result

    before = rows_map(parent)
    after = rows_map(root)
    changes: list[dict[str, Any]] = []
    for rel in sorted(set(before) | set(after)):
        old = before.get(rel)
        new = after.get(rel)
        if old == new:
            continue
        change = "ADDED" if old is None else "DELETED" if new is None else "MODIFIED"
        changes.append({
            "path": rel,
            "change": change,
            "classification": classify_change(rel),
            "beforeBytes": old and old["byteLength"],
            "beforeSha256": old and old["sha256"],
            "afterBytes": new and new["byteLength"],
            "afterSha256": new and new["sha256"],
        })
    counts = Counter(row["classification"] for row in changes)
    payload = {
        "schemaVersion": "velmere.p84r1.source-change-manifest.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_EXACT_PARENT_DELTA",
        "parentCheckpoint": "P83R1",
        "scopeExcludes": ["artifacts/closure/p84r1/* (self-generated closure receipts)"],
        "changeCount": len(changes),
        "classificationCounts": dict(sorted(counts.items())),
        "changes": changes,
        "buildRelevantChangedFiles": PRODUCT_CHANGES,
        "databaseClosureCriticalChangedFiles": DATABASE_CHANGES,
        "directiveChanged": False,
        "truthBoundary": "Exact filesystem delta from P83R1 outside self-generated P84 closure. A changed file is not automatically customer value, staging runtime or FINAL evidence.",
    }
    write_json(out / "P84R1_SOURCE_CHANGE_MANIFEST.json", payload)
    return payload


def product_projection(root: Path, out: Path) -> dict[str, Any]:
    parent_manifest = read_json(root / "artifacts/closure/p83r1/P83R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json")
    parent_rows = [dict(row) for row in parent_manifest["files"]]
    parent_declared = parent_manifest["currentCandidateProjection"]
    if canonical_projection(parent_rows) != parent_declared:
        raise RuntimeError("p83_product_projection_parent_identity_mismatch")
    row_map = {row["path"]: row for row in parent_rows}
    changed: list[dict[str, Any]] = []
    for rel in PRODUCT_CHANGES:
        before = row_map.get(rel)
        after = file_row(root, rel)
        row_map[rel] = after
        changed.append({
            "path": rel,
            "change": "ADDED" if before is None else "MODIFIED",
            "beforeBytes": before and before["byteLength"],
            "beforeSha256": before and before["sha256"],
            "afterBytes": after["byteLength"],
            "afterSha256": after["sha256"],
        })
    current_rows = sorted(row_map.values(), key=lambda row: row["path"])
    current = canonical_projection(current_rows)
    payload = {
        "schemaVersion": "velmere.p84r1.current-product-projection-manifest.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY",
        "parentCheckpoint": "P83R1",
        "parentProjectionReconstructedExactly": True,
        "parentProjection": parent_declared,
        "currentCandidateProjection": current,
        "delta": {
            "fileCount": current["fileCount"] - parent_declared["fileCount"],
            "payloadBytes": current["payloadBytes"] - parent_declared["payloadBytes"],
            "changedBuildRelevantFiles": len(changed),
        },
        "changedBuildRelevantFiles": changed,
        "databaseDeploymentBoundary": {
            "orderedMigration": DATABASE_CHANGES[1],
            "canonicalSchemaMirror": DATABASE_CHANGES[0],
            "includedInProductBuildProjection": False,
            "authorizedPostgresExecution": "WITHHELD",
            "ownerJwtRlsIsolation": "WITHHELD",
        },
        "files": current_rows,
        "exactWindowsCredit": False,
        "truthBoundary": "P84R1 updates the exact P83 product projection with four build-relevant owner-read/customer-delivery modules. Database migration/schema remain closure-critical but outside the historical product-build projection. This is local source identity, not staging PostgreSQL, deployed HTTP or exact-Windows proof.",
    }
    write_json(out / "P84R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json", payload)
    return payload


def historical_immutability(root: Path, parent: Path, out: Path) -> dict[str, Any]:
    scopes = [parent / "receipts", parent / "artifacts/closure"]
    extras = [
        parent / "artifacts/p80/P80_AUDIT_LOCAL_FIXTURE_NOT_CUSTOMER_FINAL.pdf",
        parent / "artifacts/p82/P82_LOCAL_READONLY_QUORUM_HARDENING_FIXTURE_RECEIPT.json",
    ]
    rows: list[dict[str, Any]] = []
    for scope in scopes:
        if scope.is_dir():
            rows.extend(file_row(parent, p.relative_to(parent).as_posix()) for p in scope.rglob("*") if p.is_file())
    rows.extend(file_row(parent, p.relative_to(parent).as_posix()) for p in extras if p.is_file())
    unique = {row["path"]: row for row in rows}
    mismatches: list[dict[str, Any]] = []
    for rel, before in sorted(unique.items()):
        current = root / rel
        if not current.is_file():
            mismatches.append({"path": rel, "reason": "missing"})
        elif current.stat().st_size != before["byteLength"] or sha256_file(current) != before["sha256"]:
            mismatches.append({
                "path": rel,
                "reason": "changed",
                "expectedSha256": before["sha256"],
                "actualSha256": sha256_file(current),
            })
    payload = {
        "schemaVersion": "velmere.p84r1.historical-receipt-immutability.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS" if not mismatches else "FAIL",
        "verifiedHistoricalFiles": len(unique),
        "mismatchCount": len(mismatches),
        "mismatches": mismatches,
        "scope": ["all P83-parent receipts", "all P83-parent closure artifacts", "P80 exact fixture PDF", "P82 local quorum fixture receipt"],
        "truthBoundary": "Current P84 reruns may execute frozen code paths, but parent receipts/artifacts remain byte-for-byte unchanged. New results live only under P84 paths.",
    }
    if mismatches:
        raise RuntimeError(f"historical_receipt_mutation:{mismatches[:10]}")
    write_json(out / "P84R1_HISTORICAL_RECEIPT_IMMUTABILITY.json", payload)
    return payload


def assert_log(path: Path, markers: list[str]) -> None:
    text = path.read_text(encoding="utf-8", errors="replace")
    missing = [marker for marker in markers if marker not in text]
    if missing:
        raise RuntimeError(f"log_marker_missing:{path}:{missing}")


def test_aggregate(root: Path, out: Path) -> dict[str, Any]:
    summary_path = root / "receipts/p84/P84_CURRENT_SOURCE_REGRESSION_SUMMARY.json"
    summary = read_json(summary_path)
    aggregate = summary.get("aggregate", {})
    if summary.get("status") != "PASS" or aggregate != {"passed": 1116, "total": 1116, "failedLanes": 0}:
        raise RuntimeError(f"p84_regression_summary_not_green:{aggregate}")
    controls: list[dict[str, Any]] = []
    for lane in summary["lanes"]:
        if lane.get("status") != "PASS" or lane.get("passed") != lane.get("total"):
            raise RuntimeError(f"p84_lane_not_green:{lane}")
        rel = lane["evidence"]
        path = root / rel
        if not path.is_file():
            raise RuntimeError(f"p84_lane_evidence_missing:{rel}")
        controls.append({
            "label": lane["name"],
            "path": rel,
            "sha256": sha256_file(path),
            "checks": lane["total"],
            "passed": True,
            "status": "PASS",
        })
    compatibility = read_json(root / "receipts/p84/P84_P80_IMMUTABLE_ARTIFACT_COMPATIBILITY.json")
    legacy = compatibility["legacyHarness"]
    if compatibility.get("status") != "PASS" or compatibility["checks"]["passed"] != 8:
        raise RuntimeError("p84_p80_compatibility_not_green")
    if legacy != {
        "status": "FAIL",
        "passed": 100,
        "total": 103,
        "supersededAssertions": [
            "p80_audit_message_link_lookup_owner_and_snapshot_scoped",
            "p80_watch_orders_store_bind_message",
            "p80_watch_stores_pdf_bytes_not_metadata_only",
        ],
    }:
        raise RuntimeError(f"p80_legacy_boundary_changed:{legacy}")
    payload = {
        "schemaVersion": "velmere.p84r1.current-source-test-aggregate.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS",
        "controls": controls,
        "aggregateExecutedChecksAcrossOverlappingHarnesses": 1116,
        "aggregateIndependenceClaim": False,
        "legacyP80StaticBoundary": {
            "status": "100/103 LEGACY_EXPECTATIONS; NOT RELABELED PASS",
            "supersededAssertions": legacy["supersededAssertions"],
            "p84ReplacementProof": "8/8 PASS",
        },
        "historicalReceiptsRewritten": False,
        "truthBoundary": "1116 is the sum of overlapping local/static/runtime/PDF controls. The old P80 static harness honestly remains 100/103 because three weaker multi-write/full-message-ledger expectations were superseded; P84 proves stricter replacements separately. None of these numbers is an independent-evidence, accuracy, provider, customer or FINAL numerator.",
    }
    write_json(out / "P84R1_TEST_AGGREGATE.json", payload)
    return payload


def exact_pdf_receipt(root: Path, out: Path) -> dict[str, Any]:
    unit = root / "artifacts/p84/logs/EXACT_PDF_UNIT.log"
    integration = root / "artifacts/p84/logs/EXACT_PDF_INTEGRATION.log"
    assert_log(unit, ["PASS (22/22)", "# fail 0"])
    assert_log(integration, ["PASS_P36_EXACT_CUSTOMER_PDF_STORAGE_TO_DELIVERY_INTEGRATION", '"assertions": 55', "# fail 0"])
    payload = {
        "schemaVersion": "velmere.p84r1.exact-pdf-test-rerun.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS",
        "unit": {"assertions": 22, "status": "PASS", "logPath": unit.relative_to(root).as_posix(), "logSha256": sha256_file(unit)},
        "integration": {"assertions": 55, "status": "PASS", "logPath": integration.relative_to(root).as_posix(), "logSha256": sha256_file(integration), "authorizedPostgresExecuted": False, "deployedHttpExecuted": False},
        "zeroFakeCredit": {"customerFinal": "0/20", "auditFinalPdf": "0/3", "previewDownloadAccountDeployedParity": "WITHHELD", "exactWindows": "WITHHELD"},
    }
    write_json(out / "P84R1_EXACT_PDF_TEST_RERUN.json", payload)
    return payload


def typescript_receipt(root: Path, out: Path) -> dict[str, Any]:
    ts_log = root / "artifacts/p84/logs/P84_TARGETED_TYPESCRIPT.log"
    imports_log = root / "artifacts/p84/logs/P84_CHANGED_MODULE_IMPORTS.log"
    if ts_log.read_bytes() != b"":
        raise RuntimeError("p84_targeted_typescript_log_not_clean")
    assert_log(imports_log, ["P84 changed production module imports: PASS (4/4)"] + [f"PASS ./{rel}" for rel in PRODUCT_CHANGES])
    shutil.copyfile(ts_log, out / "P84R1_TARGETED_TYPESCRIPT.log")
    shutil.copyfile(imports_log, out / "P84R1_CHANGED_MODULE_IMPORTS.log")
    payload = {
        "schemaVersion": "velmere.p84r1.local-typescript-diagnostic.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_TARGETED_AND_CHANGED_MODULE_IMPORTS_WITHHELD_FULL_PROJECT",
        "targetedStrictTypeScript": {
            "status": "PASS",
            "command": "tsc --noEmit --target ES2022 --lib ES2022,DOM --module ESNext --moduleResolution Bundler --skipLibCheck --strict --noResolve scripts/p84/p84-targeted-types.d.ts lib/reporting/audit-exact-artifact-owner-readable-publisher.ts",
            "logSha256": sha256_file(ts_log),
        },
        "currentRuntimeModuleImports": {"status": "PASS", "moduleCount": 4, "modules": PRODUCT_CHANGES, "logSha256": sha256_file(imports_log)},
        "environment": {
            "node": subprocess.check_output(["node", "--version"], text=True).strip(),
            "npm": subprocess.check_output(["npm", "--version"], text=True).strip(),
            "tsc": subprocess.check_output(["tsc", "--version"], text=True).strip().replace("Version ", ""),
            "platform": f"{platform.system().lower()} {platform.machine()}",
        },
        "fullProjectSemanticTypeScript": "WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING",
        "eslint": "WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING",
        "dualProductionBuild": "WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING",
        "exactWindows": "WITHHELD_ON_CURRENT_P84R1_BYTES",
    }
    write_json(out / "P84R1_LOCAL_TYPESCRIPT_DIAGNOSTIC.json", payload)
    return payload


def targeted_secret_scan(root: Path, source_manifest: dict[str, Any], out: Path) -> dict[str, Any]:
    findings: list[dict[str, Any]] = []
    scanned: list[str] = []
    for change in source_manifest["changes"]:
        rel = change["path"]
        path = root / rel
        if change["change"] == "DELETED" or not path.is_file():
            continue
        scanned.append(rel)
        data = path.read_bytes()
        if PRIVATE_KEY_BLOCK_RE.search(data):
            findings.append({"path": rel, "pattern": "private_key_block"})
        for name, pattern in TOKEN_PATTERNS.items():
            if pattern.search(data):
                findings.append({"path": rel, "pattern": name})
    payload = {
        "schemaVersion": "velmere.p84r1.targeted-secret-scan.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS" if not findings else "FAIL",
        "scannedChangedFiles": len(scanned),
        "matches": len(findings),
        "findings": findings,
        "fullPackageRescanRequiredAtBuild": True,
    }
    if findings:
        raise RuntimeError(f"p84_targeted_secret_findings:{findings[:10]}")
    write_json(out / "P84R1_TARGETED_SECRET_SCAN.json", payload)
    return payload


def checkpoint_receipt(root: Path, out: Path, projection: dict[str, Any], source_changes: dict[str, Any], tests: dict[str, Any], secrets: dict[str, Any], history: dict[str, Any]) -> dict[str, Any]:
    runtime = read_json(root / "receipts/p84/P84_AUDIT_CUSTOMER_ARTIFACT_OWNER_READ_RUNTIME.json")
    repeat = read_json(root / "receipts/p84/P84_AUDIT_CUSTOMER_ARTIFACT_OWNER_READ_REPEATABILITY.json")
    static = read_json(root / "receipts/p84/P84_AUDIT_CUSTOMER_ARTIFACT_OWNER_READ_STATIC.json")
    compatibility = read_json(root / "receipts/p84/P84_P80_IMMUTABLE_ARTIFACT_COMPATIBILITY.json")
    payload = {
        "schemaVersion": "velmere.p84r1.checkpoint-receipt.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_BOUNDED_P84R1_AUDIT_CUSTOMER_ARTIFACT_OWNER_READ_RLS_LINK_ATOMIC_PUBLICATION",
        "canonicalBinding": {
            "directiveFile": DIRECTIVE_FILE,
            "directiveSha256": DIRECTIVE_SHA256,
            "directiveChanged": False,
            "directiveChangeReason": "No authority churn: V17 already requires object-level account authorization, immutable stored bytes, fail-closed delivery and preview/download identity. P84 repairs implementation against that authority.",
            "parentCheckpoint": "P83R1",
            "parentLedgerSha256": PARENT_LEDGER_SHA256,
            "parentLedgerBytes": PARENT_LEDGER_BYTES,
            "parentSourceOnlySha256": PARENT_ZIP_SHA256,
            "parentSourceOnlyBytes": PARENT_ZIP_BYTES,
            "parentSourceOnlyEntries": PARENT_ZIP_ENTRIES,
        },
        "productProjection": projection["currentCandidateProjection"],
        "discoveredDefects": static["discoveredDefects"],
        "physicalChanges": {
            "deltaFilesOutsideSelfGeneratedClosure": source_changes["changeCount"],
            "buildRelevantChangedFiles": len(PRODUCT_CHANGES),
            "orderedOwnerReadMigrationAdded": True,
            "canonicalSchemaMirrorUpdated": True,
            "authenticatedSnapshotAndPdfSelectRestoredUnderStrictOwnerRls": True,
            "fullAuditMessageLedgerRemainsServiceRoleOnly": True,
            "minimalImmutableOwnerReadableLinkLedgerAdded": True,
            "singleServiceRoleRpc": "velmere_publish_audit_exact_artifact_v2",
            "p83PublicationWrappedInSameTransaction": True,
            "ownerRouteNoLongerQueriesFullMessageLedger": True,
            "boundedListFetchBeforeVisibilityFilter": True,
            "p83PublisherByteFrozen": True,
            "historicalReceiptsByteIdentical": history["status"] == "PASS",
            "runtimeReceiptRepeatability": repeat["status"],
        },
        "localDeterministicFixture": {
            "classification": runtime["classification"],
            "status": runtime["status"],
            "runtimeChecks": runtime["checks"]["total"],
            "repeatabilityChecks": repeat["checks"]["total"],
            "staticChecks": static["checks"]["total"],
            "rpcCallsPerPublication": runtime["implementation"]["rpcCallsPerPublication"],
            "directTableCalls": runtime["implementation"]["directTableCalls"],
            "snapshotId": runtime["artifact"]["snapshotId"],
            "pdfDigest": runtime["artifact"]["pdfDigest"],
            "pdfByteLength": runtime["artifact"]["pdfByteLength"],
            "linkSchema": runtime["artifact"]["linkSchema"],
            "customerFinalEligible": False,
            "auditFinalPdfEligible": False,
        },
        "controls": tests["controls"],
        "aggregateExecutedChecksAcrossOverlappingHarnesses": tests["aggregateExecutedChecksAcrossOverlappingHarnesses"],
        "aggregateIndependenceClaim": False,
        "legacyP80StaticBoundary": tests["legacyP80StaticBoundary"],
        "environment": {
            "localNode": subprocess.check_output(["node", "--version"], text=True).strip(),
            "localNpm": subprocess.check_output(["npm", "--version"], text=True).strip(),
            "localTsc": subprocess.check_output(["tsc", "--version"], text=True).strip().replace("Version ", ""),
            "platform": f"{platform.system().lower()} {platform.machine()}",
            "authorizedPostgresMigrationExecuted": False,
            "RLSAndJwtTwoAccountIsolationExecuted": False,
            "triggerAndRollbackRuntimeExecuted": False,
            "deployedHttpExecuted": False,
            "currentExternalRpcQuorumExecuted": False,
            "semanticTypeScriptCurrentBytes": "WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING",
            "eslintCurrentBytes": "WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING",
            "dualProductionBuildCurrentBytes": "WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING",
            "exactWindowsCurrentBytes": "WITHHELD",
        },
        "targetedSecretScan": {"status": secrets["status"], "matches": secrets["matches"]},
        "securityBoundary": {
            "externalTransactionSent": False,
            "stateChangePerformedOnExternalChain": False,
            "liveExploitPerformed": False,
            "weaponizedPocCreated": False,
            "authorizationBypassAttempted": False,
            "rawSolidityAbiRuntimeTraceStateRedistributed": False,
            "fullInternalMessageExposedToCustomer": False,
        },
        "zeroFakeCredit": {
            "customerFinal": "0/20",
            "auditFinalPdf": "0/3",
            "rights": "2/203 inherited only",
            "paidValue": "0/10",
            "saleEligible": "0/20",
            "live": False,
            "global": "NO_GO / STOP_SELL",
        },
        "nextBlocker": "Apply P83 and P84 ordered migrations on an authorized staging PostgreSQL/Supabase project; prove service-role-only v2 RPC, authenticated owner SELECT under RLS, anon/cross-owner denial, immutable-trigger behavior and full rollback. Then execute real owner-JWT preview/download/account byte identity. Current BSC quorum, authorized offline replay, rights/currentness and exact Windows remain separate gates.",
        "truthBoundary": "P84R1 repairs the source-level owner-read path and proves it with static and mocked-client runtime tests. It does not execute PostgreSQL/Supabase, JWT/RLS isolation, deployed HTTP, current chain facts, exploitability, rights expansion, Customer FINAL or Audit FINAL PDF.",
    }
    if compatibility["legacyHarness"]["status"] != "FAIL":
        raise RuntimeError("legacy_p80_boundary_not_preserved")
    write_json(out / "P84R1_CHECKPOINT_RECEIPT.json", payload)
    return payload


def package_recipe(root: Path, out: Path) -> dict[str, Any]:
    current_count = len([p for p in root.rglob("*") if p.is_file()])
    expected = current_count + 2
    payload = {
        "schemaVersion": "velmere.p84r1.deterministic-package-recipe.v1",
        "generatedAt": GENERATED_AT,
        "status": "READY_FOR_DETERMINISTIC_BUILD",
        "outputName": OUTPUT_NAME,
        "entryOrdering": "lexicographic_posix_relative_path",
        "directoryEntries": False,
        "timestamp": "1980-01-01T00:00:00Z",
        "createSystem": 0,
        "externalMode": "0600",
        "compression": "ZIP_DEFLATED",
        "compressionLevel": 1,
        "expectedEntryCountIncludingIdentityReceipt": expected,
        "ledgerInsideZip": False,
        "identityReceipt": IDENTITY_REL,
        "identityReceiptExcludesOnlySelf": True,
    }
    write_json(out / "P84R1_PACKAGE_BUILD_RECIPE.json", payload)
    return payload


def tree_identity(root: Path, out: Path, recipe: dict[str, Any]) -> dict[str, Any]:
    rows = all_rows(root, exclude_identity=True)
    projection = canonical_projection(rows)
    payload = {
        "schemaVersion": "velmere.p84r1.tree-identity-excluding-self.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS",
        **projection,
        "fullPackageFileCountIncludingThisIdentityFile": len(rows) + 1,
        "excludedPath": IDENTITY_REL,
        "excludedOnlySelf": True,
    }
    if payload["fullPackageFileCountIncludingThisIdentityFile"] != recipe["expectedEntryCountIncludingIdentityReceipt"]:
        raise RuntimeError("p84_package_recipe_entry_count_mismatch")
    write_json(out / "P84R1_TREE_IDENTITY_EXCLUDING_SELF.json", payload)
    final_count = len([p for p in root.rglob("*") if p.is_file()])
    if final_count != payload["fullPackageFileCountIncludingThisIdentityFile"]:
        raise RuntimeError("p84_tree_identity_final_count_mismatch")
    return payload


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--parent", required=True)
    args = parser.parse_args()
    root = Path(args.root).resolve()
    parent = Path(args.parent).resolve()
    out = root / "artifacts/closure/p84r1"
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    if sha256_file(root / DIRECTIVE_FILE) != DIRECTIVE_SHA256:
        raise RuntimeError("directive_hash_mismatch")
    (root / "VELMERE_ACTIVE_PASS.txt").write_text(
        "VELMERE_P84R1_AUDIT_CUSTOMER_ARTIFACT_OWNER_READ_RLS_LINK_ATOMIC_PUBLICATION_NO_CUSTOMER_FINAL_OR_PDF_FINAL_CREDIT\n",
        encoding="utf-8",
    )

    source = source_change_manifest(root, parent, out)
    projection = product_projection(root, out)
    history = historical_immutability(root, parent, out)
    tests = test_aggregate(root, out)
    exact_pdf_receipt(root, out)
    typescript_receipt(root, out)
    secrets = targeted_secret_scan(root, source, out)
    checkpoint_receipt(root, out, projection, source, tests, secrets, history)
    recipe = package_recipe(root, out)
    identity = tree_identity(root, out, recipe)
    print(json.dumps({
        "status": "PASS",
        "closureDirectory": out.relative_to(root).as_posix(),
        "productProjection": projection["currentCandidateProjection"],
        "testAggregate": tests["aggregateExecutedChecksAcrossOverlappingHarnesses"],
        "treeIdentity": identity,
    }, indent=2))


if __name__ == "__main__":
    main()
