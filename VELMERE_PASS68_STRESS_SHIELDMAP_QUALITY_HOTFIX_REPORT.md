# PASS 68 — Stress Crash / Shield Map Quality / Main Shield Lens Hotfix

## Scope
This pass fixes the live runtime crash reported from the browser and improves the weakest UX areas visible in the screenshots: token click stability, the Shield icon panel, the Shield Map page, and table wheel scrolling.

## Fixed runtime crash
- Fixed `TypeError: stress is not iterable` in `lib/market-integrity/soc-orchestrator.ts`.
- Fixed the same iterable assumption in `lib/market-integrity/shield-chat.ts`.
- `buildStressScenarios()` returns an object with `.scenarios`, not a raw array. Both consumers now normalize through `stressScenarios` before sorting.
- Added verification checks so future passes cannot accidentally spread `stress` as an array again.

## Main page UX changes
- Reworked the Shield icon panel into a smaller `shield-quick-panel` instead of a large block that dominated the clean landing area.
- The quick Shield lens now shows only compact status, safe wording, selected layer, next review and links to the full Shield Map.
- The full Shield Map remains a separate page opened from the `Shield map` button.
- Fixed the duplicate `Order book` label declaration in the Shield layer configuration.
- Improved table wheel handling so vertical wheel movement over the table pushes the page scroll instead of feeling locked.

## Shield Map page improvements
- Added a stronger premium “operating atlas” section.
- Added source truth ledger cards for candles, liquidity, holders and contract state.
- Made the page more like a product/control-plane explanation rather than a flat text page.
- Kept the private scoring core hidden: the page explains workflow, not private weights, thresholds or heuristics.
- Kept RegTech language: anomaly, review, uncertainty, no accusations and no investment advice.

## Files changed
- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/ShieldMapClient.tsx`
- `lib/market-integrity/soc-orchestrator.ts`
- `lib/market-integrity/shield-chat.ts`
- `app/globals.css`
- `scripts/verify-market-integrity-no-truncation.mjs`
- `scripts/verify-shield-design-safety.mjs`

## QA
Passed:
- `node scripts/verify-market-integrity-no-truncation.mjs`
- `node scripts/verify-shield-design-safety.mjs`
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`

Partial / not fully passed:
- `npm run typecheck` still fails in the sandbox because the project does not have a full installed dependency/type tree. The output includes missing modules such as `next`, `react`, `lucide-react`, `next-intl`, `framer-motion`, `stripe`, `zustand`, `tailwindcss`, Node types, and older unrelated project issues.

## Product status
After this pass, the Shield / VLM vision is around 36–39%. This pass removes a real blocker, but production still needs live on-chain APIs, multi-exchange orderbook/depth, wallet/session gating, billing/access enforcement, persistent audit logs, rate limits, export infrastructure and full legal/data-source policy pages.
