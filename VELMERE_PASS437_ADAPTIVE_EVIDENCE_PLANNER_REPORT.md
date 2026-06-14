# PASS437 — Adaptive Evidence Planner Runtime

Scope: bugfix + Velmère AI brain. This pass adds a next-provider planning layer after PASS436 SLO graph.

## Implemented
- `pass437-adaptive-evidence-planner-runtime.ts`
- Provider priority queue with `p0_now / p1_next / p2_background / p3_archive`
- Next-best-probe contract for market, candles, DEX liquidity, token security, exchange health and operator source lanes
- PDF/chat patch: one payload, no fake-live, show missing data and next provider only when customer-visible
- Learning policy: years-long memory allowed, but live source gaps win over old memory and a single event cannot teach a new rule
- Probe route exposes `pass437` and `adaptiveEvidencePlanner`
- Analyze / Brain / Chat / Angel routes expose `pass437`
- Lens report contains `pass437-lens-adaptive-evidence-contract`

## Validation
- `npm run verify:pass437-adaptive-evidence-planner-runtime`
- `npm run check:i18n`
- `npm run vercel:preflight`

## Operator note
PASS437 does not claim the bot has searched the whole internet. It plans which provider lane must be checked next and keeps missing data visible before PDF/chat can use live-style wording.
