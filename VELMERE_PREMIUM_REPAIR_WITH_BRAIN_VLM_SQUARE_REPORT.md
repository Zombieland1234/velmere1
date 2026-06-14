# Velmère Premium Repair — Brain/VLM/Square

## Scope
This patch uses the cleaner premium rebuild as the base, but restores the stronger interaction layer from earlier Velmère passes.

## Completed
- Restored the neural fashion/access visual on the home page.
- Rebuilt the home hero so it is more intuitive: product-first, VLM second, Square as community layer.
- Removed the public UTC/EPOCH ticker from the layout and made `GlobalTerminalTicker` inert.
- Reintroduced VLM Basic/Pro mode selection:
  - modal prompt via portal,
  - fixed mode switch on VLM route,
  - Basic/Pro showcase section with Pro animation modules.
- Replaced the dry VLM contract card with the animated VLM access visual.
- Replaced public TODO labels with safer `Pending` language.
- Restored the more functional Square client with:
  - readable public feed,
  - login-required flow,
  - post modal/comment layer,
  - fixed create button,
  - wallet/account-aware guest state.
- Fixed known Vercel build blockers from prior logs:
  - removed JSX `// STRIPE` text from CartDrawer,
  - fixed ShopPage slot rendering using `String(slot)`,
  - changed HtmlLangSync to use `next/navigation` instead of locale-aware navigation.

## Verification performed in sandbox
- `node scripts/check-i18n.mjs` passed.
- TS/TSX parse scan passed: 0 parse errors.

## Not performed in sandbox
- Full `npm install` and `npm run build` could not be completed here because dependency installation timed out. Run them locally before pushing.

## Files touched most importantly
- `components/home/HomePageClient.tsx`
- `components/vlm/VlmAccessGatePage.tsx`
- `components/vlm/VlmModeChoicePrompt.tsx`
- `components/square/VelmereSquareClient.tsx`
- `components/ui/GlobalTerminalTicker.tsx`
- `app/[locale]/layout.tsx`
- `components/i18n/HtmlLangSync.tsx`
- `components/CartDrawer.tsx`
- `components/shop/ShopPageClient.tsx`
