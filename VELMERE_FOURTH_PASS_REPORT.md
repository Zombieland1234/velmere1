# Velmère fourth pass

## What changed

- Removed the vertical Basic/Pro side pill. Basic/Pro is now a compact header-style controller near the top of the VLM page.
- VLM Basic and Pro are now meaningfully different:
  - Basic: simplified public mode. It keeps the hero, short access explanation, wallet preview, utility, simplified Bajak Protocol and risk/legal note.
  - Pro: full protocol mode. It includes how-to-buy-after-launch, launch scenario, contract plan, security stack, full Bajak Protocol lab and risk/legal note.
- Added `BajakProtocolMini.tsx` so Basic no longer shows the same heavy Bajak Protocol visual as Pro.
- Kept Pro as the full animated/orbital/technical mode.
- Reworked Velmère Square into a more social feed style inspired by FB/Reddit patterns, but kept the Velmère dark-luxury design:
  - feed-first center column,
  - left navigation/filter rail,
  - right guest/moderation rail,
  - compact composer trigger,
  - post cards with avatar, tags, actions and images,
  - side panel composer and post detail.

## Commands run

- `npm run typecheck` — passed
- `npm run check:i18n` — passed
- `npm run lint` — passed
- `npm run build` — compiled successfully, then the sandbox hit a Node 22 / worker EPIPE timeout during page optimization. The project still declares Node 20 in package.json for Vercel.

## Important notes

- Run on Node 20 locally/Vercel.
- Do not upload `node_modules`, `.next`, `.env`, `.env.local`.
- VLM is still pre-launch: no deployed contract, no public sale, no audit claim.
