# VLM AI Risk Brain — Codex Import Protocol

## Purpose
This protocol exists because the Codex workspace may contain only the exported AI brain file, while the main Velmère project contains the full UI, API routes and guard scripts.

## Correct workflow

1. Codex works only inside:
   `C:\Users\marci\Desktop\codex`

2. Codex edits only:
   `CODEX_EDIT_THIS_ONE_FILE_AI_RISK_BRAIN_risk-engine (1).ts`

3. Codex returns the full final file content.

4. Human/import step compares that file against:
   `lib/market-integrity/risk-engine.ts`

5. Import only the risk-engine changes. Do not import:
   - `.next`
   - `node_modules`
   - raw CODEX files into app runtime
   - prompt files into executable folders
   - browser/Node APIs into risk-engine

6. After import, run:
   - `npm run verify:ai-brain-import`
   - `npm run verify:risk-engine`
   - `npm run verify:shield-all`
   - `npm run vercel:preflight`
   - `npm run check:i18n`
   - `npm run build`

## What must stay true
- `analyzeTokenRisk` export remains.
- `levelFromScore` export remains.
- `badgeFromLevel` export remains.
- `metaModel.limitations` is the limitations home.
- `risk-engine.ts` stays pure TypeScript logic: no fetch, no window, no document, no Node APIs.
- Every signal id emitted by risk-engine exists in `RiskSignalId`.
- No investment advice language.
- No accusation language without evidence.
- Missing data increases uncertainty and review pressure.

## Red flags during import
Reject the import if it contains:
- new signal ids not in the type union,
- `as any`,
- `fetch`,
- `window` or `document`,
- `safe investment`,
- `guaranteed`,
- `buy signal`,
- `sell signal`,
- `scam confirmed`,
- `fraud proven`,
- changed result shape without updating all UI consumers.

## Manual QA after import
Use at least these cases:
- BTC-like mega-cap.
- ETH-like large cap.
- Stablecoin near peg.
- Stablecoin depeg.
- RWA/tokenized fund with missing issuer proof.
- Low-float parabolic pump.
- Contract privilege cluster.
- Thin-liquidity pump.
- No-data token.
