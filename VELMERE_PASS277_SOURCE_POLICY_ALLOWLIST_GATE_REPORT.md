# PASS277 — Source Policy Allowlist Gate

## Scope

PASS277 moves to the next Velmère map ID after the adapter timeout/fallback lane: **L07 Allowlists / source policy**.

The pass adds a visible source-governance layer to the Shield token modal. It does not mark tokens as safe, does not provide trade instructions and does not turn social/fallback data into confidence.

## Web scan applied before implementation

- MEXC direction: market UX keeps depth/orderbook/live data close to the decision surface, and source/error state should not be hidden behind decorative UI.
- LVMH direction: premium trust is built through excellence, traceability, transparency, client recognition and calm proof cues rather than noisy urgency.

## Product changes

- New module: `lib/market-integrity/source-policy-allowlist-gate.ts`.
- New modal rail: `data-pass277-source-policy-allowlist-gate`.
- New UI innovation: **Private Source Passport**.
  - It appears only after allowlisted proof, second-source class and source policy are calm.
  - Unknown, fallback and social lanes stay operator-only or blocked until review.
  - This uses elite/status psychology as a quiet trust cue, not FOMO pressure.
- New lane model:
  - `trusted_preview`
  - `second_source`
  - `operator_only`
  - `blocked_until_review`
- New evidence classes:
  - exchange
  - indexer
  - explorer
  - official
  - social
  - fallback
  - unknown

## Safety boundary

Customer copy may mention review status only. Raw source payload, urgency, safety-certification language and financial advice language remain blocked.

## Progress delta

| ID | Area | Previous | Current | Change |
|---|---|---:|---:|---:|
| L07 | Allowlists / source policy | 44 | 53 | +9 |
| K02 | Source freshness registry | 58 | 61 | +3 |
| D16 | Source confidence lanes | 95 | 96 | +1 |
| D17 | Missing-data semantics | 98 | 99 | +1 |
| K05 | Privacy redaction envelope | 70 | 73 | +3 |
| M04 | Safe export wording | 93 | 94 | +1 |

**PASS277 product delta:** +18 points on touched rows.

## Validation

- `verify:pass277-source-policy-allowlist-gate`
- `verify:pass276-source-adapter-quorum-gate`
- `verify:pass275-osint-narrative-gate`
- `check:i18n`
- `vercel:preflight`

Full TypeScript build still depends on the project dependency install and older unresolved project-level type issues.
