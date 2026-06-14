# PASS423 — Long-Term Memory Spine

PASS423 extends the Velmère AI brain from short-lived runtime memory into a controlled multi-year market-risk memory spine.

## Implemented

- Added `lib/market-integrity/pass423-long-term-memory-spine.ts`.
- Default market-risk retention is 1825 days / 5 years.
- Retention can be tuned with `VELMERE_RISK_MEMORY_RETENTION_DAYS` up to a hard 10-year product cap before legal review.
- Added hot/warm/cold/archive tiers so old data can explain history without dominating current scoring.
- Added long-term `learningMode`, `learningWeight`, `archiveWeight`, `seasonalityHint`, `storageReality` and `antiOverfitReason`.
- Updated `risk-ledger.ts` so in-process history is pruned by PASS423 policy instead of the old tiny 288-snapshot slice.
- Updated Supabase reads to fetch latest rows first and then restore chronological order.
- Updated analyze/brain API routes to use the PASS423 analysis window instead of a fixed 144-row short window.
- Updated PASS422 brain core with `longTermMemory` and combined confidence from hot memory plus controlled long-term weight.
- Updated Lens report brain marker to `pass423-lens-long-memory-brain` with retention years and market-ledger-only memory mode.

## Product rule

Velmère can keep market-risk memory for years, but it must not turn a single event into a new rule. Old data becomes archive evidence with decay. Personal user memory is not part of the long-term risk ledger unless explicit opt-in exists.

## Storage reality

- Supabase configured: durable multi-year memory can be active.
- Supabase missing: runtime mirror works for local/dev behavior, but it cannot honestly claim years of persistence across deployments.
