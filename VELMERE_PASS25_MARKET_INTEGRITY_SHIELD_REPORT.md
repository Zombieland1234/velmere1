# Velmère Pass 25 — Market Integrity Shield MVP

## Implemented

- Added `/[locale]/market-integrity` page for PL/EN/DE.
- Added `/market-integrity` root redirect to `/pl/market-integrity`.
- Added server-side API route: `/api/market-integrity/analyze?query=TOKEN`.
- Added market-integrity engine:
  - `lib/market-integrity/risk-types.ts`
  - `lib/market-integrity/risk-engine.ts`
  - `lib/market-integrity/dexscreener.ts`
  - `lib/market-integrity/demo-tokens.ts`
- Added UI dashboard:
  - `components/market-integrity/MarketIntegrityClient.tsx`
  - `components/market-integrity/TokenRiskCard.tsx`
  - `components/market-integrity/TokenRiskBadge.tsx`
- Added i18n keys under `MarketIntegrity` in PL/EN/DE messages.
- Added route to `app/sitemap.ts`.
- Added menu link under `VLM / WEB3` drawer group.
- Added Vercel preflight guard for Market Integrity route, API and legal disclaimer.

## Current MVP behavior

- Demo mode includes OM/MANTRA-style case study, thin-liquidity example, and healthy-liquidity example.
- Live scan uses DEX Screener server-side search and maps the best-liquidity pair into the risk engine.
- Risk engine returns signal IDs and metrics only; legal/i18n text stays in UI messages.
- UI displays risk score, badge, metrics, translated signal explanations and legal disclaimer.

## Important legal framing

The system intentionally uses terms like:

- possible manipulation risk,
- market-integrity anomaly,
- liquidity warning,
- automated risk signal.

It does not say that a project is definitely a scam or that specific people committed wrongdoing.

## Checks

- `node scripts/check-i18n.mjs` passed.
- `node scripts/vercel-preflight.mjs` passed.
- Full `npm run typecheck` was not a reliable local check in this sandbox because project dependencies/types such as Next/React were not installed in `node_modules`.

## Next stage

To become a real market scanner instead of a lookup demo, the project should add:

- scheduled cron scanner,
- persistent database cache,
- CoinGecko / CoinMarketCap adapter,
- CEX order book depth adapter,
- on-chain holder/transfer adapter,
- PDF/JSON evidence report export,
- rate-limit protection and queueing.
