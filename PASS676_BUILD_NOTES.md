# PASS676 — build i walidacja

## Wymagane środowisko produkcyjne

- Node.js 20.x
- czyste `npm ci`
- zmienne środowiskowe zgodne z projektem

## Zalecana kolejność

```bash
nvm use 20
npm ci
npm run verify:pass669-676-whole-product-visual-release
npm run typecheck
npm run vercel:preflight
npm run build
```

## Wykonana walidacja

- i18n PL / DE / EN: PASS
- pełny łańcuch gate’ów PASS488–676: PASS
- PASS669–676 verifier: PASS
- parser TS/TSX: 922 pliki, 0 błędów składni
- struktura CSS: PASS
- Vercel preflight: PASS — 922 pliki
- integralność ZIP: sprawdzana po utworzeniu paczki

## Granica deklaracji

Dependency-backed `next build` i pełny typecheck należy wykonać po `npm ci` pod Node.js 20.x. Walidacja sandboxowa działała na Node.js 22.16.0 i nie jest deklarowana jako produkcyjny build.
