# PASS289 — Layout Stability Sentinel Gate

## Scope

- Next ID focus: J03 Responsive layout with support from J04, D20, D07, M06, E02 and M04.
- User-reported issue carried forward: Orbit 360 tile information must scroll and come from the right edge of the screen.
- Product direction: keep chart-first UX, compact proof rails, source hierarchy and VLM PDF forge visible without covering market data.

## External design scan

- MEXC direction: order book/depth and real-time market context stay close to trading decisions.
- LVMH/Aura direction: premium status is built through traceability, transparency and proof, not noisy urgency.

## Implemented

- Added `lib/market-integrity/layout-stability-sentinel-gate.ts`.
- Added `buildLayoutStabilitySentinelGate` into `TokenRiskModal.tsx`.
- Added a new rail: `shield-pass289-layout-sentinel` / `Viewport Glass Sentinel`.
- Strengthened Orbit right-edge detail drawer CSS with safe-area, scroll containment, stable scroll gutter and mobile right-edge behavior.
- Fixed a PASS288 layout risk where mobile CSS could turn the right-edge detail drawer into a bottom sheet.
- Added `verify:pass289-layout-stability-sentinel-gate` and linked it into `verify:shield-all`.

## Safety / psychology

- FOMO pressure is inverted into an anti-FOMO brake.
- No buy/sell instruction, no safety certificate, no profit language.
- Premium/elite UI status appears only after layout, proof and source hierarchy remain readable.

## Delta

| ID | Area | Previous | Current | Change |
|---|---|---:|---:|---:|
| J03 | Responsive layout | 74 | 79 | +5 |
| J04 | Scroll lock / z-index layers | 98 | 99 | +1 |
| D20 | Brain portal layering / scroll lock | 97 | 98 | +1 |
| D07 | Tile detail popup | 98 | 99 | +1 |
| M06 | Report download route | 49 | 51 | +2 |
| E02 | Lens search UX | 89 | 90 | +1 |
| M04 | Safe export wording | 100 | 100 | +0 |

PASS289 total: +11 points.
Tracker from PASS267: +384 points.

## Validation

- `npm run verify:pass289-layout-stability-sentinel-gate` — PASS
- `npm run verify:pass288-orbit-scroll-pdf-forge` — PASS
- `npm run check:i18n` — PASS
- `npm run vercel:preflight` — PASS
- `npm run typecheck` — still blocked by missing dependency/type environment and legacy project errors, not by PASS289 guard.
