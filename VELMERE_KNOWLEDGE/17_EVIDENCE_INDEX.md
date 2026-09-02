# 17 — EVIDENCE INDEX

UPDATED: 2026-09-02

Searchable index of real evidence. Format:

```
EVIDENCE ID:
CLAIM:
SOURCE:
COMMAND:
TIMESTAMP:
HEAD:
RUNTIME:
ARTIFACT:
STATUS:
SCOPE:
VALID UNTIL / INVALIDATED BY:
```

ONE evidence item MUST NEVER be used to prove UNRELATED claims.

---

## E-001

```
EVIDENCE ID: E-001
CLAIM: Git state — current branch is master, HEAD is 6cde41f
SOURCE: git CLI
COMMAND: git status; git branch --show-current; git log -1 --oneline
TIMESTAMP: 2026-09-02
HEAD: 6cde41f fix(security): filter payment entitlement manipulation patterns in AI input
RUNTIME: Windows PowerShell 5.1, Git for Windows
ARTIFACT: reports/pas1-discover.md section 1
STATUS: PROVEN_LOCAL
SCOPE: git state only — does NOT prove any code is correct
VALID UNTIL: next commit, branch change, or repo state change
```

## E-002

```
EVIDENCE ID: E-002
CLAIM: Runtime is Node 24.18.0 and npm 11.16.0
SOURCE: node --version; npm.cmd --version
COMMAND: node --version; & "C:\Program Files\nodejs\npm.cmd" --version
TIMESTAMP: 2026-09-02
HEAD: 6cde41f
RUNTIME: Native shell
ARTIFACT: reports/pas1-discover.md section 2
STATUS: PROVEN_LOCAL
SCOPE: runtime only — does NOT prove any package works correctly
VALID UNTIL: Node or npm version change
```

## E-003

```
EVIDENCE ID: E-003
CLAIM: Next.js 16.2.12 and React 19.2.7 are installed
SOURCE: package.json + node_modules
COMMAND: Get-Content package.json | ConvertFrom-Json; Get-Content node_modules/next/package.json | ConvertFrom-Json
TIMESTAMP: 2026-09-02
HEAD: 6cde41f
RUNTIME: PowerShell
ARTIFACT: reports/pas1-discover.md section 2 + 3
STATUS: PROVEN_LOCAL
SCOPE: dependency presence — does NOT prove build succeeds or app runs
VALID UNTIL: package.json or node_modules change
```

## E-004

```
EVIDENCE ID: E-004
CLAIM: .env.local contains 8 keys (Supabase×6, Gemini×1, JWKS×1)
SOURCE: .env.local inspection (values masked)
COMMAND: Get-Content .env.local with masking
TIMESTAMP: 2026-09-02
HEAD: 6cde41f
RUNTIME: PowerShell
ARTIFACT: reports/pas1-discover.md section 4
STATUS: PROVEN_LOCAL
SCOPE: env presence only — does NOT prove keys are valid or services work
VALID UNTIL: .env.local change
```

## E-005

```
EVIDENCE ID: E-005
CLAIM: 7 keys MISSING from .env.local (CoinGecko, Pyth, Stripe×2, DeFiLlama,
        TwelveData, admin×2, Alpha Vantage, Redis×2)
SOURCE: .env.local inspection
COMMAND: same as E-004
TIMESTAMP: 2026-09-02
HEAD: 6cde41f
RUNTIME: PowerShell
ARTIFACT: reports/pas1-discover.md section 4 + B-001..B-004
STATUS: PROVEN_LOCAL
SCOPE: env absence — does NOT prove external services would work if keys added
VALID UNTIL: .env.local change
```

## E-006

```
EVIDENCE ID: E-006
CLAIM: TypeScript syntax scan of 2292 files = 0 parse errors
SOURCE: scripts/pass15/run-typescript-syntax-scan.mjs
COMMAND: npm run syntax:pass15
TIMESTAMP: 2026-09-02
HEAD: 6cde41f
RUNTIME: Node 24.18.0, npm 11.16.0
ARTIFACT: stdout of script (not saved to file)
STATUS: PROVEN_LOCAL
SCOPE: syntax only — does NOT prove type correctness, runtime correctness,
       or business logic correctness
VALID UNTIL: source files change materially
```

## E-007

```
EVIDENCE ID: E-007
CLAIM: Stop Guard exists at .agents/hooks/stop-guard.js (168 lines, 6895 bytes)
SOURCE: file system
COMMAND: Get-Item .agents/hooks/stop-guard.js
TIMESTAMP: 2026-09-02
HEAD: 6cde41f
RUNTIME: PowerShell
ARTIFACT: reports/pas1-discover.md section 7A
STATUS: PROVEN_LOCAL
SCOPE: file presence — does NOT prove the hook is correctly configured
VALID UNTIL: stop-guard.js change or .agents/hooks.json change
```

## E-008

```
EVIDENCE ID: E-008
CLAIM: VELMERE_ACTIVE_PASS.txt declares ACTION_REQUIRED state
SOURCE: VELMERE_ACTIVE_PASS.txt content
COMMAND: Get-Content VELMERE_ACTIVE_PASS.txt
TIMESTAMP: 2026-09-02
HEAD: 6cde41f
RUNTIME: PowerShell
ARTIFACT: reports/pas1-discover.md section 7 + B-005
STATUS: PROVEN_LOCAL
SCOPE: pass state only — does NOT prove project is broken, only that
       contract is out of sync
VALID UNTIL: VELMERE_ACTIVE_PASS.txt change
```

## E-009

```
EVIDENCE ID: E-009
CLAIM: A42 critical-files sha256 mismatch blocks dev server
SOURCE: scripts/velmere-dev-bootstrap.mjs output
COMMAND: npm run dev
TIMESTAMP: 2026-09-02
HEAD: 6cde41f
RUNTIME: Node 24.18.0, npm 11.16.0
ARTIFACT: stdout of npm run dev (visible in chat)
STATUS: PROVEN_LOCAL
SCOPE: dev server start failure — does NOT prove anything else is broken
VALID UNTIL: files match A42 contract
```

## E-010

```
EVIDENCE ID: E-010
CLAIM: 135 SQL migrations exist in supabase/migrations/
SOURCE: directory scan
COMMAND: Get-ChildItem supabase/migrations -File | Measure-Object
TIMESTAMP: 2026-09-02
HEAD: 6cde41f
RUNTIME: PowerShell
ARTIFACT: this evidence index entry
STATUS: PROVEN_LOCAL
SCOPE: migration file count — does NOT prove migrations are applied to remote
VALID UNTIL: new migrations added
```

## E-011

```
EVIDENCE ID: E-011
CLAIM: Pyth provider added to config/pass21/provider-commercial-rights-registry.json
        with rightsState: UNVERIFIED
SOURCE: git diff of the registry file
COMMAND: git diff config/pass21/provider-commercial-rights-registry.json
TIMESTAMP: 2026-09-02
HEAD: 6cde41f
RUNTIME: PowerShell
ARTIFACT: reports/pas1-discover.md section 7 + B-002
STATUS: PROVEN_LOCAL
SCOPE: registry entry — does NOT prove Pyth is integrated or commercial rights exist
VALID UNTIL: registry file change
```

## E-012

```
EVIDENCE ID: E-012
CLAIM: 82 files unstaged (modified), no remote configured
SOURCE: git status
COMMAND: git status --short | Measure-Object
TIMESTAMP: 2026-09-02
HEAD: 6cde41f
RUNTIME: PowerShell
ARTIFACT: B-006 + B-007
STATUS: PROVEN_LOCAL
SCOPE: git working tree state
VALID UNTIL: next commit or stash
```

## E-013

```
EVIDENCE ID: E-013
CLAIM: Recent commits show no bypass/disable/skip patterns
SOURCE: git log --grep
COMMAND: git log --grep="bypass\|disable\|skip\|@ts-ignore\|eslint-disable" --oneline -20
TIMESTAMP: 2026-09-02
HEAD: 6cde41f
RUNTIME: PowerShell
ARTIFACT: reports/pas1-discover.md section 7
STATUS: PROVEN_LOCAL
SCOPE: commit message patterns only — does NOT prove no bypass exists in code
VALID UNTIL: new commits
```

## E-014

```
EVIDENCE ID: E-014
CLAIM: Provider adapters present in code (CoinGecko, Pyth, Alpha Vantage,
        Binance×3, DeFiLlama×2)
SOURCE: file system
COMMAND: Get-ChildItem lib/market-integrity -File | Where-Object filter
TIMESTAMP: 2026-09-02
HEAD: 6cde41f
RUNTIME: PowerShell
ARTIFACT: 06_MARKET_DATA.md
STATUS: PROVEN_LOCAL
SCOPE: file presence — does NOT prove adapters work or are integrated
VALID UNTIL: adapters removed or new ones added
```

## E-015

```
EVIDENCE ID: E-015
CLAIM: Progress ledger .agents/state/velmere-progress.json declares many
        areas as "verified" with evidence pointers
SOURCE: file content
COMMAND: Get-Content .agents/state/velmere-progress.json
TIMESTAMP: 2026-09-02
HEAD: 6cde41f
RUNTIME: PowerShell
ARTIFACT: B-010
STATUS: HISTORICAL_UNTRUSTED
SCOPE: ledger content — does NOT prove claims are still valid against
       current source
VALID UNTIL: revalidation per Pas 2..21
```

## Anti-pattern evidence (negative)

### N-E-001

```
EVIDENCE ID: N-E-001
CLAIM: lint:direct TIMED OUT after 180s — could not complete baseline lint
SOURCE: npm CLI
COMMAND: npm run lint:direct
TIMESTAMP: 2026-09-02
HEAD: 6cde41f
RUNTIME: Node 24.18.0, npm 11.16.0
ARTIFACT: reports/pas1-discover.md section 5
STATUS: PROVEN_LOCAL
SCOPE: timeout — does NOT prove lint fails, only that 180s is insufficient
         for this codebase
VALID UNTIL: ESLint rules change
```

## Evidence per Pas (placeholders)

Pas 1: E-001 to E-015 (this index)
Pas 2: NOT YET CREATED
Pas 3: NOT YET CREATED
Pas 4: NOT YET CREATED
Pas 5: NOT YET CREATED
Pas 6: NOT YET CREATED
Pas 7: NOT YET CREATED
Pas 8: NOT YET CREATED
Pas 9: NOT YET CREATED
Pas 10: NOT YET CREATED
Pas 11: NOT YET CREATED
Pas 12: NOT YET CREATED
Pas 13: NOT YET CREATED
Pas 14: NOT YET CREATED
Pas 15: NOT YET CREATED
Pas 16: NOT YET CREATED
Pas 17: NOT YET CREATED
Pas 18: NOT YET CREATED
Pas 19: NOT YET CREATED
Pas 20: NOT YET CREATED
Pas 21: NOT YET CREATED

Each Pas will produce its own evidence rows.