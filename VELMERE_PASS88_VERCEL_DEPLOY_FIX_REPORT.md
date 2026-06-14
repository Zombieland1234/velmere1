# VELMERE PASS 88 — Vercel deploy fix + lint cleanup

## Base
Built on the actual latest working package: `velmere_pass87_advanced_vlm_readout_operational.zip`.

## Main fix
Vercel failed after successful compilation during lint/type validation because of `react/no-unescaped-entities` in:

- `components/market-integrity/ShieldMapClient.tsx`

Fixed the unescaped apostrophe in the Shield Map AI copilot copy:

- `hype'u` -> `hype&apos;u`

## Additional cleanup
Cleaned two build/lint warnings visible in the Vercel log:

- `components/CartProvider.tsx`
  - wrapped `safeItems` in `useMemo` so it no longer creates a fresh array dependency on each render before hydration.

- `components/market-integrity/TokenRiskModal.tsx`
  - cleaned the chart-loading effect dependency list so React Hooks lint no longer flags missing `row` / `result` dependencies.

## Verified locally
Passed:

```bash
node scripts/check-i18n.mjs
node scripts/vercel-preflight.mjs
node scripts/verify-market-integrity-no-truncation.mjs
node scripts/verify-shield-design-safety.mjs
```

## Notes
A full local `next build` was not completed in the sandbox because the extracted ZIP does not include installed dependencies and `npm install` exceeded the local execution window. The Vercel log showed the app already compiled successfully and failed specifically on the lint rule fixed here.

## Next pass recommendation
Continue with PASS 89/90 after deployment is green:

1. Shield Map full-width redesign.
2. VLM Basic / Advanced / Shield architecture cleanup.
3. Token analyzer neural readout final polish.
4. Mobile master pass.
