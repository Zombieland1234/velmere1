# VELMERE PASS 93 — Vercel Warning Cleanup / VLM Motion Pacing / Homepage Shield Funnel

## Base
Built on PASS 92 `velmere_pass92_operational_shield_investigator`.

## What changed

### 1. Removed Next.js `<img>` warnings
Updated:
- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/TokenRiskModal.tsx`

Replaced raw `<img>` token icons with `next/image` `Image` and `unoptimized`.

Updated:
- `next.config.mjs`

Added token-image remote patterns and allowed `https:` in the CSP image source so CoinGecko/DexScreener-style token logos do not get blocked by the site security policy.

### 2. VLM 3D neural brain pacing
Updated:
- `components/market-integrity/TokenRiskModal.tsx`

The VLM neural animation is now slower, less chaotic and more premium:
- slower orb entry
- smoother 360 brain formation
- fewer particles on high/medium/low quality tiers
- lower canvas DPR cap to reduce mobile GPU pressure
- slower grid drift
- slower brain rotation
- delayed graph formation so the VLM orb reads as a cinematic core first
- calmer data packet movement

### 3. Mobile polish
Updated:
- `app/globals.css`

Added mobile-safe VLM overlay polish:
- safer topbar spacing with safe-area insets
- better touch targets
- thinner scrollbars for compact rail
- reduced mobile rail height pressure
- canvas will-change hint

### 4. Homepage Shield funnel
Updated:
- `components/home/HomePageClient.tsx`

Added a premium entry block for:
- VLM Shield
- Market Integrity
- Shield Map
- Low float / unlock / KOL risk education

This makes the homepage connect Store + VLM + Shield more like a launch-ready ecosystem.

## Validation

Passed:
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`
- `node scripts/verify-market-integrity-no-truncation.mjs`
- `node scripts/verify-shield-design-safety.mjs`

Static checks:
- no raw `<img>` tags in `.tsx`
- no direct `MapIterator` spreads like `[...map.values()]`

Not fully run:
- `next build` / `tsc --noEmit`, because this sandbox artifact does not include installed `node_modules`.

## Current project completion estimate

Overall: ~57%

Breakdown:
- Core storefront / product presentation: 62%
- Homepage premium positioning: 64%
- VLM token/access page: 58%
- Market Integrity table/search/modals: 65%
- TokenRiskModal chart + Basic/Advanced readout: 61%
- VLM 3D neural animation quality: 54%
- Shield Map / Investigator: 59%
- Mobile UX/performance: 49%
- Legal/trust/copy readiness: 52%
- Production readiness / Vercel/build safety: 58%
- Real live data depth: 42%
- Wallet/VLM gating: 35%

Next recommended pass:
PASS 94 — full mobile master pass + Shield Map dashboard density cleanup + VLM neural readout interaction polish.
