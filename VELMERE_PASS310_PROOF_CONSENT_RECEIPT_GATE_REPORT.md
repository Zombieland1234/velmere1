# PASS310 — Proof Consent Receipt Gate

## Cel

PASS310 dodaje warstwę `Proof Consent Receipt`: widoczny, krótko żyjący handshake zgody/proofu zanim Velmère Shield pokaże publiczny proof badge, customer copy albo report preview.

## Error sweep first

Przed wdrożeniem nowego modułu sprawdzono:

- PASS309 Ethical Signal Event Taxonomy Gate — PASS
- check:i18n — PASS
- vercel:preflight — PASS
- regresja `mode is not defined` — nie wróciła do product code
- search/modal quarantine z PASS299 — dalej pilnowane przez guard

Pełny `typecheck` nadal nie jest zielony, bo paczka nie ma lokalnego `node_modules` i typów Next/React/Node/lucide/next-intl oraz dziedziczy stare błędy propsów `children missing`.

## Research input

- MEXC WebSocket market streams: live market source ma okno ważności i reconnect boundary, więc receipt/proof musi mieć expiry.
- MEXC Proof of Reserves: token/network/wallet transparency jest traktowane jako snapshot context, nie gwarancja.
- LVMH/Aura DPP: proof/provenance/traceability powinny być zorganizowane jak lifecycle passport, a nie jak hype badge.

## Wdrożone pliki

- `lib/market-integrity/proof-consent-receipt-gate.ts`
- `scripts/verify-pass310-proof-consent-receipt-gate-safety.mjs`
- `components/search/VelmereIntelligenceSearchClient.tsx`
- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/ShieldMapClient.tsx`
- `app/globals.css`
- `package.json`

## Nowe UI / product behavior

PASS310 dodaje `Proof Consent Receipt` do:

- VLM Browser / Lens
- wyników Lens jako receipt
- Shield terminal
- Shield Map

Receipt pokazuje:

- public visible fields
- held fields
- expiry window
- consent score
- public copy readiness
- operator review pressure
- redaction need

## Psychologia / anti-FOMO

- FOMO zamienione w consent/review friction.
- Wysoki social/attention context nie daje presji; zwiększa wymagania dowodowe.
- Elitarny status wynika z restraint, provenance i selective disclosure.
- Customer copy musi pokazać granice zanim pokaże benefit.
- Brak buy/sell command, countdownów, fake scarcity, guaranteed/risk-free copy.

## Delta PASS310

| ID | Obszar | Previous | Current | Change |
|---|---:|---:|---:|
| K03 | Analytics event taxonomy / consent event class | 46 | 49 | +3 |
| K05 | Privacy redaction envelope | 100 | 100 | +0 |
| K07 | Retention policy / proof lifecycle | 36 | 39 | +3 |
| M05 | Redacted payload export | 100 | 100 | +0 |
| M08 | PDF/browser replay boundary | 67 | 69 | +2 |
| M01 | Velmère Shield Report | 88 | 90 | +2 |
| A06 | Runtime observability | 94 | 95 | +1 |
| L07 | Source policy / adapter governance | 43 | 44 | +1 |

**PASS310 total: +12 pkt.**

## Walidacja

```bash
npm run verify:pass310-proof-consent-receipt-gate
npm run verify:pass309-ethical-signal-event-taxonomy-gate
npm run check:i18n
npm run vercel:preflight
```

Wynik: PASS. `vercel:preflight` przeskanował 630 plików.

