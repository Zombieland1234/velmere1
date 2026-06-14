# PASS304 — Freshness Timecode Ledger Gate

PASS304 adds a Freshness Timecode Ledger across VLM Browser / Lens, Shield terminal and Shield Map.

## Intent

Every source-backed proof surface now carries a freshness window before it can support public copy, report context or PDF/replay context. The goal is to prevent stale depth, reserve, contract or provenance context from looking like live evidence.

## Lanes

- orderbook_depth_timecode
- reserve_snapshot_timecode
- contract_control_timecode
- provenance_passport_timecode
- browser_replay_timecode
- customer_copy_timecode

## Psychology boundary

Freshness debt increases friction instead of urgency. Premium status remains earned by source freshness, traceability and review boundary; the UI must not use countdown pressure, fake scarcity or action commands.

## Validation

```bash
npm run verify:pass304-freshness-timecode-ledger-gate
npm run verify:pass303-live-adapter-circuit-breaker-gate
npm run check:i18n
npm run vercel:preflight
```
