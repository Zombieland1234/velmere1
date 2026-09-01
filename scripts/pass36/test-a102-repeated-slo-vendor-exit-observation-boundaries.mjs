#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import policy from "../../config/pass36/a102-out-of-time-repeated-slo-vendor-exit-observation-policy.json" with { type: "json" };
import {
  A102BoundaryError,
  canonicalJson,
  sha256Text,
  validateA102ObservationBundle,
} from "./a102-repeated-slo-vendor-exit-observation-boundary.mjs";

let assertions = 0;
const ok = (value, message) => {
  assertions += 1;
  assert.ok(value, message);
};
const equal = (actual, expected, message) => {
  assertions += 1;
  assert.deepEqual(actual, expected, message);
};
function expectCode(fn, code, message) {
  assertions += 1;
  try {
    fn();
  } catch (error) {
    if (error instanceof A102BoundaryError && error.code === code) return;
    throw new Error(
      `assertion_failed:${message}:expected=${code}:actual=${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
  throw new Error(`assertion_failed:${message}:not_thrown`);
}

const SOURCE_REVISION =
  "VELMERE_PASS36_A101R0_MEASURED_SLO_ERROR_BUDGET_VENDOR_EXIT_AND_RECOVERY_TRUTH_BOUNDARY";
const SOURCE_MANIFEST = sha256Text("a102-frozen-source-manifest");
const SOURCE_ARCHIVE = sha256Text("a102-frozen-source-archive");
const ENVIRONMENT = sha256Text("a102-disposable-environment");
const BASE_MS = Date.parse("2026-07-20T00:00:00.000Z");
const keys = [0, 1, 2].map((index) => {
  const pair = crypto.generateKeyPairSync("ed25519");
  const publicKeyPem = pair.publicKey.export({ type: "spki", format: "pem" });
  return {
    keyId: `observer-key-${index + 1}`,
    organizationId: `observer-org-${index + 1}`,
    privateKey: pair.privateKey,
    publicKeyPem,
  };
});

function trustRoots() {
  return keys.map((key, index) => ({
    externalAnchorPath: `external/a102/anchor-${index + 1}.json`,
    externalAnchorSha256: sha256Text(`synthetic-anchor-${index + 1}`),
    keyId: key.keyId,
    organizationId: key.organizationId,
    publicKeyPem: key.publicKeyPem,
    revoked: false,
    validFrom: "2026-07-01T00:00:00.000Z",
    validUntil: "2026-08-31T00:00:00.000Z",
  }));
}

function prerequisites() {
  return policy.requiredPrerequisiteRevisions.map((revisionId, index) => ({
    byteLength: index + 1,
    decision: policy.requiredRealDecision,
    path: `external/a102/prerequisite-${String(index + 1).padStart(2, "0")}.json`,
    revisionId,
    sha256: sha256Text(`synthetic-prerequisite-${index + 1}`),
  }));
}

function runCore(index) {
  const startMs = BASE_MS + [0, 86_400_000, 259_200_000][index];
  const observer = keys[index % 2];
  const alternate = index % 2;
  return {
    a101Decision: policy.requiredRealDecision,
    a101ReceiptSha256: sha256Text(`a101-receipt-${index + 1}`),
    acknowledged: true,
    alertDelivered: true,
    alternateControlPlane: `alternate-control-${alternate + 1}`,
    alternateFailureDomain: `alternate-failure-${alternate + 1}`,
    alternateProbeSetVerified: true,
    alternateProviderId: `alternate-provider-${alternate + 1}`,
    alternateVendorFamily: `alternate-vendor-${alternate + 1}`,
    completedAt: new Date(startMs + 1_200_000).toISOString(),
    credentialRevocationVerified: true,
    environmentDigest: ENVIRONMENT,
    finalBaselineVerified: true,
    killSwitchTested: true,
    observerKeyId: observer.keyId,
    observerOrganizationId: observer.organizationId,
    primaryRestoreSucceeded: true,
    rollbackVerified: true,
    runId: `a102-run-${index + 1}`,
    schemaVersion: "velmere.a102.observation-run.v1",
    sloWindowEndedAt: new Date(startMs + 1_000_000).toISOString(),
    sloWindowStartedAt: new Date(startMs + 100_000).toISOString(),
    sourceArchiveSha256: SOURCE_ARCHIVE,
    sourceManifestSha256: SOURCE_MANIFEST,
    sourceRevisionId: SOURCE_REVISION,
    startedAt: new Date(startMs).toISOString(),
    vendorExitCompleted: true,
    zeroProductionPayments: true,
  };
}

function signRun(core) {
  const signer = keys.find((key) => key.keyId === core.observerKeyId);
  const receiptDigest = sha256Text(canonicalJson(core));
  return {
    ...core,
    receiptDigest,
    signatureBase64: crypto.sign(
      null,
      Buffer.from(receiptDigest, "ascii"),
      signer.privateKey,
    ).toString("base64"),
  };
}

function witnessFor(runs, patch = {}) {
  const signer = keys[2];
  const source = {
    runReceiptDigests: runs.map((run) => run.receiptDigest),
    sourceArchiveSha256: SOURCE_ARCHIVE,
    sourceManifestSha256: SOURCE_MANIFEST,
    sourceRevisionId: SOURCE_REVISION,
  };
  const core = {
    observationDigest: sha256Text(canonicalJson(source)),
    organizationId: signer.organizationId,
    runReceiptDigests: source.runReceiptDigests,
    schemaVersion: "velmere.a102.aggregate-witness.v1",
    sourceArchiveSha256: SOURCE_ARCHIVE,
    sourceManifestSha256: SOURCE_MANIFEST,
    sourceRevisionId: SOURCE_REVISION,
    witnessedAt: new Date(BASE_MS + 259_200_000 + 1_260_000).toISOString(),
    witnessKeyId: signer.keyId,
    ...patch,
  };
  const receiptDigest = sha256Text(canonicalJson(core));
  return {
    ...core,
    receiptDigest,
    signatureBase64: crypto.sign(
      null,
      Buffer.from(receiptDigest, "ascii"),
      signer.privateKey,
    ).toString("base64"),
  };
}

function fixture() {
  const runs = [0, 1, 2].map((index) => signRun(runCore(index)));
  return {
    evidenceClass: "SYNTHETIC_TEST_ONLY",
    prerequisites: prerequisites(),
    runs,
    schemaVersion: "velmere.a102.observation-bundle.v1",
    sourceArchiveSha256: SOURCE_ARCHIVE,
    sourceManifestSha256: SOURCE_MANIFEST,
    sourceRevisionId: SOURCE_REVISION,
    witness: witnessFor(runs),
  };
}

function resignRun(row, patch) {
  const core = { ...row, ...patch };
  delete core.receiptDigest;
  delete core.signatureBase64;
  return signRun(core);
}

function rebuildWitness(bundle, patch = {}) {
  return { ...bundle, witness: witnessFor(bundle.runs, patch) };
}

const clean = validateA102ObservationBundle(fixture(), {
  allowSynthetic: true,
  nowMs: BASE_MS + 259_200_000 + 2_000_000,
  policy,
  trustRoots: trustRoots(),
});
equal(clean.decision, "STRUCTURAL_SYNTHETIC_TEST_ONLY", "synthetic decision exact");
equal(clean.structuralVerified, true, "structural verified");
equal(clean.referencedFilesReadAndHashed, false, "synthetic references are not external evidence");
equal(clean.realCreditEligible, false, "synthetic real credit denied");
equal(clean.externalPromotionReviewRequired, true, "independent promotion review remains required");
equal(clean.continuousMonitoringProven, false, "bounded observation is not continuous monitoring");
equal(clean.productionSloProven, false, "bounded observation is not production SLO");
equal(clean.runCount, 3, "run denominator exact");
ok(clean.observationSpanSeconds >= 259_200, "observation span floor");
equal(clean.runObserverOrganizations, 2, "run observer org diversity");
equal(clean.totalObserverOrganizations, 3, "aggregate witness independent org");
equal(clean.distinctObserverKeys, 3, "observer key diversity");
equal(clean.distinctAlternateProviders, 2, "alternate provider diversity");
equal(clean.prerequisites, 11, "prerequisite denominator exact");
ok(/^[a-f0-9]{64}$/u.test(clean.observationDigest), "aggregate observation digest");

expectCode(
  () => validateA102ObservationBundle(fixture(), {
    nowMs: BASE_MS + 259_200_000 + 2_000_000,
    policy,
    trustRoots: trustRoots(),
  }),
  "a102_bundle_evidence_class_invalid",
  "synthetic evidence requires explicit test mode",
);

{
  const bundle = fixture();
  bundle.unexpected = true;
  expectCode(
    () => validateA102ObservationBundle(bundle, {
      allowSynthetic: true,
      nowMs: BASE_MS + 259_200_000 + 2_000_000,
      policy,
      trustRoots: trustRoots(),
    }),
    "a102_bundle_fields_invalid",
    "unknown bundle field rejected",
  );
}

{
  const bundle = fixture();
  bundle.prerequisites[1].path = bundle.prerequisites[0].path;
  expectCode(
    () => validateA102ObservationBundle(bundle, {
      allowSynthetic: true,
      nowMs: BASE_MS + 259_200_000 + 2_000_000,
      policy,
      trustRoots: trustRoots(),
    }),
    "a102_prerequisite_path_duplicate",
    "duplicate prerequisite path rejected",
  );
}

{
  const bundle = fixture();
  bundle.prerequisites[0].decision = "FIXTURE_PASS";
  expectCode(
    () => validateA102ObservationBundle(bundle, {
      allowSynthetic: true,
      nowMs: BASE_MS + 259_200_000 + 2_000_000,
      policy,
      trustRoots: trustRoots(),
    }),
    "a102_prerequisite_not_real_verified",
    "fixture prerequisite decision rejected",
  );
}

{
  const bundle = fixture();
  bundle.runs[0].receiptDigest = "f".repeat(64);
  expectCode(
    () => validateA102ObservationBundle(bundle, {
      allowSynthetic: true,
      nowMs: BASE_MS + 259_200_000 + 2_000_000,
      policy,
      trustRoots: trustRoots(),
    }),
    "a102_run_receipt_digest_invalid",
    "run digest tamper rejected",
  );
}

{
  const bundle = fixture();
  bundle.runs[0].signatureBase64 = Buffer.alloc(64, 1).toString("base64");
  expectCode(
    () => validateA102ObservationBundle(bundle, {
      allowSynthetic: true,
      nowMs: BASE_MS + 259_200_000 + 2_000_000,
      policy,
      trustRoots: trustRoots(),
    }),
    "a102_run_signature_invalid",
    "run signature tamper rejected",
  );
}

{
  let bundle = fixture();
  bundle.runs[0] = resignRun(bundle.runs[0], {
    sourceManifestSha256: sha256Text("other-source"),
  });
  bundle = rebuildWitness(bundle);
  expectCode(
    () => validateA102ObservationBundle(bundle, {
      allowSynthetic: true,
      nowMs: BASE_MS + 259_200_000 + 2_000_000,
      policy,
      trustRoots: trustRoots(),
    }),
    "a102_run_frozen_source_mismatch",
    "re-signed source drift rejected",
  );
}

{
  let bundle = fixture();
  bundle.runs[1] = resignRun(bundle.runs[1], {
    a101Decision: "PASS_FIXTURE_ONLY",
  });
  bundle = rebuildWitness(bundle);
  expectCode(
    () => validateA102ObservationBundle(bundle, {
      allowSynthetic: true,
      nowMs: BASE_MS + 259_200_000 + 2_000_000,
      policy,
      trustRoots: trustRoots(),
    }),
    "a102_run_a101_decision_invalid",
    "re-signed false A101 decision rejected",
  );
}

{
  let bundle = fixture();
  bundle.runs[1] = resignRun(bundle.runs[1], {
    startedAt: new Date(BASE_MS + 80_000_000).toISOString(),
    sloWindowStartedAt: new Date(BASE_MS + 80_100_000).toISOString(),
    sloWindowEndedAt: new Date(BASE_MS + 81_000_000).toISOString(),
    completedAt: new Date(BASE_MS + 81_200_000).toISOString(),
  });
  bundle = rebuildWitness(bundle);
  expectCode(
    () => validateA102ObservationBundle(bundle, {
      allowSynthetic: true,
      nowMs: BASE_MS + 259_200_000 + 2_000_000,
      policy,
      trustRoots: trustRoots(),
    }),
    "a102_run_gap_too_short",
    "short out-of-time gap rejected",
  );
}

{
  let bundle = fixture();
  bundle.runs[1] = resignRun(bundle.runs[1], {
    runId: bundle.runs[0].runId,
  });
  bundle = rebuildWitness(bundle);
  expectCode(
    () => validateA102ObservationBundle(bundle, {
      allowSynthetic: true,
      nowMs: BASE_MS + 259_200_000 + 2_000_000,
      policy,
      trustRoots: trustRoots(),
    }),
    "a102_run_id_duplicate",
    "non-adjacent duplicate run ID rejected",
  );
}

{
  let bundle = fixture();
  bundle.runs[2] = resignRun(bundle.runs[2], {
    alternateProviderId: "alternate-provider-1",
    alternateVendorFamily: "alternate-vendor-1",
    alternateControlPlane: "alternate-control-1",
    alternateFailureDomain: "alternate-failure-1",
  });
  bundle.runs[1] = resignRun(bundle.runs[1], {
    alternateProviderId: "alternate-provider-1",
    alternateVendorFamily: "alternate-vendor-1",
    alternateControlPlane: "alternate-control-1",
    alternateFailureDomain: "alternate-failure-1",
  });
  bundle = rebuildWitness(bundle);
  expectCode(
    () => validateA102ObservationBundle(bundle, {
      allowSynthetic: true,
      nowMs: BASE_MS + 259_200_000 + 2_000_000,
      policy,
      trustRoots: trustRoots(),
    }),
    "a102_alternate_provider_diversity_failed",
    "alternate provider monoculture rejected",
  );
}

{
  let bundle = fixture();
  bundle.runs[1] = resignRun(bundle.runs[1], {
    observerKeyId: keys[0].keyId,
    observerOrganizationId: keys[0].organizationId,
  });
  bundle = rebuildWitness(bundle);
  expectCode(
    () => validateA102ObservationBundle(bundle, {
      allowSynthetic: true,
      nowMs: BASE_MS + 259_200_000 + 2_000_000,
      policy,
      trustRoots: trustRoots(),
    }),
    "a102_observer_org_diversity_failed",
    "run observer monoculture rejected",
  );
}

{
  const bundle = rebuildWitness(fixture(), {
    organizationId: keys[0].organizationId,
    witnessKeyId: keys[0].keyId,
  });
  expectCode(
    () => validateA102ObservationBundle(bundle, {
      allowSynthetic: true,
      nowMs: BASE_MS + 259_200_000 + 2_000_000,
      policy,
      trustRoots: trustRoots(),
    }),
    "a102_witness_not_independent",
    "witness organization must be independent",
  );
}

{
  const bundle = rebuildWitness(fixture(), {
    witnessedAt: new Date(BASE_MS + 259_200_000 + 90_000_000).toISOString(),
  });
  expectCode(
    () => validateA102ObservationBundle(bundle, {
      allowSynthetic: true,
      nowMs: BASE_MS + 259_200_000 + 100_000_000,
      policy,
      trustRoots: trustRoots(),
    }),
    "a102_witness_delay_invalid",
    "late witness rejected",
  );
}

{
  let bundle = fixture();
  bundle.runs[0] = resignRun(bundle.runs[0], {
    zeroProductionPayments: false,
  });
  bundle = rebuildWitness(bundle);
  expectCode(
    () => validateA102ObservationBundle(bundle, {
      allowSynthetic: true,
      nowMs: BASE_MS + 259_200_000 + 2_000_000,
      policy,
      trustRoots: trustRoots(),
    }),
    "a102_run_zeroProductionPayments_not_true",
    "production payment in observation denied",
  );
}

{
  const roots = trustRoots();
  roots[0].revoked = true;
  expectCode(
    () => validateA102ObservationBundle(fixture(), {
      allowSynthetic: true,
      nowMs: BASE_MS + 259_200_000 + 2_000_000,
      policy,
      trustRoots: roots,
    }),
    "a102_trust_root_revoked",
    "revoked observer key rejected",
  );
}

{
  const bundle = fixture();
  bundle.evidenceClass = "REAL_DISPOSABLE_STAGING";
  let evidenceCalls = 0;
  expectCode(
    () => validateA102ObservationBundle(bundle, {
      nowMs: BASE_MS + 259_200_000 + 2_000_000,
      policy,
      readEvidence() {
        evidenceCalls += 1;
        throw new Error("external evidence absent");
      },
      trustRoots: trustRoots(),
    }),
    "a102_real_evidence_requires_external_verifier",
    "local validator rejects even a fully self-issued real bundle",
  );
  equal(evidenceCalls, 0, "real claim rejected before caller-controlled evidence callback");
}

{
  const bundle = fixture();
  bundle.sourceRevisionId = "VELMERE_PASS36_FAKE_SOURCE";
  expectCode(
    () => validateA102ObservationBundle(bundle, {
      allowSynthetic: true,
      nowMs: BASE_MS + 259_200_000 + 2_000_000,
      trustRoots: trustRoots(),
    }),
    "a102_bundle_source_authority_mismatch",
    "bundle-wide source authority substitution rejected",
  );
}

{
  const bundle = fixture();
  bundle.runs = bundle.runs.slice(0, 1);
  const weakenedPolicy = structuredClone(policy);
  weakenedPolicy.observation.minimumRuns = 1;
  expectCode(
    () => validateA102ObservationBundle(bundle, {
      allowSynthetic: true,
      nowMs: BASE_MS + 2_000_000,
      policy: weakenedPolicy,
      trustRoots: trustRoots(),
    }),
    "a102_run_denominator_invalid",
    "caller-supplied weaker policy cannot replace canonical policy",
  );
}

{
  const roots = trustRoots();
  roots[1].publicKeyPem = roots[0].publicKeyPem;
  expectCode(
    () => validateA102ObservationBundle(fixture(), {
      allowSynthetic: true,
      nowMs: BASE_MS + 259_200_000 + 2_000_000,
      trustRoots: roots,
    }),
    "a102_trust_root_duplicate_public_key",
    "one signing key cannot impersonate multiple organizations",
  );
}

expectCode(
  () => validateA102ObservationBundle(fixture(), {
    allowSynthetic: true,
    nowMs: Number.NaN,
    trustRoots: trustRoots(),
  }),
  "a102_now_invalid",
  "non-finite caller time rejected",
);

if (assertions !== 37) {
  throw new Error(`a102_assertion_denominator_drift:${assertions}`);
}

console.log(JSON.stringify({
  status: "PASS_A102R1_STRUCTURAL_BOUNDARY_LOCAL_SYNTHETIC_ONLY_REAL_CLAIMS_REJECTED",
  assertions,
  fixtureRuns: 3,
  realObservationRuns: 0,
  realCreditEligible: false,
  externalPromotionReviewRequired: true,
  continuousMonitoringProven: false,
  live: false,
  saleEnabled: false,
}, null, 2));
