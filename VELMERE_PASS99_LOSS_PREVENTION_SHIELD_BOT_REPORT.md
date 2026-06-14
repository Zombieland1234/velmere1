# VELMERE PASS 99 — Loss-Prevention Shield Bot / Investor Psychology

## Base
Built on PASS 98 `velmere_pass98_ai_operator_case_frame`.

## Main goal
Turn the VLM Shield Investigator into a stronger loss-prevention assistant.

The bot should not only score a token. It should explain why the checks matter:
- to avoid hype entries,
- to avoid low-float traps,
- to avoid unlock surprises,
- to avoid becoming exit liquidity,
- to avoid lottery-style gambling thinking.

## Implemented

### 1. New loss-prevention playbook
Added:
- `lib/market-integrity/loss-prevention-playbook.ts`

Includes:
- case-study style lessons:
  - reflexive collapse lesson,
  - low-float / rebrand lesson,
  - parabolic social hype lesson,
- behavioral traps:
  - FOMO,
  - lottery thinking,
  - authority bias,
  - revenge entry,
- risk habits:
  - stable base before speculation,
  - small risk until proven,
  - evidence over story,
  - no single-shot future,
- answer rules for the bot.

### 2. VLM Shield Investigator upgrade
Updated:
- `lib/market-integrity/shield-investigator.ts`

Added:
- `lossPrevention`
- psychology trap detection
- case-study lesson selection
- stable risk reminder
- why-this-matters explanation
- expanded system prompt:
  - OSINT-style
  - no hype
  - explain behavioral traps
  - prefer risk control and evidence
  - no buy/sell instructions

### 3. Shield Map UI upgrade
Updated:
- `components/market-integrity/ShieldMapClient.tsx`

Added:
- investor protection psychology section,
- loss-prevention panel inside live scan results,
- behavioral trap,
- counter move,
- stable-risk reminder.

### 4. Advanced modal upgrade
Updated:
- `components/market-integrity/TokenRiskModal.tsx`

Advanced VLM Investigator now also shows:
- loss-prevention explanation,
- behavioral trap,
- counter move.

### 5. Styles
Updated:
- `app/globals.css`

Added:
- `.shield-loss-prevention-panel`
- `.shield-investor-protection-card`

## Validation
Passed:
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`
- `node scripts/verify-market-integrity-no-truncation.mjs`
- `node scripts/verify-shield-design-safety.mjs`

Static checks:
- raw `<img>` in TSX: 0
- direct MapIterator spreads: 0
- likely unescaped JSX apostrophes: 0

## Important limitation
This does not give financial advice and does not tell users to buy or sell.
It is an educational risk/transparency layer.

Real web OSINT adapters are still required for true final verdicts.
