# Velmère PASS178 — Token Metadata Cache + Provider Readiness

## Scope
This pass continues Intelligence Search by adding a controlled metadata layer:
- token metadata cache contract,
- provider readiness/status matrix,
- token metadata diagnostic route,
- visible provider readiness panel on the Search page.

## Implemented
- `lib/search/token-metadata-cache.ts`
- `/api/search/token-metadata`
- `components/search/TokenMetadataProviderPanel.tsx`
- Search page renders Token Metadata Provider Panel
- PASS178 CSS
- PASS178 guard wired into `verify:shield-all` and `vercel-preflight`

## Boundary
The route performs no external provider fetch. Logos, ranks and symbols are UI context only and must not be treated as safety, trust or investment quality.
