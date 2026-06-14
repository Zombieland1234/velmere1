# PASS1534–1573 — Audit Review Flow / Public Verification Product

## Product goal

Turn Velmère Audit Watch from a static security page into a usable audit-review intake flow.
The page now supports a passive public audit verification packet: submitted sources, request ID,
review level, findings, Lens PDF sections, Shield Map nodes and responsible-disclosure boundaries.

## Added product surfaces

- `PASS1534_AUDIT_REVIEW_FLOW_ID` product contract.
- `buildAuditReviewFlow(locale)` localized console copy for PL/EN/DE.
- `normalizeAuditReviewSubmission()` with URL/text sanitization.
- `buildAuditVerificationPreview()` for deterministic preview packets.
- `SecurityAuditReviewConsole` client form.
- `/api/security/audit-watch` GET sample preview and POST intake preview.
- Lens PDF hook for `audit_verification_report`.
- Shield Map hook for `audit_claim_evidence_graph`.

## Review levels

- Free Scan
- Basic Review
- Pro Review
- Advanced Review

## Safety boundaries

- Passive public data only.
- No custody.
- No seed phrase.
- No investment advice.
- No guarantee of safety.
- No unauthorized active testing.
- No exploit instructions.
- Responsible disclosure for high-risk findings.

## Why this matters

This moves Velmère Security from a marketing idea into a concrete product flow:
users can paste public audit sources and immediately see what Velmère would verify,
what is missing, which status applies and what the PDF/evidence graph will contain.

## Still not claimed

Velmère is not presented as a regulator, certified auditor, financial advisor or safety guarantor.
The product language stays at `Velmère Audit Checked`, `Evidence Checked` and `Pre-Audit Review`.
