# PASS2035 — Vercel npm registry hygiene hotfix

## Problem
Vercel failed during `npm ci`, not during TypeScript or Next build:

`ETIMEDOUT request to https://packages.applied-caas-gateway1.internal.api.openai.org/.../ws-8.20.1.tgz`

This happened because `package-lock.json` contained an internal sandbox registry URL for the newly added `ws@8.20.1` tarball.

## Fix
- Replaced the internal `ws` tarball URL in `package-lock.json` with the public npm registry URL:
  `https://registry.npmjs.org/ws/-/ws-8.20.1.tgz`
- Kept `.npmrc` pinned to `registry=https://registry.npmjs.org/`.
- Added `scripts/verify-pass2035-lock-registry-hygiene.mjs`.
- Added npm script `verify:pass2035-lock-registry-hygiene`.

## Validation
Passed locally:

```txt
node scripts/verify-pass2035-lock-registry-hygiene.mjs
node scripts/check-i18n.mjs
node scripts/vercel-preflight.mjs
```

Full Vercel build still needs to be confirmed in Vercel because this pass fixes an install/network URL blocker.
