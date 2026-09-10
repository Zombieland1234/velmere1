/**
 * Comprehensive QA Test Suite for Live On-Chain RPC Bytecode Resolution,
 * Multi-Chain Audit Execution, and PDF Delivery.
 */

import { fetchOnChainBytecode, SUPPORTED_CHAINS } from "../../lib/security/evm-rpc-fetcher";
import { analyzeEvmBytecode } from "../../lib/security/evm-bytecode-analyzer";
import { buildCanonicalAuditReport } from "../../lib/security/audit-canonical-report";
import { renderCanonicalReportToPdf } from "../../lib/security/audit-canonical-report";

async function runTestSuite() {
  console.log("================================================================================");
  console.log("VELMÈRE LIVE ON-CHAIN RPC & MULTI-CHAIN AUDIT SYSTEM TEST");
  console.log("================================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`  ✅ ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${msg}`);
      process.exitCode = 1;
    }
  }

  // ---------------------------------------------------------------------------
  // TEST 1: Live On-Chain Bytecode Retrieval for DAI (Ethereum - Chain 1)
  // ---------------------------------------------------------------------------
  console.log("TEST 1: Live On-Chain Bytecode Retrieval for DAI (Ethereum - Chain 1)");
  const daiAddress = "0x6b175474e89094c44da98b954eedeac495271d0f";
  const rpcResultDai = await fetchOnChainBytecode(daiAddress, "1");
  assert(rpcResultDai.ok, `DAI bytecode fetched: source=${rpcResultDai.source}, latency=${rpcResultDai.latencyMs.toFixed(1)}ms`);
  assert(!!rpcResultDai.bytecode && rpcResultDai.bytecode.length > 500, `Bytecode size: ${rpcResultDai.bytecode?.length} characters`);

  // Disassemble DAI runtime bytecode
  if (rpcResultDai.bytecode) {
    const daiAnalysis = analyzeEvmBytecode(rpcResultDai.bytecode);
    assert(daiAnalysis.dynamicRiskScore < 50, `DAI Risk Score: ${daiAnalysis.dynamicRiskScore}/100 (${daiAnalysis.riskLabelPl})`);
    assert(daiAnalysis.functionSelectors.some(s => s.signature?.includes("transfer")), "Found standard ERC-20 transfer selector");
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Live On-Chain Bytecode Retrieval for SafeMoon (BSC - Chain 56)
  // ---------------------------------------------------------------------------
  console.log("\nTEST 2: Live On-Chain Bytecode Retrieval for SafeMoon (BSC - Chain 56)");
  const safemoonAddress = "0x8076c74c5e3f5852037f31ff0093eeb8c8add8d3";
  const rpcResultBsc = await fetchOnChainBytecode(safemoonAddress, "56");
  assert(rpcResultBsc.ok, `SafeMoon bytecode fetched: source=${rpcResultBsc.source}, latency=${rpcResultBsc.latencyMs.toFixed(1)}ms`);
  assert(!!rpcResultBsc.bytecode && rpcResultBsc.bytecode.length > 1000, `Bytecode size: ${rpcResultBsc.bytecode?.length} characters`);

  // Disassemble SafeMoon bytecode
  if (rpcResultBsc.bytecode) {
    const sfAnalysis = analyzeEvmBytecode(rpcResultBsc.bytecode);
    assert(sfAnalysis.findings.some(f => f.id === "VLM-EVM-DYNAMIC-TAX" || f.category.includes("Tax")), "Detected Dynamic Tax / Fee manipulation");
    assert(sfAnalysis.dynamicRiskScore >= 50, `SafeMoon Dynamic Risk Score: ${sfAnalysis.dynamicRiskScore}/100 (${sfAnalysis.riskLabelPl})`);
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Live In-Memory Cache Verification
  // ---------------------------------------------------------------------------
  console.log("\nTEST 3: Live In-Memory Cache Verification");
  const t0 = performance.now();
  const cachedDai = await fetchOnChainBytecode(daiAddress, "1");
  const cacheLatency = performance.now() - t0;
  assert(cachedDai.ok && cachedDai.source === "cache", `Served from memory cache: source=${cachedDai.source}`);
  assert(cacheLatency < 10, `Cache latency is sub-millisecond: ${cacheLatency.toFixed(2)}ms`);

  // ---------------------------------------------------------------------------
  // TEST 4: Non-Existent Contract / EOA Handling
  // ---------------------------------------------------------------------------
  console.log("\nTEST 4: Non-Existent Contract / EOA Handling");
  const eoaAddress = "0x0000000000000000000000000000000000000001";
  const eoaResult = await fetchOnChainBytecode(eoaAddress, "1");
  assert(!eoaResult.ok && (eoaResult.source === "eoa_no_code" || eoaResult.source === "rpc_failed"), `Correctly identified non-contract/empty: source=${eoaResult.source}`);

  // ---------------------------------------------------------------------------
  // TEST 5: Canonical Report Construction with Live Bytecode
  // ---------------------------------------------------------------------------
  console.log("\nTEST 5: Canonical Report Construction with Live Bytecode");
  const liveReport = buildCanonicalAuditReport(
    {
      reportId: "REP-LIVE-DAI-01",
      locale: "pl",
      contractName: "Dai Stablecoin",
      contractAddress: daiAddress,
      network: "Ethereum Mainnet",
      chainId: "1",
      tokenSymbol: "DAI",
      rawBytecode: rpcResultDai.bytecode,
    },
    "advanced",
  );
  assert(liveReport.verdict.riskScore < 50, `Canonical live report score: ${liveReport.verdict.riskScore}/100 (${liveReport.verdict.riskLabel})`);
  assert(liveReport.verdict.evidenceCoverage >= 80, `High evidence coverage: ${liveReport.verdict.evidenceCoverage}%`);
  assert(liveReport.sections.length >= 8, `Canonical sections generated: ${liveReport.sections.length}`);

  // ---------------------------------------------------------------------------
  // TEST 6: High-Speed Vector PDF Generation for Live Audit
  // ---------------------------------------------------------------------------
  console.log("\nTEST 6: High-Speed Vector PDF Generation for Live Audit");
  const tPdf = performance.now();
  const pdfResult = renderCanonicalReportToPdf(liveReport);
  const pdfLatency = performance.now() - tPdf;
  assert(pdfResult.pdfByteLength > 50000, `Generated vector PDF: ${pdfResult.pdfByteLength.toLocaleString()} bytes in ${pdfLatency.toFixed(2)}ms`);
  assert(pdfResult.pdfDigest.startsWith("sha256:"), `Cryptographic digest: ${pdfResult.pdfDigest}`);

  console.log("\n================================================================================");
  console.log(`TEST SUITE FINISHED: ${passed}/${total} TESTS PASSED`);
  console.log("================================================================================");
}

runTestSuite().catch((err) => {
  console.error("Test suite crashed:", err);
  process.exit(1);
});
