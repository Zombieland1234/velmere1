# 08 — SUPABASE AND DATA BOUNDARIES

UPDATED: 2026-09-02 | CLASSIFICATION: PROVEN_LOCAL for keys, UNKNOWN for RLS

## Configuration (Pas 1)

| Key | Set | Source |
|---|---|---|
| SUPABASE_URL | YES (http...) | .env.local |
| NEXT_PUBLIC_SUPABASE_URL | YES (http...) | .env.local |
| SUPABASE_PUBLISHABLE_KEY | YES (sb_p...) | .env.local |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | YES (sb_p...) | .env.local |
| SUPABASE_SECRET_KEY | YES (sb_s...) | .env.local |
| SUPABASE_SERVICE_ROLE_KEY | YES (sb_s...) | .env.local |
| SUPABASE_JWKS_URL | YES (http...) | .env.local |
| GOOGLE_OAUTH | NO | .env.local (not set) |

## Migrations

| Field | Value |
|---|---|
| Directory | supabase/migrations/ |
| File count | 135 SQL migrations |
| Last applied | UNKNOWN — needs inspection |

## Local vs remote state

| Field | Status |
|---|---|
| Local migrations exist | YES |
| Local migrations applied to remote | UNKNOWN — per Pas 0 review: "Migracje DB (supabase db push) jeszcze nie były uruchomione — tabele jak audit_reviews nie istnieją w schemacie" |
| Audit table present in remote | UNKNOWN |
| LIVE_SUPABASE_RLS classification | UNKNOWN_EXTERNAL |

## Functions / views

| Field | Status |
|---|---|
| supabase/functions/ exists | YES (not enumerated) |
| SECURITY DEFINER functions | UNKNOWN |
| search_path set | UNKNOWN |
| Grants | UNKNOWN |

## Auth state (per Pas 0 review)

| Field | Status |
|---|---|
| supabaseConfigured | TRUE |
| signedSessionConfigured | TRUE |
| googleOAuthConfigured | FALSE |
| mode | preview_skeleton |
| authenticated in test | FALSE (no logged-in user — expected) |

## Tenant isolation

| Field | Status |
|---|---|
| Tenant identifier | UNKNOWN — needs column-level inspection |
| Account identifier | UNKNOWN |
| RLS policies | UNKNOWN |
| Cross-tenant tests | NOT_RUN |

## Security boundaries (template)

```
ANONYMOUS: NOT_TESTED
OWN USER: NOT_TESTED
OTHER USER: NOT_TESTED
ADMIN: NOT_TESTED
OTHER TENANT: NOT_TESTED
MANIPULATED TENANT: NOT_TESTED
MANIPULATED CASE: NOT_TESTED
MANIPULATED ARTIFACT: NOT_TESTED
```

## Per master mission §33

Tests required where environment permits:
- unauthenticated read
- authenticated own read
- authenticated other-user read
- own update
- other-user update
- own delete
- other-user delete
- manipulated tenant ID
- manipulated account ID
- manipulated case ID
- privilege escalation

A single anonymous 401 is NOT full RLS proof.

## Local fixture vs live cloud

CRITICAL DISTINCTION (master mission §33):

```
LOCAL PROOF       — fixture-based RLS, pglite, simulated
LIVE CLOUD PROOF  — authenticated against real Supabase with two tenants
```

Never upgrade local to live.

## What Pas 4 + Pas 17 will add

- Migrate status check
- RLS policy enumeration
- Two-tenant authenticated test (or honest EXTERNAL_BLOCKER)
- Each security boundary test
- Stop-sell boundary verification
- Entitlement enforcement at API level

## Critical risk

Without live Supabase access from this environment, RLS can only be
classified as `LIVE_SUPABASE_RLS = UNKNOWN_EXTERNAL` until a staging
environment is connected. Pas 17 will document this classification
explicitly.