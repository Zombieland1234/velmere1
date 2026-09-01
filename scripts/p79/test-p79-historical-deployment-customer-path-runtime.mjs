#!/usr/bin/env node
import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import process from "node:process";

import { canonicalJson } from "../../lib/security/canonical-json.ts";
import { sha256Digest } from "../../lib/security/cryptographic-digest.ts";

import {
  buildPass2572AuditProviderRuntimeReport,
  pass4824AuditProviderRuntimeClientDependencies,
  readPass2572AuditProviderPrivateStaticEvidence,
  resetPass4824AuditProviderRuntimeCacheForTests,
} from "../../lib/security/audit-provider-runtime-client.ts";
import { parseVerifiedSoliditySourceBundle } from "../../lib/security/verified-solidity-source-bundle.ts";
import { detectP78Erc2771MulticallContext } from "../../lib/security/erc2771-multicall-context-detector.ts";
import {
  extractP79Eip1167Implementation,
  getP79HistoricalDeploymentGroundTruthRecords,
  verifyP79HistoricalDeploymentGroundTruthRecord,
} from "../../lib/security/audit-historical-deployment-ground-truth.ts";
import {
  buildP79HistoricalDeploymentContextAdjudication,
  verifyP79HistoricalDeploymentContextAdjudication,
} from "../../lib/security/audit-deployment-context-adjudicator.ts";
import { buildPass2574AuditClaimLedgerReport } from "../../lib/security/audit-claim-ledger.ts";
import { buildPass2575AuditSourceFreshnessReport } from "../../lib/security/audit-source-freshness.ts";
import { buildPass2576AuditPermissionParserReport } from "../../lib/security/audit-permission-parser.ts";
import { buildPass2577AuditLiquidityHolderLockRiskReport } from "../../lib/security/audit-liquidity-holder-lock-risk.ts";
import { buildPass2578AuditReportAssemblerReport } from "../../lib/security/audit-report-assembler.ts";
import { projectAuditReportForCustomer } from "../../lib/security/audit-report-customer-projection.ts";
import { buildProAuditPdfSnapshot } from "../../lib/security/pro-audit-pdf/render-pro-audit-pdf.ts";
import { isCustomerSafeProAuditPdfLine } from "../../lib/security/pro-audit-pdf/customer-safe-renderer.ts";

const TARGET = "0x0dabdc92af35615443412a336344c591faed3f90";
const IMPLEMENTATION = "0xae5be6d490c47c7417e91b7911d3a0ce3553438d";
const FORWARDER = "0x7c4717039b89d5859c4fbb85edb19a6e2ce61171";
const ATTACK_TX = "0x1ee617cd739b1afcc673a180e60b9a32ad3ba856226a68e8748d58fcccc877a8";
const RUNTIME = "0x363d3d373d3d3d363d73ae5be6d490c47c7417e91b7911d3a0ce3553438d5af43d82803e903d91602b57fd5bf300";
const SOURCE_MARKER = "P79_PRIVATE_DOMINOTT_SOURCE_27fda443";
const ABI_MARKER = "p79PrivateDominoAbi27fda443";

const tokenSource = `// ${SOURCE_MARKER}\npragma solidity ^0.8.12;\ncontract TokenERC20 is ERC2771ContextUpgradeable, Multicall {\n  function initialize(address[] memory trustedForwarders) external { __ERC2771Context_init(trustedForwarders); }\n  function burn(uint256 amount) external { amount; }\n}`;
const multicallSource = `pragma solidity ^0.8.12;\ncontract Multicall {\n  function multicall(bytes[] calldata data) external returns (bytes[] memory results) {\n    results = new bytes[](data.length);\n    for (uint256 i = 0; i < data.length; i++) {\n      (bool success, bytes memory result) = address(this).delegatecall(data[i]);\n      require(success); results[i] = result;\n    }\n  }\n}`;
const erc2771Source = `pragma solidity ^0.8.12;\nabstract contract ERC2771ContextUpgradeable {\n  mapping(address => bool) private _trustedForwarder;\n  function __ERC2771Context_init(address[] memory trustedForwarders) internal { for (uint256 i=0;i<trustedForwarders.length;i++) _trustedForwarder[trustedForwarders[i]]=true; }\n  function isTrustedForwarder(address forwarder) public view returns (bool) { return _trustedForwarder[forwarder]; }\n}`;
const sourceText = JSON.stringify({
  language: "Solidity",
  sources: {
    "contracts/TokenERC20.sol": { content: tokenSource },
    "contracts/Multicall.sol": { content: multicallSource },
    "contracts/ERC2771ContextUpgradeable.sol": { content: erc2771Source },
  },
  settings: { optimizer: { enabled: true, runs: 20 } },
});
const abiText = JSON.stringify([
  { type: "function", name: "burn", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "multicall", stateMutability: "nonpayable", inputs: [{ name: "data", type: "bytes[]" }], outputs: [{ name: "results", type: "bytes[]" }] },
  { type: "function", name: ABI_MARKER, stateMutability: "view", inputs: [], outputs: [] },
]);

const checks = [];
function check(id, condition, detail = undefined) {
  checks.push({ id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) });
  if (!condition) process.exitCode = 1;
}
function jsonResponse(value) {
  return new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json; charset=utf-8" } });
}

const originalFetch = pass4824AuditProviderRuntimeClientDependencies.brokeredEgressFetch;
const originalKey = process.env.ETHERSCAN_API_KEY;
process.env.ETHERSCAN_API_KEY = "p79-runtime-test-key";
resetPass4824AuditProviderRuntimeCacheForTests();

pass4824AuditProviderRuntimeClientDependencies.brokeredEgressFetch = async (input) => {
  const url = new URL(String(input));
  if (url.hostname === "api.etherscan.io") {
    if (url.searchParams.get("action") === "getcontractcreation") {
      return jsonResponse({ status: "1", result: [{ contractAddress: TARGET, contractCreator: "0x835b45d38cbdccf99e609436ff38e31ac05bc502" }] });
    }
    return jsonResponse({
      status: "1",
      result: [{
        SourceCode: sourceText,
        ABI: abiText,
        ContractName: "TokenERC20",
        CompilerVersion: "v0.8.12+commit.f00d7308",
        OptimizationUsed: "1",
        Runs: "20",
        Proxy: "0",
        Implementation: "",
      }],
    });
  }
  if (url.hostname === "api.dexscreener.com") return jsonResponse({ pairs: [] });
  if (url.hostname === "api.gopluslabs.io") return jsonResponse({ result: { [TARGET]: {} } });
  if (url.hostname === "api.honeypot.is") return jsonResponse({ token: { address: TARGET }, summary: {}, simulationResult: { tokenAddress: TARGET }, honeypotResult: { isHoneypot: false } });
  if (url.hostname === "api.coingecko.com") return jsonResponse({ coins: [] });
  throw new Error(`unexpected_provider:${url.hostname}`);
};

try {
  const records = getP79HistoricalDeploymentGroundTruthRecords();
  const record = records[0];
  check("p79_registry_exactly_one_record", records.length === 1, records.length);
  check("p79_registry_record_integrity", verifyP79HistoricalDeploymentGroundTruthRecord(record));
  check("p79_registry_exact_target", record.incident.targetAddress === TARGET);
  check("p79_registry_exact_snapshot_block", record.incident.snapshotBlock === 34_141_659);
  check("p79_registry_exact_attack_block", record.incident.attackBlock === 34_141_660);
  check("p79_registry_exact_attack_tx", record.incident.attackTransaction === ATTACK_TX);
  check("p79_registry_exact_forwarder", record.incident.trustedForwarderAddress === FORWARDER);
  check("p79_registry_runtime_digest_bound", /^sha256:[a-f0-9]{64}$/.test(record.deployment.runtimeBytecodeDigest));
  check("p79_registry_runtime_extracts_implementation", extractP79Eip1167Implementation(RUNTIME) === IMPLEMENTATION);
  check("p79_registry_rejects_non_proxy_runtime", extractP79Eip1167Implementation("0x60006000") === null);
  check("p79_registry_upstream_replay_pass", record.replay.result === "PINNED_UPSTREAM_REPLAY_PASS");
  check("p79_registry_no_fake_independent_replay", record.replay.independentVelmereReplay === false);
  check("p79_registry_eight_pinned_anchors", record.anchors.length === 8, record.anchors.length);
  check("p79_registry_four_source_corpus_anchors", record.anchors.filter((anchor) => anchor.kind === "verified_source_component" || anchor.kind === "verified_source_metadata").length === 4);
  check("p79_registry_source_corpus_exact_blobs", [
    "3deb32daa01207e8883aa7ddab85bd0a81952758",
    "0a12f986ce8bbba57b655889f3f049729b47b764",
    "d0d8039614eb6b48ca2a20dac78823bbb17977d5",
    "bbdde89e3d4267717502c9e6e4b419ddcbd89bd3",
  ].every((sha) => record.anchors.some((anchor) => anchor.blobSha === sha)));
  check("p79_registry_no_fake_compile_to_runtime_binding", record.verifiedSourceMetadata.exactCompilationToRuntimeProven === false);
  check("p79_registry_metadata_only_rights", record.rightsBoundary.mode === "DERIVED_METADATA_AND_PINNED_REFERENCES_ONLY");
  check("p79_registry_no_raw_packaging", record.rightsBoundary.rawSourceTraceStatePackaged === false);
  check("p79_registry_current_state_withheld", record.currentnessBoundary.currentExploitabilityProven === false);
  const tamperedRecord = structuredClone(record);
  tamperedRecord.incident.attackBlock += 1;
  check("p79_registry_tamper_fails_closed", !verifyP79HistoricalDeploymentGroundTruthRecord(tamperedRecord));
  const reSignedAnchorTamper = structuredClone(record);
  reSignedAnchorTamper.anchors[0].blobSha = "1111111111111111111111111111111111111111";
  const { recordDigest: _oldRecordDigest, ...reSignedUnsigned } = reSignedAnchorTamper;
  reSignedAnchorTamper.recordDigest = sha256Digest(canonicalJson(reSignedUnsigned));
  check("p79_registry_resigned_anchor_tamper_rejected", !verifyP79HistoricalDeploymentGroundTruthRecord(reSignedAnchorTamper));
  check("p79_registry_malformed_record_rejected_without_throw", !verifyP79HistoricalDeploymentGroundTruthRecord({ schemaVersion: "p79-historical-deployment-ground-truth.v1" }));
  const mutableCopy = getP79HistoricalDeploymentGroundTruthRecords()[0];
  mutableCopy.incident.attackBlock = 1;
  check("p79_registry_returns_isolated_copies", getP79HistoricalDeploymentGroundTruthRecords()[0].incident.attackBlock === 34_141_660);

  const providerRuntime = await buildPass2572AuditProviderRuntimeReport({
    chain: "bsc",
    contractAddress: TARGET,
    projectName: "DominoTT historical target",
    locale: "en",
  });
  const explorer = providerRuntime.lanes.find((lane) => lane.id === "runtime-explorer-source");
  const privateEvidence = readPass2572AuditProviderPrivateStaticEvidence(providerRuntime);
  const bundle = parseVerifiedSoliditySourceBundle(privateEvidence?.sourceText);
  const detector = detectP78Erc2771MulticallContext(bundle.files);
  check("p79_provider_explorer_confirmed", explorer?.state === "confirmed");
  check("p79_provider_exact_target_identity", explorer?.identity?.matched === true && explorer?.identity?.resolvedChainId === "56");
  check("p79_private_source_recovered", privateEvidence?.sourceText === sourceText);
  check("p79_source_bundle_valid", bundle.valid === true && bundle.complete === true);
  check("p79_source_bundle_standard_json", bundle.format === "standard-json", bundle.format);
  check("p79_detector_source_risk_signal", detector.classification === "SOURCE_PATTERN_RISK_SIGNAL", detector.classification);
  check("p79_detector_still_cannot_final", detector.customerFinalEligibleFromDetector === false && detector.exploitabilityProven === false);

  const adjudication = buildP79HistoricalDeploymentContextAdjudication({
    chain: "bsc",
    contractAddress: TARGET,
    sourceContextIntegrity: detector,
  });
  check("p79_adjudication_integrity", verifyP79HistoricalDeploymentContextAdjudication(adjudication));
  check("p79_adjudication_classification", adjudication.classification === "HISTORICAL_DEPLOYMENT_BOUND_UPSTREAM_REPLAY", adjudication.classification);
  check("p79_adjudication_source_bound", adjudication.sourceBinding.sourceRiskSignalBound === true);
  check("p79_adjudication_exact_detector_bound", adjudication.sourceBinding.detectorId === "p78-erc2771-multicall-context-detector.v1");
  check("p79_adjudication_requires_complete_source_evidence", adjudication.sourceBinding.evidenceRefCount >= 3 && adjudication.sourceBinding.compositionContractCount >= 1 && adjudication.sourceBinding.trustedForwarderConfigurationObserved === true);
  check("p79_adjudication_exact_proxy_kind", adjudication.deploymentBinding?.proxyKind === "EIP_1167_COMPATIBLE_MINIMAL_PROXY");
  check("p79_adjudication_record_digest_bound", adjudication.deploymentBinding?.recordDigest === record.recordDigest);
  check("p79_adjudication_source_corpus_anchor_count_bound", adjudication.deploymentBinding?.pinnedSourceCorpusAnchorCount === 4);
  check("p79_adjudication_compile_to_runtime_withheld", adjudication.deploymentBinding?.exactCompilationToRuntimeProven === false);
  check("p79_adjudication_exact_implementation", adjudication.deploymentBinding?.implementationAddress === IMPLEMENTATION);
  check("p79_adjudication_exact_snapshot", adjudication.deploymentBinding?.snapshotBlock === 34_141_659);
  check("p79_adjudication_exact_attack_tx", adjudication.deploymentBinding?.attackTransaction === ATTACK_TX);
  check("p79_adjudication_forwarder_active_in_trace", adjudication.trustedForwarder?.state === "ACTIVE_AT_SNAPSHOT_FROM_PINNED_EXECUTION_TRACE");
  check("p79_adjudication_upstream_replay_true", adjudication.replay.upstreamReplayProven === true);
  check("p79_adjudication_independent_replay_false", adjudication.replay.independentVelmereReplayProven === false);
  check("p79_adjudication_historical_fact_eligible", adjudication.historicalFinding.factEligible === true);
  check("p79_adjudication_historical_severity_critical", adjudication.historicalFinding.severity === "critical");
  check("p79_adjudication_current_exploitability_false", adjudication.currentness.currentExploitabilityProven === false);
  check("p79_adjudication_customer_final_false", adjudication.customerFinalEligible === false);
  check("p79_adjudication_pdf_final_false", adjudication.auditFinalPdfEligible === false);
  check("p79_adjudication_no_raw_runtime", !("runtimeBytecode" in (adjudication.deploymentBinding ?? {})));
  check("p79_adjudication_no_raw_source", !JSON.stringify(adjudication).includes(SOURCE_MARKER));

  const wrongDetector = structuredClone(detector);
  wrongDetector.detectorId = "forged-detector.v1";
  const wrongDetectorAdjudication = buildP79HistoricalDeploymentContextAdjudication({ chain: "bsc", contractAddress: TARGET, sourceContextIntegrity: wrongDetector });
  check("p79_wrong_detector_cannot_bind", wrongDetectorAdjudication.classification === "BLOCKED_SOURCE_NOT_BOUND");
  const incompleteDetector = structuredClone(detector);
  incompleteDetector.evidence = incompleteDetector.evidence.filter((item) => item.kind !== "multicall");
  const incompleteAdjudication = buildP79HistoricalDeploymentContextAdjudication({ chain: "bsc", contractAddress: TARGET, sourceContextIntegrity: incompleteDetector });
  check("p79_incomplete_source_evidence_cannot_bind", incompleteAdjudication.classification === "BLOCKED_SOURCE_NOT_BOUND");

  const noSource = buildP79HistoricalDeploymentContextAdjudication({ chain: "bsc", contractAddress: TARGET, sourceContextIntegrity: null });
  check("p79_no_source_blocks_binding", noSource.classification === "BLOCKED_SOURCE_NOT_BOUND");
  check("p79_no_source_not_fact_eligible", noSource.historicalFinding.factEligible === false);
  check("p79_no_source_integrity_valid", verifyP79HistoricalDeploymentContextAdjudication(noSource));
  const wrongTarget = buildP79HistoricalDeploymentContextAdjudication({ chain: "bsc", contractAddress: "0x1111111111111111111111111111111111111111", sourceContextIntegrity: detector });
  check("p79_wrong_target_not_applicable", wrongTarget.classification === "NOT_APPLICABLE");
  const wrongChain = buildP79HistoricalDeploymentContextAdjudication({ chain: "ethereum", contractAddress: TARGET, sourceContextIntegrity: detector });
  check("p79_wrong_chain_not_applicable", wrongChain.classification === "NOT_APPLICABLE");
  const tamperedAdjudication = structuredClone(adjudication);
  tamperedAdjudication.replay.independentVelmereReplayProven = true;
  check("p79_forged_independent_replay_rejected", !verifyP79HistoricalDeploymentContextAdjudication(tamperedAdjudication));
  const forgedCurrent = structuredClone(adjudication);
  forgedCurrent.currentness.currentExploitabilityProven = true;
  check("p79_forged_current_exploitability_rejected", !verifyP79HistoricalDeploymentContextAdjudication(forgedCurrent));
  const forgedFinal = structuredClone(adjudication);
  forgedFinal.customerFinalEligible = true;
  check("p79_forged_customer_final_rejected", !verifyP79HistoricalDeploymentContextAdjudication(forgedFinal));
  const digestTamper = structuredClone(adjudication);
  digestTamper.confidence = 100;
  check("p79_adjudication_digest_tamper_rejected", !verifyP79HistoricalDeploymentContextAdjudication(digestTamper));
  const reSignedDetectorTamper = structuredClone(adjudication);
  reSignedDetectorTamper.sourceBinding.detectorId = "forged-detector.v1";
  const { adjudicationDigest: _oldAdjudicationDigest, ...reSignedDetectorUnsigned } = reSignedDetectorTamper;
  reSignedDetectorTamper.adjudicationDigest = sha256Digest(canonicalJson(reSignedDetectorUnsigned));
  check("p79_adjudication_resigned_detector_tamper_rejected", !verifyP79HistoricalDeploymentContextAdjudication(reSignedDetectorTamper));
  const reSignedEvidenceTamper = structuredClone(adjudication);
  reSignedEvidenceTamper.evidenceRefs[0] = "state_snapshot:forged/repo@1111111111111111111111111111111111111111:1111111111111111111111111111111111111111";
  const { adjudicationDigest: _oldEvidenceDigest, ...reSignedEvidenceUnsigned } = reSignedEvidenceTamper;
  reSignedEvidenceTamper.adjudicationDigest = sha256Digest(canonicalJson(reSignedEvidenceUnsigned));
  check("p79_adjudication_resigned_evidence_tamper_rejected", !verifyP79HistoricalDeploymentContextAdjudication(reSignedEvidenceTamper));
  check("p79_adjudication_malformed_rejected_without_throw", !verifyP79HistoricalDeploymentContextAdjudication({ adjudicatorId: "p79-deployment-context-adjudicator.v1" }));

  const claimLedger = buildPass2574AuditClaimLedgerReport({
    chain: "bsc",
    contractAddress: TARGET,
    locale: "en",
    providerRuntime,
    sourceContextIntegrity: detector,
    deploymentContextEvidence: adjudication,
  });
  const historicalClaim = claimLedger.claims.find((claim) => claim.adverseKind === "historical_exploit");
  check("p79_claim_ledger_historical_claim_present", Boolean(historicalClaim));
  check("p79_claim_ledger_historical_claim_confirmed", historicalClaim?.grade === "confirmed");
  check("p79_claim_ledger_historical_fact_safe", historicalClaim?.canShowAsFact === true);
  check("p79_claim_ledger_historical_critical", historicalClaim?.adverseSeverity === "critical");
  check("p79_claim_ledger_historical_has_no_current_risk_floor", historicalClaim?.adverseRiskFloor === undefined);
  check("p79_claim_ledger_current_exploitability_not_overclaimed", /does not prove current exploitability/i.test(historicalClaim?.customerLine ?? ""));

  const sourceFreshness = buildPass2575AuditSourceFreshnessReport({ chain: "bsc", contractAddress: TARGET, locale: "en", providerRuntime, claimLedger });
  const permissionParser = buildPass2576AuditPermissionParserReport({ chain: "bsc", contractAddress: TARGET, locale: "en", providerRuntime, claimLedger, sourceFreshness });
  const liquidityHolderRisk = buildPass2577AuditLiquidityHolderLockRiskReport({ chain: "bsc", contractAddress: TARGET, locale: "en", providerRuntime, claimLedger, sourceFreshness, permissionParser });
  const assembler = buildPass2578AuditReportAssemblerReport({ chain: "bsc", contractAddress: TARGET, locale: "en", providerRuntime, claimLedger, sourceFreshness, permissionParser, liquidityHolderRisk });
  const historicalFinding = assembler.topFindings.find((finding) => finding.sourceFamily === "historical-deployment:upstream-replay");
  check("p79_assembler_historical_finding_present", Boolean(historicalFinding));
  check("p79_assembler_historical_finding_critical", historicalFinding?.severity === "critical");
  check("p79_assembler_does_not_turn_history_into_current_risk", assembler.finalVerdict.riskScore === null, assembler.finalVerdict.riskScore);
  check("p79_assembler_pdf_line_contains_exact_block", assembler.proPdfLines.some((line) => line.includes("snapshotBlock=34141659")));

  const projection = projectAuditReportForCustomer({ report: assembler, requestedTier: "pro", deliveredTier: "pro", manualReviewVerified: false });
  const projectedHistorical = projection.report.topFindings.find((finding) => finding.sourceFamily === "historical-deployment:upstream-replay");
  check("p79_projection_preserves_historical_finding", Boolean(projectedHistorical));
  check("p79_projection_preserves_historical_boundary", /does not prove current exploitability/i.test(projectedHistorical?.publicLine ?? ""));

  const pdfSnapshot = await buildProAuditPdfSnapshot({ requestId: "P79-DOMINOTT-PDF-RUNTIME", target: TARGET, chain: "bsc", locale: "en", tier: "basic" });
  check("p79_pdf_snapshot_contains_historical_finding", pdfSnapshot.lines.some((line) => /Historical deployment-bound exploit/.test(line)));
  check("p79_pdf_snapshot_contains_exact_attack_tx", pdfSnapshot.lines.some((line) => line.includes(ATTACK_TX)));
  check("p79_pdf_snapshot_contains_currentness_boundary", pdfSnapshot.lines.some((line) => /currentExploitabilityProven=false|does not prove current exploitability/i.test(line)));
  check("p79_pdf_snapshot_risk_not_promoted", pdfSnapshot.verdict.riskScore === null, pdfSnapshot.verdict.riskScore);
  check("p79_pdf_snapshot_not_final_ready", pdfSnapshot.evidenceReadiness.proReady === false && pdfSnapshot.evidenceReadiness.advancedReady === false);
  check("p79_pdf_safety_accepts_closed_historical_chain_row", isCustomerSafeProAuditPdfLine(adjudication.historicalFinding.proPdfLine ?? ""));
  check("p79_pdf_safety_accepts_public_target_row", isCustomerSafeProAuditPdfLine(`Target: ${TARGET}`));
  check("p79_pdf_safety_rejects_generic_wallet_row", !isCustomerSafeProAuditPdfLine(`Owner wallet: ${TARGET}`));
  check("p79_pdf_safety_rejects_freeform_transaction_row", !isCustomerSafeProAuditPdfLine(`Attack transaction ${ATTACK_TX}`));
  check("p79_pdf_safety_rejects_truncated_historical_row", !isCustomerSafeProAuditPdfLine(`historicalDeployment=${TARGET}; attackTx=${ATTACK_TX}`));
  check("p79_pdf_safety_rejects_email", !isCustomerSafeProAuditPdfLine("Customer owner@example.com"));

  const publicObjects = { providerRuntime, adjudication, claimLedger, permissionParser, assembler, projection, pdfSnapshot };
  const publicJson = JSON.stringify(publicObjects);
  check("p79_public_path_excludes_exact_source", !publicJson.includes(sourceText) && !publicJson.includes(SOURCE_MARKER));
  check("p79_public_path_excludes_exact_abi", !publicJson.includes(abiText) && !publicJson.includes(ABI_MARKER));
  check("p79_public_path_excludes_raw_runtime", !publicJson.includes(RUNTIME));
  check("p79_public_path_excludes_raw_trace", !publicJson.includes("PRECOMPILES::ecrecover") && !publicJson.includes("storage changes:"));

  const failed = checks.filter((item) => item.status === "FAIL");
  const receipt = {
    schemaVersion: "velmere.p79.historical-deployment-customer-path-runtime.v1",
    generatedAt: new Date().toISOString(),
    status: failed.length ? "FAIL" : "PASS",
    runtime: { node: process.version, platform: process.platform, arch: process.arch, exactWindowsCredit: false },
    historicalTarget: {
      chain: "bsc",
      chainId: "56",
      contractAddress: TARGET,
      implementationAddress: IMPLEMENTATION,
      trustedForwarder: FORWARDER,
      snapshotBlock: 34_141_659,
      attackBlock: 34_141_660,
      attackTransaction: ATTACK_TX,
    },
    groundTruth: {
      recordId: record.recordId,
      recordDigest: record.recordDigest,
      anchorCount: record.anchors.length,
      replayClass: record.replay.result,
      independentVelmereReplay: record.replay.independentVelmereReplay,
      metadataOnly: true,
    },
    adjudication: {
      classification: adjudication.classification,
      confidence: adjudication.confidence,
      historicalFactEligible: adjudication.historicalFinding.factEligible,
      currentExploitabilityProven: adjudication.currentness.currentExploitabilityProven,
      customerFinalEligible: adjudication.customerFinalEligible,
      auditFinalPdfEligible: adjudication.auditFinalPdfEligible,
      digest: adjudication.adjudicationDigest,
    },
    customerPath: {
      historicalClaimId: historicalClaim?.id ?? null,
      historicalFindingId: historicalFinding?.id ?? null,
      projected: Boolean(projectedHistorical),
      pdfSnapshotBound: pdfSnapshot.lines.some((line) => /Historical deployment-bound exploit/.test(line)),
      currentRiskScore: assembler.finalVerdict.riskScore,
      rawSourceExposed: publicJson.includes(sourceText) || publicJson.includes(SOURCE_MARKER),
      rawAbiExposed: publicJson.includes(abiText) || publicJson.includes(ABI_MARKER),
      rawRuntimeExposed: publicJson.includes(RUNTIME),
      publicPayloadSha256: crypto.createHash("sha256").update(publicJson).digest("hex"),
    },
    checks: { total: checks.length, passed: checks.length - failed.length, failed: failed.length, rows: checks },
    zeroFakeCredit: {
      customerFinal: "0/20",
      auditFinalPdf: "0/3",
      exactWindows: "WITHHELD",
      independentVelmereReplay: "WITHHELD",
      currentRpcQuorum: "WITHHELD",
      currentExploitability: "WITHHELD",
      rightsCurrentness: "WITHHELD_FOR_FINAL",
      note: "This runtime binds a real historical deployment, exact snapshot, proxy implementation, trusted-forwarder execution path and pinned upstream replay into the customer report and PDF snapshot. It does not claim current exploitability, independent Velmere replay, exact Windows or Customer/PDF FINAL.",
    },
  };
  await mkdir("receipts/p79", { recursive: true });
  await writeFile("receipts/p79/P79_HISTORICAL_DEPLOYMENT_CUSTOMER_PATH_RUNTIME.json", `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ status: receipt.status, checkCount: checks.length, failed: failed.map((item) => item.id), classification: adjudication.classification, customerFinal: "0/20", auditFinalPdf: "0/3" }, null, 2));
} finally {
  pass4824AuditProviderRuntimeClientDependencies.brokeredEgressFetch = originalFetch;
  if (originalKey === undefined) delete process.env.ETHERSCAN_API_KEY;
  else process.env.ETHERSCAN_API_KEY = originalKey;
  resetPass4824AuditProviderRuntimeCacheForTests();
}
