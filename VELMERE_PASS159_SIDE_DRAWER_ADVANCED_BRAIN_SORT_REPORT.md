# Velmere Pass 159 — Side Drawer + Advanced Brain + Tri-state Sort

## Scope
- Move mode explanation drawer from inline/downward block to a real side drawer.
- Restore 3D neural orbit for Advanced Analysis.
- Keep Basic/Pro in compact side-rail mode.
- Add tri-state table sort cycle: desc -> asc -> reset-to-default-tab.
- Improve token suggestion logo fallback for common assets like SOL/BTC/ETH.
- Silence local suggestions hook dependency warning by memoizing the local finder.

## Files touched
- `components/market-integrity/TokenRiskModal.tsx`
- `components/market-integrity/MarketIntegrityClient.tsx`
- `app/globals.css`

## Notes
- Advanced now uses the neural orbit layout again via `useRailLayout = !isAdvanced`.
- Info buttons now open a fixed side drawer (`shield-mode-guide-drawer`) and the full-screen dismiss layer closes it by clicking outside.
- Sort reset follows the active tab default: Top -> rank asc, Trending -> 24h desc, Highest risk -> risk desc.
