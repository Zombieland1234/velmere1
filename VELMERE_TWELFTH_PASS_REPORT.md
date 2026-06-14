# Velmère twelfth pass

## Vercel install fix
- Changed `vercel.json` install command from `npm ci` to `npm install --legacy-peer-deps --no-audit --no-fund --include=dev` because the Vercel log failed inside npm itself with `Exit handler never called` during `npm ci`.
- Kept `next` pinned in dependencies as `14.2.35`.
- Kept Node engine `20.x` and `.npmrc` hardening.
- Added/kept `scripts/vercel-preflight.mjs` so build fails clearly if Vercel root directory is wrong.

## UI polish
- VLM Basic/Pro and hero sections widened to use the full viewport instead of leaving heavy side gutters.
- VLM model cards use equal-height rows and smaller value text to avoid uneven cards and text collision.
- VLM Pro visual is wider, cleaner and less cramped.
- Velmère Square expanded to fuller width, with stronger black surfaces, gold borders and reduced transparency.
- Post detail panel has a solid black surface and stronger contrast.
- Feed images and headings are slightly more controlled to reduce visual overload.

## Verified locally
- `npm install --legacy-peer-deps --no-audit --no-fund --include=dev` passed.
- `npm run typecheck -- --pretty false` passed.
- `npm run check:i18n` passed.
- `npm run lint` passed.
- `npm run vercel:preflight` passed.
- `npm run build` compiled successfully and reached `Collecting page data`; the sandbox timed out at that phase.

## Deployment warning
If Vercel still says `No Next.js version detected`, check Project Settings → General → Root Directory. It must point to the exact folder containing `package.json`. If `package.json` is in repo root, Root Directory must be empty.
