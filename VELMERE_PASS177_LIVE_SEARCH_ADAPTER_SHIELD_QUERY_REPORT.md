# Velmère PASS177 — Live Search Adapter Skeleton + Token Logos + Shield Query State

## Scope
This pass continues Intelligence Search and connects it more tightly to Shield:
- token result logos,
- Search → Shield query state,
- live adapter skeleton for future web/token/contract/OSINT adapters,
- diagnostic live-preview route.

## Implemented
- `lib/search/live-search-adapter-skeleton.ts`
- `/api/search/live-preview`
- token logo image fields in `VelmereSearchResult`
- search result avatar images with text fallback
- Shield page reads `?asset=`, `?query=` and `?from=velmere-search`
- route bridge can open a Shield scan from search result links
- PASS177 guard wired into `verify:shield-all` and `vercel-preflight`

## Boundary
The live adapter skeleton does not fetch public web or OSINT sources yet. It is a safe architecture lane for the next live-search implementation.
