import assert from "node:assert/strict";

import {
  buildCommercialCohortSloWindow,
  prepareCommercialCohortObservabilityReceipt,
  signCommercialCohortObservabilityReceipt,
  verifyCommercialCohortObservabilityReceiptChain,
  type CommercialCohortObservabilityReceipt,
  type CommercialCohortSloWindow,
} from "@/lib/worldclass/commercial-cohort-observability-incident";

import {
  createFixtureWindows,
  createPass4816Fixture,
  fixtureDigest,
  FIXTURE_AUDIENCE,
} from "./test-fixtures";

let assertions = 0;
function check(value: unknown, message: string): void {
  assert.ok(value, message);
  assertions += 1;
}

const fixture = createPass4816Fixture();

function createReceipt(args: {
  sequence: number;
  previousReceipt?: CommercialCohortObservabilityReceipt | null;
  windows: CommercialCohortSloWindow[];
  issuedAt: string;
  expiresAt: string;
  nonce: string;
  runId: string;
}): CommercialCohortObservabilityReceipt {
  const preparation = prepareCommercialCohortObservabilityReceipt({
    promotionTarget: "staging",
    audience: FIXTURE_AUDIENCE,
    observabilitySequence: args.sequence,
    previousReceipt: args.previousReceipt,
    testedDeployment: fixture.deploymentReceipt,
    stagingReceipt: fixture.stagingReceipt,
    chaosReceipt: fixture.chaosReceipt,
    trustBundle: fixture.trustBundle,
    windows: args.windows,
    issuedAt: new Date(args.issuedAt),
    expiresAt: new Date(args.expiresAt),
    runIdDigest: fixtureDigest(args.runId),
    nonce: args.nonce,
  });
  return signCommercialCohortObservabilityReceipt({ preparation, signers: fixture.privateSigners });
}

function verify(receipts: CommercialCohortObservabilityReceipt[], now: string, minimum = 1) {
  return verifyCommercialCohortObservabilityReceiptChain({
    receipts,
    trustBundles: [fixture.trustBundle],
    expectedAudience: FIXTURE_AUDIENCE,
    expectedPromotionTarget: "staging",
    currentDeploymentReceipt: fixture.deploymentReceipt,
    currentStagingReceipt: fixture.stagingReceipt,
    currentChaosReceipt: fixture.chaosReceipt,
    minimumObservabilitySequence: minimum,
    now: new Date(now),
  });
}

const windows1 = createFixtureWindows({
  ...fixture,
  variant: "sequence-1",
  startedAt: "2026-08-21T01:00:00.000Z",
  endedAt: "2026-08-21T07:00:00.000Z",
});
const receipt1 = createReceipt({
  sequence: 1,
  windows: windows1,
  issuedAt: "2026-08-21T07:30:00.000Z",
  expiresAt: "2026-08-21T13:30:00.000Z",
  nonce: "observability-sequence-1-nonce",
  runId: "observability-sequence-1-run",
});
const positive1 = verify([receipt1], "2026-08-21T08:00:00.000Z");
for (const field of [
  "verified", "observabilityVerified", "telemetryBound", "sloVerified",
  "incidentResponseVerified", "safeDegradationVerified", "observabilityRollbackProtected",
] as const) check(positive1[field] === true, `positive ${field}`);
check(positive1.blockers.length === 0, "positive chain has zero blockers");
check(positive1.objectiveCount === 12, "positive chain binds exactly twelve objectives");

const tampered = structuredClone(receipt1);
tampered.windows[0]!.metrics.telemetryCoverageRate = 0.1;
const tamperedVerification = verify([tampered], "2026-08-21T08:00:00.000Z");
check(!tamperedVerification.verified, "tampered metrics fail verification");
check(tamperedVerification.blockers.some((item) => item.includes("observability_telemetry_coverage_failed")), "tampered metric blocker is explicit");
check(tamperedVerification.blockers.some((item) => item.includes("observability_window_digest_invalid")), "tampered content breaks window digest");
check(tamperedVerification.blockers.some((item) => item.includes("observability_receipt_digest_invalid")), "tampered content breaks receipt digest");

const windows2 = createFixtureWindows({
  ...fixture,
  variant: "sequence-2",
  startedAt: "2026-08-21T08:00:00.000Z",
  endedAt: "2026-08-21T14:00:00.000Z",
});
const receipt2 = createReceipt({
  sequence: 2,
  previousReceipt: receipt1,
  windows: windows2,
  issuedAt: "2026-08-21T14:30:00.000Z",
  expiresAt: "2026-08-21T20:30:00.000Z",
  nonce: "observability-sequence-2-nonce",
  runId: "observability-sequence-2-run",
});
const positive2 = verify([receipt1, receipt2], "2026-08-21T15:00:00.000Z", 2);
check(positive2.verified, "valid monotonic two-receipt chain passes");
check(positive2.observabilitySequence === 2, "current sequence is two");
check(positive2.observabilityReceiptDigest === receipt2.observabilityReceiptDigest, "current digest is exact");

const replayedNonceReceipt = createReceipt({
  sequence: 2,
  previousReceipt: receipt1,
  windows: windows2,
  issuedAt: "2026-08-21T14:30:00.000Z",
  expiresAt: "2026-08-21T20:30:00.000Z",
  nonce: receipt1.nonce,
  runId: "observability-sequence-2-replayed-nonce-run",
});
const replayedNonce = verify([receipt1, replayedNonceReceipt], "2026-08-21T15:00:00.000Z");
check(!replayedNonce.verified, "replayed nonce fails");
check(replayedNonce.blockers.includes("observability_nonce_reused:2"), "replayed nonce blocker is exact");

const replayedRootReceipt = createReceipt({
  sequence: 2,
  previousReceipt: receipt1,
  windows: windows1,
  issuedAt: "2026-08-21T07:40:00.000Z",
  expiresAt: "2026-08-21T13:40:00.000Z",
  nonce: "observability-sequence-2-root-replay",
  runId: "observability-sequence-2-root-replay-run",
});
const replayedRoot = verify([receipt1, replayedRootReceipt], "2026-08-21T08:00:00.000Z");
check(!replayedRoot.verified, "replayed objective root fails");
check(replayedRoot.blockers.includes("observability_objective_root_reused:2"), "objective-root replay blocker is exact");

const sequenceGapReceipt = structuredClone(receipt2);
sequenceGapReceipt.observabilitySequence = 3;
const sequenceGap = verify([receipt1, sequenceGapReceipt], "2026-08-21T15:00:00.000Z");
check(!sequenceGap.verified, "sequence gap fails");
check(sequenceGap.blockers.includes("observability_sequence_gap:3/2"), "sequence gap blocker is exact");

const invalidWindowCore = { ...windows1[0] };
delete (invalidWindowCore as Partial<CommercialCohortSloWindow>).windowDigest;
check(() => {
  try {
    buildCommercialCohortSloWindow({
      ...invalidWindowCore,
      windowEndedAt: "2026-08-21T05:59:59.000Z",
    });
    return false;
  } catch (error) {
    return error instanceof Error && error.message.includes("observability_window_duration_invalid");
  }
}, "shorter-than-six-hour window is rejected");

check(() => {
  try {
    createReceipt({
      sequence: 3,
      previousReceipt: receipt1,
      windows: windows2,
      issuedAt: "2026-08-21T14:30:00.000Z",
      expiresAt: "2026-08-21T20:30:00.000Z",
      nonce: "observability-sequence-3-invalid-parent",
      runId: "observability-sequence-3-invalid-parent-run",
    });
    return false;
  } catch (error) {
    return error instanceof Error && error.message === "observability_previous_receipt_missing";
  }
}, "receipt preparation rejects a non-adjacent parent");

process.stdout.write(`${JSON.stringify({
  status: "PASS",
  liveCredit: false,
  evidenceClass: "SYNTHETIC_TEST_ONLY",
  assertions,
  positive: true,
  tamper: true,
  replay: true,
  sequence: true,
})}\n`);
