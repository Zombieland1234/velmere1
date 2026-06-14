# Velmère WAAPI / Wallet / Square / Account Repair — Pass 02

## Fixed from screenshots

### 1. Runtime error: `Failed to execute animate on Element: iterationCount must be non-negative`
- Replaced every `repeat: Infinity` in app/components/lib TSX with `repeat: 999999`.
- This avoids browsers/WAAPI turning an infinite Motion loop into an invalid iterationCount during accelerated animations.
- Kept animations visually looping, but without the risky infinite WAAPI value.

### 2. Removed broken light theme
- Removed `ThemeToneToggle` from the navbar.
- Deleted `components/ui/ThemeToneToggle.tsx`.
- Removed `html.velmere-light` overrides from `app/globals.css`.
- The site now stays in the black Velmère theme instead of switching to the broken bright mode.

### 3. Mail is now a navbar action
- Removed the floating vertical left-side Mail chip so it no longer collides with VLM panels.
- Added a Mail button beside the Account/Cart actions in the top navbar.
- The existing mail drawer is opened through the `velmere:open-mail` event.

### 4. Wallet UI repaired
- Wallet rows now use a safer responsive grid, preventing the status pill from overlapping wallet names.
- Compact dropdowns no longer force two columns at `md` width.
- Other wallets now open a useful fallback page when WalletConnect is not configured.
- WalletConnect/Coinbase/Trust/Rainbow/Ledger still require `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` for real QR routing.

### 5. Square post comments pinned
- In the Square post modal, the comment input is now pinned near the top of the comment panel.
- Users do not have to scroll to the bottom to add a comment.
- The comment list scrolls separately under the pinned input.

### 6. Login security animation improved
- Added moving security packets: lock, key and wallet icons travel through the security graph.
- This makes the visual read as session/auth/wallet security rather than random lines.

### 7. Account console expanded
- Address tab now includes fuller delivery address fields: full name, street/number, apartment, postal code, city, country and optional phone.
- Added a data-vault explanation for Supabase Postgres + Row Level Security + server validation.
- Security tab now explicitly names Authenticator / 6-digit TOTP / passkey direction.

### 8. VLM Pro explanation added
- Added a plain-language Pro system block explaining:
  - Möbius routing
  - AMU baseline
  - wallet state
  - signal engine
- The text clarifies this is navigation/security/access logic, not a financial promise.
- Updated Pro messages to mention the future cold-wallet/custody-free Velmère Vault concept safely without promising “100% security”.

## Vercel notes
Use Vercel with:
- Install Command: `npm install`
- Build Command: `npm run build`
- Node: `20.x`

Required public/private env placeholders are already in `.env.example`:
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY`
- `VELMERE_SERVER_SESSION_SECRET`

## Local verification run here
- `npm run check:i18n` ✅

## Not run here
- `npm run build` was not completed in this sandbox because `npm install` timed out before dependencies were installed. The package keeps Vercel-ready npm commands in `vercel.json`.
