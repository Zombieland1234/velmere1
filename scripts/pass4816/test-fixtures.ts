import {
  generateKeyPairSync,
  sign as cryptoSign,
} from "node:crypto";

import { sha256Digest } from "@/lib/security/cryptographic-digest";
import {
  commercialCohortPublicKeyFingerprint,
  type CommercialCohortExternalSignerProvider,
  type CommercialCohortExternalSigningRequest,
  type CommercialCohortExternalSigningResponse,
} from "@/lib/worldclass/commercial-cohort-external-key-custody";
import {
  PASS4813_DEPLOYMENT_RECEIPT_POLICY_ID,
  PASS4813_DEPLOYMENT_RECEIPT_SCHEMA,
  type CommercialCohortDeploymentReceipt,
} from "@/lib/worldclass/commercial-cohort-deployment-receipt";
import {
  PASS4814_STAGING_E2E_POLICY_ID,
  PASS4814_STAGING_E2E_RECEIPT_SCHEMA,
  type CommercialCohortStagingE2EReceipt,
} from "@/lib/worldclass/commercial-cohort-staging-e2e";
import {
  PASS4815_CHAOS_RECEIPT_SCHEMA,
  PASS4815_CHAOS_RECOVERY_POLICY_ID,
  type CommercialCohortChaosReceipt,
} from "@/lib/worldclass/commercial-cohort-chaos-recovery";
import {
  buildCommercialCohortSloWindow,
  PASS4816_REQUIRED_SLO_OBJECTIVES,
  PASS4816_SLO_POLICY,
  type CommercialCohortSloWindow,
} from "@/lib/worldclass/commercial-cohort-observability-incident";
import {
  PASS4811_PUBLIC_CHECKPOINT_POLICY_ID,
  PASS4811_TRUST_BUNDLE_SCHEMA,
  type CommercialCohortPrivateSigner,
  type CommercialCohortTrustBundle,
} from "@/lib/worldclass/commercial-cohort-public-checkpoint";

export const FIXTURE_AUDIENCE = "velmere-pass4816-staging";
export const FIXTURE_DEPLOYMENT_ID = "deployment-pass4816-staging";
export const FIXTURE_CHAOS_COMPLETED_AT = "2026-08-21T00:00:00.000Z";

export function fixtureDigest(seed: string): string {
  return sha256Digest(`pass4816-fixture:${seed}`);
}

export type Pass4816FixtureKey = {
  keyId: string;
  privateKeyPem: string;
  publicKeyPem: string;
  publicKeyFingerprint: string;
};

function createKey(index: number): Pass4816FixtureKey {
  const pair = generateKeyPairSync("ed25519");
  const publicKeyPem = pair.publicKey.export({ type: "spki", format: "pem" }).toString();
  return {
    keyId: `release-pass4816-${index}`,
    privateKeyPem: pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicKeyPem,
    publicKeyFingerprint: commercialCohortPublicKeyFingerprint(publicKeyPem),
  };
}

export function createPass4816Fixture() {
  const keys = [createKey(1), createKey(2)];
  const trustBundleDigest = fixtureDigest("trust-bundle");
  const deploymentReceiptDigest = fixtureDigest("deployment-receipt");
  const stagingReceiptDigest = fixtureDigest("staging-receipt");
  const chaosReceiptDigest = fixtureDigest("chaos-receipt");
  const buildArtifactDigest = fixtureDigest("build-artifact");
  const sourcePackageDigest = fixtureDigest("source-package");
  const runtimeVersionRoot = fixtureDigest("runtime-version");
  const providerConfigRoot = fixtureDigest("provider-config");
  const modelConfigRoot = fixtureDigest("model-config");
  const supplyChainProvenanceDigest = fixtureDigest("supply-chain");

  const trustBundle: CommercialCohortTrustBundle = {
    schemaVersion: PASS4811_TRUST_BUNDLE_SCHEMA,
    policyVersion: PASS4811_PUBLIC_CHECKPOINT_POLICY_ID,
    epoch: 1,
    issuedAt: "2026-08-20T00:00:00.000Z",
    notBefore: "2026-08-20T00:00:00.000Z",
    expiresAt: "2026-08-23T00:00:00.000Z",
    previousBundleDigest: null,
    releaseSignatureThreshold: 2,
    witnessSignatureThreshold: 1,
    keys: keys.map((key) => ({
      keyId: key.keyId,
      purpose: "release",
      status: "active",
      publicKeyPem: key.publicKeyPem,
      publicKeyFingerprint: key.publicKeyFingerprint,
      notBefore: "2026-08-20T00:00:00.000Z",
      notAfter: "2026-08-23T00:00:00.000Z",
    })),
    revokedCheckpointDigests: [],
    bundleDigest: trustBundleDigest,
    rootSignatures: [],
  };

  const deploymentReceipt: CommercialCohortDeploymentReceipt = {
    schemaVersion: PASS4813_DEPLOYMENT_RECEIPT_SCHEMA,
    policyVersion: PASS4813_DEPLOYMENT_RECEIPT_POLICY_ID,
    environment: "staging",
    audience: FIXTURE_AUDIENCE,
    deploymentSequence: 1,
    previousDeploymentReceiptDigest: null,
    deploymentId: FIXTURE_DEPLOYMENT_ID,
    rolloutId: "rollout-pass4816-staging",
    checkpointSequence: 1,
    checkpointDigest: fixtureDigest("checkpoint"),
    trustEpoch: 1,
    trustBundleDigest,
    runtimeVersionRoot,
    providerConfigRoot,
    modelConfigRoot,
    buildArtifactDigest,
    sourcePackageDigest,
    supplyChainProvenanceDigest,
    sbomDigest: fixtureDigest("sbom"),
    vulnerabilitySnapshotDigest: fixtureDigest("vulnerability-snapshot"),
    buildRecipeDigest: fixtureDigest("build-recipe"),
    deploymentConfigRoot: fixtureDigest("deployment-config"),
    issuedAt: "2026-08-20T20:00:00.000Z",
    expiresAt: "2026-08-22T20:00:00.000Z",
    nonce: "deployment-pass4816-nonce",
    signatures: [],
    deploymentReceiptDigest,
  };

  const stagingReceipt: CommercialCohortStagingE2EReceipt = {
    schemaVersion: PASS4814_STAGING_E2E_RECEIPT_SCHEMA,
    policyVersion: PASS4814_STAGING_E2E_POLICY_ID,
    testedEnvironment: "staging",
    promotionTarget: "staging",
    audience: FIXTURE_AUDIENCE,
    stagingSequence: 1,
    previousStagingReceiptDigest: null,
    testedDeploymentId: FIXTURE_DEPLOYMENT_ID,
    testedDeploymentReceiptDigest: deploymentReceiptDigest,
    testedDeploymentIssuedAt: deploymentReceipt.issuedAt,
    releaseCandidateDigest: fixtureDigest("release-candidate"),
    buildArtifactDigest,
    sourcePackageDigest,
    runtimeVersionRoot,
    providerConfigRoot,
    modelConfigRoot,
    supplyChainProvenanceDigest,
    trustEpoch: 1,
    trustBundleDigest,
    probeDigests: [],
    probeRoot: fixtureDigest("probe-root"),
    serviceRoot: fixtureDigest("service-root"),
    probeCount: 0,
    startedAt: "2026-08-20T21:00:00.000Z",
    completedAt: "2026-08-20T22:00:00.000Z",
    issuedAt: "2026-08-20T22:10:00.000Z",
    expiresAt: "2026-08-22T22:10:00.000Z",
    runIdDigest: fixtureDigest("staging-run"),
    nonce: "staging-pass4816-nonce",
    probes: [],
    signatures: [],
    stagingReceiptDigest,
  };

  const chaosReceipt: CommercialCohortChaosReceipt = {
    schemaVersion: PASS4815_CHAOS_RECEIPT_SCHEMA,
    policyVersion: PASS4815_CHAOS_RECOVERY_POLICY_ID,
    testedEnvironment: "staging",
    promotionTarget: "staging",
    audience: FIXTURE_AUDIENCE,
    chaosSequence: 1,
    previousChaosReceiptDigest: null,
    testedDeploymentId: FIXTURE_DEPLOYMENT_ID,
    testedDeploymentReceiptDigest: deploymentReceiptDigest,
    stagingSequence: 1,
    stagingReceiptDigest,
    releaseCandidateDigest: fixtureDigest("release-candidate"),
    buildArtifactDigest,
    sourcePackageDigest,
    runtimeVersionRoot,
    providerConfigRoot,
    modelConfigRoot,
    supplyChainProvenanceDigest,
    trustEpoch: 1,
    trustBundleDigest,
    scenarioDigests: [],
    scenarioRoot: fixtureDigest("scenario-root"),
    objectiveRoot: fixtureDigest("chaos-objective-root"),
    reconciliationRoot: fixtureDigest("reconciliation-root"),
    scenarioCount: 0,
    startedAt: "2026-08-20T22:30:00.000Z",
    completedAt: FIXTURE_CHAOS_COMPLETED_AT,
    issuedAt: "2026-08-21T00:10:00.000Z",
    expiresAt: "2026-08-22T00:10:00.000Z",
    runIdDigest: fixtureDigest("chaos-run"),
    nonce: "chaos-pass4816-nonce",
    scenarios: [],
    signatures: [],
    chaosReceiptDigest,
  };

  const privateSigners: CommercialCohortPrivateSigner[] = keys.map((key) => ({
    keyId: key.keyId,
    privateKeyPem: key.privateKeyPem,
  }));

  return { keys, trustBundle, deploymentReceipt, stagingReceipt, chaosReceipt, privateSigners };
}

export function createFixtureWindows(args: {
  deploymentReceipt: CommercialCohortDeploymentReceipt;
  stagingReceipt: CommercialCohortStagingE2EReceipt;
  chaosReceipt: CommercialCohortChaosReceipt;
  variant: string;
  startedAt: string;
  endedAt: string;
}): CommercialCohortSloWindow[] {
  const startedMs = Date.parse(args.startedAt);
  return PASS4816_REQUIRED_SLO_OBJECTIVES.map((objective, index) => {
    const policy = PASS4816_SLO_POLICY[objective];
    const sampleCount = Math.max(policy.minSamples, 1_000);
    return buildCommercialCohortSloWindow({
      windowId: `window-${args.variant}-${String(index + 1).padStart(2, "0")}-${objective}`,
      objective,
      evidenceClass: "staging_real_observation",
      environment: "staging",
      audience: FIXTURE_AUDIENCE,
      testedDeploymentId: args.stagingReceipt.testedDeploymentId,
      testedDeploymentReceiptDigest: args.stagingReceipt.testedDeploymentReceiptDigest,
      stagingSequence: args.stagingReceipt.stagingSequence,
      stagingReceiptDigest: args.stagingReceipt.stagingReceiptDigest,
      chaosSequence: args.chaosReceipt.chaosSequence,
      chaosReceiptDigest: args.chaosReceipt.chaosReceiptDigest,
      buildArtifactDigest: args.deploymentReceipt.buildArtifactDigest,
      sourcePackageDigest: args.deploymentReceipt.sourcePackageDigest,
      runtimeVersionRoot: args.deploymentReceipt.runtimeVersionRoot,
      providerConfigRoot: args.deploymentReceipt.providerConfigRoot,
      modelConfigRoot: args.deploymentReceipt.modelConfigRoot,
      supplyChainProvenanceDigest: args.deploymentReceipt.supplyChainProvenanceDigest,
      windowStartedAt: args.startedAt,
      windowEndedAt: args.endedAt,
      alertProbeFiredAt: new Date(startedMs + 60 * 60 * 1_000).toISOString(),
      alertAcknowledgedAt: new Date(startedMs + 61 * 60 * 1_000).toISOString(),
      alertEscalatedAt: new Date(startedMs + 62 * 60 * 1_000).toISOString(),
      alertRouteVerified: true,
      degradationAction: policy.degradationAction,
      degradationExerciseVerified: true,
      customerDisclosureVerified: true,
      metrics: {
        sampleCount,
        successCount: sampleCount,
        errorCount: 0,
        availabilityRate: 1,
        p95LatencyMs: Math.min(100, policy.maxP95LatencyMs),
        p99LatencyMs: Math.min(200, policy.maxP99LatencyMs),
        freshnessP95Ms: Math.min(1_000, policy.maxFreshnessP95Ms),
        queueAgeP95Ms: Math.min(1_000, policy.maxQueueAgeP95Ms),
        errorBudgetConsumedRatio: 0,
        burnRate1h: 0,
        burnRate6h: 0,
        telemetryCoverageRate: 1,
        traceCoverageRate: 1,
        missingTelemetryIntervals: 0,
        unresolvedSev1Count: 0,
        unresolvedSev2Count: 0,
        mutedCriticalAlertCount: 0,
      },
      evidenceDigests: [
        fixtureDigest(`${args.variant}:${objective}:telemetry`),
        fixtureDigest(`${args.variant}:${objective}:trace`),
        fixtureDigest(`${args.variant}:${objective}:pager`),
      ],
      telemetryQueryDigest: fixtureDigest(`${args.variant}:${objective}:query`),
      traceRoot: fixtureDigest(`${args.variant}:${objective}:trace-root`),
      alertRouteDigest: fixtureDigest(`${args.variant}:${objective}:alert-route`),
      runbookDigest: fixtureDigest(`${args.variant}:${objective}:runbook`),
      onCallOwnerDigest: fixtureDigest(`${args.variant}:${objective}:owner`),
      degradationReceiptDigest: fixtureDigest(`${args.variant}:${objective}:degradation`),
    });
  });
}

export function createTestExternalSigningResponse(args: {
  request: CommercialCohortExternalSigningRequest;
  key: Pass4816FixtureKey;
  provider?: CommercialCohortExternalSignerProvider;
  signedAt: string;
}): CommercialCohortExternalSigningResponse {
  const payload = Buffer.from(args.request.payloadBase64Url, "base64url");
  return {
    schemaVersion: "velmere.external-signing-response.v1",
    policyVersion: "pass4812-external-key-custody-v1",
    requestId: args.request.requestId,
    keyId: args.request.keyId,
    provider: args.provider ?? "test-only",
    keyVersion: "test-only-v1",
    publicKeyPem: args.key.publicKeyPem,
    publicKeyFingerprint: args.key.publicKeyFingerprint,
    signature: cryptoSign(null, payload, args.key.privateKeyPem).toString("base64url"),
    signedAt: args.signedAt,
    custodyReceiptDigest: fixtureDigest(`custody:${args.request.requestId}`),
  };
}
