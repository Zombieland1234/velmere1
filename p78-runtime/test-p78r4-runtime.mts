import fs from "node:fs";
import path from "node:path";
import {
  buildPass2572AuditProviderRuntimeExecution,
  pass4824AuditProviderRuntimeClientDependencies,
  resetPass4824AuditProviderRuntimeCacheForTests,
  type Pass2572VerifiedStaticEvidence,
} from "../p75-work/source/lib/security/audit-provider-runtime-client";
import { buildPass5002Erc2771MulticallSourceDetectorReport } from "../p75-work/source/lib/security/erc2771-multicall-source-detector";
import { buildPass2574AuditClaimLedgerReport } from "../p75-work/source/lib/security/audit-claim-ledger";
import { buildPass2578AuditReportAssemblerReport } from "../p75-work/source/lib/security/audit-report-assembler";

const outDir = process.env.P78R4_RESULT_DIR ?? process.cwd();
const groundTruthDir = process.env.P78R4_GROUNDTRUTH_DIR;
const address = "0x1111111111111111111111111111111111111111";
const observedAt = "2026-08-18T12:00:00.000Z";
const responseDigest = "c".repeat(64);

function must(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(`p78r4_${label}`);
}

function evidence(sourceText: string, contractName?: string, overrides: Partial<Pass2572VerifiedStaticEvidence> = {}): Pass2572VerifiedStaticEvidence {
  return {
    contractAddress: address,
    chain: "ethereum",
    provider: "Etherscan V2",
    observedAt,
    responseDigest,
    contractName,
    sourceText,
    ...overrides,
  };
}

function detect(sourceText: string, contractName?: string, overrides: Partial<Pass2572VerifiedStaticEvidence> = {}) {
  return buildPass5002Erc2771MulticallSourceDetectorReport({
    locale: "en",
    chain: "ethereum",
    contractAddress: address,
    verifiedStaticEvidence: evidence(sourceText, contractName, overrides),
  });
}

const vulnerablePlain = `pragma solidity ^0.8.20;
abstract contract ERC2771Context {}
contract TargetVulnerable is ERC2771Context {
  function _msgSender() internal view returns (address) { return msg.sender; }
  function multicall(bytes[] calldata payloads) external {
    for (uint256 i = 0; i < payloads.length; i++) { address(this).delegatecall(payloads[i]); }
  }
  function privileged() external { require(_msgSender() != address(0), "auth"); }
}`;

const fixedPlain = `pragma solidity ^0.8.20;
abstract contract ERC2771Context {}
contract TargetFixed is ERC2771Context {
  function _msgSender() internal view returns (address) { return msg.sender; }
  function multicall(bytes[] calldata payloads) external {
    address sender = _msgSender();
    bool isForwarder = msg.sender != sender;
    for (uint256 i = 0; i < payloads.length; i++) {
      bytes memory callData = isForwarder ? abi.encodePacked(payloads[i], sender) : payloads[i];
      address(this).delegatecall(callData);
    }
  }
  function privileged() external { require(_msgSender() != address(0), "auth"); }
}`;

const metaOnly = `pragma solidity ^0.8.20;
abstract contract ERC2771Context {}
contract MetaOnly is ERC2771Context {
  function _msgSender() internal view returns(address){ return msg.sender; }
  function privileged() external { require(_msgSender() != address(0), "auth"); }
}`;
const batchOnly = `pragma solidity ^0.8.20;
contract BatchOnly {
  function multicall(bytes[] calldata payloads) external {
    for(uint256 i=0;i<payloads.length;i++){ address(this).delegatecall(payloads[i]); }
  }
}`;
const unrelatedBundle = JSON.stringify({ language: "Solidity", sources: {
  "MetaOnly.sol": { content: metaOnly },
  "BatchOnly.sol": { content: batchOnly },
}, settings: {} });

const vulnerable = detect(vulnerablePlain, "TargetVulnerable");
must(vulnerable.state === "confirmed_source_pattern", `target_vulnerable_state:${vulnerable.state}`);
must(vulnerable.correlation.targetSelection === "etherscan_contract_name", `target_vulnerable_selection:${vulnerable.correlation.targetSelection}`);
must(vulnerable.correlation.targetContractName === "TargetVulnerable", "target_vulnerable_contract_name");
must(vulnerable.correlation.analyzedContractNames.includes("TargetVulnerable"), "target_vulnerable_analyzed_target");
must(vulnerable.correlation.analyzedContractNames.includes("ERC2771Context"), "target_vulnerable_inherited_context");

const fixed = detect(fixedPlain, "TargetFixed");
must(fixed.state === "mitigated_source_pattern", `target_fixed_state:${fixed.state}`);
must(fixed.signals.logicalSenderPreservedAcrossDelegatecall, "target_fixed_preservation");

const ambiguous = detect(unrelatedBundle);
must(ambiguous.state === "blocked", `cross_unit_ambiguous_state:${ambiguous.state}`);
must(ambiguous.correlation.targetSelection === "ambiguous_or_missing", "cross_unit_ambiguous_selection");
must(ambiguous.blockers.includes("verified_source_target_contract_ambiguous_or_missing"), "cross_unit_ambiguous_blocker");

const selectedMeta = detect(unrelatedBundle, "MetaOnly");
must(selectedMeta.state === "not_detected", `selected_meta_false_positive:${selectedMeta.state}`);
must(selectedMeta.signals.erc2771LogicalSenderContext, "selected_meta_context_signal");
must(!selectedMeta.signals.arbitrarySelfDelegatecallBatch, "selected_meta_illegal_batch_signal");
must(selectedMeta.correlation.sourceUnitIds.length === 1 && selectedMeta.correlation.sourceUnitIds[0] === "MetaOnly.sol", `selected_meta_units:${selectedMeta.correlation.sourceUnitIds.join(",")}`);

const selectedBatch = detect(unrelatedBundle, "BatchOnly");
must(selectedBatch.state === "not_detected", `selected_batch_false_positive:${selectedBatch.state}`);
must(selectedBatch.signals.arbitrarySelfDelegatecallBatch, "selected_batch_batch_signal");
must(!selectedBatch.signals.erc2771LogicalSenderContext, "selected_batch_illegal_meta_signal");
must(selectedBatch.correlation.sourceUnitIds.length === 1 && selectedBatch.correlation.sourceUnitIds[0] === "BatchOnly.sol", `selected_batch_units:${selectedBatch.correlation.sourceUnitIds.join(",")}`);

const missingTarget = detect(unrelatedBundle, "DoesNotExist");
must(missingTarget.state === "blocked", `missing_target_state:${missingTarget.state}`);

const duplicateTargetBundle = JSON.stringify({ language: "Solidity", sources: {
  "One.sol": { content: "pragma solidity ^0.8.20; contract DuplicateTarget { function one() external {} }" },
  "Two.sol": { content: "pragma solidity ^0.8.20; contract DuplicateTarget { function two() external {} }" },
}, settings: {} });
const duplicateTarget = detect(duplicateTargetBundle, "DuplicateTarget");
must(duplicateTarget.state === "blocked", `duplicate_target_state:${duplicateTarget.state}`);

const indirectComposition = `pragma solidity ^0.8.20;
abstract contract ERC2771Context {}
abstract contract MetaBase is ERC2771Context {
  function _msgSender() internal view returns(address){ return msg.sender; }
  function privileged() external { require(_msgSender() != address(0), "auth"); }
}
abstract contract BatchBase {
  function multicall(bytes[] calldata payloads) external {
    for(uint256 i=0;i<payloads.length;i++){ address(this).delegatecall(payloads[i]); }
  }
}
contract CombinedTarget is MetaBase, BatchBase {}`;
const inherited = detect(indirectComposition, "CombinedTarget");
must(inherited.state === "confirmed_source_pattern", `indirect_inheritance_state:${inherited.state}`);
must(inherited.correlation.analyzedContractNames.includes("MetaBase") && inherited.correlation.analyzedContractNames.includes("BatchBase"), "indirect_inheritance_closure_missing");

// Etherscan execution proof: ContractName is retained only in the private digest-bound evidence.
const originalFetch = pass4824AuditProviderRuntimeClientDependencies.brokeredEgressFetch;
const originalKey = process.env.ETHERSCAN_API_KEY;
let etherscanFetches = 0;
function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json" } });
}
pass4824AuditProviderRuntimeClientDependencies.brokeredEgressFetch = (async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.includes("api.etherscan.io") && url.includes("action=getsourcecode")) {
    etherscanFetches += 1;
    return jsonResponse({ status: "1", message: "OK", result: [{
      SourceCode: vulnerablePlain,
      ABI: "[]",
      ContractName: "TargetVulnerable",
      CompilerVersion: "v0.8.20+commit.a1b79de6",
      Proxy: "0",
      Implementation: "",
    }] });
  }
  if (url.includes("api.etherscan.io") && url.includes("action=getcontractcreation")) {
    etherscanFetches += 1;
    return jsonResponse({ status: "1", message: "OK", result: [{ contractAddress: address }] });
  }
  if (url.includes("dexscreener.com")) return jsonResponse({ pairs: [] });
  if (url.includes("gopluslabs.io")) return jsonResponse({ result: {} });
  if (url.includes("honeypot.is")) return jsonResponse({});
  if (url.includes("coingecko.com")) return jsonResponse({ coins: [] });
  throw new Error(`p78r4_unexpected_provider_url:${url}`);
}) as typeof originalFetch;

let providerDetectorState: string | null = null;
try {
  process.env.ETHERSCAN_API_KEY = "p78r4-test-key";
  resetPass4824AuditProviderRuntimeCacheForTests();
  const execution = await buildPass2572AuditProviderRuntimeExecution({ locale: "en", chain: "ethereum", contractAddress: address, projectName: "P78R4" });
  must(etherscanFetches === 2, `etherscan_fetch_count:${etherscanFetches}`);
  must(execution.verifiedStaticEvidence?.contractName === "TargetVulnerable", `private_contract_name:${execution.verifiedStaticEvidence?.contractName}`);
  must(execution.verifiedStaticEvidence?.sourceText === vulnerablePlain, "private_source_payload_missing");
  must((execution.report as unknown as Record<string, unknown>).verifiedStaticEvidence === undefined, "private_evidence_property_leaked_publicly");
  const fromProvider = buildPass5002Erc2771MulticallSourceDetectorReport({
    locale: "en", chain: "ethereum", contractAddress: address, verifiedStaticEvidence: execution.verifiedStaticEvidence,
  });
  must(fromProvider.state === "confirmed_source_pattern", `provider_detector_state:${fromProvider.state}`);
  must(fromProvider.correlation.targetSelection === "etherscan_contract_name", `provider_detector_selection:${fromProvider.correlation.targetSelection}`);
  providerDetectorState = fromProvider.state;
} finally {
  pass4824AuditProviderRuntimeClientDependencies.brokeredEgressFetch = originalFetch;
  resetPass4824AuditProviderRuntimeCacheForTests();
  if (originalKey === undefined) delete process.env.ETHERSCAN_API_KEY;
  else process.env.ETHERSCAN_API_KEY = originalKey;
}

// Claim/report non-promotion remains intact after correlation repair.
const claimLedger = buildPass2574AuditClaimLedgerReport({ locale: "en", chain: "ethereum", contractAddress: address, sourcePatternEvidence: vulnerable });
const sourcePatternClaim = claimLedger.claims.find((claim) => claim.adverseKind === "source_pattern");
must(sourcePatternClaim && sourcePatternClaim.adverseRiskFloor === undefined, "source_pattern_claim_risk_floor_regression");
const assembled = buildPass2578AuditReportAssemblerReport({ locale: "en", chain: "ethereum", contractAddress: address, claimLedger });
must(assembled.finalVerdict.riskScore === null, `correlation_repair_illegal_risk_floor:${assembled.finalVerdict.riskScore}`);
must(assembled.topFindings.some((finding) => finding.id === `finding-${sourcePatternClaim.id}`), "correlated_source_pattern_not_in_top_findings");

let thirdweb: Record<string, unknown> | null = null;
if (groundTruthDir) {
  const read = (name: string) => fs.readFileSync(path.join(groundTruthDir, name), "utf8");
  const asStandardJson = (sources: Record<string, string>) => JSON.stringify({
    language: "Solidity",
    sources: Object.fromEntries(Object.entries(sources).map(([name, content]) => [name, { content }])),
    settings: {},
  });
  const vulnerableBundle = asStandardJson({
    "contracts/extension/Multicall.sol": read("vulnerable-Multicall.sol"),
    "contracts/infra/TWFactory.sol": read("vulnerable-TWFactory.sol"),
  });
  const fixedBundle = asStandardJson({
    "contracts/extension/Multicall.sol": read("fixed-Multicall.sol"),
    "contracts/infra/TWFactory.sol": read("fixed-TWFactory.sol"),
  });
  const vuln = detect(vulnerableBundle, "TWFactory");
  const repaired = detect(fixedBundle, "TWFactory");
  must(vuln.state === "confirmed_source_pattern", `thirdweb_vulnerable_state:${vuln.state}`);
  must(repaired.state === "mitigated_source_pattern", `thirdweb_fixed_state:${repaired.state}`);
  must(vuln.correlation.targetContractName === "TWFactory", "thirdweb_vulnerable_target_binding");
  must(vuln.correlation.analyzedContractNames.includes("Multicall"), "thirdweb_vulnerable_multicall_inheritance_missing");
  must(repaired.signals.logicalSenderPreservedAcrossDelegatecall, "thirdweb_fixed_preservation_missing");
  thirdweb = {
    vulnerable: { state: vuln.state, correlation: vuln.correlation, signals: vuln.signals },
    fixed: { state: repaired.state, correlation: repaired.correlation, signals: repaired.signals },
  };
}

const receipt = {
  schemaVersion: "velmere.p78r4.target-contract-correlation-runtime.v1",
  status: "PASS",
  crossUnitRegression: {
    oldP78R3ObservedState: "confirmed_source_pattern",
    noContractName: ambiguous.state,
    exactMetaOnly: selectedMeta.state,
    exactBatchOnly: selectedBatch.state,
    falsePositiveStillObserved: [ambiguous.state, selectedMeta.state, selectedBatch.state].includes("confirmed_source_pattern"),
  },
  targetSelectionControls: {
    vulnerableExact: vulnerable.correlation,
    fixedExact: fixed.correlation,
    missingTarget: missingTarget.state,
    duplicateTarget: duplicateTarget.state,
    indirectInheritance: { state: inherited.state, correlation: inherited.correlation },
  },
  providerHandoff: {
    etherscanFetches,
    privateContractNameBound: true,
    publicPrivateEvidenceLeak: false,
    detectorState: providerDetectorState,
  },
  productChain: {
    sourcePatternClaimPresent: true,
    riskFloorPromoted: assembled.finalVerdict.riskScore !== null,
  },
  thirdwebPinnedPair: thirdweb ?? "NOT_EXECUTED_NO_GROUNDTRUTH_DIR",
  zeroFakeCredit: {
    runtimeExploitability: 0,
    deployedBytecodeEquivalence: 0,
    formalDetectorAccuracy: "WITHHELD_CORRELATION_REGRESSION_AND_PINNED_PAIR_ONLY",
    customerFinal: "0/20",
    auditFinalPdf: "0/3",
    rights: "2/203",
    paidValue: "0/10",
    saleEligible: "0/20",
    live: false,
  },
  truthBoundary: "PASS proves the measured cross-unit false positive is removed by target/inheritance correlation and the pinned historical thirdweb pair remains separated. It does not prove population accuracy or deployed runtime exploitability.",
};
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "P78R4_TARGET_CONTRACT_CORRELATION_RUNTIME.json"), JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify(receipt, null, 2));
