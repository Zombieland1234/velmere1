# Velmère Security Release Gate Dashboard

## Release status logic
The release gate remains blocked until the following external tasks are actually completed:

| Gate | Required evidence |
|---|---|
| Vercel envs | Upstash/admin/event append envs configured and verified |
| Admin gate | Admin token hash, scopes and locked/unlocked behavior verified |
| Event storage | Event append provider mode verified and retention policy planned |
| WAF / bot layer | Vercel Firewall rules applied and checked in logs |
| Runtime QA | Security route/browser/API checks completed |
| Payment/webhook review | Stripe/webhook signature and idempotency reviewed separately |

## Current boundary
The release gate is an operational dashboard. It is not proof by itself. It becomes meaningful only after the operator runs the QA checklist and configures Vercel env/WAF rules.
