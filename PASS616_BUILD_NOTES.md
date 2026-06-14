# PASS616 Build Notes

## Środowisko

- Node.js: v22.16.0
- Projekt produkcyjny deklaruje Node.js 20.x.
- Paczka źródłowa nie zawiera `node_modules`, `.next` ani `.git`.

## Wykonane

- `node scripts/verify-pass592-596-pdf-chromium-proof-release.mjs` — PASS
- `node scripts/verify-pass597-601-shield-map-replay-virtualization-release.mjs` — PASS
- `node scripts/verify-pass602-606-vlm-brain-topology-release.mjs` — PASS
- `node scripts/verify-pass607-611-pdf-source-parity-release.mjs` — PASS
- `node scripts/verify-pass612-616-shield-terminal-release.mjs` — PASS
- `npx tsc -p tsconfig.pass616.json --noEmit` — PASS
- `npm run check:i18n` — PASS
- `npm run vercel:preflight` — PASS, 892 pliki
- Parser TypeScript całego repo — 899 plików, 0 błędów składni
- Parser PostCSS `app/globals.css` — PASS

## Niewykonane jako pełny proof

- W osobnej kopii roboczej uruchomiono czyste `npm ci`. Instalacja rozpoczęła pobieranie zależności, ale proces został przerwany sygnałem `SIGTERM` przed ukończeniem.
- Próba działała na Node.js 22.16.0 mimo deklarowanego przez projekt Node.js 20.x; npm poprawnie zgłosił `EBADENGINE`.
- Niekompletna instalacja została odizolowana od paczki release i nie stanowi dowodu poprawnego `npm ci`.
- `npm run lint` — brak kompletnej lokalnej binarki `next`.
- `npm run typecheck` — zależności i typy React/Next/Node nie zostały skompletowane; wynik nie jest miarodajnym semantycznym proofem projektu.
- `npm run build` — wymaga zakończonego `npm ci` w Node.js 20.x i kompletnego środowiska produkcyjnego.

## Zalecany gate po rozpakowaniu

```bash
nvm use 20
npm ci
npm run typecheck:pass616
npm run verify:pass612-616-shield-terminal-release
npm run typecheck
npm run lint
npm run build
```
