# PASS1694–1733 — Audit Watch Business Flow / Review Desk Polish

## Goal
Turn Velmère Audit Watch from a technical review demo into a business-ready review flow with safe package lanes, lead capture routing, responsible disclosure handling, report ID polish, and premium UI surfaces.

## Product changes
- Added `/security/audits/pricing` as a dedicated Audit Watch packages and routing page.
- Added pricing/review lanes: Free Scan, Basic Review, Pro Review, Advanced Review, Disclosure Case.
- Added `AuditLeadCapturePacket` so every queue record can route to self-serve, review desk, senior triage, or responsible disclosure.
- Added business flow API `/api/security/audit-watch/business`.
- Extended `/api/security/audit-watch` to return `businessFlow` and `leadPacket` in GET/POST responses.
- Extended the main Audit Watch page with a business preview and pricing CTA.
- Extended the review console preview with lead routing, selected tier, priority, reply promise and safe badge language.
- Extended report status pages with PASS1694 lead routing data.
- Extended full export pages with PASS1694 business route status.
- Added static route coverage for `/security/audits/pricing`.

## Safety / legal boundaries
- Review/pre-audit only, not regulatory certification.
- No custody.
- No seed phrases.
- No investment advice.
- No guarantee of safety.
- No public exploit instructions.
- Active testing requires written authorization or bug bounty scope.
- High-risk detail routes to responsible disclosure before public publication.

## Release checks
- `verify:pass1694-1733-audit-business-flow`
- `check:i18n`
- `vercel:preflight`
- `smoke:routes:static`
- prior Audit Watch verifiers

## Still not claimed
Full `npm ci -> typecheck -> lint -> build -> Playwright` is still not marked green inside the sandbox because full install/build remains constrained by runtime timeout.
