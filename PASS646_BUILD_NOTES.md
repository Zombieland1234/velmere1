# PASS646 Build Notes

## Confirmed in this environment

- Runtime available: Node.js 22.16.0
- Project production contract: Node.js 20.x
- Strict TypeScript for PASS642–646 core contracts: PASS
- Runtime verifier using a real Lens report fixture: PASS
- i18n PL/EN/DE: PASS
- Vercel preflight: PASS, 922 files
- TS/TSX parse sweep: 932 files, 0 syntax errors
- Historical regression chain PASS607–641: PASS

## Not claimed

- Fresh `npm ci` completion for the modified tree
- Full semantic repository `tsc --noEmit`
- Fresh full Next.js production build for PASS646
- Executed Playwright/Chromium PASS643 and PASS645 suites
- External veraPDF or PAC validation of an exact exported PDF binary

The clean dependency installation was attempted but exceeded the sandbox memory budget. The release intentionally excludes `node_modules`, `.next`, `.git`, logs, caches and test artifacts.

## Required production gate

Run on Node.js 20.x:

```bash
npm ci
npm run check:i18n
npm run verify:pass642-646-unified-evidence-release
npm run typecheck
npm run lint
npm run build
npm run test:e2e:pass643
npm run test:e2e:pass645
```

For an exact generated PDF:

```bash
node scripts/run-pass642-pdfua-external-validation.mjs ./report.pdf
```

A machine pass must still be paired with the required human accessibility review before any PDF/UA claim is shown.
