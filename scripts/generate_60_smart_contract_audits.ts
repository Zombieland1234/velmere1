/**
 * Velmère Furnace — 60 Smart Contract Audit Generator & Matrix Attestor (Phase 40, Overrides 30, 31)
 *
 * Generates 60 institutional smart contract audit reports:
 * 20 verified EVM targets x 3 tiers (Basic, Pro, Advanced).
 *
 * Strictly enforces:
 * - Domain: EVM smart contracts ONLY (no TradFi / no native chains).
 * - Reality: SHA256(pdfBytes) == finalPdfSha256.
 * - Anti-fabrication: ZERO synthetic reviewers (strictly AUTOMATED_ONLY).
 * - Independent verification: verifyAuditArtifact passes for every single report.
 * - Emits artifacts/audit_engine_master_matrix.json.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import {
  buildCanonicalAuditReport,
  renderCanonicalReportToPdf,
  type CanonicalAuditReport,
  type CanonicalTier,
} from '../lib/security/audit-canonical-report';
import { assertZeroMockLeakage } from '../lib/security/mock-leakage-guard';
import { verifyAuditArtifact } from './qa/verify-audit-artifact';

interface TargetContract {
  id: string;
  name: string;
  symbol: string;
  address: string;
  network: string;
  chainId: string;
  locale: 'en' | 'pl';
}

const CANONICAL_20_TARGETS: TargetContract[] = [
  { id: 'usdt', name: 'Tether USD Contract', symbol: 'USDT', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', network: 'Ethereum Mainnet', chainId: '1', locale: 'pl' },
  { id: 'usdc', name: 'USD Coin Contract', symbol: 'USDC', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', network: 'Ethereum Mainnet', chainId: '1', locale: 'pl' },
  { id: 'wbnb', name: 'Wrapped BNB Contract', symbol: 'WBNB', address: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', network: 'BNB Smart Chain (BSC)', chainId: '56', locale: 'pl' },
  { id: 'cake_router', name: 'PancakeSwap Router v2', symbol: 'PANCAKE-ROUTER', address: '0x10ed43c718714eb63d5aa57b78b54704e256024e', network: 'BNB Smart Chain (BSC)', chainId: '56', locale: 'pl' },
  { id: 'uni_v3_router', name: 'Uniswap v3 SwapRouter02', symbol: 'UNI-ROUTER3', address: '0xe592427a0aece92de3edee1f18e0157c05861564', network: 'Ethereum Mainnet', chainId: '1', locale: 'en' },
  { id: 'dai', name: 'MakerDAO Dai Stablecoin', symbol: 'DAI', address: '0x6b175474e89094c44da98b954eedeac495271d0f', network: 'Ethereum Mainnet', chainId: '1', locale: 'en' },
  { id: 'link_erc20', name: 'Chainlink Token ERC-20', symbol: 'LINK', address: '0x514910771af9ca656af840dff83e8264ecf986ca', network: 'Ethereum Mainnet', chainId: '1', locale: 'en' },
  { id: 'pepe', name: 'Pepe Memecoin Contract', symbol: 'PEPE', address: '0x6982508145454ce325ddbe47a25d4ec3d2311933', network: 'Ethereum Mainnet', chainId: '1', locale: 'en' },
  { id: 'shib', name: 'Shiba Inu Token Contract', symbol: 'SHIB', address: '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce', network: 'Ethereum Mainnet', chainId: '1', locale: 'en' },
  { id: 'aave_v3', name: 'Aave v3 Lending Pool', symbol: 'AAVE-V3-POOL', address: '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2', network: 'Ethereum Mainnet', chainId: '1', locale: 'en' },
  { id: 'steth', name: 'Lido Staked ETH Protocol', symbol: 'stETH', address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84', network: 'Ethereum Mainnet', chainId: '1', locale: 'en' },
  { id: 'curve_3crv', name: 'Curve Finance 3pool', symbol: '3CRV', address: '0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7', network: 'Ethereum Mainnet', chainId: '1', locale: 'en' },
  { id: 'arb_inbox', name: 'Arbitrum Delayed Inbox', symbol: 'ARB-INBOX', address: '0x4dbd4fc535bd2916850904481a1be141421bd113', network: 'Ethereum Mainnet', chainId: '1', locale: 'en' },
  { id: 'safe_l2', name: 'Gnosis Safe L2 Multi-sig', symbol: 'SAFE-L2', address: '0x3e5c63644e683549055b9be8653de26e0b4cd36e', network: 'Arbitrum One', chainId: '42161', locale: 'en' },
  { id: 'cusdc', name: 'Compound Finance cUSDC v2', symbol: 'cUSDC', address: '0x39aa39c021dfbae8fac545936693ac917d5e7563', network: 'Ethereum Mainnet', chainId: '1', locale: 'en' },
  { id: 'safemoon', name: 'SafeMoon Token Contract', symbol: 'SAFEMOON', address: '0x8076c74c5e3f5852037f31ff0093eeb8c8add8d3', network: 'BNB Smart Chain (BSC)', chainId: '56', locale: 'en' },
  { id: 'floki', name: 'Floki Inu Utility Token', symbol: 'FLOKI', address: '0xcf0c122c6b73380e22f281e8fc6d5b0c9509a5ff', network: 'Ethereum Mainnet', chainId: '1', locale: 'en' },
  { id: 'snx', name: 'Synthetix Network Token', symbol: 'SNX', address: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f', network: 'Ethereum Mainnet', chainId: '1', locale: 'en' },
  { id: 'blur', name: 'Blur Marketplace Exchange', symbol: 'BLUR-EXCHANGE', address: '0x000000000000ad05ccc4f10045630fb830b95127', network: 'Ethereum Mainnet', chainId: '1', locale: 'en' },
  { id: 'tornado', name: 'Tornado Cash Router', symbol: 'TORN-ROUTER', address: '0xd90e2f925da726b50c4ed8d0fb90ad053324f31b', network: 'Ethereum Mainnet', chainId: '1', locale: 'en' },
];

const TIERS: CanonicalTier[] = ['basic', 'pro', 'advanced'];

interface MasterMatrixEntry {
  reportId: string;
  targetName: string;
  symbol: string;
  address: string;
  network: string;
  chainId: string;
  tier: CanonicalTier;
  riskScore: number;
  riskLabel: string;
  verdictDecision: string;
  stopSellActive: boolean;
  findingsCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    informational: number;
    total: number;
  };
  formalCoveragePct: number;
  merkleRoot: string;
  jsonFileName: string;
  jsonSha256: string;
  pdfFileName: string;
  pdfSha256: string;
  pdfByteLength: number;
  pageCount: number;
  verifierStatus: 'PASS' | 'FAIL';
  verifierIssuesCount: number;
}

function sha256(buf: Buffer | string): string {
  return createHash('sha256').update(buf).digest('hex');
}

async function runCorpusGeneration() {
  const outputDir = path.join(process.cwd(), 'artifacts', 'corpus_smart_contracts');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Starting institutional generation of 60 smart contract audits (20 targets x 3 tiers)...`);
  const matrix: MasterMatrixEntry[] = [];
  let totalGenerated = 0;
  let totalVerified = 0;

  for (const target of CANONICAL_20_TARGETS) {
    for (const tier of TIERS) {
      const reportInput = {
        contractName: target.name,
        contractAddress: target.address,
        network: target.network,
        chainId: target.chainId,
        tokenSymbol: target.symbol,
        locale: target.locale,
        applicationSurface: 'canonical' as const,
        humanReviewer: undefined, // strictly AUTOMATED_ONLY under V3 truth model
      };

      const report = buildCanonicalAuditReport(reportInput, tier);

      // Verify zero mock leakage
      assertZeroMockLeakage(report, {
        allowKnownFixtures: false,
        strictMode: true,
      });

      // Render PDF
      const { pdfBytes, pdfDigest, pdfByteLength, pageCount } = renderCanonicalReportToPdf(report);

      // Verify byte-level integrity
      const realPdfSha256 = sha256(pdfBytes);
      const cleanPdfDigest = pdfDigest.replace(/^sha256:/, '');
      if (realPdfSha256 !== cleanPdfDigest) {
        throw new Error(
          `[FAIL-CLOSED CRYPTO INTEGRITY] PDF hash mismatch for ${target.symbol} (${tier}): calculated ${realPdfSha256} vs returned ${cleanPdfDigest}`
        );
      }

      // Save files
      const baseFilename = `${target.id}_${tier}`;
      const jsonFileName = `${baseFilename}.json`;
      const pdfFileName = `${baseFilename}.pdf`;

      const jsonPath = path.join(outputDir, jsonFileName);
      const pdfPath = path.join(outputDir, pdfFileName);

      const jsonContent = JSON.stringify(report, null, 2);
      fs.writeFileSync(jsonPath, jsonContent, 'utf-8');
      fs.writeFileSync(pdfPath, pdfBytes);

      // Run independent adversarial verification
      const verifyResult = verifyAuditArtifact(jsonPath, pdfPath);
      if (!verifyResult.isValid) {
        console.error(`Verification FAILED for ${jsonFileName}:`, verifyResult.issues);
        throw new Error(`Independent verification rejected ${jsonFileName}`);
      }
      totalVerified++;

      // Aggregate finding counts
      const findings = report.sections?.flatMap((s: any) => s.data?.findings || []) || [];
      const counts = {
        critical: findings.filter((f: any) => f.severity === 'critical').length,
        high: findings.filter((f: any) => f.severity === 'high').length,
        medium: findings.filter((f: any) => f.severity === 'medium').length,
        low: findings.filter((f: any) => f.severity === 'low').length,
        informational: findings.filter((f: any) => f.severity === 'informational').length,
        total: findings.length,
      };

      matrix.push({
        reportId: report.reportId,
        targetName: target.name,
        symbol: target.symbol,
        address: target.address,
        network: target.network,
        chainId: target.chainId,
        tier,
        riskScore: report.verdict.riskScore,
        riskLabel: report.verdict.riskLabel,
        verdictDecision: report.verdict.releaseDecision,
        stopSellActive: report.verdict.stopSellActive,
        findingsCount: counts,
        formalCoveragePct: report.verdict.formalProofCoveragePct,
        merkleRoot: report.merkleRoot,
        jsonFileName,
        jsonSha256: sha256(jsonContent),
        pdfFileName,
        pdfSha256: realPdfSha256,
        pdfByteLength,
        pageCount,
        verifierStatus: verifyResult.isValid ? 'PASS' : 'FAIL',
        verifierIssuesCount: verifyResult.issues.length,
      });

      totalGenerated++;
      process.stdout.write(`.`);
    }
  }

  console.log(`\nCorpus generation complete: ${totalGenerated}/60 audits generated and verified.`);

  // Write Master Matrix
  const matrixPath = path.join(process.cwd(), 'artifacts', 'audit_engine_master_matrix.json');
  fs.writeFileSync(
    matrixPath,
    JSON.stringify(
      {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        masterMatrixVersion: '4.0.0-rc3',
        generator: 'Velmère Furnace Master Corpus Engine',
        timestamp: new Date().toISOString(),
        summary: {
          totalTargets: CANONICAL_20_TARGETS.length,
          totalReportsGenerated: totalGenerated,
          totalVerifiedPassing: totalVerified,
          tiersPerTarget: TIERS.length,
          cryptographicIntegrity: '100%_BYTE_VERIFIED',
          syntheticReviewers: 0,
        },
        matrix,
      },
      null,
      2
    )
  );

  console.log(`Saved master matrix to ${matrixPath}`);
}

runCorpusGeneration().catch((err) => {
  console.error(`FATAL generation failure:`, err);
  process.exit(1);
});
