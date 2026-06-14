# VELMÈRE PASS791 — Full Fix Sweep

Date: 2026-06-10

## Scope

This package continues from PASS790 hotfix and focuses on production blockers reported by the user:

- Turbopack build failure caused by `@google/genai` resolution.
- Header/menu backdrop opening without visible panel.
- Globe/language selector appearing on top of the icon and not closing on outside click.
- Wallet/cart/dropdown/drawer overlays using inconsistent portal and stacking behavior.
- Popup systems that could leave a dark backdrop without visible content.

## Implemented changes

### Build / Gemini

- Removed all runtime/build-time references to `@google/genai` from application code.
- Removed static and dynamic SDK resolution from `lib/ai/vlm-provider-registry.ts`.
- Replaced SDK dependency path with dependency-free server-side Gemini REST transport.
- Kept deterministic fallback when `GEMINI_API_KEY` is absent.
- Kept VLM contract, circuit breaker, cache, bounded retry and claim firewall flow.

### Overlay foundation

- Added `DropdownRoot` to `components/ui/OverlayPrimitives.tsx`.
- `DropdownRoot` renders under `document.body`, anchors to a trigger, closes on outside click and Escape, and uses the central layer token system.
- Navbar language/globe selector now uses `DropdownRoot`, appears under the icon, and is keyboard/screen-reader aware.
- Main menu uses shared `DrawerRoot` and keeps legacy safe drawer markers.
- Cart drawer moved from Vaul to shared `DrawerRoot`.
- Other wallet list moved from custom nested portal to shared `DrawerRoot`.
- Wallet status chip uses anchored `DropdownRoot`.
- Angel panel moved to shared `DrawerRoot`.
- Luxury action modal moved to shared `ModalRoot`.
- Size guide teaser moved to shared `ModalRoot`.
- Side action panel moved to shared `DrawerRoot`.

### Copy / i18n polish

- Fixed Polish wallet copy that previously mixed German text: `Połączenie mobilne lub QR`.
- Preserved PL/EN/DE i18n check.

## Files changed in this sweep

- `lib/ai/vlm-provider-registry.ts`
- `components/ui/OverlayPrimitives.tsx`
- `components/Navbar.tsx`
- `components/CartDrawer.tsx`
- `components/wallet/WalletStatusChip.tsx`
- `components/wallet/WalletConnectOptions.tsx`
- `components/angel/AngelPanel.tsx`
- `components/ui/LuxuryActionModal.tsx`
- `components/ui/SideActionPanel.tsx`
- `components/SizeGuideTeaser.tsx`
- `scripts/verify-pass752-756-overlay-foundation.mjs`
- `scripts/verify-pass685-692-interaction-finish-release.mjs`
- `scripts/verify-pass772-776-vlm-core.mjs`
- `scripts/verify-pass790-hotfix-build-overlays.mjs`

## Verification run in this environment

Passed:

- `node scripts/verify-pass752-756-overlay-foundation.mjs`
- `node scripts/verify-pass685-692-interaction-finish-release.mjs`
- `node scripts/verify-pass790-hotfix-build-overlays.mjs`
- `node scripts/verify-pass772-776-vlm-core.mjs`
- `node scripts/check-i18n.mjs`
- TypeScript transpile smoke test for changed TS/TSX files using TypeScript 5.9.3.
- `node --check` for changed `.mjs` scripts.
- Static scan: no `@google/genai`, `GoogleGenAI`, `FunctionCallingConfigMode`, or `FunctionCall` remains in `app`, `components`, `lib`, `package.json`, or `package-lock.json`.

Not completed here:

- Full `npm ci` on the exact project engine, because the current container runtime is Node 22/npm 10 while the project requires Node 24.16/npm 11.16.
- Full `next build`.
- Playwright E2E in a real browser.
- Live Gemini test with a real `GEMINI_API_KEY`.
- Vercel deployment smoke test.

## Remaining known work toward true 100%

The biggest remaining risk is not the specific `@google/genai` build error anymore. The bigger remaining work is full runtime QA:

- Run `npm ci` with Node 24.16/npm 11.16.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Run E2E: menu, mobile menu, language selector, wallet, cart, Square composer, Shield modal, PDF preview, chart wheel ownership.
- Test deployed Vercel environment with real env vars.
- Continue migrating very large historical surfaces that still have local portal patterns, especially market terminal legacy sections and product/search heavy panels.

## Estimated readiness after this package

- Whole platform code: 90–91%.
- Core overlay/menu/cart/wallet stability: 91%.
- UI/UX overall: 89%.
- VLM Brain code: 96%.
- AI integration: 95%.
- Verified production readiness: 84–85% until full Node 24 build/E2E/live tests pass.
