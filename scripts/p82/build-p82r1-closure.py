#!/usr/bin/env python3
"""Build bounded P82R1 closure receipts without granting live/current/FINAL credit."""
from __future__ import annotations

import argparse
import hashlib
import json
import platform
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any

GENERATED_AT = "2026-08-19T21:55:00Z"
DIRECTIVE_FILE = "VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt"
DIRECTIVE_SHA256 = "de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05"
P81_LEDGER_SHA256 = "bb28ab5e7d6ddee08f76762b0c7a5259abf56acecb876dcbaa35b29271cde276"
P81_LEDGER_BYTES = 27_410
P81_SOURCE_ZIP_SHA256 = "f9f67f4288d89441679a4422c8befeb05edfb7957d75fb44af089024c129f8a5"
P81_SOURCE_ZIP_BYTES = 214_044_294
P81_SOURCE_ZIP_ENTRIES = 8_099
P81_PRODUCT = {
    "fileCount": 1606,
    "payloadBytes": 21_197_379,
    "pathSetSha256": "fc6e0634d8abac69dbbc58b3b3f71a3a34e1ed2bcf518e91c14bbc974a5e8c80",
    "sourceContentAggregateSha256": "8e8df827e3d66ba536882864e8fe8151bb73ee2ab7df286b792aef72859857ee",
}
NEW_PRODUCT_FILE = "lib/security/audit-current-deployment-readonly-quorum-v2.ts"
FROZEN_P81_MODULE = "lib/security/audit-current-deployment-readonly-quorum.ts"
FROZEN_P81_SHA256 = "b57626a51dae911a277520cce849d5d3d2c63d1af79bf80059d278514386df06"
IDENTITY_REL = "artifacts/closure/p82r1/P82R1_TREE_IDENTITY_EXCLUDING_SELF.json"
CLOSURE_PREFIX = "artifacts/closure/p82r1/"
OUTPUT_NAME = "VELMERE_R44P46_V17_P82R1_SUCCESSFUL_QUORUM_DIVERSITY_PINNED_NETWORK_CANONICAL_BINDING_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-19.zip"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(4 * 1024 * 1024), b""):
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
    parent_manifest_path = parent / "artifacts/closure/p81r1/P81R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json"
    parent_manifest = json.loads(parent_manifest_path.read_text(encoding="utf-8"))
    base_paths = [row["path"] for row in parent_manifest["files"]]
    if len(base_paths) != len(set(base_paths)):
        raise RuntimeError("p81_projection_duplicate_paths")
    parent_rows = [file_row(parent, rel) for rel in sorted(base_paths)]
    parent_summary = canonical_projection(parent_rows)
    if parent_summary != P81_PRODUCT:
        raise RuntimeError(f"p81_projection_reconstruction_mismatch:{parent_summary}")
    if (parent / NEW_PRODUCT_FILE).exists():
        raise RuntimeError("p82_v2_module_unexpectedly_present_in_parent")
    if sha256_file(root / FROZEN_P81_MODULE) != FROZEN_P81_SHA256:
        raise RuntimeError("frozen_p81_module_changed")

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

    expected_changed = {
        "lib/security/audit-claim-ledger.ts",
        NEW_PRODUCT_FILE,
        "lib/security/audit-watch-post-handler.ts",
    }
    actual_changed = {row["path"] for row in changed}
    if actual_changed != expected_changed:
        raise RuntimeError(f"unexpected_product_projection_delta:{sorted(actual_changed)}")

    payload = {
        "schemaVersion": "velmere.p82r1.current-product-projection-manifest.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY",
        "parentCheckpoint": "P81R1",
        "parentProjectionReconstructedExactly": True,
        "parentProjection": parent_summary,
        "currentCandidateProjection": current_summary,
        "delta": {
            "fileCount": current_summary["fileCount"] - parent_summary["fileCount"],
            "payloadBytes": current_summary["payloadBytes"] - parent_summary["payloadBytes"],
            "changedBuildRelevantFiles": len(changed),
        },
        "changedBuildRelevantFiles": changed,
        "frozenCompatibilityBoundary": {
            "p81Module": FROZEN_P81_MODULE,
            "p81ModuleSha256": FROZEN_P81_SHA256,
            "p81ReceiptSchemaAcceptedOnlyByP81Verifier": True,
            "p82ReceiptSchema": "velmere.p82.current-deployment-readonly-quorum-receipt.v2",
            "p82EngineId": "p82-current-deployment-readonly-quorum.v2",
        },
        "files": current_rows,
        "exactWindowsCredit": False,
        "truthBoundary": "P82R1 reconstructs the exact P81R1 product projection, preserves the frozen P81 v1 engine, adds the separate P82 v2 engine and hashes the three build-relevant changes. This is local source identity only, not an exact-Windows build receipt and not current BSC evidence.",
    }
    write_json(out / "P82R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json", payload)
    return payload


def classify_delta(rel: str, product_paths: set[str]) -> str:
    if rel in product_paths:
        return "CURRENT_PRODUCT_BUILD_RELEVANT"
    if rel == "VELMERE_ACTIVE_PASS.txt":
        return "CONTROL_PLANE_POINTER"
    if rel.startswith("scripts/p82/"):
        return "P82_HARNESS_OR_CLOSURE_SOURCE"
    if rel == "scripts/p78/test-p78-static.py":
        return "REGRESSION_HARNESS_MIGRATION"
    if rel.startswith("receipts/p82/"):
        return "P82_CURRENT_RUNTIME_STATIC_OR_REGRESSION_RECEIPT"
    if rel.startswith("artifacts/p82/"):
        return "P82_LOCAL_PROOF_OR_LOG"
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
    if any(row["change"] == "DELETED" for row in rows):
        raise RuntimeError("unexpected_parent_file_deletion")

    payload = {
        "schemaVersion": "velmere.p82r1.source-change-manifest.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_EXACT_PARENT_DELTA",
        "parentCheckpoint": "P81R1",
        "scopeExcludes": [CLOSURE_PREFIX + "* (self-generated closure receipts)"],
        "changeCount": len(rows),
        "classificationCounts": counts,
        "changes": rows,
        "scopeSummary": [
            "Provider independence is now evaluated on the providers that actually contributed successful evidence at each proof stage, not merely on the configured provider inventory.",
            "Head, snapshot/runtime, implementation and proxy/forwarder stages each require their own successful-subset count, operator, family, correlation-group and endpoint-identity diversity.",
            "Partial implementation evidence can no longer promote currentProxyImplementationProven or any customer-visible current fact.",
            "Historical runtime, implementation and trusted-forwarder relations are compared against the complete immutable P79 canonical record rather than syntactic values supplied by the caller.",
            "The public HTTPS transport pins the validated public IP into the socket lookup, preserves hostname TLS verification and rejects a connected address outside the prevalidated set, closing the DNS preflight-to-connect TOCTOU/rebinding window.",
            "Response streaming is capped, non-identity content encoding is rejected, redirects remain disabled and the connected-address digest is bound into the receipt.",
            "The frozen P81 v1 module and verifier remain byte-identical; P82 uses a new v2 engine/schema and rejects cross-version receipt promotion in the production claim ledger.",
            "The official public BSC connectivity-only probe could not resolve DNS in this environment and earns no live/current/provider-quorum credit.",
            "No transaction, signing, state change, exploit or weaponized proof was executed.",
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
    write_json(out / "P82R1_SOURCE_CHANGE_MANIFEST.json", payload)
    return payload


def build_typescript_receipt(root: Path, out: Path) -> dict[str, Any]:
    ts_log = out / "P82R1_TARGETED_TYPESCRIPT.log"
    imports_log = out / "P82R1_CHANGED_MODULE_IMPORTS.log"
    if not ts_log.is_file() or ts_log.read_text(encoding="utf-8", errors="replace").strip():
        raise RuntimeError("p82_targeted_typescript_not_clean")
    imports = imports_log.read_text(encoding="utf-8", errors="replace")
    expected_modules = [
        FROZEN_P81_MODULE,
        NEW_PRODUCT_FILE,
        "lib/security/audit-claim-ledger.ts",
        "lib/security/audit-report-assembler.ts",
        "lib/security/audit-report-customer-projection.ts",
        "lib/security/pro-audit-pdf/customer-safe-renderer.ts",
        "lib/security/pro-audit-pdf/render-pro-audit-pdf.ts",
        "lib/security/audit-watch-post-handler.ts",
    ]
    imports_pass = "PASS (8/8)" in imports and all(f"PASS ./{path}" in imports for path in expected_modules)
    if not imports_pass:
        raise RuntimeError("p82_changed_module_imports_not_green")
    payload = {
        "schemaVersion": "velmere.p82r1.local-typescript-diagnostic.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_TARGETED_V2_AND_CURRENT_RUNTIME_IMPORTS_WITHHELD_FULL_PROJECT",
        "targetedStrictTypeScript": {
            "status": "PASS",
            "command": "tsc --noEmit --target ES2022 --lib ES2022,DOM --module NodeNext --moduleResolution NodeNext --skipLibCheck --strict scripts/p82/p82-targeted-node-types.d.ts lib/security/audit-current-deployment-readonly-quorum-v2.ts",
            "scope": ["scripts/p82/p82-targeted-node-types.d.ts", NEW_PRODUCT_FILE],
            "logPath": ts_log.relative_to(root).as_posix(),
            "logSha256": sha256_file(ts_log),
        },
        "currentRuntimeModuleImports": {
            "status": "PASS",
            "loader": "scripts/pass11/register-offline-ts-loader.mjs",
            "moduleCount": 8,
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
        "requiredExactLane": {"platform": "Windows Server 2025", "node": "24.18.0", "npm": "11.16.0", "status": "WITHHELD_ON_CURRENT_P82R1_BYTES"},
        "truthBoundary": "Strict targeted TypeScript covers the new P82 v2 control plane and the offline loader imports the frozen compatibility module plus all current customer-path modules. SOURCE_ONLY has no installed full dependency graph and this host is not the exact Windows lane.",
    }
    write_json(out / "P82R1_LOCAL_TYPESCRIPT_DIAGNOSTIC.json", payload)
    return payload


def build_exact_pdf_rerun(root: Path, out: Path) -> dict[str, Any]:
    unit_source = root / "artifacts/p82/logs/pdf_unit.log"
    integration_source = root / "artifacts/p82/logs/pdf_integration.log"
    unit_log = out / "P82R1_EXACT_PDF_UNIT_RERUN.log"
    integration_log = out / "P82R1_EXACT_PDF_INTEGRATION_RERUN.log"
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
        "schemaVersion": "velmere.p82r1.exact-pdf-test-rerun.v1",
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
        raise RuntimeError("p82_exact_pdf_regression_not_green")
    write_json(out / "P82R1_EXACT_PDF_TEST_RERUN.json", payload)
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
        ("P82 successful-subset quorum integrity runtime", "receipts/p82/P82_SUCCESSFUL_QUORUM_INTEGRITY_RUNTIME.json"),
        ("P82 successful-subset quorum integrity static", "receipts/p82/P82_SUCCESSFUL_QUORUM_INTEGRITY_STATIC.json"),
        ("P80 Audit immutable artifact runtime current regression", "receipts/p82/P80_AUDIT_EXACT_IMMUTABLE_ACCOUNT_ARTIFACT_CURRENT_REGRESSION.json"),
        ("P80 Audit immutable artifact static current regression", "receipts/p82/P80_AUDIT_EXACT_IMMUTABLE_ACCOUNT_ARTIFACT_STATIC_CURRENT_REGRESSION.json"),
        ("P79 historical deployment customer-path runtime current regression", "receipts/p82/P79_HISTORICAL_DEPLOYMENT_CUSTOMER_PATH_CURRENT_REGRESSION.json"),
        ("P79 customer-path static regression", "receipts/p79/P79_CUSTOMER_PATH_STATIC.json"),
        ("P78 private provider evidence runtime current regression", "receipts/p82/P78_PRIVATE_PROVIDER_EVIDENCE_CURRENT_REGRESSION.json"),
        ("P78 standard-json customer-path runtime current regression", "receipts/p82/P78_STANDARD_JSON_CUSTOMER_PATH_CURRENT_REGRESSION.json"),
        ("P78 thirdweb development micro-corpus runtime regression", "receipts/p78/P78_THIRDWEB_DEVELOPMENT_MICRO_CORPUS_RUNTIME.json"),
        ("P78 real-audit dataflow static regression", "receipts/p78/P78_REAL_AUDIT_DATAFLOW_STATIC.json"),
        ("P78R3 customer-path static regression", "receipts/p78/P78R3_CUSTOMER_PATH_STATIC.json"),
        ("P77 deterministic delivery current static regression", "receipts/p82/P77_DETERMINISTIC_DELIVERY_CURRENT_STATIC_REGRESSION.json"),
        ("P75 Advanced automation current regression", "receipts/p82/P75_ADVANCED_AUTOMATION_CURRENT_REGRESSION.json"),
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
            "path": "artifacts/closure/p82r1/P82R1_EXACT_PDF_TEST_RERUN.json#unit",
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
    if total != 1009:
        raise RuntimeError(f"unexpected_aggregate_check_count:{total}")
    payload = {
        "schemaVersion": "velmere.p82r1.test-aggregate.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS" if not failed else "FAIL",
        "controls": controls,
        "aggregateExecutedChecksAcrossOverlappingHarnesses": total,
        "aggregateIndependenceClaim": False,
        "failedControls": failed,
        "truthBoundary": "1009 is a sum across overlapping runtime, static, migration and regression controls. It is not independent evidence count, detector accuracy, provider independence, real-customer coverage, Customer FINAL rows or Audit FINAL PDFs.",
    }
    if failed:
        raise RuntimeError(f"failed_controls:{failed}")
    write_json(out / "P82R1_TEST_AGGREGATE.json", payload)
    return payload


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


def scan_path(path: Path) -> list[dict[str, Any]]:
    data = path.read_bytes()
    findings: list[dict[str, Any]] = []
    pem = PRIVATE_KEY_BLOCK_RE.search(data)
    if pem:
        findings.append({"pattern": "private_key_block", "offsetApprox": pem.start()})
    for name, pattern in TOKEN_PATTERNS.items():
        for match in pattern.finditer(data):
            findings.append({"pattern": name, "offsetApprox": match.start()})
    return findings


def build_secret_scan(root: Path, source_delta: dict[str, Any], out: Path) -> dict[str, Any]:
    candidates = []
    findings: list[dict[str, Any]] = []
    for row in source_delta["changes"]:
        if row["change"] == "DELETED":
            continue
        rel = row["path"]
        path = root / rel
        candidates.append(rel)
        for finding in scan_path(path):
            findings.append({"path": rel, **finding})
    payload = {
        "schemaVersion": "velmere.p82r1.targeted-secret-scan.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS" if not findings else "FAIL",
        "scannedChangedFiles": len(candidates),
        "patterns": sorted(["private_key_block", *TOKEN_PATTERNS.keys()]),
        "matches": len(findings),
        "findings": findings,
        "truthBoundary": "This targeted scan covers every changed/non-deleted P82R1 parent-delta file. The deterministic package builder separately scans the complete SOURCE_ONLY tree before packaging.",
    }
    if findings:
        raise RuntimeError(f"p82_targeted_secret_findings:{findings[:10]}")
    write_json(out / "P82R1_TARGETED_SECRET_SCAN.json", payload)
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
    runtime = json.loads((root / "receipts/p82/P82_SUCCESSFUL_QUORUM_INTEGRITY_RUNTIME.json").read_text(encoding="utf-8"))
    fixture = json.loads((root / "artifacts/p82/P82_LOCAL_READONLY_QUORUM_HARDENING_FIXTURE_RECEIPT.json").read_text(encoding="utf-8"))
    network = json.loads((root / "artifacts/p82/P82_OFFICIAL_BSC_CONNECTIVITY_BOUNDARY.json").read_text(encoding="utf-8"))
    payload = {
        "schemaVersion": "velmere.p82r1.checkpoint-receipt.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS_BOUNDED_P82R1_SUCCESSFUL_QUORUM_DIVERSITY_PINNED_NETWORK_CANONICAL_BINDING",
        "canonicalBinding": {
            "directiveFile": DIRECTIVE_FILE,
            "directiveSha256": DIRECTIVE_SHA256,
            "directiveChanged": False,
            "parentCheckpoint": "P81R1",
            "parentLedgerSha256": P81_LEDGER_SHA256,
            "parentLedgerBytes": P81_LEDGER_BYTES,
            "parentSourceOnlySha256": P81_SOURCE_ZIP_SHA256,
            "parentSourceOnlyBytes": P81_SOURCE_ZIP_BYTES,
            "parentSourceOnlyEntries": P81_SOURCE_ZIP_ENTRIES,
        },
        "productProjection": projection["currentCandidateProjection"],
        "physicalChanges": {
            "deltaFilesOutsideSelfGeneratedClosure": source_delta["changeCount"],
            "buildRelevantChangedFiles": projection["delta"]["changedBuildRelevantFiles"],
            "configuredProviderDiversityAloneSufficient": False,
            "successfulSubsetDiversityRequiredPerStage": True,
            "successfulSubsetStages": ["head", "snapshot_runtime", "implementation", "proxy_forwarder"],
            "canonicalP79RecordRelationVerification": True,
            "partialImplementationPromotionRejected": True,
            "dnsPreflightToConnectPinned": True,
            "tlsHostnameVerificationRetained": True,
            "connectedAddressBoundToReceipt": True,
            "redirectsAllowed": False,
            "nonIdentityContentEncodingAllowed": False,
            "streamingResponseCap": True,
            "p81V1ModuleFrozenByteIdentical": True,
            "p82V2EngineAndSchemaSeparated": True,
            "crossVersionPromotionRejected": True,
            "transactionOrSigningMethodsAllowed": False,
            "customerSuppliedRpcEndpointAccepted": False,
            "rawRpcUrlBytecodeResponseRedistributed": False,
        },
        "localDeterministicFixture": {
            "engineId": fixture["engineId"],
            "schemaVersion": fixture["schemaVersion"],
            "classification": fixture["executionClass"],
            "transportClass": fixture["transportClass"],
            "technicalClassification": fixture["classification"],
            "providerRows": len(fixture["providers"]),
            "rpcMethodCount": fixture["rpc"]["methodCount"],
            "currentRuntimeStateProvenInsideFixture": fixture["proof"]["currentRuntimeStateProven"],
            "currentProxyImplementationProvenInsideFixture": fixture["proof"]["currentProxyImplementationProven"],
            "currentTrustedForwarderStateProvenInsideFixture": fixture["proof"]["currentTrustedForwarderStateProven"],
            "customerCurrentFactEligible": fixture["customerCurrentRuntimeFactEligible"],
            "currentExploitabilityProven": fixture["proof"]["currentExploitabilityProven"],
            "independentReplayProven": fixture["proof"]["independentReplayProven"],
            "customerFinalEligible": fixture["customerFinalEligible"],
        },
        "officialBscConnectivityBoundary": network,
        "controls": aggregate["controls"],
        "aggregateExecutedChecksAcrossOverlappingHarnesses": aggregate["aggregateExecutedChecksAcrossOverlappingHarnesses"],
        "aggregateIndependenceClaim": False,
        "environment": {
            "localNode": typescript["environment"]["node"],
            "localNpm": typescript["environment"]["npm"],
            "localTsc": typescript["environment"]["tsc"],
            "platform": typescript["environment"]["platform"],
            "networkedLiveRpcQuorumExecuted": False,
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
        "nextBlockingMilestone": "Run the P82 v2 control plane in an authorized networked environment against at least three genuinely independent, rights-bound BSC providers; independently verify the signed exact-block receipt; then complete the authorized archival replay, P80 staging database/RLS/trigger execution, real immutable Audit/PDF delivery proof and exact Windows on successor bytes.",
        "truthBoundary": "P82R1 proves successful-contributor quorum integrity, canonical relation binding, pinned public transport and cross-version receipt isolation using deterministic local fixtures. DNS/network restrictions prevented a live provider quorum. No transaction, exploit or state change was performed, and no current BSC fact, rights expansion, Customer FINAL or Audit FINAL PDF credit is granted.",
    }
    if runtime.get("checkCount") != 167:
        raise RuntimeError("p82_runtime_receipt_count_mismatch")
    write_json(out / "P82R1_CHECKPOINT_RECEIPT.json", payload)
    return payload


def write_package_recipe(root: Path, out: Path) -> dict[str, Any]:
    files_without_identity = [p for p in root.rglob("*") if p.is_file() and p.relative_to(root).as_posix() != IDENTITY_REL]
    payload = {
        "schemaVersion": "velmere.p82r1.deterministic-package-recipe.v1",
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
        "truthBoundary": "Recipe describes deterministic SOURCE_ONLY packaging. Package bytes/hash are verified after two independent builds and cannot be self-referenced inside the ZIP.",
    }
    write_json(out / "P82R1_PACKAGE_BUILD_RECIPE.json", payload)
    return payload


def preidentity(root: Path, parent: Path) -> None:
    out = root / CLOSURE_PREFIX
    out.mkdir(parents=True, exist_ok=True)
    identity_path = root / IDENTITY_REL
    if identity_path.exists():
        identity_path.unlink()
    projection = build_product_projection(root, parent, out)
    product_paths = {row["path"] for row in projection["files"]}
    typescript = build_typescript_receipt(root, out)
    exact_pdf = build_exact_pdf_rerun(root, out)
    aggregate = build_test_aggregate(root, out, exact_pdf)
    source_delta = build_source_delta(root, parent, product_paths, out)
    secret_scan = build_secret_scan(root, source_delta, out)
    build_checkpoint(root, out, projection, source_delta, typescript, aggregate, secret_scan)
    write_package_recipe(root, out)
    # Regenerate delta/scan/checkpoint/recipe after all non-self closure outputs are stable.
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
        if rel.endswith(".pyc") or "/__pycache__/" in f"/{rel}/":
            raise RuntimeError(f"python_cache_not_allowed:{rel}")
        rows.append({"path": rel, "byteLength": path.stat().st_size, "sha256": sha256_file(path)})
    summary = canonical_projection(rows)
    payload = {
        "schemaVersion": "velmere.p82r1.source-tree-identity-excluding-self.v1",
        "generatedAt": GENERATED_AT,
        "status": "PASS",
        "scopeExcludesOnly": IDENTITY_REL,
        **summary,
        "fullPackageFileCountIncludingThisIdentityFile": summary["fileCount"] + 1,
        "truthBoundary": "This hashes the complete P82R1 SOURCE_ONLY tree before ZIP packaging, excluding only this self-referential identity receipt.",
    }
    write_json(out_path, payload)
    recipe_path = root / CLOSURE_PREFIX / "P82R1_PACKAGE_BUILD_RECIPE.json"
    recipe = json.loads(recipe_path.read_text(encoding="utf-8"))
    if recipe["expectedEntryCountIncludingIdentityReceipt"] != payload["fullPackageFileCountIncludingThisIdentityFile"]:
        raise RuntimeError("package_recipe_entry_count_mismatch")
    print(json.dumps(payload, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("phase", choices=["preidentity", "identity"])
    parser.add_argument("--root", default=".")
    parser.add_argument("--parent", default="/mnt/data/velmere_p82_work/parent_clean")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    parent = Path(args.parent).resolve()
    if args.phase == "preidentity":
        preidentity(root, parent)
    else:
        identity(root)


if __name__ == "__main__":
    main()
