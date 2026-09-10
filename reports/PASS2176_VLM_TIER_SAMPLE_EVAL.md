# PASS2176 — VLM Tier Sample Eval

Generated: 2026-09-04T00:15:14.834Z

Status: **PASS**

Average score: **100/100**

Mode: deterministic golden sample eval. This proves the eval contract and tier expectations, not live provider truth.

## Samples

- Assets: BTC, ETH, NVDA, GOLD, EUR/USD, SUSP
- Locales: pl, en, de
- Tiers: basic, pro, advanced
- Output samples scored: 54
- Cohorts compared: 18

## What this pass adds

1. A reusable VLM output quality scoring contract.
2. A deterministic Basic / Pro / Advanced golden-set harness.
3. Tier-difference checks so Advanced cannot become only longer text.
4. Source-id integrity checks so claims cannot reference unknown sources.
5. Legal-safety checks for ROI/FOMO/certification wording.

## Remaining proof

- Run the same eval on real VLM outputs from hosted API.
- Attach Gemini/live provider receipts.
- Attach Advanced entitlement receipts.
- Attach PDF render samples for PL/EN/DE.
