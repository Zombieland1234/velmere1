# Velmère Master Build Map — PASS306

PASS306 continues the A–M granular build map. AI Brain / Shield / Lens remain tracked separately.

## PASS306 — Verifiable Source Credential Gate

Added a short-lived source credential layer before report copy, proof copy, premium status or public summary can advance. The credential combines exchange depth, reserve snapshot, DPP-style provenance, source freshness, replay readiness and Selective Disclosure Vault state.

### New tracked module

- `lib/market-integrity/verifiable-source-credential-gate.ts`
- `scripts/verify-pass306-verifiable-source-credential-gate-safety.mjs`

### Product areas moved

| ID | Area | Previous | Current | Change |
|---|---|---:|---:|---:|
| K01 | Durable audit ledger / credential receipt planning | 46% | 49% | +3% |
| K04 | Storage/source adapter contract | 66% | 68% | +2% |
| K07 | Retention policy / short-lived proof expiry | 20% | 24% | +4% |
| M08 | PDF/browser replay boundary | 61% | 63% | +2% |
| L06 | Adapter timeouts / fallbacks | 62% | 64% | +2% |
| D16 | Source confidence lanes | 100% | 100% | +0% |
| M01 | Velmère Shield Report | 84% | 85% | +1% |
| A06 | Runtime observability | 90% | 91% | +1% |

**PASS306 product delta:** +15% on touched rows.

## PASS306 markers

- Lens/VLM Browser: `data-pass306-verifiable-source-credential="vlm-browser"`
- Lens result receipt: `data-pass306-result-credential="verifiable-source-receipt"`
- Shield terminal: `data-pass306-verifiable-source-credential="shield-terminal"`
- Shield Map: `data-pass306-verifiable-source-credential="shield-map"`

<!-- PASS306 marker: Verifiable Source Credential Gate active. -->
