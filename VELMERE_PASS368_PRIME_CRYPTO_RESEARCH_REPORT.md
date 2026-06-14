# PASS368 — Prime/Crypto Research Lab + Security + Real Markets polish

## Scope
- Research Lab now explains cryptography, prime numbers, elliptic-curve/BTC mental model, real entropy/RNG and Bajak Protocol as a cautious numerical-audit research track.
- Security page now has a simple public cryptography/wallet boundary: private keys stay private, entropy matters, signatures verify control, and proof reports stay redacted.
- Real Markets now exposes a clean universe strip: stocks, FX, real assets and exchange venues, without mixing crypto with real-market tables.
- Orbit 360 / VLM Brain now has a visible build timer and data-flow strip: source → liquidity → holders → output.

## Safety / claim boundary
- Research Lab says finite numerical reconstruction / audit / falsification, not public proof of RH.
- Wallet/security copy teaches concepts without instructions for attacking wallets or obtaining private keys.
- RNG copy is educational: quality of entropy source, not a public wallet-generation tutorial.

## Files touched
- app/[locale]/research-lab/page.tsx
- components/security/SecurityTrustPage.tsx
- components/market-integrity/CrossAssetCollapseRadarPanel.tsx
- components/market-integrity/TokenRiskModal.tsx
- app/globals.css
- package.json
- scripts/verify-pass368-prime-crypto-research-lab.mjs

## Verification
- npm run verify:pass368-prime-crypto-research-lab ✅
- npm run verify:pass367-browser-orbit-realmarkets ✅
- npm run verify:pass366-runtime-scroll-lock ✅
- npm run check:i18n ✅
- npm run vercel:preflight ✅

## Next PASS369 targets
1. PDF preview/download pixel parity: one renderer manifest for Browser modal and PDF route.
2. Lens AI copy engine: more asset-specific BAT/BTC/ETH/USDC/real-market summaries, less repetition.
3. Real Markets provider adapters: public provider state + SEC/company disclosure lane + FX reference lane.
4. Orbit 360: transform completed brain into final readout panel with 10/14/20 lines based on mode.
5. Research Lab: add interactive prime-residual chart and safe replication checklist.
