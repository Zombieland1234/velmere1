import fs from 'node:fs';

const checks = [
  {
    file: 'components/market-integrity/ShieldMapClient.tsx',
    must: ['data-pass362-legacy-scroll-resync="disabled-close-on-scroll"', 'data-pass361-viewport-search-portal="true"'],
  },
  {
    file: 'components/market-integrity/MarketIntegrityClient.tsx',
    must: ['data-pass365-local-first-shield-search="true"', 'Live API resolution is reserved for submit/scan'],
  },
  {
    file: 'components/market-integrity/CrossAssetCollapseRadarPanel.tsx',
    must: ['type RealMarketTimeframe = "1H" | "4H" | "1D" | "1W"', 'real-markets-pass365-timeframe-row', 'data-pass365-original-logo-fallback="true"'],
  },
  {
    file: 'app/globals.css',
    must: ['PASS365 · Real Markets chart parity', '.real-markets-pass365-timeframe-row', 'data-pass365-real-logo-fallback'],
  },
];

const failures = [];
for (const check of checks) {
  const text = fs.readFileSync(check.file, 'utf8');
  for (const marker of check.must) {
    if (!text.includes(marker)) failures.push(`${check.file} missing ${marker}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('PASS365 build/search/real-markets guard passed');
