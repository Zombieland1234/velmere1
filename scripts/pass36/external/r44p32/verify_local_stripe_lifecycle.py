#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import pathlib
import re
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parent
EVIDENCE = pathlib.Path(os.environ.get("VELMERE_EVIDENCE_DIR", str(ROOT / "evidence"))).resolve()
REVISION = os.environ["VELMERE_SOURCE_REVISION_ID"]
MANIFEST_SHA = os.environ["VELMERE_SOURCE_MANIFEST_SHA256"]
AGGREGATE_SHA = os.environ["VELMERE_SOURCE_AGGREGATE_SHA256"]
EXPECTED = [
    "checkout",
    "signed-webhook",
    "paymentintent-binding",
    "entitlement-activation",
    "duplicate-idempotency",
    "event-reorder",
    "replay-denial",
    "refund",
    "refund-webhook",
    "entitlement-revocation",
    "reconciliation",
    "controlled-dead-letter-requeue",
]
SOURCE_BINDING = {
    "revisionId": REVISION,
    "sourceManifestSha256": MANIFEST_SHA,
    "sourceAggregateSha256": AGGREGATE_SHA,
}


def read_json(path: pathlib.Path) -> Any:
    return json.loads(path.read_text("utf-8"))


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


checks: list[dict[str, Any]] = []


def check(check_id: str, ok: bool, detail: Any = None) -> None:
    checks.append({"id": check_id, "ok": bool(ok), "detail": detail})


summary_path = EVIDENCE / "R44P32_LOCAL_STRIPE_LIFECYCLE.json"
index_path = EVIDENCE / "R44P32_LOCAL_STRIPE_ARTIFACT_INDEX.json"
secret_scan_path = EVIDENCE / "R44P32_LOCAL_STRIPE_SECRET_SCAN.json"
check("summary-present", summary_path.is_file())
check("index-present", index_path.is_file())
check("secret-scan-present", secret_scan_path.is_file())
summary = read_json(summary_path)
index = read_json(index_path)
secret_scan = read_json(secret_scan_path)
check("summary-status", summary.get("status") == "PASS", summary.get("status"))
check("summary-classification", summary.get("classification") == "LOCAL_DISPOSABLE_STRIPE_API_FIXTURE_AND_WEBHOOK_LEDGER_ONLY")
check("summary-source-binding", summary.get("sourceBinding") == SOURCE_BINDING)
check("summary-denominator", summary.get("required") == 12 and summary.get("executed") == 12 and summary.get("passed") == 12 and summary.get("failed") == 0)
check("summary-case-order", summary.get("caseIds") == EXPECTED)
truth = summary.get("truthBoundary") or {}
check("truth-local-stripe-fixture", truth.get("localStripeApiFixtureCredit") is True)
check("truth-no-full-stripe", truth.get("realStripeTestFullLifecycleCredit") is False)
check("truth-no-webhook-delivery", truth.get("stripeWebhookDeliveryCredit") is False)
check("truth-no-production", truth.get("productionPaymentCredit") is False)
check("truth-no-customer", truth.get("customerCredit") is False)
check("truth-no-sale", truth.get("saleCredit") is False)
check("truth-no-live", truth.get("liveCredit") is False)
check("local-provider-pinned", (summary.get("stripeMock") or {}).get("provider") == "VELMERE_LOCAL_PYTHON_STRIPE_API_FIXTURE_V1" and (summary.get("stripeMock") or {}).get("officialStripeMockCredit") is False)

case_files = sorted((EVIDENCE / "cases").glob("*.json"))
check("case-file-count", len(case_files) == 12, len(case_files))
case_rows = [read_json(path) for path in case_files]
check("case-ids", [row.get("caseId") for row in case_rows] == EXPECTED)
check("case-pass", all(row.get("passed") is True and row.get("observedOutcome") == "PASS" for row in case_rows))
check("case-source-binding", all(row.get("sourceBinding") == SOURCE_BINDING for row in case_rows))
check("case-classification", all(row.get("classification") == "LOCAL_DISPOSABLE_STRIPE_API_FIXTURE_AND_WEBHOOK_LEDGER_ONLY" for row in case_rows))
check("case-truth", all((row.get("truthBoundary") or {}).get("realStripeTestFullLifecycleCredit") is False for row in case_rows))

facts = {row["caseId"]: row.get("facts") or {} for row in case_rows}
check("checkout-mock", facts["checkout"].get("stripeMockHttpStatus") == 200 and facts["checkout"].get("object") == "checkout.session" and facts["checkout"].get("livemode") is False)
check("signature-boundary", facts["signed-webhook"].get("invalidSignatureStatus") == 400 and facts["signed-webhook"].get("validSignatureStatus") == 200 and facts["signed-webhook"].get("secretStored") is False)
check("payment-binding", facts["paymentintent-binding"].get("stripeMockPaymentIntentStatus") == 200 and facts["paymentintent-binding"].get("tamperedBindingStatus") == 422)
check("activation", facts["entitlement-activation"].get("entitlementStatus") == "active" and facts["entitlement-activation"].get("accessAllowed") is True)
check("idempotency", facts["duplicate-idempotency"].get("duplicate") is True and facts["duplicate-idempotency"].get("eventCountBefore") == facts["duplicate-idempotency"].get("eventCountAfter"))
check("reorder", facts["event-reorder"].get("refundBeforePaymentStatus") == 202 and facts["event-reorder"].get("retryReadyCount") == 1)
check("replay", facts["replay-denial"].get("status") == 409 and facts["replay-denial"].get("error") == "event_id_payload_replay_mismatch")
check("refund-mock", facts["refund"].get("stripeMockHttpStatus") == 200 and facts["refund"].get("object") == "refund" and facts["refund"].get("livemode") is False)
check("refund-webhook", facts["refund-webhook"].get("status") == 200 and facts["refund-webhook"].get("entitlement") == "revoked_refunded")
check("revocation", facts["entitlement-revocation"].get("entitlementStatus") == "revoked_refunded" and facts["entitlement-revocation"].get("accessAllowed") is False)
check("reconciliation", facts["reconciliation"].get("action") == "revoked_from_provider_refund" and facts["reconciliation"].get("entitlementStatus") == "revoked_refunded")
check("dead-letter-requeue", facts["controlled-dead-letter-requeue"].get("firstRequeueProcessed") == 1 and facts["controlled-dead-letter-requeue"].get("secondRequeueProcessed") == 0 and facts["controlled-dead-letter-requeue"].get("entitlementStatus") == "revoked_refunded")

check("index-source-binding", index.get("sourceBinding") == SOURCE_BINDING)
artifacts = index.get("artifacts") or []
check("artifact-count", len(artifacts) == 14, len(artifacts))
paths = [str(row.get("path", "")) for row in artifacts]
check("artifact-path-unique", len(paths) == len(set(paths)))
check("artifact-path-safe", all(path and not path.startswith("/") and ".." not in pathlib.PurePosixPath(path).parts for path in paths))
physical_ok = True
for row in artifacts:
    path = EVIDENCE / str(row.get("path", ""))
    if not path.is_file() or path.is_symlink():
        physical_ok = False
        break
    data = path.read_bytes()
    if len(data) != row.get("byteLength") or sha256(data) != row.get("sha256"):
        physical_ok = False
        break
check("artifact-physical-binding", physical_ok)
check("artifact-case-bijection", sorted(row.get("caseId") for row in artifacts if row.get("caseId") != "durable-state") == sorted(EXPECTED))
check("durable-state-artifacts", sum(1 for row in artifacts if row.get("caseId") == "durable-state") == 2)
check("secret-scan-pass", secret_scan.get("passed") is True and secret_scan.get("rawSecretLeaks") == [])

credential_patterns = [
    re.compile(r"sk_(?:live|test)_[A-Za-z0-9_-]{12,}"),
    re.compile(r"whsec_[A-Za-z0-9_-]{12,}"),
]
credential_hits: list[str] = []
for path in EVIDENCE.rglob("*"):
    if not path.is_file() or path.suffix.lower() not in {".json", ".txt", ".log"}:
        continue
    text = path.read_text("utf-8", errors="replace")
    for pattern in credential_patterns:
        if pattern.search(text):
            credential_hits.append(path.relative_to(EVIDENCE).as_posix())
check("no-credential-shaped-evidence", credential_hits == [], sorted(set(credential_hits)))

real_probe = summary.get("realStripeTestApiProbe") or {}
check("real-probe-no-secret", "secret" not in json.dumps(real_probe).lower())
check("real-probe-truth", (real_probe.get("truthBoundary") or {}).get("fullStripeTestLifecycleCredit") is False)

failed = [row for row in checks if not row["ok"]]
report = {
    "schemaVersion": "velmere.pass36.a102r44p32.independent-local-stripe-verification.v1",
    "status": "PASS" if not failed else "FAIL",
    "checks": len(checks),
    "passed": len(checks) - len(failed),
    "failed": len(failed),
    "sourceBinding": SOURCE_BINDING,
    "classification": "LOCAL_DISPOSABLE_STRIPE_API_FIXTURE_AND_WEBHOOK_LEDGER_ONLY",
    "rows": checks,
    "truthBoundary": {
        "realStripeTestFullLifecycleCredit": False,
        "productionPaymentCredit": False,
        "saleCredit": False,
        "liveCredit": False,
    },
}
pathlib.Path(os.environ.get("VELMERE_VERIFIER_OUTPUT", str(ROOT / "R44P32_INDEPENDENT_LOCAL_STRIPE_VERIFICATION.json"))).write_bytes(
    (json.dumps(report, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")
)
print(json.dumps({"status": report["status"], "checks": report["checks"], "passed": report["passed"], "failed": report["failed"]}, sort_keys=True))
if failed:
    raise SystemExit(1)
