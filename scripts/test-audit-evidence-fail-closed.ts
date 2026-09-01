import assert from "node:assert/strict";

import { buildPass2576AuditPermissionParserReport } from "../lib/security/audit-permission-parser";
import { buildPass2583ContractSourceAbiExtractionReport } from "../lib/security/contract-source-abi-extraction";
import { buildPass2584HolderLiquidityDepthEvidenceReport } from "../lib/security/holder-liquidity-depth-evidence";
import { buildPass2590RiskFormulaEvidenceWeightingContractReport } from "../lib/security/risk-formula-evidence-weighting-contract";
import { buildPass2575AuditSourceFreshnessReport } from "../lib/security/audit-source-freshness";

const address = "0x1111111111111111111111111111111111111111";
const pairAddress = "0x2222222222222222222222222222222222222222";
const ownerAddress = "0x3333333333333333333333333333333333333333";
const lockerAddress = "0x4444444444444444444444444444444444444444";

const proseOnlyRuntime = {
  target: { contractAddress: address, chain: "ethereum", chainId: "1" },
  lanes: [{
    id: "runtime-explorer-source",
    label: "Explorer source / ABI",
    provider: "Example adapter",
    state: "partial",
    claim: "No owner, no admin, ABI unavailable, source not verified; PDF should mention mint and blacklist.",
    evidence: ["customer evidence says proxy, owner(), mint(), pairAddress and top holders"],
    missing: ["source ABI owner admin mint pause blacklist upgrade proxy tax holder liquidity"],
  }],
} as never;

const permissionFromProse = buildPass2576AuditPermissionParserReport({
  contractAddress: address,
  chain: "ethereum",
  providerRuntime: proseOnlyRuntime,
  claimLedger: {
    claims: [{
      label: "PDF permission claim",
      claim: "owner(), admin(), mint(), blacklist(), upgradeTo() are not available",
      sourceFamily: "customer prose",
      missing: ["owner, proxy and ABI are missing"],
    }],
  } as never,
  sourceFreshness: {
    lanes: [{
      label: "Customer source row",
      provider: "PDF",
      claim: "no owner or mint",
      customerLine: "owner not detected",
      proPdfLine: "ABI owner() missing",
    }],
  } as never,
});
assert.equal(permissionFromProse.summary.detected, 0, "provider/customer/PDF prose must never create permission detections");
assert.ok(permissionFromProse.signals.every((signal) => signal.evidence.length === 0));

const permissionFromNegatedProse = buildPass2576AuditPermissionParserReport({
  contractAddress: address,
  sourceText: "The contract has no owner, does not mint, is not pausable and has no blacklist or proxy.",
  abiText: "ABI unavailable; no owner() and no upgradeTo().",
});
assert.equal(permissionFromNegatedProse.summary.detected, 0, "negated prose is not raw source or ABI");
assert.equal(permissionFromNegatedProse.summary.notDetected, 0, "invalid prose cannot prove absence either");

const permissionFromRaw = buildPass2576AuditPermissionParserReport({
  contractAddress: address,
  chain: "ethereum",
  verifiedStaticEvidence: {
    contractAddress: address,
    chain: "ethereum",
    provider: "explorer-fixture",
    observedAt: "2026-07-18T10:00:00.000Z",
    responseDigest: "c".repeat(64),
    sourceText: `
      pragma solidity ^0.8.20;
      contract RawEvidence {
        // no owner(), no mint(), blacklist is unavailable
        string private note = "upgradeTo and admin are not implemented";
        function transfer(address to, uint256 amount) external returns (bool) { return to != address(0) && amount >= 0; }
      }
    `,
    abiText: JSON.stringify([{ type: "function", name: "transfer", inputs: [{ type: "address" }, { type: "uint256" }], stateMutability: "nonpayable" }]),
  },
});
assert.equal(permissionFromRaw.summary.detected, 0, "comments and string-literal prose must be polarity-safe");
assert.equal(permissionFromRaw.summary.notDetected, 10, "complete structured source+ABI may prove pattern absence");

const permissionFromBytecode = buildPass2576AuditPermissionParserReport({
  contractAddress: address,
  chain: "ethereum",
  verifiedStaticEvidence: {
    contractAddress: address,
    chain: "ethereum",
    provider: "rpc-fixture",
    observedAt: "2026-07-18T10:00:00.000Z",
    responseDigest: "e".repeat(64),
    bytecodeText: "0x6000638da5cb5b60005260006000f360006000",
  },
});
assert.equal(permissionFromBytecode.signals.find((signal) => signal.id === "owner-control")?.state, "detected");
assert.equal(permissionFromBytecode.summary.notDetected, 0, "bytecode selector presence can detect, but selector absence cannot prove absence");

const sourceAbiFromProse = buildPass2583ContractSourceAbiExtractionReport({
  contractAddress: address,
  chain: "ethereum",
  providerRuntime: proseOnlyRuntime,
  permissionParser: permissionFromProse,
  realProviderAdapterHardening: {
    summary: { needsKey: 0, blocked: 0, error: 0 },
    providerAdapters: [{
      id: "etherscan-docs",
      provider: "Example",
      sourceLane: "source ABI",
      state: "degraded",
      endpointFamily: "getABI",
      docsReference: "Verified source and ABI documentation",
      mapsTo: ["SourceCode", "ABI", "owner()", "upgradeTo()"],
      evidence: ["source confirmed in customer PDF"],
      missing: ["actual raw provider payload"],
    }],
  } as never,
});
assert.equal(sourceAbiFromProse.sourceGate.sourceAvailable, false);
assert.equal(sourceAbiFromProse.sourceGate.abiAvailable, false);
assert.equal(sourceAbiFromProse.sourceGate.bytecodeAvailable, false);
assert.equal(sourceAbiFromProse.sourceGate.state, "blocked");
assert.equal(sourceAbiFromProse.summary.totalFunctions, 0);
assert.equal(sourceAbiFromProse.summary.canFeedPermissionParser, false);

const unboundSourceAbi = buildPass2583ContractSourceAbiExtractionReport({
  contractAddress: address,
  chain: "ethereum",
  sourceText: "contract Unbound { function owner() external view returns (address) { return address(0); } }",
  abiText: JSON.stringify([{ type: "function", name: "owner", inputs: [], stateMutability: "view" }]),
});
assert.equal(unboundSourceAbi.sourceGate.state, "blocked", "raw text without an identity-bound receipt is not verified provider evidence");
assert.equal(unboundSourceAbi.summary.totalFunctions, 0);

const verifiedSourceAbi = buildPass2583ContractSourceAbiExtractionReport({
  contractAddress: address,
  chain: "ethereum",
  verifiedStaticEvidence: {
    contractAddress: address,
    chain: "ethereum",
    provider: "explorer-fixture",
    observedAt: "2026-07-18T10:00:00.000Z",
    responseDigest: "d".repeat(64),
    sourceText: "contract Bound { function owner() external view returns (address) { return address(0); } }",
    abiText: JSON.stringify([{ type: "function", name: "owner", inputs: [], stateMutability: "view" }]),
  },
});
assert.equal(verifiedSourceAbi.sourceGate.state, "verified");
assert.equal(verifiedSourceAbi.sourceGate.abiAvailable, true);
assert.equal(verifiedSourceAbi.summary.totalFunctions, 1);
assert.equal(verifiedSourceAbi.summary.canFeedPermissionParser, true);

const holderFromDescriptions = buildPass2584HolderLiquidityDepthEvidenceReport({
  contractAddress: address,
  chain: "ethereum",
  providerRuntime: proseOnlyRuntime,
  liquidityHolderRisk: {
    signals: [{
      id: "holder-copy",
      area: "holder",
      label: "Top holder concentration",
      state: "missing",
      severity: "critical",
      basicLine: "Top holders not confirmed",
      proPdfLine: "liquidityUsd and LP lock missing",
      evidence: ["adapter documentation says holder list and locked liquidity"],
      missing: ["top10Percent", "pairAddress", "locker"],
    }],
  } as never,
  realProviderAdapterHardening: {
    summary: { needsKey: 0, blocked: 0, error: 0 },
    providerAdapters: [{
      id: "docs-only",
      provider: "Docs adapter",
      sourceLane: "holder liquidity",
      state: "usable",
      endpointFamily: "holders",
      docsReference: "pairAddress liquidityUsd top holders LP lock owner deployer totalSupply",
      mapsTo: ["pairAddress", "liquidityUsd", "top10Percent", "lockerAddress", "totalSupply"],
      evidence: ["customer/PDF prose: all fields confirmed"],
      missing: ["raw response"],
    }],
  } as never,
  contractSourceAbiExtraction: sourceAbiFromProse,
});
assert.equal(holderFromDescriptions.summary.confirmed, 0, "adapter docs/mapsTo/prose cannot confirm depth evidence");
assert.ok(holderFromDescriptions.depthLanes.every((lane) => lane.observedEvidence.length === 0));
assert.equal(holderFromDescriptions.summary.canFeedReportAssembler, false);
assert.equal(holderFromDescriptions.summary.canFinalSignLiquidityDepth, false);

const now = new Date().toISOString();
const transportOnlyFreshness = buildPass2575AuditSourceFreshnessReport({
  locale: "en",
  contractAddress: address,
  chain: "ethereum",
  providerRuntime: {
    generatedAt: now,
    target: { contractAddress: address, chain: "ethereum", chainId: "1" },
    lanes: [{
      id: "transport-only",
      label: "Transport-only provider response",
      provider: "provider-fixture",
      state: "confirmed",
      sourceUrl: "https://provider.example/api",
      receipt: {
        observedAt: now,
        statusCode: 200,
        contentType: "application/json",
        bodyBytes: 256,
        bodyDigest: "f".repeat(64),
        requestUrlDigest: "e".repeat(64),
        relatedResponseDigests: [],
      },
      identity: { verification: "exact_response", matched: true },
    }],
  } as never,
});
assert.equal(transportOnlyFreshness.summary.fresh, 0, "transport receipt time is not provider-observed data freshness");
assert.equal(transportOnlyFreshness.summary.unknown, 1);
assert.equal(transportOnlyFreshness.summary.basicUsable, 0);
assert.equal(transportOnlyFreshness.summary.proUsable, 0);
assert.equal(transportOnlyFreshness.lanes[0]?.timestampProvenance, "transport_received");
assert.match(transportOnlyFreshness.lanes[0]?.customerLine ?? "", /provider-source timestamp/i);

const holderFromTypedRaw = buildPass2584HolderLiquidityDepthEvidenceReport({
  contractAddress: address,
  chain: "ethereum",
  holderLiquidityEvidence: {
    contractAddress: address,
    chainId: "1",
    provider: "provider-fixture",
    observedAt: now,
    responseDigest: "a".repeat(64),
    dexPairs: [{ pairAddress, dexId: "dex", liquidityUsd: 125000, volume24h: 45000, pairCreatedAt: now }],
    lpLock: { lpTokenAddress: pairAddress, lpOwner: ownerAddress, lockerAddress, unlockTime: "2030-01-01T00:00:00.000Z", lockTxHash: `0x${"b".repeat(64)}` },
    holderConcentration: { top10Percent: 32, top20Percent: 48, excludedSystemAddresses: [pairAddress], holderCount: 1200 },
    deployerOwner: { deployer: ownerAddress, owner: ownerAddress, topHolderOverlap: true },
    supply: { totalSupply: "1000000", decimals: 18, burnedSupply: "0", lockedSupply: "250000", circulatingHint: "750000" },
    exitPressure: { liquidityUsd: 125000, volume24h: 45000, topHolderPercent: 32, sellTaxPercent: 0, transferRestrictionsObserved: false },
  },
});
assert.equal(holderFromTypedRaw.summary.confirmed, 7, "complete identity-bound typed evidence should confirm all lanes");
assert.ok(holderFromTypedRaw.depthLanes.every((lane) => lane.observedEvidence.length > 0));

const missingRisk = buildPass2590RiskFormulaEvidenceWeightingContractReport({
  contractAddress: address,
  chain: "ethereum",
});
assert.equal(missingRisk.summary.baseRisk, null);
assert.equal(missingRisk.summary.finalRiskScore, null, "missing runtime risk must never become the historical customer score 58");
assert.equal(missingRisk.summary.scoreBand, "unknown");
assert.equal(missingRisk.summary.canShowBasicScore, false);

console.log("audit evidence fail-closed adversarial regression: PASS");
