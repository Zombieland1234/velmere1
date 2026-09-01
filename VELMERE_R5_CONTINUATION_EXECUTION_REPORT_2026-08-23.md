# VELMÈRE — R5 CONTINUATION EXECUTION REPORT

Classification: `AUDITED_CURRENT_SOURCE_CANDIDATE_R5 / NOT_A_CANONICAL_CHECKPOINT`

Canonical parent remains **P101R1**. R5 is a material current-source successor to R4. It does not claim authorized staging, attributable legal-rights approval, complete exact dependencies, exact Windows, Customer FINAL, GO_PAID or LIVE.

## Executive result

| Axis | R4 | R5 |
|---|---:|---:|
| Customer FINAL | 0/20 | **0/20** |
| Paid value FINAL | 0/10 | **0/10** |
| Local current-execution PASS | 37/47 | **38/48** |
| Dependency-environment WITHHELD | 7 | **7** |
| Actual local FAIL/TIMEOUT | 0 | **0** |
| Market Impact customer-owned input | absent | **PASS_BOUNDED end-to-end local route** |
| Market Impact source boundary | NO_USABLE_ORDER_BOOK only | **21/21 verifier + adversarial receipt tests** |
| Repeatability | 47/47 classification/exit | **48/48 classification/exit** |
| Exact dependency source closure | 70/618 | **70/618** |

## Material implementation

- Added a dedicated account-authenticated customer-owned market-evidence attestation endpoint.
- Added an HMAC-SHA256 authority receipt bound to account, canonical asset, exact normalized snapshot digest, issue time and expiry.
- Required explicit authority for private display, derived analytics, cache and retention; public display and redistribution stay denied.
- Forced customer snapshots to `verified_staging`, regardless of a submitted `verified_live` label.
- Added a separately authenticated `customer_owned_attested` Market Impact route that never fetches a provider.
- Preserved provider-owned delivery/publication preflights unchanged and fail-closed.
- Withheld derived risk, live claims and paid-depth publication for customer-attested books.
- Exposed only a signature-free public projection from the analysis route.
- Prevented customer-declared source families from manufacturing independent-source quorum.
- Fixed the `storage` → `age` substring bug that incorrectly marked valid customer evidence as stale.
- Preserved additional rights/currentness blockers even when the order book becomes unavailable.

## Adversarial proof

The new end-to-end test passes all of the following on current source:

- unauthenticated attestation denied;
- incomplete attestation denied;
- valid real-session flow accepted;
- account, asset, snapshot and signature binding;
- cross-account replay denied;
- snapshot tampering denied;
- signature tampering denied;
- expired receipt denied;
- wrong asset denied;
- forced staging status;
- public/redistribution denied;
- risk score withheld;
- zero provider network calls;
- no receipt signature, account hash or secret in the analysis response;
- no Customer FINAL promotion.

The dedicated source verifier passed **21/21** checks. This remains bounded local evidence, not staging or legal approval.

## Current campaign

```json
{
  "selectedTests": 48,
  "summary": {
    "NOT_RUN_EXTERNAL_RECEIPT_ARGUMENT_REQUIRED": 1,
    "PASS": 38,
    "WITHHELD_AUTHORIZED_RUNTIME_ENVIRONMENT": 1,
    "WITHHELD_DEPENDENCY_ENVIRONMENT": 7,
    "WITHHELD_EXACT_WINDOWS_SERVER_2025_REQUIRED": 1
  },
  "actualFailureCount": 0,
  "classification": "PASS_LOCAL_CAMPAIGN_WITH_EXPLICIT_WITHHELD_GATES"
}
```

Two full runs produced **48/48 identical classifications**, **48/48 identical exit codes**, **44/48 identical stdout hashes** and **48/48 identical stderr hashes**. Run-specific timestamps/nonces remain explicitly non-byte-identical.

## Remaining dependency truth

- Exact required tarballs present: **70/618**.
- Missing: **548**.
- Seven tests remain dependency-WITHHELD: two React/TSX boundaries and five real PGlite/PostgreSQL-WASM migrations.
- No older or differently sized PGlite bundle was substituted for pinned `@electric-sql/pglite@0.5.4`.

## Why Market Impact is not FINAL yet

The route still needs an owner-authorized deployed environment, real auth/JWT/RLS and tenant isolation, durable receipt/snapshot/report storage plus readback/restore, attributable field/use rights review, independently verified source identity/currentness/quorum, calibrated/adversarial impact behavior, full exact engineering and Windows final-byte replay.

## Honest status

- `CUSTOMER_FINAL = 0/20`
- `PAID_VALUE_FINAL = 0/10`
- `GLOBAL = NO_GO / STOP_SELL`
- `LOCAL_CAMPAIGN_PASS = 38/48`
- `LOCAL_CAMPAIGN_ACTUAL_FAILURES = 0`
- `DEPENDENCY_WITHHELD = 7`
- `EXACT_REQUIRED_TARBALLS_PRESENT = 70/618`
- `MARKET_IMPACT_CUSTOMER_OWNED_BOUNDARY = PASS_BOUNDED`
- `AUTHORIZED_STAGING = WITHHELD`
- `EXACT_WINDOWS = WITHHELD`
- `NEXT_HIGHEST_VALUE = AUTHORIZED STAGING + DURABLE AUTH/RLS/READBACK/RESTORE, WHILE COMPLETING EXACT DEPENDENCIES`
