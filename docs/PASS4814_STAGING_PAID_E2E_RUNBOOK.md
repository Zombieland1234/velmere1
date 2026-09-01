# PASS4814 — staging paid E2E readiness runbook

## Purpose

This runbook creates a short-lived, monotonic and release-bound proof that the exact release candidate completed the paid customer path against real staging services before production promotion. It does not treat unit tests, synthetic fixtures, mocked Stripe, local Supabase or replayed provider responses as commercial evidence.

## Mandatory order

1. **Prepare the release candidate.** Produce and independently verify the PASS4813 supply-chain provenance, public checkpoint and deployment receipt for the exact source package, build artifact, runtime version, provider configuration and model configuration.
2. **Create the staging deployment.** Deploy that exact release candidate to the controlled staging environment. Record its signed deployment receipt. This is the `staging deployment` tested by every probe.
3. **Run all ten real-service probes.** Capture exactly one successful `staging_real_service` probe for each required service: Stripe checkout; Stripe signed webhook; Supabase ledger; entitlement lifecycle; Audit Pro completion; Audit Advanced dual control; secure PDF delivery; Audit providers; Shield providers; Real Markets providers.
4. **Redact before storage.** Store only SHA-256 reference digests. Never place Stripe session IDs, webhook event IDs, Supabase row IDs, account identifiers, access tokens, provider credentials or raw customer data in the probe artifact.
5. **Build the receipt.** Use `scripts/pass4814/build-staging-paid-e2e-receipt.ts` with all ten probe files, the tested staging deployment receipt and the verified trust bundle. For a production promotion, `test-only` signers are rejected.
6. **Obtain independent release signatures.** At least the trust bundle release threshold must sign the exact receipt core through the detached KMS/HSM signing boundary. At least one valid signer must be active.
7. **Verify independently.** Use `scripts/pass4814/verify-staging-paid-e2e-receipt.ts` from a separate verification context with public trust material only. Confirm the exact release candidate digest, all roots, freshness, chronology, signatures, sequence and predecessor binding.
8. **Perform production promotion.** Only after the staging receipt is completed and verified may the same release candidate enter `production promotion`. The production deployment receipt must bind the same build/source/runtime/provider/model/supply-chain roots.
9. **Configure runtime fail-closed inputs.** Set the server-only receipt chain and minimum sequence. Do not expose them through `NEXT_PUBLIC_*`: `VELMERE_COMMERCIAL_COHORT_STAGING_E2E_RECEIPT_CHAIN_JSON` and `VELMERE_COMMERCIAL_COHORT_MIN_STAGING_E2E_SEQUENCE`.
10. **Verify paid gates.** Confirm Audit Pro, Audit Advanced, Shield Pro/Advanced and Real Markets Pro/Advanced remain blocked when the receipt is missing, expired, rolled back, replayed or bound to another release candidate.

## Required negative checks

The release remains blocked for a missing/duplicate/unexpected service, synthetic or replay evidence, wrong service mode, missing or unexpected assertion, raw identifier, stale/future evidence, mismatched release roots, insufficient signatures, changed roots/digest, replayed nonce/run/probe root, sequence/predecessor rollback or a receipt completed after production deployment.

## Evidence classification

PASS4814 code-only tests prove policy/tooling rejection behavior only. They do **not** prove that Stripe, Supabase, providers, entitlements, human review or PDF delivery worked live. A production-ready claim requires probes created by actual staging services and signatures issued by the real external custody boundary.
