# PASS299 — Runtime Search Quarantine Gate

PASS299 fixes the real runtime crash reported from `TokenRiskModal.tsx` and hardens search portals so token selection cannot leave a suggestion layer hanging behind the modal.

## Product move

- MEXC inspiration: market depth/orderbook context must stay close to the decision surface, but it must not cover the modal.
- LVMH/Aura inspiration: premium trust comes from proof, provenance and calm boundaries, not from noisy overlays.
- Velmère innovation: Runtime Search Quarantine — the moment a token modal or investigator scan starts, search suggestions self-close, stop loading and cannot render behind the decision surface.

## Real bug fixed

- `ReferenceError: mode is not defined` in `TokenRiskModal.tsx`.
- The layout sentinel now receives `layoutSentinelMode`, derived safely from `vlmSequenceMode ?? "basic"`.
- `vlmSequenceMode` is declared before layout gates that depend on it.

## Search/modal fix

- Shield terminal now closes suggestions before opening token modal.
- Shield terminal prevents suggestion portal rendering while `selected` token modal exists.
- Shield Map closes investigator suggestions during scan/result states.
- Focus/change handlers cannot reopen the suggestion layer behind the active modal.

## Touched IDs

| ID | Area | Previous | Current | Change |
|---|---|---:|---:|---:|
| A06 | Runtime observability | 77 | 81 | +4 |
| A03 | TypeScript sanity | 97 | 98 | +1 |
| C02 | Shield search dropdown | 99 | 100 | +1 |
| E02 | Lens/search UX consistency | 100 | 100 | +0 |
| J04 | Scroll lock / z-index layers | 100 | 100 | +0 |
| J03 | Responsive layout | 88 | 89 | +1 |
| D20 | Brain portal layering / scroll lock | 100 | 100 | +0 |

PASS299 total: +7 points.

## Verification

- `npm run verify:pass299-runtime-search-quarantine-gate`
- `npm run verify:pass298-reserve-provenance-twin-gate`
- `npm run check:i18n`
- `npm run vercel:preflight`
