# PASS586 build notes

## Recommended clean production validation

Use Node.js 20.x in a clean checkout:

```bash
npm ci
npm run verify:pass573-579-reader-map-search-slo-release
npm run verify:pass580-586-pdf-chart-interaction-release
npm run typecheck:pass586
npm run build
```

For the future PASS592 visual runner, execute the 27 fixtures in a pinned Chromium version after installing the project's browser-test dependencies.

## Completed in the packaging environment

- `node scripts/verify-pass580-586-pdf-chart-interaction-release.mjs`
- `node scripts/verify-pass573-579-reader-map-search-slo-release.mjs`
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`
- TypeScript parser sweep over 869 TS/TSX files
- Pure TypeScript semantic check for PASS580–586 helper modules
- Runtime checks for fixture matrix, compositor, citation IDs, deterministic parity, accessibility boundary, shared inspector and gesture axis lock
- ZIP integrity and SHA-256 verification

## Attempted but not claimed

`npm run typecheck:pass586` was attempted. It cannot resolve the dependency-backed application types because the packaging directory has no `node_modules`; errors begin with missing `next/server`, React, Lucide, Zod and Node declarations. This is an environment/dependency boundary, not a declared successful typecheck.

A full `next build` was not run. The package environment uses Node.js 22.16.0 while `package.json` requires Node.js 20.x.
