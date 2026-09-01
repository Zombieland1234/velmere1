#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  acquireSegmentedBuildLock,
  inspectSegmentedBuildLockForRecovery,
  recoverSegmentedBuildLockFromInspection,
  releaseSegmentedBuildLock,
  SEGMENTED_BUILD_ORPHAN_RECOVERY_CONFIRMATION,
} from "../../lib/build/segmented-build-integrity.mjs";

let assertions = 0;
function equal(actual, expected, message) {
  assertions += 1;
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}:expected=${JSON.stringify(expected)}:actual=${JSON.stringify(actual)}`);
  }
}
function truthy(value, message) {
  assertions += 1;
  if (!value) throw new Error(message);
}

const suiteRoot = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-orphan-lock-"));
const sourceRoot = path.join(suiteRoot, "source");
const externalLockRoot = path.join(suiteRoot, "locks");
const mode = "webpack";
const distDir = ".next-pass25-webpack";
const buildId = "vlm-orphan-lock-test";
const sourceFingerprintSha256 = "a".repeat(64);
const nowMs = Date.parse("2026-07-28T22:30:00.000Z");
const staleAt = "2026-07-28T20:00:00.000Z";
const reviewsFor = (inspection) => [
  {
    role: "BUILD_OPERATOR",
    reviewerIdHash: "1".repeat(64),
    inspectionDigestSha256: inspection.inspectionDigestSha256,
    decision: "APPROVE_ORPHAN_LOCK_QUARANTINE",
    conflictOfInterest: false,
    reviewedAt: "2026-07-28T22:31:00.000Z",
  },
  {
    role: "RELEASE_REVIEWER",
    reviewerIdHash: "2".repeat(64),
    inspectionDigestSha256: inspection.inspectionDigestSha256,
    decision: "APPROVE_ORPHAN_LOCK_QUARANTINE",
    conflictOfInterest: false,
    reviewedAt: "2026-07-28T22:32:00.000Z",
  },
];

function createStaleLock({ acquiredAt = staleAt } = {}) {
  const lock = acquireSegmentedBuildLock({
    root: sourceRoot,
    mode,
    distDir,
    buildId,
    acquiredAt,
    sourceFingerprintSha256,
    externalLockRoot,
  });
  truthy(lock.acquired, "fixture lock acquired");
  fs.closeSync(lock.descriptor);
  const metadata = JSON.parse(fs.readFileSync(lock.absolutePath, "utf8"));
  metadata.pid = 999_999_999;
  metadata.ppid = 999_999_998;
  metadata.processStartTicks = "1";
  fs.writeFileSync(lock.absolutePath, `${JSON.stringify(metadata, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(lock.absolutePath, 0o600);
  return lock;
}

try {
  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.mkdirSync(externalLockRoot, { recursive: true, mode: 0o700 });
  fs.chmodSync(externalLockRoot, 0o700);

  let finalStatus;
  let finalTruthBoundary;
  if (process.platform === "win32") {
    const active = acquireSegmentedBuildLock({
      root: sourceRoot,
      mode,
      distDir,
      buildId,
      sourceFingerprintSha256,
      externalLockRoot,
    });
    equal(active.owner.sourceFingerprintSha256, sourceFingerprintSha256, "Windows acquisition binds source fingerprint");
    equal(active.owner.processIdentityBound, false, "Windows acquisition does not claim Linux process identity");
    equal(active.owner.windowsAclOwnershipVerified, false, "Windows acquisition does not claim unverified ACL ownership");
    equal(active.owner.directoryEntryFsyncApplied, false, "Windows acquisition does not claim directory-entry fsync");
    equal(active.owner.crashDurabilityProven, false, "Windows acquisition does not claim crash durability");
    equal(active.owner.orphanRecoverySupported, false, "Windows acquisition does not advertise orphan recovery");
    const activeInspection = inspectSegmentedBuildLockForRecovery({
      root: sourceRoot,
      mode,
      distDir,
      expectedSourceFingerprintSha256: sourceFingerprintSha256,
      externalLockRoot,
      nowMs,
    });
    equal(activeInspection.status, "BLOCKED_PLATFORM_PROCESS_IDENTITY_UNAVAILABLE", "Windows active-lock recovery is fail-closed without exact process identity");
    equal(activeInspection.processIdentity.status, "UNSUPPORTED_PLATFORM", "inspection records the unavailable process-identity verifier");
    equal(activeInspection.recoverable, false, "Windows active lock is not recoverable");
    equal(activeInspection.rawExternalPathDisclosed, false, "Windows inspection does not disclose the raw lock root");
    equal(activeInspection.outputState.status, "ABSENT", "Windows active-lock inspection physically sees absent build output");
    equal(activeInspection.owner.sourceFingerprintSha256, sourceFingerprintSha256, "Windows inspection retains exact source binding");
    const activeRelease = releaseSegmentedBuildLock(active);
    equal(activeRelease.status, "RELEASED", "Windows active fixture lock releases through its owner handle");
    equal(activeRelease.releaseVisibilityVerified, true, "Windows owner release verifies visible path absence");
    equal(activeRelease.directoryEntryFsyncApplied, false, "Windows owner release does not claim directory-entry fsync");
    equal(activeRelease.crashDurabilityProven, false, "Windows owner release receives no crash-durability credit");

    const stale = createStaleLock();
    const inspection = inspectSegmentedBuildLockForRecovery({
      root: sourceRoot,
      mode,
      distDir,
      expectedSourceFingerprintSha256: sourceFingerprintSha256,
      externalLockRoot,
      nowMs,
    });
    equal(inspection.status, "BLOCKED_PLATFORM_PROCESS_IDENTITY_UNAVAILABLE", "old Windows lock remains blocked without trustworthy process identity");
    equal(inspection.recoverable, false, "old Windows fixture never becomes recovery-eligible");
    equal(inspection.rawExternalPathDisclosed, false, "old Windows lock inspection does not disclose the raw path");
    equal(inspection.processIdentity.status, "UNSUPPORTED_PLATFORM", "old Windows lock still lacks a trustworthy process identity");
    equal(inspection.outputState.status, "ABSENT", "old Windows fixture cannot use output presence as a recovery shortcut");
    equal(inspection.owner.sourceFingerprintSha256, sourceFingerprintSha256, "old Windows lock remains bound to the expected source fingerprint");
    equal(recoverSegmentedBuildLockFromInspection({
      inspection,
      reviews: reviewsFor(inspection),
      confirmationToken: "WRONG",
    }).status, "REJECTED_CONFIRMATION_TOKEN", "wrong recovery confirmation is rejected before any platform action");
    const rejected = recoverSegmentedBuildLockFromInspection({
      inspection,
      reviews: reviewsFor(inspection),
      confirmationToken: SEGMENTED_BUILD_ORPHAN_RECOVERY_CONFIRMATION,
    });
    equal(rejected.status, "REJECTED_PLATFORM_PROCESS_IDENTITY_UNAVAILABLE", "Windows orphan recovery is explicitly rejected");
    equal(rejected.recovered, false, "Windows rejection cannot claim lock recovery");
    equal(rejected.automaticLockStealing, false, "Windows rejection never steals a lock automatically");
    equal(fs.existsSync(stale.absolutePath), true, "rejected Windows orphan lock remains for operator review");
    equal(fs.existsSync(path.join(stale.directory, "quarantine")), false, "Windows rejection creates no quarantine directory");
    const blockedReacquire = acquireSegmentedBuildLock({
      root: sourceRoot,
      mode,
      distDir,
      buildId,
      sourceFingerprintSha256,
      externalLockRoot,
    });
    equal(blockedReacquire.status, "BLOCKED_BUILD_LOCK", "stale Windows lock continues to block reacquisition");
    equal(blockedReacquire.observed.readable, true, "blocked reacquisition retains bounded owner diagnostics");
    equal(blockedReacquire.observed.authority, "NON_AUTHORITATIVE_PATH_DIAGNOSTIC_ONLY", "blocked owner diagnostics are explicitly non-authoritative");
    fs.unlinkSync(stale.absolutePath);
    const postCleanup = acquireSegmentedBuildLock({
      root: sourceRoot,
      mode,
      distDir,
      buildId,
      sourceFingerprintSha256,
      externalLockRoot,
    });
    equal(postCleanup.acquired, true, "explicit test cleanup permits a fresh owner acquisition");
    equal(releaseSegmentedBuildLock(postCleanup).status, "RELEASED", "fresh post-cleanup Windows lock releases normally");
    finalStatus = "PASS_LOCAL_WINDOWS_ORPHAN_RECOVERY_FAIL_CLOSED";
    finalTruthBoundary = "Windows physically proves fail-closed orphan handling: no Linux process identity, ACL ownership, directory-fsync durability, quarantine or recovery credit is claimed. The owner may release an active lock; stale locks require external operator handling.";
  } else {
  const active = acquireSegmentedBuildLock({
    root: sourceRoot,
    mode,
    distDir,
    buildId,
    sourceFingerprintSha256,
    externalLockRoot,
  });
  equal(active.owner.sourceFingerprintSha256, sourceFingerprintSha256, "v2 acquisition binds source fingerprint");
  equal(active.owner.processIdentityBound, true, "v2 acquisition binds Linux process identity");
  const activeInspection = inspectSegmentedBuildLockForRecovery({
    root: sourceRoot,
    mode,
    distDir,
    expectedSourceFingerprintSha256: sourceFingerprintSha256,
    externalLockRoot,
    nowMs,
  });
  equal(activeInspection.status, "BLOCKED_ACTIVE_PROCESS", "active exact process cannot be recovered");
  equal(activeInspection.recoverable, false, "active lock is not recoverable");
  equal(releaseSegmentedBuildLock(active).status, "RELEASED", "active fixture lock releases normally");

  const stale = createStaleLock();
  const inspection = inspectSegmentedBuildLockForRecovery({
    root: sourceRoot,
    mode,
    distDir,
    expectedSourceFingerprintSha256: sourceFingerprintSha256,
    externalLockRoot,
    nowMs,
  });
  equal(inspection.status, "STALE_LOCK_ELIGIBLE_FOR_DUAL_REVIEW_QUARANTINE", "dead old lock with absent output is eligible for review");
  equal(inspection.recoverable, true, "eligible stale lock is recoverable");
  equal(inspection.rawExternalPathDisclosed, false, "inspection does not disclose raw lock root");

  const wrongSource = inspectSegmentedBuildLockForRecovery({
    root: sourceRoot,
    mode,
    distDir,
    expectedSourceFingerprintSha256: "b".repeat(64),
    externalLockRoot,
    nowMs,
  });
  equal(wrongSource.status, "BLOCKED_STRUCTURAL_OR_SOURCE_BINDING", "source mismatch blocks recovery");

  fs.mkdirSync(path.join(sourceRoot, distDir), { recursive: true });
  const outputPresent = inspectSegmentedBuildLockForRecovery({
    root: sourceRoot,
    mode,
    distDir,
    expectedSourceFingerprintSha256: sourceFingerprintSha256,
    externalLockRoot,
    nowMs,
  });
  equal(outputPresent.status, "BLOCKED_OUTPUT_REQUIRES_OPERATOR_QUARANTINE", "present output blocks lock recovery");
  fs.rmSync(path.join(sourceRoot, distDir), { recursive: true, force: true });

  const tooYoung = inspectSegmentedBuildLockForRecovery({
    root: sourceRoot,
    mode,
    distDir,
    expectedSourceFingerprintSha256: sourceFingerprintSha256,
    externalLockRoot,
    nowMs: Date.parse(staleAt) + 5 * 60 * 1000,
  });
  equal(tooYoung.status, "BLOCKED_MINIMUM_AGE", "minimum stale age is enforced");

  const reviews = reviewsFor(inspection);
  equal(recoverSegmentedBuildLockFromInspection({
    inspection,
    reviews: [reviews[0]],
    confirmationToken: SEGMENTED_BUILD_ORPHAN_RECOVERY_CONFIRMATION,
  }).status, "REJECTED_DUAL_REVIEW", "single review is rejected");
  equal(recoverSegmentedBuildLockFromInspection({
    inspection,
    reviews: [reviews[0], { ...reviews[1], reviewerIdHash: reviews[0].reviewerIdHash }],
    confirmationToken: SEGMENTED_BUILD_ORPHAN_RECOVERY_CONFIRMATION,
  }).status, "REJECTED_REVIEW_INDEPENDENCE", "duplicate reviewer is rejected");
  equal(recoverSegmentedBuildLockFromInspection({
    inspection,
    reviews,
    confirmationToken: "WRONG",
  }).status, "REJECTED_CONFIRMATION_TOKEN", "wrong confirmation is rejected");
  equal(recoverSegmentedBuildLockFromInspection({
    inspection,
    reviews: reviews.map((review) => ({ ...review, inspectionDigestSha256: "f".repeat(64) })),
    confirmationToken: SEGMENTED_BUILD_ORPHAN_RECOVERY_CONFIRMATION,
  }).status, "REJECTED_DUAL_REVIEW", "reviews bound to another inspection are rejected");

  const recovered = recoverSegmentedBuildLockFromInspection({
    inspection,
    reviews,
    confirmationToken: SEGMENTED_BUILD_ORPHAN_RECOVERY_CONFIRMATION,
  });
  equal(recovered.status, "QUARANTINED_AFTER_DUAL_REVIEW", "reviewed stale lock is quarantined");
  equal(recovered.recovered, true, "recovery is successful");
  equal(recovered.lockDeleted, false, "lock evidence is retained rather than deleted");
  equal(recovered.automaticLockStealing, false, "recovery is never automatic lock stealing");
  equal(fs.existsSync(stale.absolutePath), false, "original lock path is free after quarantine");
  truthy(fs.existsSync(path.join(stale.directory, "quarantine", `${inspection.inspectionDigestSha256}.lock`)), "quarantined evidence exists");

  const reacquired = acquireSegmentedBuildLock({
    root: sourceRoot,
    mode,
    distDir,
    buildId,
    sourceFingerprintSha256,
    externalLockRoot,
  });
  truthy(reacquired.acquired, "build lock can be reacquired after reviewed quarantine");
  equal(releaseSegmentedBuildLock(reacquired).status, "RELEASED", "reacquired lock releases");

  const changed = createStaleLock();
  const changedInspection = inspectSegmentedBuildLockForRecovery({
    root: sourceRoot,
    mode,
    distDir,
    expectedSourceFingerprintSha256: sourceFingerprintSha256,
    externalLockRoot,
    nowMs,
  });
  fs.appendFileSync(changed.absolutePath, " ", "utf8");
  equal(recoverSegmentedBuildLockFromInspection({
    inspection: changedInspection,
    reviews: reviewsFor(changedInspection),
    confirmationToken: SEGMENTED_BUILD_ORPHAN_RECOVERY_CONFIRMATION,
  }).status, "REJECTED_LOCK_CHANGED_AFTER_REVIEW", "inode or size change after review is rejected");
  fs.unlinkSync(changed.absolutePath);
    finalStatus = "PASS_LOCAL_ORPHAN_LOCK_DUAL_REVIEW_PROCEDURE";
    finalTruthBoundary = "Local deterministic procedure and adversarial fixtures only. No real operator review, production lock, build, browser, release, staging, LIVE or sale evidence is claimed.";
  }
  console.log(JSON.stringify({
    schemaVersion: "velmere.segmented-build-orphan-lock-recovery.test.v1",
    status: finalStatus,
    assertions,
    productionLocksRecovered: 0,
    exactBuildCredit: false,
    browserCredit: false,
    truthBoundary: finalTruthBoundary,
  }, null, 2));
} finally {
  fs.rmSync(suiteRoot, { recursive: true, force: true });
}
