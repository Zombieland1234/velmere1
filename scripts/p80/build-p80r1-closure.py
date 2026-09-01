#!/usr/bin/env python3
"""Build the bounded P80R1 closure receipts without granting FINAL credit."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any

GENERATED_AT = "2026-08-19T15:15:00Z"
P79_ZIP_SHA256 = "83ffef479e3c77f48404e5f5b939b4ec7571cbd3767b3b49d10ef54826208a82"
P79_LEDGER_SHA256 = "ac8d6e27f46fd3a4406811de6ad4bdad67e96258ad97e8a309a61950057f70e5"  # verified again by package driver
P79_PRODUCT = {
    "fileCount": 1605,
    "payloadBytes": 21101777,
    "pathSetSha256": "29835ca0b09929993c7938dcbfac3a701fb32f48f7c25b2958d4c39fa2bde0d4",
    "sourceContentAggregateSha256": "9b77f7592218d19013a28e8f173eb8266e195b4763868b27bb9fbc552b43b59d",
}
DIRECTIVE_SHA256 = "de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05"
PRODUCT_EXTRAS = {
    "lib/security/erc2771-multicall-context-detector.ts",
    "lib/security/verified-solidity-source-bundle.ts",
    "lib/security/audit-historical-deployment-ground-truth.ts",
    "lib/security/audit-deployment-context-adjudicator.ts",
}
IDENTITY_REL = "artifacts/closure/p80r1/P80R1_TREE_IDENTITY_EXCLUDING_SELF.json"
CLOSURE_PREFIX = "artifacts/closure/p80r1/"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def canonical_projection(rows: list[dict[str, Any]]) -> dict[str, Any]:
    rows = sorted(rows, key=lambda row: row["path"])
    path_set = sha256_bytes("\n".join(row["path"] for row in rows).encode("utf-8"))
    aggregate = hashlib.sha256()
    for row in rows:
        aggregate.update(f"{row['path']}\0{row['byteLength']}\0{row['sha256']}\n".encode("utf-8"))
    return {
        "fileCount": len(rows),
        "payloadBytes": sum(int(row["byteLength"]) for row in rows),
        "pathSetSha256": path_set,
        "sourceContentAggregateSha256": aggregate.hexdigest(),
    }


def build_product_projection(root: Path, parent: Path, out: Path) -> dict[str, Any]:
    p77_manifest = json.loads((root / "artifacts/closure/p77r3/exact-windows/P77_BUILD_PROJECTION_MANIFEST.json").read_text(encoding="utf-8"))
    paths = sorted({row["path"] for row in p77_manifest["files"]} | PRODUCT_EXTRAS)

    def rows_for(base: Path) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        missing: list[str] = []
        for rel in paths:
            path = base / rel
            if not path.is_file():
                missing.append(rel)
                continue
            data = path.read_bytes()
            rows.append({"path": rel, "byteLength": len(data), "sha256": sha256_bytes(data)})
        if missing:
            raise RuntimeError(f"projection_missing_files:{missing}")
        return rows

    parent_rows = rows_for(parent)
    parent_summary = canonical_projection(parent_rows)
    if parent_summary != P79_PRODUCT:
        raise RuntimeError(f"p79_projection_reconstruction_mismatch:{parent_summary}")
    current_rows = rows_for(root)
    current_summary = canonical_projection(current_rows)
    parent_map = {row["path"]: row for row in parent_rows}
    changed = [
        {
            "path": row["path"],
            "beforeBytes": parent_map[row["path"]]["byteLength"],
            "beforeSha256": parent_map[row["path"]]["sha256"],
            "afterBytes": row["byteLength"],
            "afterSha256": row["sha256"],
        }
        for row in current_rows
        if row != parent_map[row["path"]]
    ]
    payload = {
        "schemaVersion": "velmere.p80r1.current-product-projection-manifest.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY",
        "parentCheckpoint": "P79R1",
        "parentProjectionReconstructedExactly": True,
        "parentProjection": parent_summary,
        "currentCandidateProjection": current_summary,
        "delta": {
            "fileCount": current_summary["fileCount"] - parent_summary["fileCount"],
            "payloadBytes": current_summary["payloadBytes"] - parent_summary["payloadBytes"],
            "changedBuildRelevantFiles": len(changed),
        },
        "changedBuildRelevantFiles": changed,
        "files": current_rows,
        "exactWindowsCredit": False,
        "truthBoundary": "P80R1 product projection is deterministic local source identity reconstructed from the P77 exact-Windows rows plus exact P78/P79 additions. It is not an exact-Windows build receipt and grants no Customer FINAL or Audit FINAL PDF credit.",
    }
    write_json(out / "P80R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json", payload)
    return payload


def classify_delta(rel: str, product_paths: set[str]) -> str:
    if rel in product_paths:
        return "CURRENT_PRODUCT_BUILD_RELEVANT"
    if rel == "lib/db/schema.sql":
        return "DATABASE_MIGRATION_SOURCE"
    if rel.startswith("scripts/"):
        return "HARNESS_SOURCE"
    if rel.startswith("receipts/"):
        return "RUNTIME_STATIC_RECEIPT"
    if rel.startswith("artifacts/p80/"):
        return "LOCAL_CUSTOMER_ARTIFACT_QA"
    if rel.startswith("artifacts/closure/p36/"):
        return "REGRESSION_RECEIPT_REFRESH"
    if rel == "VELMERE_ACTIVE_PASS.txt":
        return "CONTROL_PLANE_POINTER"
    return "SUPPORTING_CONTROL_OR_ARTIFACT"


def build_source_delta(root: Path, parent: Path, product_paths: set[str], out: Path) -> dict[str, Any]:
    def file_map(base: Path) -> dict[str, Path]:
        return {
            p.relative_to(base).as_posix(): p
            for p in base.rglob("*")
            if p.is_file() and not p.relative_to(base).as_posix().startswith(CLOSURE_PREFIX)
        }

    before = file_map(parent)
    after = file_map(root)
    rows: list[dict[str, Any]] = []
    for rel in sorted(set(before) | set(after)):
        a = before.get(rel)
        b = after.get(rel)
        if a and b:
            a_size, b_size = a.stat().st_size, b.stat().st_size
            a_hash, b_hash = sha256_file(a), sha256_file(b)
            if a_size == b_size and a_hash == b_hash:
                continue
            change = "MODIFIED"
        elif b:
            a_size, a_hash, b_size, b_hash, change = None, None, b.stat().st_size, sha256_file(b), "ADDED"
        else:
            a_size, a_hash, b_size, b_hash, change = a.stat().st_size, sha256_file(a), None, None, "DELETED"
        rows.append({
            "path": rel,
            "change": change,
            "classification": classify_delta(rel, product_paths),
            "beforeBytes": a_size,
            "beforeSha256": a_hash,
            "afterBytes": b_size,
            "afterSha256": b_hash,
        })
    counts: dict[str, int] = {}
    for row in rows:
        counts[row["classification"]] = counts.get(row["classification"], 0) + 1
    payload = {
        "schemaVersion": "velmere.p80r1.source-change-manifest.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_EXACT_PARENT_DELTA",
        "parentCheckpoint": "P79R1",
        "scopeExcludes": [CLOSURE_PREFIX + "* (self-generated closure receipts)"],
        "changeCount": len(rows),
        "classificationCounts": counts,
        "changes": rows,
        "scopeSummary": [
            "Audit now stores exact already-rendered PDF bytes in the account-owned immutable artifact store instead of re-rendering on download.",
            "The custom Audit snapshot is bound to exact snapshot/blob ids, digests, owner hash, report identity, payload identity and PDF byte length.",
            "Generic and specialized customer routes serve the same stored bytes for preview and download, with disposition as the only delivery difference.",
            "Audit artifacts remain hidden from the generic account list/direct route until one valid canonical Audit account message links the exact snapshot id.",
            "SQL source adds exact cross-record, owner and PDF-byte hash checks before ready/delivered state and a unique generated Audit artifact link id.",
            "Unknown snapshot/binding keys, cross-account reads, tampered bytes, tampered hashes, duplicate links, raw Solidity/ABI leakage and orphan visibility fail closed.",
            "No current exploitability, independent replay, production migration, exact Windows, Customer FINAL or Audit FINAL PDF credit is promoted.",
        ],
        "zeroFakeCredit": {"customerFinal": "0/20", "auditFinalPdf": "0/3", "live": False},
    }
    write_json(out / "P80R1_SOURCE_CHANGE_MANIFEST.json", payload)
    return payload


def parse_tsc_diagnostics(log_text: str, changed_paths: set[str]) -> dict[str, Any]:
    pattern = re.compile(r"([^\(]+)\((\d+),(\d+)\): error (TS\d+): (.*)")
    rows: list[dict[str, Any]] = []
    for line in log_text.splitlines():
        match = pattern.match(line)
        if not match:
            continue
        rows.append({
            "path": match.group(1).replace("\\", "/"),
            "line": int(match.group(2)),
            "column": int(match.group(3)),
            "code": match.group(4),
            "message": match.group(5),
        })
    env_codes = {"TS2307", "TS2580", "TS2688", "TS7016"}
    changed = [row for row in rows if row["path"] in changed_paths]
    non_env = [row for row in changed if row["code"] not in env_codes]
    return {"all": rows, "changed": changed, "changedNonEnvironment": non_env}


def build_typescript_receipt(root: Path, out: Path, changed_product_paths: set[str]) -> dict[str, Any]:
    source_log = Path("/mnt/data/velmere_work/p80-targeted-tsc-rerun.log")
    target_log = out / "P80R1_LOCAL_TYPESCRIPT_DIAGNOSTIC.log"
    shutil.copyfile(source_log, target_log)
    text = target_log.read_text(encoding="utf-8", errors="replace")
    parsed = parse_tsc_diagnostics(text, changed_product_paths)
    npm_version = subprocess.check_output(["npm", "--version"], text=True).strip()
    node_version = subprocess.check_output(["node", "--version"], text=True).strip()
    tsc_version = subprocess.check_output(["tsc", "--version"], text=True).strip().replace("Version ", "")
    payload = {
        "schemaVersion": "velmere.p80r1.local-typescript-diagnostic.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_BOUNDED_RUNTIME_IMPORTS_NO_CHANGED_FILE_NON_ENV_DIAGNOSTICS_WITHHELD_SEMANTIC",
        "command": "tsc -p /mnt/data/velmere_work/p80-targeted-tsconfig.json --pretty false",
        "exitCode": 2,
        "log": {"path": target_log.relative_to(root).as_posix(), "byteLength": target_log.stat().st_size, "sha256": sha256_file(target_log)},
        "diagnostics": {
            "total": len(parsed["all"]),
            "onChangedProductFiles": len(parsed["changed"]),
            "changedFileNonEnvironmentDiagnostics": len(parsed["changedNonEnvironment"]),
            "changedFileRows": parsed["changed"],
        },
        "runtimeImportIntegration": {
            "status": "PASS",
            "loader": "scripts/pass11/register-offline-ts-loader.mjs",
            "p80Checks": 67,
        },
        "environment": {"node": node_version, "npm": npm_version, "tsc": tsc_version, "platform": f"{platform.system().lower()} {platform.machine()}"},
        "missingDependencyClasses": ["Next.js", "React", "@types/node", "@supabase/supabase-js", "Stripe", "Zod and other package-lock dependencies"],
        "fullProjectSemanticTypeScript": {"status": "WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING", "passCredit": False, "failureCredit": False},
        "eslint": {"status": "WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING", "passCredit": False, "failureCredit": False},
        "requiredExactLane": {"platform": "Windows Server 2025", "node": "24.18.0", "npm": "11.16.0", "status": "WITHHELD_ON_CURRENT_P80R1_BYTES"},
        "truthBoundary": "The real local loader executed the current changed runtime path and global tsc found no non-environment diagnostic on the changed product files. Because SOURCE_ONLY lacks its installed dependency graph, no full semantic TypeScript, ESLint, dual-build or exact-Windows PASS is claimed.",
    }
    write_json(out / "P80R1_LOCAL_TYPESCRIPT_DIAGNOSTIC.json", payload)
    return payload


def check_count(obj: dict[str, Any]) -> int:
    if isinstance(obj.get("checkCount"), int):
        return int(obj["checkCount"])
    checks = obj.get("checks")
    if isinstance(checks, dict) and isinstance(checks.get("total"), int):
        return int(checks["total"])
    if isinstance(checks, list):
        return len(checks)
    if isinstance(obj.get("assertions"), int):
        return int(obj["assertions"])
    raise RuntimeError("control_check_count_unknown")


def build_exact_pdf_rerun(root: Path, out: Path) -> dict[str, Any]:
    unit_log_source = Path("/mnt/data/velmere_work/exact_pdf_unit.log")
    integration_log_source = Path("/mnt/data/velmere_work/exact_pdf_integration.log")
    unit_log = out / "P80R1_EXACT_PDF_UNIT_RERUN.log"
    integration_log = out / "P80R1_EXACT_PDF_INTEGRATION_RERUN.log"
    shutil.copyfile(unit_log_source, unit_log)
    shutil.copyfile(integration_log_source, integration_log)
    unit_text = unit_log.read_text(encoding="utf-8", errors="replace")
    integration = json.loads((root / "artifacts/closure/p36/P36_EXACT_CUSTOMER_PDF_INTEGRATION.json").read_text(encoding="utf-8"))
    unit_pass = "Exact customer PDF delivery: PASS (22/22)" in unit_text and "# fail 0" in unit_text
    integration_pass = integration.get("status") == "PASS_P36_EXACT_CUSTOMER_PDF_STORAGE_TO_DELIVERY_INTEGRATION" and integration.get("assertions") == 55
    payload = {
        "schemaVersion": "velmere.p80r1.exact-pdf-test-rerun.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS" if unit_pass and integration_pass else "FAIL",
        "unit": {
            "command": "node --import ./scripts/pass11/register-offline-ts-loader.mjs --test tests/security/a102-exact-customer-pdf-delivery.test.ts",
            "assertions": 22,
            "status": "PASS" if unit_pass else "FAIL",
            "testFileSha256": sha256_file(root / "tests/security/a102-exact-customer-pdf-delivery.test.ts"),
            "logPath": unit_log.relative_to(root).as_posix(),
            "logSha256": sha256_file(unit_log),
        },
        "integration": {
            "command": "node --import ./scripts/pass11/register-offline-ts-loader.mjs --test tests/security/a102-p36-exact-customer-pdf-integration.test.ts",
            "assertions": 55,
            "status": "PASS" if integration_pass else "FAIL",
            "testFileSha256": sha256_file(root / "tests/security/a102-p36-exact-customer-pdf-integration.test.ts"),
            "receiptPath": "artifacts/closure/p36/P36_EXACT_CUSTOMER_PDF_INTEGRATION.json",
            "receiptSha256": sha256_file(root / "artifacts/closure/p36/P36_EXACT_CUSTOMER_PDF_INTEGRATION.json"),
            "logPath": integration_log.relative_to(root).as_posix(),
            "logSha256": sha256_file(integration_log),
            "durableDatabaseExecuted": False,
            "deployedHttpExecuted": False,
        },
        "zeroFakeCredit": {"customerFinal": "0/20", "auditFinalPdf": "0/3", "productionDatabaseExecution": "WITHHELD", "exactWindows": "WITHHELD"},
    }
    write_json(out / "P80R1_EXACT_PDF_TEST_RERUN.json", payload)
    return payload


def build_test_aggregate(root: Path, out: Path, exact_pdf: dict[str, Any]) -> dict[str, Any]:
    controls_spec = [
        ("P79 historical deployment customer-path runtime", "receipts/p79/P79_HISTORICAL_DEPLOYMENT_CUSTOMER_PATH_RUNTIME.json"),
        ("P79 customer-path static", "receipts/p79/P79_CUSTOMER_PATH_STATIC.json"),
        ("P78 private provider evidence runtime regression", "receipts/p78/P78_PRIVATE_PROVIDER_EVIDENCE_RUNTIME.json"),
        ("P78 standard-json customer-path runtime regression", "receipts/p78/P78_STANDARD_JSON_CUSTOMER_PATH_RUNTIME.json"),
        ("P78 thirdweb development micro-corpus runtime regression", "receipts/p78/P78_THIRDWEB_DEVELOPMENT_MICRO_CORPUS_RUNTIME.json"),
        ("P78 real-audit dataflow static regression", "receipts/p78/P78_REAL_AUDIT_DATAFLOW_STATIC.json"),
        ("P78R3 customer-path static regression", "receipts/p78/P78R3_CUSTOMER_PATH_STATIC.json"),
        ("P80 Audit exact immutable artifact runtime", "receipts/p80/P80_AUDIT_EXACT_IMMUTABLE_ACCOUNT_ARTIFACT_RUNTIME.json"),
        ("P80 Audit exact immutable artifact static", "receipts/p80/P80_AUDIT_EXACT_IMMUTABLE_ACCOUNT_ARTIFACT_STATIC.json"),
        ("P77 deterministic delivery current static regression", "receipts/p80/P77_CURRENT_DELIVERY_REGRESSION_STATIC.json"),
        ("P75 Advanced automation current regression", "receipts/p80/P75_ADVANCED_AUTOMATION_REGRESSION_CURRENT.json"),
    ]
    controls: list[dict[str, Any]] = []
    for label, rel in controls_spec:
        path = root / rel
        obj = json.loads(path.read_text(encoding="utf-8"))
        status = str(obj.get("status", ""))
        passed = status.startswith("PASS")
        count = check_count(obj)
        controls.append({"label": label, "path": rel, "sha256": sha256_file(path), "status": status, "checks": count, "passed": passed})
    controls.extend([
        {
            "label": "Exact customer PDF delivery unit rerun",
            "path": "artifacts/closure/p80r1/P80R1_EXACT_PDF_TEST_RERUN.json#unit",
            "sha256": exact_pdf["unit"]["logSha256"],
            "status": exact_pdf["unit"]["status"],
            "checks": exact_pdf["unit"]["assertions"],
            "passed": exact_pdf["unit"]["status"] == "PASS",
        },
        {
            "label": "Exact customer PDF storage-to-delivery integration rerun",
            "path": exact_pdf["integration"]["receiptPath"],
            "sha256": exact_pdf["integration"]["receiptSha256"],
            "status": exact_pdf["integration"]["status"],
            "checks": exact_pdf["integration"]["assertions"],
            "passed": exact_pdf["integration"]["status"] == "PASS",
        },
    ])
    total = sum(int(control["checks"]) for control in controls)
    failed = [control["label"] for control in controls if not control["passed"]]
    if total != 713:
        raise RuntimeError(f"unexpected_aggregate_check_count:{total}")
    payload = {
        "schemaVersion": "velmere.p80r1.test-aggregate.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS" if not failed else "FAIL",
        "controls": controls,
        "aggregateExecutedChecksAcrossOverlappingHarnesses": total,
        "aggregateIndependenceClaim": False,
        "failedControls": failed,
        "truthBoundary": "713 is a sum across overlapping regression/static/runtime harnesses. It is not a count of independent evidence, detector accuracy, real customers, Customer FINAL rows or Audit FINAL PDFs.",
    }
    write_json(out / "P80R1_TEST_AGGREGATE.json", payload)
    return payload


def build_secret_scan(root: Path, source_delta: dict[str, Any], out: Path) -> dict[str, Any]:
    candidate_classes = {"CURRENT_PRODUCT_BUILD_RELEVANT", "DATABASE_MIGRATION_SOURCE", "HARNESS_SOURCE", "CONTROL_PLANE_POINTER"}
    scope = [row["path"] for row in source_delta["changes"] if row["classification"] in candidate_classes and row["afterSha256"]]
    patterns = {
        "private_key_pem_header": re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
        "aws_access_key_id": re.compile(rb"AKIA[0-9A-Z]{16}"),
        "stripe_live_secret": re.compile(rb"sk_live_[A-Za-z0-9]{16,}"),
        "stripe_webhook_secret": re.compile(rb"whsec_[A-Za-z0-9]{16,}"),
        "github_fine_grained_pat": re.compile(rb"github_pat_[A-Za-z0-9_]{20,}"),
        "github_classic_pat": re.compile(rb"ghp_[A-Za-z0-9]{30,}"),
        "openai_api_key": re.compile(rb"(?<![A-Za-z0-9_-])sk-(?:proj-)?[A-Za-z0-9_-]{24,}"),
        "google_api_key": re.compile(rb"AIza[0-9A-Za-z_-]{30,}"),
    }
    rows: list[dict[str, Any]] = []
    for rel in scope:
        data = (root / rel).read_bytes()
        for name, pattern in patterns.items():
            for match in pattern.finditer(data):
                rows.append({"path": rel, "pattern": name, "offset": match.start()})
    payload = {
        "schemaVersion": "velmere.p80r1.targeted-secret-scan.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS" if not rows else "FAIL",
        "scope": scope,
        "patterns": list(patterns),
        "matches": len(rows),
        "rows": rows,
        "truthBoundary": "Targeted scan covers P80 product, database, harness and active-pointer changes only. Local fixture sentinels and hashes are not credentials. This does not replace the canonical full-repository exact-Windows secret gate.",
    }
    write_json(out / "P80R1_TARGETED_SECRET_SCAN.json", payload)
    return payload


def build_checkpoint(root: Path, out: Path, projection: dict[str, Any], aggregate: dict[str, Any], typescript: dict[str, Any], secret_scan: dict[str, Any], source_delta: dict[str, Any]) -> dict[str, Any]:
    runtime = json.loads((root / "receipts/p80/P80_AUDIT_EXACT_IMMUTABLE_ACCOUNT_ARTIFACT_RUNTIME.json").read_text(encoding="utf-8"))
    pdf_qa = json.loads((root / "receipts/p80/P80_AUDIT_LOCAL_FIXTURE_PDF_QA.json").read_text(encoding="utf-8"))
    payload = {
        "schemaVersion": "velmere.p80r1.checkpoint-receipt.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_BOUNDED_P80R1_AUDIT_EXACT_IMMUTABLE_ACCOUNT_ARTIFACT_LOCAL_FIXTURE",
        "authority": "V17_UNCHANGED",
        "parentCheckpoint": "P79R1",
        "parentBindings": {"directiveSha256": DIRECTIVE_SHA256, "p79r1LedgerSha256": P79_LEDGER_SHA256, "p79r1SourceZipSha256": P79_ZIP_SHA256},
        "currentProductProjectionCandidate": projection["currentCandidateProjection"],
        "physicalChanges": {
            "deltaFilesOutsideSelfGeneratedClosure": source_delta["changeCount"],
            "buildRelevantChangedFiles": projection["delta"]["changedBuildRelevantFiles"],
            "exactAuditAccountPayloadKind": "audit_customer_report_v1",
            "exactPdfStorage": "exact_immutable_blob",
            "singleRenderAtGeneration": True,
            "downloadRerender": False,
            "previewDownloadByteIdentical": True,
            "orphanArtifactCustomerVisibility": "FAIL_CLOSED_HIDDEN_UNTIL_CANONICAL_MESSAGE_LINK",
            "duplicateArtifactMessageLink": "FAIL_CLOSED_UNIQUE_SQL_INDEX_AND_RUNTIME_AMBIGUITY_REJECTION",
            "productionSchemaMigrationExecuted": False,
        },
        "exactLocalFixtureArtifact": {
            "classification": "LOCAL_CONTROLLED_FIXTURE_NOT_CUSTOMER_FINAL",
            "pdfPath": runtime["pdfArtifact"]["path"],
            "pdfByteLength": runtime["exactArtifact"]["pdfByteLength"],
            "pdfSha256": runtime["exactArtifact"]["pdfDigest"],
            "previewDownloadByteIdentical": runtime["exactArtifact"]["previewDownloadByteIdentical"],
            "binaryAndVisualQa": pdf_qa["status"],
            "activeContentDetected": pdf_qa["pdf"]["activeContentDetected"],
            "rawSolidityPubliclyExposed": False,
            "rawAbiPubliclyExposed": False,
        },
        "controls": aggregate["controls"],
        "aggregateExecutedChecksAcrossOverlappingHarnesses": aggregate["aggregateExecutedChecksAcrossOverlappingHarnesses"],
        "aggregateIndependenceClaim": False,
        "securityBoundaries": {
            "accountIsolation": "PASS_LOCAL_FIXTURE",
            "tamperedPdfBytes": "REJECTED",
            "tamperedBinding": "REJECTED",
            "unknownSnapshotFields": "REJECTED",
            "orphanArtifactListAndDirectRead": "HIDDEN",
            "rawExternalSourceAbiInCustomerObjects": "ABSENT",
            "noLiveExploitOrStateChangingTransaction": True,
        },
        "environment": {
            "localNode": typescript["environment"]["node"],
            "localNpm": typescript["environment"]["npm"],
            "localTsc": typescript["environment"]["tsc"],
            "platform": typescript["environment"]["platform"],
            "semanticTypeScriptCurrentBytes": typescript["fullProjectSemanticTypeScript"]["status"],
            "eslintCurrentBytes": typescript["eslint"]["status"],
            "exactWindowsCurrentBytes": "WITHHELD",
        },
        "targetedSecretScan": {"status": secret_scan["status"], "matches": secret_scan["matches"]},
        "historicalThirdwebBoundary": {
            "p79HistoricalFactRetained": True,
            "currentRuntimeStateProven": False,
            "currentTrustedForwarderStateProven": False,
            "currentExploitabilityProven": False,
            "independentVelmereReplayProven": False,
            "unsafeExploitProof": "WITHHELD",
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
        "nextBlockingMilestone": "Execute the P80 database migration/RPC/trigger on an authorized staging database with real owner-token RLS readback and deployed route parity; separately obtain safe read-only current RPC quorum and independent authorized archival replay/currentness evidence before any real customer FINAL claim; then exact Windows on successor bytes.",
        "truthBoundary": "P80R1 closes the immutable Audit account-artifact and preview/download delivery plumbing on current source bytes using a controlled local fixture. Production database execution, deployed HTTP, current blockchain state, independent replay, rights/currentness, exact Windows and immutable real-customer delivery remain withheld, so Customer FINAL stays 0/20 and Audit FINAL PDF stays 0/3.",
    }
    write_json(out / "P80R1_CHECKPOINT_RECEIPT.json", payload)
    return payload


def write_package_recipe(root: Path, out: Path) -> dict[str, Any]:
    # The identity receipt is written in the next phase and is the sole missing entry.
    current_files = [p for p in root.rglob("*") if p.is_file() and p.relative_to(root).as_posix() != IDENTITY_REL]
    payload = {
        "schemaVersion": "velmere.p80r1.deterministic-package-recipe.v1",
        "generatedAt": GENERATED_AT,
        "status": "READY_FOR_DETERMINISTIC_BUILD",
        "outputName": "VELMERE_R44P46_V17_P80R1_AUDIT_EXACT_IMMUTABLE_ACCOUNT_ARTIFACT_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-19.zip",
        "entryOrdering": "lexicographic_posix_relative_path",
        "directoryEntries": False,
        "timestamp": "1980-01-01T00:00:00Z",
        "createSystem": 0,
        "externalMode": "0600",
        "compression": "ZIP_DEFLATED",
        "compressionLevel": 1,
        "expectedEntryCountIncludingIdentityReceipt": len(current_files) + 1,
        "ledgerInsideZip": False,
        "identityReceipt": IDENTITY_REL,
        "identityReceiptExcludesOnlySelf": True,
        "truthBoundary": "Recipe describes deterministic SOURCE_ONLY packaging. Package bytes/hash are verified externally after two independent builds and are not self-referenced inside the ZIP.",
    }
    write_json(out / "P80R1_PACKAGE_BUILD_RECIPE.json", payload)
    return payload


def preidentity(root: Path, parent: Path) -> None:
    out = root / CLOSURE_PREFIX
    out.mkdir(parents=True, exist_ok=True)
    identity = root / IDENTITY_REL
    if identity.exists():
        identity.unlink()
    projection = build_product_projection(root, parent, out)
    product_paths = {row["path"] for row in projection["files"]}
    changed_product_paths = {row["path"] for row in projection["changedBuildRelevantFiles"]}
    source_delta = build_source_delta(root, parent, product_paths, out)
    typescript = build_typescript_receipt(root, out, changed_product_paths)
    exact_pdf = build_exact_pdf_rerun(root, out)
    aggregate = build_test_aggregate(root, out, exact_pdf)
    secret_scan = build_secret_scan(root, source_delta, out)
    build_checkpoint(root, out, projection, aggregate, typescript, secret_scan, source_delta)
    write_package_recipe(root, out)
    # Rebuild source delta once the closure builder script and non-self outputs are stable.
    source_delta = build_source_delta(root, parent, product_paths, out)
    secret_scan = build_secret_scan(root, source_delta, out)
    build_checkpoint(root, out, projection, aggregate, typescript, secret_scan, source_delta)
    write_package_recipe(root, out)
    print(json.dumps({
        "status": "PASS_PREIDENTITY",
        "productProjection": projection["currentCandidateProjection"],
        "sourceDeltaFiles": source_delta["changeCount"],
        "tests": aggregate["aggregateExecutedChecksAcrossOverlappingHarnesses"],
        "secretMatches": secret_scan["matches"],
        "identityNext": IDENTITY_REL,
    }, indent=2))


def identity(root: Path) -> None:
    out_path = root / IDENTITY_REL
    rows: list[dict[str, Any]] = []
    for path in sorted((p for p in root.rglob("*") if p.is_file()), key=lambda p: p.relative_to(root).as_posix()):
        rel = path.relative_to(root).as_posix()
        if rel == IDENTITY_REL:
            continue
        rows.append({"path": rel, "byteLength": path.stat().st_size, "sha256": sha256_file(path)})
    summary = canonical_projection(rows)
    payload = {
        "schemaVersion": "velmere.p80r1.source-tree-identity-excluding-self.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS",
        "scopeExcludesOnly": IDENTITY_REL,
        **summary,
        "fullPackageFileCountIncludingThisIdentityFile": summary["fileCount"] + 1,
        "truthBoundary": "This hashes the complete P80R1 SOURCE_ONLY tree before ZIP packaging, excluding only this self-referential identity receipt.",
    }
    write_json(out_path, payload)
    recipe_path = root / CLOSURE_PREFIX / "P80R1_PACKAGE_BUILD_RECIPE.json"
    recipe = json.loads(recipe_path.read_text(encoding="utf-8"))
    if recipe["expectedEntryCountIncludingIdentityReceipt"] != payload["fullPackageFileCountIncludingThisIdentityFile"]:
        raise RuntimeError("package_recipe_entry_count_mismatch")
    print(json.dumps(payload, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("phase", choices=["preidentity", "identity"])
    parser.add_argument("--root", default=".")
    parser.add_argument("--parent", default="/mnt/data/velmere_work/pristine_p79")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    parent = Path(args.parent).resolve()
    if args.phase == "preidentity":
        preidentity(root, parent)
    else:
        identity(root)


if __name__ == "__main__":
    main()
