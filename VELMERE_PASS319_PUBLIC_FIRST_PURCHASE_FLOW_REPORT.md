# PASS319 — Public First Purchase Flow Gate

## Scope
PASS319 continues the public cleanup branch and moves the customer storefront from "nice but still technical" toward a first-purchase path: browse garment → choose fit → read material/delivery/returns → waitlist or checkout only when proof is ready.

## Research alignment
- MEXC WebSocket market streams use `wss://wbs-api.mexc.com/ws` and connection expiry is no more than 24h. Velmère live/proof UI therefore keeps freshness windows and never treats live proof as permanent.
- MEXC Proof of Reserves exposes token, network and wallet address data as a transparent reserve snapshot. Velmère treats this as source context, not as a safety promise.
- LVMH/Aura Digital Product Passport direction supports short customer-visible traceability/authenticity/lifecycle proof rather than dumping operator audit internals into public UX.

## New UI innovation
**Quiet First Purchase Constellation**

A public UI pattern that makes the first purchase feel like a private atelier path instead of a dashboard:
1. choose fit,
2. read material,
3. check delivery and returns,
4. join quiet drop list or checkout when proof is ready.

The innovation uses elite status only as proof-earned language: `atelier_preview`, `private_waitlist`, `proof_earned`, or `withheld`. It does not use countdowns, fake scarcity, wallet pressure, or investment-style urgency.

## Files changed
- `lib/market-integrity/public-first-purchase-flow-gate.ts`
- `scripts/verify-pass319-public-first-purchase-flow-gate-safety.mjs`
- `components/home/HomePageClient.tsx`
- `components/shop/ShopPageClient.tsx`
- `components/shop/ProductDetailClient.tsx`
- `app/[locale]/cart/page.tsx`
- `app/[locale]/checkout/page.tsx`
- `package.json`

## Public behavior
- Home now has a PASS319 first-purchase constellation rail.
- Shop now has a compact private-drop purchase path before the product grid.
- Product detail now shows a fit-first purchase constellation, not operator/provider internals.
- Cart now has quiet cart review copy.
- Checkout now has proof-gated checkout copy.

## Safety boundary
- No buy/sell command.
- No guaranteed safety, profit, solvency or liquidity language.
- No countdown FOMO.
- No fake scarcity.
- No forced wallet flow.
- Technical proof debt remains hidden from the customer route and belongs in admin/operator lanes.

## Guard results
- `npm run verify:pass319-public-first-purchase-flow-gate` — PASS
- `npm run verify:pass318-public-storefront-focus-gate` — PASS
- `npm run verify:pass317-public-launch-surface-gate` — PASS
- `npm run verify:pass316-public-commerce-trim-gate` — PASS
- `npm run check:i18n` — PASS
- `npm run vercel:preflight` — PASS; scanned 639 files

## Known blocker
`npm run typecheck` still fails on inherited environment/project blockers: missing local dependency types for Next, React, Node, lucide, next-intl and older props issues such as `children` missing. PASS319 guard and Vercel preflight pass.
