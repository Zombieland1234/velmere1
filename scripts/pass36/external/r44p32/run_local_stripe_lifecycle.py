#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import hmac
import http.server
import json
import os
import pathlib
import secrets
import sqlite3
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

REVISION = os.environ["VELMERE_SOURCE_REVISION_ID"]
MANIFEST_SHA = os.environ["VELMERE_SOURCE_MANIFEST_SHA256"]
AGGREGATE_SHA = os.environ["VELMERE_SOURCE_AGGREGATE_SHA256"]
RUN_ID = os.environ.get("GITHUB_RUN_ID", "local")
STRIPE_MOCK_URL = os.environ.get("STRIPE_MOCK_URL", "http://127.0.0.1:12111")
EVIDENCE_DIR = pathlib.Path(os.environ.get("VELMERE_EVIDENCE_DIR", "evidence")).resolve()
CLASSIFICATION = "LOCAL_DISPOSABLE_STRIPE_API_FIXTURE_AND_WEBHOOK_LEDGER_ONLY"
EXPECTED_CASE_IDS = [
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


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def canonical_json_bytes(value: Any) -> bytes:
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False) + "\n").encode("utf-8")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_text(value: str) -> str:
    return sha256_bytes(value.encode("utf-8"))


def write_json(path: pathlib.Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(canonical_json_bytes(value))


def http_json(
    url: str,
    *,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    form: dict[str, str] | None = None,
    body: bytes | None = None,
    timeout: float = 20.0,
) -> tuple[int, dict[str, Any], bytes]:
    request_headers = dict(headers or {})
    request_body = body
    if form is not None:
        request_body = urllib.parse.urlencode(form).encode("utf-8")
        request_headers.setdefault("content-type", "application/x-www-form-urlencoded")
    request_headers.setdefault("accept", "application/json")
    request = urllib.request.Request(url, data=request_body, headers=request_headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read()
            return int(response.status), json.loads(raw.decode("utf-8")), raw
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            parsed = json.loads(raw.decode("utf-8"))
        except Exception:
            parsed = {"error": {"type": "non_json_error", "status": int(exc.code)}}
        return int(exc.code), parsed, raw


def stripe_mock_post(path: str, form: dict[str, str]) -> tuple[int, dict[str, Any]]:
    status, payload, _ = http_json(
        f"{STRIPE_MOCK_URL}{path}",
        method="POST",
        headers={"authorization": "Bearer " + "sk_" + "test_" + "r44p32_fixture_only"},
        form=form,
    )
    return status, payload


def redacted_real_stripe_probe(evidence_dir: pathlib.Path) -> dict[str, Any]:
    key = os.environ.get("STRIPE_SECRET_KEY", "").strip()
    available = key.startswith("sk_test_") and len(key) >= 24
    result: dict[str, Any] = {
        "credentialsAvailable": available,
        "attempted": False,
        "paymentIntentCreated": False,
        "refundCreated": False,
        "livemodeFalse": False,
        "status": "BLOCKED_NO_TEST_KEY" if not available else "NOT_RUN",
        "truthBoundary": {
            "fullStripeTestLifecycleCredit": False,
            "webhookDeliveryCredit": False,
            "saleCredit": False,
            "liveCredit": False,
        },
    }
    if not available:
        write_json(evidence_dir / "R44P32_REAL_STRIPE_TEST_CREDENTIAL_ADMISSION.json", result)
        return result

    # Optional, bounded test-mode API probe only. Never prints or stores the key or raw object IDs.
    result["attempted"] = True
    idempotency = f"vlm-r44p32-{sha256_text(RUN_ID)[:20]}"
    try:
        status, payment_intent, _ = http_json(
            "https://api.stripe.com/v1/payment_intents",
            method="POST",
            headers={
                "authorization": f"Bearer {key}",
                "idempotency-key": idempotency,
            },
            form={
                "amount": "100",
                "currency": "eur",
                "payment_method": "pm_card_visa",
                "confirm": "true",
                "description": "Velmere R44P32 disposable test-mode probe",
                "metadata[source_manifest_sha256]": MANIFEST_SHA,
                "metadata[source_aggregate_sha256]": AGGREGATE_SHA,
                "metadata[run_id_hash]": sha256_text(RUN_ID),
            },
            timeout=30.0,
        )
        payment_id = str(payment_intent.get("id", ""))
        payment_ok = (
            status == 200
            and payment_intent.get("object") == "payment_intent"
            and payment_intent.get("livemode") is False
            and payment_intent.get("status") == "succeeded"
            and payment_id.startswith("pi_")
        )
        result["paymentIntentCreated"] = payment_ok
        result["livemodeFalse"] = payment_intent.get("livemode") is False
        result["paymentIntentIdSha256"] = sha256_text(payment_id) if payment_id else None
        result["paymentStatus"] = str(payment_intent.get("status", ""))[:64]
        if payment_ok:
            refund_status, refund, _ = http_json(
                "https://api.stripe.com/v1/refunds",
                method="POST",
                headers={
                    "authorization": f"Bearer {key}",
                    "idempotency-key": f"{idempotency}-refund",
                },
                form={"payment_intent": payment_id},
                timeout=30.0,
            )
            refund_id = str(refund.get("id", ""))
            refund_ok = (
                refund_status == 200
                and refund.get("object") == "refund"
                and refund.get("status") == "succeeded"
                and refund_id.startswith("re_")
            )
            result["refundCreated"] = refund_ok
            result["refundIdSha256"] = sha256_text(refund_id) if refund_id else None
            result["refundStatus"] = str(refund.get("status", ""))[:64]
        result["status"] = (
            "PASS_REAL_STRIPE_TEST_API_PROBE_ONLY"
            if result["paymentIntentCreated"] and result["refundCreated"]
            else "ACTION_REQUIRED_REAL_STRIPE_TEST_API_PROBE_FAILED"
        )
    except Exception as exc:
        result["status"] = "ACTION_REQUIRED_REAL_STRIPE_TEST_API_PROBE_FAILED"
        result["errorClass"] = type(exc).__name__
    write_json(evidence_dir / "R44P32_REAL_STRIPE_TEST_CREDENTIAL_ADMISSION.json", result)
    return result


@dataclass
class HarnessState:
    db_path: pathlib.Path
    webhook_secret: str
    expected_payment_intent_id: str
    amount: int
    currency: str
    metadata: dict[str, str]

    def connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path, timeout=10.0, isolation_level=None)
        connection.row_factory = sqlite3.Row
        return connection

    def initialize(self) -> None:
        with self.connect() as db:
            db.executescript(
                """
                PRAGMA journal_mode=WAL;
                PRAGMA synchronous=FULL;
                CREATE TABLE IF NOT EXISTS events(
                  event_id_hash TEXT PRIMARY KEY,
                  payload_hash TEXT NOT NULL,
                  event_type TEXT NOT NULL,
                  state TEXT NOT NULL,
                  created_at INTEGER NOT NULL,
                  attempts INTEGER NOT NULL DEFAULT 1
                );
                CREATE TABLE IF NOT EXISTS entitlements(
                  entitlement_key TEXT PRIMARY KEY,
                  status TEXT NOT NULL,
                  payment_intent_hash TEXT NOT NULL,
                  amount INTEGER NOT NULL,
                  currency TEXT NOT NULL,
                  updated_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS dead_letters(
                  event_id_hash TEXT PRIMARY KEY,
                  payload_json TEXT NOT NULL,
                  reason TEXT NOT NULL,
                  attempts INTEGER NOT NULL,
                  state TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS provider_state(
                  singleton INTEGER PRIMARY KEY CHECK(singleton = 1),
                  payment_status TEXT NOT NULL,
                  refund_status TEXT NOT NULL
                );
                INSERT OR IGNORE INTO provider_state(singleton,payment_status,refund_status)
                VALUES(1,'succeeded','not_refunded');
                """
            )

    @property
    def entitlement_key(self) -> str:
        material = f"{self.metadata['account_id']}:{self.metadata['product_id']}:{self.metadata['context_hash']}"
        return sha256_text(material)

    def entitlement_status(self) -> str | None:
        with self.connect() as db:
            row = db.execute(
                "SELECT status FROM entitlements WHERE entitlement_key=?",
                (self.entitlement_key,),
            ).fetchone()
            return str(row["status"]) if row else None

    def event_count(self) -> int:
        with self.connect() as db:
            return int(db.execute("SELECT COUNT(*) FROM events").fetchone()[0])

    def dead_letter_count(self, state: str | None = None) -> int:
        with self.connect() as db:
            if state is None:
                return int(db.execute("SELECT COUNT(*) FROM dead_letters").fetchone()[0])
            return int(db.execute("SELECT COUNT(*) FROM dead_letters WHERE state=?", (state,)).fetchone()[0])

    def access_allowed(self) -> bool:
        return self.entitlement_status() == "active"

    def _verify_signature(self, body: bytes, header: str) -> tuple[bool, str]:
        parts: dict[str, list[str]] = {}
        for token in header.split(","):
            if "=" not in token:
                continue
            key, value = token.split("=", 1)
            parts.setdefault(key.strip(), []).append(value.strip())
        timestamp_raw = (parts.get("t") or [""])[0]
        signatures = parts.get("v1") or []
        if not timestamp_raw.isdigit() or not signatures:
            return False, "signature_header_invalid"
        timestamp = int(timestamp_raw)
        if abs(int(time.time()) - timestamp) > 300:
            return False, "signature_timestamp_out_of_tolerance"
        expected = hmac.new(
            self.webhook_secret.encode("utf-8"),
            f"{timestamp}.".encode("utf-8") + body,
            hashlib.sha256,
        ).hexdigest()
        return any(hmac.compare_digest(expected, candidate) for candidate in signatures), "signature_mismatch"

    def process_webhook(self, body: bytes, signature: str) -> tuple[int, dict[str, Any]]:
        signature_ok, signature_error = self._verify_signature(body, signature)
        if not signature_ok:
            return 400, {"ok": False, "error": signature_error}
        try:
            event = json.loads(body.decode("utf-8"))
        except Exception:
            return 400, {"ok": False, "error": "invalid_json"}
        event_id = str(event.get("id", ""))
        event_type = str(event.get("type", ""))
        created = int(event.get("created", 0) or 0)
        if not event_id.startswith("evt_") or event_type not in {"checkout.session.completed", "charge.refunded"}:
            return 400, {"ok": False, "error": "event_contract_invalid"}
        event_id_hash = sha256_text(event_id)
        payload_hash = sha256_bytes(body)
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            existing = db.execute(
                "SELECT payload_hash,state FROM events WHERE event_id_hash=?",
                (event_id_hash,),
            ).fetchone()
            if existing:
                db.execute("COMMIT")
                if str(existing["payload_hash"]) != payload_hash:
                    return 409, {"ok": False, "error": "event_id_payload_replay_mismatch"}
                return 200, {"ok": True, "duplicate": True, "state": str(existing["state"])}

            object_data = ((event.get("data") or {}).get("object") or {})
            if event_type == "checkout.session.completed":
                metadata = object_data.get("metadata") or {}
                payment_intent_id = str(object_data.get("payment_intent", ""))
                exact_metadata = all(str(metadata.get(key, "")) == value for key, value in self.metadata.items())
                valid = (
                    object_data.get("object") == "checkout.session"
                    and object_data.get("livemode") is False
                    and object_data.get("mode") == "payment"
                    and object_data.get("status") == "complete"
                    and object_data.get("payment_status") == "paid"
                    and int(object_data.get("amount_total", -1)) == self.amount
                    and str(object_data.get("currency", "")).lower() == self.currency
                    and payment_intent_id == self.expected_payment_intent_id
                    and exact_metadata
                )
                if not valid:
                    db.execute("ROLLBACK")
                    return 422, {"ok": False, "error": "payment_intent_or_session_binding_invalid"}
                db.execute(
                    "INSERT INTO events(event_id_hash,payload_hash,event_type,state,created_at) VALUES(?,?,?,?,?)",
                    (event_id_hash, payload_hash, event_type, "processed", created),
                )
                db.execute(
                    "INSERT INTO entitlements(entitlement_key,status,payment_intent_hash,amount,currency,updated_at) "
                    "VALUES(?,?,?,?,?,?) ON CONFLICT(entitlement_key) DO UPDATE SET "
                    "status='active',payment_intent_hash=excluded.payment_intent_hash,amount=excluded.amount,currency=excluded.currency,updated_at=excluded.updated_at",
                    (
                        self.entitlement_key,
                        "active",
                        sha256_text(payment_intent_id),
                        self.amount,
                        self.currency,
                        int(time.time()),
                    ),
                )
                db.execute("COMMIT")
                return 200, {"ok": True, "duplicate": False, "entitlement": "active"}

            # Refund may arrive before the payment event. Preserve for controlled requeue.
            payment_intent_id = str(object_data.get("payment_intent", ""))
            refund_valid = (
                object_data.get("object") == "charge"
                and object_data.get("livemode") is False
                and object_data.get("refunded") is True
                and int(object_data.get("amount_refunded", -1)) == self.amount
                and str(object_data.get("currency", "")).lower() == self.currency
                and payment_intent_id == self.expected_payment_intent_id
            )
            if not refund_valid:
                db.execute("ROLLBACK")
                return 422, {"ok": False, "error": "refund_binding_invalid"}
            entitlement = db.execute(
                "SELECT status FROM entitlements WHERE entitlement_key=?",
                (self.entitlement_key,),
            ).fetchone()
            if not entitlement:
                db.execute(
                    "INSERT INTO events(event_id_hash,payload_hash,event_type,state,created_at) VALUES(?,?,?,?,?)",
                    (event_id_hash, payload_hash, event_type, "dead_letter", created),
                )
                db.execute(
                    "INSERT INTO dead_letters(event_id_hash,payload_json,reason,attempts,state) VALUES(?,?,?,?,?)",
                    (event_id_hash, body.decode("utf-8"), "entitlement_missing", 1, "retry_ready"),
                )
                db.execute("COMMIT")
                return 202, {"ok": False, "retryable": True, "deadLettered": True}
            db.execute(
                "INSERT INTO events(event_id_hash,payload_hash,event_type,state,created_at) VALUES(?,?,?,?,?)",
                (event_id_hash, payload_hash, event_type, "processed", created),
            )
            db.execute(
                "UPDATE entitlements SET status='revoked_refunded',updated_at=? WHERE entitlement_key=?",
                (int(time.time()), self.entitlement_key),
            )
            db.execute("UPDATE provider_state SET refund_status='refunded' WHERE singleton=1")
            db.execute("COMMIT")
            return 200, {"ok": True, "entitlement": "revoked_refunded"}

    def reconcile(self) -> dict[str, Any]:
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            provider = db.execute("SELECT payment_status,refund_status FROM provider_state WHERE singleton=1").fetchone()
            entitlement = db.execute(
                "SELECT status FROM entitlements WHERE entitlement_key=?",
                (self.entitlement_key,),
            ).fetchone()
            action = "none"
            status = str(entitlement["status"]) if entitlement else None
            if provider["refund_status"] == "refunded" and status != "revoked_refunded":
                db.execute(
                    "INSERT INTO entitlements(entitlement_key,status,payment_intent_hash,amount,currency,updated_at) "
                    "VALUES(?,?,?,?,?,?) ON CONFLICT(entitlement_key) DO UPDATE SET status='revoked_refunded',updated_at=excluded.updated_at",
                    (
                        self.entitlement_key,
                        "revoked_refunded",
                        sha256_text(self.expected_payment_intent_id),
                        self.amount,
                        self.currency,
                        int(time.time()),
                    ),
                )
                action = "revoked_from_provider_refund"
            elif provider["payment_status"] == "succeeded" and provider["refund_status"] != "refunded" and status is None:
                db.execute(
                    "INSERT INTO entitlements(entitlement_key,status,payment_intent_hash,amount,currency,updated_at) VALUES(?,?,?,?,?,?)",
                    (
                        self.entitlement_key,
                        "active",
                        sha256_text(self.expected_payment_intent_id),
                        self.amount,
                        self.currency,
                        int(time.time()),
                    ),
                )
                action = "activated_from_provider_payment"
            db.execute("COMMIT")
            return {"ok": True, "action": action, "status": self.entitlement_status()}

    def requeue_dead_letters(self) -> dict[str, Any]:
        processed = 0
        with self.connect() as db:
            rows = db.execute(
                "SELECT event_id_hash,payload_json,attempts FROM dead_letters WHERE state='retry_ready' ORDER BY rowid",
            ).fetchall()
        for row in rows:
            body = str(row["payload_json"]).encode("utf-8")
            event = json.loads(body.decode("utf-8"))
            object_data = ((event.get("data") or {}).get("object") or {})
            if self.entitlement_status() is None:
                continue
            with self.connect() as db:
                db.execute("BEGIN IMMEDIATE")
                db.execute(
                    "UPDATE entitlements SET status='revoked_refunded',updated_at=? WHERE entitlement_key=?",
                    (int(time.time()), self.entitlement_key),
                )
                db.execute(
                    "UPDATE dead_letters SET attempts=?,state='completed' WHERE event_id_hash=?",
                    (int(row["attempts"]) + 1, str(row["event_id_hash"])),
                )
                db.execute(
                    "UPDATE events SET state='processed' WHERE event_id_hash=?",
                    (str(row["event_id_hash"]),),
                )
                db.execute("UPDATE provider_state SET refund_status='refunded' WHERE singleton=1")
                db.execute("COMMIT")
            if object_data.get("refunded") is True:
                processed += 1
        return {"ok": True, "processed": processed, "remaining": self.dead_letter_count("retry_ready")}


class WebhookHandler(http.server.BaseHTTPRequestHandler):
    state: HarnessState

    def log_message(self, _format: str, *_args: Any) -> None:
        return

    def _json_response(self, status: int, body: dict[str, Any]) -> None:
        payload = canonical_json_bytes(body)
        self.send_response(status)
        self.send_header("content-type", "application/json; charset=utf-8")
        self.send_header("cache-control", "no-store")
        self.send_header("content-length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_POST(self) -> None:  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/webhook":
            length = int(self.headers.get("content-length", "0"))
            if length <= 0 or length > 262_144:
                self._json_response(413, {"ok": False, "error": "body_size_invalid"})
                return
            body = self.rfile.read(length)
            status, response = self.state.process_webhook(body, self.headers.get("stripe-signature", ""))
            self._json_response(status, response)
            return
        if parsed.path == "/reconcile":
            self._json_response(200, self.state.reconcile())
            return
        if parsed.path == "/dead-letter/requeue":
            self._json_response(200, self.state.requeue_dead_letters())
            return
        self._json_response(404, {"ok": False, "error": "not_found"})


def signed_header(body: bytes, secret_value: str, timestamp: int | None = None) -> str:
    ts = int(time.time()) if timestamp is None else int(timestamp)
    digest = hmac.new(secret_value.encode("utf-8"), f"{ts}.".encode("utf-8") + body, hashlib.sha256).hexdigest()
    return f"t={ts},v1={digest}"


def post_webhook(base_url: str, event: dict[str, Any], secret_value: str, *, valid: bool = True) -> tuple[int, dict[str, Any]]:
    body = canonical_json_bytes(event)
    header = signed_header(body, secret_value if valid else "wrong-secret")
    return http_json(
        f"{base_url}/webhook",
        method="POST",
        headers={"content-type": "application/json", "stripe-signature": header},
        body=body,
    )[:2]


def post_control(base_url: str, path: str) -> tuple[int, dict[str, Any]]:
    return http_json(f"{base_url}{path}", method="POST", body=b"")[:2]


EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
CASES_DIR = EVIDENCE_DIR / "cases"
CASES_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = EVIDENCE_DIR / "R44P32_STRIPE_LIFECYCLE.sqlite3"
if DB_PATH.exists():
    DB_PATH.unlink()

source_binding = {
    "revisionId": REVISION,
    "sourceManifestSha256": MANIFEST_SHA,
    "sourceAggregateSha256": AGGREGATE_SHA,
}

real_probe = redacted_real_stripe_probe(EVIDENCE_DIR)

mock_checkout_status, mock_checkout = stripe_mock_post(
    "/v1/checkout/sessions",
    {
        "mode": "payment",
        "success_url": "https://example.test/success?session_id={CHECKOUT_SESSION_ID}",
        "cancel_url": "https://example.test/cancel",
        "line_items[0][price_data][currency]": "eur",
        "line_items[0][price_data][unit_amount]": "4900",
        "line_items[0][price_data][product_data][name]": "Velmere R44P32 test-only audit",
        "line_items[0][quantity]": "1",
    },
)
mock_pi_status, mock_pi = stripe_mock_post(
    "/v1/payment_intents",
    {
        "amount": "4900",
        "currency": "eur",
        "payment_method": "pm_card_visa",
        "confirm": "true",
        "metadata[source_manifest_sha256]": MANIFEST_SHA,
    },
)
payment_intent_id = str(mock_pi.get("id", "pi_r44p32_mock_payment"))
if not payment_intent_id.startswith("pi_"):
    payment_intent_id = "pi_r44p32_mock_payment"

metadata = {
    "account_id": f"acct_{sha256_text(RUN_ID)[:12]}",
    "product_id": "vlm_audit_pro_beta_test_only",
    "context_hash": sha256_text(f"{REVISION}:{RUN_ID}:context"),
    "source_manifest_sha256": MANIFEST_SHA,
}
webhook_secret = "wh" + "sec_ephemeral_" + secrets.token_hex(24)
state = HarnessState(
    db_path=DB_PATH,
    webhook_secret=webhook_secret,
    expected_payment_intent_id=payment_intent_id,
    amount=4900,
    currency="eur",
    metadata=metadata,
)
state.initialize()
WebhookHandler.state = state
server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), WebhookHandler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
base_url = f"http://127.0.0.1:{server.server_address[1]}"

case_rows: list[dict[str, Any]] = []


def add_case(case_id: str, passed: bool, facts: dict[str, Any], started_at: str) -> None:
    if case_id != EXPECTED_CASE_IDS[len(case_rows)]:
        raise RuntimeError(f"case ordering mismatch: {case_id}")
    row = {
        "schemaVersion": "velmere.pass36.a102r44p32.local-stripe-lifecycle-case.v1",
        "caseId": case_id,
        "classification": CLASSIFICATION,
        "environmentClass": "LOCAL_DISPOSABLE_TEST",
        "expectedOutcome": "PASS",
        "observedOutcome": "PASS" if passed else "FAIL",
        "passed": bool(passed),
        "startedAt": started_at,
        "endedAt": utc_now(),
        "sourceBinding": source_binding,
        "facts": facts,
        "truthBoundary": {
            "localStripeApiFixtureOnly": True,
            "realStripeTestFullLifecycleCredit": False,
            "productionPaymentCredit": False,
            "customerCredit": False,
            "saleCredit": False,
            "liveCredit": False,
        },
    }
    write_json(CASES_DIR / f"{len(case_rows)+1:02d}-{case_id}.json", row)
    case_rows.append(row)


try:
    started = utc_now()
    checkout_ok = (
        mock_checkout_status == 200
        and mock_checkout.get("object") == "checkout.session"
        and mock_checkout.get("livemode") is False
    )
    add_case(
        "checkout",
        checkout_ok,
        {
            "stripeMockHttpStatus": mock_checkout_status,
            "object": mock_checkout.get("object"),
            "livemode": mock_checkout.get("livemode"),
            "checkoutIdSha256": sha256_text(str(mock_checkout.get("id", ""))),
            "localProtocolFixtureRouteAccepted": checkout_ok,
            "realStripeApiProbeStatus": real_probe.get("status"),
        },
        started,
    )

    checkout_event = {
        "id": "evt_r44p32_checkout_complete",
        "object": "event",
        "type": "checkout.session.completed",
        "created": int(time.time()),
        "livemode": False,
        "data": {
            "object": {
                "id": "cs_r44p32_complete",
                "object": "checkout.session",
                "livemode": False,
                "mode": "payment",
                "status": "complete",
                "payment_status": "paid",
                "amount_total": 4900,
                "currency": "eur",
                "payment_intent": payment_intent_id,
                "metadata": metadata,
            }
        },
    }

    started = utc_now()
    invalid_status, invalid_payload = post_webhook(base_url, checkout_event, webhook_secret, valid=False)
    valid_status, valid_payload = post_webhook(base_url, checkout_event, webhook_secret, valid=True)
    add_case(
        "signed-webhook",
        invalid_status == 400 and valid_status == 200 and valid_payload.get("ok") is True,
        {
            "invalidSignatureStatus": invalid_status,
            "invalidSignatureError": invalid_payload.get("error"),
            "validSignatureStatus": valid_status,
            "validAccepted": valid_payload.get("ok") is True,
            "secretStored": False,
        },
        started,
    )

    started = utc_now()
    tampered_event = json.loads(json.dumps(checkout_event))
    tampered_event["id"] = "evt_r44p32_binding_tamper"
    tampered_event["data"]["object"]["payment_intent"] = "pi_wrong_binding"
    tampered_status, tampered_payload = post_webhook(base_url, tampered_event, webhook_secret, valid=True)
    add_case(
        "paymentintent-binding",
        mock_pi_status == 200
        and mock_pi.get("object") == "payment_intent"
        and mock_pi.get("livemode") is False
        and tampered_status == 422,
        {
            "stripeMockPaymentIntentStatus": mock_pi_status,
            "stripeMockObject": mock_pi.get("object"),
            "stripeMockLivemode": mock_pi.get("livemode"),
            "paymentIntentIdSha256": sha256_text(payment_intent_id),
            "tamperedBindingStatus": tampered_status,
            "tamperedBindingError": tampered_payload.get("error"),
        },
        started,
    )

    started = utc_now()
    add_case(
        "entitlement-activation",
        state.entitlement_status() == "active" and state.access_allowed(),
        {
            "entitlementStatus": state.entitlement_status(),
            "accessAllowed": state.access_allowed(),
            "entitlementKeySha256": sha256_text(state.entitlement_key),
        },
        started,
    )

    started = utc_now()
    before_events = state.event_count()
    duplicate_status, duplicate_payload = post_webhook(base_url, checkout_event, webhook_secret, valid=True)
    after_events = state.event_count()
    add_case(
        "duplicate-idempotency",
        duplicate_status == 200 and duplicate_payload.get("duplicate") is True and before_events == after_events,
        {
            "status": duplicate_status,
            "duplicate": duplicate_payload.get("duplicate"),
            "eventCountBefore": before_events,
            "eventCountAfter": after_events,
        },
        started,
    )

    # Separate state for reorder/dead-letter behavior.
    reorder_db = EVIDENCE_DIR / "R44P32_REORDER_LIFECYCLE.sqlite3"
    if reorder_db.exists():
        reorder_db.unlink()
    reorder_state = HarnessState(
        db_path=reorder_db,
        webhook_secret=webhook_secret,
        expected_payment_intent_id=payment_intent_id,
        amount=4900,
        currency="eur",
        metadata=metadata,
    )
    reorder_state.initialize()
    original_state = WebhookHandler.state
    WebhookHandler.state = reorder_state

    refund_event = {
        "id": "evt_r44p32_refund",
        "object": "event",
        "type": "charge.refunded",
        "created": int(time.time()),
        "livemode": False,
        "data": {
            "object": {
                "id": "ch_r44p32_refunded",
                "object": "charge",
                "livemode": False,
                "payment_intent": payment_intent_id,
                "amount": 4900,
                "amount_refunded": 4900,
                "currency": "eur",
                "refunded": True,
            }
        },
    }

    started = utc_now()
    reorder_status, reorder_payload = post_webhook(base_url, refund_event, webhook_secret, valid=True)
    add_case(
        "event-reorder",
        reorder_status == 202 and reorder_payload.get("deadLettered") is True and reorder_state.dead_letter_count("retry_ready") == 1,
        {
            "refundBeforePaymentStatus": reorder_status,
            "retryable": reorder_payload.get("retryable"),
            "deadLettered": reorder_payload.get("deadLettered"),
            "retryReadyCount": reorder_state.dead_letter_count("retry_ready"),
        },
        started,
    )

    started = utc_now()
    mutated_refund = json.loads(json.dumps(refund_event))
    mutated_refund["data"]["object"]["amount_refunded"] = 1
    replay_status, replay_payload = post_webhook(base_url, mutated_refund, webhook_secret, valid=True)
    add_case(
        "replay-denial",
        replay_status == 409 and replay_payload.get("error") == "event_id_payload_replay_mismatch",
        {
            "status": replay_status,
            "error": replay_payload.get("error"),
            "eventIdSha256": sha256_text(refund_event["id"]),
        },
        started,
    )

    WebhookHandler.state = original_state

    started = utc_now()
    mock_refund_status, mock_refund = stripe_mock_post(
        "/v1/refunds",
        {"payment_intent": payment_intent_id, "amount": "4900"},
    )
    add_case(
        "refund",
        mock_refund_status == 200 and mock_refund.get("object") == "refund" and mock_refund.get("livemode") is False,
        {
            "stripeMockHttpStatus": mock_refund_status,
            "object": mock_refund.get("object"),
            "livemode": mock_refund.get("livemode"),
            "refundIdSha256": sha256_text(str(mock_refund.get("id", ""))),
            "realStripeApiProbeRefundCreated": real_probe.get("refundCreated"),
        },
        started,
    )

    started = utc_now()
    refund_status, refund_payload = post_webhook(base_url, refund_event, webhook_secret, valid=True)
    add_case(
        "refund-webhook",
        refund_status == 200 and refund_payload.get("entitlement") == "revoked_refunded",
        {
            "status": refund_status,
            "entitlement": refund_payload.get("entitlement"),
            "eventIdSha256": sha256_text(refund_event["id"]),
        },
        started,
    )

    started = utc_now()
    add_case(
        "entitlement-revocation",
        state.entitlement_status() == "revoked_refunded" and not state.access_allowed(),
        {
            "entitlementStatus": state.entitlement_status(),
            "accessAllowed": state.access_allowed(),
        },
        started,
    )

    started = utc_now()
    # Simulate a stale entitlement and prove reconciliation restores provider terminal truth.
    with state.connect() as db:
        db.execute("UPDATE entitlements SET status='active' WHERE entitlement_key=?", (state.entitlement_key,))
        db.execute("UPDATE provider_state SET refund_status='refunded' WHERE singleton=1")
    reconcile_status, reconcile_payload = post_control(base_url, "/reconcile")
    add_case(
        "reconciliation",
        reconcile_status == 200
        and reconcile_payload.get("action") == "revoked_from_provider_refund"
        and state.entitlement_status() == "revoked_refunded",
        {
            "status": reconcile_status,
            "action": reconcile_payload.get("action"),
            "entitlementStatus": state.entitlement_status(),
        },
        started,
    )

    started = utc_now()
    # Complete the reordered payment, then controlled requeue must apply the refund once.
    WebhookHandler.state = reorder_state
    payment_after_refund_status, _ = post_webhook(base_url, checkout_event, webhook_secret, valid=True)
    requeue_status, requeue_payload = post_control(base_url, "/dead-letter/requeue")
    second_requeue_status, second_requeue_payload = post_control(base_url, "/dead-letter/requeue")
    add_case(
        "controlled-dead-letter-requeue",
        payment_after_refund_status == 200
        and requeue_status == 200
        and requeue_payload.get("processed") == 1
        and requeue_payload.get("remaining") == 0
        and second_requeue_status == 200
        and second_requeue_payload.get("processed") == 0
        and reorder_state.entitlement_status() == "revoked_refunded",
        {
            "paymentAfterRefundStatus": payment_after_refund_status,
            "firstRequeueProcessed": requeue_payload.get("processed"),
            "firstRequeueRemaining": requeue_payload.get("remaining"),
            "secondRequeueProcessed": second_requeue_payload.get("processed"),
            "entitlementStatus": reorder_state.entitlement_status(),
            "deadLetterCompletedCount": reorder_state.dead_letter_count("completed"),
        },
        started,
    )
finally:
    server.shutdown()
    server.server_close()
    thread.join(timeout=5.0)

# Create immutable SQLite backups before hashing them into the artifact index.
# The live databases use WAL mode, whose main-file bytes may change after a
# checkpoint; the backup API produces stable, self-contained snapshots.
DB_SNAPSHOT_PATH = EVIDENCE_DIR / "R44P32_STRIPE_LIFECYCLE.snapshot.sqlite3"
REORDER_DB_SNAPSHOT_PATH = EVIDENCE_DIR / "R44P32_REORDER_LIFECYCLE.snapshot.sqlite3"
for source_db_path, snapshot_db_path in [
    (DB_PATH, DB_SNAPSHOT_PATH),
    (EVIDENCE_DIR / "R44P32_REORDER_LIFECYCLE.sqlite3", REORDER_DB_SNAPSHOT_PATH),
]:
    if snapshot_db_path.exists():
        snapshot_db_path.unlink()
    with sqlite3.connect(source_db_path, timeout=10.0) as source_db, sqlite3.connect(snapshot_db_path) as snapshot_db:
        source_db.backup(snapshot_db)
        snapshot_db.execute("PRAGMA journal_mode=DELETE")
        snapshot_db.execute("PRAGMA synchronous=FULL")
        snapshot_db.commit()

if [row["caseId"] for row in case_rows] != EXPECTED_CASE_IDS:
    raise RuntimeError("case denominator mismatch")

artifact_rows = []
for path in sorted(CASES_DIR.glob("*.json")):
    data = path.read_bytes()
    artifact_rows.append({
        "caseId": json.loads(data.decode("utf-8"))["caseId"],
        "path": path.relative_to(EVIDENCE_DIR).as_posix(),
        "byteLength": len(data),
        "sha256": sha256_bytes(data),
    })
for path in [DB_SNAPSHOT_PATH, REORDER_DB_SNAPSHOT_PATH]:
    data = path.read_bytes()
    artifact_rows.append({
        "caseId": "durable-state",
        "path": path.relative_to(EVIDENCE_DIR).as_posix(),
        "byteLength": len(data),
        "sha256": sha256_bytes(data),
    })

summary = {
    "schemaVersion": "velmere.pass36.a102r44p32.local-stripe-lifecycle.v1",
    "status": "PASS" if all(row["passed"] for row in case_rows) else "FAIL",
    "classification": CLASSIFICATION,
    "environmentClass": "LOCAL_DISPOSABLE_TEST",
    "sourceBinding": source_binding,
    "required": len(EXPECTED_CASE_IDS),
    "executed": len(case_rows),
    "passed": sum(1 for row in case_rows if row["passed"]),
    "failed": sum(1 for row in case_rows if not row["passed"]),
    "caseIds": EXPECTED_CASE_IDS,
    "realStripeTestApiProbe": real_probe,
    "stripeMock": {
        "urlStored": False,
        "checkoutHttpStatus": mock_checkout_status,
        "paymentIntentHttpStatus": mock_pi_status,
        "provider": "VELMERE_LOCAL_PYTHON_STRIPE_API_FIXTURE_V1",
        "officialStripeMockCredit": False,
    },
    "truthBoundary": {
        "localStripeApiFixtureCredit": True,
        "realStripeTestApiProbeCredit": bool(real_probe.get("paymentIntentCreated") and real_probe.get("refundCreated")),
        "realStripeTestFullLifecycleCredit": False,
        "stripeWebhookDeliveryCredit": False,
        "productionPaymentCredit": False,
        "customerCredit": False,
        "saleCredit": False,
        "liveCredit": False,
    },
}
write_json(EVIDENCE_DIR / "R44P32_LOCAL_STRIPE_LIFECYCLE.json", summary)
write_json(
    EVIDENCE_DIR / "R44P32_LOCAL_STRIPE_ARTIFACT_INDEX.json",
    {
        "schemaVersion": "velmere.pass36.a102r44p32.local-stripe-artifact-index.v1",
        "sourceBinding": source_binding,
        "artifacts": artifact_rows,
    },
)

scan_files = [
    path
    for path in EVIDENCE_DIR.rglob("*")
    if path.is_file() and path.suffix.lower() in {".json", ".txt", ".log"}
]
forbidden_values = [webhook_secret]
if os.environ.get("STRIPE_SECRET_KEY"):
    forbidden_values.append(os.environ["STRIPE_SECRET_KEY"])
leaks = []
for path in scan_files:
    data = path.read_text("utf-8", errors="replace")
    for value in forbidden_values:
        if value and value in data:
            leaks.append(path.relative_to(EVIDENCE_DIR).as_posix())
write_json(
    EVIDENCE_DIR / "R44P32_LOCAL_STRIPE_SECRET_SCAN.json",
    {
        "schemaVersion": "velmere.pass36.a102r44p32.local-stripe-secret-scan.v1",
        "filesScanned": len(scan_files),
        "rawSecretLeaks": sorted(set(leaks)),
        "passed": len(leaks) == 0,
    },
)

print(json.dumps({
    "status": summary["status"],
    "required": summary["required"],
    "passed": summary["passed"],
    "failed": summary["failed"],
    "classification": CLASSIFICATION,
    "realStripeTestApiProbeStatus": real_probe.get("status"),
}, sort_keys=True))
if summary["status"] != "PASS" or leaks:
    raise SystemExit(1)
