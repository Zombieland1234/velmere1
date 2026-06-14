# VELMERE GOD-TIER POLISH REPORT

## Scope
This pass addresses the live-site issues called out after deployment: cramped header after wallet connection, unclear command hint/mystery button, panels blending into pure black, weak cart contrast, account editing buried in the wrong place, Square feeling too simple, default audio being intrusive, and missing token utility surfaces.

## Implemented

### Header / macro layout
- Rebuilt `components/Navbar.tsx` into a full-width header: `w-full max-w-none px-4 md:px-8`.
- Removed the ambiguous `[⌘K]` chip next to the menu from the visible left control group.
- Moved account entry to `/dashboard`.
- Added explicit audio toggle in the right control cluster.
- Added strict wallet truncation: `0x1234...ABCD` style, preventing connected MetaMask overflow.
- Kept language, cart and wallet controls compact enough for desktop and tablet.

### Floating grey panels
- Reworked the side menu into a floating card: `top-4 bottom-4 left-4`, rounded, grey, shadowed.
- Reworked cart drawer into floating right card: `top-4 bottom-4 right-4`, `bg-[#1A1A1C]`.
- Reworked Angel AI panel to use the same grey floating contrast instead of pure black.

### Cart / checkout UX
- Restructured cart item rows with image thumbnail left + technical details right.
- Kept Net / VAT / Gross calculation.
- Kept legal gates before Stripe Checkout.
- Empty cart has stronger terminal copy.
- Cart state is now persisted via a Zustand store using `persist`.

### Audio
- Added `store/useAudioStore.ts` with muted-by-default persisted state.
- `useUiSounds` now respects mute state and never plays unless user opts in.
- Added `components/ui/AudioToggleButton.tsx` to the Navbar.

### Token utility / gating
- Added `components/ui/TokenGate.tsx`.
- Applied gate to Archive and Square.
- Locked content is blurred/grayscaled with `[ ENCRYPTED_ASSET ] // VLM ACCESS DENIED` overlay and connect wallet action.

### Dashboard
- Added `app/[locale]/dashboard/page.tsx` and `components/dashboard/DashboardClient.tsx`.
- Dashboard includes MEXC/Binance-like tabs:
  - Overview
  - Web3 Assets & Balances
  - Order History
  - Security
  - Profile & Avatar

### PDP / product page
- Reworked PDP terminal layer with breadcrumbs: `ROOT / SHOP / [CATEGORY] / [PRODUCT_ID]`.
- Added hardware/material specs table.
- ADD TO CART now cycles through `[ PROCESSING... ]` then `[ ITEM ALLOCATED ]` and opens cart.
- Fixed previous TypeScript risk around nullable product access.

### Forms
- Added `zod`, `react-hook-form`, and `@hookform/resolvers` dependencies.
- Login page now uses `AuthFormClient` with Zod validation and `[SYS_ERR]` monospace errors.

### Legal / footer
- Added stub routes:
  - `/legal/privacy`
  - `/legal/terms`
  - `/legal/shipping`
- Footer now links to these pages and includes `v1.0.0-rc.3 // AMU KERNEL`.
- Global scrollbar updated to 4px thumb `#333`.

### Deployment hygiene
- Added `vercel.json` forcing `npm install` and `npm run build`.
- Added `.env.local*` and `tsconfig.tsbuildinfo` to `.gitignore`.
- Removed local env/cache files from this package.
- Added optional Web3 build dependencies: `@react-native-async-storage/async-storage`, `pino-pretty`.

## Validation
- TypeScript/TSX parser check passed across 195 files.
- Full `npm install`/`next build` could not be run in this sandbox due no external npm registry access, but the previously observed Vercel failures are addressed:
  - `product.categories` -> `product.collection`
  - nullable product guard fixed through PDP rewrite
  - optional Web3 dependency warnings addressed in package.json
