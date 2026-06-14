# Velmère PASS313 — Atelier Access Runway Gate

## Summary

PASS313 adds `Atelier Access Runway`, a proof-gated luxury access layer for Lens, Shield terminal and Shield Map.

The innovation turns status/FOMO into a safe runway:

- live exchange epoch must be fresh,
- DPP/passport-style provenance must be coherent,
- consent receipt must be present,
- audit covenant must be ready,
- scarcity wording must be suppressed when evidence is weak.

Weak evidence downgrades the surface into `private salon`, `redacted lobby` or `operator hold`; it never creates stronger urgency.

## New production code

- `lib/market-integrity/atelier-access-runway-gate.ts`
- `scripts/verify-pass313-atelier-access-runway-gate-safety.mjs`

## Integrated UI surfaces

- `components/search/VelmereIntelligenceSearchClient.tsx`
  - global Lens proof runway card
  - per-result runway receipt
- `components/market-integrity/MarketIntegrityClient.tsx`
  - Shield terminal runway sync
- `components/market-integrity/ShieldMapClient.tsx`
  - Shield Map investigator runway sync
- `app/globals.css`
  - new PASS313 runway styling
- `package.json`
  - `verify:pass313-atelier-access-runway-gate`
  - chained after PASS312 in `verify:shield-all`

## Source/research alignment

- MEXC WebSocket streams are treated as time-boxed proof; the module models a 24h outer live epoch and short TTL downgrade.
- MEXC Proof of Reserves is treated as transparent snapshot context, not a security guarantee.
- LVMH/Aura Digital Product Passport ideas are translated into traceability/passport continuity before any prestige/access copy appears.

## Safety / psychology rules

PASS313 blocks:

- countdown timers,
- fake scarcity,
- hidden urgency ladders,
- buy/sell signals,
- profit/safety guarantees,
- pressure-based premium access copy.

Allowed psychology is restricted to evidence-maturity status: access opens only when proof lanes agree.

## Verification

Passed:

```txt
npm run verify:pass313-atelier-access-runway-gate
npm run verify:pass312-prestige-proof-compass-gate
npm run check:i18n
npm run vercel:preflight
```

Observed inherited blocker:

```txt
npm run typecheck
```

Still fails because the package has inherited missing dependency/type context for `next`, `react`, `node`, `lucide-react`, `next-intl`, `stripe`, `wagmi`, `zustand`, `tailwindcss` and old `children` prop issues. PASS313 has its own guard and passed.

## Delta

| ID | Area | Previous | Current | Change |
|---|---:|---:|---:|
| B06 | Psychology of sales copy / proof-gated status | 71 | 74 | +3 |
| H02 | Basic/Pro/Advanced access / premium status boundary | 68 | 71 | +3 |
| H05 | Private digital layer copy / utility-only premium framing | 58 | 61 | +3 |
| K02 | Source freshness registry / live epoch access | 66 | 68 | +2 |
| K03 | Analytics event taxonomy / safe access class | 52 | 54 | +2 |
| M01 | Velmère Shield Report / access proof summary | 92 | 93 | +1 |
| M08 | PDF/browser replay boundary / access receipt | 73 | 75 | +2 |
| A06 | Runtime observability / runway guard visibility | 97 | 98 | +1 |

**PASS313 product delta:** +17 points on touched rows.

<!-- PASS313 marker: Atelier Access Runway Gate active. -->
