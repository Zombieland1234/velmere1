# VELMÈRE Backend & State Hardening Report

## Scope
This pass continues from `velmere_performance_repair_ready` and preserves the cursor/scroll performance fixes while hardening checkout, webhooks, hydration, Angel AI catalog context, legal gates, and VLM swap preview logic.

## 1. Hydration Wall
- Added `lib/hooks/useMounted.ts`.
- Refactored `components/ui/LiveClock.tsx` to render a neutral server placeholder and only tick after client mount.
- Refactored `components/ui/LiveTimestamp.tsx` to avoid `Date.now()` server/client drift.
- Refactored `components/ui/GlobalTerminalTicker.tsx` to mount-gate marquee animation while preserving `pointer-events-none`.
- Added mounted skeleton protection to `components/wallet/WalletStatusChip.tsx` so connected wallet identity only reveals after client mount.

## 2. Stripe Metadata & Webhook Pipeline
- Refactored `app/api/checkout/route.ts` to accept `walletAddress`, strict item validation, selected size metadata, shipping country collection, and compact Stripe session metadata:
  - `walletAddress`
  - `orderItems`
  - `orderDraftId`
  - `providerIds`
  - `cartHash`
- Refactored `app/api/stripe/webhook/route.ts` to use true Stripe signature verification via raw request text and `stripe.webhooks.constructEvent`.
- Added `lib/db/order-service.ts` for Supabase persistence of completed checkout sessions.
- Added professional JSON fallback logging when Supabase configuration is missing.
- Extended `lib/db/schema.sql` with:
  - `velmere_orders`
  - `velmere_order_items`
  - indexes and RLS activation.

## 3. German/EU Checkout Legal Hardening
- Refactored `components/CartDrawer.tsx` into a stricter order-book checkout module.
- Added 19% VAT/MwSt breakdown:
  - Net Price
  - VAT / MwSt 19%
  - Gross Price
- Added two required checkout gates:
  - Terms of Service + Refund Policy / Widerrufsbelehrung
  - Token Agreement for VLM Access
- Stripe redirect is physically and logically disabled until both are accepted.
- Wallet address is submitted with the checkout payload when connected.

## 4. VLM Swap Engine Logic
- Refactored `components/vlm/VlmTradePreview.tsx` with:
  - Slippage settings: `0.1%`, `0.5%`, `1.0%`, custom input
  - Lightweight animated gas estimate
  - VLM amount input
  - Price impact calculation
  - High price impact warning above 50,000 VLM
  - `font-mono tabular-nums` formatting.

## 5. Angel AI Catalog Injection
- Refactored `app/api/angel/route.ts` to inject the active offline product catalog directly into the Gemini system instruction.
- Angel now receives structured product IDs, slugs, localized names, descriptions, prices, categories, tags, fulfilment status, and variant availability.
- This reduces catalog hallucinations and makes fashion/product answers grounded in current Velmère data.

## 6. Terminal Error Boundary
- Added `app/[locale]/error.tsx`.
- Styled as a corrupted black/red terminal crash screen.
- Includes digest, message, simulated hex crash log, recovery countdown, and `[ RETRY KERNEL INITIALIZATION ]` reset button.

## Verification Performed
- `node scripts/check-i18n.mjs` → OK across EN/PL/DE locale files.
- TypeScript parser pass over 191 TS/TSX files → OK, no syntax errors.

## Local Build Command
Run locally after installing dependencies:

```bash
npm install
npm run check:i18n
npm run typecheck
npm run build
```

## Deployment Notes
- Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel for webhook inserts. Do not expose it as `NEXT_PUBLIC`.
- Stripe webhook requires the real `STRIPE_WEBHOOK_SECRET` from the configured endpoint.
- Keep `STORE_COMMERCIAL_READY=true` only after legal, tax, shipping, privacy, returns, and fulfilment details are final.
