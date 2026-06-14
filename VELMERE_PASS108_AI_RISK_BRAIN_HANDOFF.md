# PASS 108 — AI Risk Brain Handoff

## Correct meaning of “mózg AI”

This pass is about the actual scoring/intelligence brain, not the animated visual brain.

Main file:
- `lib/market-integrity/risk-engine.ts`

This file calculates:
- token risk score,
- risk signals,
- agent scores,
- meta-model,
- limitations,
- confidence,
- badge/level,
- explanation basis.

Second file, for context only:
- `lib/market-integrity/shield-investigator.ts`

This file turns the score into an investigator/operator style output.

## What to give Codex

Give Codex:
1. `CODEX_EDIT_THIS_ONE_FILE_AI_RISK_BRAIN_risk-engine.ts`
2. `CODEX_PROMPT_AI_RISK_BRAIN_REWRITE.md`
3. optional reference:
   - `CODEX_REFERENCE_DO_NOT_EDIT_shield-investigator.ts`
   - `CODEX_REFERENCE_DO_NOT_EDIT_risk-types.ts`

Codex should return one full edited file:
- `risk-engine.ts`

## Parallel work while Codex edits this

While Codex improves risk brain, continue:
- Shield Map translations PL/DE/EN,
- Velmère Square improvements,
- VLM Access Basic/Pro/Advanced split,
- Research Lab route,
- visual VLM brain polish,
- Vercel regression fixes,
- API/data persistence.

## Integration plan

When Codex returns the file:
1. Replace `lib/market-integrity/risk-engine.ts`.
2. Run:
   - `node scripts/check-i18n.mjs`
   - `node scripts/vercel-preflight.mjs`
   - `node scripts/verify-market-integrity-no-truncation.mjs`
   - `node scripts/verify-shield-design-safety.mjs`
3. Static search:
   - `result.limitations`
   - `[...`
   - `any`
   - `scam`
   - `guaranteed`
4. Deploy to Vercel.
5. If Vercel fails, fix the exact TS error immediately.

## Product strategy

AI brain should be split into:
- Basic: 10 public risk points, fast and simple.
- Pro: stronger source confidence, supply/liquidity/holder/contract lanes.
- Advanced: full investigator model, evidence status, OSINT queue, export-ready limitations.

The risk brain should never pretend missing data is safety.
