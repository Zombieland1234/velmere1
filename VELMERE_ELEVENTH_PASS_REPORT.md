# Velmère eleventh pass — layout + Vercel readiness

## Main fixes

- Expanded VLM hero and Basic/Pro sections to use a wider 96–98rem luxury canvas instead of looking compressed between left/right gutters.
- Reworked VLM Basic/Pro cards so the rows align better, text values wrap safely, and Pro cards have stable min heights.
- Enlarged the Pro visual canvas and made its info panel more opaque so labels/readouts do not look washed out over the orbit.
- Made Velmère Square wider and calmer: 17.5rem side rails, larger center feed, solid black surfaces, less transparent glass.
- Rebuilt Square post detail and composer panels with solid dark backgrounds instead of transparent overlays; selected post now shows the post image in the side panel.
- Reduced Square feed title sizes and image height so the feed feels less overwhelming and more like a controlled social surface.
- Preserved wallet gating, local composer, comments, share, likes, views and MetaMask integration.

## Vercel

The repo includes:

- `.npmrc` with legacy peer deps, no audit/fund.
- `vercel.json` with explicit install/build commands.
- `packageManager: npm@10.9.0`.
- `next` pinned in dependencies.
- Node engine pinned to `20.x`.

Make sure Vercel Root Directory is empty if `package.json` is in the repo root.

## Checks run in sandbox

- `npm ci --legacy-peer-deps --no-audit --no-fund` completed.
- `npm run typecheck -- --pretty false` passed.
- `npm run check:i18n` passed.
- `npm run lint` passed.
- `npm run build` compiled successfully and reached `Collecting page data`, then the sandbox killed it by timeout. Test final deploy on Vercel Node 20.

## Do not commit

Do not commit `.env.local`, Printful tokens, Gemini keys, Stripe keys, `.next`, `.vercel`, or `node_modules`.
