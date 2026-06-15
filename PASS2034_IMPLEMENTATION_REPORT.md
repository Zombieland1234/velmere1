# PASS2034 — Vercel `ws` / viem / wagmi webpack hotfix

## Trigger

Vercel progressed past `npm ci`, `check:i18n`, `typecheck`, and `vercel:preflight`, then failed in `next build --webpack` with:

- `./node_modules/isows/_cjs/index.js Module not found: Can't resolve 'ws'`
- `./node_modules/isows/_esm/index.js Module not found: Can't resolve 'ws'`

Import traces pointed through `viem`, `wagmi`, Safe connector, `lib/web3/wagmi-config.ts`, `components/wallet/Web3Provider.tsx`, and `lib/wallet/useWalletConnect.ts`.

## Root cause

`isows` declares `ws` as a peer dependency. The lockfile had nested `ws` copies under other packages, but no top-level `node_modules/ws`, so webpack could not resolve `ws` from top-level `node_modules/isows`.

## Changes

- `package.json`
  - Added direct dependency: `ws: ^8.20.1`.
  - Added script: `verify:pass2034-ws-next-webpack-hotfix`.

- `package-lock.json`
  - Added top-level `node_modules/ws` entry.
  - Added root dependency reference for `ws`.

- `next.config.mjs`
  - Added client-side webpack fallback:
    - `ws: false`
  - This prevents Node WebSocket implementation from being pulled into browser bundles while keeping server-side resolution available through the direct dependency.

- `next-env.d.ts`
  - Removed direct import of `./.next/dev/types/routes.d.ts`.
  - Fresh Vercel builds should not depend on `.next/dev` files before build.

- `tsconfig.json`
  - Removed `.next/dev/types/**/*.ts` include.

- `scripts/verify-pass2034-ws-next-webpack-hotfix.mjs`
  - Verifies direct `ws` dependency.
  - Verifies top-level lockfile entry.
  - Verifies webpack browser fallback.
  - Verifies no `.next/dev` generated-type dependency remains.

## Verified in sandbox

Passed:

```bash
node scripts/verify-pass2034-ws-next-webpack-hotfix.mjs
node scripts/check-i18n.mjs
node scripts/vercel-preflight.mjs
```

Not fully confirmed locally:

```bash
npm run typecheck
npm run build
```

Reason: sandbox uses Node 22/npm 10 and `npm ci` did not complete within the local timeout. Vercel uses Node 24.15/npm 11.12 and already completed install/typecheck/preflight in the provided log.

## Expected Vercel result

The previous `Cannot resolve 'ws'` webpack blocker should be cleared. If another error appears, it should be a downstream Next production-build issue, not the prior TypeScript or engine blocker.
