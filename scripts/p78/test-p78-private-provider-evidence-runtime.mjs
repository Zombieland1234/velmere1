#!/usr/bin/env node
import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import {
  buildPass2572AuditProviderRuntimeReport,
  pass4824AuditProviderRuntimeClientDependencies,
  readPass2572AuditProviderPrivateStaticEvidence,
  resetPass4824AuditProviderRuntimeCacheForTests,
} from "../../lib/security/audit-provider-runtime-client.ts";
import { buildPass2576AuditPermissionParserReport } from "../../lib/security/audit-permission-parser.ts";
import { buildPass2583ContractSourceAbiExtractionReport } from "../../lib/security/contract-source-abi-extraction.ts";

const checks = [];
function check(id, condition, detail = undefined) {
  checks.push({ id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) });
  if (!condition) process.exitCode = 1;
}
function jsonResponse(value) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

const address = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const sourceMarker = "P78_PRIVATE_SOURCE_SENTINEL_4eec75f4d9b9";
const abiMarker = "p78PrivateAbiSentinel4eec75f4";
const sourceText = `// ${sourceMarker}\npragma solidity ^0.8.20;\ncontract AuditTarget {\n  address public owner;\n  function mint(address to, uint256 amount) external { to; amount; }\n  function pause() external {}\n  function grantRole(bytes32 role, address account) external { role; account; }\n}`;
const abiText = JSON.stringify([
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address", name: "" }] },
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ type: "address", name: "to" }, { type: "uint256", name: "amount" }], outputs: [] },
  { type: "function", name: "grantRole", stateMutability: "nonpayable", inputs: [{ type: "bytes32", name: "role" }, { type: "address", name: "account" }], outputs: [] },
  { type: "function", name: abiMarker, stateMutability: "view", inputs: [], outputs: [] },
]);

const originalFetch = pass4824AuditProviderRuntimeClientDependencies.brokeredEgressFetch;
const originalKey = process.env.ETHERSCAN_API_KEY;
process.env.ETHERSCAN_API_KEY = "p78-runtime-test-key";
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
  const report = await buildPass2572AuditProviderRuntimeReport({
    chain: "ethereum",
    contractAddress: address,
    projectName: "P78 Audit Target",
    locale: "en",
  });
  const explorer = report.lanes.find((lane) => lane.id === "runtime-explorer-source");
  const publicJson = JSON.stringify(report);
  const privateEvidence = readPass2572AuditProviderPrivateStaticEvidence(report);

  check("p78_provider_explorer_confirmed", explorer?.state === "confirmed");
  check("p78_provider_identity_exact_response", explorer?.identity?.verification === "exact_response");
  check("p78_provider_identity_matched", explorer?.identity?.matched === true);
  check("p78_provider_public_receipt_present", Boolean(explorer?.receipt?.bodyDigest));
  check("p78_public_report_excludes_raw_source_exact", !publicJson.includes(sourceText));
  check("p78_public_report_excludes_raw_abi_exact", !publicJson.includes(abiText));
  check("p78_public_report_excludes_source_sentinel", !publicJson.includes(sourceMarker));
  check("p78_public_report_excludes_abi_sentinel", !publicJson.includes(abiMarker));
  check("p78_private_evidence_recovered_after_public_clone", privateEvidence?.sourceText === sourceText && privateEvidence?.abiText === abiText);
  check("p78_private_evidence_address_bound", privateEvidence?.contractAddress === address);
  check("p78_private_evidence_chain_bound", privateEvidence?.chainId === "1");
  check("p78_private_evidence_digest_bound", Boolean(privateEvidence?.responseDigest && /^[a-f0-9]{64}$/.test(privateEvidence.responseDigest)));

  const parser = buildPass2576AuditPermissionParserReport({
    chain: "ethereum",
    contractAddress: address,
    locale: "en",
    providerRuntime: report,
  });
  check("p78_parser_consumes_private_verified_source", parser.signals.some((signal) => signal.category === "ownership" && signal.state === "detected"));
  check("p78_parser_detects_mint_from_private_evidence", parser.signals.some((signal) => signal.category === "mint_supply" && signal.state === "detected"));
  check("p78_parser_detects_admin_role_from_private_evidence", parser.signals.some((signal) => signal.category === "admin_roles" && signal.state === "detected"));
  check("p78_parser_detects_pause_from_private_evidence", parser.signals.some((signal) => signal.category === "pause_freeze" && signal.state === "detected"));
  check("p78_parser_has_no_raw_source_field", !JSON.stringify(parser).includes(sourceMarker));
  check("p78_parser_has_no_raw_abi_field", !JSON.stringify(parser).includes(abiMarker));

  const extraction = buildPass2583ContractSourceAbiExtractionReport({
    chain: "ethereum",
    contractAddress: address,
    locale: "en",
    providerRuntime: report,
    permissionParser: parser,
  });
  check("p78_extraction_source_verified", extraction.sourceGate.verified === true && extraction.sourceGate.sourceAvailable === true);
  check("p78_extraction_abi_available", extraction.sourceGate.abiAvailable === true);
  check("p78_extraction_function_surface_nonzero", extraction.summary.totalFunctions >= 3, extraction.summary.totalFunctions);
  check("p78_extraction_can_feed_permission_parser", extraction.summary.canFeedPermissionParser === true);
  check("p78_static_extraction_cannot_final_sign", extraction.summary.canFinalSignFromStaticExtraction === false);
  check("p78_extraction_public_rows_no_source_sentinel", !JSON.stringify(extraction.publicRows).includes(sourceMarker));
  check("p78_extraction_pro_rows_no_abi_sentinel", !JSON.stringify(extraction.proPdfRows).includes(abiMarker));

  const tampered = structuredClone(report);
  const tamperedExplorer = tampered.lanes.find((lane) => lane.id === "runtime-explorer-source");
  if (tamperedExplorer?.identity) tamperedExplorer.identity.resolvedAddress = "0xcccccccccccccccccccccccccccccccccccccccc";
  check("p78_private_evidence_fails_closed_on_identity_tamper", readPass2572AuditProviderPrivateStaticEvidence(tampered) === null);

  resetPass4824AuditProviderRuntimeCacheForTests();
  check("p78_private_evidence_cleared_with_runtime_cache", readPass2572AuditProviderPrivateStaticEvidence(report) === null);

  const failed = checks.filter((item) => item.status === "FAIL");
  const receipt = {
    schemaVersion: "velmere.p78.private-provider-evidence-runtime.v1",
    generatedAt: new Date().toISOString(),
    status: failed.length ? "FAIL" : "PASS",
    runtime: { node: process.version, platform: process.platform, arch: process.arch, exactWindowsCredit: false },
    target: { chain: "ethereum", chainId: "1", contractAddress: address },
    publicBoundary: {
      rawSourceExposed: publicJson.includes(sourceText) || publicJson.includes(sourceMarker),
      rawAbiExposed: publicJson.includes(abiText) || publicJson.includes(abiMarker),
      publicReportSha256: crypto.createHash("sha256").update(publicJson).digest("hex"),
    },
    parserSummary: parser.summary,
    extractionSummary: extraction.summary,
    checks,
    zeroFakeCredit: {
      customerFinal: "0/20",
      auditFinalPdf: "0/3",
      exactWindows: "WITHHELD",
      vulnerabilityGroundTruth: "WITHHELD_BY_THIS_TEST",
      note: "This runtime proves private/public source-ABI plumbing and parser/extraction consumption only. It does not prove customer FINAL, PDF FINAL, exact Windows, source rights, or vulnerability/exploitability ground truth.",
    },
  };
  await mkdir("receipts/p78", { recursive: true });
  await writeFile("receipts/p78/P78_PRIVATE_PROVIDER_EVIDENCE_RUNTIME.json", `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  pass4824AuditProviderRuntimeClientDependencies.brokeredEgressFetch = originalFetch;
  if (originalKey === undefined) delete process.env.ETHERSCAN_API_KEY;
  else process.env.ETHERSCAN_API_KEY = originalKey;
  resetPass4824AuditProviderRuntimeCacheForTests();
}
