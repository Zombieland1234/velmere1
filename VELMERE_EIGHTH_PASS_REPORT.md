# Velmère eighth pass

Focus: final UI polish after screenshots, with fewer public warnings, stronger Square layout, wallet testing, VLM Pro cleanup, size guide fit, and lookbook/shop text cleanup.

## Changed
- `components/square/VelmereSquareClient.tsx`
  - tightened Square into a clearer 3-column community/feed layout with smaller, less overwhelming post typography and image heights
  - Square map rooms are now wallet-gated: if no wallet is connected, rooms show locked state
  - side panels use higher z-index and lighter backdrop blur so Angel/composer/detail panels do not stack badly
- `components/vlm/VlmAccessGatePage.tsx`
  - reduced crowded hero card values and replaced the heavy legal notice with compact access rails
  - removed public risk card from the VLM landing flow; legal/token agreement remains as a separate route
- `components/vlm/VlmBasicProShowcase.tsx`
  - removed duplicate/awkward Pro badge text at the bottom
  - removed visible LP amount from Pro controls
  - added a top-down signal chart drawer inside Pro mode
  - added new i18n strings for chart show/hide/label
- `components/vlm/VlmLaunchScenario.tsx`
  - removed the large warning box
  - launch price/liquidity copy now stays private/registry-based instead of showing the old 400 EUR scenario
- `components/vlm/VlmWalletPreviewPanel.tsx`
  - MetaMask preview now reads ETH balance using `eth_getBalance` and stores it in the header wallet snapshot
- `components/home/NeuralBrainVisual.tsx`
  - after dragging the visual, it keeps drifting/animating instead of freezing completely
- `components/angel/AngelPanel.tsx`
  - improved contrast on dark backgrounds and softened overlay/blur
- `app/[locale]/shop/[id]/page.tsx`
  - size guide panel is smaller, table fits without horizontal scroll, and backdrop blur is lighter
- `app/[locale]/lookbook/page.tsx`
  - removed the unnecessary intro sentence and reduced oversized image rhythm
- `app/[locale]/shop/page.tsx`
  - removed the public pre-launch intro paragraph and service POD note from the collection pages
- `components/product/ProductCard.tsx`
  - product sizes now appear on hover as a premium overlay on product cards
- `messages/pl.json`, `messages/en.json`, `messages/de.json`
  - updated VLM, launch scenario, Pro chart, Square and removed unwanted public copy by keeping keys empty where needed

## Checks
- `npm run typecheck` passed
- `npm run check:i18n` passed
- `npm run lint` passed
- `npm run build` compiled successfully, then this sandbox timed out at `Collecting page data` / SIGTERM. Test on local/Vercel Node 20.

## Important
Do not paste API keys publicly in chat or GitHub. Put Gemini, Printful, Tapstitch and Stripe keys only in `.env.local` locally and in Vercel Environment Variables.
