#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";

const FIXED_AT = "2026-08-20T12:10:00.000Z";
const ADDRESS = "0x0000000000000000000000000000000000000090";
const OTHER_ADDRESS = "0x0000000000000000000000000000000000000091";
const checks = [];
function check(id, condition, detail) {
  const row = { id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) };
  checks.push(row);
  if (!condition) throw new Error(`P90 Sourcify runtime failed: ${id} ${JSON.stringify(detail ?? null)}`);
}

const [runtime, dimensions, broker, budget] = await Promise.all([
  import("../../lib/security/audit-provider-runtime-client.ts"),
  import("../../lib/security/audit-provider-evidence-dimensions.ts"),
  import("../../lib/network/brokered-egress.ts"),
  import("../../lib/security/audit-provider-budget.ts"),
]);

// Deterministic no-socket budget seam. This proves only local control-flow.
const originalRateLimit = budget.pass4824AuditProviderBudgetDependencies.rateLimit;
budget.pass4824AuditProviderBudgetDependencies.rateLimit = async (options) => ({
  ok: true,
  mode: "memory",
  remaining: 999,
  resetAt: Date.parse(FIXED_AT) + 60_000,
  limit: options.limit,
  windowMs: options.windowMs,
  fixedWindowId: 1,
  boundaryKey: `p90-test:${options.key}`,
  degraded: false,
  provider: "memory",
});

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json", date: FIXED_AT },
  });
}

async function runtimeCase(name, sourcifyPayload, sourcifyStatus = 200) {
  runtime.resetPass4824AuditProviderRuntimeCacheForTests();
  const urls = [];
  const report = await broker.withPass4825BrokeredEgressTestTransport(async (url) => {
    urls.push(url.toString());
    if (url.hostname === "sourcify.dev") return jsonResponse(sourcifyPayload, sourcifyStatus);
    return jsonResponse({ status: "not_found" }, 404);
  }, () => runtime.buildPass2572AuditProviderRuntimeReport({
    contractAddress: ADDRESS,
    chain: "ethereum",
    chainId: "1",
    locale: "en",
  }));
  const sortedUrls = [...urls].sort();
  const lane = report.lanes.find((row) => row.id === "runtime-sourcify-verification");
  check(`${name}_lane_present`, Boolean(lane));
  check(`${name}_single_minimal_lookup`, sortedUrls.filter((url) => url.includes("sourcify.dev/server/v2/contract/1/")).length === 1, sortedUrls);
  check(`${name}_no_raw_field_query`, sortedUrls.every((url) => !/[?&](?:fields|include|source|abi|metadata|bytecode)=/i.test(url)), sortedUrls);
  const built = dimensions.buildAuditProviderEvidenceDimensions(report.lanes);
  return { report, lane, built, urls: sortedUrls };
}

try {
  const exactParser = runtime.parsePass4827SourcifyLookupResponse({
    address: ADDRESS,
    chainId: "1",
    match: "exact_match",
    creationMatch: "exact_match",
    runtimeMatch: "exact_match",
    verifiedAt: "2026-08-01T00:00:00.000Z",
    matchId: "123",
  }, ADDRESS, "1");
  check("parser_exact", exactParser.exactRuntimeVerification && exactParser.identityMatched, exactParser);
  check("parser_exact_match_reference_digest", /^sha256:[a-f0-9]{64}$/.test(exactParser.matchIdDigest ?? ""), exactParser.matchIdDigest);

  const partialParser = runtime.parsePass4827SourcifyLookupResponse({
    address: ADDRESS,
    chainId: 1,
    match: "match",
    runtimeMatch: "match",
  }, ADDRESS, "1");
  check("parser_non_exact", partialParser.verifiedButNotExact && !partialParser.exactRuntimeVerification, partialParser);

  const wrongAddressParser = runtime.parsePass4827SourcifyLookupResponse({
    address: OTHER_ADDRESS,
    chainId: "1",
    match: "exact_match",
    runtimeMatch: "exact_match",
  }, ADDRESS, "1");
  check("parser_wrong_address_fail_closed", !wrongAddressParser.identityMatched && !wrongAddressParser.exactRuntimeVerification, wrongAddressParser);

  const wrongChainParser = runtime.parsePass4827SourcifyLookupResponse({
    address: ADDRESS,
    chainId: "56",
    match: "exact_match",
    runtimeMatch: "exact_match",
  }, ADDRESS, "1");
  check("parser_wrong_chain_fail_closed", !wrongChainParser.identityMatched && !wrongChainParser.exactRuntimeVerification, wrongChainParser);

  const rawParser = runtime.parsePass4827SourcifyLookupResponse({
    address: ADDRESS,
    chainId: "1",
    match: "exact_match",
    runtimeMatch: "exact_match",
    sources: { "A.sol": "P90_RAW_SOURCE_SENTINEL" },
    abi: [{ type: "function", name: "P90_RAW_ABI_SENTINEL" }],
  }, ADDRESS, "1");
  check("parser_raw_sensitive_fields_fail_closed", rawParser.unsafeRawFieldsPresent && !rawParser.exactRuntimeVerification && rawParser.blockers.includes("raw_sensitive_fields_present"), rawParser);

  const exact = await runtimeCase("exact", {
    address: ADDRESS,
    chainId: "1",
    match: "exact_match",
    creationMatch: "exact_match",
    runtimeMatch: "exact_match",
    verifiedAt: "2026-08-01T00:00:00.000Z",
    matchId: "p90-exact",
  });
  check("exact_confirmed", exact.lane?.state === "confirmed", exact.lane?.state);
  check("exact_live_eligible", exact.lane?.liveExecutionEligible === true, exact.lane?.liveExecutionEligible);
  check("exact_identity_bound", exact.lane?.identity?.matched === true && exact.lane?.identity?.verification === "exact_response", exact.lane?.identity);
  check("exact_one_strict", exact.built.strictReceiptCount === 1, exact.built.strictReceiptCount);
  check("exact_one_live", exact.built.successfulLiveLaneCount === 1, exact.built.successfulLiveLaneCount);
  check("exact_sourcify_contributor", exact.built.successfulLiveProviderIds.includes("sourcify-v2"), exact.built.successfulLiveProviderIds);

  const nonExact = await runtimeCase("non_exact", {
    address: ADDRESS,
    chainId: "1",
    match: "match",
    creationMatch: "match",
    runtimeMatch: "match",
    verifiedAt: "2026-08-01T00:00:00.000Z",
  });
  check("non_exact_partial", nonExact.lane?.state === "partial", nonExact.lane?.state);
  check("non_exact_live_eligible", nonExact.lane?.liveExecutionEligible === true, nonExact.lane?.liveExecutionEligible);
  check("non_exact_zero_strict", nonExact.built.strictReceiptCount === 0, nonExact.built.strictReceiptCount);
  check("non_exact_one_live", nonExact.built.successfulLiveLaneCount === 1, nonExact.built.successfulLiveLaneCount);

  const wrongAddress = await runtimeCase("wrong_address", {
    address: OTHER_ADDRESS,
    chainId: "1",
    match: "exact_match",
    runtimeMatch: "exact_match",
  });
  check("wrong_address_not_live", wrongAddress.lane?.liveExecutionEligible === false, wrongAddress.lane?.liveExecutionEligible);
  check("wrong_address_zero_strict_live", wrongAddress.built.strictReceiptCount === 0 && wrongAddress.built.successfulLiveLaneCount === 0, wrongAddress.built);

  const wrongChain = await runtimeCase("wrong_chain", {
    address: ADDRESS,
    chainId: "56",
    match: "exact_match",
    runtimeMatch: "exact_match",
  });
  check("wrong_chain_not_live", wrongChain.lane?.liveExecutionEligible === false, wrongChain.lane?.liveExecutionEligible);
  check("wrong_chain_zero_strict_live", wrongChain.built.strictReceiptCount === 0 && wrongChain.built.successfulLiveLaneCount === 0, wrongChain.built);

  const raw = await runtimeCase("raw_sensitive", {
    address: ADDRESS,
    chainId: "1",
    match: "exact_match",
    runtimeMatch: "exact_match",
    sources: { "A.sol": "P90_RAW_SOURCE_SENTINEL" },
    abi: [{ type: "function", name: "P90_RAW_ABI_SENTINEL" }],
  });
  check("raw_sensitive_not_live", raw.lane?.liveExecutionEligible === false, raw.lane?.liveExecutionEligible);
  check("raw_sensitive_zero_strict_live", raw.built.strictReceiptCount === 0 && raw.built.successfulLiveLaneCount === 0, raw.built);
  check("raw_values_not_returned", !JSON.stringify(raw.report).includes("P90_RAW_SOURCE_SENTINEL") && !JSON.stringify(raw.report).includes("P90_RAW_ABI_SENTINEL"));

  const notFound = await runtimeCase("not_found", { status: "not_found" }, 404);
  check("not_found_not_live", notFound.lane?.liveExecutionEligible === false, notFound.lane?.liveExecutionEligible);
  check("not_found_zero_strict_live", notFound.built.strictReceiptCount === 0 && notFound.built.successfulLiveLaneCount === 0, notFound.built);

  let productionGateCode = null;
  try {
    await broker.brokeredEgressFetch(`https://sourcify.dev/server/v2/contract/1/${ADDRESS}`, {
      cache: "no-store",
      headers: { accept: "application/json" },
    }, {
      profile: "audit_provider_runtime",
      operation: "p90_production_rights_gate_probe",
      timeoutMs: 500,
      maxResponseBytes: 65_536,
    });
  } catch (error) {
    productionGateCode = error && typeof error === "object" && "code" in error ? error.code : null;
  }
  check("production_egress_blocked_before_network", productionGateCode === "provider_rights_not_verified", productionGateCode);

  const exactText = JSON.stringify(exact.report);
  check("report_no_raw_source_abi_metadata_bytecode", !/P90_RAW_|pragma solidity|standardJsonInput|compilerInput/i.test(exactText));
  check("boundary_does_not_claim_safety", /does not prove current runtime state, safety, absence of vulnerabilities/i.test(exact.lane?.boundary ?? ""), exact.lane?.boundary);
} finally {
  budget.pass4824AuditProviderBudgetDependencies.rateLimit = originalRateLimit;
  runtime.resetPass4824AuditProviderRuntimeCacheForTests();
}

const failed = checks.filter((row) => row.status !== "PASS");
const receipt = {
  schemaVersion: "velmere.p90.sourcify-minimal-runtime.v2",
  generatedAt: FIXED_AT,
  status: failed.length ? "FAIL" : "PASS_BOUNDED_LOCAL_READ_ONLY_NO_SOCKET",
  checks: { total: checks.length, passed: checks.length - failed.length, failed: failed.length, rows: checks },
  networkExecuted: false,
  transport: "async-scoped local no-socket transport",
  rawSourceRequested: false,
  rawAbiRequested: false,
  stateChangeAttempted: false,
  zeroFakeCredit: {
    realSourcifyResponse: false,
    providerRightsApproved: false,
    currentDeploymentProven: false,
    customerFinal: "0/20",
    auditFinalPdf: "0/3",
  },
  truthBoundary: "This proves the current runtime path counts an exact target-bound Sourcify lookup as one strict and one live contributor, a non-exact target-bound lookup only as live, and rejects wrong-target, wrong-chain, raw-sensitive and 404 responses. All provider calls used a local no-socket transport; production egress remains blocked by the rights gate.",
};
await mkdir(new URL("../../receipts/p90/", import.meta.url), { recursive: true });
await writeFile(new URL("../../receipts/p90/P90_SOURCIFY_MINIMAL_PARSER_RUNTIME.json", import.meta.url), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks, networkExecuted: false }, null, 2));
if (failed.length) process.exitCode = 1;
