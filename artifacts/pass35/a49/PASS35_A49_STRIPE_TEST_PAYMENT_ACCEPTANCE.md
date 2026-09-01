# PASS35 A49 — Stripe test payment/refund/reconciliation acceptance

Decision: **FIXTURE_FAIL**

- checks: 24
- passed: 21
- failed: 3
- testModeProven: false
- liveModeProven: false
- saleEnabled: false

- FAIL source-fingerprint-before: {"rows":4146,"digest":null,"reason":"source_file_missing:.env.example"}
- FAIL stripe-charge-fully-refunded: {"chargeSha256":"a3936f17a742c04171a2cc8d78f9e4725d51218f5c77473945ab25116f2e5a38","livemode":false,"refunded":false,"amount":100,"amountRefunded":50,"currency":"eur"}
- FAIL source-fingerprint-unchanged: {"before":null,"after":null,"rows":4146,"reason":"source_file_missing:.env.example"}
