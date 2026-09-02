# 20 — OPEN QUESTIONS

UPDATED: 2026-09-02

Genuinely unresolved questions. Format:

```
QUESTION:
WHY IT MATTERS:
WHAT IS KNOWN:
WHAT IS UNKNOWN:
HOW TO VERIFY:
DEPENDENCIES:
STATUS:
```

---

## Q-001

```
QUESTION: Should we push to a new GitHub repo, and to which URL?
WHY IT MATTERS: Cannot distribute evidence / use CI / collaborate without remote
WHAT IS KNOWN: User said "Pushuj wszystko"; no remote configured
WHAT IS UNKNOWN: Repository URL; auth method (PAT, GitHub CLI, SSH, Desktop)
HOW TO VERIFY: User provides URL + auth method
DEPENDENCIES: B-005 (must commit first)
STATUS: OPEN — awaiting user input
```

## Q-002

```
QUESTION: Should we repair A42 runtime contract to allow dev server, or proceed
          without dev server?
WHY IT MATTERS: Many Pas 2+ tasks need dev server (real workflow tests)
WHAT IS KNOWN: 5/114 A42 checks fail; ACTIVE_PASS=ACTION_REQUIRED
                Three viable options identified:
                A) npm run repair:dev:a42 (re-binds contract)
                B) Commit + new PASS
                C) Proceed without dev server
WHAT IS UNKNOWN: User preference
HOW TO VERIFY: User chooses A / B / C
DEPENDENCIES: B-005
STATUS: OPEN — awaiting user input
```

## Q-003

```
QUESTION: For products currently in "STOP-SELL" state (Pro/Advanced tiers across
          products), is stop-sell intentional or should it be lifted?
WHY IT MATTERS: Affects Pas 2 (verify stop-sell) and Pas 16 (payment state machine)
WHAT IS KNOWN: Per Pas 0 review, stop-sell is active for Pro/Advanced; this is
               honest given capabilities not actually deliverable yet
WHAT IS UNKNOWN: Whether user wants this to remain or change
HOW TO VERIFY: User confirms
DEPENDENCIES: B-001..B-004 (some stop-sells may auto-lift once keys arrive)
STATUS: OPEN — recommended default: keep stop-sell until deliverables proven
```

## Q-004

```
QUESTION: For provider keys (B-001..B-004), is there a plan to obtain them?
WHY IT MATTERS: Determines which Misja 2 capabilities are reachable
WHAT IS KNOWN: 7 keys missing; many features depend on them
WHAT IS UNKNOWN: User timeline; which provider priorities
HOW TO VERIFY: User provides keys or confirms timeline
DEPENDENCIES: None for local work; affects Pas 9, 10, 13, 16
STATUS: OPEN — work continues in parallel per master mission §54
```

## Q-005

```
QUESTION: Is there a live Supabase staging environment with two test tenants
          we can authenticate against?
WHY IT MATTERS: Pas 17 needs cross-tenant test; without it, LIVE_SUPABASE_RLS
                can only be UNKNOWN_EXTERNAL
WHAT IS KNOWN: .env.local has Supabase URL + keys
WHAT IS UNKNOWN: Whether they point to a real accessible project with two tenants
HOW TO VERIFY: Test connection + check for tenant structure
DEPENDENCIES: B-008
STATUS: OPEN
```

## Q-006

```
QUESTION: For all historical "verified" claims in .agents/state/velmere-progress.json,
          should we revalidate all of them or only those needed for current pas?
WHY IT MATTERS: B-010 says treat as HISTORICAL_UNTRUSTED; full revalidation is
                large effort
WHAT IS KNOWN: Ledger has many "verified" entries with artifact references
WHAT IS UNKNOWN: Whether artifacts match current source
HOW TO VERIFY: Spot-check 3–5 entries per Pas; flag mismatches
DEPENDENCIES: None — can start in Pas 2
STATUS: OPEN — recommended approach: spot-check per pas
```

## Q-007

```
QUESTION: For 5760 Angel mutation suite, is it actively maintained or historical?
WHY IT MATTERS: Pas 14 will inspect it; need to know if expectations are current
WHAT IS KNOWN: Master mission §20 references it
WHAT IS UNKNOWN: Where it lives, whether it's up to date with current policy
HOW TO VERIFY: Find it in scripts/, inspect generation + assertions
DEPENDENCIES: Pas 5 / Pas 14 work
STATUS: OPEN
```

## Q-008

```
QUESTION: Are the 9 historical PDFs (3 tiers × 3 locales) actually generated
          against current source, or against a snapshot?
WHY IT MATTERS: Pas 6 + Pas 18 need to know if these are still valid evidence
WHAT IS KNOWN: Pas 0 review references them as "verified in previous sessions"
WHAT IS UNKNOWN: Whether they reflect current product
HOW TO VERIFY: Re-generate PDFs, diff against old ones, inspect content
DEPENDENCIES: B-005 (dev server may be needed for PDF generation)
STATUS: OPEN
```

## Q-009

```
QUESTION: Should we treat progress state as the canonical source for "what is
          verified" or revalidate everything from scratch?
WHY IT MATTERS: Affects efficiency vs trust balance
WHAT IS KNOWN: Master mission says progress state ≠ self-declaration (rule 4)
WHAT IS UNKNOWN: How aggressive to be with revalidation
HOW TO VERIFY: Define revalidation policy (per master mission §67 — actual
               evidence, not intention)
DEPENDENCIES: None
STATUS: RECOMMENDATION — revalidate every area as part of its pas
```

## Q-010

```
QUESTION: For 585 instruments in Real Markets catalog, are they real references
          or placeholders?
WHY IT MATTERS: Real Markets claims 585 instruments; need to verify content
WHAT IS KNOWN: Pas 0 review mentions this count
WHAT IS UNKNOWN: Whether they're real instruments or stub data
HOW TO VERIFY: Inspect catalog source, cross-check a sample
DEPENDENCIES: B-001 for live data; static catalog check doesn't need key
STATUS: OPEN — Pas 13 work
```

## Q-011

```
QUESTION: Should the knowledge layer (VELMERE_KNOWLEDGE/) be committed to git?
WHY IT MATTERS: If committed, it's part of the repo; if not, only local
WHAT IS KNOWN: It's currently a working-directory artifact
WHAT IS UNKNOWN: User preference
HOW TO VERIFY: User decides
DEPENDENCIES: B-006 (commit/push)
STATUS: OPEN — current default: NOT committed (it's session memory);
              can be committed if user wants
```

## Q-012

```
QUESTION: For the meta-mission's instruction to "build knowledge then continue
          engineering" — how do we know when knowledge layer is "ready enough"
          to start Pas 2?
WHY IT MATTERS: Avoid premature completion; avoid paralysis
WHAT IS KNOWN: Meta-mission §55 lists 16 tasks; we've completed ~14 of them
WHAT IS UNKNOWN: How strict to be about "complete" before proceeding
HOW TO VERIFY: Self-audit per meta-mission §34 checklist
DEPENDENCIES: None
STATUS: IN PROGRESS — writing remaining files (19, 20, 21) then proceeding
```

## Q-013

```
QUESTION: What's the relationship between the "82 unstaged modifications" and
          the A42 runtime contract drift?
WHY IT MATTERS: Helps decide between B-005 options
WHAT IS KNOWN: 82 files modified; A42 critical files specifically include
               app/, lib/security/, config/, scripts/, package.json
WHAT IS UNKNOWN: Whether all 82 contribute to drift or only the critical ones
HOW TO VERIFY: Inspect the 19 A42 critical files specifically
DEPENDENCIES: B-005
STATUS: OPEN — can investigate as part of B-005 resolution
```

## Q-014

```
QUESTION: Are there any passes currently in flight or in-progress by other agents
          that could conflict with our work?
WHY IT MATTERS: Avoid stepping on concurrent work
WHAT IS KNOWN: We are in a fresh opencode session; no other agent context
WHAT IS UNKNOWN: Whether user is running other tools in parallel
HOW TO VERIFY: User confirms
DEPENDENCIES: None
STATUS: ASSUMED NO — proceed autonomously unless told otherwise
```