# Velmère UI Repair Pass — Brain / VLM / Square / Account

## Scope
This pass repairs the newest premium rebuild without returning to the chaotic earlier version. It keeps the cleaner dark-luxury system, but restores the emotional/interactive layer: neural brain, product discovery, VLM Basic/Pro, Square actions, size guide layering and wallet/account polish.

## Changed areas

### Home
- Rebalanced hero typography so the main headline is less oversized and easier to scan.
- Restored the neural brain / access visual as the right hero module.
- Reduced neural brain projection scale so nodes no longer get visually clipped at the card edge.
- Added product discovery directly after hero through `LuxuryProductCarousel`, so the homepage starts leading toward garments again.

### Product / PDP
- Fixed Size Guide overlay so it appears above Angel instead of being covered by the Angel button.
- Moved Size Guide into a higher, right-side floating dialog position with stronger backdrop and z-index.

### VLM Basic / Pro
- VLM mode prompt now opens immediately on entering the VLM page instead of relying on old session storage.
- Mode switch is larger and positioned closer to the header area between the Velmère logo and the right-side utilities on desktop.
- Added a left-edge VLM access route panel with future token purchase/swap/waitlist structure.
- Added stronger Basic/Pro copy: Basic remains quiet and fashion-first; Pro explains wallet state, cyber security, AMU, Möbius-inspired access loops, registry and contract verification.

### Velmère Square
- Floating plus button is now stacked near Angel instead of sitting awkwardly at the middle edge.
- Login-required feedback is a strong top alert instead of a hidden/low toast.
- Left and right Square columns now move with the feed instead of staying sticky.
- Modal overlay gets stronger scroll containment.

### Account / Auth
- Account gate headline reduced so the layout is wider and less heavy.
- Wallet options now show MetaMask/Phantom with fox/ghost symbols.
- Login page hero sizing reduced and balanced.

### Header / Language
- Added globe language selector in the right header utility group for EN/PL/DE.
- Kept wallet/account/cart separate but less visually dominant.

### Removed/kept
- UTC/EPOCH ticker remains disabled through `GlobalTerminalTicker` returning null.
- Real Google OAuth, real VLM contract purchase, real swap and real token balance still require production credentials/contracts and are not faked.

## Validation
- `node scripts/check-i18n.mjs` passes.
- Full `npm install`/`npm run build` could not be completed in this sandbox because dependency installation timed out. Run local build before pushing.

## Manual browser checks
- Home: 360px, 390px, 768px, 1440px.
- VLM page: prompt appears centered immediately; Basic/Pro switch does not collide with header.
- Square: plus button visible; unauthenticated post shows top login alert; post modal does not allow background scroll.
- Product: Size Guide appears above Angel and does not require scrolling to bottom.
- Account/login: MetaMask/Phantom visible and layout not oversized.
