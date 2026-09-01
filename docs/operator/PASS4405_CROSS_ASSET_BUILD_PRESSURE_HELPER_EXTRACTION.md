# PASS4405 — CrossAsset build-pressure helper extraction (no visual changes)

Scope: reduce Real Markets client bundle/build pressure by moving alias, quote-symbol and fallback market-size helper code out of `components/market-integrity/CrossAssetCollapseRadarPanel.tsx`.

## What changed

- Added `lib/market-integrity/pass4405-cross-asset-build-pressure-helpers.ts`.
- Moved Real Markets market-cap and 24h-volume fallback maps into the helper.
- Moved manual market alias matching into the helper.
- Moved quote-symbol fallback selection and quote picking into the helper.
- Kept the exported function names used by the component: `fallbackMarketCap`, `fallbackVolume24h`, `matchPass1994ManualMarketAliases`, `quoteSymbolsForAsset`, `quoteForAsset`.

## No-visual boundary

No JSX layout, class names, copy, chart rendering, table rows, modal structure, animation or responsive behavior was intentionally changed. This pass only changes where helper logic lives.

## Why

The last Windows log showed TypeScript green, but `next build --webpack` previously hit JavaScript heap pressure. PASS4404 reduced `TokenRiskModal.tsx`; PASS4405 starts the same no-visual decomposition for `CrossAssetCollapseRadarPanel.tsx`, which remains one of the largest active client components.

## Live claim policy

This is not live proof. Public “topka świata LIVE” remains blocked until full Windows/hosted/provider/payment/PDF/AI receipt bundle is actually green.
