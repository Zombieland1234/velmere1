#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import platform
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "receipts/p86/P86_EXACT_PDF_FAIL_CLOSED_STATIC.json"
GENERATED_AT = "2026-08-20T03:45:00Z"

PATHS = {
    "route": ROOT / "lib/server/lazy-route-modules/account--customer-artifact.ts",
    "availability": ROOT / "lib/reporting/customer-artifact-pdf-availability.ts",
    "snapshot": ROOT / "lib/reporting/account-customer-artifact-snapshot.ts",
    "store": ROOT / "lib/reporting/account-customer-artifact-store.ts",
    "migration": ROOT / "supabase/migrations/20260820000004_p86_customer_artifact_exact_pdf_new_write_gate.sql",
    "schema": ROOT / "lib/db/schema.sql",
    "lensWriter": ROOT / "lib/server/search-route-modules/lens-report.ts",
    "marketWriter": ROOT / "lib/server/market-integrity-route-modules/report.ts",
    "marketToken": ROOT / "lib/market-integrity/customer-report-render-token.ts",
    "realMarketsWriter": ROOT / "lib/market-integrity/real-markets-paid-account-artifact.ts",
    "auditWriter": ROOT / "lib/security/audit-watch-post-handler.ts",
    "integration": ROOT / "tests/security/a102-p36-exact-customer-pdf-integration.test.ts",
    "parity": ROOT / "tests/security/a102-account-artifact-preview-download-parity.test.ts",
}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


texts = {name: path.read_text(encoding="utf-8") for name, path in PATHS.items()}
checks: list[dict[str, object]] = []


def check(identifier: str, condition: bool, detail: object | None = None) -> None:
    row: dict[str, object] = {"id": identifier, "status": "PASS" if condition else "FAIL"}
    if detail is not None:
        row["detail"] = detail
    checks.append(row)
    if not condition:
        raise AssertionError(f"{identifier}: {detail!r}")


# Ordered migration and canonical schema mirror.
migrations = sorted(p.name for p in (ROOT / "supabase/migrations").glob("*.sql"))
check("p86_migration_is_latest_ordered_migration", migrations[-1] == PATHS["migration"].name, migrations[-3:])
check("p86_parent_p85_migration_precedes_p86", migrations[-2] == "20260820000003_p85_audit_customer_artifact_publication_visibility_rls.sql", migrations[-3:])
check("p86_migration_transaction_bounded", texts["migration"].startswith("begin;\n") and texts["migration"].rstrip().endswith("commit;"))
check("p86_migration_creates_insert_gate_function", "create or replace function public.velmere_reject_new_legacy_customer_artifact_v1()" in texts["migration"])
check("p86_trigger_is_before_insert_only", "before insert on public.velmere_customer_artifact_snapshots" in texts["migration"])
check("p86_trigger_does_not_rewrite_history", not re.search(r"\b(?:update|delete)\s+public\.velmere_customer_artifact_snapshots\b", texts["migration"], re.I))
check("p86_database_requires_exact_pdf_column", "new.pdf_storage is distinct from 'exact_immutable_blob'" in texts["migration"])
check("p86_database_requires_digest_bound_snapshot_marker", "new.snapshot->>'pdfStorage' is distinct from 'exact_immutable_blob'" in texts["migration"])
check("p86_database_rejects_missing_exact_bytes", "customer_artifact_new_write_exact_pdf_required" in texts["migration"])
for kind in ("market_customer_report_v1", "lens_report_v1", "audit_customer_report_v1"):
    check(f"p86_database_allows_known_pdf_kind_{kind}", f"'{kind}'" in texts["migration"])
check("p86_database_rejects_unknown_payload_kind", "customer_artifact_payload_kind_unsupported" in texts["migration"])
check("p86_trigger_helper_not_directly_callable", "from public, anon, authenticated, service_role" in texts["migration"])
check("p86_schema_mirror_contains_gate_once", texts["schema"].count("P86 CUSTOMER ARTIFACT EXACT-PDF NEW-WRITE GATE BEGIN") == 1)
check("p86_schema_mirror_omits_migration_transaction_wrapper", "-- P85 AUDIT CUSTOMER ARTIFACT DATABASE-ENFORCED PUBLICATION VISIBILITY END\nbegin;" not in texts["schema"] and not texts["schema"].rstrip().endswith("commit;"))
for needle in (
    "velmere_reject_new_legacy_customer_artifact_v1",
    "p86_customer_artifact_exact_pdf_new_write_gate",
    "customer_artifact_new_write_exact_pdf_required",
):
    check(f"p86_schema_mirror_contains_{needle}", needle in texts["schema"])

# New-write source boundary and historical read compatibility.
check("p86_builder_requires_exact_pdf_for_new_non_audit_artifacts", "account_customer_artifact_new_write_exact_pdf_required" in texts["snapshot"])
check("p86_builder_preserves_audit_specific_failure_contract", "account_customer_artifact_audit_exact_pdf_required" in texts["snapshot"])
builder_body = texts["snapshot"][texts["snapshot"].index("export function buildPass4822AccountCustomerArtifactSnapshot"): ]
check("p86_builder_requirement_precedes_payload_processing", builder_body.index("account_customer_artifact_new_write_exact_pdf_required") < builder_body.index("assertPass4824PayloadFieldPacket"))
check("p86_legacy_key_shape_remains_read_compatible", "const LEGACY_SNAPSHOT_KEYS" in texts["snapshot"] and ": LEGACY_SNAPSHOT_KEYS" in texts["snapshot"])
check("p86_audit_legacy_rows_remain_rejected", 'snapshot.surface === "audit" && snapshot.pdfStorage !== PASS4824_ACCOUNT_CUSTOMER_ARTIFACT_EXACT_PDF_STORAGE' in texts["snapshot"])
check("p86_exact_marker_is_digest_bound", "...(args.pdfStorage === PASS4824_ACCOUNT_CUSTOMER_ARTIFACT_EXACT_PDF_STORAGE" in texts["snapshot"])
check("p86_legacy_store_has_no_production_caller", sum(p.read_text(encoding="utf-8", errors="ignore").count("storePass4822AccountCustomerArtifactSnapshot(") for base in (ROOT / "lib", ROOT / "app") for p in base.rglob("*.ts")) == 1)

# Customer-safe availability policy.
check("p86_public_detail_schema_v3_pinned", '"velmere.public-account-artifact.v3"' in texts["availability"])
check("p86_public_list_schema_v3_pinned", '"velmere.public-account-artifact-list.v3"' in texts["availability"])
check("p86_public_error_schema_v3_pinned", '"velmere.public-account-artifact-error.v3"' in texts["availability"])
check("p86_exact_availability_state_pinned", '"exact_immutable_blob"' in texts["availability"])
check("p86_legacy_unavailable_state_pinned", '"legacy_exact_bytes_unavailable"' in texts["availability"])
check("p86_availability_derived_from_snapshot_marker", "isPass4824ExactPdfAccountCustomerArtifactSnapshot(snapshot)" in texts["availability"])
check("p86_legacy_preview_route_is_null", re.search(r"previewRoute:\s*exactStoredPdf[\s\S]*?: null", texts["availability"]) is not None)
check("p86_legacy_download_route_is_null", re.search(r"downloadRoute:\s*exactStoredPdf[\s\S]*?: null", texts["availability"]) is not None)
check("p86_exact_preview_route_is_explicit", "&format=pdf&disposition=preview" in texts["availability"])
check("p86_exact_download_route_is_explicit", "&format=pdf&disposition=download" in texts["availability"])

# Route cannot recreate final bytes.
for forbidden in (
    "renderCustomerTierPdf(",
    "buildPdf(",
    "artifact_market_rerender_failed",
    "artifact_rerender_digest_mismatch",
    "legacy_deterministic_rerender",
    "full_preview_requires_exact_stored_pdf",
):
    check(f"p86_route_forbids_{re.sub(r'[^a-z0-9]+', '_', forbidden.lower()).strip('_')}", forbidden not in texts["route"])
check("p86_route_uses_shared_availability_authority", "resolveP86CustomerArtifactPdfAvailability(snapshot)" in texts["route"])
check("p86_list_exposes_availability", "pdfAvailability: pdfDelivery.pdfAvailability" in texts["route"])
check("p86_list_exposes_nullable_preview_route", "previewRoute: pdfDelivery.previewRoute" in texts["route"])
check("p86_list_exposes_nullable_download_route", "downloadRoute: pdfDelivery.downloadRoute" in texts["route"])
check("p86_detail_exposes_verified_byte_parity", "previewDownloadByteIdentical: exactRequired && Boolean(exactMetadata)" in texts["route"])
check("p86_exact_marker_without_blob_fails_closed", 'error: "artifact_exact_pdf_missing"' in texts["route"])
check("p86_legacy_marker_with_blob_fails_closed", 'error: "artifact_legacy_pdf_blob_conflict"' in texts["route"])
check("p86_legacy_pdf_request_returns_explicit_unavailable", 'error: "artifact_pdf_exact_bytes_unavailable"' in texts["route"])
check("p86_legacy_pdf_unavailable_is_non_retryable", "retryable: false" in texts["route"])
check("p86_legacy_pdf_error_uses_v3_contract", '"x-velmere-contract": P86_PUBLIC_ACCOUNT_ARTIFACT_ERROR_SCHEMA' in texts["route"])
check("p86_served_blob_reverified_against_snapshot", "assertPass4824PdfBlobMatchesSnapshot" in texts["route"])
check("p86_served_blob_uses_exact_delivery_authority", "buildExactCustomerPdfDelivery" in texts["route"])
check("p86_served_preview_download_declares_byte_identity", '"x-velmere-preview-download-parity": "byte-identical"' in texts["route"])
check("p86_served_blob_declares_exact_storage", '"x-velmere-pdf-storage": "exact_immutable_blob"' in texts["route"])
check("p86_public_route_does_not_expose_storage_source", "source: found.source" not in texts["route"] and "source: listed.source" not in texts["route"])
check("p86_public_route_does_not_expose_raw_canonical_artifact", "canonicalArtifact: snapshot.canonicalArtifact" not in texts["route"])

# Every production writer is exact and atomic.
check("p86_lens_writer_marks_exact_pdf", 'pdfStorage: "exact_immutable_blob"' in texts["lensWriter"])
check("p86_lens_writer_stores_atomic_bundle", "storePass4824AccountCustomerArtifactPdfBundle" in texts["lensWriter"])
check("p86_market_writer_marks_exact_pdf", 'pdfStorage: "exact_immutable_blob"' in texts["marketWriter"])
check("p86_market_writer_stores_atomic_bundle", "storePass4824AccountCustomerArtifactPdfBundle" in texts["marketWriter"])
check("p86_market_shared_snapshot_builder_marks_exact_pdf", 'pdfStorage: "exact_immutable_blob"' in texts["marketToken"])
check("p86_real_markets_writer_stores_atomic_bundle", "storePass4824AccountCustomerArtifactPdfBundle" in texts["realMarketsWriter"])
check("p86_audit_writer_marks_exact_pdf", 'pdfStorage: "exact_immutable_blob"' in texts["auditWriter"])
check("p86_audit_writer_uses_atomic_owner_readable_publication", "publishP84AuditExactArtifactOwnerReadable" in texts["auditWriter"])

# Current negative/integration coverage.
check("p86_integration_rejects_new_legacy_snapshot", "current builder must reject every new legacy PDF obligation" in texts["integration"])
check("p86_integration_preserves_historical_read_only_fixture", "historical legacy fixture must remain valid for read-only compatibility" in texts["integration"])
check("p86_integration_tests_legacy_preview_and_download", 'for (const legacyDisposition of ["preview", "download"] as const)' in texts["integration"])
check("p86_integration_tests_v3_exact_detail", 'velmere.public-account-artifact.v3' in texts["integration"])
check("p86_integration_tests_v3_list_routes", 'velmere.public-account-artifact-list.v3' in texts["integration"])
check("p86_parity_test_forbids_market_rerender", "account route must never rerender market PDFs" in texts["parity"])
check("p86_parity_test_forbids_lens_rerender", "account route must never rerender Lens PDFs" in texts["parity"])

payload = {
    "schemaVersion": "velmere.p86.exact-pdf-fail-closed-static.v1",
    "generatedAt": GENERATED_AT,
    "status": "PASS" if all(row["status"] == "PASS" for row in checks) else "FAIL",
    "runtime": {"python": platform.python_version(), "platform": platform.platform()},
    "files": {
        name: {"path": str(path.relative_to(ROOT)), "bytes": path.stat().st_size, "sha256": sha(path)}
        for name, path in PATHS.items()
    },
    "checks": {
        "total": len(checks),
        "passed": sum(row["status"] == "PASS" for row in checks),
        "failed": sum(row["status"] == "FAIL" for row in checks),
        "rows": checks,
    },
    "discoveredDefect": {
        "id": "P86-ACCOUNT-ARTIFACT-LEGACY-PDF-RERENDER",
        "severity": "HIGH_EVIDENCE_INTEGRITY",
        "before": "The shared account route could recreate historical Lens/Shield/Real Markets PDFs during download from retained payloads.",
        "after": "Only a digest-bound exact immutable blob can be previewed or downloaded. Legacy metadata remains readable with both PDF routes null and every PDF request returns a closed non-retryable 409.",
    },
    "truthBoundary": "Source/static proof plus production-writer inventory. PostgreSQL trigger execution, deployed HTTP, real owner JWT/RLS, exact Windows and any Customer FINAL remain WITHHELD.",
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps({"status": payload["status"], "checks": payload["checks"]}, indent=2))
