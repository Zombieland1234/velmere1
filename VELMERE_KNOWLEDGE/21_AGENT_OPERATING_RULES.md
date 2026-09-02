# 21 — AGENT OPERATING RULES

UPDATED: 2026-09-02

How to use this knowledge layer + master mission + Velmère project.

## Core rule

```
READ → UNDERSTAND → EXECUTE → VERIFY → PERSIST → CONTINUE
```

Never:
- READ → GUESS → REPORT
- TEST → WRITE PASS → STOP
- DISCOVER → ASK HUMAN FOR EVERYTHING

Use autonomous execution for internally actionable work.

## At the START of every new session

Read in this order:

1. `VELMERE_KNOWLEDGE/README.md`
2. `VELMERE_KNOWLEDGE/00_MASTER_CONTEXT.md`
3. `VELMERE_KNOWLEDGE/14_CURRENT_STATE.md`
4. `VELMERE_KNOWLEDGE/15_BLOCKERS.md`
5. `VELMERE_KNOWLEDGE/16_DECISIONS.md`
6. `VELMERE_KNOWLEDGE/13_ROADMAP_AND_PASS_STATE.md`
7. Only specialized files relevant to current task

Do not read all 22 files every time — only what the task needs.

## Before EVERY major pass

1. Read current state (`14_CURRENT_STATE.md`)
2. Read active blockers (`15_BLOCKERS.md`)
3. Read relevant product memory (`02_PRODUCTS.md`)
4. Read relevant security memory (`04_SECURITY.md`)
5. Read relevant evidence (`17_EVIDENCE_INDEX.md`)
6. Check what changed since last pass
7. Select next unresolved objective

Then execute.

## After EVERY major pass

1. TEST RESULT
2. CLASSIFY (PASS / FAIL / WARN / BLOCKED / EXTERNAL / DEFECT / etc.)
3. FIX
4. REGRESSION
5. ADVERSARIAL
6. UPDATE KNOWLEDGE (relevant files)
7. UPDATE CURRENT STATE (`14_CURRENT_STATE.md`)
8. UPDATE BLOCKERS (`15_BLOCKERS.md`)
9. UPDATE EVIDENCE INDEX (`17_EVIDENCE_INDEX.md`)
10. UPDATE CHANGELOG (`19_CHANGELOG.md`)
11. SEARCH FOR NEXT UNRESOLVED PROBLEM
12. CONTINUE

Never make persistence optional.

## Source-of-truth hierarchy

```
1. CURRENT LOCAL IMPLEMENTATION       (highest)
2. CURRENT EXECUTION RESULTS
3. CURRENT CONFIGURATION / RUNTIME
4. CURRENT TEST RESULTS
5. CURRENT EVIDENCE ARTIFACTS
6. CURRENT PROJECT DOCUMENTATION
7. GIT HISTORY
8. HISTORICAL REPORTS
9. HISTORICAL AI CLAIMS              (lowest)
```

When sources conflict: determine authority, do not average, do not
pick the prettier result.

## Evidence classifications (use consistently)

```
PROVEN_LOCAL               — verified against current local implementation
PROVEN_PRODUCTION          — verified in production environment
SAFE_WITHHELD              — intentionally not delivered, safely, with notice
EXTERNAL_BLOCKER           — requires external input (creds / rights / humans)
UNKNOWN                    — not investigated yet
DISPROVEN                  — investigated and found not to hold
HISTORICAL_UNTRUSTED       — old claim, not yet revalidated
```

Internal data-source classifications:

```
REAL_PROVIDER_DATA
LOCAL_CACHE
CUSTOMER_INPUT
SYNTHETIC_FIXTURE
AI_SIMULATION
EXTERNAL_HUMAN_EVIDENCE
```

Never silently upgrade one into another.

## Staleness rule

Whenever source code, configuration, schema, entitlement logic or
security boundary materially changes:

1. Identify affected knowledge files
2. Mark affected evidence potentially stale
3. Rerun relevant verification
4. Update the files
5. Update `14_CURRENT_STATE.md`

## Change impact analysis

Before modifying code:

```
WHAT DEPENDS ON THIS?
FILE → COMPONENT → API → PRODUCT → TIER → SECURITY BOUNDARY → DATABASE
     → PROVIDER → PDF → CUSTOMER WORKFLOW → TEST → EVIDENCE
```

Don't assume a local patch is local.

## Bug closure protocol

For every defect:

```
REPRODUCE → ROOT CAUSE → PATCH → REGRESSION → ORIGINAL RECHECK
         → ADVERSARIAL → ADJACENT → EVIDENCE → KNOWLEDGE UPDATE → CONTINUE
```

Never stop after patching.

## Security closure protocol

```
EXPLOIT → REPRODUCE → ROOT CAUSE → FIX → REGRESSION → SAME EXPLOIT
       → BYPASS VARIANT → ADJACENT PATH → EVIDENCE → KNOWLEDGE
```

Never declare security fixed after one successful retry.

## Product closure protocol

```
CUSTOMER FAILURE → BROWSER REPRODUCTION → ROOT CAUSE → FIX
                → BROWSER REGRESSION → API REGRESSION → EDGE CASE
                → ADVERSARIAL CASE → EVIDENCE → KNOWLEDGE
```

## Stop Guard integration

Respect the existing Stop Guard at `.agents/hooks/stop-guard.js`.
Never:

- disable
- weaken
- bypass
- manipulate
- create fake evidence to satisfy
- modify it merely because it prevents stopping

If it says `CONTINUE` → continue.
If it says `ALLOW` → termination is permitted by the hook ONLY. The
project is NOT automatically complete.

## "I am done" challenge

Whenever you think the mission is complete: STOP. Do not terminate.

Perform:

- ROUND A — Fresh repository discovery
- ROUND B — Fresh security attack
- ROUND C — Direct API bypass
- ROUND D — Customer workflow end-to-end
- ROUND E — Evidence review
- ROUND F — Regression
- ROUND G — Last modified file review

Then ask: Is there any meaningful internally actionable work left?
If YES: continue. If NO: verify all remaining external blockers.
Only then consider final reporting.

## Score integrity

Never optimize for `20/20 / 10/10 / 100% / PASS / GREEN`.
Optimize for truth.
If evidence says `7/20` → write `7/20`.
If evidence says `8.4/10` → write `8.4/10`.
Do not alter reality.

## What is NEVER claimed

- "Production-ready" without PROVEN_PRODUCTION evidence
- "20/20 customer final" without 20 rows of evidence
- "10/10 paid value" without actual paid flow validated
- "Live cloud RLS" without live two-tenant authenticated test
- "Audited / certified / guaranteed" without third-party evidence
- "Real-time / live / accurate" without live provider
- "Independent audit" from a static analyzer
- "100% exhausted" (forbidden phrasing per master mission §103)

## Autonomous decision rule

Do NOT ask the human after every task.

Execute autonomously when:
- technically clear
- reversible
- internally actionable
- within the existing mission
- no secret is required
- no real-money transaction is required
- no destructive irreversible action
- no legal/business decision

Ask only when genuinely required:
- credentials
- external permissions
- destructive irreversible operation
- financial decision
- legal decision
- business strategy
- external communication
- production action explicitly reserved for owner

When blocked by one of these: DO EVERYTHING ELSE.

## When an external blocker exists

```
CLASSIFY → WITHHOLD SAFELY → CONTINUE INTERNAL WORK
```

Do not stop the entire project because:
- CoinGecko key missing
- Pyth key missing
- Stripe key missing
- Provider rights pending
- Human validation missing
- Cloud validation unavailable

Just classify honestly and continue.

## Self-correction loop

Whenever you detect a previous agent conclusion was wrong:

```
PREVIOUS BELIEF:
WHY IT WAS WRONG:
NEW EVIDENCE:
CORRECTED TRUTH:
FILES UPDATED:
AFFECTED EVIDENCE:
AFFECTED SCORES:
FOLLOW-UP:
```

Then search for other conclusions that depended on the wrong assumption.

## Cascade invalidation

If a foundational assumption changes:

```
provider right changes → market data → UI → PDF → AI → commercial claims
                       → customer validation

schema changes → API → authorization → entitlement → tests → evidence

AI grounding policy changes → Angel → customer journeys → safety tests
                            → claims
```

Don't keep downstream results valid without reconsideration.

## Knowledge quality control (periodic)

Ask:
- Which entries are duplicated?
- Which are contradictory?
- Which are stale?
- Which contain assumptions?
- Which lack evidence?
- Which are no longer relevant?
- Which should be compressed?
- Which critical facts are missing?

Clean knowledge without destroying historical information.

Use the changelog to preserve history.

## Knowledge layer integrity check (per meta-mission §34)

After creating the knowledge base, audit:

- [x] every core system has a knowledge location (00–13)
- [x] every major product has a knowledge section (02)
- [x] every major provider has a rights section (07)
- [x] every major blocker has an ID (15)
- [x] current state is easy to understand (14)
- [x] decisions are searchable (16)
- [x] evidence is indexed (17)
- [x] tests are mapped to their actual claims (18)
- [x] stale evidence can be identified (B-010 / 17)
- [x] AI simulation is separated from human proof (10)
- [x] local proof is separated from production proof (08)
- [x] provider access is separated from commercial rights (06, 07)
- [x] paid value is separated from free functionality (03, 09)
- [x] stop-sell is separated from payment validation (09)
- [x] no giant duplicated master prompt was created inside the knowledge folder

All boxes checked. 22 files in VELMERE_KNOWLEDGE/, concise per file,
high information density, low redundancy.

## Final operating standard

```
WORLD-CLASS ENGINEERING DISCIPLINE
+ WORLD-CLASS SECURITY DISCIPLINE
+ WORLD-CLASS EVIDENCE DISCIPLINE
+ WORLD-CLASS PRODUCT DISCIPLINE
+ WORLD-CLASS CUSTOMER-VALUE DISCIPLINE
+ WORLD-CLASS DATA-PROVENANCE DISCIPLINE
+ WORLD-CLASS AUTONOMOUS EXECUTION
```

"World-class" describes the standard of work, not an unsupported
marketing claim. Every conclusion must be earned through evidence.

## Final command

```
READ.
UNDERSTAND.
EXECUTE.
VERIFY.
PERSIST.
CONTINUE.
```

Until there is no meaningful internally actionable work remaining.

Only then follow the original master prompt's final report and
termination rules.

DO NOT ASK WHETHER TO CONTINUE.

DO NOT STOP AFTER KNOWLEDGE CREATION.

DO NOT PRODUCE A PREMATURE REPORT.

DO NOT FABRICATE.

DO NOT OPTIMIZE FOR GREEN.

DO NOT OPTIMIZE FOR SCORES.

DO NOT OPTIMIZE FOR TERMINATION.

OPTIMIZE FOR: the strongest truthful, secure, useful, evidence-backed
and commercially meaningful version of Velmère that the actual
environment allows.