# Velmère Pass 03 — wallet drawer, persistent VLM mode, Square counters, chart preview

## What was changed

### 1. Wallet UI repaired again
- Rebuilt `components/wallet/WalletConnectOptions.tsx`.
- Primary wallet buttons now stack vertically instead of forcing two columns in narrow VLM panels.
- Removed the down-expanding “Other wallets” grid that was getting cut off by the viewport/taskbar.
- Added a professional overlay/side-panel for Other Wallets: WalletConnect, Browser Wallet, Coinbase, Rabby, Trust, Rainbow, Ledger.
- Kept read-only/custody-safe copy: no seed phrase, no private key, no hidden approval.

### 2. VLM Basic / Pro mode persistence
- `VlmModeSwitch` now uses `useModeStore()` and writes the selected mode to localStorage.
- `VlmAccessGatePage` reads `?mode=pro` only as an initial override, then the mode is stored.
- `VlmModeChoicePrompt` now appears once and sets `vlm-mode-choice-seen`, so it does not keep popping up after a user chooses.

### 3. Chart preview button
- Added a floating `Chart preview / Podgląd wykresu / Chart-Vorschau` button above Basic/Pro.
- It opens a polished transparent analytics placeholder for future VLM market data:
  - Market cap
  - Volume 24h
  - Holders
  - Liquidity
  - Contract status
- Copy explicitly says the chart stays pending until deployment, verification and review.

### 4. Square upgraded
- Added Square counters: posts today, hot signals, comments today.
- Added “Hot signals / Gorące sygnały” panel on the right side with popular posts.
- Comment composer inside the post modal is now sticky at the top of the comment column.

### 5. VLM Pro explanation improved
- Reworked “What the Pro system means” into localized content for EN/PL/DE.
- Added explanations for:
  - Möbius routing
  - AMU 3162.27
  - Bajak Protocol as research/lore/numerical-audit identity
  - Named action → signature
  - Signal engine as UI checks, not random dots

### 6. WAAPI runtime risk reduced on VLM selected systems
- Removed Framer repeating animations from `VlmSelectedSystems` AMU/Security visuals.
- Replaced them with CSS animations to avoid the `iterationCount must be non-negative` WAAPI crash when opening modules like Bitcoin Discipline.

## Checks run
- `npm run check:i18n` ✅
- `npm run vercel:preflight` ✅

## Important
Full `next build` was not run here because this sandbox does not have `node_modules` installed. The Vercel config remains set to:
- Install Command: `npm install`
- Build Command: `npm run build`
- Node: `20.x`
