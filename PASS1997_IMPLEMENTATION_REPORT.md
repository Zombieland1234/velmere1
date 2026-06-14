# PASS1997 — syntax-safe visual logic lock

## Scope
- Fix fatal TSX structure in `UnifiedAssetAnalysisControls.tsx` caused by an extra closing brace before `UnifiedTimeframeTabs`.
- Continue visual QA on the unified asset modal: fixed viewport shell, five separate dark windows, less frame nesting, calmer typography.
- Reduce overlay/menu/cart perceived lag by shortening dropdown/modal/drawer motion and removing blur-heavy surfaces.
- Extend Real Markets logo fallback coverage for blue-chip stocks, ETFs and exchanges.

## Changed files
- `components/market-integrity/UnifiedAssetAnalysisControls.tsx`
- `components/ui/OverlayPrimitives.tsx`
- `app/globals.css`
- `lib/market-integrity/asset-logo-resolver.ts`
- `public/market-logos/*.svg` additional local fallback logos
- `scripts/verify-pass1997-syntax-visual-logic-lock.mjs`
- `package.json`

## Validation
- `npm run verify:pass1997-syntax-visual-logic-lock` — OK 11/11
- `npm run verify:pass1996-aesthetic-logic-sweep` — OK 10/10
- `npm run verify:pass1995-visual-logic-lock` — OK 14/14
- `npm run verify:pass1994-final-visual-logic-sweep` — OK
- `npm run verify:pass1993-visual-qa-polish` — OK
- `npm run verify:pass1934-1973-runtime-click-proof` — OK 20/20
- `npm run check:i18n` — OK
- `npm run vercel:preflight` — OK

## Notes
A full Next build still requires `node_modules` in the target workspace. A targeted TypeScript parse command was also run for the edited TSX/TS files; it reported only missing dependency/type errors expected in the ZIP workspace, not syntax errors in the edited files.
