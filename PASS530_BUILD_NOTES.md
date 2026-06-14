# PASS530 Build Notes

## Zaliczone

- PASS480–530 verifier chain,
- check:i18n PL/DE/EN,
- Vercel preflight — 835 plików,
- TypeScript parser — 840 TS/TSX,
- targetowany semantyczny TypeScript — exit 0,
- ESLint zmienionego obszaru — exit 0,
- Node 20 production contract — PASS,
- ZIP integrity i exclusion audit.

## Niezaliczone jako pełny sukces

- pełny `tsc --noEmit` całego repozytorium,
- końcowa optymalizacja `next build`.

Powód: środowisko sandbox działa na Node 22.16.0 i wcześniejsze pełne buildy tego repozytorium przekraczały limit czasu/pamięci. Projekt wymaga Node 20.x.

## Polecenie finalne

```bash
nvm use 20
npm ci
npm run build
```
