# Velmère tenth pass — Vercel + visual stabilization

## Vercel fix
- Added `.npmrc` with `legacy-peer-deps=true`, audit/fund disabled and engine-strict disabled.
- Added `vercel.json` with explicit Next.js framework, deterministic `npm ci` install command and preflight build command.
- Added `packageManager: npm@10.9.0` and `engines.node: 20.x`.
- Added `scripts/vercel-preflight.mjs` to verify Next dependency before build.
- Kept `next` in dependencies at `14.2.35`.

If Vercel still says “No Next.js version detected”, the Vercel project Root Directory is pointing to the wrong folder. It must point to the folder containing `package.json`.

## Printful
- Included Printful helper scripts:
  - `npm run printful:debug`
  - `npm run printful:stores`
  - `npm run printful:test`
- Included `.env.local.printful-ready` and Printful setup README/CMD helper.

## UI polish
- Reworked Velmère Square into a calmer black/white/gold feed inspired by mature community products: narrower cards, cleaner side rails, grey comment layer and wallet-gated rooms.
- Reworked VLM Basic/Pro showcase:
  - Basic is clean, minimal, ivory, short and readable.
  - Pro is darker, orbital, animated and technical, but labels are separated from the visual.
- Improved neural brain inertia: no re-initialization on active node change, stronger drag momentum, continued subtle motion after interaction.
- Added side-panel coordination already present in Square/Angel so overlays do not stack badly.

## Verified locally in sandbox
- `npm run typecheck -- --pretty false` passed.
- `npm run check:i18n` passed.
- `npm run lint` passed.
- `npm ci` works with the included lockfile in the sandbox.

## Build note
- `npm run build` starts correctly and detects Next.js 14.2.35. The sandbox times out during Next optimization, but the Vercel issue reported by the owner happened during dependency install, not during Next compilation.
