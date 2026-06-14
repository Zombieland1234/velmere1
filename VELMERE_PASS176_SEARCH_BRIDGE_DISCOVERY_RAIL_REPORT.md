# Velmère PASS176 — Search Bridge + Discovery Capsules

## Scope
This pass continues Velmère Intelligence Search with:
- a proper Search → Shield bridge,
- result bridge cards,
- token/avatar labels,
- a discovery rail with new Velmère research capsule concepts,
- preview bridge API route.

## Implemented
- `components/search/VelmereSearchDiscoveryRail.tsx`
- `/api/search/bridge`
- `VelmereShieldBridge` contract
- `buildVelmereShieldBridge()`
- search result bridge cards pointing into Shield
- PASS176 CSS
- PASS176 guard wired into `verify:shield-all` and `vercel-preflight`

## Boundary
This is still a controlled preview layer. It does not fetch public web/OSINT yet and it does not create final risk verdicts.
