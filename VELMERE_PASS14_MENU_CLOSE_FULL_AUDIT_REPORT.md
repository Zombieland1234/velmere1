# Velmère Pass 14 — mobile menu close + build guard audit

## Fixed

- The side/mobile drawer now closes immediately after clicking the menu logo, primary drawer links, collection links, legal links, and language links.
- This specifically fixes `/shop?category=men` and `/shop?category=women`, where the route can stay on the same pathname (`/shop`) while only the query changes, so relying only on pathname changes was not enough.
- Added `closeMenuPanel()` in `components/Navbar.tsx` to close menu, wallet, language, and member dropdown layers together.
- Added explicit `onClick={closeMenuPanel}` to drawer navigation links.

## Hardened

- Added a Navbar drawer guard to `scripts/vercel-preflight.mjs` so future edits do not accidentally remove the menu-close handler.
- Re-ran existing i18n and Vercel preflight checks.

## Verified in sandbox

- `node scripts/check-i18n.mjs` passed.
- `node scripts/vercel-preflight.mjs` passed.
- ZIP integrity test passed.

## Not fully verified here

A full `npm install && next build` could not be completed inside the sandbox because dependency installation timed out. Vercel should still run the full production build normally after upload.
