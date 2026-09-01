#!/usr/bin/env node
import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import {
  buildPass2572AuditProviderRuntimeReport,
  pass4824AuditProviderRuntimeClientDependencies,
  readPass2572AuditProviderPrivateStaticEvidence,
  resetPass4824AuditProviderRuntimeCacheForTests,
} from "../../lib/security/audit-provider-runtime-client.ts";
import { buildPass2574AuditClaimLedgerReport } from "../../lib/security/audit-claim-ledger.ts";
import { buildPass2576AuditPermissionParserReport } from "../../lib/security/audit-permission-parser.ts";
import { buildPass2578AuditReportAssemblerReport } from "../../lib/security/audit-report-assembler.ts";
import { projectAuditReportForCustomer } from "../../lib/security/audit-report-customer-projection.ts";
import { buildPass2583ContractSourceAbiExtractionReport } from "../../lib/security/contract-source-abi-extraction.ts";
import { detectP78Erc2771MulticallContext } from "../../lib/security/erc2771-multicall-context-detector.ts";
import { parseVerifiedSoliditySourceBundle } from "../../lib/security/verified-solidity-source-bundle.ts";

const checks = [];
function check(id, condition, detail = undefined) {
  checks.push({ id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) });
  if (!condition) process.exitCode = 1;
}
function jsonResponse(value) {
  return new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json; charset=utf-8" } });
}

const address = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const sourceMarker = "P78_STANDARD_JSON_PRIVATE_SOURCE_SENTINEL_7b14dd40";
const abiMarker = "p78StandardJsonPrivateAbiSentinel7b14dd40";
const sources = {
  "contracts/AuditTarget.sol": {
    content: `// ${sourceMarker}\npragma solidity ^0.8.20;\nimport "./Multicall.sol";\nimport "./ERC2771ContextUpgradeable.sol";\ncontract AuditTarget is ERC2771ContextUpgradeable, Multicall {\n  bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;\n  function initialize(address[] memory _trustedForwarders) external { __ERC2771Context_init(_trustedForwarders); }\n  function mint(address to, uint256 amount) external { to; amount; }\n}`,
  },
  "contracts/Multicall.sol": {
    content: `pragma solidity ^0.8.20;\nlibrary TWAddress { function functionDelegateCall(address target, bytes memory data) internal returns (bytes memory) { (bool ok, bytes memory out) = target.delegatecall(data); require(ok); return out; } }\ncontract Multicall { function multicall(bytes[] calldata data) external returns (bytes[] memory results) { results = new bytes[](data.length); for (uint256 i = 0; i < data.length; i++) { results[i] = TWAddress.functionDelegateCall(address(this), data[i]); } } }`,
  },
  "contracts/ERC2771ContextUpgradeable.sol": {
    content: `pragma solidity ^0.8.20;\nabstract contract ERC2771ContextUpgradeable { mapping(address => bool) private _trustedForwarder; function __ERC2771Context_init(address[] memory forwarders) internal { for (uint256 i=0; i<forwarders.length; i++) _trustedForwarder[forwarders[i]] = true; } function isTrustedForwarder(address forwarder) public view returns (bool) { return _trustedForwarder[forwarder]; } }`,
  },
};
const sourceText = JSON.stringify({ language: "Solidity", sources, settings: { optimizer: { enabled: true, runs: 200 } } });
const abiText = JSON.stringify([
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ type: "address", name: "to" }, { type: "uint256", name: "amount" }], outputs: [] },
  { type: "function", name: "multicall", stateMutability: "nonpayable", inputs: [{ type: "bytes[]", name: "data" }], outputs: [{ type: "bytes[]", name: "results" }] },
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address", name: "" }], "x-private-marker": abiMarker },
]);

const originalFetch = pass4824AuditProviderRuntimeClientDependencies.brokeredEgressFetch;
const originalKey = process.env.ETHERSCAN_API_KEY;
process.env.ETHERSCAN_API_KEY = "p78-standard-json-runtime-test-key";
resetPass4824AuditProviderRuntimeCacheForTests();

pass4824AuditProviderRuntimeClientDependencies.brokeredEgressFetch = async (input) => {
  const url = new URL(String(input));
  if (url.hostname === "api.etherscan.io") {
    if (url.searchParams.get("action") === "getcontractcreation") {
      return jsonResponse({ status: "1", result: [{ contractAddress: address, contractCreator: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" }] });
    }
    return jsonResponse({ status: "1", result: [{ SourceCode: sourceText, ABI: abiText, ContractName: "AuditTarget", CompilerVersion: "v0.8.20+commit.test", Proxy: "0", Implementation: "" }] });
  }
  if (url.hostname === "api.dexscreener.com") return jsonResponse({ pairs: [] });
  if (url.hostname === "api.gopluslabs.io") return jsonResponse({ result: { [address]: {} } });
  if (url.hostname === "api.honeypot.is") return jsonResponse({ token: { address }, summary: {}, simulationResult: { tokenAddress: address }, honeypotResult: { isHoneypot: false } });
  if (url.hostname === "api.coingecko.com") return jsonResponse({ coins: [] });
  throw new Error(`unexpected_provider:${url.hostname}`);
};

try {
  const providerRuntime = await buildPass2572AuditProviderRuntimeReport({ chain: "ethereum", contractAddress: address, projectName: "P78 Standard JSON Target", locale: "en" });
  const explorer = providerRuntime.lanes.find((lane) => lane.id === "runtime-explorer-source");
  const privateEvidence = readPass2572AuditProviderPrivateStaticEvidence(providerRuntime);
  const bundle = parseVerifiedSoliditySourceBundle(privateEvidence?.sourceText);
  const doubleBraceBundle = parseVerifiedSoliditySourceBundle(`{${sourceText}}`);
  const detector = detectP78Erc2771MulticallContext(bundle.files);

  check("p78_stdjson_provider_confirmed", explorer?.state === "confirmed");
  check("p78_stdjson_provider_exact_identity", explorer?.identity?.verification === "exact_response" && explorer?.identity?.matched === true);
  check("p78_stdjson_private_source_exact", privateEvidence?.sourceText === sourceText);
  check("p78_stdjson_bundle_valid", bundle.valid === true && bundle.complete === true);
  check("p78_stdjson_bundle_format", bundle.format === "standard-json", bundle.format);
  check("p78_stdjson_bundle_file_count", bundle.fileCount === 3, bundle.fileCount);
  check("p78_stdjson_double_brace_supported", doubleBraceBundle.valid === true && doubleBraceBundle.format === "etherscan-double-brace-json", doubleBraceBundle.format);
  check("p78_stdjson_detector_risk_signal", detector.classification === "SOURCE_PATTERN_RISK_SIGNAL", detector.classification);
  check("p78_stdjson_detector_runtime_not_proven", detector.exploitabilityProven === false && detector.trustedForwarderRuntimeState === "UNKNOWN_RUNTIME_NOT_PROVEN");
  check("p78_stdjson_detector_cannot_final", detector.customerFinalEligibleFromDetector === false);

  const claimLedger = buildPass2574AuditClaimLedgerReport({
    chain: "ethereum",
    contractAddress: address,
    locale: "en",
    providerRuntime,
    sourceContextIntegrity: detector,
  });
  const sourceClaim = claimLedger.claims.find((claim) => claim.id === "p78-erc2771-multicall-context-source-signal");
  check("p78_stdjson_claim_ledger_receives_detector", Boolean(sourceClaim));
  check("p78_stdjson_claim_is_partial", sourceClaim?.grade === "partial", sourceClaim?.grade);
  check("p78_stdjson_claim_not_fact_safe", sourceClaim?.canShowAsFact === false);
  check("p78_stdjson_claim_no_risk_floor", sourceClaim?.adverseRiskFloor === undefined);
  check("p78_stdjson_claim_exploitability_not_overclaimed", /not proven|not proof/i.test(`${sourceClaim?.claim} ${sourceClaim?.customerLine}`));

  const permissionParser = buildPass2576AuditPermissionParserReport({ chain: "ethereum", contractAddress: address, locale: "en", providerRuntime, claimLedger });
  const contextSignal = permissionParser.signals.find((signal) => signal.id === "erc2771-multicall-context-integrity");
  check("p78_stdjson_permission_context_signal", contextSignal?.state === "detected");
  check("p78_stdjson_permission_context_severity_bounded", contextSignal?.severity === "elevated", contextSignal?.severity);
  check("p78_stdjson_permission_missing_runtime_proof", contextSignal?.missing.some((item) => /trusted-forwarder runtime state/i.test(item)) === true);
  check("p78_stdjson_permission_source_complete", contextSignal?.proPdfLine.includes("sourceComplete=true") === true);
  check("p78_stdjson_permission_no_raw_evidence", !JSON.stringify(contextSignal?.evidence ?? []).includes(sourceMarker) && !(contextSignal?.evidence ?? []).some((item) => /contract\s|delegatecall|pragma/i.test(item)));
  check("p78_stdjson_advanced_not_manual_entitlement", !/must manually|musi ręcznie|muss manuell/i.test(permissionParser.advancedRule));

  const extraction = buildPass2583ContractSourceAbiExtractionReport({ chain: "ethereum", contractAddress: address, locale: "en", providerRuntime, permissionParser });
  check("p78_stdjson_extraction_verified", extraction.sourceGate.verified === true);
  check("p78_stdjson_extraction_functions_present", extraction.summary.totalFunctions >= 2, extraction.summary.totalFunctions);
  check("p78_stdjson_extraction_mint_present", extraction.functionSurfaces.some((item) => item.name === "mint"));
  check("p78_stdjson_extraction_multicall_present", extraction.functionSurfaces.some((item) => item.name === "multicall"));
  check("p78_stdjson_extraction_cannot_final_sign", extraction.summary.canFinalSignFromStaticExtraction === false);

  const assembler = buildPass2578AuditReportAssemblerReport({ chain: "ethereum", contractAddress: address, locale: "en", providerRuntime, claimLedger, permissionParser });
  const contextFinding = assembler.topFindings.find((finding) => finding.id === "finding-permission-signal-erc2771-multicall-context-integrity");
  check("p78_stdjson_assembler_specific_finding", Boolean(contextFinding));
  check("p78_stdjson_assembler_finding_severity", contextFinding?.severity === "elevated", contextFinding?.severity);
  check("p78_stdjson_assembler_no_global_risk_overclaim", assembler.finalVerdict.riskScore === null, assembler.finalVerdict.riskScore);
  check("p78_stdjson_assembler_pdf_contains_specific_finding", assembler.proPdfLines.some((line) => /ERC2771 \+ Multicall forwarded-context integrity/.test(line)));

  const projection = projectAuditReportForCustomer({ report: assembler, requestedTier: "pro", deliveredTier: "pro", manualReviewVerified: false });
  const projectedFinding = projection.report.topFindings.find((finding) => finding.id === "finding-permission-signal-erc2771-multicall-context-integrity");
  check("p78_stdjson_projection_keeps_specific_finding", Boolean(projectedFinding));
  check("p78_stdjson_projection_keeps_customer_safe_line", /not yet proof|not proof/i.test(projectedFinding?.publicLine ?? ""));
  check("p78_stdjson_projection_pdf_keeps_specific_finding", projection.report.proPdfLines.some((line) => /ERC2771 \+ Multicall forwarded-context integrity/.test(line)));

  const publicObjects = { claimLedger, permissionParser, extraction, assembler, projection };
  const publicJson = JSON.stringify(publicObjects);
  check("p78_stdjson_public_objects_exclude_exact_source", !publicJson.includes(sourceText));
  check("p78_stdjson_public_objects_exclude_source_sentinel", !publicJson.includes(sourceMarker));
  check("p78_stdjson_public_objects_exclude_exact_abi", !publicJson.includes(abiText));
  check("p78_stdjson_public_objects_exclude_abi_sentinel", !publicJson.includes(abiMarker));
  check("p78_stdjson_public_objects_exclude_raw_delegatecall_line", !publicJson.includes("TWAddress.functionDelegateCall(address(this), data[i])"));

  const failed = checks.filter((item) => item.status === "FAIL");
  const receipt = {
    schemaVersion: "velmere.p78.standard-json-customer-path-runtime.v1",
    generatedAt: new Date().toISOString(),
    status: failed.length ? "FAIL" : "PASS",
    runtime: { node: process.version, platform: process.platform, arch: process.arch, exactWindowsCredit: false },
    target: { chain: "ethereum", chainId: "1", contractAddress: address },
    sourceBundle: {
      format: bundle.format,
      fileCount: bundle.fileCount,
      complete: bundle.complete,
      sourceDigest: bundle.sourceDigest,
      rawSourcePubliclyExposed: publicJson.includes(sourceText) || publicJson.includes(sourceMarker),
      rawAbiPubliclyExposed: publicJson.includes(abiText) || publicJson.includes(abiMarker),
    },
    detector: {
      id: detector.detectorId,
      classification: detector.classification,
      mitigation: detector.mitigation,
      exploitabilityProven: detector.exploitabilityProven,
      customerFinalEligibleFromDetector: detector.customerFinalEligibleFromDetector,
    },
    claim: sourceClaim ? { id: sourceClaim.id, grade: sourceClaim.grade, canShowAsFact: sourceClaim.canShowAsFact, confidence: sourceClaim.confidence, missing: sourceClaim.missing } : null,
    permissionSignal: contextSignal ? { id: contextSignal.id, state: contextSignal.state, severity: contextSignal.severity, missing: contextSignal.missing, evidenceRefCount: contextSignal.evidence.length } : null,
    assembler: { riskScore: assembler.finalVerdict.riskScore, specificFindingProjected: Boolean(projectedFinding), topFindingCount: assembler.topFindings.length },
    extraction: extraction.summary,
    checks: { total: checks.length, passed: checks.length - failed.length, failed: failed.length, rows: checks },
    publicPayloadSha256: crypto.createHash("sha256").update(publicJson).digest("hex"),
    zeroFakeCredit: {
      customerFinal: "0/20",
      auditFinalPdf: "0/3",
      exactWindows: "WITHHELD",
      deploymentExploitability: "WITHHELD",
      detectorAccuracyClaim: "WITHHELD_DEVELOPMENT_MICRO_CORPUS_ONLY",
      note: "This proves standard-json private source normalization and detector-to-customer-report propagation on a bounded runtime harness. It does not prove deployed exploitability, rights/currentness, exact Windows, independent holdout performance, immutable final PDF bytes or customer FINAL.",
    },
  };
  await mkdir("receipts/p78", { recursive: true });
  await writeFile("receipts/p78/P78_STANDARD_JSON_CUSTOMER_PATH_RUNTIME.json", `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  pass4824AuditProviderRuntimeClientDependencies.brokeredEgressFetch = originalFetch;
  if (originalKey === undefined) delete process.env.ETHERSCAN_API_KEY;
  else process.env.ETHERSCAN_API_KEY = originalKey;
  resetPass4824AuditProviderRuntimeCacheForTests();
}
