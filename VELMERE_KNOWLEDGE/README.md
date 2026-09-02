# VELMERE KNOWLEDGE LAYER — README

This directory is a persistent project-intelligence layer created on top of the
existing Velmère master mission (`promptminimax.txt`).

It is NOT a replacement for the master mission. The master mission remains
authoritative for what must be done. This knowledge layer is durable memory
of what is currently known about the project, so future sessions do not have
to rediscover the same facts repeatedly.

## How to use this knowledge layer

1. At the START of every new session, read in this order:
   - `00_MASTER_CONTEXT.md` — compressed understanding of Velmère
   - `14_CURRENT_STATE.md` — where we are right now
   - `15_BLOCKERS.md` — what is blocking us
   - `16_DECISIONS.md` — decisions already taken (do not re-litigate)
   - `13_ROADMAP_AND_PASS_STATE.md` — current pass / checkpoint
2. Read the specialized files relevant to the current task.
3. Do not read all 22 files every time — only what the task needs.
4. After every major pass, UPDATE the relevant files per the protocol in
   `21_AGENT_OPERATING_RULES.md`.

## Source-of-truth hierarchy

```
1. CURRENT LOCAL IMPLEMENTATION       (highest authority)
2. CURRENT EXECUTION RESULTS
3. CURRENT CONFIGURATION / RUNTIME
4. CURRENT TEST RESULTS
5. CURRENT EVIDENCE ARTIFACTS
6. CURRENT PROJECT DOCUMENTATION
7. GIT HISTORY
8. HISTORICAL REPORTS
9. HISTORICAL AI CLAIMS              (lowest authority)
```

When sources conflict: determine authority, do not average, do not pick
the prettier result. Master mission section 57 enforces this.

## Evidence classifications used everywhere

```
PROVEN_LOCAL               — verified against current local implementation
PROVEN_PRODUCTION          — verified in production environment
SAFE_WITHHELD              — intentionally not delivered, safely, with notice
EXTERNAL_BLOCKER           — requires external input (creds / rights / humans)
UNKNOWN                    — not investigated yet
DISPROVEN                  — investigated and found not to hold
HISTORICAL_UNTRUSTED       — old claim, not yet revalidated against current code
```

Additional internal data-source classifications:

```
REAL_PROVIDER_DATA
LOCAL_CACHE
CUSTOMER_INPUT
SYNTHETIC_FIXTURE
AI_SIMULATION
EXTERNAL_HUMAN_EVIDENCE
```

These must NEVER silently upgrade one into another.

## File index

| File | Role |
|---|---|
| 00_MASTER_CONTEXT.md | Compressed project understanding |
| 01_ARCHITECTURE.md | Actual implementation memory |
| 02_PRODUCTS.md | Per-product implementation & status |
| 03_TIERS_AND_ENTITLEMENTS.md | Tier behavior & entitlement enforcement |
| 04_SECURITY.md | Security boundaries & test results |
| 05_ANGEL_AI.md | AI / Angel behavior, grounding, refusals |
| 06_MARKET_DATA.md | Provider technical access per data source |
| 07_PROVIDER_RIGHTS.md | Provider commercial / display / cache rights |
| 08_SUPABASE_AND_DATA_BOUNDARIES.md | DB state, RLS, migrations |
| 09_PAYMENTS_AND_COMMERCE.md | Payment state machine, stop-sell |
| 10_CUSTOMER_VALIDATION.md | 20 customer rows, personas |
| 11_PDF_AND_ARTIFACTS.md | PDF generation, signing, security |
| 12_I18N_MOBILE_ACCESSIBILITY.md | Locale + viewport parity |
| 13_ROADMAP_AND_PASS_STATE.md | Current pass, checkpoints |
| 14_CURRENT_STATE.md | First file to read every session |
| 15_BLOCKERS.md | All blockers, IDs, statuses |
| 16_DECISIONS.md | Decision log |
| 17_EVIDENCE_INDEX.md | Searchable evidence registry |
| 18_TEST_AND_VERIFICATION_MAP.md | What each verifier actually proves |
| 19_CHANGELOG.md | Material changes log |
| 20_OPEN_QUESTIONS.md | Genuinely unresolved questions |
| 21_AGENT_OPERATING_RULES.md | How to use this knowledge layer |

## Created

2026-09-02 by opencode session for Velmère master mission.

Knowledge layer initialized from current local repository inspection
(Pas 1 discovery of `promptminimax.txt` master mission). Where direct
inspection was not possible without running things, fields are marked
UNKNOWN / NOT_INVESTIGATED / EXTERNAL_BLOCKER. Future passes will fill
them with real evidence.