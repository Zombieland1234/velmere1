#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PARENT = Path("/mnt/data/velmere_p87_work/base")
OUT = ROOT / "receipts/p87/P87_P86_COMPATIBILITY_AND_SUPERSESSION.json"
LOG = ROOT / "artifacts/p87/logs/P87_P86_COMPATIBILITY_DIAGNOSTIC.log"
CHECKS: list[dict[str, object]] = []


def add(identifier: str, ok: bool, detail: object | None = None) -> None:
    row: dict[str, object] = {"id": identifier, "status": "PASS" if ok else "FAIL"}
    if detail is not None:
        row["detail"] = detail
    CHECKS.append(row)
    if not ok:
        raise AssertionError(f"{identifier}: {detail!r}")


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


frozen = [
    "lib/reporting/account-customer-artifact-snapshot.ts",
    "lib/reporting/customer-artifact-pdf-availability.ts",
    "lib/server/lazy-route-modules/account--customer-artifact.ts",
    "lib/db/schema.sql",
    "supabase/migrations/20260820000004_p86_customer_artifact_exact_pdf_new_write_gate.sql",
    "tests/security/a102-p36-exact-customer-pdf-integration.test.ts",
    "tests/security/a102-account-artifact-preview-download-parity.test.ts",
]
for rel in frozen:
    parent = PARENT / rel
    current = ROOT / rel
    add(
        f"p87_p86_frozen_{rel.replace('/', '_').replace('.', '_')}",
        parent.is_file() and current.is_file() and parent.read_bytes() == current.read_bytes(),
        {
            "parentSha256": sha(parent) if parent.is_file() else None,
            "currentSha256": sha(current) if current.is_file() else None,
        },
    )

report = (ROOT / "lib/server/market-integrity-route-modules/report.ts").read_text(encoding="utf-8")
helper = (ROOT / "lib/market-integrity/real-markets-paid-account-artifact.ts").read_text(encoding="utf-8")
pdf_route = (ROOT / "lib/server/market-integrity-route-modules/report-pdf.ts").read_text(encoding="utf-8")
add("p87_replacement_report_calls_exact_paid_helper", "createPass4823RealMarketsPaidAccountArtifact" in report)
add("p87_replacement_report_no_direct_store", "storePass4824AccountCustomerArtifactPdfBundle" not in report)
add("p87_replacement_report_basic_legacy_only", 'if (reportTier === "Basic")' in report and 'requestedTier: "Basic"' in report)
add(
    "p87_replacement_helper_store_precedes_token",
    helper.index("const stored = await storePass4824AccountCustomerArtifactPdfBundle")
    < helper.index("const pdfToken = issueP87CustomerReportExactPdfToken"),
)
add("p87_replacement_helper_stores_render_once_bytes", "pdfBytes: preparedArtifact.rendered.bytes" in helper)
add("p87_replacement_paid_download_uses_exact_blob", "pdfBytes: foundBlob.blob.pdfBytes" in pdf_route)
add("p87_replacement_paid_download_no_rerender", "renderCustomerTierPdf" not in pdf_route)
add("p87_replacement_legacy_paid_rejected", "customer_report_paid_exact_artifact_token_required" in pdf_route)

# The frozen P86 static harness is executed and must fail only because its direct-writer
# location assertion was intentionally superseded by the stronger P87 store-first helper.
static_cmd = ["python3", "scripts/p86/test-p86-exact-pdf-fail-closed-static.py"]
static_run = subprocess.run(static_cmd, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
static_output = (static_run.stdout + b"\n--- STDERR ---\n" + static_run.stderr).decode(errors="replace")
add("p87_p86_static_historical_harness_executed", static_run.returncode != 0, static_run.returncode)
add(
    "p87_p86_static_failure_exactly_adjudicated",
    "p86_market_writer_marks_exact_pdf" in static_output,
    static_output[-1000:],
)
add(
    "p87_p86_static_failure_not_unrelated",
    "Traceback" in static_output and "AssertionError: p86_market_writer_marks_exact_pdf" in static_output,
)

# The actual P86 route behavior still executes green on current bytes.
runtime_cmd = ["python3", "scripts/p86/run-p86-exact-pdf-fail-closed-runtime.py"]
runtime_run = subprocess.run(runtime_cmd, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
runtime_output = runtime_run.stdout + (b"\n--- STDERR ---\n" + runtime_run.stderr if runtime_run.stderr else b"")
LOG.parent.mkdir(parents=True, exist_ok=True)
LOG.write_bytes(
    b"P86 STATIC SUPERSESSION DIAGNOSTIC\n"
    + static_output.encode()
    + b"\n\nP86 RUNTIME CURRENT-BYTES REGRESSION\n"
    + runtime_output
)
add("p87_p86_runtime_current_bytes_exit_zero", runtime_run.returncode == 0, runtime_run.stderr.decode(errors="replace"))
runtime_receipt = json.loads((ROOT / "receipts/p86/P86_EXACT_PDF_FAIL_CLOSED_RUNTIME.json").read_text(encoding="utf-8"))
add(
    "p87_p86_runtime_current_bytes_61_of_61",
    runtime_receipt.get("checks", {}).get("passed") == 61
    and runtime_receipt.get("checks", {}).get("total") == 61,
    runtime_receipt.get("checks"),
)
add(
    "p87_p86_parent_preserved_and_p87_current_promoted",
    (PARENT / "VELMERE_ACTIVE_PASS.txt").read_text().strip() == "P86R1"
    and (ROOT / "VELMERE_ACTIVE_PASS.txt").read_text().strip() == "P87R1",
    {
        "parent": (PARENT / "VELMERE_ACTIVE_PASS.txt").read_text().strip(),
        "current": (ROOT / "VELMERE_ACTIVE_PASS.txt").read_text().strip(),
    },
)

payload = {
    "schemaVersion": "velmere.p87.p86-compatibility-and-supersession.v1",
    "generatedAt": "2026-08-20T12:10:00.000Z",
    "status": "PASS" if all(row["status"] == "PASS" for row in CHECKS) else "FAIL",
    "frozenP86Files": frozen,
    "supersededHistoricalAssertion": {
        "harness": "scripts/p86/test-p86-exact-pdf-fail-closed-static.py",
        "result": "EXPECTED_NONZERO_ADJUDICATED_NOT_COUNTED_AS_CURRENT_PASS",
        "reason": (
            "P86 required the direct report route to contain the exact-PDF marker/store call. "
            "P87 intentionally moves paid publication into a dedicated render-once/store-first helper "
            "and issues authority only after persistence."
        ),
        "replacementProof": "P87 static/runtime and this compatibility receipt",
    },
    "checks": {
        "total": len(CHECKS),
        "passed": sum(row["status"] == "PASS" for row in CHECKS),
        "failed": sum(row["status"] == "FAIL" for row in CHECKS),
        "rows": CHECKS,
    },
    "truthBoundary": (
        "P86 exact account-artifact fail-closed behavior remains physically green. The frozen P86 static "
        "writer-location assertion is explicitly superseded, not hidden or rewritten. No deployed, database, "
        "Customer FINAL, rights, sale or exact-Windows credit is granted."
    ),
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"status": payload["status"], "passed": payload["checks"]["passed"], "total": payload["checks"]["total"]}, indent=2))
raise SystemExit(0 if payload["status"] == "PASS" else 1)
