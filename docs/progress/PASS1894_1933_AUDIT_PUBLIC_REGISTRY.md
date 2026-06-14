# PASS1894–1933 — Audit Watch Public Registry

## Goal
Turn Audit Watch from a premium audit landing page into a public audit-status product: searchable registry, status filters, scorecard, report links and export links.

## Product work shipped
- Added `/security/audits/registry` public registry route.
- Added `SecurityAuditRegistryPage` with hero, scoreboard, search form, status filter, sort selector and registry cards.
- Added `lib/security/pass1894-audit-public-registry.ts` as a deterministic registry layer.
- Added `/api/security/audit-watch/registry` API route.
- Connected the main Audit Watch page to the public registry.
- Extended `/api/security/audit-watch` with registry route and payload.
- Added static route smoke coverage for `/security/audits/registry`.

## Registry states
- Audit verified
- Scope mismatch
- Audit outdated
- Changed after audit
- Needs evidence
- Private disclosure

## Registry scorecard
The public list avoids fake safety scoring. It shows:
- confidence cap,
- scope match,
- source freshness,
- admin control risk,
- missing evidence,
- next action,
- safe badge language.

## Safety boundary
The registry is a public evidence index, not a guarantee. It blocks:
- Certified Safe,
- No Risk,
- Approved Investment,
- public exploit instructions,
- fake client logos.

## Why this matters
Top audit companies have public report libraries, scorecards or audit indexes. Velmère now has a Velmère-style version: evidence-first, premium, minimal and legally safer.
