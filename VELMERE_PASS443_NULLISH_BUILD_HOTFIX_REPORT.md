# PASS443 — Nullish Build Hotfix

## Fixed
- Patched `lib/market-integrity/pass440-semantic-drift-source-lineage-runtime.ts` build blocker caused by mixing `??` with `||` without parentheses.
- The fallback source expression now uses a parenthesized fallback chain:
  `input.source ?? (providerNames(...) || dataSources[0] || "resolved payload")`.

## Why
Next/SWC rejects expressions that mix nullish coalescing and logical operators without explicit grouping.

## Validation
- `npm run verify:pass443-nullish-build-hotfix`
- `npm run verify:pass442-brain-regression-judge-runtime`
- `npm run verify:pass440-semantic-drift-source-lineage-runtime`
- `npm run check:i18n`
- `npm run vercel:preflight`
