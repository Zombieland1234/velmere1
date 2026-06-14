# PASS591 build and validation notes

## Environment observed

- Sandbox Node.js: 22.16.0
- Project production contract: Node.js 20.x
- `node_modules`: not included in the supplied release archive
- TypeScript CLI available globally: 5.8.3

## Successfully executed

```text
PASS587–591 dedicated verifier: PASS
PASS580–586 regression verifier: PASS
PASS573–579 regression verifier: PASS
i18n PL/DE/EN: PASS
Vercel preflight: PASS
TypeScript syntax parser: 874 TS/TSX files, 0 errors
Strict semantic TypeScript check: five new pure PASS587–591 modules, PASS
```

## Not declared as executed

- `npm ci`
- dependency-backed `npm run typecheck:pass591`
- full `next build`
- Chromium screenshot fixtures

The older PASS559–565 script could not resolve its local `typescript` package because dependencies are absent. This is an environment limitation, not reported as a passing test.

## Required production run

```bash
nvm install 20
nvm use 20
npm ci
npm run verify:pass587-591-chart-identity-continuity-release
npm run typecheck:pass591
npm run build
```
