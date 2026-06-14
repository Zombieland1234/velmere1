# PASS295 — Decision Flow Orchestrator Gate

## Goal

Turn the PASS293 Social-Exchange Router and PASS294 Trust Signal Feed into an actionable decision path: identity lock, source quorum, exchange depth context, social context and one safe operator action.

## Research direction

- MEXC-style exchange UX keeps orderbook/depth context close to the market decision surface.
- Meta/Instagram/X-style ranking can be useful when its reasons are visible, but Velmère blocks addictive feed mechanics and hidden engagement-only ranking.
- Luxury traceability patterns from Aura/LVMH push the product toward provenance, proof and calm status rather than loud FOMO.

## Implemented files

- `lib/market-integrity/decision-flow-orchestrator-gate.ts`
- `components/search/VelmereIntelligenceSearchClient.tsx`
- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/ShieldMapClient.tsx`
- `app/globals.css`
- `scripts/verify-pass295-decision-flow-orchestrator-gate-safety.mjs`
- `package.json`
- `VELMERE_MASTER_BUILD_MAP_PASS295.md`

## Product changes

- Added `PASS295_DECISION_FLOW_ORCHESTRATOR_GATE` module.
- Added a VLM Browser Decision Flow rail.
- Added per-result decision receipts inside Lens result cards.
- Added Shield terminal PASS295 sync rail.
- Added Shield Map PASS295 sync rail.
- Added explicit friction states: `source_first`, `slow_down`, `go_to_review`, `blocked`.
- Added anti-dark-pattern rules to the guard.

## Safety boundaries

- No buy/sell command.
- No guaranteed profit.
- No guaranteed safety.
- No fake scarcity.
- No countdown or urgency loop.
- No hidden engagement-only ranking.

## Validation

```bash
npm run verify:pass295-decision-flow-orchestrator-gate
npm run verify:pass294-trust-signal-feed-gate
npm run verify:pass293-social-exchange-command-router-gate
npm run check:i18n
npm run vercel:preflight
```

All listed commands passed in this package.

Full `typecheck` is still not marked green because this ZIP does not include `node_modules` and the inherited project still depends on local Next/React/Node type installation.
