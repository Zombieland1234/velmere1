import { buildCanonicalAuditReport, renderCanonicalReportToPdf } from "../../lib/security/audit-canonical-report";
import { BENCHMARK_20_CONTRACTS } from "../../lib/security/contract-audit-profiles";

interface ExternalAuditBenchmark {
  contractName: string;
  address: string;
  historicalAuditor: string;
  auditorCertificateLink: string;
  auditorFocus: string;
  auditorFindingsSummary: string;
  auditorBlindspots: string;
  turnaroundTime: string;
  historicalCost: string;
}

const EXTERNAL_AUDIT_BENCHMARKS: Record<string, ExternalAuditBenchmark> = {
  "0xdac17f958d2ee523a2206206994597c13d831ec7": {
    contractName: "Tether USD (USDT)",
    address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    historicalAuditor: "BDO / Freeh Sporkin (Attestations) & CertiK/OpenZeppelin reviews",
    auditorCertificateLink: "CertiK Skynet & Tether Transparency Reports",
    auditorFocus: "ERC-20 interface compliance and reserve backing attestations.",
    auditorFindingsSummary: "Identified standard ERC-20 compliance. Highlighted owner-based blacklisting and minting functions as operational privileges.",
    auditorBlindspots: "Missed unhandled revert bubbles from legacy solc 0.4.18; lacked automated real-time cross-venue liquidity slippage and lack of timelock on freeze.",
    turnaroundTime: "3 to 6 weeks per review cycle",
    historicalCost: "$40,000 – $80,000",
  },
  "0x8076c74c5e3f5852037f31ff0093eeb8c8add8d3": {
    contractName: "SafeMoon (SAFEMOON)",
    address: "0x8076c74c5e3f5852037f31ff0093eeb8c8add8d3",
    historicalAuditor: "CertiK Security Assessment (May 2021)",
    auditorCertificateLink: "CertiK Assessment Report #2021-05-03-SAFEMOON",
    auditorFocus: "Solidity code review, mathematical verification of reflection mechanism.",
    auditorFindingsSummary: "Found 13 issues (1 Major, 1 Medium, 11 Minor/Informational). Noted 'Centralized owner controls liquidity and fees', but issued certificate badge.",
    auditorBlindspots: "Failed to classify centralized liquidity drain as a critical existential risk. The owner later drained $8.9M LP using those exact privileges (DOJ/SEC indictment 2023).",
    turnaroundTime: "2 to 3 weeks",
    historicalCost: "$25,000 – $45,000",
  },
  "0xe592427a0aece92de3edee1f18e0157c05861564": {
    contractName: "Uniswap v3 SwapRouter",
    address: "0xe592427a0aece92de3edee1f18e0157c05861564",
    historicalAuditor: "Trail of Bits & ABDK Consulting (March 2021)",
    auditorCertificateLink: "Trail of Bits Uniswap v3 Core & Periphery Security Assessment",
    auditorFocus: "Mathematical precision of concentrated liquidity (Q64.96 math), tick traversal, reentrancy.",
    auditorFindingsSummary: "Gold standard review. Discovered minor rounding edge cases and gas optimizations. Verified immutability (zero backdoors).",
    auditorBlindspots: "Static code review did not measure off-chain MEV searcher sandwich exploitation or front-running slippage exposure for end-user transactions.",
    turnaroundTime: "6 to 8 weeks",
    historicalCost: "$120,000 – $250,000",
  },
  "0x4fabb145d64652a948d72533023f6e7a623c7c53": {
    contractName: "Binance USD (BUSD) / Paxos",
    address: "0x4fabb145d64652a948d72533023f6e7a623c7c53",
    historicalAuditor: "OpenZeppelin & WithumSmith+Brown (2020-2022)",
    auditorCertificateLink: "OpenZeppelin Paxos Token Contracts Security Audit",
    auditorFocus: "ERC-20, Pausable, UpgradeableProxy, law enforcement freeze controls.",
    auditorFindingsSummary: "Verified proxy storage collision safety, multi-role access control (Owner, SupplyController, AssetProtectionRole).",
    auditorBlindspots: "Regulatory single-point-of-failure (NYDFS enforcement shutdown risk) and cross-chain peg wrap mismatch on secondary chains.",
    turnaroundTime: "4 weeks",
    historicalCost: "$60,000 – $100,000",
  },
  "0x6982508145454ce325ddbe47a25d4ec3d2311933": {
    contractName: "Pepe (PEPE)",
    address: "0x6982508145454ce325ddbe47a25d4ec3d2311933",
    historicalAuditor: "Community / Automated Scanners (CertiK Skynet score, Hacken Proof)",
    auditorCertificateLink: "Community Audit & Contract Verification on Etherscan",
    auditorFocus: "ERC-20 basic implementation, ownership renunciation.",
    auditorFindingsSummary: "Clean standard contract, no mint function, ownership renounced.",
    auditorBlindspots: "Early insider sniper clusters holding >20% of supply; multisig key theft (multisig signer threshold reduced from 5/8 to 2/8 in Aug 2023 leading to $15M dump).",
    turnaroundTime: "Hours (automated) or N/A",
    historicalCost: "$5,000 – $15,000",
  },
};

async function main() {
  console.log("================================================================================");
  console.log("VELMERE AUDIT ENGINE VS GLOBAL CERTIFIED FIRMS (BENCHMARK MATRIX)");
  console.log("================================================================================\n");

  const results: any[] = [];

  for (const [address, externalBenchmark] of Object.entries(EXTERNAL_AUDIT_BENCHMARKS)) {
    const t0 = performance.now();
    const velmereReport = buildCanonicalAuditReport({
      reportId: `eval_bench_${address.slice(0, 10)}`,
      contractAddress: address,
      clientEntitlementTier: "advanced",
      locale: "pl",
    });
    const { pdfBytes } = renderCanonicalReportToPdf(velmereReport);
    const durationMs = performance.now() - t0;

    const findingsCount = velmereReport.sections.reduce(
      (acc, s) => acc + (s.data?.findings?.length || 0),
      0
    );
    const metricsCount = velmereReport.sections.reduce(
      (acc, s) => acc + (s.data?.metrics?.length || 0),
      0
    );

    const comparison = {
      contractName: externalBenchmark.contractName,
      address,
      externalAuditor: externalBenchmark.historicalAuditor,
      externalCost: externalBenchmark.historicalCost,
      externalTurnaround: externalBenchmark.turnaroundTime,
      externalFocus: externalBenchmark.auditorFocus,
      externalBlindspots: externalBenchmark.auditorBlindspots,
      velmereRiskScore: `${velmereReport.verdict.riskScore}/100 (${velmereReport.verdict.riskLabel})`,
      velmereConfidence: `${velmereReport.verdict.confidenceScore}%`,
      velmereCoverage: `${velmereReport.verdict.evidenceCoverage}%`,
      velmereFindings: findingsCount,
      velmereMetrics: metricsCount,
      velmereSections: velmereReport.sections.length,
      velmerePdfSizeBytes: pdfBytes.length,
      velmereExecutionTimeMs: durationMs.toFixed(2),
      velmereDigest: velmereReport.reportDigest,
    };

    results.push(comparison);

    console.log(`[CONTRACT]: ${externalBenchmark.contractName}`);
    console.log(`  - External Auditor: ${externalBenchmark.historicalAuditor}`);
    console.log(`  - External Cost / Time: ${externalBenchmark.historicalCost} | ${externalBenchmark.turnaroundTime}`);
    console.log(`  - External Blindspots: ${externalBenchmark.auditorBlindspots}`);
    console.log(`  - Velmere Risk Verdict: ${comparison.velmereRiskScore} [Confidence: ${comparison.velmereConfidence}, Coverage: ${comparison.velmereCoverage}]`);
    console.log(`  - Velmere Findings: ${findingsCount} findings across ${velmereReport.sections.length} analytical sections`);
    console.log(`  - Velmere Generated PDF: ${pdfBytes.length} bytes in ${comparison.velmereExecutionTimeMs} ms`);
    console.log(`  - Velmere Cryptographic Digest: ${comparison.velmereDigest}`);
    console.log("--------------------------------------------------------------------------------");
  }

  console.log("\nSummary of all evaluations completed successfully!");
}

main().catch(console.error);
