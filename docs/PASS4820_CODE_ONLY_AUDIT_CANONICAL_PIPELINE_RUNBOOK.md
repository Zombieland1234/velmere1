# PASS4820 — Code-only Audit canonical pipeline runbook

## Scope

This runbook is intentionally code-only. Do not execute Stripe, Supabase, real provider, KMS/HSM, staging, production, chaos, pager or LIVE cohort work while the code-only roadmap remains incomplete.

## Canonical Audit flow

1. `/api/security/audit-report-assembler` resolves the requested tier and verifies paid entitlement where required.
2. Provider runtime responses are accepted as paid evidence only when they are confirmed, exact-response identity matched, content-bound and independence eligible.
3. The assembler creates one canonical Audit report and canonical evidence packet.
4. `buildPass4820AuditCustomerReportPipeline` computes Basic, Pro and Advanced readiness from the same report and provider runtime.
5. The customer projection removes fields above the delivered tier.
6. An Advanced request without verified manual review and monitoring receives a Pro projection only.
7. The generic customer-report payload and preview layout are generated from the delivered projection.
8. Paid immutable PDF delivery remains handled by the existing account-bound paid Audit PDF flow.
9. The public/customer-safe status page and `pdf-safe` endpoint use one deterministic customer-safe layout. The endpoint returns physical PDF bytes only after the record is ready or delivered.

## Route ownership

Canonical:
- `/api/security/audit-report-assembler`
- `/api/security/audit-watch/customer-safe-report`
- `/api/security/audit-watch/pro-pdf/token`
- `/api/security/audit-watch/pro-pdf`
- `/api/market-integrity/report`
- `/api/market-integrity/report-pdf`
- `/api/search/lens-report`

Deprecated:
- `/api/security/audit-watch/report`

The deprecated route must return deprecation, sunset and successor headers. It must not be treated as an authoritative tier-value or PDF endpoint.

## Required local checks

```bash
npm run verify:pass4820:static
npm run test:pass4820:audit-pipeline
npm run verify:pass4820:pdf-physical
npm run typecheck:pass4820:audit-core
npm run typecheck:pass4820:routes
npm run verify:customer-safe-report-route
npm run verify:pass4820
```

## Acceptance rules

- Basic never receives Pro PDF lines or Advanced queue actions.
- Pro requires strict independent content-bound evidence and a verified evidence ledger.
- Advanced requires Pro readiness, stricter source depth, verified manual review and monitoring.
- Partial, request-bound, hashless or duplicate-upstream lanes never satisfy paid Audit readiness.
- Security Audit does not inherit a market stress-scenario requirement.
- Shield and Real Markets retain their own stress/historical requirements.
- Page and PDF consume the same customer-safe layout digest.
- Customer-safe PDF is blocked until the account report is marked ready/delivered.
- The PDF preserves PL/DE Unicode and the euro sign.
- No raw payment data, webhook content, private evidence, reviewer identity, exploit instructions or guarantees may be exposed.

## Still blocked after PASS4820

- full exact Node 24.18.0/npm 11.16.0 install;
- `npm ci`, full monorepo semantic typecheck, ESLint and Next production build;
- complete removal of every historical/dead report route and helper;
- storing the full canonical Audit customer snapshot directly in the account-message schema rather than the current sanitized operator summary;
- browser screenshot/pixel parity with PDF;
- PDF accessibility/tagging and long-report pagination stress;
- global stylesheet decomposition and broad code-health cleanup;
- LIVE 50/50/150 and all real services, intentionally frozen.
