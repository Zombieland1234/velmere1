# PASS579 build notes

## Recommended production validation

Use Node.js 20.x in a clean checkout:

```bash
npm ci
npm run verify:pass573-579-reader-map-search-slo-release
npm run typecheck:pass579
npm run build
```

## Completed in the packaging environment

- `node scripts/verify-pass573-579-reader-map-search-slo-release.mjs`
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`
- TypeScript parser sweep over all TS/TSX files
- Runtime tests for PASS573, PASS574, PASS575, PASS577 and PASS579 helpers

## Boundary

The packaging environment uses Node.js 22.16.0 and did not install the complete dependency tree. A full semantic typecheck and `next build` are intentionally not reported as successful.
