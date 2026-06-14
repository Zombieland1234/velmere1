# PASS425 — Source Arbitration & Hallucination Brake

PASS425 is a brain-only and bugfix pass on top of PASS424.

## Implemented

- Added `lib/market-integrity/pass425-source-arbitration-hallucination-brake.ts`.
- Added source arbitration modes: `quorum_confirmed`, `single_provider_shadow`, `source_conflict_review`, `stale_or_missing_sealed`.
- Added confidence bands: `low`, `guarded`, `usable`, `strong`.
- Added hallucination brake with claim allowance: `facts_only`, `cautious_summary`, `bounded_analysis`, `adaptive_summary`.
- Added memory write policy: `observation_only`, `shadow_write`, `bounded_write`, `adaptive_write_capped`.
- Integrated PASS425 into `buildPass422BrainMemoryCore` and `buildRiskBrain`.
- Fixed the PASS424 construction hazard: PASS424 no longer receives a not-yet-created `pass425` value.
- Added PASS425 Lens narrative contract so PDF preview/download stay deterministic, locale-bound and source-bound.
- PDF route now reads Lens sections from the resolved report object instead of creating a separate second narrative path.

## Product rule

The brain can live, remember and adapt slowly, but it cannot invent facts. If provider quorum is missing, confidence is capped and public copy is softened. If sources conflict, stronger claims route to operator review. Memory can persist for years, but old archive data can explain history only; it cannot dominate current scoring.

## Guard

Run:

```bash
npm run verify:pass425-source-arbitration-hallucination-brake
```
