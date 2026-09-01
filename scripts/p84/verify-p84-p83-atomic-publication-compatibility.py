#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
P83_RUNTIME = ROOT / "receipts/p83/P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_RUNTIME.json"
P83_STATIC = ROOT / "receipts/p83/P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_STATIC.json"
P83_PUBLISHER = ROOT / "lib/reporting/audit-exact-artifact-atomic-publisher.ts"
P84_MIGRATION = ROOT / "supabase/migrations/20260820000002_p84_audit_customer_artifact_owner_read_path.sql"
P84_PUBLISHER = ROOT / "lib/reporting/audit-exact-artifact-owner-readable-publisher.ts"
OUT = ROOT / "receipts/p84/P84_P83_ATOMIC_PUBLICATION_COMPATIBILITY.json"
LOG = ROOT / "artifacts/p84/logs/P83_ATOMIC_PUBLICATION_COMPATIBILITY.log"
COMMAND = [
    "node",
    "--import",
    "./scripts/pass11/register-offline-ts-loader.mjs",
    "scripts/p83/test-p83-audit-exact-artifact-atomic-publication-runtime.mjs",
]


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


result = subprocess.run(COMMAND, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=False)
LOG.parent.mkdir(parents=True, exist_ok=True)
LOG.write_bytes(result.stdout)
try:
    runtime = json.loads(P83_RUNTIME.read_text(encoding="utf-8"))
except Exception:
    runtime = {}
static = json.loads(P83_STATIC.read_text(encoding="utf-8"))
expected_hash = static["files"]["lib/reporting/audit-exact-artifact-atomic-publisher.ts"]["sha256"]
p84_migration = P84_MIGRATION.read_text(encoding="utf-8")
p84_publisher = P84_PUBLISHER.read_text(encoding="utf-8")
checks = [
    {"id": "p84_p83_runtime_exit_zero", "status": "PASS" if result.returncode == 0 else "FAIL", "detail": result.returncode},
    {"id": "p84_p83_runtime_receipt_green", "status": "PASS" if runtime.get("status") == "PASS_BOUNDED_LOCAL_MOCKED_RPC" else "FAIL", "detail": runtime.get("status")},
    {"id": "p84_p83_runtime_35_of_35", "status": "PASS" if (runtime.get("checks") or {}).get("passed") == 35 and (runtime.get("checks") or {}).get("total") == 35 else "FAIL", "detail": runtime.get("checks")},
    {"id": "p84_p83_publisher_byte_frozen", "status": "PASS" if sha(P83_PUBLISHER) == expected_hash else "FAIL", "detail": {"expected": expected_hash, "actual": sha(P83_PUBLISHER)}},
    {"id": "p84_v2_wraps_frozen_p83_rpc", "status": "PASS" if "public.velmere_publish_audit_exact_artifact_v1(" in p84_migration else "FAIL"},
    {"id": "p84_current_handler_does_not_call_p83_directly", "status": "PASS" if "publishP83AuditExactArtifactAtomically" not in (ROOT / "lib/security/audit-watch-post-handler.ts").read_text(encoding="utf-8") else "FAIL"},
    {"id": "p84_publisher_rejects_old_v1_schema_as_current", "status": "PASS" if "P84_AUDIT_EXACT_ARTIFACT_OWNER_READABLE_PUBLICATION_RPC_SCHEMA" in p84_publisher and "p83-audit-exact-artifact-atomic-publication-rpc-v1" not in p84_publisher else "FAIL"},
]
failed = [row for row in checks if row["status"] != "PASS"]
payload = {
    "schemaVersion": "velmere.p84.p83-atomic-publication-compatibility.v1",
    "status": "PASS" if not failed else "FAIL",
    "command": " ".join(COMMAND),
    "p83PublisherSha256": sha(P83_PUBLISHER),
    "checks": {"total": len(checks), "passed": len(checks) - len(failed), "failed": len(failed), "rows": checks},
    "truthBoundary": "P83 remains a byte-frozen local compatibility layer. Current customer publication is P84 v2 and requires its separate owner-readable link; no P83 receipt is promoted to P84 or Customer FINAL.",
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
print(json.dumps(payload, indent=2))
raise SystemExit(1 if failed else 0)
