# Velmère PASS307 — Credential Retention Halo Gate

PASS307 continues the error-first rule: validate the previous gate, run i18n/preflight, scan for runtime regressions, then add the next product layer.

## Research direction

- MEXC WebSocket market streams and depth/order-book flows require freshness and connection windows, so Velmère proof surfaces cannot behave as permanent signals.
- MEXC Proof of Reserves is treated as transparent snapshot context, not as a customer guarantee.
- LVMH/Aura Digital Product Passport patterns inspired lifecycle retention: proof needs origin, freshness, disclosure and expiry.

## Product innovation

**Credential Retention Halo** adds a time-bound proof lifecycle ring across Lens, Shield terminal and Shield Map. It decides whether a proof can be public, guided, redacted or purged to operator-only storage.

The halo tracks:

- credential expiry window,
- source freshness TTL,
- browser replay retention,
- customer copy retention,
- operator vault retention,
- data minimization boundary.

## Files changed

- `lib/market-integrity/credential-retention-halo-gate.ts`
- `components/search/VelmereIntelligenceSearchClient.tsx`
- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/ShieldMapClient.tsx`
- `app/globals.css`
- `scripts/verify-pass307-credential-retention-halo-gate-safety.mjs`
- `package.json`
- `PROJECT_PROGRESS_PASS267_307.md`
- `VELMERE_MASTER_BUILD_MAP_PASS307.md`

## Error-first sweep

- PASS306 guard: PASS
- PASS307 guard: PASS
- i18n: PASS
- Vercel preflight: PASS, scanned 627 files
- `mode is not defined` regression check: no product-code regression found
- Search quarantine markers remain active through previous guards

## Typecheck status

`npm run typecheck` is still not green because this ZIP does not contain local `node_modules` and still inherits missing module/type declarations for Next, React, Node, next-intl, lucide-react, zustand, wagmi and old props errors such as `children missing`. PASS307 does not claim this is fixed.

## Delta

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
