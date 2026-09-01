# PASS4821 — Immutable account snapshot code-only runbook

## Scope

This runbook verifies code-only behavior. It must not be used as evidence of LIVE providers, Stripe, Supabase staging, KMS/HSM, uptime or real customer accuracy.

## Required project toolchain

- Node 24.18.0
- npm 11.16.0

The bundled receipt records the actual runtime used. A PASS on Node 22 is a targeted code-only receipt, not a full release build.

## One-shot verification

```bash
npm run verify:pass4821
```

The one-shot requires:

1. 99-point static architecture gate.
2. Immutable account snapshot matrix.
3. Physical PDF parse/digest/Unicode checks.
4. Core, handler, route and component semantic typechecks.
5. Shared Shield/Real Markets artifact typecheck.
6. PASS4819 product regression.
7. PASS4808 account-paid-PDF regression.
8. Full repository TypeScript/TSX parser gate.

## Snapshot invariants

A customer report may be ready only when:

- the account owner binding matches;
- `canonicalCustomerSnapshot` verifies;
- the snapshot is stored in its dedicated durable column;
- the operator/delivery state is canonical;
- the exact PDF digest, byte length, render plan, page count and row count match;
- the shared canonical artifact digest matches.

## Durable storage

When Supabase is configured, read/list/write/update errors must fail closed. Do not replace a durable failure with memory state.

Apply migration:

```text
supabase/migrations/20260716000003_4821_audit_account_canonical_customer_snapshot.sql
```

Then verify that attempts to:

- change `account_id`;
- replace a stored snapshot;
- remove a stored snapshot;
- mark a record ready without a snapshot;

are rejected by PostgreSQL.

## Route ownership

Canonical customer report:

```text
/[locale]/security/audits/customer-report/[account-message-id]
```

Canonical customer PDF:

```text
/api/security/audit-watch/customer-safe-report?id=[account-message-id]&locale=[locale]&format=pdf-safe
```

Retired:

```text
/[locale]/security/audits/report/[id]
/api/security/audit-watch/report
```

The page route is removed. The API route is an HTTP 410 tombstone only.

## Visual freeze

Do not edit CSS/SCSS or className strings in this pass. Route/data-source changes are allowed only when markup geometry remains unchanged.

## Next code-only work

- remove deeper legacy report helpers;
- persist Shield/Real Markets account snapshots;
- add Lens to the shared artifact contract;
- execute the full Node 24/npm 11 build chain;
- keep LIVE frozen.
