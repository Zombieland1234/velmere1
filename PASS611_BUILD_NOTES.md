# PASS611 Build Notes

## Środowisko

- Node w projekcie: `20.x`
- Node w środowisku walidacyjnym: `v22.16.0`
- npm: `10.9.2`
- Paczka release nie zawiera `node_modules`, `.next` ani `.git`.

## Polecenia, które przeszły

```bash
npm run typecheck:pass611
npm run verify:pass592-596-pdf-chromium-proof-release
npm run verify:pass597-601-shield-map-replay-virtualization-release
npm run verify:pass602-606-vlm-brain-topology-release
npm run verify:pass607-611-pdf-source-parity-release
npm run check:i18n
npm run vercel:preflight
```

Dodatkowo cały projekt przeszedł parser TypeScript/TSX: 894 pliki, 0 błędów składni.

## Polecenia wymagające pełnego środowiska produkcyjnego

```bash
nvm use 20
npm ci
npm run lint
npm run typecheck
npm run build
```

`next lint` nie został wykonany w sandboxie, ponieważ zależności projektu nie były zainstalowane. Nie należy interpretować tego jako błąd kodu ani jako zaliczony lint.

## Po rozpakowaniu

```bash
npm ci
npm run typecheck:pass611
npm run verify:pass607-611-pdf-source-parity-release
npm run build
```
