# Velmère Store

Production-oriented custom Next.js / Vercel storefront for Velmère luxury streetwear, with PL / EN / DE locales, safe Stripe checkout scaffolding, VLM access-layer copy, and product import tooling.

Current business context:

- Seller display name: Marcin Bajak
- Draft contact: velmere141@gmail.com
- Business country: Germany
- Base currency: EUR
- Shipping is charged separately and must be finalized before checkout is enabled
- Shopify is not used as the storefront or checkout for this build

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000/pl`. The default locale is `pl`; `/en` and `/de` are also available.

## Locales

Locale messages live in `messages/pl.json`, `messages/en.json`, and `messages/de.json`.

Run parity checks after copy changes:

```bash
npm run check:i18n
```

## AI API Setup

Admin AI copy tools call the internal `/api/ai` route. The browser never calls Gemini directly and the key is never exposed to client code.

1. Rotate/delete any Gemini key that was pasted into chat, docs, screenshots, logs, or committed files.
2. Create a new Gemini API key in Google AI Studio.
3. Add it locally to `.env.local`:
   ```bash
   GEMINI_API_KEY=<your-new-key>
   ```
4. Add the same key in Vercel Project Settings -> Environment Variables.
5. Redeploy.
6. Never prefix the Gemini key with `NEXT_PUBLIC`.
7. Never commit real API keys.

`OPENAI_API_KEY` is kept as an optional server-side placeholder for future provider work. It must also stay out of client code and committed files.

## Checkout Modes

Checkout is intentionally disabled by default:

```bash
STORE_BASE_CURRENCY=EUR
CHECKOUT_MODE=disabled
```

Supported values for this custom store:

```bash
CHECKOUT_MODE=stripe
CHECKOUT_MODE=disabled
```

Stripe checkout also requires:

```bash
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_SITE_URL=
```

The app also requires:

```bash
STORE_COMMERCIAL_READY=true
```

Only set that after product data, shipping, returns, tax, contact details, fulfilment mapping, and legal review are ready. Without it, `/api/checkout` returns a safe disabled response.

## Stripe Webhooks

The webhook route is:

```text
/api/stripe/webhook
```

For local testing, forward Stripe events to that route and set `STRIPE_WEBHOOK_SECRET` from the forwarding session. The webhook verifies the Stripe signature before handling `checkout.session.completed`.

## Product Imports

The admin import UI is not linked in navigation:

```text
/{locale}/admin/import-products
```

Set:

```bash
ADMIN_IMPORT_TOKEN=
```

Then paste the token into the admin page.

Import methods:

1. Paste product links, one per line.
2. Sync Printful products with `PRINTFUL_API_TOKEN` and optional `PRINTFUL_STORE_ID`.
3. Paste Tapstitch product links where public metadata is available.
4. Upload or paste CSV product data.

Imports create drafts and warnings. They do not make products purchasable automatically.

AI-assisted product description generation is server-side only and requires `GEMINI_API_KEY`. Generated copy must be reviewed before publishing and must not expose provider credentials.

## Static Catalog MVP

This build uses a static catalog at:

```text
lib/products/catalog.generated.ts
```

Vercel serverless functions cannot persist product imports to local files at runtime. To persist imported products without a database, run locally:

```bash
npm run import:products -- links ./links.txt
npm run import:products -- csv ./products.csv
```

Review the generated catalog, keep products as `coming_soon` until ready, then commit the generated file.

To publish a product as active, verify:

1. `status` is `active`.
2. Price is real and stored in cents.
3. Images exist.
4. Variants exist.
5. Checkout mode is configured.
6. Shipping and returns pages are final.
7. Contact and seller details are real.
8. Automatic fulfilment has real provider variant IDs.
9. Stripe webhook is verified if using Stripe.

## Printful

Printful API calls are server-only.

```bash
PRINTFUL_API_TOKEN=
PRINTFUL_STORE_ID=
PRINTFUL_CONFIRM_ORDERS=false
```

When `PRINTFUL_CONFIRM_ORDERS=false`, the integration creates a draft/manual order path instead of auto-confirming fulfilment.

## Tapstitch

Tapstitch is handled through public product links or CSV import in this custom store. Do not scrape private dashboards, bypass login, or present Tapstitch fulfilment as automatic unless a real, reviewed integration is added later.

## Secrets

Never expose secret keys in the browser. Do not prefix Gemini, OpenAI, Stripe secret, Printful, admin, deployer, private wallet, seed phrase, or provider tokens with `NEXT_PUBLIC`.

Only publish keys intentionally designed for browsers, such as the Stripe publishable key. Real secrets belong in `.env.local` and Vercel Environment Variables only.

## Environment Keys

All private keys stay server-side in `.env.local` and Vercel Environment Variables. Do not commit real values.

```bash
GEMINI_API_KEY=
OPENAI_API_KEY=
PRINTFUL_API_TOKEN=
PRINTFUL_STORE_ID=
PRINTFUL_CONFIRM_ORDERS=false
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

Gemini keys come from Google AI Studio and must never use a `NEXT_PUBLIC_` prefix. Printful API tokens and store IDs are private server-side integration data. WalletConnect/Reown project IDs are public identifiers when that connector is enabled. Stripe checkout remains disabled until legal, seller, shipping, tax, return and fulfilment readiness gates pass.
