# PASS4813 Reproducible Supply-Chain Release Runbook

## Purpose

This runbook turns a prepared Velmère source tree into a release that is bound to the exact lockfile, SBOM, vulnerability report, source manifest, toolchain, deterministic Next.js build ID and at least two independent build outputs. The production gate is fail-closed: no paid Audit, Shield or Real Markets tier may rely on a release when any provenance link is missing, stale or inconsistent.

PASS4813 does not make an offline or synthetic result a production claim. The final production provenance may only be issued after the live steps below succeed on Node `24.18.0` and npm `11.16.0`.

## Required separation of duties

Use two builders with different `builderId`, `workspaceId`, `runnerNonce`, isolation receipt and OS-image receipt. Prefer different administrative control planes. Reusing the same checkout, workspace, runner identity or nonce is rejected.

The vulnerability snapshot must come from the same `package-lock.json` and must remain valid for the full provenance lifetime. High, critical or unknown findings block production.

## 1. Freeze source and choose SOURCE_DATE_EPOCH

Record the release commit or immutable source-package location before building. Select a fixed `SOURCE_DATE_EPOCH` from the release precommit. Do not derive it independently on each builder.

Generate the offline materials:

```bash
npm run preflight:pass4813 -- \
  --root "$PWD" \
  --source-date-epoch 1752662400 \
  --output artifacts/pass4813
```

This command creates a real lockfile SBOM, active-source manifest and deterministic build recipe. It intentionally does not invent a vulnerability PASS.

## 2. Acquire dependencies and collect the live audit

On a clean Node `24.18.0` / npm `11.16.0` builder:

```bash
npm ci --ignore-scripts=false --fund=false --audit=false
npm audit --json > /secure/release/npm-audit.json
```

Build the versioned vulnerability snapshot from that exact report with `materials:pass4813`. The report digest, lockfile digest and SBOM digest must agree. Do not manually edit or normalize the npm audit output after capture.

## 3. Create two independent hermetic build receipts

Each builder receives the same:

- source manifest;
- SBOM;
- vulnerability snapshot;
- build recipe;
- fixed `SOURCE_DATE_EPOCH`;
- external builder-isolation receipt;
- external network-isolation receipt;
- toolchain and OS-image digests.

Run:

```bash
npm run run:pass4813:hermetic-build -- --config /secure/release/builder-a.json
npm run run:pass4813:hermetic-build -- --config /secure/release/builder-b.json
```

The runner checks Node/npm before `npm ci`. After dependency acquisition, proxy variables are removed, npm is forced offline and the external network-isolation receipt is bound. The build environment injects a deterministic Next.js `BUILD_ID` derived from `sourcePackageDigest` using `source-package-digest-prefix-v1`.

Each run must pass:

1. clean `npm ci`;
2. live `npm audit` digest match;
3. runtime contract;
4. full TypeScript check;
5. ESLint;
6. Next production build;
7. started-server smoke;
8. post-build source manifest equality;
9. output-tree hashing.

## 4. Build and verify reproducible provenance

```bash
npm run build:pass4813:provenance -- --config /secure/release/provenance-build.json
npm run verify:pass4813:provenance -- --config /secure/release/provenance-verify.json
```

The two build receipts must have the same output digest, deterministic build ID and toolchain provenance digest. Builder IDs, workspaces and nonces must be distinct. The verifier reconstructs the provenance from the underlying artifacts rather than trusting the supplied provenance digest.

## 5. Bind provenance into the deployment receipt

```bash
npm run build:pass4813:deployment-receipt -- --config /secure/release/deployment.json
```

The deployment receipt must bind:

- source package digest;
- build artifact digest;
- deterministic build ID through the provenance;
- package-lock digest;
- SBOM digest;
- vulnerability snapshot digest;
- build recipe digest;
- public checkpoint and trust epoch;
- model and provider configuration roots.

External KMS/HSM signing and independent transparency publication from PASS4812 remain mandatory.

## 6. Runtime configuration

Inject the complete JSON artifacts through server-only secret/configuration storage:

- `VELMERE_COMMERCIAL_COHORT_SUPPLY_CHAIN_PROVENANCE_JSON`
- `VELMERE_COMMERCIAL_COHORT_SOURCE_MANIFEST_JSON`
- `VELMERE_COMMERCIAL_COHORT_SBOM_JSON`
- `VELMERE_COMMERCIAL_COHORT_VULNERABILITY_SNAPSHOT_JSON`
- `VELMERE_COMMERCIAL_COHORT_BUILD_RECIPE_JSON`
- `VELMERE_COMMERCIAL_COHORT_BUILD_RUN_RECEIPTS_JSON`

Do not expose these values to client bundles. Audit, Shield and Real Markets must remain blocked when verification fails.

## 7. Promotion checks

Before promotion, verify all of the following:

- exactly Node `24.18.0` and npm `11.16.0`;
- 100% SHA-512 integrity coverage in the lockfile SBOM;
- at least 80% license evidence coverage;
- no high, critical or unknown live audit findings;
- two independent successful build receipts;
- identical artifact digest and deterministic build ID;
- fresh provenance and vulnerability snapshot;
- valid public checkpoint, external signatures, transparency receipts and deployment receipt;
- real precommitted 50 Audit + 50 Shield + 50 Real Markets + 150 PDF cohort;
- staging Stripe/Supabase/entitlement/PDF end-to-end pass.

## 8. Failure and emergency policy

Never bypass a failed provenance check by replacing the digest in configuration. Freeze promotion, preserve the failed receipts and logs, identify whether the failure came from source mutation, dependency drift, toolchain drift, network activity, nondeterministic output or a vulnerability change, and rebuild from a newly precommitted release.

A rollback requires a new monotonic deployment receipt and must still point to an artifact with valid, non-expired provenance. Reusing an old receipt below the deployment floor is forbidden.

## Evidence classification

Offline SBOM/source/recipe generation is `prepared`. Synthetic matrices prove policy behavior only. A release becomes `live-proven` only after two real required-environment builds, a real current audit, real external custody/transparency, staging E2E and the live commercial cohort all pass.
