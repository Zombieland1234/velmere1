# Required production data — Velmère

Use this checklist before enabling commercial clothing sales and VLM activation. Do not commit secrets to the repository; configure them in `.env.local` and Vercel Environment Variables only.

## Seller / legal

- Full legal name (Marcin Bajak — confirm legal form)
- Full business address in Germany
- VAT ID / tax number (if applicable)
- Return address for EU withdrawals
- Phone (if required for Impressum)
- Legal entity type (sole trader, UG, GmbH, etc.)

## Payments (Stripe)

- Stripe account verified for EUR
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- Checkout success/cancel URLs (`NEXT_PUBLIC_SITE_URL`)
- Payout bank account configured in Stripe

## Printful

- `PRINTFUL_API_TOKEN`
- `PRINTFUL_STORE_ID`
- Product sync scope and shipping profiles
- Variant ID mapping per size/color
- EUR retail prices and margin rules

## Tapstitch

- CSV export or product URLs
- Images, variants, sizes, colors
- Base costs and fulfilment rules
- `TAPSTITCH_IMPORT_MODE` configuration

## Products

- Final names and descriptions (PL / EN / DE)
- EUR prices
- Size charts
- SKU / variant matrix
- Shipping category per product
- Return eligibility per product type

## Shipping & tax

- Shipping rates by region (Europe, USA, international where supported)
- Production time vs carrier time disclosure
- VAT / tax rules for DE and EU cross-border
- `STORE_SHIPPING_RATES_READY=true`
- `STORE_TAX_READY=true`

## Auth / account

- Auth provider (e.g. Auth.js / NextAuth)
- `AUTH_SECRET`
- `DATABASE_URL`
- Email provider (`EMAIL_SERVER` or `RESEND_API_KEY`)
- Account pages: profile, orders, saved items

## AI Angel

- `AI_PROVIDER` selection
- `GEMINI_API_KEY` or `OPENAI_API_KEY` (server only)
- Allowed topics and retention policy for conversations
- No financial advice rule documented

## VLM token activation

- Target chain (Base / Sepolia testnet first)
- `VLM_CHAIN_ID`
- Deployed `VLM_CONTRACT_ADDRESS` and ABI
- `VLM_TREASURY_ADDRESS` (multisig)
- `VLM_DEX_ROUTER` and `VLM_POOL_ADDRESS`
- `VLM_AUDIT_URL`
- Explorer links and fee model confirmation
- Legal / MiCA review sign-off
- `VLM_COMMERCIAL_READY=true` only after above

## Legal pages (customer-facing)

- Terms of sale (final, not draft notice)
- Privacy policy (GDPR complete)
- Cookie consent tooling
- Shipping policy
- Returns / withdrawal policy
- Impressum with full address
- Token agreement aligned with deployed contract

## Platform flags

- `STORE_COMMERCIAL_READY=true`
- `STORE_SELLER_ADDRESS_READY=true`
- `STORE_RETURNS_POLICY_FINAL=true`
- `STORE_PRIVACY_POLICY_FINAL=true`
- `STORE_FULFILMENT_READY=true`
