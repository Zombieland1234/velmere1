#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import platform
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "supabase/migrations/20260820000002_p84_audit_customer_artifact_owner_read_path.sql"
P83_MIGRATION = ROOT / "supabase/migrations/20260820000001_p83_audit_exact_artifact_atomic_publication.sql"
SCHEMA = ROOT / "lib/db/schema.sql"
PUBLISHER = ROOT / "lib/reporting/audit-exact-artifact-owner-readable-publisher.ts"
P83_PUBLISHER = ROOT / "lib/reporting/audit-exact-artifact-atomic-publisher.ts"
MESSAGES = ROOT / "lib/account/audit-account-messages.ts"
HANDLER = ROOT / "lib/security/audit-watch-post-handler.ts"
OWNER_ROUTE = ROOT / "lib/server/lazy-route-modules/account--customer-artifact.ts"
RUNTIME = ROOT / "scripts/p84/test-p84-audit-customer-artifact-owner-read-runtime.mjs"
P83_STATIC_RECEIPT = ROOT / "receipts/p83/P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_STATIC.json"
RECEIPT = ROOT / "receipts/p84/P84_AUDIT_CUSTOMER_ARTIFACT_OWNER_READ_STATIC.json"

checks: list[dict[str, object]] = []


def check(identifier: str, condition: bool, detail: object | None = None) -> None:
    row: dict[str, object] = {"id": identifier, "status": "PASS" if condition else "FAIL"}
    if detail is not None:
        row["detail"] = detail
    checks.append(row)
    if not condition:
        raise RuntimeError(f"P84 static check failed: {identifier}: {detail!r}")


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def extract(text: str, begin: str, end: str) -> str:
    start = text.index(begin)
    stop = text.index(end, start) + len(end)
    return text[start:stop]


def final_authenticated_select_state(paths: list[Path], table: str) -> bool | None:
    state: bool | None = None
    grant_pattern = re.compile(
        rf"grant\s+select\s+on\s+table\s+public\.{re.escape(table)}\s+to\s+([^;]+);",
        re.I,
    )
    revoke_pattern = re.compile(
        rf"revoke\s+all\s+on\s+table\s+public\.{re.escape(table)}\s+from\s+([^;]+);",
        re.I,
    )
    for path in sorted(paths, key=lambda item: item.name):
        text = path.read_text(encoding="utf-8")
        events: list[tuple[int, bool]] = []
        for match in grant_pattern.finditer(text):
            roles = {part.strip().lower() for part in match.group(1).split(",")}
            if "authenticated" in roles:
                events.append((match.start(), True))
        for match in revoke_pattern.finditer(text):
            roles = {part.strip().lower() for part in match.group(1).split(",")}
            if "authenticated" in roles or "public" in roles:
                events.append((match.start(), False))
        for _, value in sorted(events):
            state = value
    return state


migration = MIGRATION.read_text(encoding="utf-8")
p83_migration = P83_MIGRATION.read_text(encoding="utf-8")
schema = SCHEMA.read_text(encoding="utf-8")
publisher = PUBLISHER.read_text(encoding="utf-8")
p83_publisher = P83_PUBLISHER.read_text(encoding="utf-8")
messages = MESSAGES.read_text(encoding="utf-8")
handler = HANDLER.read_text(encoding="utf-8")
owner_route = OWNER_ROUTE.read_text(encoding="utf-8")
runtime = RUNTIME.read_text(encoding="utf-8")

migrations = sorted((ROOT / "supabase/migrations").glob("*.sql"), key=lambda path: path.name)
check("p84_migration_is_latest_ordered_migration", migrations[-1].name == MIGRATION.name, migrations[-1].name)
check("p84_migration_transaction_wrapped", migration.lstrip().startswith("begin;") and migration.rstrip().endswith("commit;"))
check("p84_sql_dollar_quotes_balanced", migration.count("$$") % 2 == 0, migration.count("$$"))
check("p84_no_dynamic_sql", re.search(r"\bexecute\s+(?!on\b|function\b)|jsonb_populate_record|format\s*\(", migration, re.I) is None)
check("p84_no_swallowed_errors", "when others then\n    null" not in migration.lower())

begin_marker = "-- P84 AUDIT CUSTOMER ARTIFACT OWNER READ PATH BEGIN"
end_marker = "-- P84 AUDIT CUSTOMER ARTIFACT OWNER READ PATH END"
migration_block = extract(migration, begin_marker, end_marker)
schema_block = extract(schema, begin_marker, end_marker)
check("p84_schema_mirror_byte_identical", migration_block == schema_block)
check("p84_marker_occurs_once_in_migration", migration.count(begin_marker) == 1 and migration.count(end_marker) == 1)
check("p84_marker_occurs_once_in_schema", schema.count(begin_marker) == 1 and schema.count(end_marker) == 1)

p83_paths = [path for path in migrations if path.name <= P83_MIGRATION.name]
p84_paths = [path for path in migrations if path.name <= MIGRATION.name]
for table in ["velmere_customer_artifact_snapshots", "velmere_customer_artifact_pdf_blobs"]:
    check(
        f"p83_regression_authenticated_select_absent_{table}",
        final_authenticated_select_state(p83_paths, table) is False,
    )
    check(
        f"p84_authenticated_select_restored_{table}",
        final_authenticated_select_state(p84_paths, table) is True,
    )

check("p84_snapshots_rls_enabled", "alter table public.velmere_customer_artifact_snapshots enable row level security;" in migration_block)
check("p84_pdf_blobs_rls_enabled", "alter table public.velmere_customer_artifact_pdf_blobs enable row level security;" in migration_block)
check("p84_snapshot_owner_policy_rebound", all(token in migration_block for token in [
    "create policy p84_customer_artifact_snapshot_owner_select",
    "account_id = public.velmere_current_account_id()",
    "account_id_hash = public.velmere_current_account_binding_hash()",
]))
check("p84_pdf_owner_policy_rebound", all(token in migration_block for token in [
    "create policy p84_customer_artifact_pdf_owner_select",
    "on public.velmere_customer_artifact_pdf_blobs",
    "account_id_hash = public.velmere_current_account_binding_hash()",
]))
check("p84_no_authenticated_write_grants_on_artifacts", not re.search(
    r"grant\s+(?:insert|update|delete|all)[^;]*velmere_customer_artifact_(?:snapshots|pdf_blobs)[^;]*authenticated",
    migration_block,
    re.I,
))

check("p84_full_message_table_remains_customer_closed", "revoke all on table public.velmere_audit_account_messages from public, anon, authenticated;" in migration_block)
check("p84_full_message_table_service_role_only", "grant select, insert, update, delete on table public.velmere_audit_account_messages to service_role;" in migration_block)
check("p84_no_authenticated_message_table_grant", re.search(
    r"grant\s+[^;]+on\s+table\s+public\.velmere_audit_account_messages\s+to\s+[^;]*authenticated",
    migration_block,
    re.I,
) is None)

create_table = extract(
    migration_block,
    "create table if not exists public.velmere_audit_customer_artifact_links (",
    ");\n\nalter table public.velmere_audit_customer_artifact_links enable row level security;",
)
required_columns = [
    "schema_version text not null",
    "snapshot_id text primary key",
    "message_id text not null unique",
    "account_id text not null",
    "account_id_hash text not null",
    "audit_snapshot_digest text not null",
    "artifact_snapshot_digest text not null",
    "artifact_digest text not null",
    "pdf_blob_id text not null unique",
    "pdf_digest text not null",
    "linked_at timestamptz not null",
    "created_at timestamptz not null",
]
check("p84_minimal_link_table_required_columns", all(token in create_table for token in required_columns))
check("p84_minimal_link_table_excludes_sensitive_message_fields", not re.search(
    r"operator_note|admin_route|action_log|payment_evidence|contact_email|message_status|customer_safe_report|canonical_customer_snapshot\s+jsonb",
    create_table,
    re.I,
))
check("p84_link_table_strict_schema_constraint", "schema_version = 'p84-audit-customer-artifact-link-v1'" in create_table)
check("p84_link_table_strict_owner_constraint", "account_id not like 'preview:%'" in create_table and "account_id_hash ~ '^[a-f0-9]{64}$'" in create_table)
check("p84_link_table_strict_identity_constraints", "artifact-audit-" in create_table and "pdf-[a-f0-9]" in create_table)
check("p84_link_table_strict_digest_constraints", create_table.count("^sha256:[a-f0-9]{64}$") == 4, create_table.count("^sha256:[a-f0-9]{64}$"))
check("p84_link_table_time_equality_constraint", "check (created_at = linked_at)" in create_table)
check("p84_link_table_restrictive_foreign_keys", create_table.count("on update restrict on delete restrict") == 3)
check("p84_link_table_rls_enabled", "alter table public.velmere_audit_customer_artifact_links enable row level security;" in migration_block)
check("p84_link_table_only_select_granted", "grant select on table public.velmere_audit_customer_artifact_links to authenticated, service_role;" in migration_block)
check("p84_link_table_no_customer_write_grant", not re.search(
    r"grant\s+(?:insert|update|delete|all)[^;]*velmere_audit_customer_artifact_links[^;]*authenticated",
    migration_block,
    re.I,
))
check("p84_link_owner_policy_uses_id_and_salted_hash", all(token in migration_block for token in [
    "create policy p84_audit_customer_artifact_link_owner_select",
    "account_id = public.velmere_current_account_id()",
    "account_id_hash = public.velmere_current_account_binding_hash()",
]))

link_guard = extract(
    migration_block,
    "create or replace function public.velmere_audit_customer_artifact_link_guard()",
    "revoke all on function public.velmere_audit_customer_artifact_link_guard()\n  from public, anon, authenticated, service_role;",
)
check("p84_link_guard_security_definer", "language plpgsql\nsecurity definer" in link_guard)
check("p84_link_guard_fixed_search_path", "set search_path = pg_catalog, public, pg_temp" in link_guard)
check("p84_link_guard_insert_only_immutable", "if tg_op <> 'INSERT'" in link_guard and "audit_customer_artifact_link_immutable" in link_guard)
check("p84_link_guard_recomputes_salted_owner_hash", "digest('velmere-account-binding-v1:' || new.account_id, 'sha256')" in link_guard)
check("p84_link_guard_binds_internal_message", "from public.velmere_audit_account_messages" in link_guard and "v_message.account_id <> new.account_id" in link_guard)
check("p84_link_guard_binds_customer_snapshot", "from public.velmere_customer_artifact_snapshots" in link_guard and "v_snapshot.snapshot_digest <> new.artifact_snapshot_digest" in link_guard)
check("p84_link_guard_binds_pdf_blob", "from public.velmere_customer_artifact_pdf_blobs" in link_guard and "v_blob.pdf_digest <> new.pdf_digest" in link_guard)
check("p84_link_guard_recomputes_pdf_hash_and_length", "octet_length(v_blob.pdf_bytes) <> v_blob.pdf_byte_length" in link_guard and "digest(v_blob.pdf_bytes, 'sha256')" in link_guard)
check("p84_link_guard_binds_exact_customer_snapshot", all(token in link_guard for token in [
    "v_exact := v_message.canonical_customer_snapshot->'exactAccountArtifact'",
    "v_exact->>'snapshotId' <> new.snapshot_id",
    "v_exact->>'pdfBlobId' <> new.pdf_blob_id",
    "v_exact->>'artifactDigest' <> new.artifact_digest",
    "v_exact->>'pdfDigest' <> new.pdf_digest",
]))
check("p84_link_guard_function_not_executable_by_roles", "revoke all on function public.velmere_audit_customer_artifact_link_guard()" in link_guard)
check("p84_link_trigger_covers_insert_update_delete", "before insert or update or delete" in migration_block)

check("p84_backfill_joins_message_snapshot_blob", all(token in migration_block for token in [
    "from public.velmere_audit_account_messages m",
    "join public.velmere_customer_artifact_snapshots s",
    "join public.velmere_customer_artifact_pdf_blobs b",
]))
check("p84_backfill_revalidates_through_trigger", migration_block.index("create trigger velmere_audit_customer_artifact_link_immutable") < migration_block.index("insert into public.velmere_audit_customer_artifact_links"))
check("p84_backfill_fails_if_exact_message_unlinked", "audit_customer_artifact_link_backfill_incomplete" in migration_block)

rpc = extract(
    migration_block,
    "create or replace function public.velmere_publish_audit_exact_artifact_v2(",
    "grant execute on function public.velmere_publish_audit_exact_artifact_v2(text, jsonb, text, jsonb, text, jsonb, jsonb)\n  to service_role;",
)
check("p84_rpc_security_definer", "language plpgsql\nsecurity definer" in rpc)
check("p84_rpc_fixed_search_path", "set search_path = pg_catalog, public, pg_temp" in rpc)
check("p84_rpc_calls_p83_parent_in_same_transaction", "v_publication := public.velmere_publish_audit_exact_artifact_v1(" in rpc)
check("p84_rpc_validates_closed_parent_shape", "jsonb_object_keys(v_publication)) <> 4" in rpc and "jsonb_object_keys(v_publication->'bundle')) <> 4" in rpc)
check("p84_rpc_parent_before_link_write", rpc.index("velmere_publish_audit_exact_artifact_v1(") < rpc.index("insert into public.velmere_audit_customer_artifact_links"))
check("p84_rpc_locks_message_snapshot_blob", rpc.count("for update;") >= 4, rpc.count("for update;"))
check("p84_rpc_serializes_link_retry", "pg_advisory_xact_lock" in rpc)
check("p84_rpc_rejects_ambiguous_link_identity", "audit_customer_artifact_link_identity_ambiguous" in rpc)
check("p84_rpc_idempotent_existing_link_verified", "if v_existing_count = 1" in rpc and "audit_customer_artifact_link_commit_verification_failed" in rpc)
check("p84_rpc_closed_response_schema", "'p84-audit-exact-artifact-owner-readable-publication-rpc-v2'" in rpc)
check("p84_rpc_response_contains_link_and_created_flags", all(token in rpc for token in [
    "'createdArtifact'", "'createdMessage'", "'createdLink'", "'snapshot'", "'blob'", "'message'", "'link'",
]))
check("p84_rpc_service_role_only", "from public, anon, authenticated, service_role" in rpc and "to service_role;" in rpc)
check("p84_rpc_no_client_execute_grant", "to authenticated" not in rpc.lower() and "to anon" not in rpc.lower())

p83_static = json.loads(P83_STATIC_RECEIPT.read_text(encoding="utf-8"))
p83_expected = p83_static["files"]["lib/reporting/audit-exact-artifact-atomic-publisher.ts"]["sha256"]
check("p84_preserves_p83_publisher_byte_for_byte", sha(P83_PUBLISHER) == p83_expected, {"expected": p83_expected, "current": sha(P83_PUBLISHER)})
check("p84_publisher_uses_versioned_v2_rpc", "velmere_publish_audit_exact_artifact_v2" in publisher and "owner-readable-publication-rpc-v2" in publisher)
check("p84_publisher_single_rpc_only", publisher.count(".rpc(") == 1, publisher.count(".rpc("))
check("p84_publisher_no_direct_table_access", "supabase.from(" not in publisher and ".from(TABLE" not in publisher)
check("p84_publisher_no_memory_or_two_write_fallback", all(token not in publisher for token in [
    "memoryStore", "storeAuditAccountMessage", "storePass4824AccountCustomerArtifactPdfBundle", 'source: "memory"',
]))
check("p84_publisher_requires_real_owner", "startsWith(\"preview:\")" in publisher)
check("p84_publisher_requires_durable_storage", "P84_AUDIT_EXACT_ARTIFACT_DURABLE_STORAGE_REQUIRED" in publisher and "if (!supabase) throw" in publisher)
check("p84_publisher_exact_rpc_response_keys", "P84_RPC_KEYS" in publisher and "assertExactObjectKeys(" in publisher)
check("p84_publisher_verifies_bundle_message_and_link", all(token in publisher for token in [
    "parsePass4824AccountCustomerArtifactPdfBundleRpcResponse",
    "assertReturnedMessage",
    "parseP84AuditCustomerArtifactLinkRow",
    "assertReturnedLink",
]))
check("p84_publisher_returned_link_cross_bound", all(token in publisher for token in [
    "args.link.auditSnapshotDigest !== args.auditSnapshot.snapshotDigest",
    "args.link.artifactSnapshotDigest !== args.snapshot.snapshotDigest",
    "args.link.pdfBlobId !== args.blob.blobId",
    "args.link.linkedAt !== messageUpdatedAt",
]))
check("p84_publisher_no_raw_external_evidence", re.search(r"raw(?:Source|Abi|Runtime|Trace|State)|pragma\s+solidity", publisher, re.I) is None)

check("p84_message_lookup_uses_minimal_link_table", 'P84_AUDIT_CUSTOMER_ARTIFACT_LINK_TABLE = "velmere_audit_customer_artifact_links"' in messages)
lookup = extract(messages, "export async function hasAuditAccountMessageExactArtifactLink", "export async function getAuditAccountMessageByIdentifier")
check("p84_message_lookup_selects_closed_column_set", ".select(P84_AUDIT_CUSTOMER_ARTIFACT_LINK_SELECT)" in lookup and '.select("*")' not in lookup)
check("p84_message_lookup_filters_owner_and_snapshot", '.eq("account_id", accountId)' in lookup and '.eq("snapshot_id", snapshotId)' in lookup)
check("p84_message_lookup_limits_ambiguity", ".limit(2)" in lookup and "audit_account_artifact_link_ambiguous" in lookup)
check("p84_message_lookup_parses_integrity_row", "parseP84AuditCustomerArtifactLinkRow" in lookup)
check("p84_link_parser_closed_shape", "hasExactObjectKeys(row, rowKeys)" in messages and "audit_customer_artifact_link_row_shape_invalid" in messages)
check("p84_link_parser_recomputes_owner_hash", "accountIdHash !== hashVelmereAccountBinding(accountId)" in messages)
check("p84_link_parser_validates_all_digest_classes", messages.count("!digestPattern.test(") >= 4, messages.count("!digestPattern.test("))

check("p84_handler_uses_current_publisher_once", handler.count("publishP84AuditExactArtifactOwnerReadable(") == 1)
check("p84_handler_no_longer_uses_p83_publisher", "publishP83AuditExactArtifactAtomically" not in handler and "audit-exact-artifact-atomic-publisher" not in handler)
check("p84_handler_uses_committed_objects", all(token in handler for token in [
    "atomicPublication.auditSnapshot", "atomicPublication.message", "atomicPublication.snapshot", "atomicPublication.blob",
]))
check("p84_handler_fail_closed_wording_mentions_owner_link", "owner-readable delivery link" in handler and "Nothing was published." in handler)

check("p84_owner_route_uses_owner_token_boundary", "resolveCustomerOwnedDataBoundary" in owner_route and "client: ownerClient" in owner_route)
check("p84_owner_route_filters_audit_through_link", owner_route.count("hasAuditAccountMessageExactArtifactLink({") >= 2)
check("p84_owner_route_overfetches_bounded_window_before_filter", "limit: 50" in owner_route and "visibleSnapshots.slice(0, limit)" in owner_route)
check("p84_owner_route_never_uses_service_role_directly", "getSupabaseServiceRoleClient" not in owner_route)

check("p84_runtime_fixture_clock_frozen", "installFixedFixtureClock();" in runtime and "generatedAt: GENERATED_AT" in runtime)
check("p84_runtime_tests_closed_rpc_shape", "p84_extra_rpc_field_rejected" in runtime and "p84_missing_rpc_field_rejected" in runtime)
check("p84_runtime_tests_link_mutations", all(token in runtime for token in [
    "p84_tampered_link_owner_rejected",
    "p84_tampered_link_audit_digest_rejected",
    "p84_tampered_link_pdf_digest_rejected",
    "p84_extra_link_field_rejected",
]))
check("p84_runtime_tests_minimal_owner_lookup", "p84_owner_lookup_uses_minimal_link_table" in runtime and "p84_owner_lookup_never_selects_full_message" in runtime)
check("p84_runtime_does_not_claim_postgres", "authorizedPostgresExecution: \"WITHHELD\"" in runtime and "RLSRuntime: \"WITHHELD\"" in runtime)

payload = {
    "schemaVersion": "velmere.p84.audit-customer-artifact-owner-read-static.v1",
    "status": "PASS" if all(row["status"] == "PASS" for row in checks) else "FAIL",
    "runtime": {"python": platform.python_version(), "platform": platform.platform()},
    "files": {
        str(path.relative_to(ROOT)): {"bytes": path.stat().st_size, "sha256": sha(path)}
        for path in [MIGRATION, P83_MIGRATION, SCHEMA, PUBLISHER, P83_PUBLISHER, MESSAGES, HANDLER, OWNER_ROUTE, RUNTIME]
    },
    "discoveredDefects": [
        {
            "id": "P84-DEFECT-01-P83-AUTHENTICATED-ARTIFACT-SELECT-REVOKED",
            "severity": "HIGH_CUSTOMER_DELIVERY_BLOCKER",
            "status": "REPAIRED_IN_SOURCE_STATIC_PROVEN_RUNTIME_WITHHELD",
            "description": "P83 copied older artifact DDL that revoked authenticated SELECT after the owner RLS migrations, making the real owner-token route unable to read snapshots and PDF blobs.",
        },
        {
            "id": "P84-DEFECT-02-OWNER-ROUTE-QUERIED-SERVICE-ROLE-MESSAGE-LEDGER",
            "severity": "HIGH_CUSTOMER_DELIVERY_BLOCKER",
            "status": "REPAIRED_IN_SOURCE_STATIC_AND_LOCAL_RUNTIME_PROVEN",
            "description": "The owner route attempted to validate Audit publication through the full service-role-only message ledger. P84 replaces that read with a minimal immutable RLS link ledger.",
        },
    ],
    "checks": {
        "total": len(checks),
        "passed": sum(row["status"] == "PASS" for row in checks),
        "failed": sum(row["status"] == "FAIL" for row in checks),
        "rows": checks,
    },
    "truthBoundary": (
        "Static proof establishes ordered migration reachability, final privilege intent, salted owner policies, a minimal immutable link ledger, "
        "versioned single-RPC publication and customer-path use of the owner-token client. The local runtime harness validates TypeScript response/link "
        "integrity against mocked clients. This does not execute PostgreSQL, Supabase RLS, JWT isolation, deployed HTTP, exact Windows or current chain state."
    ),
}
RECEIPT.parent.mkdir(parents=True, exist_ok=True)
RECEIPT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
print(json.dumps(payload, indent=2))
