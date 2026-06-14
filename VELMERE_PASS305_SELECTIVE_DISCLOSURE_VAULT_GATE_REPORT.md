# PASS305 — Selective Disclosure Vault Gate

Error-first pass after PASS304. Adds a proof-disclosure governor across Lens, Shield terminal and Shield Map.

## Product delta

- New module: `lib/market-integrity/selective-disclosure-vault-gate.ts`
- New UI: Selective Disclosure Vault.
- Surfaces: VLM Browser/Lens, Shield terminal and Shield Map.
- Logic: public summary, guided preview, redacted receipt or operator vault depending on proof timing, privacy, redaction pressure, runtime faults and replay readiness.

## Research grounding

- MEXC WebSocket depth streams require live-window thinking and connection expiry handling.
- MEXC Proof of Reserves inspired transparent snapshot context without broad safety language.
- LVMH/Aura DPP inspired provenance/lifecycle disclosure and selective customer visibility.

## Delta

| ID | Obszar | Previous | Current | Change |
|---|---:|---:|---:|---:|
| K05 | Privacy redaction envelope | 100 | 100 | +0 |
| M05 | Redacted payload export | 99 | 100 | +1 |
| M08 | PDF/browser replay boundary | 59 | 61 | +2 |
| K01 | Durable audit ledger / receipt planning | 43 | 46 | +3 |
| D17 | Missing-data semantics | 97 | 98 | +1 |
| M01 | Velmère Shield Report | 82 | 84 | +2 |
| A06 | Runtime observability | 89 | 90 | +1 |

PASS305 total: +10 pkt.
