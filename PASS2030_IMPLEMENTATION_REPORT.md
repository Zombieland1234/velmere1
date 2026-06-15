# PASS2030 — Vercel engine hotfix

## Problem

Vercel build stopped before compilation during `npm ci`:

- Required by project: Node `>=24.16.0 <25`, npm `>=11.13.0 <12`
- Actual on Vercel: Node `24.15.0`, npm `11.12.1`

This caused `EBADENGINE` before Next.js, TypeScript or UI code could run.

## Real changes

- Relaxed `package.json` engines to match Vercel's current Node/npm:
  - Node `>=24.15.0 <25`
  - npm `>=11.12.0 <12`
- Updated `package-lock.json` root package engines to the same range.
- Aligned `.nvmrc` and `.node-version` to `24.15.0`.
- Set `packageManager` and `volta` to npm `11.12.1` / Node `24.15.0`.
- Hardened `vercel.json` install command with `npm_config_engine_strict=false`.
- Kept `.npmrc` with `engine-strict=false`.
- Updated the PASS2029 verifier so it accepts the Vercel npm `11.12.x` line.
- Added `scripts/verify-pass2030-vercel-engine-hotfix.mjs`.

## Verification run

Passed:

- `npm run vercel:preflight`
- `npm run check:i18n`
- `node scripts/verify-pass2029-vercel-ui-sweep.mjs`
- `node scripts/verify-pass2030-vercel-engine-hotfix.mjs`

## Remaining note

This fixes the shown `EBADENGINE` install blocker. The next Vercel deploy may reveal the next build/type/runtime issue after installation proceeds.
