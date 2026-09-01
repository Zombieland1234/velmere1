#!/usr/bin/env python3
"""Build deterministic P83R1 closure receipts without granting FINAL credit."""
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

GENERATED_AT = "2026-08-20T19:30:00Z"
DIRECTIVE_FILE = "VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt"
DIRECTIVE_SHA256 = "de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05"
PARENT_LEDGER_SHA256 = "4ee1f422fa9ff0613033013876f6fabc22746a1178452de1657326e94426e860"
PARENT_LEDGER_BYTES = 30824
PARENT_ZIP_SHA256 = "a536ce7feacc1e6671729e604fb60500348b36c2275a3a0df0e39c471e779ffb"
PARENT_ZIP_BYTES = 214236749
PARENT_ZIP_ENTRIES = 8146
OUTPUT_NAME = "VELMERE_R44P46_V17_P83R1_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_MIGRATION_REACHABILITY_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-20.zip"
IDENTITY_REL = "artifacts/closure/p83r1/P83R1_TREE_IDENTITY_EXCLUDING_SELF.json"
PRODUCT_CHANGES = [
    "lib/account/audit-account-messages.ts",
    "lib/reporting/account-customer-artifact-store.ts",
    "lib/reporting/audit-exact-artifact-atomic-publisher.ts",
    "lib/security/audit-watch-post-handler.ts",
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


def all_rows(root: Path, exclude_identity: bool = False) -> list[dict[str, Any]]:
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
    if rel == "supabase/migrations/20260820000001_p83_audit_exact_artifact_atomic_publication.sql":
        return "DATABASE_ORDERED_MIGRATION"
    if rel.startswith("receipts/p83/"):
        return "P83_CURRENT_RECEIPT"
    if rel.startswith("artifacts/p83/"):
        return "P83_LOCAL_PROOF_OR_LOG"
    if rel.startswith("scripts/p83/") or rel == "scripts/p80/test-p80-audit-exact-immutable-artifact-static.py":
        return "P83_HARNESS_OR_CLOSURE_SOURCE"
    return "CURRENT_SOURCE_SUPPORT"


def source_change_manifest(root: Path, parent: Path, out: Path) -> dict[str, Any]:
    def rows_map(base: Path) -> dict[str, dict[str, Any]]:
        result = {}
        for path in base.rglob("*"):
            if not path.is_file():
                continue
            rel = path.relative_to(base).as_posix()
            if rel.startswith("artifacts/closure/p83r1/"):
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
        "schemaVersion": "velmere.p83r1.source-change-manifest.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_EXACT_PARENT_DELTA",
        "parentCheckpoint": "P82R1",
        "scopeExcludes": ["artifacts/closure/p83r1/* (self-generated closure receipts)"],
        "changeCount": len(changes),
        "classificationCounts": dict(sorted(counts.items())),
        "changes": changes,
        "buildRelevantChangedFiles": PRODUCT_CHANGES,
        "directiveChanged": False,
        "truthBoundary": "Exact filesystem delta from P82R1 outside self-generated P83 closure. A changed file is not automatically customer value or FINAL evidence.",
    }
    write_json(out / "P83R1_SOURCE_CHANGE_MANIFEST.json", payload)
    return payload


def product_projection(root: Path, out: Path) -> dict[str, Any]:
    parent_manifest = json.loads((root / "artifacts/closure/p82r1/P82R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json").read_text(encoding="utf-8"))
    parent_rows = [dict(row) for row in parent_manifest["files"]]
    parent_declared = parent_manifest["currentCandidateProjection"]
    if canonical_projection(parent_rows) != parent_declared:
        raise RuntimeError("p82_product_projection_parent_identity_mismatch")
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
        "schemaVersion": "velmere.p83r1.current-product-projection-manifest.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY",
        "parentCheckpoint": "P82R1",
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
            "orderedMigration": "supabase/migrations/20260820000001_p83_audit_exact_artifact_atomic_publication.sql",
            "canonicalSchemaMirror": "lib/db/schema.sql",
            "includedInProductBuildProjection": False,
            "authorizedPostgresExecution": "WITHHELD",
        },
        "files": current_rows,
        "exactWindowsCredit": False,
        "truthBoundary": "P83R1 updates the exact P82 product projection with four build-relevant customer-path modules. Database migration/schema are closure-critical but outside the historical product-build projection. This is local source identity, not exact-Windows or staging PostgreSQL proof.",
    }
    write_json(out / "P83R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json", payload)
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
    mismatches = []
    for rel, before in sorted(unique.items()):
        current = root / rel
        if not current.is_file():
            mismatches.append({"path": rel, "reason": "missing"})
        elif current.stat().st_size != before["byteLength"] or sha256_file(current) != before["sha256"]:
            mismatches.append({"path": rel, "reason": "changed", "expectedSha256": before["sha256"], "actualSha256": sha256_file(current)})
    payload = {
        "schemaVersion": "velmere.p83r1.historical-receipt-immutability.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS" if not mismatches else "FAIL",
        "verifiedHistoricalFiles": len(unique),
        "mismatchCount": len(mismatches),
        "mismatches": mismatches,
        "scope": ["all P82-parent receipts", "all P82-parent closure artifacts", "P80 exact fixture PDF", "P82 local quorum fixture receipt"],
        "truthBoundary": "Regression harnesses may execute current source, but frozen historical receipts/artifacts remain byte-for-byte unchanged. Current results are stored only under P83 logs/receipts.",
    }
    if mismatches:
        raise RuntimeError(f"historical_receipt_mutation:{mismatches[:10]}")
    write_json(out / "P83R1_HISTORICAL_RECEIPT_IMMUTABILITY.json", payload)
    return payload


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def assert_log(path: Path, markers: list[str]) -> None:
    text = path.read_text(encoding="utf-8", errors="replace")
    missing = [marker for marker in markers if marker not in text]
    if missing:
        raise RuntimeError(f"log_marker_missing:{path}:{missing}")


def test_aggregate(root: Path, out: Path) -> dict[str, Any]:
    logs = root / "artifacts/p83/logs"
    p83_runtime = read_json(root / "receipts/p83/P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_RUNTIME.json")
    p83_repeat = read_json(root / "receipts/p83/P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_REPEATABILITY.json")
    p83_static = read_json(root / "receipts/p83/P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_STATIC.json")
    p77 = read_json(root / "receipts/p83/P83_P77_DETERMINISTIC_DELIVERY_CURRENT_STATIC_REGRESSION.json")
    if (p83_runtime["checks"]["total"], p83_runtime["checks"]["passed"]) != (35, 35):
        raise RuntimeError("p83_runtime_not_35_of_35")
    if (p83_repeat["checks"]["total"], p83_repeat["checks"]["passed"]) != (5, 5):
        raise RuntimeError("p83_repeatability_not_5_of_5")
    if (p83_static["checks"]["total"], p83_static["checks"]["passed"]) != (60, 60):
        raise RuntimeError("p83_static_not_60_of_60")
    if p77.get("checkCount") != 23 or p77.get("status") != "PASS":
        raise RuntimeError("p77_current_regression_not_green")
    specs = [
        ("P83 Audit exact artifact atomic publication runtime", "receipts/p83/P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_RUNTIME.json", 35, p83_runtime["status"]),
        ("P83 local runtime repeatability", "receipts/p83/P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_REPEATABILITY.json", 5, p83_repeat["status"]),
        ("P83 Audit exact artifact atomic publication static", "receipts/p83/P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_STATIC.json", 60, p83_static["status"]),
    ]
    log_specs = [
        ("P82 successful-subset quorum integrity runtime", "P82_SUCCESSFUL_QUORUM_INTEGRITY_RUNTIME.log", 167, ["PASS (167/167)"]),
        ("P82 successful-subset quorum integrity static", "P82_SUCCESSFUL_QUORUM_INTEGRITY_STATIC.log", 129, ['"status": "PASS"']),
        ("P80 Audit exact immutable artifact runtime", "P80_AUDIT_EXACT_IMMUTABLE_ACCOUNT_ARTIFACT_RUNTIME.log", 67, ['"status": "PASS_BOUNDED_LOCAL_FIXTURE"']),
        ("P80 Audit exact immutable artifact static", "P80_AUDIT_EXACT_IMMUTABLE_ACCOUNT_ARTIFACT_STATIC.log", 103, ['"status": "PASS"']),
        ("P79 historical deployment customer-path runtime", "P79_HISTORICAL_DEPLOYMENT_CUSTOMER_PATH_RUNTIME.log", 93, ['"status": "PASS"']),
        ("P79 customer-path static", "P79_CUSTOMER_PATH_STATIC.log", 98, ['"status": "PASS"']),
        ("P78 private provider evidence runtime", "P78_PRIVATE_PROVIDER_EVIDENCE_RUNTIME.log", 27, ['"status": "PASS"']),
        ("P78 standard-json customer-path runtime", "P78_STANDARD_JSON_CUSTOMER_PATH_RUNTIME.log", 38, ['"status": "PASS"']),
        ("P78 thirdweb development micro-corpus runtime", "P78_THIRDWEB_DEVELOPMENT_MICRO_CORPUS_RUNTIME.log", 58, ['"status": "PASS"']),
        ("P78 real-audit dataflow static", "P78_REAL_AUDIT_DATAFLOW_STATIC.log", 38, ['"status": "PASS"']),
        ("P78R3 customer-path static", "P78R3_CUSTOMER_PATH_STATIC.log", 54, ['"status": "PASS"']),
        ("P77 deterministic delivery current static", "P77_DETERMINISTIC_DELIVERY_CURRENT_STATIC.log", 23, ['"status": "PASS"']),
        ("P75 Advanced automation current regression", "P75_ADVANCED_AUTOMATION_CURRENT_REGRESSION.log", 37, ['"status": "PASS"']),
        ("Exact customer PDF delivery unit", "EXACT_PDF_UNIT.log", 22, ["PASS (22/22)", "# fail 0"]),
        ("Exact customer PDF storage-to-delivery integration", "EXACT_PDF_INTEGRATION.log", 55, ["PASS_P36_EXACT_CUSTOMER_PDF_STORAGE_TO_DELIVERY_INTEGRATION", '"assertions": 55', "# fail 0"]),
    ]
    controls = []
    for label, rel, count, status in specs:
        path = root / rel
        controls.append({"label": label, "path": rel, "sha256": sha256_file(path), "status": status, "checks": count, "passed": True})
    for label, log_name, count, markers in log_specs:
        path = logs / log_name
        assert_log(path, markers)
        text = path.read_text(encoding="utf-8", errors="replace")
        try:
            parsed_log = json.loads(text)
        except Exception:
            parsed_log = None
        if isinstance(parsed_log, dict):
            observed_count = parsed_log.get("checkCount")
            if observed_count is None and isinstance(parsed_log.get("checks"), dict):
                observed_count = parsed_log["checks"].get("total")
            if observed_count is None and isinstance(parsed_log.get("checks"), list):
                observed_count = len(parsed_log["checks"])
            if observed_count is not None and int(observed_count) != count:
                raise RuntimeError(f"log_count_mismatch:{path}:{observed_count}!={count}")
        controls.append({"label": label, "path": path.relative_to(root).as_posix(), "sha256": sha256_file(path), "status": "PASS", "checks": count, "passed": True})
    total = sum(row["checks"] for row in controls)
    if total != 1109:
        raise RuntimeError(f"p83_aggregate_count_mismatch:{total}")
    payload = {
        "schemaVersion": "velmere.p83r1.current-source-test-aggregate.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS",
        "controls": controls,
        "aggregateExecutedChecksAcrossOverlappingHarnesses": total,
        "aggregateIndependenceClaim": False,
        "historicalReceiptsRewritten": False,
        "truthBoundary": "1109 is the sum of overlapping local/static/runtime/PDF controls. It is not an independent-evidence count, detector accuracy, provider count, customer count or FINAL numerator.",
    }
    write_json(out / "P83R1_TEST_AGGREGATE.json", payload)
    return payload


def exact_pdf_receipt(root: Path, out: Path) -> dict[str, Any]:
    unit = root / "artifacts/p83/logs/EXACT_PDF_UNIT.log"
    integration = root / "artifacts/p83/logs/EXACT_PDF_INTEGRATION.log"
    assert_log(unit, ["PASS (22/22)", "# fail 0"])
    assert_log(integration, ["PASS_P36_EXACT_CUSTOMER_PDF_STORAGE_TO_DELIVERY_INTEGRATION", '"assertions": 55', "# fail 0"])
    payload = {
        "schemaVersion": "velmere.p83r1.exact-pdf-test-rerun.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS",
        "unit": {"assertions": 22, "status": "PASS", "logPath": unit.relative_to(root).as_posix(), "logSha256": sha256_file(unit)},
        "integration": {"assertions": 55, "status": "PASS", "logPath": integration.relative_to(root).as_posix(), "logSha256": sha256_file(integration), "authorizedPostgresExecuted": False, "deployedHttpExecuted": False},
        "zeroFakeCredit": {"customerFinal": "0/20", "auditFinalPdf": "0/3", "previewDownloadAccountDeployedParity": "WITHHELD", "exactWindows": "WITHHELD"},
    }
    write_json(out / "P83R1_EXACT_PDF_TEST_RERUN.json", payload)
    return payload


def typescript_receipt(root: Path, out: Path) -> dict[str, Any]:
    ts_log = root / "artifacts/p83/logs/P83_TARGETED_TYPESCRIPT.log"
    imports_log = root / "artifacts/p83/logs/P83_CHANGED_MODULE_IMPORTS.log"
    if ts_log.read_bytes() != b"":
        raise RuntimeError("p83_targeted_typescript_log_not_clean")
    assert_log(imports_log, ["P83 changed production module imports: PASS (4/4)"] + [f"PASS ./{rel}" for rel in PRODUCT_CHANGES])
    shutil.copyfile(ts_log, out / "P83R1_TARGETED_TYPESCRIPT.log")
    shutil.copyfile(imports_log, out / "P83R1_CHANGED_MODULE_IMPORTS.log")
    payload = {
        "schemaVersion": "velmere.p83r1.local-typescript-diagnostic.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_TARGETED_AND_CHANGED_MODULE_IMPORTS_WITHHELD_FULL_PROJECT",
        "targetedStrictTypeScript": {
            "status": "PASS",
            "command": "tsc --noEmit --target ES2022 --lib ES2022,DOM --module ESNext --moduleResolution Bundler --skipLibCheck --strict --noResolve scripts/p83/p83-targeted-types.d.ts lib/reporting/audit-exact-artifact-atomic-publisher.ts",
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
        "exactWindows": "WITHHELD_ON_CURRENT_P83R1_BYTES",
    }
    write_json(out / "P83R1_LOCAL_TYPESCRIPT_DIAGNOSTIC.json", payload)
    return payload


def targeted_secret_scan(root: Path, source_manifest: dict[str, Any], out: Path) -> dict[str, Any]:
    findings = []
    scanned = []
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
        "schemaVersion": "velmere.p83r1.targeted-secret-scan.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS" if not findings else "FAIL",
        "scannedChangedFiles": len(scanned),
        "matches": len(findings),
        "findings": findings,
        "fullPackageRescanRequiredAtBuild": True,
    }
    if findings:
        raise RuntimeError(f"p83_targeted_secret_findings:{findings[:10]}")
    write_json(out / "P83R1_TARGETED_SECRET_SCAN.json", payload)
    return payload


def checkpoint_receipt(root: Path, out: Path, projection: dict[str, Any], source_changes: dict[str, Any], tests: dict[str, Any], secrets: dict[str, Any], history: dict[str, Any]) -> dict[str, Any]:
    runtime = read_json(root / "receipts/p83/P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_RUNTIME.json")
    repeat = read_json(root / "receipts/p83/P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_REPEATABILITY.json")
    static = read_json(root / "receipts/p83/P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_STATIC.json")
    payload = {
        "schemaVersion": "velmere.p83r1.checkpoint-receipt.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_BOUNDED_P83R1_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_MIGRATION_REACHABILITY",
        "canonicalBinding": {
            "directiveFile": DIRECTIVE_FILE,
            "directiveSha256": DIRECTIVE_SHA256,
            "directiveChanged": False,
            "directiveChangeReason": "No authority churn: V17 already requires immutable stored bytes, fail-closed legacy behavior, account authorization and preview/download byte identity.",
            "parentCheckpoint": "P82R1",
            "parentLedgerSha256": PARENT_LEDGER_SHA256,
            "parentLedgerBytes": PARENT_LEDGER_BYTES,
            "parentSourceOnlySha256": PARENT_ZIP_SHA256,
            "parentSourceOnlyBytes": PARENT_ZIP_BYTES,
            "parentSourceOnlyEntries": PARENT_ZIP_ENTRIES,
        },
        "productProjection": projection["currentCandidateProjection"],
        "physicalChanges": {
            "deltaFilesOutsideSelfGeneratedClosure": source_changes["changeCount"],
            "buildRelevantChangedFiles": len(PRODUCT_CHANGES),
            "orderedAuditMigrationAdded": True,
            "canonicalSchemaMirrorUpdated": True,
            "singleServiceRoleRpc": "velmere_publish_audit_exact_artifact_v1",
            "atomicSnapshotPdfMessagePublication": True,
            "twoWriteCustomerPathRemoved": True,
            "preexistingSemanticConflictRejectedBeforeBundleMutation": True,
            "postinsertFullSemanticVerification": True,
            "noMemoryOrTwoWriteFallback": True,
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
            "customerFinalEligible": False,
            "auditFinalPdfEligible": False,
        },
        "controls": tests["controls"],
        "aggregateExecutedChecksAcrossOverlappingHarnesses": tests["aggregateExecutedChecksAcrossOverlappingHarnesses"],
        "aggregateIndependenceClaim": False,
        "environment": {
            "localNode": subprocess.check_output(["node", "--version"], text=True).strip(),
            "localNpm": subprocess.check_output(["npm", "--version"], text=True).strip(),
            "localTsc": subprocess.check_output(["tsc", "--version"], text=True).strip().replace("Version ", ""),
            "platform": f"{platform.system().lower()} {platform.machine()}",
            "authorizedPostgresMigrationExecuted": False,
            "RLSAndTriggerRuntimeExecuted": False,
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
            "stateChangePerformed": False,
            "liveExploitPerformed": False,
            "weaponizedPocCreated": False,
            "authorizationBypassAttempted": False,
            "rawSolidityAbiRuntimeTraceStateRedistributed": False,
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
        "nextBlocker": "Execute the P83 ordered migration on authorized staging PostgreSQL; prove service-role-only RPC, anon/authenticated denial, RLS, trigger failures and full rollback on same-ID semantic conflict; then prove real owner-JWT account access and deployed preview/download/account byte identity. Current read-only BSC quorum, authorized offline replay, rights/currentness and exact Windows remain separate required gates.",
        "truthBoundary": "P83R1 proves source reachability and local fail-closed transaction-boundary behavior. It does not execute PostgreSQL or establish deployed atomicity, customer access, current chain facts, current exploitability, rights expansion, Customer FINAL or Audit FINAL PDF.",
    }
    write_json(out / "P83R1_CHECKPOINT_RECEIPT.json", payload)
    return payload


def package_recipe(root: Path, out: Path) -> dict[str, Any]:
    current_count = len([p for p in root.rglob("*") if p.is_file()])
    # The recipe itself and the subsequent tree-identity file are not present yet.
    expected = current_count + 2
    payload = {
        "schemaVersion": "velmere.p83r1.deterministic-package-recipe.v1",
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
    write_json(out / "P83R1_PACKAGE_BUILD_RECIPE.json", payload)
    return payload


def tree_identity(root: Path, out: Path, recipe: dict[str, Any]) -> dict[str, Any]:
    rows = all_rows(root, exclude_identity=True)
    projection = canonical_projection(rows)
    payload = {
        "schemaVersion": "velmere.p83r1.tree-identity-excluding-self.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS",
        **projection,
        "fullPackageFileCountIncludingThisIdentityFile": len(rows) + 1,
        "excludedPath": IDENTITY_REL,
        "excludedOnlySelf": True,
    }
    if payload["fullPackageFileCountIncludingThisIdentityFile"] != recipe["expectedEntryCountIncludingIdentityReceipt"]:
        raise RuntimeError("p83_package_recipe_entry_count_mismatch")
    write_json(out / "P83R1_TREE_IDENTITY_EXCLUDING_SELF.json", payload)
    final_count = len([p for p in root.rglob("*") if p.is_file()])
    if final_count != payload["fullPackageFileCountIncludingThisIdentityFile"]:
        raise RuntimeError("p83_tree_identity_final_count_mismatch")
    return payload


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--parent", required=True)
    args = parser.parse_args()
    root = Path(args.root).resolve()
    parent = Path(args.parent).resolve()
    out = root / "artifacts/closure/p83r1"
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    directive = root / DIRECTIVE_FILE
    if sha256_file(directive) != DIRECTIVE_SHA256:
        raise RuntimeError("directive_hash_mismatch")
    active = root / "VELMERE_ACTIVE_PASS.txt"
    active.write_text("VELMERE_P83R1_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_MIGRATION_REACHABILITY_NO_CUSTOMER_FINAL_OR_PDF_FINAL_CREDIT\n", encoding="utf-8")

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
    result = {
        "status": "PASS",
        "closureDirectory": out.relative_to(root).as_posix(),
        "productProjection": projection["currentCandidateProjection"],
        "testAggregate": tests["aggregateExecutedChecksAcrossOverlappingHarnesses"],
        "treeIdentity": identity,
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
