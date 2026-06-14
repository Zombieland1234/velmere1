# PASS692 — build notes

## Wymagane środowisko

- Node.js 20.x
- czyste `npm ci`

## Zalecana kolejność

```bash
nvm use 20
npm ci
npm run verify:pass685-692-interaction-finish-release
npm run check:i18n
npm run typecheck
npm run lint
npm run vercel:preflight
npm run build
```

## Sprawdzone w paczce

- wszystkie wizualne bramki PASS647–692;
- i18n PL/DE/EN;
- parser 921 plików TS/TSX;
- struktura CSS;
- parsowanie JSON;
- Vercel preflight — 922 pliki.

## Niewykonane

Pełny dependency-backed build i typecheck nie zostały zadeklarowane, ponieważ paczka nie zawiera `node_modules`. Nie zastępuj tej kontroli samym preflightem przed wdrożeniem produkcyjnym.
