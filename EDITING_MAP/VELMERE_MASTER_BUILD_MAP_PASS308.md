# Velmère Master Build Map — PASS308

## PASS308 — Source Governance Oath Gate

PASS308 continues the A–M master map without collapsing AI Brain. This pass follows the standing rule: error sweep first, then research, then product code, then guard and ZIP.

### New product layer

**Source Governance Oath** turns exchange-grade source freshness and luxury-grade provenance into a release oath for public copy. It sits after PASS307 Credential Retention Halo and checks whether Lens, Shield terminal and Shield Map can show guided proof, redacted receipt or operator-only status.

### Research grounding

- MEXC spot WebSocket streams use a 24h connection window, so live-source proof must have expiry/reconnect boundaries.
- MEXC Proof of Reserves exposes token/network/wallet transparency as snapshot context, not a customer guarantee.
- LVMH/Aura Digital Product Passport patterns emphasize transparency, traceability, authenticity and lifecycle proof.

### Files touched

- `lib/market-integrity/source-governance-oath-gate.ts`
- `components/search/VelmereIntelligenceSearchClient.tsx`
- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/ShieldMapClient.tsx`
- `app/globals.css`
- `scripts/verify-pass308-source-governance-oath-gate-safety.mjs`
- `package.json`

### Delta PASS308

| ID | Obszar | Previous | Current | Change |
|---|---:|---:|---:|
| L07 | Source policy / adapter governance | 36 | 41 | +5 |
| K07 | Retention policy / proof lifecycle | 31 | 34 | +3 |
| K01 | Durable audit ledger / receipt planning | 51 | 53 | +2 |
| M01 | Velmère Shield Report | 86 | 87 | +1 |
| M08 | PDF/browser replay boundary | 65 | 66 | +1 |
| A06 | Runtime observability | 92 | 93 | +1 |
| D17 | Missing-data semantics | 99 | 100 | +1 |

**PASS308 total:** +14 pkt.

### Validation

- `verify:pass308-source-governance-oath-gate` — PASS
- `verify:pass307-credential-retention-halo-gate` — PASS
- `check:i18n` — PASS
- `vercel:preflight` — PASS, scanned 628 files
- `typecheck` — still blocked by inherited missing `node_modules` / Next / React / Node type packages and older prop errors; not marked green.

<!-- PASS308 marker: Source Governance Oath active across Lens, Shield terminal and Shield Map. -->
