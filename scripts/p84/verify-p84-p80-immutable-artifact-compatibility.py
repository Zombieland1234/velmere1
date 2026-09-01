#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
P80_STATIC_RECEIPT = ROOT / "receipts/p80/P80_AUDIT_EXACT_IMMUTABLE_ACCOUNT_ARTIFACT_STATIC.json"
P80_RUNTIME_RECEIPT = ROOT / "receipts/p80/P80_AUDIT_EXACT_IMMUTABLE_ACCOUNT_ARTIFACT_RUNTIME.json"
PUBLISHER = ROOT / "lib/reporting/audit-exact-artifact-owner-readable-publisher.ts"
HANDLER = ROOT / "lib/security/audit-watch-post-handler.ts"
MESSAGES = ROOT / "lib/account/audit-account-messages.ts"
MIGRATION = ROOT / "supabase/migrations/20260820000002_p84_audit_customer_artifact_owner_read_path.sql"
OUT = ROOT / "receipts/p84/P84_P80_IMMUTABLE_ARTIFACT_COMPATIBILITY.json"
LOG = ROOT / "artifacts/p84/logs/P80_STATIC_LEGACY_EXPECTATIONS.log"
COMMAND = ["python3", "scripts/p80/test-p80-audit-exact-immutable-artifact-static.py"]
EXPECTED_SUPERSEDED = {
    "p80_watch_stores_pdf_bytes_not_metadata_only",
    "p80_watch_orders_store_bind_message",
    "p80_audit_message_link_lookup_owner_and_snapshot_scoped",
}

result = subprocess.run(COMMAND, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=False)
LOG.parent.mkdir(parents=True, exist_ok=True)
LOG.write_bytes(result.stdout)
static = json.loads(P80_STATIC_RECEIPT.read_text(encoding="utf-8"))
runtime = json.loads(P80_RUNTIME_RECEIPT.read_text(encoding="utf-8"))
rows = static.get("checks") if isinstance(static.get("checks"), list) else []
failed_ids = {row.get("id") for row in rows if row.get("status") == "FAIL"}
publisher = PUBLISHER.read_text(encoding="utf-8")
handler = HANDLER.read_text(encoding="utf-8")
messages = MESSAGES.read_text(encoding="utf-8")
migration = MIGRATION.read_text(encoding="utf-8")
checks = [
    {
        "id": "p84_p80_legacy_static_fails_only_superseded_path_assertions",
        "status": "PASS" if result.returncode == 1 and failed_ids == EXPECTED_SUPERSEDED else "FAIL",
        "detail": {"returnCode": result.returncode, "failed": sorted(failed_ids)},
    },
    {
        "id": "p84_p80_legacy_static_remaining_100_green",
        "status": "PASS" if len(rows) == 103 and sum(row.get("status") == "PASS" for row in rows) == 100 else "FAIL",
        "detail": {"total": len(rows), "passed": sum(row.get("status") == "PASS" for row in rows)},
    },
    {
        "id": "p84_p80_runtime_immutable_artifact_67_of_67",
        "status": "PASS" if (runtime.get("checks") or {}).get("passed") == 67 and (runtime.get("checks") or {}).get("total") == 67 else "FAIL",
        "detail": runtime.get("checks"),
    },
    {
        "id": "p84_replacement_passes_pdf_bytes_into_atomic_publisher",
        "status": "PASS" if "pdfBytes: renderedCanonicalAuditPdf.bytes" in handler and "p_pdf_base64" in publisher else "FAIL",
    },
    {
        "id": "p84_replacement_binds_before_single_rpc",
        "status": "PASS" if publisher.index("bindAuditAccountCustomerSnapshotToExactArtifact") < publisher.index("await supabase.rpc") and publisher.count(".rpc(") == 1 else "FAIL",
    },
    {
        "id": "p84_replacement_commits_bundle_message_and_owner_link_transactionally",
        "status": "PASS" if "public.velmere_publish_audit_exact_artifact_v1(" in migration and "insert into public.velmere_audit_customer_artifact_links" in migration and "ownerReadableLinkCommitted: true" in publisher else "FAIL",
    },
    {
        "id": "p84_replacement_link_lookup_owner_and_snapshot_scoped",
        "status": "PASS" if '.eq("account_id", accountId)' in messages and '.eq("snapshot_id", snapshotId)' in messages and "velmere_audit_customer_artifact_links" in messages else "FAIL",
    },
    {
        "id": "p84_replacement_does_not_reopen_full_message_ledger",
        "status": "PASS" if "revoke all on table public.velmere_audit_account_messages from public, anon, authenticated;" in migration and '.select("*")' not in messages[messages.index("export async function hasAuditAccountMessageExactArtifactLink"):messages.index("export async function getAuditAccountMessageByIdentifier")] else "FAIL",
    },
]
failed = [row for row in checks if row["status"] != "PASS"]
payload = {
    "schemaVersion": "velmere.p84.p80-immutable-artifact-compatibility.v1",
    "status": "PASS" if not failed else "FAIL",
    "legacyHarness": {
        "status": static.get("status"),
        "passed": sum(row.get("status") == "PASS" for row in rows),
        "total": len(rows),
        "supersededAssertions": sorted(EXPECTED_SUPERSEDED),
    },
    "checks": {"total": len(checks), "passed": len(checks) - len(failed), "failed": len(failed), "rows": checks},
    "truthBoundary": "The P80 runtime remains green. Three P80 static assertions intentionally describe the removed pre-P83 multi-write/message-table path and are not relabeled as P80 PASS; P84 verifies their stricter single-RPC/minimal-link replacements separately.",
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
print(json.dumps(payload, indent=2))
raise SystemExit(1 if failed else 0)
