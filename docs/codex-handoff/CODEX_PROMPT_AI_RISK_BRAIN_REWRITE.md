# CODEX TASK — Velmère Shield AI Risk Brain Rewrite

You are editing exactly one production file:

`lib/market-integrity/risk-engine.ts`

A copy of that file is attached as:

`CODEX_EDIT_THIS_ONE_FILE_AI_RISK_BRAIN_risk-engine.ts`

You may read these reference files, but do not edit them unless explicitly asked later:
- `CODEX_REFERENCE_DO_NOT_EDIT_shield-investigator.ts`
- `CODEX_REFERENCE_DO_NOT_EDIT_risk-types.ts`

## Goal

Improve the real AI/risk brain of Velmère Shield.

This is not about visual animation. This file calculates market-integrity risk:
- supply / float
- FDV vs market cap
- unlock / vesting proxy signals
- liquidity / exit depth
- volume quality
- holder concentration
- orderbook / slippage
- contract control
- KOL/social/hype proxy
- missing data uncertainty
- confidence and meta-model output

The output must stay legal-safe:
- no buy/sell calls
- no “safe investment” language
- no scam/manipulation accusation without evidence
- use anomaly / red flag / requires review / unknown / uncertainty

## Absolute rules

1. Edit only `risk-engine.ts`.
2. Do not change public types unless impossible.
3. Do not add dependencies.
4. Keep strict TypeScript safe.
5. Do not introduce `result.limitations`; limitations live under `metaModel.limitations`.
6. Do not use direct MapIterator spreads like `[...map.values()]`.
7. Do not add browser APIs. This file must remain server/client safe pure logic.
8. Do not create random outputs. Scoring must be deterministic.
9. Do not overclaim. Missing data increases uncertainty; it does not prove fraud.
10. Keep exported function names stable unless there is a very strong reason.

## What to improve

### 1. Better scoring model

Make scoring more realistic and less naive.

Improve or add signal scoring for:
- low float risk:
  - circulating supply / total or max supply
  - low circulating percent should increase risk
  - unknown supply should add uncertainty, not hard accusation
- FDV / market cap overhang:
  - high FDV/MC ratio implies future unlock/overhang risk
- parabolic repricing:
  - 24h, 7d, 30d gains
  - multi-timeframe pump
  - high volume + pump can be engineered demand
- collapse/drawdown:
  - severe drops should show liquidity/exit stress
- volume quality:
  - volume/market cap ratio too high can be churn/wash-like
  - very low volume with large market cap means exit depth concern
- liquidity:
  - liquidity/market cap ratio
  - simulated slippage
  - bid/ask imbalance
  - orderbook depth collapse
- holder/insider:
  - top10 holder percent
  - holder count too low
  - CEX/team/LP/unknown should be treated carefully if available
- contract/admin:
  - mint, pause, blacklist, honeypot, taxes, proxy/owner risk if fields exist
- data quality:
  - missing price/liquidity/supply/holders/contract/source data increases uncertainty and lowers confidence

### 2. Multi-agent model

Strengthen agent assessments:
- Velocity / pump agent
- Liquidity / exit agent
- Holder / insider agent
- Contract / permissions agent
- Data quality agent
- Evidence / OSINT agent

Each agent should have:
- score 0–100
- concise reason
- source mode if available
- next action recommendation

If current type does not support all fields, fit into existing fields without breaking TypeScript.

### 3. Confidence model

Confidence should not be blindly high.

Increase confidence when:
- dataQuality is live
- multiple data sources exist
- price, market cap, liquidity, volume exist
- supply data exists
- holder/contract/orderbook data exists

Decrease confidence when:
- fallback/partial data
- missing supply
- missing liquidity
- missing holders
- missing contract
- missing sources
- stablecoin/RWA weird cases need different interpretation

### 4. Missing-data limitations

Limitations must be clear:
- “circulating supply missing”
- “vesting/unlock schedule not verified”
- “holder concentration unavailable”
- “contract permissions unavailable”
- “orderbook depth unavailable”
- “OSINT source ledger not attached”

Do not access `result.limitations`.
Return limitations inside the existing meta model structure.

### 5. Stablecoin / RWA handling

Avoid fake high-risk on stablecoins/RWA just because price change is low or volume is odd.

If symbol/name suggests stablecoin or tokenized treasury/RWA:
- de-emphasize volatility score
- still flag depeg, issuer opacity, low volume, missing proof
- do not mark as safe only because it is near $1

### 6. Output language

Use short operator wording:
- “requires review”
- “missing source”
- “thin exit depth”
- “unlock overhang”
- “float opacity”
- “KOL/social OSINT required”
- “contract admin review”

Do not use hype words.

### 7. Regression checks

Before final answer, make sure:
- TypeScript syntax is valid.
- No `result.limitations`.
- No direct MapIterator spread.
- No `any` unless absolutely necessary.
- No unreachable/impossible narrowed comparisons.
- `analyzeTokenRisk()` still returns `TokenRiskResult`.
- Exports still compile.

## Desired output

Return the full edited `risk-engine.ts` file only.
Do not return a diff.
Do not edit other files.
