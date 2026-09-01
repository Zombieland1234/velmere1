import assert from "node:assert/strict";

import {
  observeVerifyDeployment,
  runVerifyContinuousMonitorWorker,
  verifyMonitorClaimLookaheadSeconds,
  verifyMonitorTtlSeconds,
  type VerifyContinuousMonitorDependencies,
  type VerifyMonitorClaim,
  type VerifyMonitorObservation,
} from "@/lib/verify/verify-continuous-monitor-worker";
import type { P82CurrentDeploymentReadonlyQuorumReceipt } from "@/lib/security/audit-current-deployment-readonly-quorum-v2";
import { deriveVerifyCanonicalDeploymentIdentityFromP82 } from "@/lib/verify/verify-canonical-deployment-identity";

const now = "2026-08-21T12:00:00.000Z";
const rawClaim = {
  attempt_count: 1,
  audited_deployment_digest: "a".repeat(64),
  chain_id: "56",
  contract_address: `0x${"1".repeat(40)}`,
  current_status: "VERIFIED",
  due_at: "2026-08-21T11:59:00.000Z",
  expected_event_digest: "b".repeat(64),
  job_id: "123e4567-e89b-42d3-a456-426614174000",
  lease_generation: 1,
  public_proof_id: `pubidx-${"c".repeat(48)}`,
  visibility: "PRIVATE",
};
const claim: VerifyMonitorClaim = {
  jobId: rawClaim.job_id,
  publicProofId: rawClaim.public_proof_id,
  chainId: rawClaim.chain_id,
  contractAddress: rawClaim.contract_address,
  expectedEventDigest: rawClaim.expected_event_digest,
  auditedDeploymentDigest: rawClaim.audited_deployment_digest,
  currentStatus: rawClaim.current_status,
  visibility: rawClaim.visibility,
  dueAt: rawClaim.due_at,
  attemptCount: rawClaim.attempt_count,
  leaseGeneration: String(rawClaim.lease_generation),
};
const blockHash = `0x${"2".repeat(64)}`;
const receiptDigest = "d".repeat(64);

function observation(outcome: "UNCHANGED" | "CHANGED"): VerifyMonitorObservation {
  return {
    outcome,
    observedDeploymentDigest: outcome === "UNCHANGED" ? claim.auditedDeploymentDigest : "e".repeat(64),
    verificationReceiptDigest: receiptDigest,
    checkedBlockNumber: "40000000",
    checkedBlockHash: blockHash,
    checkedAt: now,
    failureCode: null,
  };
}

function health(overrides: Record<string, unknown> = {}) {
  return {
    awaitingRevalidation: 0,
    deadLettered: 0,
    observedAt: now,
    processingActive: 0,
    processingExpired: 0,
    queuedClaimable: 0,
    queuedDue: 0,
    queuedTotal: 1,
    schemaVersion: "velmere.verify-monitor-health.v1",
    total: 1,
    ...overrides,
  };
}

function settle(state: "MONITORED_UNCHANGED" | "REVALIDATION_REQUIRED" | "MONITORING_UNAVAILABLE", overrides: Record<string, unknown> = {}) {
  return {
    currentStatus: state === "MONITORED_UNCHANGED" ? "VERIFIED" : state,
    deadLettered: false,
    eventDigest: "f".repeat(64),
    idempotent: false,
    publicationVersion: 2,
    retryScheduled: state === "MONITORING_UNAVAILABLE",
    schemaVersion: "velmere.verify-monitor-settle-receipt.v1",
    state,
    ...overrides,
  };
}

function dependencies(input: {
  observed: VerifyMonitorObservation;
  settleReceipt: Record<string, unknown>;
  healthReceipt?: Record<string, unknown>;
  claimRows?: unknown;
  calls?: Array<{ operation: string; args?: Record<string, unknown> }>;
}): VerifyContinuousMonitorDependencies {
  return {
    rpc: async (request) => {
      input.calls?.push(request);
      if (request.operation === "verify_monitor_job_claim") return { data: input.claimRows ?? [rawClaim] };
      if (request.operation === "verify_monitor_job_settle") return { data: input.settleReceipt };
      if (request.operation === "verify_monitor_health") return { data: input.healthReceipt ?? health() };
      throw new Error("unexpected_operation");
    },
    observe: async () => input.observed,
    workerToken: () => "monitor-worker-token-0001",
    now: () => new Date(now),
  };
}

async function main() {
  const unchangedCalls: Array<{ operation: string; args?: Record<string, unknown> }> = [];
  const unchanged = await runVerifyContinuousMonitorWorker({}, dependencies({
    observed: observation("UNCHANGED"),
    settleReceipt: settle("MONITORED_UNCHANGED"),
    calls: unchangedCalls,
  }));
  assert.equal(unchanged.claimed, 1);
  assert.equal(unchanged.monitored, 1);
  assert.equal(unchanged.unavailable, 0);
  assert.equal(unchanged.storeFailed, 0);
  assert.equal(unchanged.health?.deadLettered, 0);
  assert.equal(unchanged.schedulerTiming.documentedDeliveryJitterSeconds, 3_540);
  assert.equal(unchanged.schedulerTiming.preciseFreshnessGuaranteed, false);
  assert.ok(!JSON.stringify(unchanged).includes(claim.publicProofId));
  assert.ok(!JSON.stringify(unchanged).includes(claim.contractAddress));
  const claimCall = unchangedCalls.find((row) => row.operation === "verify_monitor_job_claim");
  assert.deepEqual(claimCall?.args, {
    p_worker_token: "monitor-worker-token-0001",
    p_limit: 1,
    p_lease_seconds: 180,
    p_lookahead_seconds: 0,
  });
  const unchangedSettle = unchangedCalls.find((row) => row.operation === "verify_monitor_job_settle");
  assert.equal(unchangedSettle?.args?.p_expected_event_digest, claim.expectedEventDigest);
  assert.equal(unchangedSettle?.args?.p_observation_outcome, "UNCHANGED");
  assert.equal(unchangedSettle?.args?.p_monitoring_ttl_seconds, 57_540);

  const changed = await runVerifyContinuousMonitorWorker({}, dependencies({
    observed: observation("CHANGED"),
    settleReceipt: settle("REVALIDATION_REQUIRED"),
  }));
  assert.equal(changed.revalidationRequired, 1);
  assert.equal(changed.monitored, 0);

  const unavailableObservation: VerifyMonitorObservation = {
    outcome: "FAILURE",
    observedDeploymentDigest: null,
    verificationReceiptDigest: "9".repeat(64),
    checkedBlockNumber: null,
    checkedBlockHash: null,
    checkedAt: now,
    failureCode: "provider_timeout",
  };
  const failed = await runVerifyContinuousMonitorWorker({}, dependencies({
    observed: unavailableObservation,
    settleReceipt: settle("MONITORING_UNAVAILABLE", {
      deadLettered: true,
      retryScheduled: false,
    }),
    healthReceipt: health({ deadLettered: 1, queuedTotal: 0 }),
  }));
  assert.equal(failed.unavailable, 1);
  assert.equal(failed.providerTimeout, 1);
  assert.equal(failed.deadLettered, 1);
  assert.equal(failed.health?.deadLettered, 1);

  const tamperedReceipt = await runVerifyContinuousMonitorWorker({}, dependencies({
    observed: observation("UNCHANGED"),
    settleReceipt: { ...settle("MONITORED_UNCHANGED"), providerTopology: "forbidden" },
  }));
  assert.equal(tamperedReceipt.storeFailed, 1, "unknown settlement fields fail closed");
  assert.equal(tamperedReceipt.monitored, 0);

  let malformedObserved = 0;
  await assert.rejects(
    runVerifyContinuousMonitorWorker({}, {
      ...dependencies({
        observed: observation("UNCHANGED"),
        settleReceipt: settle("MONITORED_UNCHANGED"),
        claimRows: [{ ...rawClaim, injected: "unexpected" }],
      }),
      observe: async () => {
        malformedObserved += 1;
        return observation("UNCHANGED");
      },
    }),
    /verify_monitor_claim_keys_invalid/,
  );
  assert.equal(malformedObserved, 0, "malformed claim stops before provider observation");

  assert.equal(verifyMonitorClaimLookaheadSeconds(new Date(now)), 0, "no preclaim outside the documented delivery window");
  assert.equal(verifyMonitorClaimLookaheadSeconds(new Date("2026-08-21T03:30:00.000Z")), 1_740);
  assert.equal(verifyMonitorClaimLookaheadSeconds(new Date("2026-08-21T02:30:00.000Z")), 0);
  assert.equal(verifyMonitorTtlSeconds(new Date(now)), 57_540, "freshness remains bound to the next documented window end");
  assert.equal(verifyMonitorTtlSeconds(new Date("2026-08-21T03:30:00.000Z")), 88_140);

  let invalidBatchObserved = 0;
  const secondClaim = {
    ...rawClaim,
    job_id: "223e4567-e89b-42d3-a456-426614174000",
    public_proof_id: `pubidx-${"d".repeat(48)}`,
  };
  await assert.rejects(
    runVerifyContinuousMonitorWorker({ limit: 1 }, {
      ...dependencies({
        observed: observation("UNCHANGED"),
        settleReceipt: settle("MONITORED_UNCHANGED"),
        claimRows: [rawClaim, secondClaim],
      }),
      observe: async () => {
        invalidBatchObserved += 1;
        return observation("UNCHANGED");
      },
    }),
    /verify_monitor_claim_count_exceeds_limit/,
  );
  assert.equal(invalidBatchObserved, 0, "oversized claim batch stops before provider observation");

  await assert.rejects(
    runVerifyContinuousMonitorWorker({ limit: 2 }, dependencies({
      observed: observation("UNCHANGED"),
      settleReceipt: settle("MONITORED_UNCHANGED"),
      claimRows: [rawClaim, { ...secondClaim, job_id: rawClaim.job_id }],
    })),
    /verify_monitor_claim_job_duplicate/,
  );

  await assert.rejects(
    runVerifyContinuousMonitorWorker({}, dependencies({
      observed: observation("UNCHANGED"),
      settleReceipt: settle("MONITORED_UNCHANGED"),
      claimRows: [{ ...rawClaim, attempt_count: 0 }],
    })),
    /verify_monitor_claim_attempt_invalid/,
  );

  await assert.rejects(
    runVerifyContinuousMonitorWorker({}, dependencies({
      observed: observation("UNCHANGED"),
      settleReceipt: settle("MONITORED_UNCHANGED"),
      claimRows: [{ ...rawClaim, due_at: "2026-08-21T12:01:00.000Z" }],
    })),
    /verify_monitor_claim_due_outside_window/,
  );

  for (const invalidReceipt of [
    settle("MONITORED_UNCHANGED", { currentStatus: "REVALIDATION_REQUIRED" }),
    settle("REVALIDATION_REQUIRED", { currentStatus: "VERIFIED" }),
    settle("MONITORING_UNAVAILABLE", { retryScheduled: false, deadLettered: false }),
    settle("MONITORING_UNAVAILABLE", { retryScheduled: true, deadLettered: true }),
  ]) {
    const result = await runVerifyContinuousMonitorWorker({}, dependencies({
      observed: observation("UNCHANGED"),
      settleReceipt: invalidReceipt,
    }));
    assert.equal(result.storeFailed, 1, "impossible settle state/status/flag combinations fail closed");
    assert.equal(result.monitored, 0);
    assert.equal(result.revalidationRequired, 0);
  }

  const invalidHealth = await runVerifyContinuousMonitorWorker({}, dependencies({
    observed: observation("UNCHANGED"),
    settleReceipt: settle("MONITORED_UNCHANGED"),
    claimRows: [],
    healthReceipt: health({ total: 1, queuedTotal: 0, queuedDue: 1, queuedClaimable: 0 }),
  }));
  assert.equal(invalidHealth.health, null);
  assert.equal(invalidHealth.storeFailed, 1, "impossible aggregate health telemetry fails closed");

  let preflightCollectorCalls = 0;
  const missingConfig = await observeVerifyDeployment(claim, {
    env: {},
    now: () => new Date(now),
    collect: async () => {
      preflightCollectorCalls += 1;
      return null;
    },
  });
  assert.equal(missingConfig.outcome, "FAILURE");
  assert.equal(missingConfig.failureCode, "configuration_unavailable");
  assert.equal(preflightCollectorCalls, 0, "missing config/rights must stop before collector/socket boundary");

  const provider = (index: number) => ({
    providerId: `provider-${index}`,
    operatorId: `operator-${index}`,
    providerFamily: `family-${index}`,
    correlationGroup: `correlation-${index}`,
    rpcUrl: `https://rpc${index}.example.com/`,
    rights: {
      status: "PUBLIC_REUSE_ALLOWED",
      evidenceSha256: `sha256:${String(index).repeat(64)}`,
      termsCheckedAt: "2026-08-20T00:00:00.000Z",
      reverifyBy: "2026-09-20T00:00:00.000Z",
      derivedUseAllowed: true,
      displayAllowed: true,
      attributionRequired: false,
    },
  });
  const env = {
    VELMERE_CURRENT_DEPLOYMENT_QUORUM_ENABLED: "true",
    VELMERE_CURRENT_DEPLOYMENT_QUORUM_KEY_ID_CURRENT: "monitor-key",
    VELMERE_CURRENT_DEPLOYMENT_QUORUM_SECRET_CURRENT: "s".repeat(40),
    VELMERE_BSC_CURRENT_RPC_MINIMUM_PROVIDERS: "3",
    VELMERE_BSC_CURRENT_RPC_QUORUM_CONFIG_JSON: JSON.stringify([provider(1), provider(2), provider(3)]),
  };
  const p82Receipt = {
    receiptDigest: `sha256:${"8".repeat(64)}`,
    generatedAt: now,
    target: { chainId: "56", address: claim.contractAddress },
    executionClass: "PUBLIC_READONLY_CURRENT",
    transportClass: "DEFAULT_NETWORK_STACK",
    classification: "PASS_EXACT_BLOCK_RUNTIME_PROXY_FORWARDER_QUORUM",
    proof: {
      exactBlockConsensusProven: true,
      currentRuntimeStateProven: true,
      currentProxyImplementationProven: true,
      currentTrustedForwarderStateProven: true,
    },
    customerCurrentRuntimeFactEligible: true,
    rights: { customerFactRightsEligible: true },
    snapshot: {
      headMin: 40_000_000,
      headMax: 40_000_000,
      headSkew: 0,
      blockNumber: 40_000_000,
      blockHash,
      parentHash: `0x${"1".repeat(64)}`,
      stateRoot: `0x${"3".repeat(64)}`,
      timestamp: Math.floor(Date.parse(now) / 1_000),
      timestampIso: now,
    },
    deployment: {
      historicalRuntimeRelation: "MATCHES_PINNED_HISTORICAL_RUNTIME",
      historicalImplementationRelation: "MATCHES_PINNED_HISTORICAL_IMPLEMENTATION",
      runtimeBytecodeSha256: `sha256:${"3".repeat(64)}`,
      proxyKind: "EIP_1167_COMPATIBLE_MINIMAL_PROXY",
      implementationAddress: `0x${"4".repeat(40)}`,
      implementationBytecodeSha256: `sha256:${"5".repeat(64)}`,
    },
    trustedForwarder: {
      selector: "0x572b6c05",
      address: `0x${"6".repeat(40)}`,
      state: "ACTIVE",
      callResultSha256: `sha256:${"7".repeat(64)}`,
      negativeControlAddress: `0x${"9".repeat(40)}`,
      negativeControlState: "INACTIVE",
      negativeControlCallResultSha256: `sha256:${"0".repeat(64)}`,
    },
    blockers: [],
  } as unknown as P82CurrentDeploymentReadonlyQuorumReceipt;
  const baselineIdentity = deriveVerifyCanonicalDeploymentIdentityFromP82(p82Receipt);
  assert.ok(baselineIdentity);
  const exactAuditClaim = { ...claim, auditedDeploymentDigest: baselineIdentity.digest };
  let eligibleCollectorCalls = 0;
  const eligible = await observeVerifyDeployment(exactAuditClaim, {
    env,
    now: () => new Date(now),
    collect: async () => {
      eligibleCollectorCalls += 1;
      return p82Receipt;
    },
    verify: (_value: unknown): _value is P82CurrentDeploymentReadonlyQuorumReceipt => true,
  });
  assert.equal(eligibleCollectorCalls, 1);
  assert.equal(eligible.outcome, "UNCHANGED");
  assert.equal(eligible.observedDeploymentDigest, exactAuditClaim.auditedDeploymentDigest);
  assert.equal(eligible.verificationReceiptDigest, "8".repeat(64));

  const changedReceipt = structuredClone(p82Receipt);
  changedReceipt.deployment.implementationBytecodeSha256 = `sha256:${"a".repeat(64)}`;
  const detected = await observeVerifyDeployment(exactAuditClaim, {
    env,
    now: () => new Date(now),
    collect: async () => changedReceipt,
    verify: (_value: unknown): _value is P82CurrentDeploymentReadonlyQuorumReceipt => true,
  });
  assert.equal(detected.outcome, "CHANGED");
  assert.notEqual(detected.observedDeploymentDigest, exactAuditClaim.auditedDeploymentDigest);
  assert.match(detected.observedDeploymentDigest, /^[a-f0-9]{64}$/);

  const stableHistoricalDifference = structuredClone(p82Receipt);
  stableHistoricalDifference.deployment.historicalRuntimeRelation = "DIFFERS_FROM_PINNED_HISTORICAL_RUNTIME";
  stableHistoricalDifference.deployment.historicalImplementationRelation = "DIFFERS_FROM_PINNED_HISTORICAL_IMPLEMENTATION";
  const stableX = await observeVerifyDeployment(exactAuditClaim, {
    env,
    now: () => new Date(now),
    collect: async () => stableHistoricalDifference,
    verify: (_value: unknown): _value is P82CurrentDeploymentReadonlyQuorumReceipt => true,
  });
  assert.equal(stableX.outcome, "UNCHANGED", "P79 relation is not the Verify comparison identity");

  const forwarderChanged = structuredClone(p82Receipt);
  forwarderChanged.trustedForwarder.state = "INACTIVE";
  const forwarderDetection = await observeVerifyDeployment(exactAuditClaim, {
    env,
    now: () => new Date(now),
    collect: async () => forwarderChanged,
    verify: (_value: unknown): _value is P82CurrentDeploymentReadonlyQuorumReceipt => true,
  });
  assert.equal(forwarderDetection.outcome, "CHANGED", "forwarder authorization is part of exact identity");

  console.log("V4 Verify continuous monitor runtime: PASS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
