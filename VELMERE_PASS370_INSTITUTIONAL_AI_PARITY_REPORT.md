# PASS370 — Institutional Real Markets + Unified AI Brain Parity

## Goal
Move the build closer to the target: Real Markets should feel like Shield, Browser PDF preview/download should share one structure, and AI Brain should become a visible data-gathering animation that ends in a clean 10/14/20-field readout instead of random debug tiles.

## Implemented

### 1. Real Markets institutional expansion
- Added `lib/market-integrity/pass370-institutional-real-market-universe.ts`.
- Added more equities, FX pairs, ETFs, commodities and real-estate proxies.
- Real Markets now merges the base matrix, previous extra assets and PASS370 institutional universe.
- Added logo/fallback visuals for the new symbols and proxy classes.

### 2. Unified AI Brain output contract
- Added `lib/market-integrity/pass370-unified-ai-brain-output.ts`.
- Basic returns 10 human-readable output fields.
- Pro returns 14 output fields.
- Advanced returns 20 output fields.
- Each field has label, value and human copy so the UI does not invent random text.

### 3. Real Markets modal brain/readout
- `MarketBrainAudit` now uses the shared output contract.
- The brain animation remains visible, but the final output is a structured readout grid.
- Added scroll-safe readout styling for long Advanced outputs.

### 4. Browser PDF preview/download parity
- `app/api/search/lens-report/route.ts` now imports the same PASS370 AI Brain output builder.
- HTML preview includes `AI Brain output parity` section.
- Downloaded PDF now has page 6: `AI BRAIN OUTPUT PARITY`.
- Preview and PDF share the same ordered output rows.

### 5. Security page simplification
- Added a simple public story: private key stays private, signatures prove control, public reports are redacted, and operator rules stay hidden.
- Keeps the page premium and understandable without exposing sensitive heuristics.

## Guard
Added:

```bash
npm run verify:pass370-institutional-ai-parity
```

## Validation run
Passed:

```bash
npm run verify:pass370-institutional-ai-parity
npm run verify:pass369-unified-ai-brain-pdf-realmarkets
npm run verify:pass368-prime-crypto-research-lab
npm run verify:pass367-browser-orbit-realmarkets
npm run verify:pass366-runtime-scroll-lock
npm run check:i18n
npm run vercel:preflight
```

`vercel:preflight` scanned 667 files.

## Known boundary
Full typecheck/build was not marked green because the exported package still inherits dependency/type availability issues from the previous passes. PASS370 guard and static preflight are green.
