# PASS301 — Source Adapter Contract Mesh Gate

## Scope

PASS301 introduces a source-adapter contract layer for Velmère Shield, Shield Map and VLM Browser/Lens.

## Product behavior

The mesh checks six adapter lanes before proof copy can move forward:

1. Identity resolver
2. Market depth adapter
3. Reserve proof adapter
4. Contract control adapter
5. OSINT context adapter
6. Provenance passport adapter

Each lane exposes:

- adapter contract
- timeout budget
- retry policy
- customer boundary
- operator proof

## Safety psychology

- FOMO is inverted into friction.
- Elite status is earned by evidence, not scarcity or hype.
- Social ranking is explainable and never becomes a buy/sell command.
- Incomplete adapters keep raw details operator-only.

## Guards

- `scripts/verify-pass301-source-adapter-contract-mesh-gate-safety.mjs`
- `verify:pass301-source-adapter-contract-mesh-gate`

## Files touched

- `lib/market-integrity/source-adapter-contract-mesh-gate.ts`
- `components/search/VelmereIntelligenceSearchClient.tsx`
- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/ShieldMapClient.tsx`
- `app/globals.css`
- `package.json`
