# Velmère Pass 15 — Clothing commerce + audit implementation

## Based on uploaded GPT/Gemini audits
This pass implements the safest overlap between both external audits:

- clothing must behave like a clear luxury e-commerce funnel first;
- VLM/Web3 stays as optional access/perks, not a checkout blocker;
- remove terminal/trading microcopy from clothing/cart/checkout;
- add /clothing, /faq and /community surfaces;
- improve PLP filtering/sorting and mobile grid behavior;
- add Product JSON-LD, sitemap coverage and lightweight analytics events;
- keep motion and Web3 ambitious, but avoid heavy R3F/GSAP dependencies in this immediate Vercel-safe pass.

## Changed files

### Core commerce UX
- `components/CartDrawer.tsx`
  - Removed token agreement as a required checkout blocker.
  - Replaced trading language with retail language.
  - Added delivery/returns/VLM optional notes.

- `app/[locale]/checkout/success/page.tsx`
  - Replaced ledger/allocation copy with order/fulfilment copy.

- `app/[locale]/checkout/cancel/page.tsx`
  - Replaced order-book copy with clear payment-cancelled copy.

### Clothing PLP / routing
- `components/shop/ShopPageClient.tsx`
  - Added category filters and sort chips.
  - Added mobile 2-column / desktop 3-column grid.
  - Added waitlist CTA and clarity blocks: guest checkout first, wallet optional, delivery visible.
  - Added analytics events for clothing view and filters.

- `app/[locale]/clothing/page.tsx`
  - New route alias for dedicated clothing IA.

- `app/sitemap.ts`
  - Added `/clothing`, `/faq`, `/community`.

### PDP / SEO / analytics
- `components/shop/ProductDetailClient.tsx`
  - Added optional VLM benefit panel.
  - Added add-to-cart/size-select/product-view events.
  - Replaced `[ ITEM ALLOCATED ]` toast with localized retail copy.

- `app/[locale]/shop/[id]/page.tsx`
  - Added sanitized Product JSON-LD with Offer, shipping and return policy fields.

- `lib/seo/json-ld.ts`
  - Added JSON-LD sanitizer.

- `lib/analytics.ts`
  - Added lightweight event helper with `window.dispatchEvent` + optional Vercel `window.va` bridge.

### Community/support surfaces
- `app/[locale]/faq/page.tsx`
- `app/[locale]/community/page.tsx`
- `components/Footer.tsx`
- `components/Navbar.tsx`

### Translation and build guards
- `messages/en.json`, `messages/pl.json`, `messages/de.json`
  - Added/updated retail copy.

- `scripts/vercel-preflight.mjs`
  - Added guard against reintroducing terminal/trading/token-gating language into clothing cart/checkout.

## Checks run

- `node scripts/check-i18n.mjs` ✅
- `node scripts/vercel-preflight.mjs` ✅
- zip integrity test ✅

## Important note
I intentionally did not implement the heavy R3F/GSAP/Lenis shader system in this pass. The Gemini audit recommends it, but doing that now would add dependency/build/performance risk. This pass implements the safer commerce-first foundation first. Heavy cinematic WebGL can be a separate pass after Vercel is stable.
