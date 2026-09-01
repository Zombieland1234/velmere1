#!/usr/bin/env python3
"""Build bounded P81R1 closure receipts without granting live/current/FINAL credit."""
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

GENERATED_AT = "2026-08-19T19:45:00Z"
DIRECTIVE_SHA256 = "de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05"
P80_LEDGER_SHA256 = "ed7ab7b067fbec042dd1f6ad302c9d03fa2cf869d5c9d863d9c741d35281a19c"
P80_SOURCE_ZIP_SHA256 = "c5c1ba2b80b22b717b43f7a6a51287b489d600b1c2b6bad03db30c442fe9eeb5"
P80_SOURCE_ZIP_BYTES = 221_738_622
P80_SOURCE_ZIP_ENTRIES = 8_059
P80_PRODUCT = {
    "fileCount": 1605,
    "payloadBytes": 21124541,
    "pathSetSha256": "29835ca0b09929993c7938dcbfac3a701fb32f48f7c25b2958d4c39fa2bde0d4",
    "sourceContentAggregateSha256": "fae6a062bfebe306edc3aa5a9d4368d187c766fb6ee56b6b70f3463134d8bc1b",
}
NEW_PRODUCT_FILE = "lib/security/audit-current-deployment-readonly-quorum.ts"
IDENTITY_REL = "artifacts/closure/p81r1/P81R1_TREE_IDENTITY_EXCLUDING_SELF.json"
CLOSURE_PREFIX = "artifacts/closure/p81r1/"
OUTPUT_NAME = "VELMERE_R44P46_V17_P81R1_CURRENT_DEPLOYMENT_EXACT_BLOCK_READONLY_QUORUM_CONTROL_PLANE_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-19.zip"


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
    ordered = sorted(rows, key=lambda row: row["path"])
    path_set = sha256_bytes("\n".join(row["path"] for row in ordered).encode("utf-8"))
    aggregate = hashlib.sha256()
    for row in ordered:
        aggregate.update(f"{row['path']}\0{row['byteLength']}\0{row['sha256']}\n".encode("utf-8"))
    return {
        "fileCount": len(ordered),
        "payloadBytes": sum(int(row["byteLength"]) for row in ordered),
        "pathSetSha256": path_set,
        "sourceContentAggregateSha256": aggregate.hexdigest(),
    }


def file_row(base: Path, rel: str) -> dict[str, Any]:
    path = base / rel
    if not path.is_file():
        raise RuntimeError(f"missing_file:{rel}")
    data = path.read_bytes()
    return {"path": rel, "byteLength": len(data), "sha256": sha256_bytes(data)}


def build_product_projection(root: Path, parent: Path, out: Path) -> dict[str, Any]:
    p80_manifest = json.loads((parent / "artifacts/closure/p80r1/P80R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json").read_text(encoding="utf-8"))
    base_paths = [row["path"] for row in p80_manifest["files"]]
    if len(base_paths) != len(set(base_paths)):
        raise RuntimeError("p80_projection_duplicate_paths")
    parent_rows = [file_row(parent, rel) for rel in sorted(base_paths)]
    parent_summary = canonical_projection(parent_rows)
    if parent_summary != P80_PRODUCT:
        raise RuntimeError(f"p80_projection_reconstruction_mismatch:{parent_summary}")
    if (parent / NEW_PRODUCT_FILE).exists():
        raise RuntimeError("new_p81_module_unexpectedly_present_in_parent")

    current_paths = sorted(set(base_paths) | {NEW_PRODUCT_FILE})
    current_rows = [file_row(root, rel) for rel in current_paths]
    current_summary = canonical_projection(current_rows)
    parent_map = {row["path"]: row for row in parent_rows}
    changed: list[dict[str, Any]] = []
    for row in current_rows:
        before = parent_map.get(row["path"])
        if before == row:
            continue
        changed.append({
            "path": row["path"],
            "change": "ADDED" if before is None else "MODIFIED",
            "beforeBytes": None if before is None else before["byteLength"],
            "beforeSha256": None if before is None else before["sha256"],
            "afterBytes": row["byteLength"],
            "afterSha256": row["sha256"],
        })

    payload = {
        "schemaVersion": "velmere.p81r1.current-product-projection-manifest.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY",
        "parentCheckpoint": "P80R1",
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
        "truthBoundary": "P81R1 deterministically reconstructs the P80R1 product projection, adds the exact-block read-only quorum module and hashes all changed production paths. It is local source identity only, not an exact-Windows build receipt and not live/current blockchain evidence.",
    }
    write_json(out / "P81R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json", payload)
    return payload


def classify_delta(rel: str, product_paths: set[str]) -> str:
    if rel in product_paths:
        return "CURRENT_PRODUCT_BUILD_RELEVANT"
    if rel == "VELMERE_ACTIVE_PASS.txt":
        return "CONTROL_PLANE_POINTER"
    if rel.startswith("scripts/p81/"):
        return "P81_HARNESS_OR_CLOSURE_SOURCE"
    if rel in {"scripts/p78/test-p78-static.py", "scripts/p79/test-p79-customer-path-static.py"}:
        return "REGRESSION_HARNESS_REPAIR"
    if rel.startswith("receipts/p81/"):
        return "P81_RUNTIME_STATIC_RECEIPT"
    if rel.startswith("artifacts/p81/"):
        return "P81_LOCAL_CONTROL_PLANE_PROOF"
    if rel.startswith("receipts/p78/") or rel.startswith("receipts/p79/") or rel.startswith("receipts/p80/"):
        return "REGRESSION_RECEIPT_REFRESH"
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
        old = before.get(rel)
        new = after.get(rel)
        if old and new:
            old_size, new_size = old.stat().st_size, new.stat().st_size
            old_hash, new_hash = sha256_file(old), sha256_file(new)
            if old_size == new_size and old_hash == new_hash:
                continue
            change = "MODIFIED"
        elif new:
            old_size, old_hash, new_size, new_hash, change = None, None, new.stat().st_size, sha256_file(new), "ADDED"
        else:
            assert old is not None
            old_size, old_hash, new_size, new_hash, change = old.stat().st_size, sha256_file(old), None, None, "DELETED"
        rows.append({
            "path": rel,
            "change": change,
            "classification": classify_delta(rel, product_paths),
            "beforeBytes": old_size,
            "beforeSha256": old_hash,
            "afterBytes": new_size,
            "afterSha256": new_hash,
        })
    counts: dict[str, int] = {}
    for row in rows:
        counts[row["classification"]] = counts.get(row["classification"], 0) + 1
    payload = {
        "schemaVersion": "velmere.p81r1.source-change-manifest.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_EXACT_PARENT_DELTA",
        "parentCheckpoint": "P80R1",
        "scopeExcludes": [CLOSURE_PREFIX + "* (self-generated closure receipts)"],
        "changeCount": len(rows),
        "classificationCounts": counts,
        "changes": rows,
        "scopeSummary": [
            "A server-only exact-block BSC JSON-RPC quorum accepts only eth_chainId, eth_blockNumber, eth_getBlockByNumber, eth_getCode and eth_call.",
            "Provider endpoints are server-configured; customer-supplied endpoints, credentials, query tokens, redirects, private/loopback addresses in live mode, DNS rebinding and non-HTTPS live endpoints fail closed.",
            "The quorum binds one exact block number/hash/parent/state root, target runtime digest, EIP-1167 implementation identity, implementation runtime digest, trusted-forwarder state and an inactive negative control across provider rows.",
            "Receipts bind request/response digest roots, provider/operator/family/correlation diversity, rights/currentness and HMAC integrity while excluding raw URLs, raw bytecode and raw provider responses.",
            "The result now propagates through claim ledger, neutral finding, customer projection and a narrowly allowlisted PDF evidence row.",
            "A real customer-projection defect was fixed: current-chain findings tied to claim-ledger were previously dropped because finding ids did not equal section ids.",
            "Current exploitability, independent replay, live RPC execution, source rights, staging database execution, exact Windows, Customer FINAL and Audit FINAL PDF remain withheld.",
        ],
        "zeroFakeCredit": {
            "customerFinal": "0/20",
            "auditFinalPdf": "0/3",
            "rights": "2/203 inherited only",
            "paidValue": "0/10",
            "saleEligible": "0/20",
            "live": False,
        },
    }
    write_json(out / "P81R1_SOURCE_CHANGE_MANIFEST.json", payload)
    return payload


def build_p75_current_receipt(root: Path) -> dict[str, Any]:
    source = root / "artifacts/p81/logs/p75_runtime.log"
    obj = json.loads(source.read_text(encoding="utf-8"))
    checks = obj.get("checks")
    if obj.get("status") != "PASS" or not isinstance(checks, list) or len(checks) != 37 or any(row.get("status") != "PASS" for row in checks):
        raise RuntimeError("p75_current_rerun_not_green")
    payload = {
        "schemaVersion": "velmere.p81.p75-advanced-automation-current-regression.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS",
        "sourceHarness": "scripts/p75/test-p75-advanced-automation-runtime.mjs",
        "command": "node --import ./scripts/pass11/register-offline-ts-loader.mjs ./scripts/p75/test-p75-advanced-automation-runtime.mjs",
        "runtime": {"node": subprocess.check_output(["node", "--version"], text=True).strip(), "platform": f"{platform.system().lower()} {platform.machine()}"},
        "checkCount": len(checks),
        "checks": checks,
        "zeroFakeCredit": obj.get("zeroFakeCredit"),
    }
    write_json(root / "receipts/p81/P75_ADVANCED_AUTOMATION_CURRENT_REGRESSION.json", payload)
    return payload


def build_typescript_receipt(root: Path, out: Path) -> dict[str, Any]:
    ts_log = out / "P81R1_TARGETED_TYPESCRIPT.log"
    imports_log = out / "P81R1_CHANGED_MODULE_IMPORTS.log"
    if not ts_log.is_file() or ts_log.read_text(encoding="utf-8", errors="replace").strip():
        raise RuntimeError("p81_targeted_typescript_not_clean")
    imports = imports_log.read_text(encoding="utf-8", errors="replace")
    expected_modules = [
        "lib/security/audit-current-deployment-readonly-quorum.ts",
        "lib/security/audit-claim-ledger.ts",
        "lib/security/audit-report-assembler.ts",
        "lib/security/audit-report-customer-projection.ts",
        "lib/security/pro-audit-pdf/render-pro-audit-pdf.ts",
        "lib/security/pro-audit-pdf/customer-safe-renderer.ts",
        "lib/security/audit-watch-post-handler.ts",
    ]
    imports_pass = "PASS 7/7" in imports and all(f"PASS ./{path}" in imports for path in expected_modules)
    if not imports_pass:
        raise RuntimeError("p81_changed_module_imports_not_green")
    payload = {
        "schemaVersion": "velmere.p81r1.local-typescript-diagnostic.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_TARGETED_NEW_MODULE_AND_CHANGED_RUNTIME_IMPORTS_WITHHELD_FULL_PROJECT",
        "targetedStrictTypeScript": {
            "status": "PASS",
            "command": "tsc --noEmit --target ES2022 --lib ES2022,DOM --module NodeNext --moduleResolution NodeNext --skipLibCheck --strict scripts/p81/p81-targeted-node-types.d.ts lib/security/audit-current-deployment-readonly-quorum.ts",
            "scope": ["scripts/p81/p81-targeted-node-types.d.ts", NEW_PRODUCT_FILE],
            "logPath": ts_log.relative_to(root).as_posix(),
            "logSha256": sha256_file(ts_log),
        },
        "changedRuntimeModuleImports": {
            "status": "PASS",
            "loader": "scripts/pass11/register-offline-ts-loader.mjs",
            "moduleCount": 7,
            "modules": expected_modules,
            "logPath": imports_log.relative_to(root).as_posix(),
            "logSha256": sha256_file(imports_log),
        },
        "environment": {
            "node": subprocess.check_output(["node", "--version"], text=True).strip(),
            "npm": subprocess.check_output(["npm", "--version"], text=True).strip(),
            "tsc": subprocess.check_output(["tsc", "--version"], text=True).strip().replace("Version ", ""),
            "platform": f"{platform.system().lower()} {platform.machine()}",
        },
        "fullProjectSemanticTypeScript": {"status": "WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING", "passCredit": False, "failureCredit": False},
        "eslint": {"status": "WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING", "passCredit": False, "failureCredit": False},
        "dualProductionBuild": {"status": "WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING", "passCredit": False, "failureCredit": False},
        "requiredExactLane": {"platform": "Windows Server 2025", "node": "24.18.0", "npm": "11.16.0", "status": "WITHHELD_ON_CURRENT_P81R1_BYTES"},
        "truthBoundary": "Strict targeted TypeScript covers the new P81 control-plane module and the offline loader imports every changed production module. SOURCE_ONLY has no installed project dependency graph and this host is not the exact Windows lane, so full semantic TypeScript, ESLint and dual-build credit remain withheld.",
    }
    write_json(out / "P81R1_LOCAL_TYPESCRIPT_DIAGNOSTIC.json", payload)
    return payload


def build_exact_pdf_rerun(root: Path, out: Path) -> dict[str, Any]:
    unit_source = root / "artifacts/p81/logs/pdf_delivery.log"
    integration_source = root / "artifacts/p81/logs/pdf_integration.log"
    unit_log = out / "P81R1_EXACT_PDF_UNIT_RERUN.log"
    integration_log = out / "P81R1_EXACT_PDF_INTEGRATION_RERUN.log"
    shutil.copyfile(unit_source, unit_log)
    shutil.copyfile(integration_source, integration_log)
    unit_text = unit_log.read_text(encoding="utf-8", errors="replace")
    integration_text = integration_log.read_text(encoding="utf-8", errors="replace")
    integration_receipt_path = root / "artifacts/closure/p36/P36_EXACT_CUSTOMER_PDF_INTEGRATION.json"
    integration = json.loads(integration_receipt_path.read_text(encoding="utf-8"))
    unit_pass = "Exact customer PDF delivery: PASS (22/22)" in unit_text and "# fail 0" in unit_text
    integration_pass = (
        integration.get("status") == "PASS_P36_EXACT_CUSTOMER_PDF_STORAGE_TO_DELIVERY_INTEGRATION"
        and integration.get("assertions") == 55
        and "# fail 0" in integration_text
    )
    payload = {
        "schemaVersion": "velmere.p81r1.exact-pdf-test-rerun.v1",
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
            "receiptSha256": sha256_file(integration_receipt_path),
            "logPath": integration_log.relative_to(root).as_posix(),
            "logSha256": sha256_file(integration_log),
            "durableDatabaseExecuted": False,
            "deployedHttpExecuted": False,
        },
        "zeroFakeCredit": {
            "customerFinal": "0/20",
            "auditFinalPdf": "0/3",
            "productionDatabaseExecution": "WITHHELD",
            "deployedHttpExecution": "WITHHELD",
            "exactWindows": "WITHHELD",
        },
    }
    if payload["status"] != "PASS":
        raise RuntimeError("p81_exact_pdf_regression_not_green")
    write_json(out / "P81R1_EXACT_PDF_TEST_RERUN.json", payload)
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


def build_test_aggregate(root: Path, out: Path, exact_pdf: dict[str, Any]) -> dict[str, Any]:
    controls_spec = [
        ("P81 current deployment read-only quorum runtime", "receipts/p81/P81_CURRENT_DEPLOYMENT_READONLY_QUORUM_RUNTIME.json"),
        ("P81 current deployment read-only quorum static", "receipts/p81/P81_CURRENT_DEPLOYMENT_READONLY_QUORUM_STATIC.json"),
        ("P80 Audit exact immutable artifact runtime regression", "receipts/p80/P80_AUDIT_EXACT_IMMUTABLE_ACCOUNT_ARTIFACT_RUNTIME.json"),
        ("P80 Audit exact immutable artifact static regression", "receipts/p80/P80_AUDIT_EXACT_IMMUTABLE_ACCOUNT_ARTIFACT_STATIC.json"),
        ("P79 historical deployment customer-path runtime regression", "receipts/p79/P79_HISTORICAL_DEPLOYMENT_CUSTOMER_PATH_RUNTIME.json"),
        ("P79 customer-path static regression", "receipts/p79/P79_CUSTOMER_PATH_STATIC.json"),
        ("P78 private provider evidence runtime regression", "receipts/p78/P78_PRIVATE_PROVIDER_EVIDENCE_RUNTIME.json"),
        ("P78 standard-json customer-path runtime regression", "receipts/p78/P78_STANDARD_JSON_CUSTOMER_PATH_RUNTIME.json"),
        ("P78 thirdweb development micro-corpus runtime regression", "receipts/p78/P78_THIRDWEB_DEVELOPMENT_MICRO_CORPUS_RUNTIME.json"),
        ("P78 real-audit dataflow static regression", "receipts/p78/P78_REAL_AUDIT_DATAFLOW_STATIC.json"),
        ("P78R3 customer-path static regression", "receipts/p78/P78R3_CUSTOMER_PATH_STATIC.json"),
        ("P77 deterministic delivery current static regression", "receipts/p81/P77_DETERMINISTIC_DELIVERY_CURRENT_STATIC.json"),
        ("P75 Advanced automation current regression", "receipts/p81/P75_ADVANCED_AUTOMATION_CURRENT_REGRESSION.json"),
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
            "path": "artifacts/closure/p81r1/P81R1_EXACT_PDF_TEST_RERUN.json#unit",
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
    total = sum(int(row["checks"]) for row in controls)
    failed = [row["label"] for row in controls if not row["passed"]]
    if total != 1082:
        raise RuntimeError(f"unexpected_aggregate_check_count:{total}")
    payload = {
        "schemaVersion": "velmere.p81r1.test-aggregate.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS" if not failed else "FAIL",
        "controls": controls,
        "aggregateExecutedChecksAcrossOverlappingHarnesses": total,
        "aggregateIndependenceClaim": False,
        "failedControls": failed,
        "truthBoundary": "1082 is a sum across overlapping runtime, static and regression controls. It is not independent evidence count, detector accuracy, provider independence, real-customer coverage, Customer FINAL rows or Audit FINAL PDFs.",
    }
    if failed:
        raise RuntimeError(f"failed_controls:{failed}")
    write_json(out / "P81R1_TEST_AGGREGATE.json", payload)
    return payload


def build_secret_scan(root: Path, source_delta: dict[str, Any], out: Path) -> dict[str, Any]:
    candidate_classes = {
        "CURRENT_PRODUCT_BUILD_RELEVANT",
        "P81_HARNESS_OR_CLOSURE_SOURCE",
        "REGRESSION_HARNESS_REPAIR",
        "CONTROL_PLANE_POINTER",
    }
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
    matches: list[dict[str, Any]] = []
    for rel in scope:
        data = (root / rel).read_bytes()
        for name, pattern in patterns.items():
            for match in pattern.finditer(data):
                matches.append({"path": rel, "pattern": name, "offset": match.start()})
    payload = {
        "schemaVersion": "velmere.p81r1.targeted-secret-scan.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS" if not matches else "FAIL",
        "scope": scope,
        "patterns": list(patterns),
        "matches": len(matches),
        "rows": matches,
        "truthBoundary": "Targeted scan covers P81 product/control/harness changes. Test-only HMAC sentinel text is not a production credential. This does not replace the canonical full-tree exact-Windows secret gate.",
    }
    if matches:
        raise RuntimeError(f"targeted_secret_matches:{matches}")
    write_json(out / "P81R1_TARGETED_SECRET_SCAN.json", payload)
    return payload


def build_checkpoint(
    root: Path,
    out: Path,
    projection: dict[str, Any],
    source_delta: dict[str, Any],
    typescript: dict[str, Any],
    aggregate: dict[str, Any],
    secret_scan: dict[str, Any],
) -> dict[str, Any]:
    fixture = json.loads((root / "artifacts/p81/P81_LOCAL_READONLY_QUORUM_FIXTURE_RECEIPT.json").read_text(encoding="utf-8"))
    payload = {
        "schemaVersion": "velmere.p81r1.checkpoint-receipt.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_BOUNDED_P81R1_CURRENT_DEPLOYMENT_EXACT_BLOCK_READONLY_QUORUM_CONTROL_PLANE",
        "authority": "V17_UNCHANGED",
        "parentCheckpoint": "P80R1",
        "parentBindings": {
            "directiveSha256": DIRECTIVE_SHA256,
            "p80r1LedgerSha256": P80_LEDGER_SHA256,
            "p80r1SourceZipSha256": P80_SOURCE_ZIP_SHA256,
            "p80r1SourceZipBytes": P80_SOURCE_ZIP_BYTES,
            "p80r1SourceZipEntries": P80_SOURCE_ZIP_ENTRIES,
        },
        "currentProductProjectionCandidate": projection["currentCandidateProjection"],
        "physicalChanges": {
            "deltaFilesOutsideSelfGeneratedClosure": source_delta["changeCount"],
            "buildRelevantChangedFiles": projection["delta"]["changedBuildRelevantFiles"],
            "readOnlyRpcMethods": ["eth_chainId", "eth_blockNumber", "eth_getBlockByNumber", "eth_getCode", "eth_call"],
            "transactionOrSigningMethodsAllowed": False,
            "customerSuppliedRpcEndpointAccepted": False,
            "exactBlockHeaderConsensusRequired": True,
            "proxyImplementationConsensusRequired": True,
            "trustedForwarderAndNegativeControlRequired": True,
            "providerRightsAndCurrentnessRequiredForCustomerFact": True,
            "receiptHmacIntegrity": True,
            "rawRpcUrlBytecodeResponseRedistributed": False,
            "customerProjectionCurrentChainFindingDropFixed": True,
            "pdfAllowlistNarrowClosedRowOnly": True,
            "liveExternalRpcExecuted": False,
        },
        "localDeterministicFixture": {
            "classification": fixture["executionClass"],
            "transportClass": fixture["transportClass"],
            "technicalClassification": fixture["classification"],
            "snapshotBlock": fixture["snapshot"]["blockNumber"],
            "providerRows": len(fixture["providers"]),
            "rpcMethodCount": fixture["rpc"]["methodCount"],
            "exactBlockConsensusProvenInsideFixture": fixture["proof"]["exactBlockConsensusProven"],
            "currentRuntimeStateProvenInsideFixture": fixture["proof"]["currentRuntimeStateProven"],
            "currentTrustedForwarderStateProvenInsideFixture": fixture["proof"]["currentTrustedForwarderStateProven"],
            "customerCurrentFactEligible": fixture["customerCurrentRuntimeFactEligible"],
            "customerFinalEligible": fixture["customerFinalEligible"],
            "currentExploitabilityProven": fixture["proof"]["currentExploitabilityProven"],
            "independentReplayProven": fixture["proof"]["independentReplayProven"],
        },
        "controls": aggregate["controls"],
        "aggregateExecutedChecksAcrossOverlappingHarnesses": aggregate["aggregateExecutedChecksAcrossOverlappingHarnesses"],
        "aggregateIndependenceClaim": False,
        "securityBoundaries": {
            "readOnlyOnly": "PASS_LOCAL_CONTROL_PLANE",
            "rpcMethodInjection": "REJECTED",
            "customerEndpointInjection": "REJECTED",
            "ssrfPrivateLoopbackDnsRebindingLiveMode": "REJECTED",
            "providerSemanticConflict": "FAIL_CLOSED",
            "malformedBooleanAndNegativeControl": "FAIL_CLOSED",
            "receiptTamperWrongKeyRecomputedDigest": "REJECTED",
            "rawEndpointRuntimeImplementationResponseLeakage": "ABSENT",
            "currentExploitabilityPromotion": "REJECTED",
            "customerFinalPromotion": "REJECTED",
            "noLiveExploitOrStateChangingTransaction": True,
        },
        "environment": {
            "localNode": typescript["environment"]["node"],
            "localNpm": typescript["environment"]["npm"],
            "localTsc": typescript["environment"]["tsc"],
            "platform": typescript["environment"]["platform"],
            "networkedLiveRpcAvailable": False,
            "semanticTypeScriptCurrentBytes": typescript["fullProjectSemanticTypeScript"]["status"],
            "eslintCurrentBytes": typescript["eslint"]["status"],
            "dualProductionBuildCurrentBytes": typescript["dualProductionBuild"]["status"],
            "exactWindowsCurrentBytes": "WITHHELD",
        },
        "targetedSecretScan": {"status": secret_scan["status"], "matches": secret_scan["matches"]},
        "currentGroundTruthBoundary": {
            "historicalP79FactRetained": True,
            "liveExternalRpcQuorumExecuted": False,
            "currentRuntimeStateProven": False,
            "currentProxyImplementationProven": False,
            "currentTrustedForwarderStateProven": False,
            "currentExploitabilityProven": False,
            "independentVelmereReplayProven": False,
            "customerCurrentFactEligible": False,
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
        "nextBlockingMilestone": "Run the P81 control plane in an authorized networked environment against at least three rights-bound independent BSC providers, bind and independently verify the exact-block receipt, then complete authorized archival replay, P80 staging DB/RLS/trigger execution, real immutable Audit artifact/PDF bytes and exact Windows on successor bytes.",
        "truthBoundary": "P81R1 proves the read-only exact-block current-deployment quorum control plane and its customer-safe propagation using only deterministic local fixtures. It performs no external RPC, transaction, exploit or replay and grants no current deployment fact, exploitability, source-rights, Customer FINAL or Audit FINAL PDF credit.",
    }
    write_json(out / "P81R1_CHECKPOINT_RECEIPT.json", payload)
    return payload


def write_package_recipe(root: Path, out: Path) -> dict[str, Any]:
    files_without_identity = [p for p in root.rglob("*") if p.is_file() and p.relative_to(root).as_posix() != IDENTITY_REL]
    payload = {
        "schemaVersion": "velmere.p81r1.deterministic-package-recipe.v1",
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
        "expectedEntryCountIncludingIdentityReceipt": len(files_without_identity) + 1,
        "ledgerInsideZip": False,
        "identityReceipt": IDENTITY_REL,
        "identityReceiptExcludesOnlySelf": True,
        "truthBoundary": "Recipe describes deterministic SOURCE_ONLY packaging. Package bytes/hash are verified externally after two independent builds and cannot be self-referenced inside the ZIP.",
    }
    write_json(out / "P81R1_PACKAGE_BUILD_RECIPE.json", payload)
    return payload


def preidentity(root: Path, parent: Path) -> None:
    out = root / CLOSURE_PREFIX
    out.mkdir(parents=True, exist_ok=True)
    identity = root / IDENTITY_REL
    if identity.exists():
        identity.unlink()
    build_p75_current_receipt(root)
    projection = build_product_projection(root, parent, out)
    product_paths = {row["path"] for row in projection["files"]}
    typescript = build_typescript_receipt(root, out)
    exact_pdf = build_exact_pdf_rerun(root, out)
    aggregate = build_test_aggregate(root, out, exact_pdf)
    source_delta = build_source_delta(root, parent, product_paths, out)
    secret_scan = build_secret_scan(root, source_delta, out)
    build_checkpoint(root, out, projection, source_delta, typescript, aggregate, secret_scan)
    write_package_recipe(root, out)
    # Repeat after all non-self closure outputs and the generated P75 receipt are stable.
    source_delta = build_source_delta(root, parent, product_paths, out)
    secret_scan = build_secret_scan(root, source_delta, out)
    build_checkpoint(root, out, projection, source_delta, typescript, aggregate, secret_scan)
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
        if path.is_symlink():
            raise RuntimeError(f"symlink_not_allowed:{rel}")
        rows.append({"path": rel, "byteLength": path.stat().st_size, "sha256": sha256_file(path)})
    summary = canonical_projection(rows)
    payload = {
        "schemaVersion": "velmere.p81r1.source-tree-identity-excluding-self.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS",
        "scopeExcludesOnly": IDENTITY_REL,
        **summary,
        "fullPackageFileCountIncludingThisIdentityFile": summary["fileCount"] + 1,
        "truthBoundary": "This hashes the complete P81R1 SOURCE_ONLY tree before ZIP packaging, excluding only this self-referential identity receipt.",
    }
    write_json(out_path, payload)
    recipe_path = root / CLOSURE_PREFIX / "P81R1_PACKAGE_BUILD_RECIPE.json"
    recipe = json.loads(recipe_path.read_text(encoding="utf-8"))
    if recipe["expectedEntryCountIncludingIdentityReceipt"] != payload["fullPackageFileCountIncludingThisIdentityFile"]:
        raise RuntimeError("package_recipe_entry_count_mismatch")
    print(json.dumps(payload, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("phase", choices=["preidentity", "identity"])
    parser.add_argument("--root", default=".")
    parser.add_argument("--parent", default="/mnt/data/velmere_p80_parent")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    parent = Path(args.parent).resolve()
    if args.phase == "preidentity":
        preidentity(root, parent)
    else:
        identity(root)


if __name__ == "__main__":
    main()
