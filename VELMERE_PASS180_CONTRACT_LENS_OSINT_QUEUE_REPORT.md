# Velmère PASS180 — Contract Lens + OSINT Queue Foundations

## Scope
This pass builds the first real destinations that Velmère Lens routes into:
- Contract Lens foundation for contract permission review,
- OSINT Queue foundation for manual social/news/KOL review,
- diagnostic API routes,
- public Shield page panels,
- safe wording and source requirements.

## Implemented
- `lib/market-integrity/contract-lens-contract.ts`
- `lib/market-integrity/osint-queue-contract.ts`
- `components/market-integrity/ContractLensPanel.tsx`
- `components/market-integrity/OsintQueuePanel.tsx`
- `/api/market-integrity/contract-lens`
- `/api/market-integrity/osint-queue`
- Panels added to `/[locale]/market-integrity`
- PASS180 CSS
- PASS180 guard wired into `verify:shield-all` and `vercel-preflight`

## Boundary
Contract Lens and OSINT Queue are still preview/manual-review foundations. They do not fetch external sources, do not run a real contract analyzer and do not output final verdicts.
