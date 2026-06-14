# Velmère Pass 29 — Market Integrity Terminal Repair

## Scope
This pass repairs the Market Integrity terminal after visual and analytical review.

## Fixes
- Token modal now renders through a React portal into `document.body`, so it sits above the global navbar/header stacking context.
- Background scroll is locked while the modal is open.
- Token icons now render directly from the market data image URL with a safe fallback avatar, instead of relying only on the icon proxy.
- Search suggestions are limited to 3 compact results and prioritize exact/starts-with ticker/name/id matches.
- Search block was moved higher and the hero copy was reduced to feel less chaotic.
- Chart panel now looks more like an exchange terminal: candlestick-style price action with integrated volume bars underneath in one chart.
- Removed separate oversized volume block next to the chart.
- Added risk methodology decomposition in the modal: velocity/pump, liquidity/order book, holder/supply, contract/tax.
- Strengthened parabolic pump scoring so fast 24h/7d/30d moves do not incorrectly remain low-risk.
- Added translations for methodology copy in PL/EN/DE.

## Verified
- `node scripts/check-i18n.mjs` ✅
- `node scripts/vercel-preflight.mjs` ✅

## Notes
This is still a public-data terminal. Full institutional features like real mempool simulation, wallet graph neural networks, cross-chain clustering, and social/on-chain correlation require paid/indexed infrastructure and API keys. The UI now makes room for that roadmap without claiming legal proof.
