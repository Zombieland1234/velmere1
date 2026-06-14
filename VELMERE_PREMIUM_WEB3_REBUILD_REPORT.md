# Velmère Premium Luxury + Web3 Membership Rebuild Report

## Scope completed

This pass rebuilt the public-facing experience around a single premium system:

- black / graphite / off-white / muted gold palette
- restrained editorial typography
- unified rounded cards, buttons, inputs, borders and shadows
- calm motion with reduced-motion support
- separated clothing commerce from VLM access
- removed public staging/dev wording
- removed VLM buy-first / token-dashboard emphasis
- repaired Square publishing UX and login gate
- repaired route scroll behavior so pages start at the top

## Visual direction

Velmère now behaves more like a private fashion house with a digital access layer:

- Home leads with the brand and product universe.
- VLM is framed as membership/access utility, not a trading page.
- Square is framed as a moderated member signal board.
- Login and Account feel like private club entry instead of template auth.
- Legal/trust links are visible in the footer and drawer.

## Key files changed

- `app/globals.css`
- `components/Navbar.tsx`
- `components/Footer.tsx`
- `components/PageTransition.tsx`
- `components/home/HomePageClient.tsx`
- `components/vlm/VlmAccessGatePage.tsx`
- `components/vlm/VlmFaq.tsx`
- `components/square/VelmereSquareClient.tsx`
- `app/[locale]/login/page.tsx`
- `components/auth/AuthFormClient.tsx`
- `components/auth/AuthGate.tsx`
- `components/dashboard/DashboardClient.tsx`
- `components/legal/LegalDraftPage.tsx`
- `messages/en.json`
- `messages/pl.json`
- `messages/de.json`
- `app/[locale]/opengraph-image.tsx`
- route metadata for Home, VLM, Square and Account

## Specific fixes requested by owner

### Basic / Pro VLM animation and scroll issue

The old public VLM mode switch was removed from the navbar. The VLM page is now one clear membership/access page rather than a Basic/Pro dashboard. `PageTransition` also scrolls to top on route change.

### Square plus button

The Square plus button is now fixed on the right side on desktop and bottom-right on mobile. If the visitor is not logged in, it opens an elegant modal and toast:

> Login required to publish to Square.

The modal links to `/login`.

### Login / Account

Login now uses private-club copy and unified inputs/buttons/errors. It includes:

- Sign in
- Create account toggle
- Forgot password visible state
- Return home
- Optional wallet binding
- Wallet safety warning

Account now has a unified private console with Overview, Orders, Addresses, Security and Wallet tabs.

### Legal / trust

Footer now includes:

- Impressum / Legal Notice
- Privacy Policy
- Terms
- Returns / Right of Withdrawal
- Shipping
- Contact

Footer microcopy includes:

- VLM is an access layer, not an investment.
- Never enter your seed phrase.
- Prices, taxes, delivery costs and return rights are shown before checkout.
- Consumer rights remain unaffected.

## VLM language rules applied

Avoided public CTA and copy such as:

- Buy VLM
- Buy now
- moon
- get rich
- passive income
- guaranteed
- investment opportunity
- profit promise
- buy tax / sell tax phrasing

Preferred copy:

- VLM is a utility/access concept.
- Access, not promises.
- No custody.
- No seed phrases.
- No price claim.
- Contract, chain and audit status remain TODO until verified.

## QA performed

- `node scripts/check-i18n.mjs` passed.
- Static scan removed:
  - staging
  - pending configuration
  - production OAuth
  - Buy VLM
  - Own the room
  - moon
  - get rich
  - passive income
  - investment opportunity
  - guaranteed
  - buy tax / sell tax
- Confirmed Home, VLM, Square, Login and Account share the same visual system.
- Confirmed footer legal links are present.
- Confirmed route transition scroll-to-top is implemented.

## QA not performed

A full Next.js build, browser console test and responsive device test were not run because the uploaded package does not include `node_modules` or a lockfile. Run these locally after installing dependencies:

```bash
npm install
npm run typecheck
npm run lint
npm run build
npm run dev
```

Then manually test:

- `/en`
- `/en/vlm-token`
- `/en/square`
- `/en/login`
- `/en/account`
- `/en/shipping`
- `/en/returns`
- `/en/terms`
- `/en/privacy`
- `/en/impressum`
- `/en/contact`

## Before paid launch

These must be completed before taking orders:

- real seller legal name
- full business address
- VAT/tax ID if applicable
- support and privacy email
- payment provider production keys
- shipping rates, countries, carriers and delivery windows
- return address
- GDPR processor list and retention periods
- cookie consent for analytics/marketing if used
- Terms reviewed against exact business setup
- VLM contract, chain, audit and legal review before token activation
