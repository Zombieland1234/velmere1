# PASS444 — Browser / Real Markets UI AI polish

Scope: screenshot-driven cleanup for Velmère Browser, PDF preview/download, Real Markets, Basic/Pro/Advanced audit output and object-safe React rendering.

## Implemented
- Velmère Browser now has a sticky top Lens command shell, a compact PDF capsule card and a visible 4-stage PDF forge animation.
- PDF preview locks body scroll, keeps the download icon visible and uses the same report object as the PDF download.
- PDF route now wraps long report titles with a dedicated headline renderer to reduce A4 overlap.
- Real Markets includes additional stocks plus explicit crypto venue-health rows for Binance, MEXC, OKX, Kraken and Bybit without faking exchange prices.
- Basic / Pro / Advanced evidence now separates: price, market-cap/proxy, 1h/24h move, volume, source state, candles, missing data, second source, venue health and PDF-ready human brief.
- Unified audit renderer now safely stringifies provider objects so `{ price, change }` cannot crash React as a child.
- Neural audit modal shows 4 visible stages and locks background scroll.
- Advanced chart drag direction was flipped to natural terminal panning and annotated as no-fake-candles.

## Validation
- `npm run verify:pass444-browser-realmarkets-ui-ai`
- `npm run verify:pass443-nullish-build-hotfix`
- `npm run check:i18n`
- `npm run vercel:preflight`

## Still pending
- Full `next build` requires installing project dependencies (`node_modules`) in the target environment.
- Real venue health still needs live status/depth adapters; the UI now shows this as pending instead of fake live data.
