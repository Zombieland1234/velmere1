# PASS2002 — broad commerce/nav/wallet aesthetic + logic sweep

## Scope
- Continued whole-file QA beyond Shield/Real Markets.
- Focused on navbar/menu, wallet nested list, product detail page, product size guide modal, commerce mobile dock, backgrounds, focus states and low-lag motion.

## Changed files
- `components/Navbar.tsx`
- `components/wallet/WalletConnectOptions.tsx`
- `components/shop/ProductDetailClient.tsx`
- `app/globals.css`
- `scripts/verify-pass2002-broad-commerce-nav-wallet-sweep.mjs`
- `package.json`

## Implemented
1. Navbar/menu polish
   - Removed duplicate close call on route change.
   - Main drawer menu links changed from row-line list into rounded card links.
   - Header logo focus ring moved from gold to calm cyan.
   - Language/wallet/account dropdowns marked as solid no-blur surfaces.

2. Wallet nested panel logic
   - Other Wallets panel now closes on outside click and Escape.
   - Added explicit PASS2002 markers for outside-click/escape behavior.
   - Kept left-attached nested wallet behavior from PASS2000.

3. Product detail page polish
   - Product buy box made darker, more solid and less glassy.
   - Specs card got quieter borders.
   - Product accordions changed from row dividers into card surfaces.
   - Accordion motion reduced to low-lag 0.18s with `aria-expanded`.
   - Size guide modal surface made solid, with pointerdown fast close.
   - Mobile purchase dock made solid no-glass with safe-area marker.

4. CSS sweep
   - Added PASS2002 CSS locks for menu/wallet/product surfaces.
   - Added no-blur and reduced-motion guard for new surfaces.
   - CSS brace check passes.

## Verification
- `npm run verify:pass2002-broad-commerce-nav-wallet-sweep` — OK 12/12
- `npm run verify:pass2001-broad-visual-logic-square-sweep` — OK 10/10
- `npm run verify:pass2000-aesthetic-logic-final-live-lock` — OK 12/12
- `npm run check:i18n` — OK
- `npm run vercel:preflight` — OK
- CSS brace count — OK

## Not run
- Full `next build` / `typecheck`, because the extracted ZIP workspace does not include `node_modules`.
