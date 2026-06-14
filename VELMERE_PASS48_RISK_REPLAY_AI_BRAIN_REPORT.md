# Velmère Shield — Pass 48

## Focus
This pass pushes Shield further toward a serious investigation terminal instead of a simple scanner. The goal was to keep the main page clean while making the shield interaction and token modal smarter, denser, and more analytical.

## Added
- Risk Replay engine
- Risk Replay API
- Risk Replay Timeline UI inside the token modal
- interactive AI brain layers on the main Shield page
- report bundle extension with risk replay evidence
- stronger no-truncation verification coverage

## New files
- `lib/market-integrity/risk-replay.ts`
- `app/api/market-integrity/replay/route.ts`

## Updated files
- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/TokenRiskModal.tsx`
- `app/api/market-integrity/report/route.ts`
- `scripts/verify-market-integrity-no-truncation.mjs`

## Risk Replay Engine
The new replay engine reconstructs a case timeline from:
- persistent risk history
- live risk signals
- stress simulator scenarios
- holder intelligence
- liquidity and contract pressure

It creates:
- acceleration score
- dominant replay phase
- replay phases
- timeline events
- analyst controls
- narrative summary

## Main Shield Page
The shield icon panel is now interactive:
- Velocity
- Liquidity
- Holders
- Contract
- Order book
- Data

Clicking a layer changes the explanation and next review step. This makes the shield interaction feel like a real AI brain map rather than a decorative icon.

## Token Modal
The modal now includes a Risk Replay Timeline card:
- top replay phases
- latest event timeline
- event layer and score
- acceleration score
- link to `/api/market-integrity/replay?query=...`

## Evidence Report
The evidence report now includes:
- `riskReplay`

## Verification
Passed:
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`
- `node scripts/verify-market-integrity-no-truncation.mjs`

## Honest limitation
The replay engine is deterministic and proxy-based until real holder cluster data, CEX wallet exclusion, richer order-book history, and social/on-chain feeds are connected. It does not claim proof of manipulation.
