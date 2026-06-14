# CODEX ULTRA-DEEP TASK — Velmère Shield AI Risk Brain PASS 2 / One-Hour Mode

You are a senior TypeScript architect, crypto market-integrity analyst, forensic on-chain investigator, quantitative risk-model designer, production reliability engineer, and UX-safe financial copy auditor.

This is a long-form deep-work task. Do not finish after 10–12 minutes. Use the full available reasoning budget. Assume you are allowed to spend around one hour thinking, auditing, testing mentally, and improving. The goal is not to produce “some working code”; the goal is to make Velmère Shield’s AI Risk Brain significantly more production-ready.

You are continuing after the previous Codex pass. Do not reset the architecture unless necessary. Improve what exists.

Main file to edit:
`lib/market-integrity/risk-engine.ts`

Reference files to read:
`lib/market-integrity/risk-types.ts`
`lib/market-integrity/shield-investigator.ts`
`lib/market-integrity/data-backbone.ts`
`components/market-integrity/TokenRiskModal.tsx`
`scripts/verify-risk-engine-safety.mjs`
`scripts/vercel-preflight.mjs`
`docs/progress/PROJECT_PROGRESS_LEDGER.md`

Only edit other files if absolutely necessary for type safety or test/guard updates. If you edit other files, explain why.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Velmère is clothing-commerce first:
- luxury streetwear,
- product quality,
- fit,
- material,
- delivery,
- returns,
- consumer rights.

VLM is a private digital access layer:
- utility/access only,
- not an investment,
- no ROI,
- no yield,
- no price promise.

Shield is a crypto market-integrity radar:
- risk prescreen,
- anomaly detection,
- evidence routing,
- OSINT queue,
- not financial advice,
- not a buy/sell system,
- not a legal accusation engine.

Square is a moderated community layer:
- curated,
- account-gated publishing,
- no spam,
- no seed phrase,
- no wallet pressure.

Research Lab is safe research framing:
- prime numbers,
- numerical audit,
- cryptography education,
- no “we broke Bitcoin”,
- no “RH proof” unless formally proven and reviewed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTE LANGUAGE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Allowed language:
- anomaly
- red flag
- requires review
- missing source
- unknown
- confidence too low
- insufficient data
- prescreen only
- manual review required
- source ledger required
- holder labels missing
- contract permissions unavailable
- OSINT required
- not financial advice

Forbidden language:
- buy
- sell
- safe investment
- guaranteed
- guaranteed profit
- moon
- easy money
- scam proven
- fraud confirmed
- legal proof
- definitely manipulated
- 100% certain
- private keys can be recovered
- Bitcoin can be broken

Do not accuse a token/project of fraud or scam. Use “requires review”, “red flag”, “anomaly pattern”, “source missing”, or “insufficient evidence”.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTE TECHNICAL RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Keep `analyzeTokenRisk(input, dataQuality)` exported and returning `TokenRiskResult`.
2. Keep `levelFromScore()` exported.
3. Keep `badgeFromLevel()` exported.
4. No new dependencies.
5. No randomness.
6. No browser APIs in risk-engine.
7. No `window`, `document`, `localStorage`.
8. No direct MapIterator spreads like `[...map.values()]`; use `Array.from(...)`.
9. No `result.limitations`; limitations live in `metaModel.limitations`.
10. No root CODEX files.
11. No deployable CODEX `.ts/.tsx/.js/.jsx` files.
12. No `any` unless absolutely unavoidable.
13. No unused imports.
14. No undefined variables.
15. No impossible TypeScript narrowing.
16. No old known bug terms:
    - `RISK {riskScore}%`
    - `odczyt ryzyka`
    - `risk extraction`
    - `((index % 5)`
    - `(index % 4)`
17. Every signal ID used must exist in `RiskSignalId`.
18. Confidence must be 0–1.
19. Score must be 0–100.
20. Risk level must be `low`, `medium`, `high`, or `critical`.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WORK PHASES — DO NOT SKIP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHASE 1 — Read and map the existing engine
- Understand every helper.
- Identify which fields from `TokenRiskInput` are used and unused.
- Identify where scores are inflated or underweighted.
- Identify whether stablecoin/RWA logic is actually useful or cosmetic.
- Identify missing-data behavior.

PHASE 2 — Type contract audit
- Read `risk-types.ts`.
- Check all signal IDs.
- Check all agent IDs.
- Check `TokenRiskResult`.
- Check `RiskMetaModel`.
- Do not invent incompatible output structures.

PHASE 3 — Scenario calibration
Mentally test these scenarios and adjust scoring so results are intuitive:

1. BTC-like large cap:
   - high market cap,
   - strong liquidity,
   - deep data,
   - normal volatility.
   Expected: low/medium prescreen unless anomaly fields exist.

2. SOL-like volatile large cap:
   - volatile,
   - high volume,
   - strong liquidity,
   - not low-float.
   Expected: not critical from volatility alone.

3. New low-float pump:
   - low circulating/total ratio,
   - high FDV/MC gap,
   - parabolic 7d/30d,
   - thin liquidity.
   Expected: high/critical market-integrity risk.

4. Honeypot/blacklist/mint:
   - honeypot or blacklist or mint + pause + tax.
   Expected: critical or near-critical floor.

5. Stablecoin near peg:
   - price near 1,
   - normal movement,
   - missing reserve proof.
   Expected: not high from volatility, but not “safe”; issuer/reserve review limitation.

6. Stablecoin depeg:
   - price significantly away from peg.
   Expected: high risk depending on deviation and liquidity.

7. RWA / tokenized treasury:
   - low volatility,
   - low/zero volume,
   - missing issuer/redemption proof.
   Expected: redemption/issuer/source confidence review, not meme-pump logic.

8. Meme token pump:
   - huge 24h/7d,
   - high volume/liquidity ratio,
   - thin liquidity,
   - weak holders/source data.
   Expected: engineered-demand / exit-depth review, high/critical if corroborated.

9. Dead token:
   - huge drawdown,
   - low liquidity,
   - low volume.
   Expected: stale market / exit depth risk.

10. Missing-data token:
   - many unknown fields.
   Expected: confidence low, limitations strong, prescreen only; not “low safe”.

PHASE 4 — Improve scoring architecture
Use a multi-lane model:
- velocity / repricing,
- liquidity / exit depth,
- microstructure / orderbook,
- supply / float / unlock,
- holders / concentration,
- contract / permissions,
- data quality / evidence,
- stablecoin/RWA special handling.

Do not simply add all signals linearly. Use:
- lane scores,
- diminishing returns within a lane,
- corroboration bonuses across lanes,
- hard floors for critical contract signals,
- confidence penalty,
- missing-data uncertainty,
- escalation floors when multiple lanes confirm.

Examples:
- parabolic pump + thin liquidity = high floor.
- low float + FDV/MC gap + missing unlock data = high floor.
- honeypot = critical floor.
- high sell tax + blacklist = critical or near-critical floor.
- severe drawdown + weak liquidity = high stale/exit risk.
- high market cap + near-zero volume = exit depth review.

PHASE 5 — Improve limitations
Limitations must be useful and specific. Add or improve:
- circulating supply missing,
- total/max supply missing,
- vesting/unlock schedule not verified,
- holder concentration unavailable,
- holder labels unavailable,
- contract permissions unavailable,
- orderbook depth unavailable,
- liquidity depth unavailable,
- OSINT source ledger not attached,
- KOL/social disclosure data missing,
- issuer/reserve proof missing,
- redemption proof missing,
- confidence too low; prescreen only,
- manual review required before escalation.

PHASE 6 — Improve agent assessments
Agents should be operator-grade:
- velocity,
- liquidity,
- microstructure,
- holders,
- contract,
- data.

Each agent output should have:
- score,
- confidence,
- evidence count,
- verdict/status,
- reasoning,
- next action,
- evidence signal IDs.

Do not make every agent sound the same.
Use next actions:
- verify unlock schedule,
- inspect exit depth,
- attach OSINT source ledger,
- review contract admin controls,
- label CEX/team/LP/unknown wallets,
- rerun after live orderbook snapshot,
- slow down and verify supply before interpreting price movement.

PHASE 7 — Improve meta-model
Meta model should answer:
- dominant lane,
- final verdict,
- confidence state,
- conflict between lanes,
- review required,
- escalation path,
- missing limitations,
- next operator action.

Summary should be short and clinical, not hype.

Good:
“TOKEN: anomaly pattern requires review. Dominant lane: liquidity/exit depth. Missing holder labels and orderbook depth block stronger conclusions.”

Bad:
“This token is a scam and will dump.”

PHASE 8 — Improve stablecoin/RWA detection
Stablecoin:
- detect USD/EUR/USDT/USDC/DAI/USDE/FDUSD/PYUSD/RLUSD/GHO etc where safe,
- depeg logic,
- reserve/issuer limitation,
- low volatility is expected,
- do not mark as safe just because price is near peg.

RWA:
- detect treasury, money market, t-bill, government securities, tokenized stock/fund/yield, BlackRock BUIDL-like language,
- low volatility expected,
- zero volume not ignored,
- issuer/redemption proof limitation,
- de-emphasize meme/pump heuristics unless price move is truly abnormal.

PHASE 9 — Guard/script alignment
Read:
`scripts/verify-risk-engine-safety.mjs`
`scripts/vercel-preflight.mjs`

If your engine changes require the safety script to understand something new, update the script carefully. Do not weaken guards just to pass. Improve the guard if needed.

PHASE 10 — Final self-audit
Before final output, verify:
- no unsafe language,
- no type errors,
- no invalid signal IDs,
- no missing exports,
- no MapIterator spread,
- no browser APIs,
- no `result.limitations`,
- no root CODEX artifacts,
- no old known bugs,
- confidence sane,
- score sane,
- stablecoin/RWA sane,
- limitations useful,
- agent next actions useful,
- metaModel useful.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VALIDATION COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Run if available:

```bash
node scripts/check-i18n.mjs
node scripts/vercel-preflight.mjs
node scripts/verify-market-integrity-no-truncation.mjs
node scripts/verify-shield-design-safety.mjs
node scripts/verify-risk-engine-safety.mjs
npm run typecheck
npm run build
```

If `npm run build` is too slow or environment-limited, at minimum run all node scripts and explain that full build still needs Vercel confirmation.

Do not ignore errors. Fix them.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROGRESS LEDGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If you modify the project beyond a single returned file, update:
`docs/progress/PROJECT_PROGRESS_LEDGER.md`

Current baseline after PASS 116 should be treated around:
- UI shell / layout: 47–48%
- Shield terminal: 39–41%
- VLM AI risk brain: 31–35%
- Data / API spine: 32–33%
- Legal / launch safety: 49–51%
- Mobile polish: 25–26%
- Full translations: 35–36%
- Clothing commerce readiness: 47–50%
- Whole brand/site launch readiness: 42–44%

Be realistic. Do not inflate.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DELIVERABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return a complete answer with:
1. Files changed.
2. What improved.
3. Validation commands and exit status.
4. Build/type errors fixed.
5. Remaining blockers.
6. Progress percentage changes.
7. If asked to return only one file, return the full file content only.

Do not give a lazy answer.
Do not stop early.
If you think you are done, run another self-audit pass and improve more.
