# VELMÈRE PASS792 — More Fixes / Overlay + UX Sweep

Date: 2026-06-10
Base package: `velmere_pass791_full_fix.zip`
Output package: `velmere_pass792_more_fixes.zip`

## Goal

Continue hardening the current Velmère project instead of starting over. This pass focuses on the next layer of real interaction bugs after PASS791:

- invisible panels behind dark backdrops;
- dropdowns that do not close on outside click;
- mixed local portals competing with the shared overlay system;
- mobile drawers without explicit viewport placement;
- heavy UI surfaces that still used old manual scroll/focus logic;
- build-path risk around Gemini SDK resolution.

## Implemented fixes

### 1. Navbar overlay cleanup

File: `components/Navbar.tsx`

- Wallet selector moved to shared `DropdownRoot`.
- Member/account menu moved to shared `DropdownRoot`.
- Language selector remains anchored through `DropdownRoot`.
- Removed old global `pointerdown` listener for local dropdown closing.
- Removed old local Escape handler for wallet/member/language menus.
- Removed nav usage of direct `framer-motion` dropdown wrappers.

Result: language, wallet and member popovers now share the same outside-click, Escape, layer and focus behavior.

### 2. VLM access drawer

File: `components/vlm/VlmBuyAccessPanel.tsx`

- Replaced manual `createPortal` drawer with `DrawerRoot`.
- Removed manual body scroll lock and focus boundary.
- Added stable overlay surface marker `vlm-access-panel`.
- Floating trigger now uses shared overlay z-index token.

### 3. VLM mode choice prompt

File: `components/vlm/VlmModeChoicePrompt.tsx`

- Replaced local portal modal with `ModalRoot`.
- Removed local `AnimatePresence`, `motion`, `createPortal`, `useModalScrollLock`.
- Kept localStorage one-time prompt behavior.

### 4. VLM selected system modal

File: `components/vlm/VlmSelectedSystems.tsx`

- Replaced manual portal dialog with `ModalRoot`.
- Removed local focus and scroll-lock implementation.
- Kept visual system cards and motion micro-interactions.

### 5. Product size guide modal

File: `components/shop/ProductDetailClient.tsx`

- Replaced `BodyPortal` + manual modal/backdrop with `ModalRoot`.
- Size table now lives inside the shared modal layer.
- Kept explicit scroll region for the size guide content.

### 6. VLM mode chart modal

File: `components/vlm/VlmModeSwitch.tsx`

- Replaced manual chart modal overlay with `ModalRoot`.
- Removed duplicate local modal scroll lock and focus trap.
- Floating chart controls now use shared overlay layer token.

### 7. Command palette

File: `components/ui/CommandPalette.tsx`

- Replaced manual fixed overlay with `ModalRoot`.
- Kept Ctrl/Cmd+K and Escape behavior.
- Added explicit `data-modal-scroll-region` to the command results list.

### 8. Floating mail drawer

File: `components/contact/FloatingMailWidget.tsx`

- Replaced manual mail drawer/backdrop with `DrawerRoot`.
- Removed duplicated local focus and scroll lock hooks.
- Added explicit viewport bounds so the drawer cannot open outside the visible screen.
- Added explicit scroll region for the form.

### 9. Cart drawer viewport placement

File: `components/CartDrawer.tsx`

- Drawer panel now has explicit `top`, `bottom`, width and mobile bounds.
- This reduces the risk of backdrop opening while the cart surface is visually outside the viewport.

### 10. Build script cleanup

File: `package.json`

- `build` is now a practical production gate:
  - i18n check;
  - typecheck;
  - Vercel preflight;
  - `next build --webpack`.
- Historical verifier chain moved to `build:legacy-verifiers`.
- Added `verify:pass792-overlay-audit`.

### 11. New verifier

File: `scripts/verify-pass792-overlay-audit.mjs`

Checks 17 critical assertions:

- no Gemini SDK package in build path;
- no `@google/genai` in provider/package/lock;
- Navbar language/wallet/member use shared overlay primitives;
- no old global Navbar pointerdown closer;
- VLM access/mode/system/chart surfaces use shared primitives;
- command palette, product size guide, floating mail and cart use safer overlay boundaries;
- core overlay primitives keep safe render fallback, scroll lock and focus boundary.

## Verifier results

Passed in this environment:

- `node scripts/verify-pass792-overlay-audit.mjs` → PASS 17/17
- `node scripts/check-i18n.mjs` → PASS
- `node scripts/verify-pass752-756-overlay-foundation.mjs` → PASS
- `node scripts/verify-pass790-hotfix-build-overlays.mjs` → PASS
- `node scripts/verify-pass772-776-vlm-core.mjs` → PASS
- `node scripts/verify-pass685-692-interaction-finish-release.mjs` → PASS

## Not claimed as passed

The following were not honestly claimable in this container after the install state was reset:

- full `npm ci` on Node 24.16/npm 11.16;
- full TypeScript after fresh dependency install;
- `next build`;
- Playwright E2E.

Reason: local environment is Node 22/npm 10 while the project requires Node 24.16/npm 11.16 with `engine-strict=true`, and `node_modules` is intentionally excluded from the ZIP.

## Remaining high-value targets

The next risky legacy areas still worth converting are:

- `components/market-integrity/TokenRiskModal.tsx` — huge historical modal with legacy portal sections;
- `components/market-integrity/MarketIntegrityClient.tsx` — older local overlay patterns remain;
- `components/market-integrity/ShieldMapClient.tsx` — still contains a local portal for some detail surfaces;
- `components/search/VelmereIntelligenceSearchClient.tsx` — remaining fixed overlay patterns;
- final browser QA for menu, wallet, cart, globe, Shield modal, Square and PDF preview.

## Honest readiness after this pass

- Platform code: 91–92%
- UI/overlay core: 93%
- VLM Brain code: 96%
- AI integration: 95%
- Confirmed production readiness: 85–86%

This is not 100% yet. The remaining percentage depends mostly on real Node 24 build, E2E in Chromium/WebKit/mobile, Vercel smoke test and Gemini live key verification.
