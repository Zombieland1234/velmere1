import fs from "node:fs";
import path from "node:path";
import {
  buildPass5002Erc2771MulticallSourceDetectorReport,
  type Pass5002Erc2771MulticallSourceDetectorReport,
} from "../p75-work/source/lib/security/erc2771-multicall-source-detector";
import { buildPass2574AuditClaimLedgerReport } from "../p75-work/source/lib/security/audit-claim-ledger";
import { buildPass2578AuditReportAssemblerReport } from "../p75-work/source/lib/security/audit-report-assembler";
import type { Pass2572VerifiedStaticEvidence } from "../p75-work/source/lib/security/audit-provider-runtime-client";

const outDir = process.env.P78R3_RESULT_DIR ?? process.cwd();
const groundTruthDir = process.env.P78R3_GROUNDTRUTH_DIR;
const address = "0x1111111111111111111111111111111111111111";
const observedAt = "2026-08-18T12:00:00.000Z";
const responseDigest = "a".repeat(64);

function must(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(`p78r3_${label}`);
}

function evidence(sourceText: string, overrides: Partial<Pass2572VerifiedStaticEvidence> = {}): Pass2572VerifiedStaticEvidence {
  return {
    contractAddress: address,
    chain: "ethereum",
    provider: "Etherscan V2",
    observedAt,
    responseDigest,
    sourceText,
    ...overrides,
  };
}

function run(sourceText: string, overrides: Partial<Pass2572VerifiedStaticEvidence> = {}) {
  return buildPass5002Erc2771MulticallSourceDetectorReport({
    locale: "en",
    chain: "ethereum",
    contractAddress: address,
    verifiedStaticEvidence: evidence(sourceText, overrides),
  });
}

const vulnerablePlain = `pragma solidity ^0.8.20;
abstract contract ERC2771Context {}
contract VulnerableMetaBatch is ERC2771Context {
  function _msgSender() internal view returns (address) { return msg.sender; }
  function multicall(bytes[] calldata payloads) external {
    for (uint256 i = 0; i < payloads.length; i++) {
      address(this).delegatecall(payloads[i]);
    }
  }
  function privileged() external { require(_msgSender() != address(0), "auth"); }
}`;

const fixedPlain = `pragma solidity ^0.8.20;
abstract contract ERC2771Context {}
contract FixedMetaBatch is ERC2771Context {
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

const proseLookalike = `pragma solidity ^0.8.20;
contract ProseOnly {
  // ERC2771Context _msgSender() bytes[] calldata payloads address(this).delegatecall(payloads[0]); require(_msgSender()!=address(0));
  string constant STORY = "ERC2771Context _msgSender address(this).delegatecall bytes[] calldata require";
  function ping() external pure returns (uint256) { return 1; }
}`;

const doubleBraceJson = `{{"language":"Solidity","sources":{"Meta.sol":{"content":${JSON.stringify(vulnerablePlain)}},"Helper.sol":{"content":"pragma solidity ^0.8.20; library Helper { function x() internal pure returns(uint){return 1;} }"}},"settings":{}}}`;

const rows: Array<{ id: string; result: Pass5002Erc2771MulticallSourceDetectorReport }> = [];

const vulnerable = run(vulnerablePlain);
must(vulnerable.state === "confirmed_source_pattern", `vulnerable_plain_state:${vulnerable.state}`);
must(vulnerable.signals.erc2771LogicalSenderContext, "vulnerable_plain_meta_signal");
must(vulnerable.signals.arbitrarySelfDelegatecallBatch, "vulnerable_plain_delegatecall_signal");
must(vulnerable.signals.authorizationUsesLogicalSender, "vulnerable_plain_auth_signal");
must(!vulnerable.signals.logicalSenderPreservedAcrossDelegatecall, "vulnerable_plain_no_preservation");
must(vulnerable.severityCandidate === "elevated", `vulnerable_plain_severity:${vulnerable.severityCandidate}`);
must(vulnerable.retest.required, "vulnerable_plain_retest_required");
must(vulnerable.blockers.includes("runtime_exploit_reproduction_not_executed"), "vulnerable_plain_runtime_blocker");
must(vulnerable.blockers.includes("deployed_runtime_bytecode_equivalence_not_proven"), "vulnerable_plain_bytecode_blocker");
must(vulnerable.evidenceRefs.length >= 2, "vulnerable_plain_evidence_refs");
must(!JSON.stringify(vulnerable).includes("function privileged()"), "vulnerable_report_no_raw_source_leak");
rows.push({ id: "minimal_vulnerable_plain", result: vulnerable });

const fixed = run(fixedPlain);
must(fixed.state === "mitigated_source_pattern", `fixed_plain_state:${fixed.state}`);
must(fixed.signals.logicalSenderPreservedAcrossDelegatecall, "fixed_plain_preservation_detected");
must(fixed.severityCandidate === null, "fixed_plain_no_severity");
must(!fixed.retest.required, "fixed_plain_no_retest_finding");
rows.push({ id: "minimal_fixed_sender_preserved", result: fixed });

const prose = run(proseLookalike);
must(prose.state === "not_detected", `prose_lookalike_state:${prose.state}`);
rows.push({ id: "comment_string_lookalike", result: prose });

const jsonWrapped = run(doubleBraceJson);
must(jsonWrapped.state === "confirmed_source_pattern", `double_brace_json_state:${jsonWrapped.state}`);
must(jsonWrapped.sourceUnitCount === 2, `double_brace_json_units:${jsonWrapped.sourceUnitCount}`);
rows.push({ id: "etherscan_double_brace_standard_json", result: jsonWrapped });

const tampered = run(vulnerablePlain, { contractAddress: "0x2222222222222222222222222222222222222222" });
must(tampered.state === "blocked", `tampered_identity_state:${tampered.state}`);
must(tampered.evidenceRefs.length === 0, "tampered_identity_no_evidence_refs");
rows.push({ id: "contract_identity_tamper", result: tampered });

const missing = buildPass5002Erc2771MulticallSourceDetectorReport({
  locale: "en",
  chain: "ethereum",
  contractAddress: address,
  verifiedStaticEvidence: { ...evidence(vulnerablePlain), sourceText: undefined },
});
must(missing.state === "blocked", `missing_source_state:${missing.state}`);
rows.push({ id: "missing_verified_source", result: missing });

const invalidAddress = buildPass5002Erc2771MulticallSourceDetectorReport({ locale: "en", chain: "ethereum", contractAddress: "bad", verifiedStaticEvidence: null });
must(invalidAddress.state === "not_applicable", `invalid_address_state:${invalidAddress.state}`);
rows.push({ id: "invalid_target_not_applicable", result: invalidAddress });

// Product-chain proof: source-pattern fact enters claim -> report with remediation/retest,
// but cannot silently become runtime exploitability or an adverse risk floor.
const claimLedger = buildPass2574AuditClaimLedgerReport({
  locale: "en",
  chain: "ethereum",
  contractAddress: address,
  sourcePatternEvidence: vulnerable,
});
const sourcePatternClaim = claimLedger.claims.find((claim) => claim.adverseKind === "source_pattern");
must(sourcePatternClaim, "claim_ledger_source_pattern_missing");
must(claimLedger.claims[0]?.id === sourcePatternClaim.id, "claim_ledger_source_pattern_not_first");
must(sourcePatternClaim.grade === "confirmed" && sourcePatternClaim.canShowAsFact, "claim_ledger_source_pattern_not_fact_safe");
must(sourcePatternClaim.adverseRiskFloor === undefined, "claim_ledger_source_pattern_risk_floor_present");
must(sourcePatternClaim.exploitabilityBoundary?.includes("runtime exploit reproduction"), "claim_ledger_exploitability_boundary_missing");
must((sourcePatternClaim.remediation?.length ?? 0) >= 2, "claim_ledger_remediation_missing");
must(sourcePatternClaim.retest?.required === true, "claim_ledger_retest_missing");

const assembled = buildPass2578AuditReportAssemblerReport({
  locale: "en",
  chain: "ethereum",
  contractAddress: address,
  claimLedger,
});
const finding = assembled.topFindings.find((item) => item.id === `finding-${sourcePatternClaim.id}`);
must(finding, "assembler_source_pattern_finding_missing");
must(finding.severity === "elevated", `assembler_source_pattern_severity:${finding.severity}`);
must(finding.title.includes("source pattern confirmed"), `assembler_source_pattern_title:${finding.title}`);
must(finding.exploitabilityBoundary?.includes("runtime exploit reproduction"), "assembler_exploitability_boundary_missing");
must((finding.remediation?.length ?? 0) >= 2, "assembler_remediation_missing");
must(finding.retest?.required === true, "assembler_retest_missing");
must(assembled.finalVerdict.riskScore === null, `source_pattern_illegally_promoted_risk_floor:${assembled.finalVerdict.riskScore}`);

const fixedClaimLedger = buildPass2574AuditClaimLedgerReport({ locale: "en", chain: "ethereum", contractAddress: address, sourcePatternEvidence: fixed });
must(!fixedClaimLedger.claims.some((claim) => claim.adverseKind === "source_pattern"), "mitigated_pattern_illegally_became_claim");

let thirdwebMatrix: Record<string, unknown> | null = null;
if (groundTruthDir) {
  const read = (name: string) => fs.readFileSync(path.join(groundTruthDir, name), "utf8");
  const vulnMulticall = read("vulnerable-Multicall.sol");
  const vulnFactory = read("vulnerable-TWFactory.sol");
  const fixedMulticall = read("fixed-Multicall.sol");
  const fixedFactory = read("fixed-TWFactory.sol");
  const asStandardJson = (sources: Record<string, string>) => JSON.stringify({
    language: "Solidity",
    sources: Object.fromEntries(Object.entries(sources).map(([name, content]) => [name, { content }])),
    settings: {},
  });
  const thirdwebVulnerable = run(asStandardJson({ "Multicall.sol": vulnMulticall, "TWFactory.sol": vulnFactory }));
  const thirdwebFixed = run(asStandardJson({ "Multicall.sol": fixedMulticall, "TWFactory.sol": fixedFactory }));
  must(thirdwebVulnerable.state === "confirmed_source_pattern", `thirdweb_vulnerable_state:${thirdwebVulnerable.state}`);
  must(thirdwebFixed.state !== "confirmed_source_pattern", `thirdweb_fixed_false_positive:${thirdwebFixed.state}`);
  must(thirdwebFixed.signals.logicalSenderPreservedAcrossDelegatecall, "thirdweb_fixed_preservation_not_detected");
  thirdwebMatrix = {
    vulnerable: { state: thirdwebVulnerable.state, confidence: thirdwebVulnerable.confidence, signals: thirdwebVulnerable.signals },
    fixed: { state: thirdwebFixed.state, confidence: thirdwebFixed.confidence, signals: thirdwebFixed.signals },
  };
}

const receipt = {
  schemaVersion: "velmere.p78r3.erc2771-multicall-runtime-controls.v1",
  status: "PASS",
  caseCount: rows.length,
  cases: rows.map(({ id, result }) => ({
    id,
    state: result.state,
    confidence: result.confidence,
    signals: result.signals,
    blockerCount: result.blockers.length,
    remediationCount: result.remediation.length,
    retestRequired: result.retest.required,
  })),
  productChain: {
    sourcePatternClaimFirst: true,
    structuredEvidenceRefs: sourcePatternClaim.evidenceRefs?.length ?? 0,
    structuredRemediation: sourcePatternClaim.remediation?.length ?? 0,
    structuredRetest: sourcePatternClaim.retest?.required === true,
    topFindingSeverity: finding.severity,
    riskFloorPromoted: assembled.finalVerdict.riskScore !== null,
  },
  thirdwebPinnedPair: thirdwebMatrix ?? "NOT_EXECUTED_NO_GROUNDTRUTH_DIR",
  zeroFakeCredit: {
    runtimeExploitability: 0,
    deployedBytecodeEquivalence: 0,
    formalDetectorAccuracy: "WITHHELD_DEVELOPMENT_AND_PINNED_PAIR_ONLY",
    customerFinal: "0/20",
    auditFinalPdf: "0/3",
    rights: "2/203",
    paidValue: "0/10",
    saleEligible: "0/20",
    live: false,
  },
  truthBoundary: "Runtime controls prove detector behavior on bounded development cases plus an exact pinned vulnerable/fixed source pair when supplied. They do not prove population accuracy, deployed runtime exploitability, customer FINAL, commercial readiness or LIVE.",
};
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "P78R3_ERC2771_MULTICALL_RUNTIME.json"), JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify(receipt, null, 2));
