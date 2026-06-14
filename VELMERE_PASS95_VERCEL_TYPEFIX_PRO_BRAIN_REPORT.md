# VELMERE PASS 95 — Vercel Type Fix + Professional Brain Controls

## Base
Built on PASS 94 `velmere_pass94_interactive_360_brain`.

## Critical Vercel fix
Fixed:
`components/market-integrity/TokenRiskModal.tsx`

Vercel error:
`Argument of type 'number | undefined' is not assignable to parameter of type 'number'`

Cause:
`candleMove` could be `undefined` because fallback used optional `result.metrics.priceChange24h`.

Fix:
`const candleMove = first && latest ? ((latest - first) / first) * 100 : (result.metrics.priceChange24h ?? 0);`

## Motion / UX improvements
- Added visible VLM brain controls:
  - auto rotate on/off
  - reset view
  - zoom out
  - zoom in
- Kept drag-to-rotate 360° interaction.
- Made auto-rotation slower and calmer.
- Kept slower transmitters from PASS 94.
- Added control styling and mobile tap targets.
- Added master roadmap ledger so future passes do not forget missing areas.

## Vercel warning audit
In this artifact:
- raw `<img>` occurrences in `.tsx`: 0
- direct MapIterator spreads like `[...map.values()]`: 0

If Vercel still shows `<img>` warnings, the deployed GitHub commit is not using this current artifact.

## Validation
Passed:
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`
- `node scripts/verify-market-integrity-no-truncation.mjs`
- `node scripts/verify-shield-design-safety.mjs`

Not run:
- full `next build` in sandbox because artifact does not include installed node_modules.
