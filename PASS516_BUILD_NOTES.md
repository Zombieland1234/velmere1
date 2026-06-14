# PASS516 Build Notes

- Repo deklaruje Node.js 20.x.
- Wszystkie verifiery PASS480–516 przeszły.
- i18n PL/DE/EN przeszło.
- Vercel preflight przeskanował 823 pliki.
- ESLint zmienionego obszaru przeszedł.
- Targetowany `tsc -p tsconfig.pass510.json` przeszedł.
- Pełny `tsc --noEmit` przekroczył limit procesu bez diagnostyki.
- Pełnego `next build` nie deklaruję jako zakończonego w sandboxie.

Lokalnie na Node.js 20.x:

```bash
npm ci
npm run verify:pass510-516-premium-intelligence
npm run typecheck
npm run vercel:preflight
npm run build
```
