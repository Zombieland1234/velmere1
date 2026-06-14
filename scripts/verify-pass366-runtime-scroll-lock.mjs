import fs from 'node:fs';

const checks = [
  {
    file: 'components/market-integrity/CrossAssetCollapseRadarPanel.tsx',
    must: [
      'function AdvancedMarketCandles({ id, timeframe }: { id: RealMarketIdentity; timeframe: RealMarketTimeframe })',
      'generateCandles(id, timeframe)',
      '[id.key, timeframe]',
      'data-pass366-timeframe-runtime-fix="true"',
    ],
    mustNot: ['function AdvancedMarketCandles({ id }: { id: RealMarketIdentity })'],
  },
  {
    file: 'components/search/VelmereIntelligenceSearchClient.tsx',
    must: [
      'data-pass366-pdf-scroll-freeze="true"',
      'data-pass366-scroll-locked-modal="true"',
      'document.documentElement.style.overflow = "hidden"',
      'document.body.style.position = "fixed"',
      'window.scrollTo(0, scrollY)',
    ],
    mustNot: [],
  },
];

const failures = [];
for (const check of checks) {
  const text = fs.readFileSync(check.file, 'utf8');
  for (const marker of check.must) {
    if (!text.includes(marker)) failures.push(`${check.file} missing ${marker}`);
  }
  for (const marker of check.mustNot ?? []) {
    if (text.includes(marker)) failures.push(`${check.file} still contains ${marker}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('PASS366 runtime/timeframe/pdf-scroll-lock guard passed');
