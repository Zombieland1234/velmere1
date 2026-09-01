# PASS4812 — External key custody, transparency publication and deployment receipt

## Status and scope

PASS4812 removes raw private Ed25519 PEM material from the production commercial-cohort release builders. Production releases must use detached signatures produced outside the Velmère process by an approved KMS/HSM adapter. The release is then published to at least two independent append-only sinks and bound to a monotonic deployment receipt.

This is a code and tooling boundary. The repository tests use the explicit `test-only` provider. No AWS KMS, Google Cloud KMS, Azure Key Vault, Vault Transit, PKCS#11 HSM or public internet transparency log was contacted by the PASS4812 evidence run.

## Non-negotiable production rules

1. Never set `VELMERE_COMMERCIAL_COHORT_ROOT_SIGNERS_JSON`, `VELMERE_COMMERCIAL_COHORT_RELEASE_SIGNERS_JSON` or `VELMERE_COMMERCIAL_COHORT_WITNESS_SIGNERS_JSON` in production. They are legacy local/staging inputs and the PASS4811 builders reject production use.
2. The external signer adapter receives an exact, short-lived request over stdin and returns a detached Ed25519 signature plus a custody receipt. The Velmère builder never receives the private key.
3. Use workload identity or an equivalent short-lived machine identity. Do not place cloud credentials, private keys or signing secrets in the JSON builder configuration.
4. Use distinct key roles and identities for root, release/witness and deployment approval. Advanced claims require independent approval paths.
5. Configure at least two independent transparency sinks under different administrative control. Production checkpoint creation requires online fetch-and-verify.
6. Pin minimum checkpoint and deployment sequences in the deployment environment. Never lower them during rollback.
7. The deployment receipt must bind the exact build artifact digest, source package digest and model/provider configuration root deployed to production.

## Required order of operations

### 1. Prepare the quality release

Complete the PASS4810 precommitted 50 Audit + 50 Shield + 50 Real Markets + 150 PDF live cohort. Produce the signed PASS4809 attestation and PASS4810 anti-cherry-pick receipt. Synthetic or replay evidence cannot open the commercial gate.

### 2. Build or rotate the trust bundle

Run:

```bash
npm run build:pass4812:trust-bundle -- --config /secure/config/trust-bundle.json
```

The config contains public-key paths and external signer commands only. Each root signer command must implement the request/response protocol in `commercial-cohort-external-key-custody.ts`. In production, `provider: "test-only"` is rejected.

Verify and archive the resulting trust bundle and trust chain. Keep the root public-key list independently distributed.

### 3. Build and publish the public checkpoint

Run:

```bash
npm run build:pass4812:public-checkpoint -- --config /secure/config/public-checkpoint.json
```

The builder obtains detached release signatures, publishes a transparency leaf to every configured sink, obtains detached witness signatures, verifies the complete checkpoint chain and—when `environment` is `production`—fetches the public URLs back over HTTPS with redirects disabled and private addresses rejected.

Independently verify:

```bash
npm run verify:pass4812:transparency -- --config /secure/config/transparency-verification.json
```

### 4. Build the deployment receipt

Calculate digests from the exact immutable deployment inputs:

- built application/archive,
- source package used to build it,
- model and provider configuration bundle.

Then run:

```bash
npm run build:pass4812:deployment-receipt -- --config /secure/config/deployment-receipt.json
```

The deployment receipt must use the next monotonic sequence, reference the previous receipt and be signed by the required release-key quorum through external custody.

Verify independently:

```bash
npm run verify:pass4812:deployment-receipts -- --config /secure/config/deployment-verification.json
```

### 5. Deploy fail-closed runtime configuration

Set the server-only variables documented in `.env.example`, including:

- full checkpoint and trust chains,
- root public keys and threshold,
- minimum checkpoint sequence,
- full deployment receipt chain,
- minimum deployment sequence,
- exact build/source/model digests,
- expected environment, audience and optionally deployment ID.

Audit, Shield and Real Markets Pro/Advanced remain blocked if any field, signature, sequence, artifact digest or chain link is missing or invalid.

## Rotation and incident response

- Create a new trust-bundle epoch before retiring keys.
- Mark compromised keys `revoked`; publish the new root-signed bundle and checkpoint.
- Advance both minimum checkpoint and deployment sequences.
- Never delete previous valid chain entries from the published record.
- If a transparency sink is unavailable, do not silently lower quorum. Stop the release or replace the sink through an approved trust-bundle/checkpoint update.
- A rollback requires a new deployment receipt referencing the current checkpoint and a higher deployment sequence; reusing an old receipt is forbidden.

## Acceptance gates before public paid launch

- A real KMS/HSM adapter is exercised in staging and production with custody receipts retained.
- Two genuinely independent public transparency sinks are online and fetch-verifiable.
- Full Node 24.18.0/npm 11.16.0 install, lint, typecheck and production build pass.
- Stripe/Supabase staging flow proves fail-closed behavior with missing or tampered receipts.
- The real precommitted 50/50/150 cohort passes.
- Two real operators approve Advanced evidence and release.

Until those gates are proven, PASS4812 is production-oriented architecture and tooling, not proof of world-class LIVE operation.
