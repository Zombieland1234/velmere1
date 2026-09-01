# Velmère Live Proof Receipt Bundle

PASS4234 keeps the public **topka-world LIVE** claim fail-closed until real runtime receipts exist and are validated.

PASS4234 adds an automatic receipt-bundle generator. After `VELMERE_RUN_FULL_CHECK.ps1` writes `.velmere-final-check-logs/VELMERE_LIVE_PROOF_SUMMARY.json`, the runner can convert that summary into individual JSON receipts plus a hash manifest.

## Required receipts

A live receipt bundle must include fresh JSON receipts for:

- `npm-ci`
- `typecheck`
- `build`
- `lint`
- `smoke-routes`
- `provider-smoke`
- `payment-replay`
- `pdf-parity`
- `ai-eval`

Each receipt must include PASS/OK/GREEN status and a recent timestamp (`generatedAt`, `finishedAt`, `endedAt` or `timestamp`). Default max age is 48 hours.

## Local proof run with automatic bundle generation

```powershell
$env:VELMERE_GENERATE_LIVE_RECEIPT_BUNDLE="1"
powershell -ExecutionPolicy Bypass -File .\VELMERE_RUN_FULL_CHECK.ps1
```

This writes:

- `.velmere-final-check-logs/VELMERE_LIVE_PROOF_SUMMARY.json`
- `.velmere-final-check-logs/VELMERE_LIVE_PROOF_SUMMARY.txt`
- `docs/live-proof/live-receipts/manifest.json`
- one receipt JSON per required check

If any required check is missing, failed or skipped, the generated bundle is marked `INCOMPLETE_FAIL_CLOSED`.

## Live claim gate

Set these only after real CI/Vercel/Stripe/Supabase/Gemini/provider receipts exist and are reviewed:

```powershell
$env:VELMERE_RUN_LIVE_PROOF="1"
$env:VELMERE_GENERATE_LIVE_RECEIPT_BUNDLE="1"
$env:VELMERE_LIVE_EXTERNAL_PROOF_READY="1"
powershell -ExecutionPolicy Bypass -File .\VELMERE_RUN_FULL_CHECK.ps1
```

`LIVE_CLAIM_ALLOWED` remains blocked unless local proof passes, live-required steps pass, external proof is explicitly marked ready, and the generated or provided receipt bundle validates through PASS4233.
