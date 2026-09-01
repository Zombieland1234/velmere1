# Pilot eligibility and execution runbook

Classification: `OWNER_EXTERNAL_ACTION_REQUIRED`. Default decision is `NO_START`.

## Hard entry gates

Every item must have exact evidence. A blank item is a failure, not an assumption.

- Owner authorizes this named pilot and environment in writing.
- Participant authorization identifies the legal owner/operator of the target and the signing representative.
- Exact checkpoint, source commit/tree, deployment ID, environment and timestamp are recorded.
- Exact product/tier and canonical input are fixed; paid tier comparison uses the same input/snapshot.
- Chain ID, canonical contract address and deployment/proxy identity are explicit; ambiguous or unsupported identity is rejected before queue/provider work.
- Included/excluded scope and passive-only methods are explicit. No active exploitation, state-changing blockchain action, credential attack or unrelated system is authorized.
- Account registration, verified identity, login/logout/session revoke/recovery and two-account isolation have been proven on the target environment.
- Required DB migrations, RLS, storage, atomicity, concurrency, rollback and same-blob readback have current staging proof.
- Backup/restore and incident/rollback contacts are current for the exact environment.
- Every customer-visible field/use has current provider, timestamp, semantic class and rights decision. Unknown rights means WITHHELD.
- Secrets are present only in the approved secret store; logs/responses do not expose secrets, PII or internal provider topology.
- Provider free/free-tier limits, global rate budget, timeout, cache and fail-closed behavior are configured. No purchase or overage is authorized.
- Exact Chrome/Firefox/WebKit, desktop/mobile, keyboard, reduced-motion and PL/EN/DE affected paths pass on the deployed source; Edge is separate if required.
- Product remains `NO_GO / STOP_SELL` unless all independent commercial gates are separately satisfied.

## Bounded execution

1. Record participant account ID as a one-way evidence-bound identifier; do not place raw PII in receipts.
2. Reconfirm exact target identity and authorization immediately before execution.
3. Capture a canonical input digest and deployment/source identity.
4. Execute Basic first. For Pro/Advanced, reuse that exact canonical input/snapshot and preserve tier identities.
5. Preserve the first FAIL, timeout or nonzero run. A later PASS needs a separate adjudication.
6. Require customer-safe WITHHELD when evidence, rights, currentness, storage or identity is missing.
7. Render/store once, then preview/download/read back the same immutable blob. Record byte size and SHA-256 for each delivery path.
8. Have the participant use the real account path; an operator viewing an admin artifact is not customer execution.
9. Collect the survey without revealing expected answers or requesting a green result.
10. Triage defects by severity, owner, remediation, retest requirement and disclosure status.

## Immediate stop conditions

- target, chain, contract, account or deployment identity mismatch;
- participant withdraws authorization;
- unexpected external host, write or state-changing behavior;
- secret/PII leakage or cross-account access;
- provider rights/currentness becomes unknown, stale or revoked;
- incorrect live/executable/probability claim;
- durable storage/readback/hash mismatch;
- critical alert, database, queue, backup or rollback readiness failure;
- scope expansion beyond the signed authorization.

On stop: terminate the bounded run, preserve evidence, revoke pilot sessions/tokens, disable public projection/badge, keep private findings access-restricted, notify only authorized contacts, and follow the approved incident/rollback procedure.

## Success metrics (evidence, not an invented SLO)

- authorized journeys attempted/completed/withheld/errored, by product row and locale;
- exact-input tier comparisons completed without contract shrinking;
- artifact preview/download/readback hash parity;
- identity, rights, freshness and citation coverage for customer-visible fields;
- cross-account attempts denied and session revoke verified;
- participant task completion, time-on-task and reported clarity;
- defects by severity, remediation state and retest result;
- Verify status/history correctness after change and revalidation;
- zero unauthorized network/write actions and zero secret/PII disclosures.

These observations do not create Customer FINAL, GO_PAID, LIVE or WORLD_CLASS credit automatically. Apply the governing gates separately.

## Revalidation and publication

- Any deployment/source/contract/proxy/provider-rights change makes prior current proof historical and requires revalidation.
- A changed deployment must not retain the old report as current.
- Public Verify/badge is opt-in, can be revoked, uses only a non-enumerable public ID and exposes no private findings.
- Case study is a separate opt-in and requires an independently approved redacted draft.
