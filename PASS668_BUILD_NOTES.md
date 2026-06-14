# PASS668 — build i walidacja

## Wymagane środowisko

- Node.js 20.x
- npm 10.x
- czyste zależności z `npm ci`

## Zalecana kolejność

```bash
nvm use 20
npm ci
npm run check:i18n
npm run verify:pass661-668-visual-clarity-release
npm run verify:pass654-660-visual-ui-polish
npm run verify:pass647-653-visual-ui-release
npm run vercel:preflight
npm run typecheck
npm run build
```

## Co zostało sprawdzone w sandboxie

- i18n PL / DE / EN;
- Vercel preflight — 922 pliki;
- PASS661–668 oraz kluczowe wcześniejsze bramki;
- składnia 918 plików TS/TSX;
- struktura `app/globals.css`;
- brak numerowanych tytułów PASS w publicznych komponentach;
- integralność końcowego ZIP.

## Granica deklaracji

Sandbox działa na Node.js 22, a `package.json` wymaga Node.js 20.x. Z tego powodu pełny dependency-backed build należy wykonać po czystym `npm ci` w wymaganym środowisku produkcyjnym.
