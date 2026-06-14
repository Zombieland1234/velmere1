# Velmère PASS 129 — Evidence Report Draft / Source Ledger Protocol

## Purpose
Shield must not only show a risk score. It must prepare a controlled evidence draft that separates what is live, partial, fallback, missing or blocked.

## Added
- `lib/market-integrity/evidence-report.ts`
- `buildShieldEvidenceReportDraft(result, caseFile)`
- source ledger modes: live, partial, fallback, missing, blocked
- missing-data appendix
- risk-lane sections
- OSINT queue section
- redaction rules
- legal note
- modal Evidence Draft card

## Rule
Evidence export remains draft-only until source ledger, audit storage, renderer and current-source web OSINT are production wired.

## Copy boundary
Allowed: anomaly, review, missing source, manual verification.
Blocked: buy/sell language, guarantees, safe-investment language, scam/fraud proof claims without evidence.
