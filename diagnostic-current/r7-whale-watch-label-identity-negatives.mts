import assert from 'node:assert/strict';
import crypto from 'node:crypto';
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
    assetKey: 'USDT',
    holderId: HOLDER,
    category: 'exchange',
    clusterId: 'cluster-owner-attested-exchange-a',
    providerFamily,
    sourceDigest: SOURCE,
    confidencePercent: 91,
    issuedAt: '2026-08-27T23:00:00.000Z',
    expiresAt: '2026-09-27T23:00:00.000Z',
    nonce: 'owner-attested-label-nonce-0001',
  },
});

const valid = verifyWalletLabelRegistryArtifact({ artifact, secret: SECRET, now: NOW, expected: { assetKey: 'USDT', holderId: HOLDER, category: 'exchange', providerFamily, sourceDigest: SOURCE } });
assert.equal(valid.ok, true);

const tamperedSignature = { ...artifact, signature: `${artifact.signature.slice(0, -1)}${artifact.signature.endsWith('0') ? '1' : '0'}` };
assert.deepEqual(verifyWalletLabelRegistryArtifact({ artifact: tamperedSignature, secret: SECRET, now: NOW }), { ok: false, error: 'wallet_label_registry_signature_mismatch' });

const expired = createWalletLabelRegistryArtifact({
  secret: SECRET,
  payload: { ...artifact.payload, issuedAt: '2026-07-01T00:00:00.000Z', expiresAt: '2026-07-20T00:00:00.000Z', nonce: 'owner-attested-label-expired-0001' },
});
assert.deepEqual(verifyWalletLabelRegistryArtifact({ artifact: expired, secret: SECRET, now: NOW }), { ok: false, error: 'wallet_label_registry_expired' });

const future = createWalletLabelRegistryArtifact({
  secret: SECRET,
  payload: { ...artifact.payload, issuedAt: '2026-08-28T01:00:00.000Z', expiresAt: '2026-09-01T01:00:00.000Z', nonce: 'owner-attested-label-future-0001' },
});
assert.deepEqual(verifyWalletLabelRegistryArtifact({ artifact: future, secret: SECRET, now: NOW }), { ok: false, error: 'wallet_label_registry_issued_in_future' });

const lowConfidence = createWalletLabelRegistryArtifact({
  secret: SECRET,
  payload: { ...artifact.payload, confidencePercent: 30, nonce: 'owner-attested-label-low-confidence-0001' },
});
assert.deepEqual(verifyWalletLabelRegistryArtifact({ artifact: lowConfidence, secret: SECRET, now: NOW, minimumConfidencePercent: 50 }), { ok: false, error: 'wallet_label_registry_confidence_below_threshold' });

const assetMismatch = verifyWalletLabelRegistryArtifact({ artifact, secret: SECRET, now: NOW, expected: { assetKey: 'BTC' } });
assert.deepEqual(assetMismatch, { ok: false, error: 'wallet_label_registry_asset_mismatch' });
const holderMismatch = verifyWalletLabelRegistryArtifact({ artifact, secret: SECRET, now: NOW, expected: { holderId: '0x2222222222222222222222222222222222222222' } });
assert.deepEqual(holderMismatch, { ok: false, error: 'wallet_label_registry_holder_mismatch' });
const sourceMismatch = verifyWalletLabelRegistryArtifact({ artifact, secret: SECRET, now: NOW, expected: { sourceDigest: RECEIPT('different-source') } });
assert.deepEqual(sourceMismatch, { ok: false, error: 'wallet_label_registry_source_mismatch' });

const holder: WhaleHolderSnapshot = {
  holderId: HOLDER,
  balance: 1000,
  category: 'exchange',
  labelVerified: true,
  clusterId: 'cluster-owner-attested-exchange-a',
  observedAt: '2026-08-27T23:59:00.000Z',
  providerFamily,
  status: 'verified_staging',
  sourceDigest: SOURCE,
};
const receipts: WhaleCapabilityReceipt[] = [
  { capability: 'holder_distribution', providerFamily, observedAt: '2026-08-27T23:59:30.000Z', status: 'verified_staging', recordCount: 1, coverageComplete: true, sourceDigest: RECEIPT('holder-distribution') },
  { capability: 'wallet_labels', providerFamily, observedAt: '2026-08-27T23:59:30.000Z', status: 'verified_staging', recordCount: 1, coverageComplete: true, sourceDigest: RECEIPT('wallet-labels') },
  { capability: 'transfer_history', providerFamily, observedAt: '2026-08-27T23:59:30.000Z', status: 'verified_staging', recordCount: 0, coverageComplete: true, sourceDigest: RECEIPT('transfer-history-empty') },
];
const base: WhaleWatchInput = {
  assetKey: 'USDT',
  totalSupply: 10000,
  priceUsd: 1,
  holders: [holder],
  transfers: [],
  capabilityReceipts: receipts,
  redactionSecret: REDACTION,
  walletLabelVerificationSecret: SECRET,
  walletLabelArtifacts: [artifact],
  now: NOW,
  policy: {
    minimumProviderFamilies: 1,
    minimumHolderCoveragePercent: 1,
    minimumVerifiedLabelCoveragePercent: 0,
    minimumClusterCoveragePercent: 0,
    minimumWalletLabelConfidencePercent: 50,
    allowStaging: true,
  },
  locale: 'en',
  reportContextDepth: 'basic',
};

const verifiedResult = buildWhaleWatchAnalysis(base);
assert.equal(verifiedResult.verifiedWalletLabelArtifactCount, 1);
assert.equal(verifiedResult.holderCount, 1);
assert.equal(verifiedResult.verifiedLabelCoveragePercent, 100);
assert.equal(verifiedResult.customerTruth.verifiedLabelHolderCount, 1);
assert.equal(verifiedResult.customerTruth.unclassifiedHolderCount, 0);
assert.equal(verifyWhaleWatchResultIntegrity(verifiedResult), true);

const unsignedClaim = buildWhaleWatchAnalysis({ ...base, walletLabelArtifacts: [] });
assert.equal(unsignedClaim.verifiedWalletLabelArtifactCount, 0);
assert.equal(unsignedClaim.customerTruth.verifiedLabelHolderCount, 0);
assert.equal(unsignedClaim.customerTruth.unclassifiedHolderCount, 1);
assert.ok(unsignedClaim.blockers.includes('unsigned_or_invalid_wallet_label_claim'));
assert.equal(unsignedClaim.customerTruth.unverifiedDisplayLabel, 'UNCLASSIFIED');
assert.equal(unsignedClaim.customerTruth.transferIsTradeClaimAllowed, false);
assert.equal(unsignedClaim.customerTruth.buyOrSellIntentClaimAllowed, false);

const tamperedResult = buildWhaleWatchAnalysis({ ...base, walletLabelArtifacts: [tamperedSignature] });
assert.equal(tamperedResult.verifiedWalletLabelArtifactCount, 0);
assert.equal(tamperedResult.customerTruth.verifiedLabelHolderCount, 0);
assert.equal(tamperedResult.customerTruth.unclassifiedHolderCount, 1);
assert.ok(tamperedResult.blockers.includes('wallet_label_registry_signature_mismatch'));

const expiredResult = buildWhaleWatchAnalysis({ ...base, walletLabelArtifacts: [expired] });
assert.equal(expiredResult.customerTruth.unclassifiedHolderCount, 1);
assert.ok(expiredResult.blockers.includes('wallet_label_registry_expired'));

const conflictingArtifact = createWalletLabelRegistryArtifact({
  secret: SECRET,
  payload: { ...artifact.payload, category: 'custody', nonce: 'owner-attested-label-conflict-0001' },
});
const conflictResult = buildWhaleWatchAnalysis({ ...base, walletLabelArtifacts: [artifact, conflictingArtifact] });
assert.equal(conflictResult.customerTruth.verifiedLabelHolderCount, 0);
assert.equal(conflictResult.customerTruth.unclassifiedHolderCount, 1);
assert.ok(conflictResult.blockers.includes('wallet_label_registry_conflict'));

console.log(JSON.stringify({
  schemaVersion: 'velmere.r7.whale-watch-label-identity-negatives.v1',
  status: 'PASS_WHALE_LABEL_IDENTITY_NEGATIVES',
  checks: {
    validSignedArtifactAccepted: true,
    tamperedSignatureRejected: true,
    expiredRejected: true,
    futureIssuedRejected: true,
    lowConfidenceRejected: true,
    assetMismatchRejected: true,
    holderMismatchRejected: true,
    sourceMismatchRejected: true,
    unsignedClaimDowngradedToUnclassified: true,
    conflictingLabelsDowngradedToUnclassified: true,
    transferIsTradeClaimAllowed: false,
    buyOrSellIntentClaimAllowed: false,
    resultIntegrityVerified: true,
  },
  rightsScope: 'OWNER_ATTESTED_SIGNED_ARTIFACT_ONLY',
  externalProviderLabelRightsClaimed: false,
  customerFinalCredit: false,
  paidValueCredit: false,
  truthBoundary: 'This proves Velmere-owned signed label artifacts and identity-negative behavior. It does not claim external provider label redistribution rights, permanent real-world identity, operational correction/dispute handling or Customer FINAL.',
}, null, 2));
