# Velmère Shield PASS 69 — Performance Guard + Shield Map Premium OS

## Scope
PASS 69 continues from PASS 68 and focuses on practical product quality: fewer lags when opening a token, safer terminal hydration, stronger Shield Map presentation, and explicit performance guardrails.

## Main changes

### 1. Token click performance guard
- `TokenRiskModal` is now loaded through a client-only dynamic chunk.
- Main market page no longer imports the full terminal bundle upfront.
- Opening a token now uses a React transition state and a compact terminal boot indicator.
- Heavy terminal panels hydrate after first paint through `terminalBooted`.
- The chart and command palette appear first; AI, SOC, evidence, holder, VLM, replay and stress panels are deferred.

### 2. Deferred terminal data requests
- Order book fetch is delayed slightly after modal boot.
- History and replay fetch is delayed behind the initial modal paint.
- This reduces the chance that clicking BTC, ETH, SOL or any other row feels frozen.

### 3. Shield Map premium OS upgrade
- Added a new Shield Map command room.
- Added active layer preview with a radar-style board.
- Atlas nodes are now clickable and explain the active layer without exposing private scoring internals.
- Added compact status cards for queue, critical, watch and policy state.
- Shield Map is still a dedicated page, not an inline panel under search.

### 4. New Terminal Performance Guard module
- Added `lib/market-integrity/terminal-performance-guard.ts`.
- Added endpoint `app/api/market-integrity/performance-guard/route.ts`.
- Added `terminalPerformanceGuard` to the evidence report bundle.
- The module documents applied controls, missing controls, operator checks and legal note.

### 5. CSS / design system
- Added `.shield-terminal-loader`.
- Added `.shield-map-command-room`.
- Added `.shield-map-command-card`.
- Added `.shield-map-radar-board`.

## Files changed
- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/TokenRiskModal.tsx`
- `components/market-integrity/ShieldMapClient.tsx`
- `lib/market-integrity/terminal-performance-guard.ts`
- `app/api/market-integrity/performance-guard/route.ts`
- `app/api/market-integrity/report/route.ts`
- `app/globals.css`
- `scripts/verify-market-integrity-no-truncation.mjs`
- `scripts/verify-shield-design-safety.mjs`

## Verification run
- `node scripts/verify-market-integrity-no-truncation.mjs`
- `node scripts/verify-shield-design-safety.mjs`
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`

All four checks passed in the sandbox.

## Typecheck note
`npm run typecheck` still does not fully pass in the sandbox because the project does not have full `node_modules` and type packages available. The output is dominated by missing modules such as Next, React, next-intl, lucide-react, framer-motion, Stripe, Zustand, Tailwind and Node types, plus older project issues outside this pass.

## Legal / RegTech guardrail
Shield keeps language as anomaly, review, source uncertainty and algorithmic risk flag. It does not accuse tokens and does not provide financial advice. VLM remains utility/access only.
