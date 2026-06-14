# Velmère PASS 133 — Full Site Page Audit + Vercel Static Guards

## Purpose
PASS133 expands review beyond Shield. The project now has a page-level audit matrix for Home, Clothing, Shop, VLM token/access, Square, Community, Shield routes, account/login aliases, member cockpit, legal pages, research and admin tooling.

## Added code
- `lib/launch/site-page-audit.ts`
- `scripts/verify-site-page-audit-safety.mjs`
- `scripts/verify-vercel-static-safety.mjs`

## What the audit tracks
Each page/system has:
- route,
- title,
- area,
- progress,
- status,
- Vercel risk,
- user goal,
- current state,
- launch blockers,
- next pass.

## Key page risks

### P0 / blocked
- Checkout/fulfilment: payment, tax, shipping and order-state flows are not production-finished.
- Member/VLM cockpit: session gating and utility-only access proof are not wired.
- Admin import products: must be gated or disabled before public launch.
- Data/API spine: holder, orderbook, contract, unlock and OSINT feeds are not production-wired.

### P1 / partial
- VLM token pages: need full utility-only wording review.
- Square/community: needs clearer user value, moderation and launch modules.
- Shield Map: strong, but long; should be compressed into operator lanes.
- Account/login aliases: need canonical redirect/session policy.
- Research Lab: must keep exploratory claims conservative.

## Vercel static guard
The new static guard checks:
- broad route coverage,
- no deployable CODEX source artifacts,
- no raw `<img>` in TSX,
- no direct Map/Iterator spreads that can break on target builds,
- no stale Shield runtime markers,
- Node engine pinning,
- TokenRiskModal runtime markers,
- browser APIs in server route/action files.

## Important note
This is not a replacement for `npm run build` on the real project with dependencies installed. It is a stronger static safety net before Vercel.
