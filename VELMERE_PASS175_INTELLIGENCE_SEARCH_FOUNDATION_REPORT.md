# Velmère PASS175 — Intelligence Search Foundation

## Scope
This pass adds a controlled Velmère Intelligence Search layer:
- short token/project summaries,
- source confidence,
- missing data,
- next operator step,
- shortcut to full Velmère Shield analysis.

## Implemented
- `/[locale]/search` page
- `components/search/VelmereIntelligenceSearchClient.tsx`
- `/api/search` local preview gateway
- `lib/search/intelligence-search-contract.ts`
- `lib/search/intelligence-search-safety.ts`
- PASS175 CSS and safety guard
- wired guard into `verify:shield-all` and `vercel-preflight`

## Important boundary
This is not a full browser embedded in the page and does not fetch the public web yet. It is a controlled research/search layer for short Velmère summaries and a safe shortcut into Shield.
