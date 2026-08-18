import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildPass2572AuditProviderRuntimeReport,
  pass4824AuditProviderRuntimeClientDependencies,
  resetPass4824AuditProviderRuntimeCacheForTests,
  type Pass2572VerifiedStaticEvidence,
} from "../p75-work/source/lib/security/audit-provider-runtime-client";
import { buildPass2576AuditPermissionParserReport } from "../p75-work/source/lib/security/audit-permission-parser";
import { buildPass2578AuditReportAssemblerReport } from "../p75-work/source/lib/security/audit-report-assembler";
import { buildPass2583ContractSourceAbiExtractionReport } from "../p75-work/source/lib/security/contract-source-abi-extraction";

const OUT = process.env.P78_RESULT_DIR ?? path.resolve("p78-out");
fs.mkdirSync(OUT, { recursive: true });
const checks: Array<{ id: string; passed: true; detail?: unknown }> = [];
function check(id: string, condition: unknown, detail?: unknown) {
  assert.ok(condition, id);
  checks.push({ id, passed: true, ...(detail === undefined ? {} : { detail }) });
}

const target = "0xbb9bc244d798123fde783fcc1c72d3bb8c189413";
const vulnerableSource = `pragma solidity ^0.8.0;
contract Vault {
  mapping(address => uint256) public balances;
  function withdraw(uint256 amount) external {
    (bool ok,) = msg.sender.call{value: amount}("");
    require(ok);
    balances[msg.sender] -= amount;
  }
}`;
const fixedSource = `pragma solidity ^0.8.0;
contract Vault {
  mapping(address => uint256) public balances;
  function withdraw(uint256 amount) external {
    balances[msg.sender] -= amount;
    (bool ok,) = msg.sender.call{value: amount}("");
    require(ok);
  }
}`;
const legacyDaoShape = `pragma solidity ^0.4.0;
contract DAOInterface { mapping(address => uint) public balances; }
contract DAO is DAOInterface {
  function splitDAO(address newDAO, uint fundsToBeMoved) returns (bool) {
    if (newDAO.createTokenProxy.value(fundsToBeMoved)(msg.sender) == false) throw;
    balances[msg.sender] = 0;
    return true;
  }
}`;
const abi = JSON.stringify([{ type: "function", name: "withdraw", inputs: [{ type: "uint256" }], stateMutability: "nonpayable" }]);

const originalFetch = pass4824AuditProviderRuntimeClientDependencies.brokeredEgressFetch;
async function mockFetch(url: string | URL | Request) {
  const value = String(url);
  if (value.includes("action=getsourcecode")) {
    return new Response(JSON.stringify({ status: "1", message: "OK", result: [{ SourceCode: vulnerableSource, ABI: abi, ContractName: "Vault", CompilerVersion: "v0.8.26", Proxy: "0", Implementation: "" }] }), { status: 200, headers: { "content-type": "application/json" } });
  }
  if (value.includes("action=getcontractcreation")) {
    return new Response(JSON.stringify({ status: "1", message: "OK", result: [{ contractAddress: target }] }), { status: 200, headers: { "content-type": "application/json" } });
  }
  return new Response(JSON.stringify({ status: "0", message: "not available", result: [] }), { status: 404, headers: { "content-type": "application/json" } });
}

async function main() {
  process.env.ETHERSCAN_API_KEY = "p78-test-key";
  pass4824AuditProviderRuntimeClientDependencies.brokeredEgressFetch = mockFetch as typeof originalFetch;
  resetPass4824AuditProviderRuntimeCacheForTests();
  let privateEvidence: Pass2572VerifiedStaticEvidence | null = null;
  const runtime = await buildPass2572AuditProviderRuntimeReport({
    locale: "en",
    chain: "ethereum",
    contractAddress: target,
    projectName: "Historical target",
    verifiedStaticEvidenceSink: (value) => { privateEvidence = value; },
  });
  check("provider:explorer-confirmed", runtime.lanes.find((lane) => lane.id === "runtime-explorer-source")?.state === "confirmed", runtime.lanes.find((lane) => lane.id === "runtime-explorer-source"));
  check("provider:private-evidence-captured", Boolean(privateEvidence?.sourceText?.includes("contract Vault")), privateEvidence && { provider: privateEvidence.provider, digest: privateEvidence.responseDigest });
  check("provider:private-source-not-in-public-report", !JSON.stringify(runtime).includes("balances[msg.sender]"));
  check("provider:evidence-address-bound", privateEvidence?.contractAddress === target);
  check("provider:evidence-chain-bound", privateEvidence?.chain === "ethereum");
  check("provider:evidence-response-digest-bound", /^[a-f0-9]{64}$/i.test(privateEvidence?.responseDigest ?? ""));

  const permission = buildPass2576AuditPermissionParserReport({ locale: "en", chain: "ethereum", contractAddress: target, providerRuntime: runtime, verifiedStaticEvidence: privateEvidence });
  check("permission:source-corpus-consumed", permission.summary.unknown === 0 && permission.summary.blocked === 0, permission.summary);

  const extraction = buildPass2583ContractSourceAbiExtractionReport({ locale: "en", chain: "ethereum", contractAddress: target, providerRuntime: runtime, permissionParser: permission, verifiedStaticEvidence: privateEvidence });
  check("extraction:verified-source-and-abi", extraction.sourceGate.sourceAvailable && extraction.sourceGate.abiAvailable, extraction.sourceGate);
  check("extraction:function-index-populated", extraction.summary.totalFunctions >= 1, extraction.summary);

  const report = buildPass2578AuditReportAssemblerReport({ locale: "en", chain: "ethereum", contractAddress: target, providerRuntime: runtime, permissionParser: permission, verifiedStaticEvidence: privateEvidence });
  const staticFinding = report.topFindings.find((finding) => finding.id.startsWith("finding-static-reentrancy-order-"));
  check("report:reentrancy-order-finding", staticFinding?.severity === "elevated", staticFinding);
  check("report:risk-floor-72", report.finalVerdict.riskScore === 72, report.finalVerdict);
  check("report:no-exploitability-overclaim", staticFinding?.proLine.includes("exploitability=unproven") === true, staticFinding?.proLine);
  check("report:no-raw-source-leak", !JSON.stringify(report).includes("balances[msg.sender]"));

  const fixedEvidence = { ...privateEvidence!, sourceText: fixedSource };
  const fixedReport = buildPass2578AuditReportAssemblerReport({ locale: "en", chain: "ethereum", contractAddress: target, providerRuntime: runtime, verifiedStaticEvidence: fixedEvidence });
  check("control:cei-fix-suppresses-finding", !fixedReport.topFindings.some((finding) => finding.id.startsWith("finding-static-reentrancy-order-")), fixedReport.topFindings);

  const legacyEvidence = { ...privateEvidence!, sourceText: legacyDaoShape };
  const legacyReport = buildPass2578AuditReportAssemblerReport({ locale: "en", chain: "ethereum", contractAddress: target, providerRuntime: runtime, verifiedStaticEvidence: legacyEvidence });
  check("legacy:method-value-order-detected", legacyReport.topFindings.some((finding) => finding.id.startsWith("finding-static-reentrancy-order-")), legacyReport.topFindings);

  const mismatchEvidence = { ...privateEvidence!, contractAddress: "0x1111111111111111111111111111111111111111" };
  const mismatchReport = buildPass2578AuditReportAssemblerReport({ locale: "en", chain: "ethereum", contractAddress: target, providerRuntime: runtime, verifiedStaticEvidence: mismatchEvidence });
  check("identity:mismatch-fails-closed", !mismatchReport.topFindings.some((finding) => finding.id.startsWith("finding-static-reentrancy-order-")), mismatchReport.topFindings);

  const receipt = {
    schemaVersion: "velmere.p78r2.customer-static-evidence-runtime.v1",
    status: "PASS",
    checks,
    productRepair: {
      privateVerifiedExplorerEvidencePropagated: true,
      permissionParserConsumesVerifiedEvidence: true,
      sourceAbiExtractionConsumesVerifiedEvidence: true,
      boundedReentrancyOrderingFinding: true,
      fixedControlSuppressesFinding: true,
      legacyPayableMethodOrderingDetected: true,
      rawSourcePublicLeak: false,
      exploitabilityOverclaim: false,
    },
    zeroFakeCredit: { customerFinal: "0/20", auditFinalPdf: "0/3", rights: "2/203", paidValue: "0/10", saleEligible: "0/20", live: false },
  };
  fs.writeFileSync(path.join(OUT, "P78R2_CUSTOMER_STATIC_EVIDENCE_RUNTIME.json"), JSON.stringify(receipt, null, 2) + "\n");
  console.log(JSON.stringify(receipt, null, 2));
}

main().finally(() => {
  pass4824AuditProviderRuntimeClientDependencies.brokeredEgressFetch = originalFetch;
  resetPass4824AuditProviderRuntimeCacheForTests();
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
