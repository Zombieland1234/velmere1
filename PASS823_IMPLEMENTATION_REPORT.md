# Velmère PASS814–PASS823 Runtime Cleanup Report

Base ZIP received as `velmere_pass813_runtime_truth_hotfix(1).zip`, unpacked root: `velmere_pass791_work`. Pass number in ZIP/root is not trusted as release proof.

## Implemented code changes

### PASS814 — Runtime/build audit
- Audited `package.json`, `.npmrc`, Next/React/runtime scripts and the key UI surfaces.
- Confirmed project enforces Node `>=24.16.0 <25` and npm `>=11.16.0 <12` with `engine-strict=true`.
- Local sandbox is Node `v22.16.0` / npm `10.9.2`, so `npm ci` is blocked by engine before dependencies install.

### PASS815 — Header language/connect/account
- Rebuilt desktop language selector into anchored `DropdownRoot` positioned from the globe/language trigger.
- Removed the old inline language panel that could render inside/under the header.
- Rebuilt wallet trigger into anchored `DropdownRoot` positioned from CONNECT.
- Restored account/profile dropdown for both logged-out and logged-in states.
- Removed the duplicate hidden `2xl` member preview block that made profile behavior inconsistent.
- Escape/outside close now relies on the shared overlay primitive instead of local stale refs.

### PASS816 — Wallet flow/icons
- Added inline SVG wallet marks for MetaMask, WalletConnect, Coinbase Wallet, Rabby, Trust Wallet, Phantom and Ledger/generic fallback.
- Replaced ugly letter badges with wallet marks.
- Changed Other wallets from inline list-extension into a nested overlay inside the wallet panel with its own close action.
- Removed the chaotic panel-growth behavior.

### PASS817 — Square toast/error
- Create Square Signal while logged out now shows exact top-center warning: `Log in to create a Square signal.`
- Added toast tone state (`info`, `warning`, `success`), manual close button, warning styling, and `aria-live` behavior.
- Kept composer closed when logged out.

### PASS818/PASS819 — Shield modal cleanup
- Removed always-mounted `VlmBrainWorkspace` from `TokenRiskModal`, preventing hidden analysis panels and extra heavy work before the user clicks Basic/Pro/Advanced.
- Added 15m timeframe to Shield modal tabs: `15m / 1h / 4h / 1d / 1w` (internally 7d is displayed as 1W).
- CSS now suppresses the extra intro grid/action panels so the visible modal is chart-first with timeframe + three analysis buttons.

### PASS820 — Real Markets modal parity foundation
- Added 15m support to Real Markets range typing, UI tabs, and API route config.
- Real Markets still needs full extraction to a shared `AssetAnalysisModal` for true 1:1 component parity; this pass lays the timeframe/API foundation but does not honestly complete the shared-component refactor.

### PASS821 — VLM Brain motion
- Slowed the WebGL brain rotation curve to a calmer 60–90s cycle target.
- Added CSS override preserving the core translate transform while rotating continuously.
- Added reduced-motion guard for the new slow-turn override.

### PASS822/PASS823 — Premium cleanup layer
- Added CSS for anchored overlay z-index consistency, nested wallet animation, Square warning toast, and Shield chart-first hierarchy.
- Did not rebuild Browser/Lens or Shield Map in this pass beyond audit; these are still next priorities.

## Changed files
- `components/Navbar.tsx`
- `components/wallet/WalletConnectOptions.tsx`
- `components/square/VelmereSquareClient.tsx`
- `components/market-integrity/TokenRiskModal.tsx`
- `components/market-integrity/CrossAssetCollapseRadarPanel.tsx`
- `components/market-integrity/VlmBrainWebGLPrototype.tsx`
- `app/api/market-integrity/real-markets/route.ts`
- `app/globals.css`
- `PASS823_IMPLEMENTATION_REPORT.md`

## Test results

### Passed
- `npm run check:i18n` → passed: `i18n ok across 3 locale files`.
- Static grep checks confirmed key changes are present:
  - anchored language/wallet/member surfaces;
  - wallet SVG marks;
  - nested Other wallets overlay;
  - exact Square login toast;
  - no `VlmBrainWorkspace` import/reference in `TokenRiskModal`;
  - Shield + Real Markets 15m support;
  - slower VLM WebGL brain speed.

### Blocked / not confirmed
- `npm ci --ignore-scripts --dry-run` fails with `EBADENGINE` because local sandbox is Node 22/npm 10 and repo requires Node 24/npm 11 with `engine-strict=true`.
- `npm run typecheck` fails because dependencies were not installed (`next`, `react`, `lucide-react`, `zustand`, Playwright types etc. missing). This is an environment/dependency install blocker, not proof of new source-code errors.
- `npm run lint` fails because `eslint` is not installed.
- `npm run build` runs `check:i18n` successfully, then fails at `typecheck` for the same missing dependency reason.
- No Playwright/runtime browser click QA was honestly completed in this sandbox because the app could not be installed/run locally under the required Node/npm engine.

## Current estimated readiness after this pass
- Whole platform: ~71%
- UI/UX: ~81%
- VLM Brain: ~62%
- Shield: ~73%
- Real Markets: ~66%
- Browser/Lens: ~72%
- Shield Map: ~58%
- Square: ~76%
- Header/Wallet/Cart: ~76%
- Build/deployment readiness: unconfirmed until Node 24/npm 11 install + full build + runtime smoke test pass

## Next pass priorities
1. Run on Node 24/npm 11 and finish `npm ci`, `typecheck`, `lint`, `build`.
2. Real runtime click QA for language, wallet, other wallets, account, cart, Square, Shield modal, Real Markets modal.
3. Extract true shared `AssetAnalysisModal` used by Shield and Real Markets.
4. Rebuild Shield Map as evidence graph: Sources → Facts → Signals → Conflicts → Missing Data → Confidence → VLM Verdict.
5. Browser/Lens premium reduction and PDF preview/download parity test.
