# Velmère PASS 197 — Shield Search Portal Containment Hotfix

## Summary
PASS197 fixes the bug where the Shield search dropdown could hide underneath Shield Investigator / sticky panels. The search suggestions now render through a fixed `document.body` portal, with viewport-aware positioning, premium scroll containment, outside-click handling and stronger token fallback glyphs.

## Files changed
- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/TokenRiskModal.tsx`
- `app/globals.css`
- `package.json`
- `scripts/vercel-preflight.mjs`
- `scripts/verify-pass197-search-portal-containment-safety.mjs`
- `lib/launch/project-progress.ts`
- `lib/launch/site-page-audit.ts`
- `docs/progress/PROJECT_PROGRESS_LEDGER.md`
- `VELMERE_PASS197_SEARCH_PORTAL_CONTAINMENT_REPORT.md`

## Implementation details
- Replaced in-form absolute Shield suggestions with a fixed `createPortal(..., document.body)` overlay.
- Added `suggestPanelFrame` and `syncSuggestionPanelFrame()` to keep the dropdown aligned with the search input during resize/scroll.
- Added `suggestPanelRef` so outside-click handling does not close the portal before suggestion clicks fire.
- Added `.shield-market-search-dock` containment/z-index and `.shield-token-search-suggest-portal` high-layer CSS.
- Added premium scrollbar styling for the portaled suggestion list.
- Expanded fallback glyphs: BTC, ETH, SOL, USDT, USDC, XRP, DOGE, BNB, ADA, TRX, LINK, AVAX, DOT, LTC, SHIB, PEPE.
- Added PASS197 verification guard and wired it into `npm run verify:shield-all` and `scripts/vercel-preflight.mjs`.

## Validation
- `node scripts/verify-pass197-search-portal-containment-safety.mjs` — OK
- `node scripts/verify-pass196-orbit360-final-runtime-hotfix-safety.mjs` — OK
- `node scripts/verify-pass195-home-locale-runtime-hotfix-safety.mjs` — OK
- `node scripts/check-i18n.mjs` — OK
- `node scripts/vercel-preflight.mjs` — OK
- `npm run verify:shield-all` — OK

Note: full `next build` was not run in this artifact environment because the ZIP does not include a complete installed `node_modules` environment. Static/Vercel guards pass.

## Master progress matrix
| Area | Status after PASS197 | Progress | Next |
|---|---:|---:|---|
| A. Core / Vercel / Runtime | Solid | 99% | Run real Vercel build/browser QA after upload. |
| B. Home / Landing / Brand | Solid | 76% | Real-device hero/readiness QA and conversion rhythm. |
| C. Shield Terminal / Market Integrity | Partial/Solid | 66% | Live holder/orderbook/contract adapters and mobile table QA. |
| D. VLM AI Brain | Solid UI, data partial | 94% visual / 70% data | Browser FPS QA; decide if WebGL replaces DOM orbit later. |
| E. Velmère Lens / Search / Browser | Partial/Solid | 82% | Real PDF generator and route differentiation. |
| F. Security / Trust | Launch-control | 70% | Real auth/WAF/env/audit storage. |
| G. Commerce / Store / Orders / Payments | Launch-control | 50% | Stripe/webhook/order persistence/provider proof. |
| H. VLM Token / Access / Wallet | Launch-control | 57% | Utility-only agreement, wallet/session gating, no ROI wording. |
| I. Square / Community / Research Lab | Partial | 48% | Moderation, member utility and public/private split. |
| J. SEO / Accessibility / Mobile / Performance | Partial/Solid | 90% mobile polish | Real-device QA and final social metadata sweep. |
| K. Production Data Backbone | Blocked | 40% | Durable source ledger/storage adapter/server-only proof. |
| L. Live Feeds / Data Adapters | Blocked | 35% | Holder/orderbook/contract/OSINT adapters and timeouts. |
| M. Reports / PDF / Evidence | Partial | 49% | Real PDF binary generator and customer-safe export workflow. |

## Current blockers
- Search overlay still needs real-browser QA on Vercel, especially at different scroll positions and viewport sizes.
- Holder/orderbook/contract/OSINT feeds are not fully production connected.
- Durable source ledger and audit storage are not production storage yet.
- Stripe/payment/order persistence remains launch-controlled.
- VLM Brain performance still needs real FPS testing; WebGL remains the likely future renderer if DOM orbit is too heavy.
- PDF route is still PDF-ready/report-preview infrastructure, not final binary PDF generation.
