# PASS626 — build notes

## Potwierdzone

- Node runtime środowiska: `v22.16.0`
- npm: `10.9.2`
- wymaganie projektu: Node `20.x`
- PASS592–626 gates: PASS
- strict TypeScript PASS622–626: PASS
- PL/DE/EN i18n: PASS
- Vercel preflight: PASS, 902 pliki
- parser TS/TSX: 909 plików, 0 błędów składni
- CSS structural parser: PASS
- runtime construction pełnego `LensReport` z PASS622–626: PASS

## Niepotwierdzone

- `next build`
- pełny semantyczny `tsc --noEmit`
- `next lint`

Powód: paczka release celowo nie zawiera `node_modules`. Próba `npm run lint` zakończyła się `sh: 1: next: not found`. Build produkcyjny należy wykonać po `npm ci` w Node.js 20.x.

## Zalecana walidacja lokalna

```bash
nvm use 20
npm ci
npm run verify:pass622-626-ai-source-intelligence-release
npm run typecheck
npm run lint
npm run build
```
