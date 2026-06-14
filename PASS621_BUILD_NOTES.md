# PASS621 Build Notes

## Środowisko

- Node.js: v22.16.0
- Produkcyjny kontrakt projektu: Node.js 20.x
- Release nie zawiera `.git`, `.next`, `node_modules`, cache ani logów.

## Wykonane

- `node scripts/verify-pass592-596-pdf-chromium-proof-release.mjs` — PASS
- `node scripts/verify-pass597-601-shield-map-replay-virtualization-release.mjs` — PASS
- `node scripts/verify-pass602-606-vlm-brain-topology-release.mjs` — PASS
- `node scripts/verify-pass607-611-pdf-source-parity-release.mjs` — PASS
- `node scripts/verify-pass612-616-shield-terminal-release.mjs` — PASS
- `node scripts/verify-pass617-621-real-markets-release.mjs` — PASS
- `npx tsc -p tsconfig.pass621.json --noEmit` — PASS
- `node scripts/check-i18n.mjs` — PASS
- `node scripts/vercel-preflight.mjs` — PASS, 897 plików
- Parser TypeScript repo — 904 pliki, 0 błędów składni
- Parser PostCSS `app/globals.css` — PASS

## Niewykonane jako pełny proof

- `npm ci` nie został ponownie oznaczony jako udany; poprzednia izolowana próba zakończyła się SIGTERM przed skompletowaniem zależności.
- `npm run typecheck` wymaga kompletnego React/Next/Node dependency graph.
- `npm run lint` wymaga lokalnej binarki Next.js.
- `npm run build` wymaga kompletnego `npm ci` w Node.js 20.x.

## Zalecany gate po rozpakowaniu

```bash
nvm use 20
npm ci
npm run typecheck:pass621
npm run verify:pass617-621-real-markets-release
npm run typecheck
npm run lint
npm run build
```
