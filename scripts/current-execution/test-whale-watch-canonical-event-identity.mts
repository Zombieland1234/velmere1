import assert from "node:assert/strict";
import { createMarketAssetBinding } from "../../lib/market-integrity/market-asset-binding.ts";
import { createWalletLabelRegistryArtifact } from "../../lib/market-integrity/wallet-label-registry.ts";
import { buildWhaleWatchAnalysis } from "../../lib/market-integrity/whale-watch-engine.ts";
import {
  canonicalWhaleEventId,
  deduplicateCanonicalWhaleTransfers,
} from "../../lib/market-integrity/whale-watch-onchain-event-identity.ts";
import {
  clearServerOwnedMarketIntelligenceCachesForTests,
  fetchServerOwnedWhaleEvidence,
  parseEtherscanTopHolderQuantity,
  verifyServerOwnedWhaleEvidenceIntegrity,
} from "../../lib/market-integrity/server-owned-market-intelligence-providers.ts";
import type { WhaleTransferEvent } from "../../lib/market-integrity/whale-watch-types.ts";

const now = new Date("2026-08-21T09:00:00.000Z");
const tokenAddress = "0x1111111111111111111111111111111111111111";
const from = "0x2222222222222222222222222222222222222222";
const to = "0x3333333333333333333333333333333333333333";
const txHash = `0x${"4".repeat(64)}`;
const blockHash = `0x${"5".repeat(64)}`;
const secret = "current-whale-binding-secret-at-least-thirty-two-chars";
const binding = createMarketAssetBinding({
  payload: {
    chainId: "eip155:1",
    tokenAddress,
    tokenSymbol: "WHALE",
    quoteAsset: "USD",
    venueMarkets: { coinbase: "WHALE-USD" },
    source: "current-execution-whale-fixture",
    issuedAt: new Date(now.getTime() - 60_000).toISOString(),
    expiresAt: new Date(now.getTime() + 60 * 60_000).toISOString(),
    nonce: "current-whale-binding-nonce-123456789",
  },
  secret,
});

process.env.ETHERSCAN_API_KEY = "offline-fixture-key";
process.env.ALCHEMY_ETH_RPC_URL = "https://eth-mainnet.g.alchemy.com/v2/offline-fixture";
let alchemyRawValue = "0x1312d0";
let alchemyTimestamp: string | undefined = now.toISOString();

const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = new URL(String(input));
  if (url.hostname === "api.etherscan.io") {
    const action = url.searchParams.get("action");
    if (action === "tokeninfo") {
      return Response.json({
        status: "1",
        message: "OK",
        result: [{ divisor: "6", totalSupply: "1000000000", tokenPriceUSD: "2" }],
      });
    }
    if (action === "topholders") {
      // Etherscan's topholders response is already expressed in display-token units.
      return Response.json({
        status: "1",
        message: "OK",
        result: [{ TokenHolderAddress: from, TokenHolderQuantity: "123.500000" }],
      });
    }
    if (action === "tokentx") {
      return Response.json({
        status: "1",
        message: "OK",
        result: [{
          blockNumber: "123",
          blockHash,
          confirmations: "12",
          contractAddress: tokenAddress,
          hash: txHash,
          logIndex: "7",
          from,
          to,
          value: "1250000",
          tokenDecimal: "6",
          timeStamp: String(Math.floor(now.getTime() / 1000)),
        }],
      });
    }
  }
  if (url.hostname.endsWith(".g.alchemy.com")) {
    const body = JSON.parse(String(init?.body ?? "{}")) as { method?: unknown };
    assert.equal(body.method, "alchemy_getAssetTransfers");
    return Response.json({
      jsonrpc: "2.0",
      id: 1,
      result: {
        transfers: [{
          blockNum: "0x7b",
          blockHash,
          confirmations: 12,
          hash: txHash,
          uniqueId: `${txHash}:log:0x7`,
          from,
          to,
          value: 1.25,
          metadata: { blockTimestamp: alchemyTimestamp },
          rawContract: { address: tokenAddress, decimal: "0x6", value: alchemyRawValue },
        }],
      },
    });
  }
  return Response.json({ error: "unexpected_fixture_request" }, { status: 404 });
};

clearServerOwnedMarketIntelligenceCachesForTests();
const evidence = await fetchServerOwnedWhaleEvidence({
  assetKey: "WHALE",
  bindingArtifact: binding,
  bindingSecret: secret,
  fallbackPriceUsd: 2,
  fetchImpl,
  now,
  bypassCache: true,
});

assert.equal(verifyServerOwnedWhaleEvidenceIntegrity(evidence), true);
assert.equal(evidence.holders.length, 1, "decimal TokenHolderQuantity must be accepted as token units");
assert.equal(evidence.holders[0]?.balance, 123.5, "top-holder quantity must not be divided by token decimals twice");
assert.equal(evidence.transfers.length, 1, "one physical log observed by two providers must be counted once");
assert.equal(evidence.transfers[0]?.chainId, "eip155:1");
assert.equal(evidence.transfers[0]?.contractAddress, tokenAddress);
assert.equal(evidence.transfers[0]?.txHash, txHash);
assert.equal(evidence.transfers[0]?.logIndex, 7);
assert.equal(evidence.transfers[0]?.blockNumber, 123);
assert.equal(evidence.transfers[0]?.blockHash, blockHash);
assert.equal(evidence.transfers[0]?.confirmations, 12);
assert.equal(evidence.transfers[0]?.finality, "confirmed");
assert.equal(evidence.transfers[0]?.reorgState, "canonical");
assert.deepEqual(evidence.transfers[0]?.providerFamilies, ["alchemy", "etherscan"]);
assert.match(evidence.transfers[0]?.eventId ?? "", /^evm-log:[a-f0-9]{64}$/u);

assert.equal(parseEtherscanTopHolderQuantity("123.500000"), 123.5);
assert.equal(parseEtherscanTopHolderQuantity("1e3"), null, "scientific notation is outside the documented topholders contract");
assert.equal(parseEtherscanTopHolderQuantity("0x10"), null);
assert.equal(parseEtherscanTopHolderQuantity("-1"), null);

const canonical = evidence.transfers[0] as WhaleTransferEvent;
const providerRow = (providerFamily: "alchemy" | "etherscan", sourceDigest: string): WhaleTransferEvent => ({
  ...canonical,
  eventId: `attacker-controlled:${providerFamily}`,
  providerFamily,
  providerFamilies: [providerFamily],
  sourceDigest,
  sourceDigests: [sourceDigest],
});
const alchemyRow = providerRow("alchemy", "a".repeat(64));
const etherscanRow = providerRow("etherscan", "b".repeat(64));
const duplicateResult = deduplicateCanonicalWhaleTransfers([alchemyRow, etherscanRow]);
assert.equal(duplicateResult.transfers.length, 1);
assert.equal(duplicateResult.duplicatesDropped, 1);
assert.deepEqual(duplicateResult.transfers[0]?.providerFamilies, ["alchemy", "etherscan"]);
assert.equal(duplicateResult.transfers[0]?.eventId, canonical.eventId, "attacker/provider eventId must never survive canonicalization");
assert.equal(canonicalWhaleEventId({ chainId: "eip155:1", contractAddress: tokenAddress, txHash, logIndex: 7 }), canonical.eventId);

const chainCollision = deduplicateCanonicalWhaleTransfers([etherscanRow, { ...alchemyRow, chainId: "eip155:10" }]);
assert.equal(chainCollision.transfers.length, 2, "identical tx/log coordinates on different chains are distinct");
const contractCollision = deduplicateCanonicalWhaleTransfers([etherscanRow, {
  ...alchemyRow,
  contractAddress: "0x9999999999999999999999999999999999999999",
}]);
assert.equal(contractCollision.transfers.length, 2, "identical tx/log coordinates from different contracts are distinct");
const logIndexCollision = deduplicateCanonicalWhaleTransfers([etherscanRow, { ...alchemyRow, logIndex: 8 }]);
assert.equal(logIndexCollision.transfers.length, 2, "two logs in the same transaction must not collapse");
const sanitizationCollision = deduplicateCanonicalWhaleTransfers([etherscanRow, { ...alchemyRow, chainId: "eip155:01", eventId: etherscanRow.eventId }]);
assert.equal(sanitizationCollision.transfers.length, 1);
assert.ok(sanitizationCollision.blockers.includes("whale_transfer_canonical_identity_required"));

const blockConflict = deduplicateCanonicalWhaleTransfers([etherscanRow, { ...alchemyRow, blockHash: `0x${"6".repeat(64)}` }]);
assert.equal(blockConflict.transfers.length, 0, "same physical-log identity with conflicting block identity must be withheld");
assert.ok(blockConflict.blockers.includes("whale_transfer_physical_log_conflict"));
const payloadConflict = deduplicateCanonicalWhaleTransfers([etherscanRow, { ...alchemyRow, amountBase: 999 }]);
assert.equal(payloadConflict.transfers.length, 0, "provider amount disagreement must not be counted");
const reorgConflict = deduplicateCanonicalWhaleTransfers([etherscanRow, { ...alchemyRow, reorgState: "reorged" }]);
assert.equal(reorgConflict.transfers.length, 0, "an explicit removed/reorged observation poisons the log until revalidated");
assert.ok(reorgConflict.blockers.includes("whale_transfer_reorg_conflict"));
const unconfirmed = deduplicateCanonicalWhaleTransfers([{ ...etherscanRow, confirmations: 0, finality: "unconfirmed", reorgState: "canonical" }]);
assert.equal(unconfirmed.transfers.length, 0);
assert.ok(unconfirmed.blockers.includes("whale_transfer_not_confirmed"));
const finalized = deduplicateCanonicalWhaleTransfers([etherscanRow, { ...alchemyRow, confirmations: 64, finality: "finalized" }]);
assert.equal(finalized.transfers.length, 1);
assert.equal(finalized.transfers[0]?.finality, "finalized");
assert.equal(finalized.transfers[0]?.confirmations, 64);
const invalidDecimals = deduplicateCanonicalWhaleTransfers([{ ...etherscanRow, tokenDecimals: 255 }]);
assert.equal(invalidDecimals.transfers.length, 0);
assert.ok(invalidDecimals.blockers.includes("whale_transfer_token_decimals_invalid"));
const malformedProvenance = deduplicateCanonicalWhaleTransfers([{
  ...etherscanRow,
  providerFamily: 123 as unknown as string,
  providerFamilies: ["etherscan", 456 as unknown as string],
}]);
assert.equal(malformedProvenance.transfers.length, 0);
assert.ok(malformedProvenance.blockers.includes("whale_transfer_provenance_invalid"));
const providerBridgeClaim = deduplicateCanonicalWhaleTransfers([{ ...etherscanRow, kind: "bridge" }]);
assert.equal(providerBridgeClaim.transfers[0]?.kind, "transfer", "provider-supplied bridge labels cannot classify a physical ERC-20 log");

const labelSecret = "current-whale-label-secret-at-least-thirty-two-characters";
const holderDigest = "c".repeat(64);
const bridgeLabel = createWalletLabelRegistryArtifact({
  payload: {
    assetKey: "WHALE",
    holderId: from,
    category: "bridge",
    clusterId: "verified-bridge-cluster",
    providerFamily: "etherscan",
    sourceDigest: holderDigest,
    confidencePercent: 95,
    issuedAt: new Date(now.getTime() - 60_000).toISOString(),
    expiresAt: new Date(now.getTime() + 60 * 60_000).toISOString(),
    nonce: "current-whale-bridge-label-123456789",
  },
  secret: labelSecret,
});
const bridgeWatch = buildWhaleWatchAnalysis({
  assetKey: "WHALE",
  totalSupply: 1_000,
  priceUsd: 2,
  holders: [
    { holderId: from, balance: 500, category: "bridge", labelVerified: true, clusterId: "verified-bridge-cluster", observedAt: now.toISOString(), providerFamily: "etherscan", status: "verified_live", sourceDigest: holderDigest },
    { holderId: to, balance: 100, category: "unknown", labelVerified: false, observedAt: now.toISOString(), providerFamily: "etherscan", status: "verified_live", sourceDigest: "d".repeat(64) },
  ],
  transfers: [
    { ...etherscanRow, amountBase: 10, amountUsd: undefined },
    { ...alchemyRow, amountBase: 10, amountUsd: undefined },
  ],
  capabilityReceipts: [
    { capability: "holder_distribution", providerFamily: "etherscan", observedAt: now.toISOString(), status: "verified_live", recordCount: 2, coverageComplete: false, sourceDigest: "e".repeat(64) },
    { capability: "wallet_labels", providerFamily: "etherscan", observedAt: now.toISOString(), status: "verified_live", recordCount: 1, coverageComplete: false, sourceDigest: "f".repeat(64) },
    { capability: "transfer_history", providerFamily: "alchemy", observedAt: now.toISOString(), status: "verified_live", recordCount: 1, coverageComplete: false, sourceDigest: "1".repeat(64) },
  ],
  redactionSecret: "current-whale-redaction-secret-at-least-thirty-two-chars",
  walletLabelArtifacts: [bridgeLabel],
  walletLabelVerificationSecret: labelSecret,
  now,
  policy: {
    minimumProviderFamilies: 1,
    minimumHolderCoveragePercent: 1,
    minimumVerifiedLabelCoveragePercent: 0,
    minimumClusterCoveragePercent: 0,
  },
});
assert.equal(bridgeWatch.transferCount, 1, "duplicate bridge-labelled physical log must remain one event");
assert.equal(bridgeWatch.flowWindows[0]?.eventCount, 1);
assert.equal(bridgeWatch.flowWindows[0]?.bridgeFlowUsd, 20, "only the signed wallet-label path may classify bridge flow");

alchemyRawValue = "0x1";
clearServerOwnedMarketIntelligenceCachesForTests();
const decimalConflictEvidence = await fetchServerOwnedWhaleEvidence({
  assetKey: "WHALE",
  bindingArtifact: binding,
  bindingSecret: secret,
  fallbackPriceUsd: 2,
  fetchImpl,
  now: new Date(now.getTime() + 1_000),
  bypassCache: true,
});
assert.equal(decimalConflictEvidence.transfers.length, 1, "valid Etherscan row may survive an invalid Alchemy unit projection");
assert.deepEqual(decimalConflictEvidence.transfers[0]?.providerFamilies, ["etherscan"]);
assert.ok(decimalConflictEvidence.blockers.includes("alchemy_transfer_decimal_conflict"));
alchemyRawValue = "0x1312d0";
alchemyTimestamp = undefined;
clearServerOwnedMarketIntelligenceCachesForTests();
const missingTimestampEvidence = await fetchServerOwnedWhaleEvidence({
  assetKey: "WHALE",
  bindingArtifact: binding,
  bindingSecret: secret,
  fallbackPriceUsd: 2,
  fetchImpl,
  now: new Date(now.getTime() + 2_000),
  bypassCache: true,
});
assert.equal(missingTimestampEvidence.transfers.length, 1, "valid Etherscan row may survive missing Alchemy currentness");
assert.deepEqual(missingTimestampEvidence.transfers[0]?.providerFamilies, ["etherscan"]);
assert.ok(missingTimestampEvidence.blockers.includes("alchemy_transfer_observed_at_invalid"));

console.log(JSON.stringify({
  status: "PASS_WHALE_WATCH_CANONICAL_EVENT_IDENTITY",
  holderQuantityContract: "DISPLAY_TOKEN_UNITS",
  canonicalTransferCount: evidence.transfers.length,
  duplicateProvidersCollapsed: duplicateResult.duplicatesDropped,
  collisionAndReorgCases: 11,
  signedBridgeFlowDoubleCountPrevented: true,
  rightsState: "WITHHELD",
  finalCredit: false,
}, null, 2));
