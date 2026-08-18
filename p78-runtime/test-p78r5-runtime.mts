import fs from "node:fs";
import path from "node:path";
import { buildPass5002Erc2771MulticallSourceDetectorReport } from "../p75-work/source/lib/security/erc2771-multicall-source-detector";
import { buildPass2574AuditClaimLedgerReport } from "../p75-work/source/lib/security/audit-claim-ledger";
import { buildPass2578AuditReportAssemblerReport } from "../p75-work/source/lib/security/audit-report-assembler";
import type { Pass2572VerifiedStaticEvidence } from "../p75-work/source/lib/security/audit-provider-runtime-client";

const outDir = process.env.P78R5_RESULT_DIR ?? process.cwd();
const groundTruthDir = process.env.P78R5_GROUNDTRUTH_DIR;
const address = "0x1111111111111111111111111111111111111111";

function must(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(`p78r5_${label}`);
}

function evidence(sourceText: string, contractName?: string): Pass2572VerifiedStaticEvidence {
  return {
    contractAddress: address,
    chain: "ethereum",
    provider: "Etherscan V2",
    observedAt: "2026-08-18T12:00:00.000Z",
    responseDigest: "e".repeat(64),
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

const fakeContextSource = `pragma solidity ^0.8.20;
abstract contract ERC2771Context {
  function _msgSender() internal view virtual returns (address) { return msg.sender; }
}
contract HarmlessNamedContext is ERC2771Context {
  function multicall(bytes[] calldata payloads) external {
    for (uint256 i = 0; i < payloads.length; i++) { address(this).delegatecall(payloads[i]); }
  }
  function privileged() external { require(_msgSender() != address(0), "auth"); }
}`;
const fakeContext = detect(fakeContextSource, "HarmlessNamedContext");
must(fakeContext.state === "blocked", `fake_context_state:${fakeContext.state}`);
must(fakeContext.contextAuthenticity.state === "unverified_name_only", `fake_context_authenticity:${fakeContext.contextAuthenticity.state}`);
must(!fakeContext.signals.erc2771LogicalSenderContext, "fake_context_meta_signal_must_be_false");
must(fakeContext.blockers.includes("erc2771_context_authenticity_not_verified"), "fake_context_blocker_missing");

const commentedImportFake = `pragma solidity ^0.8.20;
// import { ERC2771Context } from "@openzeppelin/contracts/metatx/ERC2771Context.sol";
abstract contract ERC2771Context { function _msgSender() internal view virtual returns(address){ return msg.sender; } }
contract CommentImportFake is ERC2771Context {
  function multicall(bytes[] calldata data) external { for(uint i=0;i<data.length;i++){ address(this).delegatecall(data[i]); } }
  function privileged() external { require(_msgSender()!=address(0), "auth"); }
}`;
const commentedFake = detect(commentedImportFake, "CommentImportFake");
must(commentedFake.state === "blocked", `comment_import_fake_state:${commentedFake.state}`);
must(commentedFake.contextAuthenticity.state === "unverified_name_only", `comment_import_fake_auth:${commentedFake.contextAuthenticity.state}`);

const stringImportFake = `pragma solidity ^0.8.20;
abstract contract ERC2771Context { function _msgSender() internal view virtual returns(address){ return msg.sender; } }
contract StringImportFake is ERC2771Context {
  string constant LOOKALIKE = "import { ERC2771Context } from @openzeppelin/contracts/metatx/ERC2771Context.sol";
  function multicall(bytes[] calldata data) external { for(uint i=0;i<data.length;i++){ address(this).delegatecall(data[i]); } }
  function privileged() external { require(_msgSender()!=address(0), "auth"); }
}`;
const stringFake = detect(stringImportFake, "StringImportFake");
must(stringFake.state === "blocked", `string_import_fake_state:${stringFake.state}`);
must(stringFake.contextAuthenticity.state === "unverified_name_only", `string_import_fake_auth:${stringFake.contextAuthenticity.state}`);

const ozImportVulnerable = `pragma solidity ^0.8.20;
import { ERC2771Context } from "@openzeppelin/contracts/metatx/ERC2771Context.sol";
contract OzImportedTarget is ERC2771Context {
  function multicall(bytes[] calldata payloads) external {
    for (uint256 i = 0; i < payloads.length; i++) { address(this).delegatecall(payloads[i]); }
  }
  function privileged() external { require(_msgSender() != address(0), "auth"); }
}`;
const imported = detect(ozImportVulnerable, "OzImportedTarget");
must(imported.state === "confirmed_source_pattern", `oz_import_vulnerable_state:${imported.state}`);
must(imported.contextAuthenticity.state === "verified_openzeppelin_import", `oz_import_authenticity:${imported.contextAuthenticity.state}`);
must(imported.signals.erc2771LogicalSenderContext, "oz_import_meta_signal_missing");

const semanticContextVulnerable = `pragma solidity ^0.8.20;
abstract contract ERC2771Context {
  function isTrustedForwarder(address forwarder) public view virtual returns (bool) { return forwarder != address(0); }
  function _msgSender() internal view virtual returns (address sender) {
    if (isTrustedForwarder(msg.sender) && msg.data.length >= 20) {
      assembly { sender := shr(96, calldataload(sub(calldatasize(), 20))) }
    } else { sender = msg.sender; }
  }
}
contract SemanticTarget is ERC2771Context {
  function multicall(bytes[] calldata payloads) external {
    for (uint256 i = 0; i < payloads.length; i++) { address(this).delegatecall(payloads[i]); }
  }
  function privileged() external { require(_msgSender() != address(0), "auth"); }
}`;
const semantic = detect(semanticContextVulnerable, "SemanticTarget");
must(semantic.state === "confirmed_source_pattern", `semantic_context_state:${semantic.state}`);
must(semantic.contextAuthenticity.state === "verified_source_semantics", `semantic_context_auth:${semantic.contextAuthenticity.state}`);

const fixedImported = `pragma solidity ^0.8.20;
import { ERC2771Context } from "@openzeppelin/contracts/metatx/ERC2771Context.sol";
contract OzImportedFixed is ERC2771Context {
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
const fixed = detect(fixedImported, "OzImportedFixed");
must(fixed.state === "mitigated_source_pattern", `fixed_imported_state:${fixed.state}`);
must(fixed.contextAuthenticity.state === "verified_openzeppelin_import", `fixed_imported_auth:${fixed.contextAuthenticity.state}`);
must(fixed.signals.logicalSenderPreservedAcrossDelegatecall, "fixed_imported_preservation_missing");

// Preserve R4 cross-unit correction: unrelated units must never compose a confirmed finding.
const metaOnly = `pragma solidity ^0.8.20;
abstract contract ERC2771Context { function _msgSender() internal view returns(address){ return msg.sender; } }
contract MetaOnly is ERC2771Context { function privileged() external { require(_msgSender()!=address(0), "auth"); } }`;
const batchOnly = `pragma solidity ^0.8.20;
contract BatchOnly { function multicall(bytes[] calldata data) external { for(uint i=0;i<data.length;i++){ address(this).delegatecall(data[i]); } } }`;
const unrelatedBundle = JSON.stringify({ language: "Solidity", sources: { "Meta.sol": { content: metaOnly }, "Batch.sol": { content: batchOnly } }, settings: {} });
const unrelatedNoTarget = detect(unrelatedBundle);
const unrelatedMeta = detect(unrelatedBundle, "MetaOnly");
const unrelatedBatch = detect(unrelatedBundle, "BatchOnly");
must(unrelatedNoTarget.state === "blocked", `r4_cross_unit_ambiguous:${unrelatedNoTarget.state}`);
must(unrelatedMeta.state !== "confirmed_source_pattern", `r4_cross_unit_meta_false_positive:${unrelatedMeta.state}`);
must(unrelatedBatch.state === "not_detected", `r4_cross_unit_batch_state:${unrelatedBatch.state}`);

// Product chain: only authenticated confirmed source patterns become facts; name-only blocked evidence cannot.
const fakeClaims = buildPass2574AuditClaimLedgerReport({ locale: "en", chain: "ethereum", contractAddress: address, sourcePatternEvidence: fakeContext });
must(!fakeClaims.claims.some((claim) => claim.adverseKind === "source_pattern"), "fake_context_illegally_became_claim");
const realClaims = buildPass2574AuditClaimLedgerReport({ locale: "en", chain: "ethereum", contractAddress: address, sourcePatternEvidence: imported });
const realClaim = realClaims.claims.find((claim) => claim.adverseKind === "source_pattern");
must(realClaim && realClaim.adverseRiskFloor === undefined, "authenticated_source_pattern_claim_missing_or_risk_floor_present");
const assembled = buildPass2578AuditReportAssemblerReport({ locale: "en", chain: "ethereum", contractAddress: address, claimLedger: realClaims });
must(assembled.finalVerdict.riskScore === null, `authenticated_source_pattern_illegal_risk_floor:${assembled.finalVerdict.riskScore}`);
must(assembled.topFindings.some((finding) => finding.id === `finding-${realClaim.id}`), "authenticated_source_pattern_not_in_top_findings");

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
  schemaVersion: "velmere.p78r5.erc2771-context-authenticity-runtime.v1",
  status: "PASS",
  measuredParentRegression: {
    parentP78R4ObservedState: "confirmed_source_pattern",
    repairedState: fakeContext.state,
    falsePositiveStillObserved: fakeContext.state === "confirmed_source_pattern",
    authenticity: fakeContext.contextAuthenticity,
  },
  authenticityControls: {
    commentedImportFake: { state: commentedFake.state, authenticity: commentedFake.contextAuthenticity.state },
    stringImportFake: { state: stringFake.state, authenticity: stringFake.contextAuthenticity.state },
    exactOpenZeppelinImport: { state: imported.state, authenticity: imported.contextAuthenticity.state },
    verifiedSourceSemantics: { state: semantic.state, authenticity: semantic.contextAuthenticity.state },
    senderPreservedOpenZeppelinImport: { state: fixed.state, authenticity: fixed.contextAuthenticity.state },
  },
  inheritedR4CrossUnitRegression: {
    ambiguousBundle: unrelatedNoTarget.state,
    exactMetaOnly: unrelatedMeta.state,
    exactBatchOnly: unrelatedBatch.state,
    falsePositiveObserved: [unrelatedNoTarget.state, unrelatedMeta.state, unrelatedBatch.state].includes("confirmed_source_pattern"),
  },
  productChain: {
    unverifiedNameOnlyClaimCreated: fakeClaims.claims.some((claim) => claim.adverseKind === "source_pattern"),
    authenticatedClaimCreated: Boolean(realClaim),
    riskFloorPromoted: assembled.finalVerdict.riskScore !== null,
  },
  thirdwebPinnedPair: thirdweb ?? "NOT_EXECUTED_NO_GROUNDTRUTH_DIR",
  zeroFakeCredit: {
    runtimeExploitability: 0,
    deployedBytecodeEquivalence: 0,
    formalDetectorAccuracy: "WITHHELD_AUTHENTICITY_REGRESSIONS_AND_PINNED_PAIR_ONLY",
    customerFinal: "0/20",
    auditFinalPdf: "0/3",
    rights: "2/203",
    paidValue: "0/10",
    saleEligible: "0/20",
    live: false,
  },
  truthBoundary: "PASS proves the measured class-name false positive is removed, exact OpenZeppelin imports and source-visible trusted-forwarder semantics remain detectable, the R4 cross-unit correction is preserved, and the pinned historical thirdweb pair remains separated. It does not prove population accuracy or deployed runtime exploitability.",
};
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "P78R5_ERC2771_CONTEXT_AUTHENTICITY_RUNTIME.json"), JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify(receipt, null, 2));
