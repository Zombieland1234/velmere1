# VELMÈRE FINAL MOBILE + WALLET POLISH REPORT

## Scope
This package is built as the corrected full project folder, not a tiny patch. It includes the mobile visual polish requests and the wallet connection repair for MetaMask and Phantom on desktop and mobile.

## Implemented

### Mobile header repair
- Audio toggle remains desktop-only and no longer competes with the VELMÈRE logo on mobile.
- VELMÈRE logo is centered on mobile independent of right-side account/cart buttons.
- Header keeps only the critical mobile actions: Menu, centered logo, Account, Cart.
- Desktop keeps the cleaner luxury layout: Menu, VELMÈRE, Men, Women, wallet, account, cart.

### Wallet mobile repair
- Added `lib/wallet/mobile-deeplinks.ts`.
- MetaMask mobile fallback opens the dapp inside the MetaMask app browser via `https://link.metamask.io/dapp/...` when no injected provider exists.
- Phantom mobile fallback opens the dapp through Phantom universal browse link via `https://phantom.app/ul/browse/...`.
- Phantom injected Solana provider is now supported when opened inside Phantom browser/extension.
- The wallet drawer and VLM wallet modal no longer disable Phantom/MetaMask buttons just because the injected provider is absent; on mobile this now triggers the deep link flow.
- Wallet menu includes connected address, network, balance/access label and disconnect.

### Mobile visual polish
- Bottom terminal marquee is desktop-only; it is hidden on phones.
- Angel remains as a floating bubble in the lower-right with a brighter ivory/gold mobile treatment.
- Hero copy and CTA are centered on mobile.
- VLM Basic/Pro visual system remains full-width and more cinematic.
- The neural access panel under the visual remains compact and does not stretch into a cheap full-width slab.

### Safety and build hygiene
- `tsconfig.tsbuildinfo` and local env artifacts are removed from the package.
- `vercel.json` forces `npm install` and `npm run build` to avoid pnpm/corepack install issues.
- `packageManager` is set to npm to match Vercel configuration.

## Checks run in sandbox
- `node scripts/check-i18n.mjs` -> passed.
- TypeScript parser pass over 202 TS/TSX files -> passed.

## Deploy notes
After copying this folder into your GitHub repo root, run:

```cmd
cd /d C:\Users\marci\velmere-store
npm install
npm run build
git add .
git commit -m "Apply final mobile wallet polish"
git push origin main
```

If mobile wallet still opens the app but does not connect instantly, open the site inside the wallet browser and tap connect again. This is expected behavior for injected wallet providers in normal mobile browsers.
