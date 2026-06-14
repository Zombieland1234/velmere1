# PASS309 — Ethical Signal Event Taxonomy Gate

Error-first pass after PASS308. PASS309 adds a privacy-minimized event taxonomy for Lens, Shield terminal and Shield Map. It converts search, source-open, proof-escalation, disclosure, retention and customer-copy interactions into safe event classes instead of raw payloads or engagement-pressure telemetry.

## Product delta

- Adds `lib/market-integrity/ethical-signal-event-taxonomy-gate.ts`.
- Adds VLM Browser/Lens taxonomy panel and result receipt.
- Adds Shield terminal and Shield Map sync panels.
- Adds CSS for PASS309 event taxonomy surfaces.
- Adds `verify:pass309-ethical-signal-event-taxonomy-gate` and chains it after PASS308 in `verify:shield-all`.

## Safety boundary

- No buy/sell commands.
- No artificial urgency.
- No raw PII, raw wallet, raw browser trace or private operator memo in event payload classes.
- FOMO is converted into consent/review friction.
- Elite status is earned by source governance and privacy-safe proof events.
