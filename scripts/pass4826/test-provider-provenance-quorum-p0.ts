import assert from "node:assert/strict";
import {
  createPass4644ProviderEvidenceReceipt,
  isPass4644CommerciallyFreshReceipt,
  summarizePass4644ProviderReceipts,
  type Pass4644ProviderEvidenceReceipt as ReceiptModuleDto,
} from "../../lib/market-integrity/provider-evidence-receipt";
import {
  canonicalProviderRootFamily,
  reconcileProviderQuorum,
  type ProviderQuorumIdentity,
  type ProviderQuorumObservation,
} from "../../lib/market-integrity/provider-quorum-reconciliation";
import {
  buildPass4645ProviderEvidenceLedger,
  verifyPass4645LedgerReadBackExact,
  verifyPass4645SupabaseLedgerReadBack,
  verifyPass4645ProviderEvidenceLedger,
  type Pass4645ProviderEvidenceLedger,
  type Pass4645ProviderEvidenceLedgerEntry as LedgerModuleEntryDto,
} from "../../lib/market-integrity/provider-evidence-ledger";
import {
  buildPass4650ProviderQualitySnapshot,
  buildPass4650ReplayManifest,
  verifyPass4650ReplayManifest,
} from "../../lib/market-integrity/provider-quality-replay";
import { evaluateProviderEvidenceTier } from "../../lib/market-integrity/provider-evidence-tier-policy";
import { analyzeRiskWithVlmKernel } from "../../lib/ai/vlm-brain-risk-adapter";
import type { TokenRiskResult } from "../../lib/market-integrity/risk-types";
import { buildAnalysisReadiness } from "../../lib/market-integrity/analysis-readiness";
import type {
  Pass4644ProviderEvidenceReceipt as ContractReceiptDto,
  Pass4645ProviderEvidenceLedgerEntry as ContractLedgerEntryDto,
} from "../../lib/market-integrity/provider-evidence-contract";

type TypesEqual<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends (<Value>() => Value extends Right ? 1 : 2)
    ? (<Value>() => Value extends Right ? 1 : 2) extends (<Value>() => Value extends Left ? 1 : 2)
      ? true
      : false
    : false;
const receiptDtoHasOneCanonicalDefinition: TypesEqual<ReceiptModuleDto, ContractReceiptDto> = true;
const ledgerEntryDtoHasOneCanonicalDefinition: TypesEqual<LedgerModuleEntryDto, ContractLedgerEntryDto> = true;
assert.equal(receiptDtoHasOneCanonicalDefinition, true);
assert.equal(ledgerEntryDtoHasOneCanonicalDefinition, true);

const receivedAt = new Date("2026-07-17T12:00:00.000Z");
const receiptBase = {
  providerId: "provider-a",
  providerFamily: "provider-a-root",
  surface: "crypto" as const,
  verification: "normalized_response" as const,
  requestedIdentity: "btc",
  resolvedSymbol: "BTC",
  identityMatched: true,
  capabilities: ["price"],
  receivedAt,
  latencyMs: 25,
  ttlMs: 60_000,
  normalizedPayload: { symbol: "BTC", price: 100 },
};

const providerTimestamp = createPass4644ProviderEvidenceReceipt({
  ...receiptBase,
  timestampProvenance: "provider",
  observedAt: new Date(receivedAt.getTime() - 10_000),
});
assert.equal(providerTimestamp.timestampProvenance, "provider");
assert.equal(providerTimestamp.fresh, true);
assert.equal(providerTimestamp.freshnessMs, 10_000);
assert.equal(providerTimestamp.commercialEvidenceEligible, true);
assert.equal(isPass4644CommerciallyFreshReceipt(providerTimestamp, new Date(receivedAt.getTime() + 49_000)), true);
assert.equal(isPass4644CommerciallyFreshReceipt(providerTimestamp, new Date(receivedAt.getTime() + 51_000)), false);

for (const marketSymbol of ["^GSPC", "EUR/USD", "BTC-USD", "EURUSD=X"]) {
  const specialSymbolReceipt = createPass4644ProviderEvidenceReceipt({
    ...receiptBase,
    requestedIdentity: marketSymbol,
    resolvedSymbol: marketSymbol,
    resolvedMarketId: undefined,
    timestampProvenance: "provider",
    observedAt: new Date(receivedAt.getTime() - 10_000),
  });
  assert.equal(specialSymbolReceipt.identity.matched, true, marketSymbol);
  assert.equal(isPass4644CommerciallyFreshReceipt(specialSymbolReceipt, receivedAt), true, marketSymbol);
}

const implicitProvenance = createPass4644ProviderEvidenceReceipt({
  ...receiptBase,
  observedAt: new Date(receivedAt.getTime() - 10_000),
} as unknown as Parameters<typeof createPass4644ProviderEvidenceReceipt>[0]);
assert.equal(implicitProvenance.timestampProvenance, "missing");
assert.equal(implicitProvenance.observedAt, new Date(receivedAt.getTime() - 10_000).toISOString());
assert.equal(implicitProvenance.fresh, false);
assert.equal(implicitProvenance.commercialEvidenceEligible, false);
assert.ok(implicitProvenance.rejectionReasons.includes("provider_timestamp_provenance_missing"));

const assertedIdentityMismatch = createPass4644ProviderEvidenceReceipt({
  ...receiptBase,
  requestedIdentity: "BTC",
  resolvedSymbol: "ETH",
  resolvedMarketId: "ethereum",
  identityMatched: true,
  timestampProvenance: "provider",
  observedAt: new Date(receivedAt.getTime() - 10_000),
});
assert.equal(assertedIdentityMismatch.identity.matched, false);
assert.equal(assertedIdentityMismatch.commercialEvidenceEligible, false);
assert.ok(assertedIdentityMismatch.rejectionReasons.includes("asset_identity_mismatch"));

const missingTimestamp = createPass4644ProviderEvidenceReceipt({
  ...receiptBase,
  timestampProvenance: "provider",
  observedAt: null,
});
assert.equal(missingTimestamp.timestampProvenance, "missing");
assert.equal(missingTimestamp.observedAt, "");
assert.equal(missingTimestamp.freshnessMs, null);
assert.equal(missingTimestamp.fresh, false);
assert.equal(missingTimestamp.commercialEvidenceEligible, false);
assert.ok(missingTimestamp.rejectionReasons.includes("provider_timestamp_missing"));

for (const invalidObservedAt of ["not-a-date", new Date(Number.NaN)]) {
  const receipt = createPass4644ProviderEvidenceReceipt({
    ...receiptBase,
    timestampProvenance: "provider",
    observedAt: invalidObservedAt,
  });
  assert.equal(receipt.timestampProvenance, "invalid");
  assert.equal(receipt.observedAt, "");
  assert.equal(receipt.fresh, false);
  assert.equal(receipt.commercialEvidenceEligible, false);
  assert.ok(receipt.rejectionReasons.includes("provider_timestamp_invalid"));
}

const transportTimestamp = createPass4644ProviderEvidenceReceipt({
  ...receiptBase,
  timestampProvenance: "transport_received",
  observedAt: receivedAt,
});
assert.equal(transportTimestamp.timestampProvenance, "transport_received");
assert.equal(transportTimestamp.observedAt, transportTimestamp.receivedAt);
assert.equal(transportTimestamp.freshnessMs, null);
assert.equal(transportTimestamp.fresh, false);
assert.equal(transportTimestamp.commercialEvidenceEligible, false);
assert.ok(transportTimestamp.rejectionReasons.includes("provider_timestamp_not_source_bound"));

const futureTimestamp = createPass4644ProviderEvidenceReceipt({
  ...receiptBase,
  timestampProvenance: "provider",
  observedAt: new Date(receivedAt.getTime() + 10 * 60_000),
});
assert.equal(futureTimestamp.fresh, false);
assert.equal(futureTimestamp.commercialEvidenceEligible, false);
assert.ok(futureTimestamp.rejectionReasons.includes("provider_timestamp_from_future"));

const invalidReceivedAt = createPass4644ProviderEvidenceReceipt({
  ...receiptBase,
  timestampProvenance: "provider",
  observedAt: receivedAt,
  receivedAt: "invalid-received-at",
});
assert.equal(invalidReceivedAt.commercialEvidenceEligible, false);
assert.ok(invalidReceivedAt.rejectionReasons.includes("receipt_received_at_invalid"));

const changedPayload = createPass4644ProviderEvidenceReceipt({
  ...receiptBase,
  timestampProvenance: "provider",
  observedAt: new Date(receivedAt.getTime() - 10_000),
  normalizedPayload: { symbol: "BTC", price: 101 },
});
assert.notEqual(changedPayload.payloadHash, providerTimestamp.payloadHash);
assert.notEqual(changedPayload.receiptId, providerTimestamp.receiptId);

const summary = summarizePass4644ProviderReceipts([
  providerTimestamp,
  missingTimestamp,
  transportTimestamp,
  futureTimestamp,
]);
assert.equal(summary.confirmedCommercialReceiptCount, 1);
assert.equal(summary.providerTimestampReceiptCount, 2);
assert.equal(summary.transportTimestampReceiptCount, 1);
assert.equal(summary.missingProviderTimestampCount, 1);

const provenanceLedger = buildPass4645ProviderEvidenceLedger({
  receipts: [providerTimestamp, transportTimestamp],
  requestedIdentity: "btc",
  surface: "crypto",
  depth: "basic",
  generatedAt: receivedAt,
});
assert.equal(provenanceLedger.receiptCount, 2);
assert.equal(provenanceLedger.eligibleReceiptCount, 1);
const providerLedgerEntry = provenanceLedger.entries.find((entry) => entry.receiptId === providerTimestamp.receiptId);
const transportLedgerEntry = provenanceLedger.entries.find((entry) => entry.receiptId === transportTimestamp.receiptId);
assert.equal(providerLedgerEntry?.timestampProvenance, "provider");
assert.equal(providerLedgerEntry?.receivedAt, providerTimestamp.receivedAt);
assert.equal(providerLedgerEntry?.commercialEvidenceEligible, true);
assert.equal(transportLedgerEntry?.timestampProvenance, "transport_received");
assert.equal(transportLedgerEntry?.receivedAt, transportTimestamp.receivedAt);
assert.equal(transportLedgerEntry?.commercialEvidenceEligible, false);
assert.equal(verifyPass4645ProviderEvidenceLedger(provenanceLedger).valid, true);

const expiredAtPersistenceLedger = buildPass4645ProviderEvidenceLedger({
  receipts: [providerTimestamp],
  requestedIdentity: "btc",
  surface: "crypto",
  depth: "basic",
  generatedAt: new Date(receivedAt.getTime() + 61_000),
});
assert.equal(expiredAtPersistenceLedger.eligibleReceiptCount, 0);
assert.equal(expiredAtPersistenceLedger.entries[0]?.commercialEvidenceEligible, false);

const ledgerSigningSecret = "pass4826-ledger-mutation-secret-material-32-bytes";
const signedProvenanceLedger = buildPass4645ProviderEvidenceLedger({
  receipts: [providerTimestamp, changedPayload],
  requestedIdentity: "btc",
  surface: "crypto",
  depth: "advanced",
  generatedAt: receivedAt,
  signingSecret: ledgerSigningSecret,
});
assert.equal(verifyPass4645ProviderEvidenceLedger(signedProvenanceLedger, ledgerSigningSecret).valid, true);
const signedWithoutSecret = verifyPass4645ProviderEvidenceLedger(signedProvenanceLedger);
assert.equal(signedWithoutSecret.valid, false);
assert.ok(signedWithoutSecret.blockers.includes("signature_verification_secret_missing"));
const signedSupabaseRow = {
  ledger_id: signedProvenanceLedger.ledgerId,
  requested_identity: signedProvenanceLedger.requestedIdentity,
  surface: signedProvenanceLedger.surface,
  depth: signedProvenanceLedger.depth,
  head_hash: signedProvenanceLedger.headHash,
  receipt_count: signedProvenanceLedger.receiptCount,
  eligible_receipt_count: signedProvenanceLedger.eligibleReceiptCount,
  signed: signedProvenanceLedger.signed,
  payload: structuredClone(signedProvenanceLedger),
};
assert.equal(verifyPass4645SupabaseLedgerReadBack({
  rows: [signedSupabaseRow],
  expected: signedProvenanceLedger,
  signingSecret: ledgerSigningSecret,
}).valid, true);
const tamperedSupabaseRow = structuredClone(signedSupabaseRow);
tamperedSupabaseRow.payload.entries[0]!.receiptCanonicalDigest = "0".repeat(64);
const tamperedSupabaseVerdict = verifyPass4645SupabaseLedgerReadBack({
  rows: [tamperedSupabaseRow],
  expected: signedProvenanceLedger,
  signingSecret: ledgerSigningSecret,
});
assert.equal(tamperedSupabaseVerdict.valid, false);
assert.ok(tamperedSupabaseVerdict.blockers.includes("supabase_payload_exact_mismatch"));
assert.ok(tamperedSupabaseVerdict.blockers.some((blocker) => blocker.startsWith("supabase_payload_ledger_invalid:")));
assert.equal(verifyPass4645LedgerReadBackExact({
  stored: structuredClone(signedProvenanceLedger),
  expected: signedProvenanceLedger,
  signingSecret: ledgerSigningSecret,
  blockerPrefix: "filesystem",
}).valid, true);
const tamperedFilesystemPayload = structuredClone(signedProvenanceLedger);
tamperedFilesystemPayload.entries[0]!.payloadHash = "e".repeat(64);
const tamperedFilesystemVerdict = verifyPass4645LedgerReadBackExact({
  stored: tamperedFilesystemPayload,
  expected: signedProvenanceLedger,
  signingSecret: ledgerSigningSecret,
  blockerPrefix: "filesystem",
});
assert.equal(tamperedFilesystemVerdict.valid, false);
assert.ok(tamperedFilesystemVerdict.blockers.includes("filesystem_payload_exact_mismatch"));
assert.ok(tamperedFilesystemVerdict.blockers.some((blocker) => blocker.startsWith("filesystem_payload_ledger_invalid:")));
const malformedLedgerVerdict = verifyPass4645ProviderEvidenceLedger({} as Pass4645ProviderEvidenceLedger, ledgerSigningSecret);
assert.equal(malformedLedgerVerdict.valid, false);
assert.ok(malformedLedgerVerdict.blockers.includes("ledger_payload_invalid"));
const malformedSupabaseVerdict = verifyPass4645SupabaseLedgerReadBack({
  rows: null as unknown as [],
  expected: signedProvenanceLedger,
  signingSecret: ledgerSigningSecret,
});
assert.equal(malformedSupabaseVerdict.valid, false);
assert.ok(malformedSupabaseVerdict.blockers.includes("supabase_rows_payload_invalid"));

const unsignedAdvancedLedger = buildPass4645ProviderEvidenceLedger({
  receipts: [providerTimestamp],
  requestedIdentity: "btc",
  surface: "crypto",
  depth: "advanced",
  generatedAt: receivedAt,
  signingSecret: "too-short",
});
assert.equal(unsignedAdvancedLedger.signed, false);
const unsignedAdvancedVerdict = verifyPass4645ProviderEvidenceLedger(unsignedAdvancedLedger);
assert.equal(unsignedAdvancedVerdict.valid, false);
assert.equal(unsignedAdvancedVerdict.premiumValid, false);
assert.ok(unsignedAdvancedVerdict.blockers.includes("premium_ledger_signature_required"));
const weakSecretVerdict = verifyPass4645ProviderEvidenceLedger(unsignedAdvancedLedger, "too-short");
assert.equal(weakSecretVerdict.valid, false);
assert.ok(weakSecretVerdict.blockers.includes("signature_secret_too_short"));
assert.equal(verifyPass4645ProviderEvidenceLedger(provenanceLedger).premiumValid, false);

const ledgerMutations: Array<{
  name: string;
  blocker: string;
  mutate: (ledger: Pass4645ProviderEvidenceLedger) => void;
}> = [
  { name: "requested-identity", blocker: "ledger_id_mismatch", mutate: (ledger) => { ledger.requestedIdentity = "eth"; } },
  { name: "surface", blocker: "ledger_id_mismatch", mutate: (ledger) => { ledger.surface = "real_markets"; } },
  { name: "depth", blocker: "ledger_id_mismatch", mutate: (ledger) => { ledger.depth = "basic"; } },
  { name: "generated-at", blocker: "ledger_id_mismatch", mutate: (ledger) => { ledger.generatedAt = new Date(receivedAt.getTime() + 1).toISOString(); } },
  { name: "ledger-id", blocker: "ledger_id_mismatch", mutate: (ledger) => { ledger.ledgerId = `p4645_${"0".repeat(28)}`; } },
  { name: "receipt-count", blocker: "receipt_count_mismatch", mutate: (ledger) => { ledger.receiptCount += 1; } },
  { name: "eligible-count", blocker: "eligible_receipt_count_mismatch", mutate: (ledger) => { ledger.eligibleReceiptCount += 1; } },
  { name: "head-hash", blocker: "head_hash_mismatch", mutate: (ledger) => { ledger.headHash = "f".repeat(64); } },
  { name: "signed-flag", blocker: "signed_flag_mismatch", mutate: (ledger) => { ledger.signed = false; } },
  { name: "entry-identity", blocker: "entry_requested_identity_mismatch", mutate: (ledger) => { ledger.entries[0]!.requestedIdentity = "eth"; } },
  { name: "entry-depth", blocker: "entry_depth_mismatch", mutate: (ledger) => { ledger.entries[0]!.depth = "basic"; } },
  { name: "removed-signature", blocker: "mixed_signature_state", mutate: (ledger) => { ledger.entries[0]!.signature = null; } },
];
for (const mutation of ledgerMutations) {
  const mutated = structuredClone(signedProvenanceLedger);
  mutation.mutate(mutated);
  const verdict = verifyPass4645ProviderEvidenceLedger(mutated, ledgerSigningSecret);
  assert.equal(verdict.valid, false, mutation.name);
  assert.ok(
    verdict.blockers.some((blocker) => blocker === mutation.blocker || blocker.startsWith(`${mutation.blocker}:`)),
    `${mutation.name}: ${verdict.blockers.join(",")}`,
  );
}

const signedLedgerQuality = buildPass4650ProviderQualitySnapshot({
  receipts: [providerTimestamp, changedPayload],
  requestedIdentity: "btc",
  assetClass: "crypto",
  now: new Date(receivedAt.getTime() + 30_000),
});
const signedLedgerManifest = buildPass4650ReplayManifest({
  quality: signedLedgerQuality,
  ledger: signedProvenanceLedger,
  generatedAt: receivedAt,
});
assert.equal(verifyPass4650ReplayManifest({
  manifest: signedLedgerManifest,
  quality: signedLedgerQuality,
  ledger: signedProvenanceLedger,
  signingSecret: ledgerSigningSecret,
}).valid, true);
const aliasMutatedQuality = {
  ...signedLedgerQuality,
  requestedIdentityAliases: [...signedLedgerQuality.requestedIdentityAliases, "bitcoin"].sort(),
};
const aliasMutationVerdict = verifyPass4650ReplayManifest({
  manifest: signedLedgerManifest,
  quality: aliasMutatedQuality,
  ledger: signedProvenanceLedger,
  signingSecret: ledgerSigningSecret,
});
assert.equal(aliasMutationVerdict.valid, false);
assert.ok(aliasMutationVerdict.blockers.includes("manifest_identity_aliases_mismatch"));

const ethReceiptA = createPass4644ProviderEvidenceReceipt({
  ...receiptBase,
  providerId: "provider-a",
  providerFamily: "provider-a-root",
  requestedIdentity: "ETH",
  resolvedSymbol: "ETH",
  timestampProvenance: "provider",
  observedAt: new Date(receivedAt.getTime() - 10_000),
  normalizedPayload: { symbol: "ETH", price: 3_000 },
});
const ethReceiptB = createPass4644ProviderEvidenceReceipt({
  ...receiptBase,
  providerId: "provider-b",
  providerFamily: "provider-b-root",
  requestedIdentity: "ETH",
  resolvedSymbol: "ETH",
  timestampProvenance: "provider",
  observedAt: new Date(receivedAt.getTime() - 10_000),
  normalizedPayload: { symbol: "ETH", price: 3_001 },
});
const signedEthLedger = buildPass4645ProviderEvidenceLedger({
  receipts: [ethReceiptA, ethReceiptB],
  requestedIdentity: "eth",
  surface: "crypto",
  depth: "advanced",
  generatedAt: receivedAt,
  signingSecret: ledgerSigningSecret,
});
const crossLedgerManifest = buildPass4650ReplayManifest({ quality: signedLedgerQuality, ledger: signedEthLedger, generatedAt: receivedAt });
const crossLedgerVerdict = verifyPass4650ReplayManifest({
  manifest: crossLedgerManifest,
  quality: signedLedgerQuality,
  ledger: signedEthLedger,
  signingSecret: ledgerSigningSecret,
});
assert.equal(crossLedgerVerdict.valid, false);
assert.ok(crossLedgerVerdict.blockers.includes("ledger_quality_identity_mismatch"));
assert.ok(crossLedgerVerdict.blockers.includes("ledger_quality_receipt_multiset_mismatch"));

const capabilityMutatedReceipts = [providerTimestamp, changedPayload].map((receipt) => ({
  ...receipt,
  capabilities: [...receipt.capabilities, "holders"],
}));
const capabilityMutatedQuality = buildPass4650ProviderQualitySnapshot({
  receipts: capabilityMutatedReceipts,
  requestedIdentity: "btc",
  assetClass: "crypto",
  now: new Date(receivedAt.getTime() + 30_000),
});
const capabilityMutationManifest = buildPass4650ReplayManifest({
  quality: capabilityMutatedQuality,
  ledger: signedProvenanceLedger,
  generatedAt: receivedAt,
});
const capabilityMutationVerdict = verifyPass4650ReplayManifest({
  manifest: capabilityMutationManifest,
  quality: capabilityMutatedQuality,
  ledger: signedProvenanceLedger,
  signingSecret: ledgerSigningSecret,
});
assert.equal(capabilityMutationVerdict.valid, false);
assert.ok(capabilityMutationVerdict.blockers.includes("ledger_quality_receipt_multiset_mismatch"));

const replayIdentityMutation = {
  ...providerTimestamp,
  identity: { ...providerTimestamp.identity, resolvedSymbol: "ETH", matched: true },
};
const replayIdentityQuality = buildPass4650ProviderQualitySnapshot({
  receipts: [replayIdentityMutation],
  requestedIdentity: "btc",
  assetClass: "crypto",
  now: new Date(receivedAt.getTime() + 30_000),
});
assert.equal(replayIdentityQuality.runtimeAcceptedReceiptCount, 0);
assert.ok(replayIdentityQuality.verdicts[0]?.blockers.includes("receipt_not_provider_fresh"));

const provenanceReplay = buildPass4650ProviderQualitySnapshot({
  receipts: [providerTimestamp, transportTimestamp],
  requestedIdentity: "btc",
  assetClass: "crypto",
  now: new Date(receivedAt.getTime() + 30_000),
});
assert.equal(provenanceReplay.runtimeAcceptedReceiptCount, 1);
assert.equal(provenanceReplay.verdicts.find((verdict) => verdict.receiptId === providerTimestamp.receiptId)?.accepted, true);
const transportReplayVerdict = provenanceReplay.verdicts.find((verdict) => verdict.receiptId === transportTimestamp.receiptId);
assert.equal(transportReplayVerdict?.accepted, false);
assert.ok(transportReplayVerdict?.blockers.includes("provider_timestamp_provenance_transport_received"));
assert.ok(transportReplayVerdict?.blockers.includes("receipt_not_provider_fresh"));

const legacyWithoutProvenance = { ...providerTimestamp } as Partial<typeof providerTimestamp>;
delete legacyWithoutProvenance.timestampProvenance;
assert.equal(isPass4644CommerciallyFreshReceipt(legacyWithoutProvenance as typeof providerTimestamp), false);

for (const mutatedReceipt of [
  { ...providerTimestamp, freshnessMs: providerTimestamp.freshnessMs! + 1 },
  { ...providerTimestamp, rejectionReasons: ["mutated_rejection"] },
  { ...providerTimestamp, identity: { ...providerTimestamp.identity, matched: false } },
  { ...providerTimestamp, payloadHash: "not-a-sha256" },
]) {
  assert.equal(isPass4644CommerciallyFreshReceipt(mutatedReceipt), false);
}

const continuityReceipt = {
  ...providerTimestamp,
  continuity: {
    schemaVersion: "pass4653_continuity_receipt_v1" as const,
    replayedFromReceiptId: providerTimestamp.receiptId,
    snapshotHash: "f".repeat(64),
    originalObservedAt: providerTimestamp.observedAt,
    graceExpiresAt: providerTimestamp.expiresAt,
    replayedAt: providerTimestamp.receivedAt,
    reason: "provider_outage" as const,
  },
};
assert.equal(isPass4644CommerciallyFreshReceipt(continuityReceipt), false);

const nowSeconds = 1_750_000_000;
const expectedIdentity: ProviderQuorumIdentity = {
  assetId: "BTC",
  quoteCurrency: "USD",
  observationWindow: "latest_quote",
};
const digestA = "a".repeat(64);
const digestB = "b".repeat(64);
function observation(overrides: Partial<ProviderQuorumObservation> = {}): ProviderQuorumObservation {
  return {
    providerId: "provider-a",
    providerFamily: "provider-a-root",
    resolvedAssetId: "BTC",
    resolvedSymbol: "BTC",
    quoteCurrency: "USD",
    observationWindow: "latest_quote",
    source: "provider-a",
    price: 100,
    sourceTimestamp: nowSeconds - 20,
    evidenceEligible: true,
    valueSha256: digestA,
    ...overrides,
  };
}
function quorum(
  primary: ProviderQuorumObservation,
  secondary: ProviderQuorumObservation,
  expected: ProviderQuorumIdentity | null = expectedIdentity,
) {
  return reconcileProviderQuorum({
    assetClass: "crypto",
    expectedIdentity: expected,
    primary,
    secondary,
    nowSeconds,
  });
}

const strong = quorum(
  observation(),
  observation({
    providerId: "provider-b",
    providerFamily: "provider-b-root",
    source: "provider-b",
    price: 100.2,
    sourceTimestamp: nowSeconds - 30,
    valueSha256: digestB,
  }),
);
assert.equal(strong.state, "aligned");
assert.equal(strong.comparability, "exact_window");
assert.equal(strong.sourceCount, 2);
assert.equal(strong.independentSourceCount, 2);
assert.equal(strong.identityAligned, true);
assert.equal(strong.freshPaidEvidenceEligible, true);
assert.equal(strong.strongClaimEligible, true);
assert.equal(evaluateProviderEvidenceTier({ requestedTier: "Advanced", quorum: strong }).maxEvidenceTier, "Advanced");

const sameRoot = quorum(
  observation({ providerId: "binance-global", providerFamily: "binance" }),
  observation({ providerId: "binance-us", providerFamily: "binance", source: "binance-us", valueSha256: digestB }),
);
assert.equal(sameRoot.sourceCount, 2);
assert.equal(sameRoot.independentSourceCount, 1);
assert.equal(sameRoot.state, "single_source");
assert.equal(sameRoot.comparability, "single_source");
assert.equal(sameRoot.strongClaimEligible, false);
assert.equal(evaluateProviderEvidenceTier({ requestedTier: "Advanced", quorum: sameRoot }).maxEvidenceTier, "Basic");

assert.equal(canonicalProviderRootFamily({ providerId: "yahoo_finance", providerFamily: "market_data" }), "yahoo");
assert.equal(canonicalProviderRootFamily({ providerId: "query1.finance.yahoo.com", providerFamily: "market_data_secondary" }), "yahoo");
const aliasedSameRoot = quorum(
  observation({ providerId: "yahoo_finance", providerFamily: "market_data" }),
  observation({ providerId: "query1.finance.yahoo.com", providerFamily: "market_data_secondary", source: "yahoo mirror", valueSha256: digestB }),
);
assert.equal(aliasedSameRoot.independentSourceCount, 1);
assert.equal(aliasedSameRoot.strongClaimEligible, false);

assert.equal(canonicalProviderRootFamily({ providerId: "opaque-endpoint-a", providerFamily: "market_data" }), "");
const unknownGenericRoots = quorum(
  observation({ providerId: "opaque-endpoint-a", providerFamily: "market_data" }),
  observation({ providerId: "opaque-endpoint-b", providerFamily: "market_data_secondary", source: "opaque-b", valueSha256: digestB }),
);
assert.equal(unknownGenericRoots.independentSourceCount, 0);
assert.equal(unknownGenericRoots.strongClaimEligible, false);

const duplicatedProviderIdentity = quorum(
  observation({ providerId: "shared-provider-id", providerFamily: "root-a" }),
  observation({ providerId: "shared-provider-id", providerFamily: "root-b", source: "shared mirror", valueSha256: digestB }),
);
assert.equal(duplicatedProviderIdentity.independentSourceCount, 1);
assert.equal(duplicatedProviderIdentity.strongClaimEligible, false);

const identityMutations: Array<[string, Partial<ProviderQuorumObservation>]> = [
  ["asset", { resolvedAssetId: "ETH", resolvedSymbol: "ETH" }],
  ["currency", { quoteCurrency: "EUR" }],
  ["window", { observationWindow: "daily_close" }],
  ["missing-asset", { resolvedAssetId: null, resolvedSymbol: null }],
  ["missing-currency", { quoteCurrency: null }],
  ["missing-window", { observationWindow: null }],
];
for (const [name, mutation] of identityMutations) {
  const result = quorum(
    observation(),
    observation({
      providerId: "provider-b",
      providerFamily: "provider-b-root",
      source: "provider-b",
      valueSha256: digestB,
      ...mutation,
    }),
  );
  assert.equal(result.identityAligned, false, name);
  assert.equal(result.comparability, "not_comparable", name);
  assert.equal(result.divergenceBps, null, name);
  assert.equal(result.freshPaidEvidenceEligible, false, name);
  assert.equal(result.strongClaimEligible, false, name);
}

for (const [name, mutation] of [
  ["asset-id-correct-symbol-wrong", { resolvedAssetId: "BTC", resolvedSymbol: "ETH" }],
  ["asset-id-wrong-symbol-correct", { resolvedAssetId: "ETH", resolvedSymbol: "BTC" }],
] as const) {
  const result = quorum(
    observation(),
    observation({
      providerId: "provider-b",
      providerFamily: "provider-b-root",
      source: "provider-b",
      valueSha256: digestB,
      ...mutation,
    }),
  );
  assert.equal(result.identityAligned, false, name);
  assert.equal(result.comparability, "not_comparable", name);
  assert.equal(result.divergenceBps, null, name);
  assert.equal(result.freshPaidEvidenceEligible, false, name);
  assert.equal(result.strongClaimEligible, false, name);
  assert.ok(result.reasons.some((reason) => reason.includes("conflicting resolved asset ID and symbol")), name);
  assert.notEqual(result.observationDigest, strong.observationDigest, name);
}

const symbolOnlyStrong = quorum(
  observation({ resolvedAssetId: null }),
  observation({
    providerId: "provider-b",
    providerFamily: "provider-b-root",
    resolvedAssetId: null,
    source: "provider-b",
    valueSha256: digestB,
  }),
);
assert.equal(symbolOnlyStrong.identityAligned, true);
assert.equal(symbolOnlyStrong.strongClaimEligible, true);

const stooqDailyVersusLatestQuote = quorum(
  observation({ providerId: "yahoo_finance", providerFamily: "yahoo", source: "Yahoo latest quote" }),
  observation({
    providerId: "stooq_daily",
    providerFamily: "stooq",
    source: "Stooq daily close",
    observationWindow: "daily_close",
    valueSha256: digestB,
  }),
);
assert.equal(stooqDailyVersusLatestQuote.identityAligned, false);
assert.equal(stooqDailyVersusLatestQuote.comparability, "not_comparable");
assert.equal(stooqDailyVersusLatestQuote.strongClaimEligible, false);

const wrongRequestedAsset = quorum(
  observation(),
  observation({ providerId: "provider-b", providerFamily: "provider-b-root", source: "provider-b", valueSha256: digestB }),
  { ...expectedIdentity, assetId: "ETH" },
);
assert.equal(wrongRequestedAsset.identityAligned, false);
assert.equal(wrongRequestedAsset.strongClaimEligible, false);

const missingExpectedIdentity = quorum(
  observation(),
  observation({ providerId: "provider-b", providerFamily: "provider-b-root", source: "provider-b", valueSha256: digestB }),
  null,
);
assert.equal(missingExpectedIdentity.identityAligned, false);
assert.equal(missingExpectedIdentity.strongClaimEligible, false);

const missingDigest = quorum(
  observation(),
  observation({ providerId: "provider-b", providerFamily: "provider-b-root", source: "provider-b", valueSha256: null }),
);
assert.equal(missingDigest.independentSourceCount, 2);
assert.equal(missingDigest.identityAligned, true);
assert.equal(missingDigest.freshPaidEvidenceEligible, false);
assert.equal(missingDigest.strongClaimEligible, false);
assert.ok(missingDigest.reasons.some((reason) => reason.includes("SHA-256")));

const mirroredDigest = quorum(
  observation(),
  observation({ providerId: "provider-b", providerFamily: "provider-b-root", source: "provider-b", valueSha256: digestA }),
);
assert.equal(mirroredDigest.freshPaidEvidenceEligible, false);
assert.equal(mirroredDigest.strongClaimEligible, false);

const implicitEligibility = quorum(
  observation(),
  observation({ providerId: "provider-b", providerFamily: "provider-b-root", source: "provider-b", valueSha256: digestB, evidenceEligible: undefined }),
);
assert.equal(implicitEligibility.freshPaidEvidenceEligible, false);
assert.equal(implicitEligibility.strongClaimEligible, false);

const mutatedDigest = quorum(
  observation(),
  observation({ providerId: "provider-b", providerFamily: "provider-b-root", source: "provider-b", valueSha256: "c".repeat(64) }),
);
assert.notEqual(mutatedDigest.observationDigest, strong.observationDigest);

const riskNow = new Date();
function riskReceipt(
  providerId: string,
  providerFamily: string,
  payload: unknown,
  capabilities = ["identity", "price", "volume", "liquidity", "history"],
  identity = { requested: "BTC", resolvedSymbol: "BTC", resolvedMarketId: "bitcoin" },
) {
  return createPass4644ProviderEvidenceReceipt({
    providerId,
    providerFamily,
    surface: "crypto",
    verification: "normalized_response",
    requestedIdentity: identity.requested,
    resolvedSymbol: identity.resolvedSymbol,
    resolvedMarketId: identity.resolvedMarketId,
    identityMatched: true,
    capabilities,
    timestampProvenance: "provider",
    observedAt: new Date(riskNow.getTime() - 1_000),
    receivedAt: riskNow,
    latencyMs: 33,
    ttlMs: 5 * 60_000,
    normalizedPayload: payload,
  });
}
function riskResult(
  receipts: ReturnType<typeof riskReceipt>[],
  dataSources: string[],
): TokenRiskResult {
  return {
    token: { marketId: "bitcoin", symbol: "BTC", name: "Bitcoin", assetClass: "crypto" },
    score: 35,
    confidence: 0.9,
    level: "medium",
    badge: "elevated_risk",
    signals: [{ id: "thin_liquidity", severity: "medium", points: 5 }],
    metrics: { currentPrice: 100_000, marketCap: 1_000_000_000_000, volume24h: 20_000_000_000, priceChange24h: 1 },
    dataQuality: "live",
    dataSources,
    providerEvidenceReceipts: receipts,
    generatedAt: riskNow.toISOString(),
  };
}
const riskHistory = [
  { score: 34, timestamp: new Date(riskNow.getTime() - 60_000).toISOString() },
  { score: 35, timestamp: riskNow.toISOString() },
];
const coingeckoRiskReceipt = riskReceipt("coingecko", "market_data", { provider: "coingecko", price: 100_000 });
const labelSpoofedRisk = analyzeRiskWithVlmKernel({
  result: riskResult(coingeckoRiskReceipt ? [coingeckoRiskReceipt] : [], Array.from({ length: 12 }, (_, index) => `Unbound Label ${index + 1}`)),
  history: riskHistory,
  locale: "en",
  depth: "advanced",
});
assert.equal(labelSpoofedRisk.sourceCount, 1);
assert.deepEqual(labelSpoofedRisk.sourceFamilies, ["coingecko"]);
assert.equal(labelSpoofedRisk.status, "blocked");
assert.equal(labelSpoofedRisk.confidence, 0);
assert.equal(labelSpoofedRisk.evidence.filter((item) => item.independence === "independent").length, 1);
assert.equal(labelSpoofedRisk.evidence.some((item) => item.source.startsWith("Unbound Label")), false);
assert.ok(labelSpoofedRisk.missingData.some((item) => item.id === "risk.missing.provider-receipt-quorum" && item.blocksPublish));

const sameRootRisk = analyzeRiskWithVlmKernel({
  result: riskResult([
    riskReceipt("binance-global", "binance", { venue: "global", price: 100_000 }),
    riskReceipt("binance-us", "binance", { venue: "us", price: 100_050 }),
  ], ["Binance Global", "Binance US", "Fake Third Source"]),
  history: riskHistory,
  locale: "en",
  depth: "advanced",
});
assert.equal(sameRootRisk.sourceCount, 1);
assert.equal(sameRootRisk.status, "blocked");
assert.equal(sameRootRisk.confidence, 0);

const binanceAliasQuality = buildPass4650ProviderQualitySnapshot({
  receipts: [
    riskReceipt("binance-global-api", "binance_global", { venue: "global", price: 100_000 }),
    riskReceipt("binance-us-api", "binance_us", { venue: "us", price: 100_050 }),
  ],
  requestedIdentity: "BTC",
  assetClass: "crypto",
  now: riskNow,
});
assert.equal(binanceAliasQuality.independentReceiptCount, 1);
assert.deepEqual(binanceAliasQuality.independentProviderFamilies, ["binance"]);
assert.ok(binanceAliasQuality.verdicts.some((verdict) => verdict.warnings.includes("duplicate_canonical_provider_root_not_counted")));

const unknownGenericQuality = buildPass4650ProviderQualitySnapshot({
  receipts: [riskReceipt("unknown-lane-a", "market_data", { price: 100_000 })],
  requestedIdentity: "BTC",
  assetClass: "crypto",
  now: riskNow,
});
assert.equal(unknownGenericQuality.independentReceiptCount, 0);
assert.ok(unknownGenericQuality.verdicts[0]?.blockers.includes("provider_root_family_unknown"));
assert.equal(canonicalProviderRootFamily({ providerId: "defillama", providerFamily: "protocol_fundamentals" }), "defillama");
assert.equal(canonicalProviderRootFamily({ providerId: "goplus", providerFamily: "contract_risk" }), "gopluslabs");
assert.equal(canonicalProviderRootFamily({ providerId: "mystery-contract-lane", providerFamily: "contract_risk" }), "");

const mirroredPayload = { symbol: "BTC", price: 100_000 };
const mirroredRootRisk = analyzeRiskWithVlmKernel({
  result: riskResult([
    riskReceipt("coingecko", "coingecko", mirroredPayload),
    riskReceipt("binance", "binance", mirroredPayload),
  ], ["CoinGecko", "Binance", "Spoofed Extra"]),
  history: riskHistory,
  locale: "en",
  depth: "advanced",
});
assert.equal(mirroredRootRisk.sourceCount, 1);
assert.equal(mirroredRootRisk.status, "blocked");

const independentRisk = analyzeRiskWithVlmKernel({
  result: riskResult([
    coingeckoRiskReceipt,
    riskReceipt("binance", "binance", { provider: "binance", price: 100_025 }),
  ], ["CoinGecko display", "Binance display", "Unbound display-only label"]),
  history: riskHistory,
  locale: "en",
  depth: "advanced",
});
assert.equal(independentRisk.sourceCount, 2);
assert.deepEqual(independentRisk.sourceFamilies, ["binance", "coingecko"]);
assert.ok(independentRisk.confidence > 0);
assert.equal(independentRisk.evidence.filter((item) => item.independence === "independent").length, 2);
assert.equal(independentRisk.evidence.some((item) => item.source === "Unbound display-only label"), false);

const mixedLegitimateAliasRisk = analyzeRiskWithVlmKernel({
  result: riskResult([
    riskReceipt("coingecko", "coingecko", { provider: "coingecko", price: 100_000 }, undefined, { requested: "bitcoin", resolvedSymbol: "BTC", resolvedMarketId: "bitcoin" }),
    riskReceipt("kraken", "kraken", { provider: "kraken", price: 100_010 }),
  ], ["CoinGecko", "Kraken"]),
  history: riskHistory,
  locale: "en",
  depth: "advanced",
});
assert.equal(mixedLegitimateAliasRisk.sourceCount, 2);
assert.ok(mixedLegitimateAliasRisk.confidence > 0);

const wrongTokenReceiptsRisk = analyzeRiskWithVlmKernel({
  result: riskResult([
    riskReceipt("coingecko", "coingecko", { provider: "coingecko", price: 3_000 }, undefined, { requested: "ethereum", resolvedSymbol: "ETH", resolvedMarketId: "ethereum" }),
    riskReceipt("kraken", "kraken", { provider: "kraken", price: 3_001 }, undefined, { requested: "ETH", resolvedSymbol: "ETH", resolvedMarketId: "ethereum" }),
  ], ["CoinGecko", "Kraken"]),
  history: riskHistory,
  locale: "en",
  depth: "advanced",
});
assert.equal(wrongTokenReceiptsRisk.sourceCount, 0);
assert.equal(wrongTokenReceiptsRisk.status, "blocked");
assert.equal(wrongTokenReceiptsRisk.confidence, 0);

const identityOnlyRisk = analyzeRiskWithVlmKernel({
  result: riskResult([
    riskReceipt("coingecko", "coingecko", { provider: "coingecko", identity: "BTC" }, ["identity"]),
    riskReceipt("kraken", "kraken", { provider: "kraken", identity: "BTC" }, ["identity"]),
  ], ["CoinGecko", "Kraken"]),
  history: riskHistory,
  locale: "en",
  depth: "advanced",
});
assert.equal(identityOnlyRisk.sourceCount, 2);
assert.equal(identityOnlyRisk.status, "blocked");
assert.equal(identityOnlyRisk.confidence, 0);
assert.equal(identityOnlyRisk.findings.some((finding) => finding.id === "risk.score"), false);
assert.ok(identityOnlyRisk.missingData.some((item) => item.id === "risk.missing.provider-quality-gate" && item.blocksPublish));
assert.ok(identityOnlyRisk.missingData.some((item) => item.id === "risk.missing.score-signal-coverage" && item.blocksPublish));

const marketButNoSignalCoverageRisk = analyzeRiskWithVlmKernel({
  result: riskResult([
    riskReceipt("coingecko", "coingecko", { provider: "coingecko", price: 100_000 }, ["identity", "price"]),
    riskReceipt("kraken", "kraken", { provider: "kraken", price: 100_010 }, ["identity", "quote"]),
  ], ["CoinGecko", "Kraken"]),
  history: riskHistory,
  locale: "en",
  depth: "advanced",
});
assert.equal(marketButNoSignalCoverageRisk.sourceCount, 2);
assert.equal(marketButNoSignalCoverageRisk.status, "blocked");
assert.equal(marketButNoSignalCoverageRisk.confidence, 0);
assert.ok(marketButNoSignalCoverageRisk.missingData.some((item) => item.id === "risk.missing.score-signal-coverage" && item.reason.includes("liquidity")));

const insufficientSignalResult = riskResult([
  coingeckoRiskReceipt,
  riskReceipt("kraken", "kraken", { provider: "kraken", price: 100_010 }),
], ["CoinGecko", "Kraken"]);
insufficientSignalResult.signals = [{ id: "insufficient_data", severity: "medium", points: 5 }];
const insufficientSignalRisk = analyzeRiskWithVlmKernel({
  result: insufficientSignalResult,
  history: riskHistory,
  locale: "en",
  depth: "advanced",
});
assert.equal(insufficientSignalRisk.sourceCount, 2);
assert.equal(insufficientSignalRisk.status, "blocked");
assert.equal(insufficientSignalRisk.confidence, 0);
assert.ok(insufficientSignalRisk.missingData.some((item) => item.id === "risk.missing.engine-data-state" && item.blocksPublish));

const dynamicRiskReceipts = [
  coingeckoRiskReceipt,
  riskReceipt("binance", "binance", { provider: "binance", price: 100_025 }),
];
const unsignedDynamicAdvancedLedger = buildPass4645ProviderEvidenceLedger({
  receipts: dynamicRiskReceipts,
  requestedIdentity: "btc",
  surface: "crypto",
  depth: "advanced",
  generatedAt: riskNow,
});
const unsignedLedgerResult = riskResult(dynamicRiskReceipts, ["CoinGecko", "Binance"]);
unsignedLedgerResult.providerEvidenceLedger = unsignedDynamicAdvancedLedger;
unsignedLedgerResult.providerEvidencePersistence = {
  schemaVersion: "pass4645_provider_evidence_persistence_v1",
  durable: true,
  mode: "filesystem",
  ledgerId: unsignedDynamicAdvancedLedger.ledgerId,
  headHash: unsignedDynamicAdvancedLedger.headHash,
  recordCount: unsignedDynamicAdvancedLedger.receiptCount,
  readBackVerified: true,
  persistedAt: riskNow.toISOString(),
  locator: "fixture:unsigned-advanced",
  blockers: [],
};
const unsignedLedgerReadiness = buildAnalysisReadiness(unsignedLedgerResult);
assert.equal(unsignedLedgerReadiness.durableReceiptReady, false);
assert.equal(unsignedLedgerReadiness.tiers.pro.sellReady, false);

console.log("PASS4826 provider provenance/quorum P0: all behavioral and mutation assertions passed");
