# PASS601 — build i walidacja

## Wykonane

```bash
node scripts/verify-pass573-579-reader-map-search-slo-release.mjs
node scripts/verify-pass580-586-pdf-chart-interaction-release.mjs
node scripts/verify-pass587-591-chart-identity-continuity-release.mjs
node scripts/verify-pass592-596-pdf-chromium-proof-release.mjs
node scripts/verify-pass597-601-shield-map-replay-virtualization-release.mjs
node scripts/check-i18n.mjs
node scripts/vercel-preflight.mjs
```

Wynik: wszystkie gate'y PASS, i18n PASS, preflight PASS — 877 plików.

Parser TypeScript przeskanował 884 pliki TS/TSX: 0 błędów składni.

Strict TypeScript nowych modułów:

```bash
tsc --noEmit --strict --target ES2022 --module CommonJS --moduleResolution Node --skipLibCheck \
  lib/market-integrity/pass597-shield-map-multi-snapshot-replay.ts \
  lib/market-integrity/pass598-visible-node-virtualization.ts \
  lib/market-integrity/pass599-evidence-path-isolation.ts \
  lib/market-integrity/pass600-keyboard-spatial-navigation.ts \
  lib/market-integrity/pass601-evidence-only-motion.ts
```

Wynik: PASS.

## Niewykonane jako pełny dowód produkcyjny

`tsc -p tsconfig.pass601.json --noEmit` nie może zakończyć się w tym sandboxie, ponieważ paczka nie zawiera `node_modules` ani deklaracji typów React, Next.js, next-intl i lucide-react. Powstałe komunikaty JSX/implicit-any są kaskadą braku tych typów.

Pełny `next build` również nie jest deklarowany jako wykonany. Sandbox: Node.js 22.16.0. Kontrakt projektu: Node.js 20.x.

## Produkcyjny przebieg

```bash
nvm use 20
npm ci
npm run typecheck:pass601
npm run build
```
