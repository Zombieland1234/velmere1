import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { resolveSecurityEngine, CanonicalAssetIdentity } from '@/lib/security/engines';
import { buildCanonicalAuditReport } from '@/lib/security/audit-canonical-report';
import { BENCHMARK_30_CONTRACTS } from '@/lib/security/contract-audit-profiles';

console.log('=== STARTING ADVERSARIAL CROSS-ASSET TRUTH & TEASER ISOLATION TEST SUITE ===\n');

// 1. Cross-Asset Boundary Isolation: BTC Native Chain vs EVM Contamination
{
  console.log('1. Testing Native L1 Engine Isolation (BTC, DOGE)...');
  const btcIdentity: CanonicalAssetIdentity = {
    canonicalId: 'bitcoin:native:btc',
    symbol: 'BTC',
    displayName: 'Bitcoin',
    assetClass: 'native_chain',
    networkType: 'utxo',
    chainId: null,
    networkName: 'Bitcoin Mainnet',
    primaryIdentifier: 'BTC',
  };
  const engine = resolveSecurityEngine(btcIdentity);
  assert.equal(engine.assetClass, 'native_chain');
  const btcSections = engine.generateSections({ asset: btcIdentity, locale: 'en' });
  const allBtcText = JSON.stringify(btcSections);
  const forbiddenEvmPatterns = [
    /\breentrancy\b/i,
    /\berc20\b/i,
    /\bdelegatecall\b/i,
    /\bsolidity\b/i,
    /\bselfdestruct\b/i,
    /\bstorage slot\b/i,
  ];
  for (const pattern of forbiddenEvmPatterns) {
    const match = allBtcText.match(pattern);
    assert.equal(match, null, 'Contamination in BTC report: ' + pattern);
  }
  console.log('  ✓ BTC report has ZERO EVM contamination.');
}

// 2. Cross-Asset Boundary Isolation: AAPL Traditional Market Asset vs Blockchain Contamination
{
  console.log('2. Testing Traditional Equity Isolation (AAPL, NVDA)...');
  const aaplIdentity: CanonicalAssetIdentity = {
    canonicalId: 'nasdaq:equity:AAPL',
    symbol: 'AAPL',
    displayName: 'Apple Inc.',
    assetClass: 'market_asset',
    networkType: 'traditional_market',
    chainId: null,
    networkName: 'NASDAQ',
    primaryIdentifier: 'AAPL',
  };
  const engine = resolveSecurityEngine(aaplIdentity);
  assert.equal(engine.assetClass, 'market_asset');
  const aaplSections = engine.generateSections({ asset: aaplIdentity, locale: 'en' });
  const allAaplText = JSON.stringify(aaplSections);
  const forbiddenCryptoPatterns = [
    /\bblockchain\b/i,
    /\bmempool\b/i,
    /\bvalidator set\b/i,
    /\bproof-of-work\b/i,
    /\bproof-of-stake\b/i,
    /\breentrancy\b/i,
    /\berc20\b/i,
    /\bsolidity\b/i,
  ];
  for (const pattern of forbiddenCryptoPatterns) {
    const match = allAaplText.match(pattern);
    assert.equal(match, null, 'Contamination in AAPL report: ' + pattern);
  }
  console.log('  ✓ AAPL report has ZERO blockchain/smart-contract contamination.');
}

// 3. Mode B Procedural Teaser Isolation: EVM Contract Locked Sections
{
  console.log('3. Testing Mode B Procedural Teasers in Basic Tier...');
  const usdtProfile = BENCHMARK_30_CONTRACTS['0xdac17f958d2ee523a2206206994597c13d831ec7'];
  assert.ok(usdtProfile, 'USDT profile must exist');
  const basicReport = buildCanonicalAuditReport({
    contractAddress: usdtProfile.contractAddress,
    contractName: usdtProfile.contractName,
    network: usdtProfile.network,
    chainId: usdtProfile.chainId,
    tokenSymbol: usdtProfile.tokenSymbol,
    locale: 'en',
  }, 'basic');
  const lockedSections = basicReport.sections.filter((s) => s.isLocked);
  assert.ok(lockedSections.length >= 6);
  for (const sec of lockedSections) {
    assert.ok(sec.sampleSummaryLines && sec.sampleSummaryLines.length > 0);
    for (const line of sec.sampleSummaryLines) {
      const numberMatch = line.match(/\b\d{2,}\b/);
      assert.equal(numberMatch, null, 'Teaser line contains number: ' + line);
      const addressMatch = line.match(/0x[a-fA-F0-9]{40}/);
      assert.equal(addressMatch, null, 'Teaser line contains address: ' + line);
      assert.equal(/Gnosis Safe/i.test(line), false);
      assert.equal(/TimelockController/i.test(line), false);
      assert.equal(/Unicrypt/i.test(line), false);
      assert.equal(/Chainlink Price Feeds/i.test(line), false);
      assert.equal(/2-z-3/i.test(line), false);
      assert.equal(/48h\b/i.test(line), false);
      assert.equal(/1,420,000/i.test(line), false);
    }
  }
  console.log('  ✓ Basic tier Mode B locked section teasers contain ZERO numbers, addresses, or mock strings.');
}

// 4. Physical 50 Production PDFs & Manifest Integrity
{
  console.log('4. Testing Physical 50 Production PDFs & Manifest Invariants...');
  const pdfDir = path.resolve(process.cwd(), 'dowody/pdfs');
  const filesOnDisk = fs.readdirSync(pdfDir).filter((f) => f.endsWith('.pdf'));
  assert.equal(filesOnDisk.length, 50, 'dowody/pdfs directory MUST contain exactly 50 PDF files');
  const manifestPath = path.resolve(process.cwd(), 'dowody/rejestr_50_wygenerowanych_pdf.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  assert.equal(manifest.totalGenerated, 50);
  assert.equal(manifest.items.length, 50);
  for (const item of manifest.items) {
    const fullPath = path.resolve(process.cwd(), item.relativeFilePath);
    assert.ok(fs.existsSync(fullPath));
    const fileBuffer = fs.readFileSync(fullPath);
    const calculatedSha256 = 'sha256:' + crypto.createHash('sha256').update(fileBuffer).digest('hex');
    assert.equal(calculatedSha256, item.sha256, 'SHA-256 seal mismatch for ' + item.fileName);
    const header = fileBuffer.subarray(0, 16).toString('binary');
    assert.ok(header.startsWith('%PDF-1.7'), 'Must declare %PDF-1.7 header');
    assert.ok(item.evidenceCoverage >= 0 && item.evidenceCoverage <= 100);
  }
  console.log('  ✓ Exactly 50 PDF files verified on disk with 100% SHA-256 seals and %PDF-1.7 headers.');
}

// 5. Text Manifest Truth Alignment
{
  console.log('5. Testing dowody/raport_50_wygenerowanych_pdf.txt formatting truth...');
  const txtContent = fs.readFileSync(path.resolve(process.cwd(), 'dowody/raport_50_wygenerowanych_pdf.txt'), 'utf-8');
  assert.ok(txtContent.includes('PDF-1.7'), 'TXT summary must declare PDF-1.7');
  assert.equal(txtContent.includes('PDF-1.4'), false, 'TXT summary must NOT claim PDF-1.4');
  const highPercentageMatch = txtContent.match(/\b([1-9][0-9]{3,})%/);
  assert.equal(highPercentageMatch, null, 'Found quadruple digit percentage in summary TXT');
  console.log('  ✓ TXT summary accurately reflects PDF-1.7 and sane percentage coverage.');
}

console.log('\n=== ALL ADVERSARIAL INTEGRITY TESTS PASSED WITH ZERO VIOLATIONS! PASS ===\n');
