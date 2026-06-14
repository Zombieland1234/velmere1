# PASS660 — build notes

## Środowisko produkcyjne

- Node.js 20.x
- czyste `npm ci`
- brak `node_modules` w paczce ZIP

## Zalecana walidacja

```bash
nvm use 20
npm ci
npm run check:i18n
npm run verify:pass647-653-visual-ui-release
npm run verify:pass654-660-visual-ui-polish
npm run verify:pass642-646-unified-evidence-release
npm run verify:pass627-631-premium-interaction-release
npm run verify:pass612-616-shield-terminal-release
npm run verify:pass573-579-reader-map-search-slo-release
npm run typecheck
npm run build
```

## Walidacja wykonana w sandboxie

- i18n PL/DE/EN: PASS
- PASS654–660: PASS
- PASS647–653: PASS
- PASS642–646: PASS
- PASS627–631: PASS
- PASS612–616: PASS
- PASS573–579: PASS
- Vercel preflight: PASS — 922 pliki

Pełny dependency-backed typecheck i `next build` pozostają do wykonania pod Node.js 20.x.
