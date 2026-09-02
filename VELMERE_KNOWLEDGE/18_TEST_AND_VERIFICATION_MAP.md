# 18 — TEST AND VERIFICATION MAP

UPDATED: 2026-09-02 | CLASSIFICATION: HISTORICAL_UNTRUSTED until inspected

A script named `verify-production-readiness` is not automatically evidence
of production readiness. Inspect assertions. Inspect dependencies. Inspect
whether it can falsely pass. Inspect whether it tests the actual intended
behavior.

Per master mission §87–89, this is mandatory for every verifier.

## Per-test format

```
TEST:
LOCATION:
INPUT:
ASSERTIONS:
SYSTEM:
WHAT IT PROVES:
WHAT IT DOES NOT PROVE:
DEPENDENCIES:
WEAKNESSES:
STATUS:
```

---

## Test categories observed in Pas 1

scripts/ contains 79 subdirectories. Categories include:

- pass14..pass36 — verification passes
- a34..a97 — acceptance scripts
- deployment/ — build / smoke / preflight
- runtime-config/ — runtime contract
- preflight/ — pre-build checks
- lib/ — shared helpers

Each contains multiple .mjs / .ts scripts.

## Tests run in Pas 1 (only 1)

| Test | Result | What it proves |
|---|---|---|
| npm run syntax:pass15 | PASS (2292 files, 0 errors) | TypeScript syntax only — not type correctness, not runtime, not business logic |

## Tests NOT yet run in Pas 1

| Test | Why not run | Pas |
|---|---|---|
| npm run lint:direct | Timeout (180s insufficient) | Pas 7 |
| npm run typecheck | Not yet scheduled | Pas 7 |
| npm run test | Full suite — deferred until Pas 2+ | Pas 7 |
| npm run build | Deferred — A42 blocks | Pas 20 |
| All scripts under scripts/pass36/* | Deferred to their respective pas | Per script |

## Tests scheduled per Pas

- Pas 1: syntax:pass15 ✓
- Pas 2: real product workflows (route load + customer journey)
- Pas 3: security matrix (IDOR, BOLA, BFLA, SSRF, XSS, CSRF, replay)
- Pas 4: stop-sell boundary, RLS, entitlement
- Pas 5: Angel adversarial tests
- Pas 6: PDF per tier × locale × asset
- Pas 7: test quality audit (placeholder, hardcoded scores, silent catch)
- Pas 8: 100 customer journeys
- Pas 9: provider rights matrix
- Pas 10: Chainlink/Pyth/CoinGecko/DeFiLlama/etc evaluation
- Pas 11: multi-pass / final stop condition
- Pas 12: provider matrix + rights engine
- Pas 13: Shield/Real Markets/Audit Basic improvement
- Pas 14: Angel over-withholding fix + 5760 mutation suite
- Pas 15: browser SPA fix
- Pas 16: payment state machine
- Pas 17: Supabase RLS two-tenant test
- Pas 18: PDF + RWA Passport
- Pas 19: security matrix + public claims audit
- Pas 20: CI/build + secrets + git forensics
- Pas 21: final completion gate

## Test quality concerns to audit (per master mission §43)

Patterns to look for:

- expect(true).toBe(true) — empty PASS
- Empty test bodies
- Skipped tests (test.skip without justification)
- Unconditional PASS
- Hardcoded score
- Hardcoded customer result
- Silent catch (errors swallowed without trace)
- Warning replacing failure
- 503 automatically interpreted as secure
- HTTP 200 interpreted as correctness
- Fake receipt
- Fake customer
- Fake reviewer
- Simulation mislabeled as live

## Weakness audit plan (Pas 7)

For each npm script under scripts/ that claims PASS:
1. Read the script
2. Identify the assertion
3. Test with a known-bad input
4. Verify the script actually fails
5. If it does not fail, mark as weak

This is the test-harness audit.

## Verifier families observed

| Family | Purpose | Sample |
|---|---|---|
| accept:* | Acceptance per round | accept:browser:a45, accept:data:a46 |
| audit:* | Audit contract | audit:database, audit:i18n-semantic |
| build:* | Build manifest / descendant | build:pass36:a102r12-descendant |
| gate:* | Gate checks | gate:release, gate:domain |
| pass35:* | Pass35 family | pass35:audit-a01-a05 |
| pass36:* | Pass36 family | pass36:a87 |
| test:pass35:* | Pass35 test family | test:pass35:a11 |
| verify:* | Verify | verify:pass36:a81 |

Each family has its own structure. Not all are equally rigorous.

## What Pas 7 will produce

- Per-verifier map: what it asserts, what it depends on, what it doesn't prove
- List of weak verifiers (placeholder, hardcoded PASS, etc.)
- Plan to strengthen or remove weak verifiers

Until then, treat aggregate `npm run test` results with caution — they
may include weak verifiers that pass without proving anything.