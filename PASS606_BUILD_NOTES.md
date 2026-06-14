# PASS606 — build notes

## Wykonane w środowisku roboczym

- `node scripts/verify-pass602-606-vlm-brain-topology-release.mjs` — PASS
- `node scripts/verify-pass597-601-shield-map-replay-virtualization-release.mjs` — PASS
- `node scripts/check-i18n.mjs` — PASS
- `node scripts/vercel-preflight.mjs` — PASS, 882 pliki
- parser TS/TSX całego projektu — 879 plików, 0 błędów składni
- strict TypeScript modułów PASS602–606 — PASS

## Niewykonane jako pełny proof produkcyjny

Pełny `npm ci`, semantyczny typecheck całej aplikacji i `next build` wymagają Node.js 20.x oraz instalacji zależności. Sandbox miał Node.js 22.16.0 i nie zawierał `node_modules`.

## Komendy produkcyjne

```bash
nvm use 20
npm ci
npm run typecheck:pass606
npm run typecheck
npm run build
```
