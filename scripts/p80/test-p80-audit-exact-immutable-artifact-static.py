#!/usr/bin/env python3
"""P80 defensive static implementation-shape proof.

This checker deliberately validates only current-source control flow and fail-closed
boundaries. It grants no deployment, exploitability, rights, Windows, Customer FINAL,
or Audit FINAL PDF credit.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FILES = {
    "snapshot": ROOT / "lib/reporting/account-customer-artifact-snapshot.ts",
    "blob": ROOT / "lib/reporting/account-customer-artifact-pdf-blob.ts",
    "store": ROOT / "lib/reporting/account-customer-artifact-store.ts",
    "audit_snapshot": ROOT / "lib/security/audit-account-customer-snapshot.ts",
    "watch": ROOT / "lib/security/audit-watch-post-handler.ts",
    "audit_route": ROOT / "lib/server/lazy-route-modules/security--audit-watch--customer-safe-report.ts",
    "account_route": ROOT / "lib/server/lazy-route-modules/account--customer-artifact.ts",
    "delivery": ROOT / "lib/reporting/exact-customer-pdf-delivery.ts",
    "gate_contract": ROOT / "lib/security/final-delivery-gate-contract.ts",
    "gate": ROOT / "lib/security/final-delivery-gate.ts",
    "messages": ROOT / "lib/account/audit-account-messages.ts",
    "customer_route": ROOT / "lib/security/customer-safe-report-route.ts",
    "schema": ROOT / "lib/db/schema.sql",
    "runtime": ROOT / "scripts/p80/test-p80-audit-exact-immutable-artifact-runtime.mjs",
    "runtime_receipt": ROOT / "receipts/p80/P80_AUDIT_EXACT_IMMUTABLE_ACCOUNT_ARTIFACT_RUNTIME.json",
    "pdf": ROOT / "artifacts/p80/P80_AUDIT_LOCAL_FIXTURE_NOT_CUSTOMER_FINAL.pdf",
}

text = {key: path.read_text(encoding="utf-8") for key, path in FILES.items() if path.suffix not in {".json", ".pdf"}}
checks: list[dict[str, object]] = []


def ck(check_id: str, condition: bool, detail: object | None = None) -> None:
    row: dict[str, object] = {"id": check_id, "status": "PASS" if condition else "FAIL"}
    if detail is not None:
        row["detail"] = detail
    checks.append(row)


for key, path in FILES.items():
    ck(f"p80_file_exists_{key}", path.exists(), str(path.relative_to(ROOT)))

snapshot = text["snapshot"]
blob = text["blob"]
audit_snapshot = text["audit_snapshot"]
watch = text["watch"]
audit_route = text["audit_route"]
account_route = text["account_route"]
gate = text["gate"]
messages = text["messages"]
customer_route = text["customer_route"]
schema = text["schema"]
runtime = text["runtime"]

ck("p80_generic_snapshot_declares_audit_payload_kind", '"audit_customer_report_v1"' in snapshot)
ck("p80_generic_snapshot_binds_audit_surface_pair", 'surface === "audit" && payloadKind === "audit_customer_report_v1"' in snapshot)
ck("p80_generic_snapshot_requires_audit_exact_pdf", 'account_customer_artifact_audit_exact_pdf_required' in snapshot)
ck("p80_generic_snapshot_requires_audit_delivered_tier", 'account_customer_artifact_audit_delivered_tier_required' in snapshot)
ck("p80_generic_snapshot_requires_audit_field_packet", 'module: "audit"' in snapshot and 'requirePresent: true' in snapshot)
ck("p80_blob_verifier_allows_audit_surface", 'blob.surface !== "audit"' in blob)

ck("p80_audit_binding_schema_declared", 'P80_AUDIT_EXACT_ACCOUNT_ARTIFACT_BINDING_ID' in audit_snapshot)
ck("p80_audit_binding_is_exact_immutable_blob", 'storage: "exact_immutable_blob"' in audit_snapshot)
ck("p80_audit_binding_has_snapshot_and_blob_digests", all(token in audit_snapshot for token in ["snapshotDigest", "pdfBlobRecordDigest", "artifactDigest", "pdfDigest"]))
ck("p80_audit_snapshot_rejects_unknown_keys", 'Object.keys(snapshot).sort()' in audit_snapshot and 'expectedAuditSnapshotKeys' in audit_snapshot)
ck("p80_audit_binding_rejects_unknown_keys", 'Object.keys(binding).sort()' in audit_snapshot and 'keys.some((key, index) => key !== expected[index])' in audit_snapshot)
ck("p80_audit_binding_derives_snapshot_id_from_owner_and_artifact", 'artifact-audit-${snapshot.accountIdHash.slice(0, 16)}-${artifactHex}' in audit_snapshot)
ck("p80_audit_binding_derives_blob_id_from_owner_and_artifact", 'pdf-${snapshot.accountIdHash.slice(0, 16)}-${artifactHex}' in audit_snapshot)
ck("p80_audit_binding_cross_checks_pdf_length", 'binding.pdfByteLength === snapshot.canonicalArtifact.pdfByteLength' in audit_snapshot)
ck("p80_audit_binding_owner_verified", 'verifyPass4822AccountCustomerArtifactOwner(args.accountArtifactSnapshot, args.accountId)' in audit_snapshot)
ck("p80_audit_binding_blob_snapshot_asserted", 'assertPass4824PdfBlobMatchesSnapshot({' in audit_snapshot)
ck("p80_audit_binding_cross_checks_report_tier_locale_time_payload", all(token in audit_snapshot for token in [
    'args.accountArtifactSnapshot.reportId !== args.snapshot.reportId',
    'args.accountArtifactSnapshot.requestedTier !== args.snapshot.requestedTier',
    'args.accountArtifactSnapshot.deliveredTier !== args.snapshot.deliveredTier',
    'args.accountArtifactSnapshot.locale !== args.snapshot.locale',
    'args.accountArtifactSnapshot.generatedAt !== args.snapshot.generatedAt',
    'args.accountArtifactSnapshot.payloadDigest !== args.snapshot.customerReportDigest',
]))
ck("p80_bound_snapshot_is_rehashed", 'snapshotDigest: sha256Digest(canonicalJson(unsigned))' in audit_snapshot)
ck("p80_exact_bound_snapshot_does_not_rerender", 'if (snapshot.exactAccountArtifact !== undefined)' in audit_snapshot and 'else {\n    const rerendered = renderCustomerSafeAuditPdf' in audit_snapshot)
ck("p80_legacy_snapshot_only_rerenders_for_integrity", audit_snapshot.count('renderCustomerSafeAuditPdf(') == 2, audit_snapshot.count('renderCustomerSafeAuditPdf('))

publish_pos = watch.find('publishP83AuditExactArtifactAtomically({')
message_input_pos = watch.find('messageInput: finalAccountDeliveryInput', publish_pos)
audit_snapshot_pos = watch.find('auditSnapshot: unboundCanonicalCustomerSnapshot', publish_pos)
artifact_snapshot_pos = watch.find('accountArtifactSnapshot: exactAuditArtifactSnapshot', publish_pos)
pdf_bytes_pos = watch.find('pdfBytes: renderedCanonicalAuditPdf.bytes', publish_pos)
ck("p80_watch_builds_audit_exact_snapshot", 'surface: "audit"' in watch and 'payloadKind: "audit_customer_report_v1"' in watch)
ck("p80_watch_stores_pdf_bytes_not_metadata_only", pdf_bytes_pos >= 0)
ck("p80_watch_orders_store_bind_message", 0 <= publish_pos < message_input_pos < audit_snapshot_pos < artifact_snapshot_pos < pdf_bytes_pos, {"publisher": publish_pos, "messageInput": message_input_pos, "auditSnapshot": audit_snapshot_pos, "artifactSnapshot": artifact_snapshot_pos, "pdfBytes": pdf_bytes_pos})
ck("p80_watch_fails_closed_when_durable_store_missing", 'audit_exact_artifact_atomic_storage_required' in watch and 'status: 503' in watch)
ck("p80_watch_does_not_store_account_message_after_storage_error", 'storeAuditAccountMessage' not in watch and 'storePass4824AccountCustomerArtifactPdfBundle' not in watch and 'Nothing was committed.' in watch)
ck("p80_watch_exposes_only_safe_exact_ids", 'exactAccountArtifactId:' in watch and 'exactPdfDigest:' in watch)
ck("p80_watch_public_response_does_not_embed_pdf_bytes", 'pdfBytes:' not in watch[watch.find('return NextResponse.json(sanitizePublicAuditEnvelope'):])

ck("p80_audit_route_has_no_audit_pdf_renderer_import", 'renderCustomerSafeAuditPdf' not in audit_route)
ck("p80_audit_route_requires_exact_binding", 'hasExactAuditAccountArtifactBinding(snapshot)' in audit_route)
ck("p80_audit_route_reads_snapshot_and_blob_by_owner", 'getPass4822AccountCustomerArtifactSnapshot({' in audit_route and 'getPass4824AccountCustomerArtifactPdfBlob({' in audit_route and 'accountId: account.accountId' in audit_route)
ck("p80_audit_route_asserts_blob_snapshot_binding", 'assertPass4824PdfBlobMatchesSnapshot' in audit_route)
ck("p80_audit_route_cross_checks_all_bound_digests", all(token in audit_route for token in [
    'accountArtifact.snapshotDigest !== snapshot.exactAccountArtifact.snapshotDigest',
    'exactPdf.blobId !== snapshot.exactAccountArtifact.pdfBlobId',
    'exactPdf.recordDigest !== snapshot.exactAccountArtifact.pdfBlobRecordDigest',
    'exactPdf.pdfDigest !== snapshot.exactAccountArtifact.pdfDigest',
    'exactPdf.pdfByteLength !== snapshot.exactAccountArtifact.pdfByteLength',
]))
ck("p80_audit_route_preview_download_same_bytes", 'pdfBytes: exactPdf.pdfBytes' in audit_route and 'disposition === "preview" ? "inline" : "attachment"' in audit_route)
ck("p80_audit_route_parity_header", 'x-velmere-preview-download-parity": "byte-identical"' in audit_route)
ck("p80_audit_route_no_provider_or_ai_rerun", 'No audit/provider/AI work is re-run during delivery.' in audit_route)

ck("p80_generic_account_route_accepts_audit_payload", 'snapshot.payloadKind === "market_customer_report_v1" || snapshot.payloadKind === "audit_customer_report_v1"' in account_route)
ck("p80_generic_account_route_refuses_audit_rerender", 'artifact_exact_pdf_required_for_audit' in account_route)
ck("p80_generic_account_route_exact_preview_download", 'buildExactCustomerPdfDelivery({' in account_route and 'x-velmere-preview-download-parity' in account_route)
ck("p80_generic_account_route_owner_scoped", 'accountId: account.accountId' in account_route)
ck("p80_generic_account_route_imports_audit_message_link_gate", 'hasAuditAccountMessageExactArtifactLink' in account_route)
ck("p80_generic_account_route_hides_unlinked_audit_list_rows", 'const visibleSnapshots = []' in account_route and 'if (snapshot.surface !== "audit")' in account_route)
ck("p80_generic_account_route_hides_unlinked_audit_direct_reads", 'if (snapshot.surface === "audit")' in account_route and 'if (!linked) return NextResponse.json({ ok: false, error: "artifact_not_found" }' in account_route)
ck("p80_audit_message_link_lookup_owner_and_snapshot_scoped", all(token in messages for token in [
    'hasAuditAccountMessageExactArtifactLink',
    '.eq("account_id", accountId)',
    '.eq("exact_account_artifact_snapshot_id", snapshotId)',
]))
ck("p80_audit_message_link_lookup_rejects_ambiguity", 'audit_account_artifact_link_ambiguous' in messages)

ck("p80_final_gate_requires_exact_binding", '&& exactAccountArtifactReady' in gate)
ck("p80_final_gate_has_blocked_reason", 'exact_account_pdf_artifact_required' in gate)
ck("p80_final_gate_contract_exposes_exact_identity", all(token in text["gate_contract"] for token in ["exactAccountArtifactReady", "exactAccountArtifactId", "exactPdfDigest"]))
ck("p80_account_ready_transition_requires_exact_binding", 'exact_account_pdf_artifact_required_before_ready' in messages)
ck("p80_account_delivery_transition_requires_exact_binding", 'exact_account_pdf_artifact_required_before_delivery' in messages)
ck("p80_customer_route_pdf_ready_requires_exact_artifact", 'pdfReady: Boolean(exactArtifact)' in customer_route)
ck("p80_customer_route_exposes_preview_and_account_artifact", 'pdfPreviewRoute:' in customer_route and 'accountArtifactRoute:' in customer_route)

ck("p80_sql_allows_audit_snapshot_surface", "surface in ('audit','shield','real_markets','lens')" in schema)
ck("p80_sql_allows_audit_payload_kind", "payload_kind in ('audit_customer_report_v1','market_customer_report_v1','lens_report_v1')" in schema)
ck("p80_sql_binds_audit_surface_payload", "surface = 'audit' and payload_kind = 'audit_customer_report_v1'" in schema)
ck("p80_sql_atomic_rpc_binds_audit_pair", "p_snapshot->>'surface' = 'audit' and p_snapshot->>'payloadKind' = 'audit_customer_report_v1'" in schema)
ck("p80_sql_pdf_blob_allows_audit", "surface in ('audit','shield','real_markets','lens')" in schema[schema.find('velmere_customer_artifact_pdf_blobs'):])
ck("p80_sql_ready_trigger_requires_exact_schema", "p80-audit-exact-account-artifact-binding-v1" in schema)
ck("p80_sql_generates_exact_audit_artifact_link_column", "generated always as (canonical_customer_snapshot #>> '{exactAccountArtifact,snapshotId}') stored" in schema)
ck("p80_sql_exact_audit_artifact_link_is_unique", "velmere_audit_account_messages_exact_artifact_snapshot_uidx" in schema and "where exact_account_artifact_snapshot_id is not null" in schema)
ck("p80_sql_ready_trigger_requires_nine_exact_keys", "count(*) from jsonb_object_keys(v_exact)) <> 9" in schema)
ck("p80_sql_ready_trigger_derives_owner_hash", "digest('velmere-account-binding-v1:' || new.account_id, 'sha256')" in schema)
ck("p80_sql_ready_trigger_reads_exact_snapshot", "from public.velmere_customer_artifact_snapshots" in schema[ schema.find('velmere_enforce_audit_customer_snapshot_immutability'): schema.find('PASS4823 CUSTOMER ARTIFACT SNAPSHOT BEGIN') ])
ck("p80_sql_ready_trigger_reads_exact_blob", "from public.velmere_customer_artifact_pdf_blobs" in schema[ schema.find('velmere_enforce_audit_customer_snapshot_immutability'): schema.find('PASS4823 CUSTOMER ARTIFACT SNAPSHOT BEGIN') ])
ck("p80_sql_ready_trigger_checks_pdf_bytes_hash", "digest(v_exact_blob.pdf_bytes, 'sha256')" in schema)
ck("p80_sql_ready_trigger_checks_snapshot_payload_digest", "v_exact_snapshot.snapshot->>'payloadDigest' <> new.canonical_customer_snapshot->>'customerReportDigest'" in schema)
ck("p80_sql_ready_trigger_checks_owner_surface_report", all(token in schema for token in [
    "v_exact_snapshot.account_id <> new.account_id",
    "v_exact_snapshot.surface <> 'audit'",
    "v_exact_blob.account_id <> new.account_id",
    "v_exact_blob.surface <> 'audit'",
    "v_exact_blob.report_id <> new.canonical_customer_snapshot->>'reportId'",
]))

for forbidden in ["eth_sendTransaction", "eth_sendRawTransaction", "wallet_send", "privateKey", "seed phrase", "exploit contract", "weaponized"]:
    ck(f"p80_runtime_forbids_{re.sub(r'[^a-z0-9]+', '_', forbidden.lower()).strip('_')}", forbidden not in runtime, forbidden)
ck("p80_runtime_no_network_fetch", re.search(r"\bfetch\s*\(", runtime) is None)
ck("p80_runtime_marks_local_fixture_not_final", 'P80 LOCAL FIXTURE - NOT CUSTOMER FINAL' in runtime)
ck("p80_runtime_withholds_current_exploitability", 'currentExploitability: "WITHHELD"' in runtime)
ck("p80_runtime_zero_fake_customer_final", 'customerFinal: "0/20"' in runtime)
ck("p80_runtime_zero_fake_audit_pdf_final", 'auditFinalPdf: "0/3"' in runtime)
ck("p80_runtime_hides_orphan_direct_artifact", 'p80_orphan_audit_artifact_direct_route_hidden' in runtime)
ck("p80_runtime_hides_orphan_list_artifact", 'p80_orphan_audit_artifact_list_hidden' in runtime)
ck("p80_runtime_exposes_artifact_after_message_link", 'p80_bound_audit_artifact_list_visible' in runtime)

runtime_receipt: dict[str, object] = {}
try:
    runtime_receipt = json.loads(FILES["runtime_receipt"].read_text(encoding="utf-8"))
except Exception:
    runtime_receipt = {}
rows = ((runtime_receipt.get("checks") or {}) if isinstance(runtime_receipt, dict) else {})
ck("p80_runtime_receipt_pass_bounded", runtime_receipt.get("status") == "PASS_BOUNDED_LOCAL_FIXTURE")
ck("p80_runtime_receipt_67_of_67", isinstance(rows, dict) and rows.get("total") == 67 and rows.get("passed") == 67 and rows.get("failed") == 0)
ck("p80_runtime_receipt_preview_download_parity", ((runtime_receipt.get("exactArtifact") or {}) if isinstance(runtime_receipt, dict) else {}).get("previewDownloadByteIdentical") is True)
ck("p80_runtime_receipt_zero_fake_credit", ((runtime_receipt.get("zeroFakeCredit") or {}) if isinstance(runtime_receipt, dict) else {}).get("customerFinal") == "0/20" and ((runtime_receipt.get("zeroFakeCredit") or {}) if isinstance(runtime_receipt, dict) else {}).get("auditFinalPdf") == "0/3")

pdf_bytes = FILES["pdf"].read_bytes() if FILES["pdf"].exists() else b""
ck("p80_fixture_pdf_has_pdf_header", pdf_bytes.startswith(b"%PDF-"))
ck("p80_fixture_pdf_has_no_javascript_marker", b"/JavaScript" not in pdf_bytes and b"/JS" not in pdf_bytes)

failed = [row for row in checks if row["status"] == "FAIL"]
receipt = {
    "schemaVersion": "velmere.p80.audit-exact-immutable-account-artifact-static.v1",
    "status": "FAIL" if failed else "PASS",
    "classification": "DEFENSIVE_CURRENT_SOURCE_IMPLEMENTATION_SHAPE_ONLY",
    "checkCount": len(checks),
    "checks": checks,
    "zeroFakeCredit": {
        "customerFinal": "0/20",
        "auditFinalPdf": "0/3",
        "exactWindows": "WITHHELD",
        "productionDatabaseExecution": "WITHHELD",
        "currentDeploymentState": "WITHHELD",
        "currentExploitability": "WITHHELD",
        "independentReplay": "WITHHELD",
        "sourceRights": "WITHHELD",
        "note": "Static implementation-shape proof only. It does not prove production migration execution, external deployment state, exploitability, rights/currentness, exact Windows, Customer FINAL, or Audit FINAL PDF.",
    },
}
out = ROOT / "receipts/p80/P80_AUDIT_EXACT_IMMUTABLE_ACCOUNT_ARTIFACT_STATIC.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps({
    "status": receipt["status"],
    "checkCount": len(checks),
    "passed": len(checks) - len(failed),
    "failed": [row["id"] for row in failed],
}, indent=2, ensure_ascii=False))
raise SystemExit(1 if failed else 0)
