import fs from 'node:fs';

const checks = [
  ['components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'data-pass369-unified-market-brain="true"'],
  ['components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'MarketBrainAudit'],
  ['components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'USD/CNH'],
  ['components/search/VelmereIntelligenceSearchClient.tsx', 'data-pass369-pdf-preview-download-parity="true"'],
  ['components/search/VelmereIntelligenceSearchClient.tsx', 'vlm-browser-pass369-page-map'],
  ['app/api/search/lens-report/route.ts', 'reportPdfLabels'],
  ['app/api/search/lens-report/route.ts', 'data-pass369-pdf-locale-parity="true"'],
  ['app/[locale]/research-lab/page.tsx', 'data-pass369-bank-crypto-determinism-lab="true"'],
  ['components/Footer.tsx', 'bez obietnic ceny, zysku lub listingu'],
  ['app/globals.css', 'real-markets-pass369-brain'],
];

let failed = false;
for (const [file, needle] of checks) {
  const body = fs.readFileSync(file, 'utf8');
  if (!body.includes(needle)) {
    console.error(`PASS369 missing marker: ${needle} in ${file}`);
    failed = true;
  }
}

const route = fs.readFileSync('app/api/search/lens-report/route.ts', 'utf8');
if (/executive:\s*labels\./.test(route) || /query:\s*labels\./.test(route)) {
  console.error('PASS369 route has self-referential PDF label copy.');
  failed = true;
}

const client = fs.readFileSync('components/search/VelmereIntelligenceSearchClient.tsx', 'utf8');
if (!client.includes('{a4.legalText}') || !client.includes('{a4.toolbarTitle}')) {
  console.error('PASS369 browser preview is not using locale-aware A4 copy.');
  failed = true;
}

if (failed) process.exit(1);
console.log('PASS369 unified AI brain / PDF parity / real markets guard passed.');
