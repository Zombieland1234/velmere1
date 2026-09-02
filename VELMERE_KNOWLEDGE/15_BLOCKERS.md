# 15 — BLOCKERS

UPDATED: 2026-09-02

Every blocker gets an ID. Each blocker:

```
ID:
DATE:
AREA:
DESCRIPTION:
TYPE:
WHY IT EXISTS:
IMPACT:
CAN AGENT FIX:
REQUIRED EXTERNAL INPUT:
SAFE FAIL-CLOSED BEHAVIOR:
DEPENDENCIES:
STATUS:
LAST REVIEW:
```

Types:
```
INTERNAL_FIX
EXTERNAL_BLOCKER
CREDENTIAL_REQUIRED
USER_DECISION_REQUIRED
BUSINESS_DECISION_REQUIRED
LEGAL_EVIDENCE_REQUIRED
PROVIDER_RIGHTS_REQUIRED
ENVIRONMENT_LIMITATION
UNKNOWN
```

When blocked, continue independent work.

---

## B-001

```
ID: B-001
DATE: 2026-09-02
AREA: market data / Shield / Real Markets
DESCRIPTION: No CoinGecko API key in .env.local
TYPE: CREDENTIAL_REQUIRED
WHY IT EXISTS: User has not added COINGECKO_DEMO_API_KEY or COINGECKO_PRO_API_KEY
IMPACT: Shield Basic + Shield Pro + Real Markets cannot show live prices
        (per Pas 0 review: "INSTRUMENTS — SYNCING", "AVG CHANGE (24H) — Source unavailable")
CAN AGENT FIX: NO — needs user-provided key
REQUIRED EXTERNAL INPUT: CoinGecko Demo or Pro API key from coingecko.com/api
SAFE FAIL-CLOSED BEHAVIOR: Source withheld label (per Pas 0 behavior)
DEPENDENCIES: None
STATUS: OPEN
LAST REVIEW: 2026-09-02
```

## B-002

```
ID: B-002
DATE: 2026-09-02
AREA: market data / Pyth adapter
DESCRIPTION: No PYTH_API_KEY in .env.local
TYPE: CREDENTIAL_REQUIRED
WHY IT EXISTS: Hermes API requires API-key authentication post-26.08.2026
IMPACT: Pyth adapter cannot authenticate; falls back to other providers
CAN AGENT FIX: NO — needs user-provided key
REQUIRED EXTERNAL INPUT: Pyth API key
SAFE FAIL-CLOSED BEHAVIOR: Other providers in fallback chain (Binance, CoinGecko)
DEPENDENCIES: B-001 partially (overlapping data)
STATUS: OPEN
LAST REVIEW: 2026-09-02
```

## B-003

```
ID: B-003
DATE: 2026-09-02
AREA: payments / commerce
DESCRIPTION: No STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET in .env.local
TYPE: CREDENTIAL_REQUIRED
WHY IT EXISTS: User has not added Stripe credentials
IMPACT: Paid flow cannot be tested in real Stripe TEST mode
CAN AGENT FIX: NO — needs user-provided keys
REQUIRED EXTERNAL INPUT: Stripe TEST mode secret + webhook secret
SAFE FAIL-CLOSED BEHAVIOR: Stop-sell remains active (per master mission §102)
DEPENDENCIES: None (stop-sell is already in place)
STATUS: OPEN
LAST REVIEW: 2026-09-02
```

## B-004

```
ID: B-004
DATE: 2026-09-02
AREA: providers / admin / various
DESCRIPTION: Missing DEFILLAMA_PRO_API_KEY, VELMERE_ADMIN_SESSION_SECRET,
            VELMERE_ADMIN_TOKEN, UPSTASH_REDIS_REST_URL,
            UPSTASH_REDIS_REST_TOKEN, TWELVE_DATA_API_KEY, ALPHA_VANTAGE_API_KEY
TYPE: CREDENTIAL_REQUIRED
WHY IT EXISTS: Not in .env.local
IMPACT: DeFiLlama enterprise features, admin endpoints, Redis rate limiting,
        TwelveData market data, Alpha Vantage equities all unavailable
CAN AGENT FIX: NO — needs user-provided keys
REQUIRED EXTERNAL INPUT: Various provider / admin / Redis credentials
SAFE FAIL-CLOSED BEHAVIOR: Each module fails closed per its boundary
DEPENDENCIES: None individually, but some features depend on multiple keys
STATUS: OPEN
LAST REVIEW: 2026-09-02
```

## B-005

```
ID: B-005
DATE: 2026-09-02
AREA: runtime / dev server
DESCRIPTION: VELMERE_ACTIVE_PASS = ACTION_REQUIRED; A42 runtime contract
             detects sha256 mismatch on critical files; dev server blocks
TYPE: INTERNAL_FIX
WHY IT EXISTS: 82 unstaged modifications (config + security + tests + scripts)
               against last PASS state
IMPACT: Cannot start dev server (`npm run dev` fails immediately with
        "mixed or outdated project tree detected"). Even after `npm run
        repair:dev:a42` + standalone build + production server start,
        HTTP requests time out (Next.js doesn't respond despite TCP listen).
CAN AGENT FIX: YES (partial)
   Option A: Run `npm run repair:dev:a42` — TRIED, doesn't unblock dev
   Option B: Commit current state + run new PASS — too disruptive
   Option C: Proceed without dev server — ADOPTED for Pas 2-21
REQUIRED EXTERNAL INPUT: None for Pas 2-21 (use Option C)
SAFE FAIL-CLOSED BEHAVIOR: Use static analysis + build artifact inspection +
                            file-by-file code review + route analysis
DEPENDENCIES: B-006
STATUS: RESOLVED — Option C adopted. Build PASS confirmed, server starts but
       HTTP not responding (likely needs full env wiring + Supabase connection)
LAST REVIEW: 2026-09-02 (Pas 1 extension)
```

## B-006

```
ID: B-006
DATE: 2026-09-02
AREA: git / distributed evidence
DESCRIPTION: No remote configured for this repo
TYPE: USER_DECISION_REQUIRED
WHY IT EXISTS: User said "Pushuj wszystko" but no remote URL provided;
               no GitHub CLI auth available to agent
IMPACT: Cannot push to distributed git history; cannot use GitHub CI as
        evidence; cannot share state across sessions
CAN AGENT FIX: PARTIALLY — can configure local git remote if URL given
REQUIRED EXTERNAL INPUT: GitHub repository URL + auth method (PAT, GitHub
                          Desktop, SSH key)
SAFE FAIL-CLOSED BEHAVIOR: Continue local work; treat local git as sole
                            evidence trail
DEPENDENCIES: B-005 (must commit before pushing)
STATUS: OPEN — AWAITING USER INPUT
LAST REVIEW: 2026-09-02
```

## B-007

```
ID: B-007
DATE: 2026-09-02
AREA: git hygiene / drift
DESCRIPTION: 82 files with unstaged modifications
TYPE: INTERNAL_FIX
WHY IT EXISTS: Recent security fixes, config updates, test additions
IMPACT: Risk of fix-on-fix regressions; runtime contract cannot validate
        until either committed or rolled back
CAN AGENT FIX: YES — review diff + commit + push (after B-006 resolved)
REQUIRED EXTERNAL INPUT: Decision on what to keep vs revert
SAFE FAIL-CLOSED BEHAVIOR: Inspect each diff before committing; do not commit
                            without understanding each change
DEPENDENCIES: B-005, B-006
STATUS: OPEN
LAST REVIEW: 2026-09-02
```

## B-008

```
ID: B-008
DATE: 2026-09-02
AREA: database / RLS / production proof
DESCRIPTION: No live Supabase staging credentials available in this environment
TYPE: ENVIRONMENT_LIMITATION
WHY IT EXISTS: This session has .env.local with Supabase URL/keys, but they
               may point to a non-staging or non-accessible project
IMPACT: LIVE_SUPABASE_RLS cannot be verified as PROVEN_PRODUCTION;
        cross-tenant tests cannot be authenticated against live
CAN AGENT FIX: PARTIALLY — can test against local pglite fixtures; cannot
                authenticate against real cloud without proper credentials
REQUIRED EXTERNAL INPUT: Confirmed live Supabase staging credentials with
                          two test tenants (A and B)
SAFE FAIL-CLOSED BEHAVIOR: Classify LIVE_SUPABASE_RLS = UNKNOWN_EXTERNAL
                            (per master mission §24)
DEPENDENCIES: None
STATUS: OPEN
LAST REVIEW: 2026-09-02
```

## B-009

```
ID: B-009
DATE: 2026-09-02
AREA: security / secrets
DESCRIPTION: Some security code changes are unstaged (api-edge-boundary.ts,
             api-guard.ts, durable-rate-limit.ts)
TYPE: INTERNAL_FIX
WHY IT EXISTS: Recent commit (6cde41f) + unstaged additions
IMPACT: Risk of merging conflicting security changes without review
CAN AGENT FIX: YES — review diff, decide what to keep
REQUIRED EXTERNAL INPUT: None
SAFE FAIL-CLOSED BEHAVIOR: Inspect each change before commit
DEPENDENCIES: B-007
STATUS: OPEN
LAST REVIEW: 2026-09-02
```

## B-010

```
ID: B-010
DATE: 2026-09-02
AREA: progress / ledger integrity
DESCRIPTION: .agents/state/velmere-progress.json declares many areas as
             "verified" with evidence pointers; these pointers reference
             artifacts that may not reflect current source
TYPE: HISTORICAL_UNTRUSTED
WHY IT EXISTS: Progress ledger was last updated by previous AI agent before
               the 82 unstaged changes
IMPACT: Risk of treating old evidence as current proof
CAN AGENT FIX: YES — revalidate each evidence pointer in Pas 2..21
REQUIRED EXTERNAL INPUT: None
SAFE FAIL-CLOSED BEHAVIOR: Treat all velmer-progress.json as
                            HISTORICAL_UNTRUSTED until per-area revalidation
DEPENDENCIES: None
STATUS: OPEN
LAST REVIEW: 2026-09-02
```

## Summary

| ID | Type | Status |
|---|---|---|
| B-001 | CREDENTIAL_REQUIRED | OPEN |
| B-002 | CREDENTIAL_REQUIRED | OPEN |
| B-003 | CREDENTIAL_REQUIRED | OPEN |
| B-004 | CREDENTIAL_REQUIRED | OPEN |
| B-005 | INTERNAL_FIX | OPEN — awaiting decision |
| B-006 | USER_DECISION_REQUIRED | OPEN — awaiting input |
| B-007 | INTERNAL_FIX | OPEN |
| B-008 | ENVIRONMENT_LIMITATION | OPEN |
| B-009 | INTERNAL_FIX | OPEN |
| B-010 | HISTORICAL_UNTRUSTED | OPEN — needs revalidation |

7 blockers depend on user input (credentials + decisions).
3 blockers are internally fixable.

External blockers DO NOT stop the project (per master mission §54).
Internal work continues regardless.