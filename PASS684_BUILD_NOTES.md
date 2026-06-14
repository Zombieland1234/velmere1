# PASS684 — build notes

## Wymagane środowisko

- Node.js 20.x
- czyste `npm ci`
- zmienne środowiskowe zgodne z `.env.example`

## Zalecana walidacja

```bash
nvm use 20
npm ci
npm run check:i18n
npm run verify:pass677-684-public-journey-release
npm run typecheck
npm run vercel:preflight
npm run build
```

## Wykonane w sandboxie

- parser 932 plików TS/TSX: PASS;
- struktura CSS: PASS;
- i18n: PASS;
- Vercel preflight: PASS — 922 pliki;
- kluczowe bramki PASS573–684: PASS;
- integralność ZIP: dołączona suma SHA-256.

## Niewykonane

Pełny dependency-backed `tsc --noEmit` oraz `next build` nie zostały wykonane. Sandbox działa na Node.js 22.16.0, a projekt deklaruje Node.js 20.x; finalny proof należy wygenerować w CI lub lokalnie pod Node.js 20.x.
