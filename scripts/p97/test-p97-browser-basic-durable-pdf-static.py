#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
POLICY = ROOT / "lib/search/lens-pdf-durable-artifact-policy.ts"
ROUTE = ROOT / "lib/server/search-route-modules/lens-report.ts"
CLIENT = ROOT / "components/search/VelmereIntelligenceSearchClient.tsx"
DURABLE = ROOT / "lib/jobs/durable-computation-replay.ts"
checks = []

def check(identifier, condition, detail=None):
    checks.append({"id": identifier, "status": "PASS" if condition else "FAIL", **({"detail": detail} if detail is not None else {})})

p = POLICY.read_text(encoding="utf-8")
r = ROUTE.read_text(encoding="utf-8")
c = CLIENT.read_text(encoding="utf-8")
d = DURABLE.read_text(encoding="utf-8")

# New closed policy/receipt contract.
check("policy_file_present", POLICY.is_file())
check("policy_id_versioned", 'p97-lens-pdf-render-once-durable-store-first-v1' in p)
check("receipt_schema_versioned", 'velmere.p97.lens-pdf-durability-receipt.v1' in p)
check("all_depths_supported", 'export type P97LensPdfDepth = "basic" | "pro" | "advanced"' in p)
check("durable_store_literal_true", 'requireDurableStore: true;' in p and 'requireDurableStore: true as const' in p)
check("direct_non_durable_literal_false", 'directNonDurableAllowed: false;' in p and 'directNonDurableAllowed: false as const' in p)
check("canonical_request_id_in_policy", 'canonicalRequestId: `signed-lens-report:${reportId}`' in p)
check("anonymous_subject_signed_report_bound", '{ kind: "anonymous", value: `signed-lens-report:${reportId}` }' in p)
check("account_subject_supported", '{ kind: "account", value: accountId }' in p)
check("policy_digest_bound", 'policyDigest: digest(unsigned)' in p)
check("receipt_binds_policy_digest", 'policyDigest: args.policy.policyDigest' in p)
check("receipt_exact_key_validation", 'Object.keys(value).sort().join("|") !== exactKeys.join("|")' in p)
check("receipt_pdf_size_bounded", 'args.pdfByteLength > 4 * 1024 * 1024' in p and 'value.pdfByteLength > 4 * 1024 * 1024' in p)
check("receipt_retention_false", 'durableRetentionClaimed: false' in p)
check("receipt_restore_false", 'backupRestoreProven: false' in p)
check("memory_not_customer_final_storage", 'customerFinalStorageEligible = args.computationMode === "supabase"' in p)
check("direct_state_rejected", '"NON_DURABLE_REJECTED"' in p)
check("receipt_digest_verified", 'value.receiptDigest === digest(unsigned)' in p)
check("receipt_verifier_requires_expected_policy", 'policy: P97LensPdfDurableArtifactPolicy' in p and 'value.policyDigest !== args.policy.policyDigest' in p)
check("receipt_verifier_requires_exact_bytes", 'pdfBytes: Uint8Array' in p and 'value.pdfSha256 !== sha256BytesDigest(args.pdfBytes)' in p)
check("report_id_bounded", 'const REPORT_ID = ' in p and '{7,199}' in p)
check("sha256_canonical_lowercase_enforced", 'value.pdfSha256 !== value.pdfSha256.toLowerCase()' in p)

# Production route integration.
check("route_imports_policy_builder", 'buildP97LensPdfDurableArtifactPolicy' in r)
check("route_imports_receipt_builder", 'buildP97LensPdfDurabilityReceipt' in r)
check("route_imports_receipt_verifier", 'verifyP97LensPdfDurabilityReceipt' in r)
check("route_uses_byte_digest", 'sha256BytesDigest(pdf)' in r)
check("route_does_not_hash_buffer_as_text", 'sha256Digest(pdf)' not in r)
check("route_policy_uses_signed_frozen_report", 'reportId: frozenPayload.identity.reportId' in r)
check("route_policy_uses_selected_depth", 'depth: selectedDepth' in r)
check("route_policy_uses_account_when_present", 'accountId: durableAccount?.accountId ?? null' in r)
check("route_overrides_client_request_id", 'requestId: lensPdfDurablePolicy.canonicalRequestId' in r)
check("route_does_not_use_request_header_for_durable_id", 'requestId: request.headers.get("x-velmere-request-id")' not in r)
check("route_uses_explicit_subject_binding", 'subjectBinding: lensPdfDurablePolicy.subjectBinding' in r)
check("route_requires_policy_durable_store", 'requireDurableStore: lensPdfDurablePolicy.requireDurableStore' in r)
check("old_basic_nondurable_condition_removed", 'requireDurableStore: selectedDepth !== "basic"' not in r)
check("route_receipt_uses_actual_mode", 'computationMode: durablePdf.mode' in r)
check("route_receipt_uses_actual_replay", 'replayed: durablePdf.replayed' in r)
check("route_receipt_uses_actual_byte_length", 'pdfByteLength: pdf.byteLength' in r)
check("route_verifies_receipt_against_policy_and_bytes", 'receipt: lensPdfDurabilityReceipt' in r and 'policy: lensPdfDurablePolicy' in r and 'pdfBytes: pdf' in r)
check("route_rejects_invalid_receipt", 'error: "lens_pdf_durability_receipt_invalid"' in r)
check("route_rejects_direct_mode", 'lensPdfDurabilityReceipt.storageState === "NON_DURABLE_REJECTED"' in r)
check("route_direct_rejection_is_503", 'error: "lens_pdf_durable_storage_required"' in r and 'status: 503' in r)
check("route_logs_receipt_digest", 'lensPdfDurabilityReceipt.receiptDigest' in r)
check("receipt_not_returned_in_customer_headers", 'x-velmere-lens-pdf-durability-receipt' not in r.lower())
check("receipt_not_returned_in_customer_payload", '"lensPdfDurabilityReceipt"' not in r and 'lensPdfDurabilityReceipt:' not in r)
check("route_returns_durable_result_bytes", 'const pdf = Buffer.from(durablePdf.value)' in r)
check("route_does_not_render_again_after_durable_result", r.count('renderLensPdfWorkerPayload({') == 1, r.count('renderLensPdfWorkerPayload({'))
check("route_cache_no_store", '"cache-control": "no-store"' in r)
check("route_safe_download_disposition", 'buildSafeDownloadDisposition({' in r)
check("route_exact_pdf_header_present", '"x-velmere-pdf-sha256"' in r)
check("route_same_blob_header_present", '"x-velmere-preview-download-parity": "same-blob-as-download"' in r)

# Underlying durable store fail-closed semantics.
check("production_requires_store_when_flag_true", 'if (args.requireDurableStore) return { state: "store_required" as const };' in d)
check("store_required_throws_before_execute", 'if (claim.state === "store_required") throw new DurableComputationError("durable_computation_store_required")' in d)
check("completed_store_replays_result", 'claim.state === "completed"' in d and 'replayed: true' in d)
check("binary_base64_roundtrip_verified", 'value.toString("base64") !== stored.payload' in d)
check("binary_sha_verified", 'sha256Hex(value) !== stored.sha256' in d)

# Existing Browser client already uses one received byte array for preview and download.
check("client_fetches_json_then_pdf", 'format=json' in c and 'const bytes = new Uint8Array(await response.arrayBuffer())' in c)
check("client_verifies_response_bytes", 'verifyLensPdfResponseBytes({' in c)
check("client_creates_one_object_url_from_bytes", 'const nextObjectUrl = createClientPdfObjectUrl({ bytes })' in c)
check("client_preview_uses_object_url", 'setPdfPreview({' in c and 'url: nextObjectUrl.url' in c)
check("client_download_uses_same_preview_url", c.count('href={pdfPreview.url}') >= 2, c.count('href={pdfPreview.url}'))
check("download_receipt_does_not_refetch_pdf", 'function recordPass469DownloadReceipt()' in c and '/api/search/lens-report' not in c[c.index('function recordPass469DownloadReceipt()'):c.index('function recordPass469DownloadReceipt()') + 1800])
check("object_url_revoked_on_replace", 'pdfPreviewObjectUrlRef.current?.revoke()' in c)
check("object_url_revoked_on_close", 'pdfPreviewObjectUrlRef.current?.revoke()' in c)

# Scope guard: no further Risk History implementation in this pass.
check("p97_policy_not_risk_history", 'risk-history' not in POLICY.name.lower() and 'RiskHistory' not in p)
check("route_change_not_risk_history", 'RiskHistory' not in r)

failed = [row for row in checks if row["status"] != "PASS"]
receipt = {
    "schemaVersion": "velmere.p97.browser-basic-durable-pdf-static.v1",
    "generatedAt": "2026-08-21T08:00:00.000Z",
    "status": "PASS_STATIC_BROWSER_BASIC_DURABLE_STORE_FIRST" if not failed else "FAIL",
    "checks": {"total": len(checks), "passed": len(checks) - len(failed), "failed": len(failed), "rows": checks},
    "changedProductionFiles": [
        "lib/search/lens-pdf-durable-artifact-policy.ts",
        "lib/server/search-route-modules/lens-report.ts",
    ],
    "customerCredit": {"browserBasicFinal": False, "customerFinalNumeratorDelta": 0},
    "truthBoundary": "Static source proof for the Browser PDF durable policy, exact-byte digest use, signed-report idempotency, production fail-closed integration and existing same-object-URL preview/download flow. It is not a rendered Browser, real Supabase, deployment, rights/currentness, account isolation or Customer FINAL proof.",
}
for target in [ROOT / "receipts/p97/P97_BROWSER_BASIC_DURABLE_PDF_STATIC.json", ROOT / "artifacts/p97/P97_BROWSER_BASIC_DURABLE_PDF_STATIC.json"]:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
print(json.dumps(receipt))
if failed:
    raise SystemExit(1)
