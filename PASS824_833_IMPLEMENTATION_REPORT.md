# PASS824–PASS833 Runtime cleanup report

Scope: continue from PASS823 checkpoint without starting over. Focus: build/runtime truth gate, Real Markets modal parity with Shield, VLM Brain continuous motion, and verifier-backed changes.

## Implemented

- Added `scripts/check-runtime-env.mjs` and `npm run doctor:runtime-env` to make the Node 24 / npm 11 requirement explicit before install/build/runtime QA.
- Added `scripts/verify-pass824-833-runtime-cleanup.mjs` and `npm run verify:pass824-833-runtime-cleanup`.
- Rebuilt the Real Markets asset popup toward the shared Shield grammar:
  - asset identity,
  - price,
  - risk,
  - confidence,
  - large chart,
  - timeframe tabs: 15m / 1h / 4h / 1d / 1w,
  - Basic / Pro / Advanced VLM Brain entry points,
  - source / missing-data details collapsed.
- Added 15m support in the Real Markets API range configuration.
- Changed VLM Neural Audit motion from a one-shot rotation to a continuous calm 72s spin.
- Hard-set VLM analysis stage durations:
  - Basic: 2.6s,
  - Pro: 4.6s,
  - Advanced: 7.2s.
- Added Real Markets unified modal CSS polish and reduced-motion safeguards.

## Verified in this environment

- `npm run check:i18n` — PASS.
- `npm run verify:pass824-833-runtime-cleanup` — PASS.
- `node --check scripts/check-runtime-env.mjs` — PASS.
- `node --check scripts/verify-pass824-833-runtime-cleanup.mjs` — PASS.
- TypeScript transpile/syntax check for edited TSX files — PASS.
- `npm run doctor:runtime-env` — expected FAIL on this sandbox: Node v22.16.0 / npm 10.9.2, while project requires Node >=24.16.0 <25 and npm >=11.16.0 <12.

## Not proven here

- `npm ci` full install — blocked/hung under the wrong Node/npm engine.
- `npm run typecheck` — timed out; project is too large and dependencies are incomplete in this sandbox after the failed install.
- `npm run lint` — blocked because eslint binary is not installed after failed/partial install.
- `npm run build` — not accepted as proof without Node 24/npm 11 full install.
- Runtime manual click QA — not proven because the app could not be launched cleanly in this sandbox.

## Next

- Run Node 24.16+ and npm 11.16+ locally/Vercel.
- Execute `npm ci`, `npm run typecheck`, `npm run lint`, `npm run build`.
- Runtime click QA: header language, connect wallet, cart, account, Square, Shield modal, Real Markets modal, Browser, Shield Map node drawer.
- Continue with Shield Map as evidence graph and Browser/Lens visual reduction.
