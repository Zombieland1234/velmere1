# PASS653 — build i walidacja

## Wymagane środowisko produkcyjne

- Node.js 20.x
- czyste `npm ci`
- build Next.js po pełnej instalacji zależności

## Wykonane kontrole

- `npm run verify:pass647-653-visual-ui-release` — PASS
- `node scripts/vercel-preflight.mjs` — PASS, 922 pliki
- `node scripts/check-i18n.mjs` — PASS, PL / DE / EN
- `verify-pass642-646-unified-evidence-release.mjs` — PASS
- `verify-pass627-631-premium-interaction-release.mjs` — PASS
- `verify-pass612-616-shield-terminal-release.mjs` — PASS
- `verify-pass573-579-reader-map-search-slo-release.mjs` — PASS
- Prettier parser i format dla zmienionych TSX/CSS/JSON — PASS

## Niewykonana deklaracja

Pełny `npm ci` w sandboxie nie zakończył się przed limitem środowiska. Próba `typecheck:pass646` była przez to zablokowana przez niekompletny katalog zależności (`@types/*`), a nie przez wskazany błąd w zmienionych komponentach. Nie deklarujemy pełnego `next build` ani dependency-backed typechecku.

## Zalecana kontrola lokalna

```bash
nvm use 20
rm -rf node_modules .next
npm ci
npm run verify:pass647-653-visual-ui-release
npm run typecheck:pass646
npm run lint
npm run build
```
