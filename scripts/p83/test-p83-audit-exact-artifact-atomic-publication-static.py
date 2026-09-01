#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import platform
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "supabase/migrations/20260820000001_p83_audit_exact_artifact_atomic_publication.sql"
SCHEMA = ROOT / "lib/db/schema.sql"
PUBLISHER = ROOT / "lib/reporting/audit-exact-artifact-atomic-publisher.ts"
STORE = ROOT / "lib/reporting/account-customer-artifact-store.ts"
MESSAGES = ROOT / "lib/account/audit-account-messages.ts"
HANDLER = ROOT / "lib/security/audit-watch-post-handler.ts"
RUNTIME_HARNESS = ROOT / "scripts/p83/test-p83-audit-exact-artifact-atomic-publication-runtime.mjs"
OLD_4824 = ROOT / "supabase/migrations/20260717000004_4824_customer_artifact_exact_pdf_blobs.sql"
RECEIPT = ROOT / "receipts/p83/P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_STATIC.json"

checks: list[dict[str, object]] = []

def check(identifier: str, condition: bool, detail: object | None = None) -> None:
    row: dict[str, object] = {"id": identifier, "status": "PASS" if condition else "FAIL"}
    if detail is not None:
        row["detail"] = detail
    checks.append(row)
    if not condition:
        raise RuntimeError(f"P83 static check failed: {identifier}: {detail!r}")

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def block(text: str, begin: str, end: str) -> str:
    start = text.index(begin)
    stop = text.index(end, start) + len(end)
    return text[start:stop]

migration = MIGRATION.read_text(encoding="utf-8")
schema = SCHEMA.read_text(encoding="utf-8")
publisher = PUBLISHER.read_text(encoding="utf-8")
store = STORE.read_text(encoding="utf-8")
messages = MESSAGES.read_text(encoding="utf-8")
handler = HANDLER.read_text(encoding="utf-8")
runtime_harness = RUNTIME_HARNESS.read_text(encoding="utf-8")
old_4824 = OLD_4824.read_text(encoding="utf-8")

migration_names = sorted(path.name for path in (ROOT / "supabase/migrations").glob("*.sql"))
check("p83_migration_is_latest_ordered_migration", migration_names[-1] == MIGRATION.name, migration_names[-1])
check("p83_migration_transaction_wrapped", migration.lstrip().startswith("begin;") and migration.rstrip().endswith("commit;"))
check("p83_prior_4824_lacked_audit_surface", "surface in ('shield','real_markets','lens')" in old_4824 and "'audit'" not in old_4824.split("surface in ('shield','real_markets','lens')", 1)[0][-120:])
check("p83_migration_adds_exact_audit_surface", "surface in ('audit','shield','real_markets','lens')" in migration)
check("p83_migration_adds_audit_payload_kind", "'audit_customer_report_v1'" in migration)
check("p83_migration_adds_generated_exact_link", "exact_account_artifact_snapshot_id text\n    generated always as" in migration)
check("p83_migration_adds_unique_exact_link", "velmere_audit_account_messages_exact_artifact_snapshot_uidx" in migration and "create unique index" in migration)
check("p83_migration_replaces_ready_trigger", "exact_account_pdf_artifact_required_before_ready" in migration and "exact_account_pdf_cross_binding_failed_before_ready" in migration)
check("p83_migration_bundle_rpc_accepts_audit", "(p_snapshot->>'surface' = 'audit' and p_snapshot->>'payloadKind' = 'audit_customer_report_v1')" in migration)

begin_marker = "-- P83 AUDIT EXACT ARTIFACT + ACCOUNT MESSAGE ATOMIC PUBLICATION BEGIN"
end_marker = "-- P83 AUDIT EXACT ARTIFACT + ACCOUNT MESSAGE ATOMIC PUBLICATION END"
migration_atomic = block(migration, begin_marker, end_marker)
schema_atomic = block(schema, begin_marker, end_marker)
check("p83_schema_mirror_byte_identical", migration_atomic == schema_atomic)
check("p83_rpc_security_definer", "language plpgsql\nsecurity definer" in migration_atomic)
check("p83_rpc_fixed_search_path", "set search_path = public, pg_temp" in migration_atomic)
check("p83_rpc_service_role_only_revoke", re.search(r"revoke all on function public\.velmere_publish_audit_exact_artifact_v1[\s\S]+from public, anon, authenticated, service_role;", migration_atomic) is not None)
check("p83_rpc_service_role_only_grant", re.search(r"grant execute on function public\.velmere_publish_audit_exact_artifact_v1[\s\S]+to service_role;", migration_atomic) is not None)
check("p83_rpc_no_client_role_grant", "to anon" not in migration_atomic.lower() and "to authenticated" not in migration_atomic.lower())
check("p83_rpc_real_owner_required", "p_account_id like 'preview:%'" in migration_atomic and "audit_exact_artifact_atomic_owner_required" in migration_atomic)
check("p83_rpc_closed_message_shape", "count(*) from jsonb_object_keys(p_message)) <> 29" in migration_atomic and "audit_exact_artifact_atomic_message_shape_invalid" in migration_atomic)
check("p83_rpc_split_message_identity_rejected", "p_message->>'id' is distinct from p_message->>'message_id'" in migration_atomic)
check("p83_rpc_nested_message_core_binding", all(token in migration_atomic for token in [
    "p_message->'message'->>'id' is distinct from p_message->>'id'",
    "p_message->'message'->>'requestId' is distinct from p_message->>'request_id'",
    "p_message->'message'->>'accountId' is distinct from p_account_id",
    "p_message->'message'->>'deliveryStatus' is distinct from p_message->>'delivery_status'",
]))
check("p83_rpc_cross_binding_checks", all(token in migration_atomic for token in [
    "p_message->'canonical_customer_snapshot' is distinct from p_audit_snapshot",
    "v_exact->>'snapshotId'",
    "p_snapshot->>'payloadDigest'",
    "p_audit_snapshot->>'customerReportDigest'",
]))
check("p83_rpc_serializes_retries", "pg_advisory_xact_lock" in migration_atomic)
check("p83_rpc_locks_preexisting_message", "for update;" in migration_atomic)
check("p83_rpc_rejects_ambiguous_identity", "audit_exact_artifact_atomic_message_identity_ambiguous" in migration_atomic)
check("p83_rpc_rejects_partial_preexisting_message", "audit_exact_artifact_atomic_preexisting_message_conflict" in migration_atomic)
check("p83_rpc_preexisting_message_full_semantic_match_before_bundle", all(token in migration_atomic for token in [
    "v_message.package_label is distinct from p_message->>'package_label'",
    "v_message.message_status is distinct from p_message->>'message_status'",
    "v_message.customer_safe_report is distinct from p_message->'customer_safe_report'",
    "v_message.message is distinct from p_message->'message'",
    "v_message.updated_at is distinct from v_updated_at",
]) and migration_atomic.index("audit_exact_artifact_atomic_preexisting_message_conflict") < migration_atomic.index("v_bundle := public.velmere_store_customer_artifact_pdf_bundle_v1("))
check("p83_rpc_postinsert_full_semantic_verification", migration_atomic.count("v_message.message is distinct from p_message->'message'") == 2 and migration_atomic.count("v_message.updated_at is distinct from v_updated_at") == 2)
check("p83_rpc_calls_exact_bundle", "v_bundle := public.velmere_store_customer_artifact_pdf_bundle_v1(" in migration_atomic)
check("p83_rpc_bundle_before_message_insert", migration_atomic.index("v_bundle := public.velmere_store_customer_artifact_pdf_bundle_v1(") < migration_atomic.index("insert into public.velmere_audit_account_messages"))
check("p83_rpc_explicit_message_columns", "insert into public.velmere_audit_account_messages (" in migration_atomic and "canonical_customer_snapshot_digest" in migration_atomic)
check("p83_rpc_no_dynamic_sql", re.search(r"\bexecute\s+(?!on\b)|jsonb_populate_record|format\s*\(", migration_atomic, re.I) is None)
check("p83_rpc_no_error_swallow", "when others then\n    null" not in migration_atomic.lower())
check("p83_rpc_postinsert_verification", "audit_exact_artifact_atomic_commit_verification_failed" in migration_atomic)
check("p83_rpc_closed_response_schema", "'p83-audit-exact-artifact-atomic-publication-rpc-v1'" in migration_atomic)

check("p83_publisher_no_memory_fallback", "storePass4824AccountCustomerArtifactPdfBundle" not in publisher and "storeAuditAccountMessage" not in publisher and "memoryStore" not in publisher and 'source: "memory"' not in publisher)
check("p83_publisher_single_rpc_api", publisher.count(".rpc(") == 1, publisher.count(".rpc("))
check("p83_publisher_no_direct_table_api", "supabase.from(" not in publisher and ".from(TABLE" not in publisher)
check("p83_publisher_requires_real_owner", "startsWith(\"preview:\")" in publisher)
check("p83_publisher_requires_durable_client", "P83_AUDIT_EXACT_ARTIFACT_DURABLE_STORAGE_REQUIRED" in publisher and "if (!supabase) throw" in publisher)
check("p83_publisher_binds_before_rpc", publisher.index("bindAuditAccountCustomerSnapshotToExactArtifact") < publisher.index("await supabase.rpc"))
check("p83_publisher_verifies_bundle_response", "parsePass4824AccountCustomerArtifactPdfBundleRpcResponse" in publisher)
check("p83_publisher_verifies_message_response", "assertReturnedMessage" in publisher and "parseAuditAccountMessageSupabaseRow" in publisher)
check("p83_returned_message_full_semantic_projection", "atomicMessageProjection(returned)" in publisher and "atomicMessageProjection(expected)" in publisher)
check("p83_publisher_uses_closed_rpc_schema", "payload.schemaVersion !== P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_RPC_SCHEMA" in publisher)
check("p83_handler_uses_atomic_publisher", handler.count("publishP83AuditExactArtifactAtomically(") == 1)
check("p83_handler_removed_separate_bundle_write", "storePass4824AccountCustomerArtifactPdfBundle" not in handler)
check("p83_handler_removed_separate_message_write", "storeAuditAccountMessage" not in handler)
check("p83_handler_fail_closed_wording", "Nothing was committed." in handler and "Nothing was published." in handler)
check("p83_handler_customer_response_uses_committed_objects", all(token in handler for token in ["atomicPublication.auditSnapshot", "atomicPublication.message", "atomicPublication.snapshot", "atomicPublication.blob"]))

check("p83_store_bundle_rpc_name_exported", "export const PASS4824_ACCOUNT_CUSTOMER_ARTIFACT_PDF_BUNDLE_RPC_NAME" in store)
check("p83_store_bundle_response_parser_exported", "export function parsePass4824AccountCustomerArtifactPdfBundleRpcResponse" in store)
check("p83_store_bundle_response_schema_checked", "pass4824-account-customer-artifact-pdf-bundle-rpc-v1" in store)
check("p83_message_row_builder_exported", "export function buildAuditAccountMessageSupabaseRow" in messages)
check("p83_message_row_parser_exported", "export function parseAuditAccountMessageSupabaseRow" in messages)
check("p83_no_raw_external_evidence_in_new_module", re.search(r"raw(?:Source|Abi|Runtime|Trace|State)|pragma\s+solidity", publisher, re.I) is None)
check("p83_runtime_fixture_clock_frozen", "installFixedFixtureClock();" in runtime_harness and "generatedAt: GENERATED_AT" in runtime_harness)
check("p83_runtime_checks_exact_rpc_message_shape", "p83_rpc_message_shape_exact_29" in runtime_harness and "Object.keys(rpcMessage).length === 29" in runtime_harness)
check("p83_runtime_repeatability_has_no_wall_clock_receipt", "generatedAt: new Date().toISOString()" not in runtime_harness)

# Basic delimiter sanity catches accidental truncation even without a PostgreSQL runtime.
check("p83_sql_dollar_quotes_balanced", migration.count("$$") % 2 == 0, migration.count("$$"))
check("p83_sql_function_signature_once_in_atomic_block", migration_atomic.count("create or replace function public.velmere_publish_audit_exact_artifact_v1(") == 1)
check("p83_schema_function_signature_once", schema.count("create or replace function public.velmere_publish_audit_exact_artifact_v1(") == 1)

payload = {
    "schemaVersion": "velmere.p83.audit-exact-artifact-atomic-publication-static.v1",
    "status": "PASS" if all(row["status"] == "PASS" for row in checks) else "FAIL",
    "runtime": {"python": platform.python_version(), "platform": platform.platform()},
    "files": {
        str(path.relative_to(ROOT)): {"bytes": path.stat().st_size, "sha256": sha(path)}
        for path in [MIGRATION, SCHEMA, PUBLISHER, STORE, MESSAGES, HANDLER, RUNTIME_HARNESS]
    },
    "checks": {
        "total": len(checks),
        "passed": sum(row["status"] == "PASS" for row in checks),
        "failed": sum(row["status"] == "FAIL" for row in checks),
        "rows": checks,
    },
    "truthBoundary": (
        "Static proof establishes ordered migration reachability, closed service-role RPC shape, one customer-path RPC, "
        "fail-closed no-fallback behavior and byte-identical schema mirror. It does not execute PostgreSQL, RLS, triggers, "
        "deployed HTTP, current chain state or exact Windows."
    ),
}
RECEIPT.parent.mkdir(parents=True, exist_ok=True)
RECEIPT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
print(json.dumps(payload, indent=2))
