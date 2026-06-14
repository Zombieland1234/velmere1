# Velmère Ninth Pass Report

Focus: clean production polish after screenshots and owner feedback.

## Changed

- Velmère Square rebuilt into a quieter black/white/gold feed:
  - smaller cards and typography,
  - clearer three-column layout,
  - left map/tools rail locked until MetaMask connection,
  - wallet connect button and ETH balance preview,
  - less visual clutter and less empty black space,
  - post composer/detail remain side panels and do not block whole UI.

- Wallet preview upgraded:
  - MetaMask connection still uses `eth_requestAccounts`,
  - reads native ETH balance with `eth_getBalance`,
  - listens for `accountsChanged` and `chainChanged`,
  - updates header wallet snapshot.

- Neural brain visual improved:
  - drag no longer feels dead after release,
  - added gentle inertia after pointer release,
  - auto motion continues after manual rotation.

- VLM Basic/Pro copy and layout refined:
  - less childish/placeholder wording,
  - Pro no longer exposes cheap LP numbers,
  - Pro control labels changed from LP/tax to access/network signal language,
  - Basic remains clean and Pro remains technical.

- Product size guide:
  - smaller panel,
  - lighter background blur,
  - simplified measurements so the table fits immediately.

- Lookbook:
  - less oversized grid,
  - smaller cards,
  - cleaner luxury editorial rhythm.

- Shop copy:
  - reduced service text to a cleaner service layer headline.

- i18n:
  - PL/EN/DE updated for Square, VLM, Shop and launch/registry language.

## Commands run

- `npm install --no-audit --no-fund` — completed.
- `npm run typecheck -- --pretty false` — passed.
- `npm run check:i18n` — passed.
- `npm run lint` — passed.
- `npm run build` — compiled successfully, then the sandbox killed Next.js during `Collecting page data` with SIGTERM. This is the same sandbox/runtime limitation as previous passes; test on local/Vercel with Node 20.

## Important

Do not paste API keys publicly or commit `.env` / `.env.local`. Use Vercel Environment Variables for Gemini, Stripe, Printful, Tapstitch or wallet/contract settings.
