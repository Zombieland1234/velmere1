# Velmère pass – Polkadot-style Basic, Square feed, VLM Pro systems

## Video analysis applied
The uploaded Polkadot reference uses a very quiet, dark, editorial homepage: centered serif wordmark, short subtitle, a grain/noise field, wide whitespace, three philosophical columns, and social CTA buttons at the bottom. This pass translates that into Velmère Basic without copying brand assets.

## Implemented

### 1. VLM Basic homepage
- Added `components/vlm/VlmBasicPolkadotLanding.tsx`.
- Basic is now calm and Polkadot-like:
  - huge centered `Velmère Basic` serif title,
  - short philosophical copy,
  - subtle grain/noise background,
  - three bottom principle cards,
  - `Powered by Web3` rolling strip,
  - Instagram and X/Twitter buttons at the bottom.
- VLM Basic no longer visually competes with Pro.

### 2. VLM Pro direction
- Pro remains darker and denser, with protocol-room language.
- Selected systems stay visible for Pro:
  - Order-book cart,
  - Archive entitlement map,
  - Wallet safety preview,
  - AMU baseline,
  - Möbius routing path,
  - Prime lattice,
  - Garment hover label.
- Copy now supports the lore: Möbius, prime distribution, AMU, Bitcoin-style wallet discipline, no seed phrase, no unclear approvals.

### 3. Velmère App layer
- The Velmère App layer has a stable anchor: `#velmere-app`.
- Added it to the VLM/Web3 sidebar menu.
- Current app modules:
  - Drop Calendar,
  - Signal Studio,
  - Archive Rooms,
  - Fit Advisor,
  - Wallet Safety,
  - Member Pass.

### 4. Square feed improvements
- Square sidebars now include more useful feed mechanics:
  - pinned signals,
  - hot posts,
  - newsroom / live notes,
  - room map.
- Hot posts can open existing posts.
- This gives Square a more social/feed-like structure instead of empty decorative panels.

### 5. Navbar adjustment
- Main top nav now keeps: Collection / VLM / Square.
- The group is positioned between the Menu button and center logo, instead of competing with the right-side wallet/account controls.

## Still needs your decision
1. Real Instagram URL.
2. Real X/Twitter URL.
3. Which Velmère App modules stay for launch.
4. Which Square widgets stay: pinned, hot posts, newsroom, member rooms.
5. Whether Basic should remain fully monochrome like the reference, or receive one product image under the hero.

## Checks run
- `node scripts/check-i18n.mjs` passed.

## Build note
Full `npm run build` must be run on your PC or Vercel because this sandbox does not include `node_modules`.
