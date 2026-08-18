import fs from "node:fs";
import path from "node:path";
import {
  buildPass2572AuditProviderRuntimeExecution,
  buildPass2572AuditProviderRuntimeReport,
  pass4824AuditProviderRuntimeClientDependencies,
  resetPass4824AuditProviderRuntimeCacheForTests,
} from "../p75-work/source/lib/security/audit-provider-runtime-client";
import { buildPass2576AuditPermissionParserReport } from "../p75-work/source/lib/security/audit-permission-parser";
import { buildPass2583ContractSourceAbiExtractionReport } from "../p75-work/source/lib/security/contract-source-abi-extraction";

const outDir = process.env.P78R2_RESULT_DIR ?? process.cwd();
const address = "0x1111111111111111111111111111111111111111";
const sourceText = `pragma solidity ^0.8.20;
contract P78PrivateSourceMarker {
  address public owner;
  modifier onlyOwner() { require(msg.sender == owner, "owner"); _; }
  function pause() external onlyOwner {}
}`;
const abiText = JSON.stringify([
  { type: "function", name: "owner", inputs: [], stateMutability: "view" },
  { type: "function", name: "pause", inputs: [], stateMutability: "nonpayable" },
]);

const originalFetch = pass4824AuditProviderRuntimeClientDependencies.brokeredEgressFetch;
const originalKey = process.env.ETHERSCAN_API_KEY;
let fetchCount = 0;
let etherscanFetchCount = 0;

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

pass4824AuditProviderRuntimeClientDependencies.brokeredEgressFetch = (async (input: RequestInfo | URL) => {
  fetchCount += 1;
  const url = String(input);
  if (url.includes("api.etherscan.io") && url.includes("action=getsourcecode")) {
    etherscanFetchCount += 1;
    return jsonResponse({
      status: "1",
      message: "OK",
      result: [{
        SourceCode: sourceText,
        ABI: abiText,
        ContractName: "P78PrivateSourceMarker",
        CompilerVersion: "v0.8.20+commit.a1b79de6",
        Proxy: "0",
        Implementation: "",
      }],
    });
  }
  if (url.includes("api.etherscan.io") && url.includes("action=getcontractcreation")) {
    etherscanFetchCount += 1;
    return jsonResponse({
      status: "1",
      message: "OK",
      result: [{ contractAddress: address }],
    });
  }
  if (url.includes("dexscreener.com")) return jsonResponse({ pairs: [] });
  if (url.includes("gopluslabs.io")) return jsonResponse({ result: {} });
  if (url.includes("honeypot.is")) return jsonResponse({});
  if (url.includes("coingecko.com")) return jsonResponse({ coins: [] });
  throw new Error(`p78r2_unexpected_provider_url:${url}`);
}) as typeof originalFetch;

try {
  process.env.ETHERSCAN_API_KEY = "p78r2-test-key";
  resetPass4824AuditProviderRuntimeCacheForTests();

  const input = {
    locale: "en" as const,
    chain: "ethereum",
    contractAddress: address,
    projectName: "P78 private evidence probe",
  };
  const execution = await buildPass2572AuditProviderRuntimeExecution(input);
  const explorer = execution.report.lanes.find((lane) => lane.id === "runtime-explorer-source");
  if (!explorer || explorer.state !== "confirmed" || explorer.identity?.matched !== true || explorer.identity.verification !== "exact_response") {
    throw new Error(`p78r2_explorer_not_exact_confirmed:${JSON.stringify(explorer)}`);
  }
  const evidence = execution.verifiedStaticEvidence;
  if (!evidence) throw new Error("p78r2_private_static_evidence_missing");
  if (evidence.contractAddress !== address || evidence.chain !== "ethereum" || evidence.provider !== "Etherscan V2") {
    throw new Error(`p78r2_private_static_identity_mismatch:${JSON.stringify(evidence)}`);
  }
  if (evidence.sourceText !== sourceText || evidence.abiText !== abiText) {
    throw new Error("p78r2_private_static_payload_mismatch");
  }
  if (!/^[a-f0-9]{64}$/.test(evidence.responseDigest) || evidence.responseDigest !== explorer.receipt?.bodyDigest) {
    throw new Error(`p78r2_private_static_digest_mismatch:${evidence.responseDigest}:${explorer.receipt?.bodyDigest}`);
  }
  if (!Number.isFinite(Date.parse(evidence.observedAt))) throw new Error("p78r2_private_static_observed_at_invalid");
  if (etherscanFetchCount !== 2) throw new Error(`p78r2_etherscan_fetch_count:${etherscanFetchCount}`);

  const publicReportJson = JSON.stringify(execution.report);
  if (publicReportJson.includes("P78PrivateSourceMarker") || publicReportJson.includes("function pause() external onlyOwner")) {
    throw new Error("p78r2_raw_source_leaked_into_public_provider_report");
  }
  if ((execution.report as unknown as Record<string, unknown>).verifiedStaticEvidence !== undefined) {
    throw new Error("p78r2_private_evidence_property_leaked_into_public_report_object");
  }

  const countBeforeLegacyRead = fetchCount;
  const legacyReport = await buildPass2572AuditProviderRuntimeReport(input);
  if (fetchCount !== countBeforeLegacyRead) {
    throw new Error(`p78r2_legacy_report_caused_duplicate_fetch:${countBeforeLegacyRead}:${fetchCount}`);
  }
  if (JSON.stringify(legacyReport).includes("P78PrivateSourceMarker")) {
    throw new Error("p78r2_legacy_report_raw_source_leak");
  }

  const parser = buildPass2576AuditPermissionParserReport({
    ...input,
    providerRuntime: execution.report,
    verifiedStaticEvidence: evidence,
  });
  const ownerSignal = parser.signals.find((signal) => signal.id === "owner-control");
  const pauseSignal = parser.signals.find((signal) => signal.id === "pause-freeze");
  if (ownerSignal?.state !== "detected" || pauseSignal?.state !== "detected") {
    throw new Error(`p78r2_permission_parser_did_not_consume_private_source:${JSON.stringify({ ownerSignal, pauseSignal })}`);
  }

  const extraction = buildPass2583ContractSourceAbiExtractionReport({
    ...input,
    providerRuntime: execution.report,
    permissionParser: parser,
    verifiedStaticEvidence: evidence,
  });
  if (!extraction.sourceGate.verified || !extraction.sourceGate.sourceAvailable || !extraction.sourceGate.abiAvailable) {
    throw new Error(`p78r2_source_extraction_not_verified:${JSON.stringify(extraction.sourceGate)}`);
  }
  if (!extraction.functionSurfaces.some((surface) => surface.name === "owner") || !extraction.functionSurfaces.some((surface) => surface.name === "pause")) {
    throw new Error("p78r2_source_extraction_missing_expected_function_surfaces");
  }

  const tamperedEvidence = { ...evidence, contractAddress: "0x2222222222222222222222222222222222222222" };
  const tamperedParser = buildPass2576AuditPermissionParserReport({
    ...input,
    providerRuntime: execution.report,
    verifiedStaticEvidence: tamperedEvidence,
  });
  if (tamperedParser.summary.detected !== 0) {
    throw new Error(`p78r2_identity_tamper_parser_not_rejected:${tamperedParser.summary.detected}`);
  }
  const tamperedExtraction = buildPass2583ContractSourceAbiExtractionReport({
    ...input,
    providerRuntime: execution.report,
    verifiedStaticEvidence: tamperedEvidence,
  });
  if (tamperedExtraction.sourceGate.sourceAvailable || tamperedExtraction.sourceGate.abiAvailable || tamperedExtraction.sourceGate.verified) {
    throw new Error(`p78r2_identity_tamper_extraction_not_rejected:${JSON.stringify(tamperedExtraction.sourceGate)}`);
  }

  const receipt = {
    schemaVersion: "velmere.p78r2.verified-static-evidence-handoff-runtime.v1",
    status: "PASS",
    checks: [
      "single_provider_execution_returns_public_report_and_private_static_evidence",
      "private_evidence_requires_exact_contract_identity_and_content_receipt",
      "private_evidence_binds_chain_provider_observation_time_and_digest",
      "public_provider_report_contains_no_raw_source_or_private_evidence_property",
      "legacy_report_builder_reuses_same_cached_execution_without_duplicate_fetch",
      "permission_parser_consumes_private_verified_source",
      "source_abi_extraction_consumes_private_verified_source_and_abi",
      "contract_identity_tamper_is_rejected_by_both_consumers",
    ],
    fetchTelemetry: {
      totalProviderFetches: fetchCount,
      etherscanFetches: etherscanFetchCount,
      duplicateFetchOnLegacyReportRead: false,
    },
    sourceGate: extraction.sourceGate,
    permissionSignals: {
      ownerControl: ownerSignal.state,
      pauseFreeze: pauseSignal.state,
    },
    publicLeakCheck: "PASS",
    zeroFakeCredit: {
      newVulnerabilityDetector: 0,
      runtimeExploitability: 0,
      customerFinal: "0/20",
      auditFinalPdf: "0/3",
      rights: "2/203",
      paidValue: "0/10",
      saleEligible: "0/20",
      live: false,
    },
  };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "P78R2_VERIFIED_STATIC_EVIDENCE_RUNTIME.json"), JSON.stringify(receipt, null, 2) + "\n");
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  pass4824AuditProviderRuntimeClientDependencies.brokeredEgressFetch = originalFetch;
  resetPass4824AuditProviderRuntimeCacheForTests();
  if (originalKey === undefined) delete process.env.ETHERSCAN_API_KEY;
  else process.env.ETHERSCAN_API_KEY = originalKey;
}
