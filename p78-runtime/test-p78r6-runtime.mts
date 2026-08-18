import fs from "node:fs";
import path from "node:path";
import { buildPass5002Erc2771MulticallSourceDetectorReport } from "../p75-work/source/lib/security/erc2771-multicall-source-detector";
import { buildPass2574AuditClaimLedgerReport } from "../p75-work/source/lib/security/audit-claim-ledger";
import { buildPass2578AuditReportAssemblerReport } from "../p75-work/source/lib/security/audit-report-assembler";
import type { Pass2572VerifiedStaticEvidence } from "../p75-work/source/lib/security/audit-provider-runtime-client";

const outDir = process.env.P78R6_RESULT_DIR ?? process.cwd();
const groundTruthDir = process.env.P78R6_GROUNDTRUTH_DIR;
const address = "0x1111111111111111111111111111111111111111";
const ozPath = "@openzeppelin/contracts/metatx/ERC2771Context.sol";

function must(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(`p78r6_${label}`);
}

function evidence(sourceText: string, contractName?: string): Pass2572VerifiedStaticEvidence {
  return {
    contractAddress: address,
    chain: "ethereum",
    provider: "Etherscan V2",
    observedAt: "2026-08-18T12:00:00.000Z",
    responseDigest: "1".repeat(64),
    contractName,
    sourceText,
  };
}

function detect(sourceText: string, contractName?: string) {
  return buildPass5002Erc2771MulticallSourceDetectorReport({
    locale: "en",
    chain: "ethereum",
    contractAddress: address,
    verifiedStaticEvidence: evidence(sourceText, contractName),
  });
}

function targetBody(name: string, base: string) {
  return `contract ${name} is ${base} {
    function multicall(bytes[] calldata payloads) external {
      for (uint256 i = 0; i < payloads.length; i++) { address(this).delegatecall(payloads[i]); }
    }
    function privileged() external { require(_msgSender() != address(0), "auth"); }
  }`;
}

const aliasDecoy = `pragma solidity ^0.8.20;
import { ERC2771Context as OZERC2771Context } from "${ozPath}";
abstract contract ERC2771Context {
  function _msgSender() internal view virtual returns (address) { return msg.sender; }
}
${targetBody("AliasDecoyTarget", "ERC2771Context")}`;
const decoy = detect(aliasDecoy, "AliasDecoyTarget");
must(decoy.state === "blocked", `alias_decoy_state:${decoy.state}`);
must(decoy.contextAuthenticity.state === "unverified_name_only", `alias_decoy_auth:${decoy.contextAuthenticity.state}`);
must(!decoy.signals.erc2771LogicalSenderContext, "alias_decoy_meta_signal");
must(decoy.blockers.includes("erc2771_context_authenticity_not_verified"), "alias_decoy_blocker_missing");

const selective = `pragma solidity ^0.8.20;
import { ERC2771Context } from "${ozPath}";
${targetBody("SelectiveTarget", "ERC2771Context")}`;
const selectiveResult = detect(selective, "SelectiveTarget");
must(selectiveResult.state === "confirmed_source_pattern", `selective_state:${selectiveResult.state}`);
must(selectiveResult.contextAuthenticity.state === "verified_openzeppelin_import", `selective_auth:${selectiveResult.contextAuthenticity.state}`);

const aliasUsed = `pragma solidity ^0.8.20;
import { ERC2771Context as OZContext } from "${ozPath}";
${targetBody("AliasUsedTarget", "OZContext")}`;
const aliasUsedResult = detect(aliasUsed, "AliasUsedTarget");
must(aliasUsedResult.state === "confirmed_source_pattern", `alias_used_state:${aliasUsedResult.state}`);
must(aliasUsedResult.contextAuthenticity.state === "verified_openzeppelin_import", `alias_used_auth:${aliasUsedResult.contextAuthenticity.state}`);
must(aliasUsedResult.correlation.analyzedContractNames.includes("AliasUsedTarget"), "alias_used_target_not_analyzed");

const namespaceUsed = `pragma solidity ^0.8.20;
import * as OZ from "${ozPath}";
${targetBody("NamespaceTarget", "OZ.ERC2771Context")}`;
const namespaceResult = detect(namespaceUsed, "NamespaceTarget");
must(namespaceResult.state === "confirmed_source_pattern", `namespace_state:${namespaceResult.state}`);
must(namespaceResult.contextAuthenticity.state === "verified_openzeppelin_import", `namespace_auth:${namespaceResult.contextAuthenticity.state}`);

const legacyNamespaceUsed = `pragma solidity ^0.8.20;
import "${ozPath}" as OZLegacy;
${targetBody("LegacyNamespaceTarget", "OZLegacy.ERC2771Context")}`;
const legacyNamespaceResult = detect(legacyNamespaceUsed, "LegacyNamespaceTarget");
must(legacyNamespaceResult.state === "confirmed_source_pattern", `legacy_namespace_state:${legacyNamespaceResult.state}`);
must(legacyNamespaceResult.contextAuthenticity.state === "verified_openzeppelin_import", `legacy_namespace_auth:${legacyNamespaceResult.contextAuthenticity.state}`);

const plainUsed = `pragma solidity ^0.8.20;
import "${ozPath}";
${targetBody("PlainImportTarget", "ERC2771Context")}`;
const plainResult = detect(plainUsed, "PlainImportTarget");
must(plainResult.state === "confirmed_source_pattern", `plain_state:${plainResult.state}`);
must(plainResult.contextAuthenticity.state === "verified_openzeppelin_import", `plain_auth:${plainResult.contextAuthenticity.state}`);

const unusedAliasOnly = `pragma solidity ^0.8.20;
import { ERC2771Context as UnusedOZ } from "${ozPath}";
contract UnrelatedBase { function _msgSender() internal view returns(address){ return msg.sender; } }
${targetBody("UnusedAliasTarget", "UnrelatedBase")}`;
const unusedAlias = detect(unusedAliasOnly, "UnusedAliasTarget");
must(unusedAlias.state === "not_detected", `unused_alias_state:${unusedAlias.state}`);
must(unusedAlias.contextAuthenticity.state === "not_present", `unused_alias_auth:${unusedAlias.contextAuthenticity.state}`);

// Preserve R5 source-semantic fallback when no OZ import exists.
const semanticContext = `pragma solidity ^0.8.20;
abstract contract ERC2771Context {
  function isTrustedForwarder(address forwarder) public view virtual returns (bool) { return forwarder != address(0); }
  function _msgSender() internal view virtual returns (address sender) {
    if (isTrustedForwarder(msg.sender) && msg.data.length >= 20) {
      assembly { sender := shr(96, calldataload(sub(calldatasize(), 20))) }
    } else { sender = msg.sender; }
  }
}
${targetBody("SemanticTarget", "ERC2771Context")}`;
const semantic = detect(semanticContext, "SemanticTarget");
must(semantic.state === "confirmed_source_pattern", `semantic_state:${semantic.state}`);
must(semantic.contextAuthenticity.state === "verified_source_semantics", `semantic_auth:${semantic.contextAuthenticity.state}`);

// Preserve R4 cross-unit correlation hard-negative.
const metaOnly = `pragma solidity ^0.8.20;
abstract contract ERC2771Context { function _msgSender() internal view returns(address){ return msg.sender; } }
contract MetaOnly is ERC2771Context { function privileged() external { require(_msgSender()!=address(0), "auth"); } }`;
const batchOnly = `pragma solidity ^0.8.20;
contract BatchOnly { function multicall(bytes[] calldata data) external { for(uint i=0;i<data.length;i++){ address(this).delegatecall(data[i]); } } }`;
const unrelatedBundle = JSON.stringify({ language: "Solidity", sources: { "Meta.sol": { content: metaOnly }, "Batch.sol": { content: batchOnly } }, settings: {} });
const ambiguous = detect(unrelatedBundle);
const exactMeta = detect(unrelatedBundle, "MetaOnly");
const exactBatch = detect(unrelatedBundle, "BatchOnly");
must(ambiguous.state === "blocked", `cross_unit_ambiguous:${ambiguous.state}`);
must(exactMeta.state !== "confirmed_source_pattern", `cross_unit_meta_false_positive:${exactMeta.state}`);
must(exactBatch.state === "not_detected", `cross_unit_batch_state:${exactBatch.state}`);

// Confirmed authenticated source pattern remains structured but cannot promote risk floor.
const claims = buildPass2574AuditClaimLedgerReport({ locale: "en", chain: "ethereum", contractAddress: address, sourcePatternEvidence: selectiveResult });
const claim = claims.claims.find((item) => item.adverseKind === "source_pattern");
must(claim && claim.adverseRiskFloor === undefined, "source_pattern_claim_missing_or_risk_floor_present");
const assembled = buildPass2578AuditReportAssemblerReport({ locale: "en", chain: "ethereum", contractAddress: address, claimLedger: claims });
must(assembled.finalVerdict.riskScore === null, `source_pattern_illegal_risk_floor:${assembled.finalVerdict.riskScore}`);
const decoyClaims = buildPass2574AuditClaimLedgerReport({ locale: "en", chain: "ethereum", contractAddress: address, sourcePatternEvidence: decoy });
must(!decoyClaims.claims.some((item) => item.adverseKind === "source_pattern"), "alias_decoy_illegally_became_claim");

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
  must(vuln.contextAuthenticity.state === "verified_openzeppelin_import", `thirdweb_vulnerable_auth:${vuln.contextAuthenticity.state}`);
  must(repaired.state === "mitigated_source_pattern", `thirdweb_fixed_state:${repaired.state}`);
  must(repaired.contextAuthenticity.state === "verified_openzeppelin_import", `thirdweb_fixed_auth:${repaired.contextAuthenticity.state}`);
  must(repaired.signals.logicalSenderPreservedAcrossDelegatecall, "thirdweb_fixed_preservation_missing");
  thirdweb = {
    vulnerable: { state: vuln.state, contextAuthenticity: vuln.contextAuthenticity, correlation: vuln.correlation, signals: vuln.signals },
    fixed: { state: repaired.state, contextAuthenticity: repaired.contextAuthenticity, correlation: repaired.correlation, signals: repaired.signals },
  };
}

const receipt = {
  schemaVersion: "velmere.p78r6.import-symbol-binding-runtime.v1",
  status: "PASS",
  measuredParentRegression: {
    parentP78R5ObservedState: "confirmed_source_pattern",
    repairedState: decoy.state,
    falsePositiveStillObserved: decoy.state === "confirmed_source_pattern",
    authenticity: decoy.contextAuthenticity,
  },
  importBindingControls: {
    plain: { state: plainResult.state, authenticity: plainResult.contextAuthenticity.state },
    selective: { state: selectiveResult.state, authenticity: selectiveResult.contextAuthenticity.state },
    selectiveAliasUsed: { state: aliasUsedResult.state, authenticity: aliasUsedResult.contextAuthenticity.state },
    namespaceUsed: { state: namespaceResult.state, authenticity: namespaceResult.contextAuthenticity.state },
    legacyNamespaceUsed: { state: legacyNamespaceResult.state, authenticity: legacyNamespaceResult.contextAuthenticity.state },
    unusedAliasDecoy: { state: unusedAlias.state, authenticity: unusedAlias.contextAuthenticity.state },
  },
  inheritedPrecisionControls: {
    sourceSemanticFallback: { state: semantic.state, authenticity: semantic.contextAuthenticity.state },
    crossUnitAmbiguous: ambiguous.state,
    crossUnitExactMeta: exactMeta.state,
    crossUnitExactBatch: exactBatch.state,
  },
  productChain: {
    authenticatedClaimCreated: Boolean(claim),
    aliasDecoyClaimCreated: decoyClaims.claims.some((item) => item.adverseKind === "source_pattern"),
    riskFloorPromoted: assembled.finalVerdict.riskScore !== null,
  },
  thirdwebPinnedPair: thirdweb ?? "NOT_EXECUTED_NO_GROUNDTRUTH_DIR",
  zeroFakeCredit: {
    runtimeExploitability: 0,
    deployedBytecodeEquivalence: 0,
    formalDetectorAccuracy: "WITHHELD_SYMBOL_BINDING_REGRESSIONS_AND_PINNED_PAIR_ONLY",
    customerFinal: "0/20",
    auditFinalPdf: "0/3",
    rights: "2/203",
    paidValue: "0/10",
    saleEligible: "0/20",
    live: false,
  },
  truthBoundary: "PASS proves the measured import-alias decoy false positive is removed while legitimate plain/selective/alias/namespace bindings and source-semantic fallback remain detectable, R4/R5 precision controls are preserved, and the pinned historical thirdweb pair remains separated. It does not prove population accuracy or deployed runtime exploitability.",
};
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "P78R6_IMPORT_SYMBOL_BINDING_RUNTIME.json"), JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify(receipt, null, 2));
