# PASS303 — Live Adapter Circuit Breaker Gate

## Error-first sweep

- Re-ran PASS302 guard, i18n and Vercel preflight before adding product code.
- Confirmed PASS299 regression guard still rejects the old undefined `mode` call pattern.
- Confirmed search quarantine markers remain present for Shield and Shield Map.

## Product delta

- Added `lib/market-integrity/live-adapter-circuit-breaker-gate.ts`.
- Added PASS303 circuit receipts to Lens/VLM Browser, Shield terminal and Shield Map.
- Added guard `verify:pass303-live-adapter-circuit-breaker-gate` and wired it into `verify:shield-all`.

## UI innovation

Live Adapter Circuit Breaker opens, cools or locks public proof copy based on:

- WebSocket depth continuity.
- REST depth snapshot fallback.
- Reserve proof snapshot posture.
- Provenance/DPP passport context.
- Runtime fault quarantine.
- Report/export redaction boundary.

## Safety boundary

- No trade instruction.
- No investment advice.
- No safety certificate wording.
- No artificial urgency or scarcity pressure.
- Customer copy receives calm state and limitations; operator copy keeps raw faults and retry posture.

## Validation

```bash
npm run verify:pass303-live-adapter-circuit-breaker-gate
npm run verify:pass302-source-proof-escrow-gate
npm run check:i18n
npm run vercel:preflight
```

Vercel preflight scanned 623 files.
