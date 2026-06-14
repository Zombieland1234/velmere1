# PASS631 — build notes

## Potwierdzone

- runtime środowiska: Node.js `v22.16.0`
- TypeScript CLI: `5.8.3`
- wymaganie projektu: Node.js `20.x`
- PASS592–631 gates: PASS
- strict TypeScript PASS627–631 pure contracts: PASS
- PL/DE/EN i18n: PASS
- Vercel preflight: PASS — 910 plików
- parser TS/TSX: 917 plików, 0 błędów składni
- CSS structural parser: 1 plik, 0 błędów
- aktywny z-index większy niż 500: 0
- touch scroll regression: PASS

## Niepotwierdzone

- `next build`
- pełny semantyczny `tsc --noEmit`
- `next lint`

## Dokładny powód

Paczka release celowo nie zawiera `node_modules`.

- `npm run lint` → exit 127, `sh: 1: next: not found`
- `npm run typecheck` → exit 2; brak typów i modułów m.in. React, Next, Zustand, Node, Tailwind oraz Playwright

To nie zostało oznaczone jako błąd składni PASS627–631. Pełny gate wymaga czystej instalacji zależności w deklarowanym środowisku Node.js 20.x.

## Zalecana walidacja lokalna

```bash
nvm use 20
npm ci
npm run verify:pass627-631-premium-interaction-release
npm run typecheck
npm run lint
npm run build
```
