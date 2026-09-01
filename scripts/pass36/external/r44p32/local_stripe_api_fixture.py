#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import http.server
import json
import os
import time
import urllib.parse
from typing import Any

HOST = os.environ.get('VELMERE_STRIPE_FIXTURE_HOST', '127.0.0.1')
PORT = int(os.environ.get('VELMERE_STRIPE_FIXTURE_PORT', '12111'))
CLASSIFICATION = 'LOCAL_DISPOSABLE_STRIPE_API_FIXTURE_ONLY'


def canonical(value: Any) -> bytes:
    return (json.dumps(value, sort_keys=True, separators=(',', ':')) + '\n').encode('utf-8')


def object_id(prefix: str, body: bytes) -> str:
    return f"{prefix}_{hashlib.sha256(body).hexdigest()[:24]}"


class Handler(http.server.BaseHTTPRequestHandler):
    server_version = 'VelmereStripeFixture/1.0'
    sys_version = ''

    def log_message(self, fmt: str, *args: Any) -> None:
        return

    def _send(self, status: int, value: Any) -> None:
        raw = canonical(value)
        self.send_response(status)
        self.send_header('content-type', 'application/json')
        self.send_header('content-length', str(len(raw)))
        self.send_header('cache-control', 'no-store')
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self) -> None:  # noqa: N802
        if self.path in {'/', '/health', '/v1/health'}:
            self._send(200, {'status': 'ok', 'classification': CLASSIFICATION, 'livemode': False})
            return
        self._send(404, {'error': {'type': 'invalid_request_error', 'message': 'not found'}})

    def do_POST(self) -> None:  # noqa: N802
        auth = self.headers.get('authorization', '')
        if not auth.startswith('Bearer ' + 'sk_' + 'test_'):
            self._send(401, {'error': {'type': 'authentication_error', 'message': 'test credential required'}})
            return
        length = int(self.headers.get('content-length', '0') or '0')
        body = self.rfile.read(length)
        form = urllib.parse.parse_qs(body.decode('utf-8'), keep_blank_values=True)
        now = int(time.time())
        if self.path == '/v1/checkout/sessions':
            amount = int((form.get('line_items[0][price_data][unit_amount]') or ['0'])[0])
            currency = (form.get('line_items[0][price_data][currency]') or ['eur'])[0]
            value = {
                'id': object_id('cs_test', body),
                'object': 'checkout.session',
                'livemode': False,
                'mode': (form.get('mode') or ['payment'])[0],
                'status': 'open',
                'payment_status': 'unpaid',
                'amount_total': amount,
                'currency': currency,
                'created': now,
                'url': f'https://checkout.example.test/{object_id("cs_test", body)}',
            }
            self._send(200, value)
            return
        if self.path == '/v1/payment_intents':
            amount = int((form.get('amount') or ['0'])[0])
            currency = (form.get('currency') or ['eur'])[0]
            value = {
                'id': object_id('pi_test', body),
                'object': 'payment_intent',
                'livemode': False,
                'amount': amount,
                'currency': currency,
                'status': 'succeeded' if (form.get('confirm') or ['false'])[0] == 'true' else 'requires_confirmation',
                'created': now,
                'metadata': {
                    key[len('metadata['):-1]: vals[0]
                    for key, vals in form.items()
                    if key.startswith('metadata[') and key.endswith(']') and vals
                },
            }
            self._send(200, value)
            return
        if self.path == '/v1/refunds':
            payment_intent = (form.get('payment_intent') or [''])[0]
            amount = int((form.get('amount') or ['0'])[0])
            if not payment_intent.startswith('pi_'):
                self._send(400, {'error': {'type': 'invalid_request_error', 'message': 'payment_intent required'}})
                return
            value = {
                'id': object_id('re_test', body),
                'object': 'refund',
                'livemode': False,
                'payment_intent': payment_intent,
                'amount': amount,
                'currency': 'eur',
                'status': 'succeeded',
                'created': now,
            }
            self._send(200, value)
            return
        self._send(404, {'error': {'type': 'invalid_request_error', 'message': 'not found'}})


if __name__ == '__main__':
    http.server.ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
