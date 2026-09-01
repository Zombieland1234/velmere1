# PASS4822 code-only runbook

## Scope

This runbook verifies the signed Lens source-result boundary and immutable account artifacts for Shield, Real Markets and Lens. It performs no LIVE or staging work.

## Required production configuration

- `VELMERE_LENS_SOURCE_TOKEN_SECRET_CURRENT`: at least 32 characters.
- `VELMERE_LENS_SOURCE_TOKEN_KEY_ID`: stable current key identifier.
- Optional previous Lens source key and key ID for rotation.
- Supabase service-role configuration for `velmere_customer_artifact_snapshots`.
- Apply migration `20260716000004_4822_customer_artifact_snapshots.sql`.

Production must not enable `VELMERE_ALLOW_UNSIGNED_LENS_FIXTURES`.

## Local code-only verification

Run:

```bash
npm run verify:pass4822
```

The one-shot requires all of these to pass:

1. static architecture gate;
2. signed-source and immutable-account matrix;
3. physical Lens/market PDF validation;
4. targeted core TypeScript;
5. targeted route TypeScript;
6. targeted search/orchestrator TypeScript;
7. PASS4821 regression;
8. PASS4819 regression;
9. PASS4808 account-PDF regression;
10. whole-repository TS/TSX parser gate.

## Expected behavior

### Lens

- Search response contains `lensSourceToken`.
- Report JSON accepts a signed source token or signed render token.
- PDF accepts only a signed render token.
- Browser full report objects are not authoritative.
- Paid Lens PDF creates an owner-bound account artifact.

### Shield / Real Markets

- Paid report must have account binding and valid render token.
- Exact canonical artifact from the render token is persisted.
- Basic does not create a paid artifact through this route.

### Account artifact route

- List and get are owner-filtered.
- JSON preview and PDF are rerendered from canonical stored payload.
- Rerendered artifact digest must equal stored artifact digest.
- Wrong owner receives no artifact.
- Production without durable storage fails closed.

## Failure handling

- Missing Lens signing key: configure the dedicated Lens source key; do not use a generic production fallback.
- Artifact digest mismatch: quarantine the snapshot and investigate renderer or payload drift.
- Immutable conflict: do not update the record; issue a new canonical artifact.
- Durable storage unavailable: block paid delivery; never use production memory fallback.
- Node/npm mismatch: do not call the result a full build.

## Known limitations

- Node 24 full build was not executed in PASS4822.
- Physical PDF checks are not browser pixel-parity proof.
- Fixtures are synthetic code-only evidence.
- LIVE remains frozen.
