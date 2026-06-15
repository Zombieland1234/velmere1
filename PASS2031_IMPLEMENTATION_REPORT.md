# PASS2031 — Vercel Typecheck Hotfix

## Build log diagnosis

The latest Vercel deploy passed the previous `EBADENGINE` blocker and reached `npm run build`.
The failing stage is now `tsc --noEmit`.

Main failing files from the Vercel log:

- `components/market-integrity/ShieldMapClient.tsx`
- `components/market-integrity/TokenRiskModal.tsx`
- `lib/market-integrity/data-backbone.ts`

## Fixes implemented

### ShieldMapClient.tsx

- Normalized `useLocale()` to the strict `Pass1354Locale` union before calling `buildPass1354ShieldMapEvidenceGraph2`.
- Hardened `handoffPacket` render access where TypeScript did not preserve JSX conditional narrowing.
- Hardened `handoffQuery` in `encodeURIComponent()` by falling back to an empty string.
- Hardened `investigatorSuggestFrame` portal positioning with non-null assertions inside guarded portal rendering.
- Hardened investigator result rendering where Vercel TypeScript reported possible null values.
- Hardened evidence report and source snapshot rendering inside already-guarded sections.

### TokenRiskModal.tsx

- Changed `modalShellRef` from `HTMLElement` to `HTMLDivElement` so the ref matches the `<div>` it is assigned to.

### data-backbone.ts

- Removed overly narrow explicit transform parameter types in `image` and `url` zod transforms.
- This lets the transforms accept the `string | undefined` shape inferred by zod.

## Verification

Passed locally in the available environment:

- `npm run verify:pass2031-vercel-type-hotfix`
- `npm run check:i18n`
- `npm run vercel:preflight`
- TypeScript transpile syntax check for the changed TS/TSX files

Full `npm run typecheck` could not be completed locally because the sandbox npm installation timed out and left `node_modules` incomplete. The Vercel log itself shows that Vercel can install dependencies and the remaining blocker was TypeScript, which this pass targets directly.

## Expected next deploy behavior

The deploy should move past the reported TypeScript errors in the three patched files. If Vercel exposes another error after that, it will be the next blocker rather than the same `ShieldMapClient / TokenRiskModal / data-backbone` group.
