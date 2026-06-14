# Velmère PASS402 — Terminal Clean Orbit Controller

## Main blocker focus
PASS402 continues the Browser / Shield / Shield Map / Real Markets cleanup. The priority is not adding another visible pass-history wall; the priority is one clean runtime path:

Search → Modal → Orbit 360 VLM Brain → Field output → HTML preview → PDF download.

## Implemented
- Added `lib/market-integrity/pass402-terminal-clean-orbit-controller.ts`.
- Added `PASS402_RUNTIME_CLOSE_EVENT` for one hard-close runtime controller across Browser, Shield, Shield Map and Real Markets.
- Expanded Real Markets with 32 provider-ready instruments across AI/software/cyber, EU/Asia equities, FX, commodities and real-estate proxies.
- Added deterministic visual patches and pseudo-price lanes for the new universe so icons do not render as empty/random circles.
- Added PASS402 Orbit 360 Brain readout: VLM coin, blue neural shell, 96 source packets, timer and 10 / 14 / 20 output fields.
- Added PASS402 PDF parity section and binary PDF page 28.
- Added PASS402 HTML preview section using the same resolved report payload as download.
- Added PASS402 contract to Real Markets catalog API.
- Added CSS for the new clean-orbit visual layer.
- Added `npm run verify:pass402-terminal-clean-orbit`.

## Runtime rules
- Browser, Shield, Shield Map and Real Markets dispatch/listen to the PASS402 close event.
- Search suggestions should close before PDF forge, preview, download, modal open, tab switch and scroll.
- Real Markets keeps Shield-like behavior: logo, candles, timeframe, Basic / Pro / Advanced and Orbit Brain in one modal path.
- PDF output uses one payload, one locale and one deterministic section order.

## Safety / copy boundaries
- Public Security stays simple: private-key boundary, signature proof, entropy quality, source freshness, redaction and withheld internals.
- Research Lab stays framed as numerical audit, entropy/RNG review, replication and falsification.
- No claims of guaranteed profit, guaranteed price, wallet-breaking methods, or formal proof claims.

## Validation
Passed:
- `npm run verify:pass402-terminal-clean-orbit`
- `npm run verify:pass401-terminal-exactness-matrix`
- `npm run verify:pass400-terminal-proof-engine`
- `npm run check:i18n`
- `npm run vercel:preflight`

Parser sweep: 697 TS/TSX files.
Vercel preflight: 702 files.

`npm run typecheck` still fails because the exported ZIP does not include full dependencies/type packages such as Next, React, lucide-react, wagmi, stripe, zustand, tailwindcss and @types/node. That is an inherited environment issue, not a new PASS402 parser blocker.
