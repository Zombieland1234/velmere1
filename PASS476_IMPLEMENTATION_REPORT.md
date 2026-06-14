# PASS476 — Mobile Interaction, Modal Containment, Chart Gestures & Asset Identity

## Scope

PASS476 is a full-project mobile interaction sweep focused on the live Velmère deployment and the issues reproduced from the user report:

- background scrolling behind wallet, PDF, Shield, Real Markets and VLM overlays;
- token/market modals that could not be scrolled safely on mobile;
- Shield product navigation overflowing narrow screens;
- oversized risk badge collisions;
- VLM Basic/Pro layout and transition density on phones;
- chart popup layering and missing close action;
- missing chart pan/zoom affordances;
- missing or weak identities for exchanges, stocks, crypto, FX, commodities and indices;
- incomplete PL/DE copy in the VLM mode layer.

## Implemented

### Shared modal scroll-lock runtime

Added `components/ui/useModalScrollLock.ts`:

- reference-counted locking for stacked portals;
- iOS-safe fixed-body scroll preservation;
- HTML/body overscroll containment;
- exact scroll position restoration;
- shared use in wallet, Browser/PDF, Shield token modal, Real Markets, VLM mode choice, VLM chart and neural audit overlays.

### Shield mobile layout

- Product navigation is now a mobile 1+2 grid: Browser full width, Shield Map and Real Markets below.
- Token modal uses the full dynamic viewport height on mobile.
- Header is sticky and remains above modal content.
- Inner modal is independently scrollable with safe-area padding.
- Risk badge is compact and can wrap without covering the token heading.

### Chart interaction

- Drag/pan works through Pointer Events.
- Two-finger pinch zoom is supported.
- Mouse wheel zoom is supported on desktop.
- Visible candle/point count is adjustable with compact `− / +` controls.
- Chart gesture surfaces use local `touch-action: none` instead of blocking the whole page.
- Dynamic bars-per-view replace the old fixed drag math.
- Controls and labels are localized for PL/DE/EN.

### VLM mobile repair

- Basic/Pro transition no longer slides a large card horizontally off-screen.
- Transition overlay is shorter and responsive to viewport width.
- VLM chart modal is above the site header (`z-[100000]`).
- Chart modal has a visible close X, full-height mobile scroll and sticky header.
- Basic/Pro cards use left-aligned mobile copy and a full-width mobile action button.
- Pro chart detail has its own close X and a smaller transition.

### Asset identity system

Expanded the resolver and fallback system for:

- crypto: DOT, POL/MATIC, LTC, TRX, TON, SHIB, UNI, ATOM, NEAR, APT, ARB, OP, SUI, PEPE;
- stocks/brands: TSLA, AMZN, GOOG/GOOGL, META, NFLX, AMD, INTC, ORCL, IBM, SAP, BABA, NKE, DIS, Visa, Mastercard and existing symbols;
- exchanges: Binance, MEXC, Coinbase, Kraken, Bybit, OKX, KuCoin, Gate.io, Bitget, Gemini, Crypto.com, Robinhood, NASDAQ and NYSE;
- commodities, FX and indices through premium typed glyph fallbacks.

Added consistent visual treatments for crypto, exchanges, commodities, FX, indices and real estate when a remote provider logo is unavailable.

### Localization

- Completed the PL and DE VLM mode-choice copy that was still English.
- Added translated close labels, transition labels and Pro explanation heading.
- Localized Shield navigation and the social/exchange router copy.

### Regression gates

Added `scripts/verify-pass476-mobile-modal-chart-safety.mjs` and extended Vercel preflight to protect:

- shared scroll lock usage;
- modal scroll regions;
- chart pan/pinch/wheel markers;
- VLM popup layering;
- mobile Shield navigation;
- asset-logo coverage;
- PL/DE/EN translation parity.

## Validation completed

- TypeScript/TSX syntax parse: 794 files, 0 syntax errors.
- i18n parity: PL/DE/EN pass.
- Vercel preflight: pass.
- PASS476 dedicated verifier: pass.
- PostCSS parse of `app/globals.css`: pass.

A complete `next build` was not run in the sandbox because a clean dependency installation did not finish in the available execution window. Generated `node_modules`, `.next` and TypeScript build cache are excluded from the package.
