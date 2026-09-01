# PASS4816 — Observability, Incident Response and Safe Degradation Runbook

## Purpose

This runbook creates and independently verifies the PASS4816 observability
receipt required by the paid Pro/Advanced runtime. It does not grant production
readiness by itself. It proves that the exact release candidate has fresh,
complete and actionable telemetry after the PASS4814 normal-path receipt and
the PASS4815 recovery receipt have both been verified.

## Non-negotiable prerequisites

1. Exact Node `24.18.0` and npm `11.16.0` release environment.
2. Verified PASS4813 supply-chain provenance for the deployed artifact.
3. Verified PASS4814 real-service staging receipt for the same candidate.
4. Verified PASS4815 real failure/recovery receipt for the same candidate.
5. Two independent release signing keys controlled by KMS/HSM.
6. Staging telemetry collectors with workload identity and least privilege.
7. Pager/incident platform routes owned by named on-call rotations.
8. No raw customer identifiers, payment payloads, wallet addresses or report
   contents in exported evidence. Evidence references must be digest-only.

## Required SLO windows

Exactly twelve six-hour-or-longer windows are required:

1. `stripe_webhook_processing`
2. `supabase_ledger_transactions`
3. `entitlement_lifecycle`
4. `audit_pro_pipeline`
5. `audit_advanced_review`
6. `pdf_secure_delivery`
7. `audit_provider_quorum`
8. `shield_provider_freshness`
9. `real_markets_provider_freshness`
10. `queue_worker_health`
11. `customer_account_delivery`
12. `incident_response_control_plane`

Every window must be collected after PASS4815 recovery completion and no more
than one hour before the receipt is issued. A single point-in-time health ping
is not acceptable.

## Required evidence per window

Each JSON window must contain:

- `evidenceClass: staging_real_observation`;
- exact deployment, staging and chaos receipt bindings;
- exact build/source/runtime/provider/model/supply-chain roots;
- sample, success and error counts;
- derived availability;
- p95 and p99 latency;
- p95 freshness and queue age;
- error-budget consumption;
- one-hour and six-hour burn rates;
- telemetry and trace coverage;
- count of missing telemetry intervals;
- unresolved Sev-1 and Sev-2 counts;
- count of muted critical alerts;
- an alert probe timeline: fired, acknowledged and escalated;
- alert-route, runbook and on-call-owner digests;
- exercised degradation action and customer-disclosure receipt;
- at least three independent evidence digests;
- a content-bound window digest.

## Safe degradation mapping

- Stripe or ledger degradation: `block_paid_purchase`.
- Entitlement, PDF or queue degradation: `block_paid_delivery`.
- Audit pipeline or provider quorum degradation: `manual_review_only`.
- Shield/Real Markets provider degradation:
  `last_known_good_with_stale_disclosure`.
- Incident control-plane degradation: `disable_probabilistic_claims`.
- Customer-account delivery degradation: `read_only_account_access`.

A different action is a hard failure even when all numeric SLOs pass.

## Hard failure conditions

Promotion must stop without creating an output receipt when any of the
following is true:

- fewer or more than twelve objectives;
- non-real, synthetic or replay evidence;
- a window shorter than six hours;
- a window that starts before PASS4815 recovery completion;
- stale window at receipt time;
- sample-accounting mismatch;
- availability not derivable from counts;
- sample floor, availability, p95, p99, freshness or queue-age failure;
- error-budget or burn-rate failure;
- telemetry coverage below 99.5%;
- trace coverage below 99%;
- any missing telemetry interval;
- any unresolved Sev-1 or Sev-2;
- any muted critical alert;
- page acknowledgement or escalation outside policy;
- unverified alert route, degradation drill or customer disclosure;
- incorrect degradation action;
- altered evidence/window/root/receipt digest;
- fewer than the trust-bundle release-signature threshold;
- use of a `test-only` signer for production;
- replayed nonce, run ID or objective root;
- sequence gap or rollback below the deployment floor;
- mismatch with the current build, source, provider/model or supply-chain
  provenance.

## Build the receipt

Create one window JSON file per required objective and one builder config. Then
run:

```bash
npm run build:pass4816:observability-receipt -- --config /secure/path/pass4816-build-config.json
```

The production config must point to detached signer commands backed by KMS/HSM.
The builder:

1. validates all windows;
2. canonicalizes and hashes the exact policy and evidence set;
3. requests detached Ed25519 signatures;
4. verifies the completed chain against the current receipts;
5. writes the receipt and chain atomically only after full verification.

## Independent verification

Run in a separate operator context that has public trust material but no private
keys:

```bash
npm run verify:pass4816:observability-receipt -- --config /secure/path/pass4816-verify-config.json
```

The verifier must return all of the following as `true`:

- `verified`;
- `observabilityVerified`;
- `telemetryBound`;
- `sloVerified`;
- `incidentResponseVerified`;
- `safeDegradationVerified`;
- `observabilityRollbackProtected`.

## Runtime configuration

Server-only environment variables:

```text
VELMERE_COMMERCIAL_COHORT_OBSERVABILITY_RECEIPT_CHAIN_JSON
VELMERE_COMMERCIAL_COHORT_MIN_OBSERVABILITY_SEQUENCE
```

Never expose these through `NEXT_PUBLIC_*`. Runtime verification happens after
public checkpoint, supply-chain, deployment, staging and chaos verification.
Missing or invalid PASS4816 evidence keeps Pro/Advanced `ready = false`.

## Evidence handling and privacy

- Hash customer/account/payment identifiers before evidence export.
- Never store Stripe secrets, webhook bodies, Supabase service keys, bearer
  tokens, PDF bytes or wallet addresses in the receipt.
- Store large telemetry exports in access-controlled evidence storage and put
  only SHA-256 references in the window.
- Preserve raw execution logs under retention policy; do not place them in the
  customer-facing PDF.
- Sign the final receipt only after redaction review.

## Incident ownership

Each objective needs:

- named primary and secondary rotation;
- runbook digest;
- alert route digest;
- escalation target;
- customer communication owner;
- rollback authority;
- reimbursement/support owner for failed paid delivery.

A rotation label without an accountable owner is not evidence.

## Current PASS4816 limitation

The repository tests exercise policy, canonicalization, signatures, negative
cases, atomic output and runtime integration using synthetic matrices and
`test-only` detached signers. They do not prove that a real telemetry backend,
pager, on-call engineer or customer degradation action ran. LIVE status remains
blocked until the twelve real windows are collected and externally signed.
