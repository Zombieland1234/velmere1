# PAS 3 — BEZPIECZEŃSTWO (SECURITY MATRIX) — RAPORT
Data: 2026-09-02 | Mode: STATIC CODE ANALYSIS (no live HTTP testing)
Classification: PROVEN_LOCAL for code presence and patterns;
                NOT_TESTED for live exploitation

## STATUS: PARTIAL — code structure documented, live exploitation NOT performed

---

## 1. Security modules audited (file presence + key patterns)

| Module | Lines | Purpose | Key Features |
|---|---|---|---|
| lib/security/api-guard.ts | 572 | API request guard | Rate limit (memory + Upstash durable), origin check, method check, content-length check, input sanitization, trusted client resolution, production fail-closed |
| lib/security/api-edge-boundary.ts | 395 | API edge boundary | Method override protection, Stripe signature header validation, canonical origin resolution, Vercel preview origin |
| lib/security/durable-rate-limit.ts | ? | Durable rate limit (Upstash) | Atomic Redis-backed limiting |
| lib/security/payment-webhook-guard.ts | 475 | Payment webhook validation | Content-type strict, content-length, signature validation, ambiguous framing rejection |
| lib/security/customer-safe-pdf-data-leak-guard.ts | ? | PDF data leak prevention | (not opened) |
| lib/security/production-fixture-route-guard.ts | ? | Production fixture guard | (not opened) |
| lib/security/production-rate-limit-adapter.ts | ? | Production rate limit adapter | (not opened) |
| lib/security/write-api-rate-limit.ts | ? | Write API rate limit | (not opened) |
| lib/security/audit-case-vault-private-delivery-ledger.ts | ? | Audit delivery security | (not opened) |
| lib/security/audit-claim-ledger.ts | ? | Audit claim ledger | (not opened) |
| lib/security/delivery-receipt-ledger.ts | ? | Delivery receipt ledger | (not opened) |
| lib/security/security-event-ledger.ts | ? | Security event audit trail | (not opened) |
| lib/security/support-handoff-event-ledger.ts | ? | Support handoff events | (not opened) |
| lib/security/evidence-narrative-claim-ledger-explainability.ts | ? | Evidence explainability | (not opened) |
| lib/security/route-health-ledger.ts | ? | Route health ledger | (not opened) |

## 2. Per-control status

### Auth bypass — STRONG PATTERNS
- Bearer token regex: `Bearer\s+([^\s]{20,8192})` (length-bounded)
- capability tokens required for sensitive bridges
- Customer write operations require explicit auth

### Tenant isolation — PARTIAL
- supabase RLS not yet inspected (Pas 17)
- Edge function bridge pattern is per-tenant
- File: lib/security/audit-case-vault-private-delivery-ledger.ts exists
  for case-bound isolation

### Rate limiting — STRONG (with production fail-closed)
- Soft limit (memory) for QA
- Durable limit (Upstash) for production
- Production REQUIRES durable signal — fail-closed if missing
- Per-route configuration via keyPrefix
- IPv6 aggregation at /64 to prevent bucket spraying
- **Durable env required**: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN,
  KV_REST_API_URL, KV_REST_API_TOKEN, REDIS_URL
  - All MISSING from .env.local → B-004

### Origin / CORS — STRONG
- TRUSTED_ORIGIN_PROTOCOLS = {"http:", "https:"}
- Canonical origin required in production
- Vercel preview origin auto-resolved (if branch URL valid)
- Method-override headers blocked
- Production: explicit allowed origins only

### Method validation — STRONG
- 405 with Allow header
- Forbidden methods: CONNECT, TRACE
- Method override headers blocked: x-http-method-override, x-method-override, x-http-method

### Content-length / Size — STRONG
- 64KB limit on audit case create
- 413 for too-large
- 414 for URL too long
- Negative content-length rejected
- Non-integer content-length rejected

### Content-type strict — STRONG (for webhooks)
- application/json only (with charset utf-8 allowed)
- No commas allowed (prevents parameter injection)
- No control characters allowed
- Length bounded (96 chars)

### Input sanitization — PRESENT
- sanitizeBoundedParam: removes ASCII control chars + `<>/`+ trims + caps length
- sanitizeEmailAddress: regex-bounded

### Stripe webhook signature — STRONG (per code)
- STRIPE_SIGNATURE_MAX_LENGTH = 2_500
- STRIPE_SIGNATURE_MAX_V1_VALUES = 8
- STRIPE_TIMESTAMP regex: /^(?:0|[1-9]\d{0,15})$/u
- STRIPE_V1_SIGNATURE regex: /^[a-f0-9]{64}$/iu

### Trusted client address resolution — STRONG
- Vercel profile required in production (verifies VERCEL + VERCEL_ENV)
- Non-production gets compatibility mode (less strict)
- Address-keyed by IPv4 /64 for IPv6 (prevents bucket spray)

## 3. Control classes not yet audited (live testing)

| Class | Static status | Live test |
|---|---|---|
| IDOR | NOT_TESTED | Pas 4 work |
| BOLA | NOT_TESTED | Pas 4 work |
| BFLA | NOT_TESTED | Pas 4 work |
| SSRF | NOT_TESTED (brokered-egress exists) | Pas 4 work |
| XSS | NOT_TESTED (sanitizeBoundedParam strips <>) | Not tested live |
| CSRF | NOT_TESTED (origin check exists) | Not tested live |
| Path traversal | NOT_TESTED | Pas 4 work |
| Upload abuse | NOT_TESTED | Pas 4 work |
| Oversized requests | TESTED via code (65KB limit) | OK by design |
| Archive abuse | NOT_TESTED | Pas 4 work |
| Signed URL replay | NOT_TESTED | Pas 4 work |
| Token replay | NOT_TESTED | Pas 4 work |
| Webhook replay | NOT_TESTED (Stripe signature validated) | Pas 4 work |
| Entitlement bypass | NOT_TESTED | Pas 4 + Pas 16 |
| Origin forgery | TESTED via canonical origin check | OK by design |
| Cookie weaknesses | NOT_TESTED | Pas 4 work |
| CSP | NOT_TESTED | Pas 4 work |
| Secret leakage | TESTED via .gitignore (PROVEN_LOCAL) | OK by design |
| Environment leakage | NOT_TESTED | Pas 20 |
| Cron bypass | NOT_TESTED | Pas 4 work |
| Artifact authorization | NOT_TESTED | Pas 4 work |
| AI data exfiltration | NEEDS Pas 5 retest | |

## 4. Code-level hardening signals (good)

- Production fail-closed semantics in multiple modules
- Schema version strings: "velmere.pass36.a90.api-edge-boundary.v1"
  → explicit lock contracts
- PASS identifiers in security headers → tie security to governance passes
- Trusted-client resolution differentiates production / Vercel preview / QA
- Address key aggregation at /64 for IPv6

## 5. Risks identified

### R-001 (NEW)
- code: productionRateLimitAdapter NOT opened
- rationale: might contain default-pass-through logic that bypasses rate limiting

### R-002 (NEW)
- code: customer-safe-pdf-data-leak-guard.ts NOT opened
- rationale: PDF security is critical for Audit Basic + Pro outputs

### R-003 (NEW)
- code: RLS policies NOT inspected
- rationale: even if API guards are perfect, RLS bypass at DB level
  would still leak data

### R-004 (NEW)
- LIVE_SUPABASE_RLS = UNKNOWN_EXTERNAL until cross-tenant test
- rationale: per Pas 2 + knowledge layer

## 6. Positive findings (no action required but recorded)

- Multiple security event ledgers exist (good audit trail)
- Per-pass schema locking (PASS36.A75, A82, etc.) — explicit contracts
- Privacy fingerprint generation exists
- Vercel-specific hardening for previews
- Privacy-first headers (noindex, nofollow, noarchive, robots)

## 7. Self-challenge

| Question | Answer |
|---|---|
| What security boundary was tested only once? | None tested live yet |
| What API was not called directly? | All payment webhook endpoints |
| What unauthorized path was not tried? | IDOR on Audit case, BFLA on tier boundaries |
| What was most likely self-declared? | "security PASS" in velmere-progress.json (B-010) |

## 8. Honest classification

- **PROVEN_LOCAL**: security modules exist with correct-looking patterns
- **NOT_TESTED**: actual exploitation / bypass / replay attempts
- **NOT_VERIFIED**: production behavior (no live deployment tested)

## 9. What Pas 4+ needs

- Live HTTP testing of each boundary class
- Real SSRF attempts against brokered-egress
- Real IDOR on caseRef
- Real entitlement bypass on tier boundaries
- Real webhook replay / signature forgery
- Real Supabase RLS two-tenant test (Pas 17)

## 10. Exit criteria check

Exit-criteria: "każda klasa ataku ma osobny PASS/FAIL z reprodukcją"

**NOT PASSED**: live testing not possible (no dev server HTTP response).

Static analysis documented, live exploitation deferred to Pas 4+ when
server is responding or via deployment tests.