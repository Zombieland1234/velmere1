# Velmère Pass 11 — deep build audit and Vercel hardening

## Current Vercel error fixed

Vercel stopped on `components/wallet/WalletConnectButton.tsx:53` because `WalletKind` includes `walletconnect`, but `WALLET_CONFIG` only had `metamask` and `phantom`.

Fix:
- `WALLET_CONFIG` is now typed as `Record<WalletKind, ...>`.
- `walletconnect` was added to the config.
- WalletConnect uses a text fallback (`WC`) instead of a missing SVG, so it will not request a non-existent `/wallets/walletconnect.svg` asset.

## Additional future-build traps checked/fixed

- Fixed another possible JSX lint trap in `components/ui/TokenGate.tsx`: raw `//` text is now wrapped as a JSX string expression.
- Strengthened `scripts/vercel-preflight.mjs` so it scans app/components/lib/store for known Vercel killers:
  - `repeat: Infinity` / WAAPI iteration problems,
  - `iterationCount`,
  - bad Tailwind opacity classes like `border-white/12`,
  - `return () => window.dispatchEvent(...)` cleanup functions that return boolean,
  - missing wallet config keys when `WalletKind` changes.
- Updated `package.json` build script to run `check:i18n` and `vercel:preflight` before `next build`.

## Verified locally in sandbox

- `node scripts/check-i18n.mjs` — PASS
- `node scripts/vercel-preflight.mjs` — PASS, scanned 215 files
- Static scan — no `repeat: Infinity`, `iterationCount`, or `border-white/12`

## Honest limitation

I still could not complete a full local `npm install && next build` in this sandbox because dependency installation timed out here. Vercel is installing dependencies successfully, so this pass fixes the exact latest Vercel type error and adds stronger pre-build guards to catch repeated classes of issues earlier.
