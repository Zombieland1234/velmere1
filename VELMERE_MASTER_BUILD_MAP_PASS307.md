# Velmère Master Build Map — PASS307

PASS307 continues the A–M granular build map. AI Brain / Shield / Lens remain tracked separately. This pass focuses on K07 retention policy, M08 browser/PDF replay boundary, K01 receipt planning and A06 runtime observability.

## PASS307 — Credential Retention Halo Gate

Added a short-lived proof retention halo before report copy, proof copy, public summary or premium status can persist. The halo combines Verifiable Source Credential expiry, source freshness TTL, selective disclosure state, browser replay retention and operator vault separation.

### New tracked module

- `lib/market-integrity/credential-retention-halo-gate.ts`
- `scripts/verify-pass307-credential-retention-halo-gate-safety.mjs`

### Product areas moved

| ID | Area | Previous | Current | Change |
|---|---|---:|---:|---:|
| K07 | Retention policy / short-lived proof expiry | 24% | 31% | +7% |
| K01 | Durable audit ledger / credential receipt planning | 49% | 51% | +2% |
| M08 | PDF/browser replay boundary | 63% | 65% | +2% |
| M05 | Redacted payload export | 100% | 100% | +0% |
| A06 | Runtime observability | 91% | 92% | +1% |
| D17 | Missing-data semantics | 98% | 99% | +1% |
| M01 | Velmère Shield Report | 85% | 86% | +1% |
| L06 | Adapter timeouts / fallbacks | 64% | 65% | +1% |

**PASS307 product delta:** +15% on touched rows.

## PASS307 markers

- Lens/VLM Browser: `data-pass307-credential-retention-halo="vlm-browser"`
- Lens result receipt: `data-pass307-result-halo="credential-retention-receipt"`
- Shield terminal: `data-pass307-credential-retention-halo="shield-terminal"`
- Shield Map: `data-pass307-credential-retention-halo="shield-map"`

<!-- PASS307 marker: Credential Retention Halo Gate active. -->
