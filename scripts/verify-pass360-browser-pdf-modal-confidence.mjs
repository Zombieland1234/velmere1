import fs from 'node:fs';

const checks = [
  {
    file: 'components/search/VelmereIntelligenceSearchClient.tsx',
    must: [
      'data-pass360-centered-pdf-modal="true"',
      'data-pass360-compact-multi-results="true"',
      'vlm-browser-pdf-modal-backdrop',
      'vlm-browser-a4-modal-scroll',
      'function closePdfModal()',
      'pdfForgeTimerRef',
      'document.body.style.overflow = "hidden"',
      'hasManyResults ? "vlm-browser-results-compact"',
    ],
    mustNot: ['import { Link } from "@/navigation"'],
  },
  {
    file: 'app/api/search/route.ts',
    must: [
      'function resolveCoinGeckoConfidence',
      'sourceConfidence: confidence',
      'const resultLimit = clean.length <= 1 ? 6 : 12',
      'Lens rozpoznał',
      'rynek live',
    ],
  },
  {
    file: 'app/api/search/lens-report/route.ts',
    must: [
      'async function loadCoinGeckoReportResult',
      'coinToLiveLensResult',
      'const liveResult = await loadCoinGeckoReportResult(query)',
      'resolveLensReport(routeId, query, generatedAt, liveResult)',
      'sourceConfidence: confidence',
    ],
  },
  {
    file: 'app/globals.css',
    must: [
      'PASS360 · Velmère Browser modal PDF forge',
      '.vlm-browser-pdf-modal-backdrop',
      '.vlm-browser-results-compact',
      '.vlm-browser-a4-modal-scroll',
      '.vlm-browser-pdf-forge-stage-list',
    ],
  },
];

let failed = false;
for (const check of checks) {
  const text = fs.readFileSync(check.file, 'utf8');
  for (const needle of check.must ?? []) {
    if (!text.includes(needle)) {
      console.error(`[PASS360] missing ${needle} in ${check.file}`);
      failed = true;
    }
  }
  for (const needle of check.mustNot ?? []) {
    if (text.includes(needle)) {
      console.error(`[PASS360] forbidden ${needle} in ${check.file}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log('PASS360 browser PDF modal + confidence guard passed');
