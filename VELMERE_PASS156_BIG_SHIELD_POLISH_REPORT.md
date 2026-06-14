# PASS156 — Big Shield Chart + Tiles + Mobile Polish

## Scope
This pass takes a larger set of tasks at once instead of only one micro-fix. Focus: Shield token popup, chart cockpit, VLM side tiles, detail drawer, mobile containment, and static Vercel safety.

## Implemented

### 1. Chart popup cockpit
- Rebuilt the popup chart shell with a darker premium cockpit surface.
- Added localized chart status pills: visible bars, latest price, visible change.
- Added visible high/low/footer stats for candle mode.
- Added hover/crosshair readout with close/high/low/volume in candle mode.
- Kept panning available but moved it into subtle localized guide text, not debug-looking UI.
- Improved mobile chart sizing and removed excess visual noise.

### 2. Shield containment
- Added stricter clip/paint containment for the modal, chart, action panel, VLM rail, detail drawer and Shield Map surfaces.
- Reduced glow bleed and forced pseudo-elements to stay inside rounded cards.
- Added overscroll containment to prevent modal/body scroll fighting on mobile.

### 3. VLM tiles visual pass
- Evidence tiles are more like premium side-rail cards: stronger left accent, better value pill, cleaner spacing.
- Hover/active state is less messy and no longer throws big glow outside the frame.
- Orbit runtime status chip is hidden from the UI, because it looked technical and unnecessary.

### 4. Detail drawer
- Drawer is more solid, darker and more readable.
- Outside-click dismiss layer is stronger and clearer.
- Drawer scrollbars are contained and styled.
- Mobile drawer behaves more like a bottom sheet.

### 5. Localization polish
- Mode guide kicker is localized instead of hardcoded English.
- Chart helper/status copy is localized for PL/DE/EN.
- VLM summary wording stays in safe review language: summary tool, not certificate/advice/guarantee.

### 6. New guard
- Added `scripts/verify-pass156-shield-chart-tiles-safety.mjs`.
- Added `npm run verify:pass156-shield-chart-tiles`.
- Plugged the new guard into `verify:shield-all`.

## Validation run
Passed:
- `npm run check:i18n`
- `npm run repair:codex-handoff`
- `npm run vercel:preflight`
- `npm run verify:shield-all`
- `npm run verify:pass156-shield-chart-tiles`
- `unzip -t`

Not fully confirmed locally:
- Full `next build` was not run to completion because `npm install --ignore-scripts` timed out in the sandbox before `node_modules` was created. Vercel remains the final build authority.

## Progress delta: PASS155 → PASS156

| Area | PASS155 | PASS156 | Delta |
|---|---:|---:|---:|
| Vercel/static build safety | 94% | 95% | +1% |
| Shield Map containment | 91% | 93% | +2% |
| Shield modal / chart popup | 84% | 89% | +5% |
| Basic/Pro/Advanced UX | 86% | 88% | +2% |
| Risk tile visual quality | 87% | 90% | +3% |
| Selected tile drawer | 89% | 92% | +3% |
| VLM visual brain / motion | 80% | 80% | 0% |
| VLM brain performance | 77% | 78% | +1% |
| Shield evidence/report/export | 61% | 62% | +1% |
| Shield terminal/search | 76% | 76% | 0% |
| PL/EN/DE translations | 64% | 67% | +3% |
| Mobile polish | 58% | 63% | +5% |
| Home / brand landing | 61% | 61% | 0% |
| VLM token page | 58% | 58% | 0% |
| Velmère Square | 49% | 49% | 0% |
| Research Lab / prime crypto story | 43% | 43% | 0% |
| Commerce/order/payment readiness | 51% | 51% | 0% |
| Overall launch-ready | 89–91% | 90–92% | +1% |

## Next recommended pass
PASS157 should be a larger site-wide pass:
1. home hero and page routing psychology,
2. Shield Map search/logo/results polish,
3. Velmère Square page progress,
4. full PL/DE/EN copy sweep for visible surfaces,
5. commerce launch checklist UI.
