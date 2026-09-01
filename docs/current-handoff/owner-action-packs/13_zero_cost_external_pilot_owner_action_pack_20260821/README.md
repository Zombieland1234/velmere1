# Velmère zero-cost external pilot owner-action pack

Status: `DRAFT / LEGAL_REVIEW_REQUIRED / OWNER_APPROVAL_REQUIRED / NO_OUTREACH_SENT`.

This pack prepares the V4 section 42/64 workflow. It does not create a participant, authorize a target, accept Terms, publish a report or badge, or supply Customer FINAL / GO_PAID / LIVE evidence.

## Files

- `PILOT_ELIGIBILITY_AND_EXECUTION_RUNBOOK.md` — hard entry gates, bounded execution, stop/rollback and evidence requirements.
- `PILOT_AUTHORIZATION_AND_CONSENT_TEMPLATE.md` — target authorization and three separately optional publication choices.
- `PILOT_CASE_INPUT.template.json` — exact machine-readable case/scope/identity template.
- `PILOT_FEEDBACK_SURVEY.md` — product feedback without leading the participant toward a PASS.
- `PILOT_EVIDENCE_MANIFEST.template.json` — evidence inventory that keeps technical, participant and publication proof distinct.

## Owner sequence

1. Obtain legal/privacy review of these drafts and current provider field/use rights.
2. Select a real participant; do not fabricate or have an AI persona sign.
3. Complete the authorization template with a named authorized representative.
4. Complete the JSON input, including exact chain and contract identity and exclusions.
5. Confirm every eligibility item in the runbook against the exact deployed source and staging/prod-like environment.
6. Run only the authorized passive workflow. Stop on identity ambiguity, rights failure, provider staleness, unsafe behavior or scope drift.
7. Deliver the exact immutable artifact privately first and collect feedback.
8. Publish Verify/badge or case-study material only when its separate explicit choice is `YES` and owner/legal approval exists.
9. Revalidate after remediation or deployment change; preserve the old report only as historical.

No email, message, outreach, deployment or external write was performed while creating this pack.
