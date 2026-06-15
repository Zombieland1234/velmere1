# PASS2029 — Vercel UI/mobile sweep

Status: implemented on top of PASS2028.

## Scope

This pass addresses the user-reported live UI defects and Vercel blockers:

- Vercel preflight failure caused by raw `<img>` in wallet components.
- Vercel install sensitivity caused by strict npm engine mismatch.
- Shield / Real Markets modal overlap feeling and clipped price values.
- Real Markets icons accepting `asset={...}` and `large` without TypeScript-safe props.
- Chart drag lag by throttling pan updates through `requestAnimationFrame`.
- Wallet "Other wallets" panel sliding left from the header wallet and right from side contexts.
- Cart bottom sheet size and distance from the screen edge.
- Square post modal calmer gray surfaces and owned comment scroll.
- Audit Watch VLM Brain sample chat can hand off context into Angel.
- Angel thinking state uses a 3D vertical V rotation and waits before publishing text.
- Header primary nav trimmed to VLM / Shop / Audit / Browser / Shield.
- Audit Watch and Shield Map typing lines are height locked to prevent page jumping.

## Vercel hardening

Changed:

- `.npmrc`: `engine-strict=false` to stop minor npm drift from killing Vercel install.
- `package.json` and `package-lock.json`: npm engine relaxed from `>=11.16.0` to `>=11.13.0 <12` while keeping Node `>=24.16.0 <25`.
- `components/wallet/WalletConnectOptions.tsx`: replaced raw `<img>` with `next/image`.

Verified:

- `node scripts/vercel-preflight.mjs` — OK.
- `node scripts/check-i18n.mjs` — OK.
- `node scripts/verify-pass2028-visual-stability.mjs` — OK.
- `node scripts/verify-pass2029-vercel-ui-sweep.mjs` — OK.
- TypeScript transpile parse for changed TSX files — OK.

Full `next build` was not confirmed locally because this workspace did not complete a full dependency install within the available runtime. The Vercel preflight blocker found in this pass was fixed.

## Changed files

- `.npmrc`
- `package.json`
- `package-lock.json`
- `app/globals.css`
- `components/Navbar.tsx`
- `components/wallet/WalletConnectOptions.tsx`
- `components/market-integrity/AssetLogo.tsx`
- `components/market-integrity/AdvancedMarketChart.tsx`
- `components/security/VlmAuditCommandClient.tsx`
- `components/angel/AngelPanel.tsx`
- `components/angel/AngelTeaser.tsx`
- `scripts/verify-pass2029-vercel-ui-sweep.mjs`

## Progress estimate

| Area | Before | After |
|---|---:|---:|
| Vercel preflight readiness | 78% | 91% |
| Header/wallet/cart/menu stability | 74% | 86% |
| Shield / Real Markets modal clarity | 82% | 89% |
| Real Markets icon robustness | 86% | 91% |
| Chart drag performance | 72% | 84% |
| Square post modal mobile/scroll | 74% | 84% |
| Audit Watch + Angel handoff | 70% | 88% |
| Mobile readiness for these surfaces | 68% | 80% |

Overall project estimate after PASS2029: about 84% production-polished, with the biggest remaining blockers being a real full Vercel `next build`, live Stripe/webhook DB checks, and final manual screen-by-screen QA on desktop/mobile.
