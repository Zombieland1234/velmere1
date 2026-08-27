import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {
  createWalletLabelRegistryArtifact,
  verifyWalletLabelRegistryArtifact,
} from '../r7-work/lib/market-integrity/wallet-label-registry.ts';
import {
  buildWhaleWatchAnalysis,
  verifyWhaleWatchResultIntegrity,
} from '../r7-work/lib/market-integrity/whale-watch-engine.ts';
import type { WhaleWatchInput, WhaleHolderSnapshot, WhaleCapabilityReceipt } from '../r7-work/lib/market-integrity/whale-watch-types.ts';

const NOW = new Date('2026-08-28T00:00:00.000Z');
const SECRET = 'r7-whale-label-registry-owner-controlled-secret-2026-08-28';
const REDACTION = 'r7-whale-redaction-owner-controlled-secret-2026-08-28';
const HOLDER = '0x1111111111111111111111111111111111111111';
const SOURCE = crypto.createHash('sha256').update('owner-attested-wallet-label-source-v1').digest('hex');
const RECEIPT = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const providerFamily = 'velmere-owner-attested-label-registry';

const artifact = createWalletLabelRegistryArtifact({
  secret: SECRET,
  payload: {
    assetKey: 'USDT', holderId: HOLDER, category: 'exchange', clusterId: 'cluster-owner-attested-exchange-a',
    providerFamily, sourceDigest: SOURCE, confidencePercent: 91,
    issuedAt: '2026-08-27T23:00:00.000Z', expiresAt: '2026-09-27T23:00:00.000Z', nonce: 'owner-attested-label-nonce-0001',
  },
});
const tamperedSignature = { ...artifact, signature: `${artifact.signature.slice(0, -1)}${artifact.signature.endsWith('0') ? '1' : '0'}` };
const expired = createWalletLabelRegistryArtifact({ secret: SECRET, payload: { ...artifact.payload, issuedAt: '2026-07-01T00:00:00.000Z', expiresAt: '2026-07-20T00:00:00.000Z', nonce: 'owner-attested-label-expired-0001' } });
const future = createWalletLabelRegistryArtifact({ secret: SECRET, payload: { ...artifact.payload, issuedAt: '2026-08-28T01:00:00.000Z', expiresAt: '2026-09-01T01:00:00.000Z', nonce: 'owner-attested-label-future-0001' } });
const lowConfidence = createWalletLabelRegistryArtifact({ secret: SECRET, payload: { ...artifact.payload, confidencePercent: 30, nonce: 'owner-attested-label-low-confidence-0001' } });
const conflictingArtifact = createWalletLabelRegistryArtifact({ secret: SECRET, payload: { ...artifact.payload, category: 'custody', nonce: 'owner-attested-label-conflict-0001' } });

assert.equal(verifyWalletLabelRegistryArtifact({ artifact, secret: SECRET, now: NOW, expected: { assetKey: 'USDT', holderId: HOLDER, category: 'exchange', providerFamily, sourceDigest: SOURCE } }).ok, true);
assert.deepEqual(verifyWalletLabelRegistryArtifact({ artifact: tamperedSignature, secret: SECRET, now: NOW }), { ok: false, error: 'wallet_label_registry_signature_mismatch' });
assert.deepEqual(verifyWalletLabelRegistryArtifact({ artifact: expired, secret: SECRET, now: NOW }), { ok: false, error: 'wallet_label_registry_expired' });
assert.deepEqual(verifyWalletLabelRegistryArtifact({ artifact: future, secret: SECRET, now: NOW }), { ok: false, error: 'wallet_label_registry_issued_in_future' });
assert.deepEqual(verifyWalletLabelRegistryArtifact({ artifact: lowConfidence, secret: SECRET, now: NOW, minimumConfidencePercent: 50 }), { ok: false, error: 'wallet_label_registry_confidence_below_threshold' });
assert.deepEqual(verifyWalletLabelRegistryArtifact({ artifact, secret: SECRET, now: NOW, expected: { assetKey: 'BTC' } }), { ok: false, error: 'wallet_label_registry_asset_mismatch' });
assert.deepEqual(verifyWalletLabelRegistryArtifact({ artifact, secret: SECRET, now: NOW, expected: { holderId: '0x2222222222222222222222222222222222222222' } }), { ok: false, error: 'wallet_label_registry_holder_mismatch' });
assert.deepEqual(verifyWalletLabelRegistryArtifact({ artifact, secret: SECRET, now: NOW, expected: { sourceDigest: RECEIPT('different-source') } }), { ok: false, error: 'wallet_label_registry_source_mismatch' });

function makeInput(walletLabelArtifacts: WhaleWatchInput['walletLabelArtifacts']): WhaleWatchInput {
  const holder: WhaleHolderSnapshot = {
    holderId: HOLDER, balance: 1000, category: 'exchange', labelVerified: true,
    clusterId: 'cluster-owner-attested-exchange-a', observedAt: '2026-08-27T23:59:00.000Z',
    providerFamily, status: 'verified_staging', sourceDigest: SOURCE,
  };
  const receipts: WhaleCapabilityReceipt[] = [
    { capability: 'holder_distribution', providerFamily, observedAt: '2026-08-27T23:59:30.000Z', status: 'verified_staging', recordCount: 1, coverageComplete: true, sourceDigest: RECEIPT('holder-distribution') },
    { capability: 'wallet_labels', providerFamily, observedAt: '2026-08-27T23:59:30.000Z', status: 'verified_staging', recordCount: 1, coverageComplete: true, sourceDigest: RECEIPT('wallet-labels') },
    { capability: 'transfer_history', providerFamily, observedAt: '2026-08-27T23:59:30.000Z', status: 'verified_staging', recordCount: 0, coverageComplete: true, sourceDigest: RECEIPT('transfer-history-empty') },
  ];
  return {
    assetKey: 'USDT', totalSupply: 10000, priceUsd: 1, holders: [{ ...holder }], transfers: [], capabilityReceipts: receipts.map((row) => ({ ...row })),
    redactionSecret: REDACTION, walletLabelVerificationSecret: SECRET, walletLabelArtifacts: walletLabelArtifacts?.map((row) => structuredClone(row)) ?? [], now: new Date(NOW),
    policy: { minimumProviderFamilies: 1, minimumHolderCoveragePercent: 1, minimumVerifiedLabelCoveragePercent: 0, minimumClusterCoveragePercent: 0, minimumWalletLabelConfidencePercent: 50, allowStaging: true },
    locale: 'en', reportContextDepth: 'basic',
  };
}

const verifiedResult = buildWhaleWatchAnalysis(makeInput([artifact]));
const unsignedClaim = buildWhaleWatchAnalysis(makeInput([]));
const tamperedResult = buildWhaleWatchAnalysis(makeInput([tamperedSignature]));
const expiredResult = buildWhaleWatchAnalysis(makeInput([expired]));
const conflictResult = buildWhaleWatchAnalysis(makeInput([artifact, conflictingArtifact]));

const summaries = {
  verified: { artifacts: verifiedResult.verifiedWalletLabelArtifactCount, verified: verifiedResult.customerTruth.verifiedLabelHolderCount, unclassified: verifiedResult.customerTruth.unclassifiedHolderCount, blockers: verifiedResult.blockers },
  unsigned: { artifacts: unsignedClaim.verifiedWalletLabelArtifactCount, verified: unsignedClaim.customerTruth.verifiedLabelHolderCount, unclassified: unsignedClaim.customerTruth.unclassifiedHolderCount, blockers: unsignedClaim.blockers },
  tampered: { artifacts: tamperedResult.verifiedWalletLabelArtifactCount, verified: tamperedResult.customerTruth.verifiedLabelHolderCount, unclassified: tamperedResult.customerTruth.unclassifiedHolderCount, blockers: tamperedResult.blockers },
  expired: { artifacts: expiredResult.verifiedWalletLabelArtifactCount, verified: expiredResult.customerTruth.verifiedLabelHolderCount, unclassified: expiredResult.customerTruth.unclassifiedHolderCount, blockers: expiredResult.blockers },
  conflict: { artifacts: conflictResult.verifiedWalletLabelArtifactCount, verified: conflictResult.customerTruth.verifiedLabelHolderCount, unclassified: conflictResult.customerTruth.unclassifiedHolderCount, blockers: conflictResult.blockers },
};
console.log(JSON.stringify({ diagnostic: summaries }, null, 2));

assert.equal(verifiedResult.verifiedWalletLabelArtifactCount, 1);
assert.equal(verifiedResult.customerTruth.verifiedLabelHolderCount, 1);
assert.equal(verifiedResult.customerTruth.unclassifiedHolderCount, 0);
assert.equal(verifyWhaleWatchResultIntegrity(verifiedResult), true);

assert.equal(unsignedClaim.verifiedWalletLabelArtifactCount, 0);
assert.equal(unsignedClaim.customerTruth.verifiedLabelHolderCount, 0);
assert.equal(unsignedClaim.customerTruth.unclassifiedHolderCount, 1);
assert.ok(unsignedClaim.blockers.includes('unsigned_or_invalid_wallet_label_claim'));
assert.equal(unsignedClaim.customerTruth.unverifiedDisplayLabel, 'UNCLASSIFIED');
assert.equal(unsignedClaim.customerTruth.transferIsTradeClaimAllowed, false);
assert.equal(unsignedClaim.customerTruth.buyOrSellIntentClaimAllowed, false);

assert.equal(tamperedResult.verifiedWalletLabelArtifactCount, 0);
assert.equal(tamperedResult.customerTruth.verifiedLabelHolderCount, 0);
assert.equal(tamperedResult.customerTruth.unclassifiedHolderCount, 1);
assert.ok(tamperedResult.blockers.includes('wallet_label_registry_signature_mismatch'));

assert.equal(expiredResult.verifiedWalletLabelArtifactCount, 0);
assert.equal(expiredResult.customerTruth.verifiedLabelHolderCount, 0);
assert.equal(expiredResult.customerTruth.unclassifiedHolderCount, 1);
assert.ok(expiredResult.blockers.includes('wallet_label_registry_expired'));

assert.equal(conflictResult.customerTruth.verifiedLabelHolderCount, 0);
assert.equal(conflictResult.customerTruth.unclassifiedHolderCount, 1);
assert.ok(conflictResult.blockers.includes('wallet_label_registry_conflict'));

const receipt = {
  schemaVersion: 'velmere.r7.whale-watch-label-identity-negatives.v2',
  status: 'PASS_WHALE_LABEL_IDENTITY_NEGATIVES',
  checks: {
    validSignedArtifactAccepted: true, tamperedSignatureRejected: true, expiredRejected: true, futureIssuedRejected: true, lowConfidenceRejected: true,
    assetMismatchRejected: true, holderMismatchRejected: true, sourceMismatchRejected: true,
    unsignedClaimDowngradedToUnclassified: true, tamperedClaimDowngradedToUnclassified: true, expiredClaimDowngradedToUnclassified: true,
    conflictingLabelsDowngradedToUnclassified: true, transferIsTradeClaimAllowed: false, buyOrSellIntentClaimAllowed: false, resultIntegrityVerified: true,
  },
  summaries,
  rightsScope: 'OWNER_ATTESTED_SIGNED_ARTIFACT_ONLY', externalProviderLabelRightsClaimed: false,
  customerFinalCredit: false, paidValueCredit: false,
  truthBoundary: 'This proves Velmere-owned signed label artifacts and identity-negative behavior. It does not claim external provider label redistribution rights, permanent real-world identity, operational correction/dispute handling or Customer FINAL.',
};
fs.writeFileSync('R7_WHALE_WATCH_LABEL_IDENTITY_NEGATIVES.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
