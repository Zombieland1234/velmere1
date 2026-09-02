# 16 — DECISIONS

UPDATED: 2026-09-02

Decisions taken during this session. Format:

```
DECISION ID:
DATE:
CONTEXT:
QUESTION:
OPTIONS:
DECISION:
WHY:
EVIDENCE:
IMPACT:
REVERSIBILITY:
OWNER:
STATUS:
```

---

## D-001

```
DECISION ID: D-001
DATE: 2026-09-02
CONTEXT: User provided one large prompt file with embedded full master mission
QUESTION: How to structure the master mission prompt?
OPTIONS:
  A) Leave as 4822 lines flat
  B) Split into 2 separate mission files (Mission 1 + Mission 2)
  C) Add Progress Board + 21 pas structure on top, keep original content intact
WHY: User asked "uporzadkuj sobie nic z niego nie usuwaj" — preserve all content,
     but organize for easier execution tracking
DECISION: Option C — add Progress Board + pas structure, preserve all original
          content
EVIDENCE: promptminimax.bak.txt (original, 82982 bytes) + promptminimax.txt
          (new, 93422 bytes with PROGRESS BOARD + 21 pas sections)
IMPACT: Future sessions can mark [ ] → [✓] → [✓✓] per pas with audit gate
REVERSIBILITY: Fully reversible (restore from .bak.txt)
OWNER: User
STATUS: APPLIED
```

## D-002

```
DECISION ID: D-002
DATE: 2026-09-02
CONTEXT: User said "Pushuj wszystko" — push the whole folder to new GitHub repo
QUESTION: How to push without remote credentials?
OPTIONS:
  A) Try to set up remote via GitHub CLI (requires user's auth)
  B) Initialize local git, commit, prepare for user to push manually
  C) Ask user for remote URL + auth method
  D) Wait for user instruction
WHY: Agent cannot authenticate to GitHub without user credentials
DECISION: Option D pending; user input needed (B-006)
EVIDENCE: B-006 status
IMPACT: Cannot distribute evidence until user provides input
REVERSIBILITY: N/A (not yet applied)
OWNER: User
STATUS: PENDING
```

## D-003

```
DECISION ID: D-003
DATE: 2026-09-02
CONTEXT: VELMERE_ACTIVE_PASS = ACTION_REQUIRED; dev server blocks
QUESTION: How to proceed?
OPTIONS:
  A) Run `npm run repair:dev:a42` (re-binds contract)
  B) Commit + push + new PASS
  C) Skip dev server, do Pas 2 with static analysis + route inspection
WHY: A42 critical-file drift prevents dev server start
DECISION: Option C pending; user choice needed (B-005)
EVIDENCE: reports/pas1-discover.md section 7
IMPACT: Can still make progress on many tasks without dev server
REVERSIBILITY: Fully reversible
OWNER: User
STATUS: PENDING
```

## D-004

```
DECISION ID: D-004
DATE: 2026-09-02
CONTEXT: User provided a meta-mission to create VELMERE_KNOWLEDGE/ persistent
         memory layer
QUESTION: How to handle the master mission alongside the meta-mission?
OPTIONS:
  A) Replace master mission with meta-mission
  B) Add knowledge layer as supplement, keep master mission authoritative
  C) Integrate knowledge layer into master mission
WHY: Meta-mission §0 explicitly says "DO NOT replace" master mission
DECISION: Option B — knowledge layer is memory; master mission remains
          authoritative for what to do
EVIDENCE: master mission section "DO NOT replace it. DO NOT simplify it.
          DO NOT delete requirements from it."
IMPACT: Two layers: master mission (what to do) + knowledge layer (what we
        know). Clear separation maintained.
REVERSIBILITY: Fully reversible (delete VELMERE_KNOWLEDGE/)
OWNER: User + agent
STATUS: APPLIED
```

## D-005

```
DECISION ID: D-005
DATE: 2026-09-02
CONTEXT: Knowledge layer file structure
QUESTION: How many files to create?
OPTIONS:
  A) Full 22 files (per meta-mission §2 template)
  B) Reduced set (10–15 files)
  C) Just master context + current state
WHY: Meta-mission §35 forbids turning knowledge into a second master prompt;
     need high information density, low redundancy
DECISION: Start with 22 files but keep each concise; merge into fewer later
          if redundancy emerges
EVIDENCE: README.md, 00_MASTER_CONTEXT.md (both concise)
IMPACT: Comprehensive but maintainable
REVERSIBILITY: Files can be merged/deleted as needed
OWNER: Agent
STATUS: APPLIED
```

## D-006

```
DECISION ID: D-006
DATE: 2026-09-02
CONTEXT: 82 unstaged modified files including security code
QUESTION: Should the agent commit anything?
OPTIONS:
  A) Commit everything immediately
  B) Review each diff first, then commit
  C) Wait until B-006 (remote) is resolved
WHY: Security code changes need careful review (B-009); some changes may
     not be intended
DECISION: NOT commit yet; review diffs in Pas 3 / Pas 7 before any commit
EVIDENCE: Pas 1 unstaged diff inspection
IMPACT: Slow but safe; user can override
REVERSIBILITY: N/A (no commit happened)
OWNER: User + agent
STATUS: DEFERRED
```

## Pending decisions (waiting on user or future pas)

- D-002: B-006 remote setup (waiting on user)
- D-003: B-005 dev server path (waiting on user choice)

## Decisions that need NEVER be revisited

- D-001: promptminimax.txt reorganization (settled, reversible only if user
         explicitly asks)
- D-004: knowledge layer is supplement not replacement (per master mission
         "DO NOT replace")