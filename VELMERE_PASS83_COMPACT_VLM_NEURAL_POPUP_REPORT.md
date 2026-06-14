# PASS 83 — Compact VLM Neural Popup Implementation

## Main change
TokenRiskModal no longer opens as a near-fullscreen terminal wall. It now opens as a compact centered popup:

- left side: clean chart, price, 24h move, and timeframe buttons only;
- right side: Basic Analysis and Advanced Analysis controls;
- no AI chat popup after clicking analysis;
- analysis is read from the VLM orb/neural tree overlay.

## VLM AI sequence
Clicking Basic Analysis or Advanced Analysis now keeps the user inside the popup and starts the VLM visual read:

- UI fades/blurs behind the analysis overlay;
- VLM orb enters from a random edge;
- center orb displays VLM, ticker and risk score;
- neural/genealogical tree expands from the orb;
- data packets move through the network lines;
- result cards float at the bottom of the animation.

## Basic vs Advanced
Basic mode:

- small calm tree;
- fewer nodes and packets;
- only the most important values: risk, price, 24h, liquidity, confidence.

Advanced mode:

- larger aggressive graph;
- more nodes and transmitters;
- broader data labels: risk core, price, momentum, liquidity, confidence, volume, holders, anomaly.

## Files changed
- `components/market-integrity/TokenRiskModal.tsx`
- `app/globals.css`

## Verification
Passed:

- `node scripts/verify-market-integrity-no-truncation.mjs`
- `node scripts/verify-shield-design-safety.mjs`
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`

`npm run typecheck` cannot be fully verified in this sandbox because the ZIP does not include installed node_modules / Next / React / lucide / next-intl types. The compiler stops on missing dependency types before a real project typecheck can complete.
