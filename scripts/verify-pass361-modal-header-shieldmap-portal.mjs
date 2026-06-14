import fs from 'node:fs';

const checks = [
  {
    file: 'components/search/VelmereIntelligenceSearchClient.tsx',
    must: [
      'import { createPortal } from "react-dom";',
      'document.body.dataset.velmerePdfModalOpen = "true"',
      'data-pass361-modal-header-lock="true"',
      'pdfForgeResultId && typeof document !== "undefined" ? createPortal((',
      'pdfPreviewResult && typeof document !== "undefined" ? createPortal((',
      'source stitch · market context · układ A4 · Velmère signature',
    ],
    mustNot: [
      'source stitch · market context · układ A4 · podpis V',
    ],
  },
  {
    file: 'components/market-integrity/ShieldMapClient.tsx',
    must: [
      'import { createPortal } from "react-dom";',
      'data-pass361-shield-map-search-portal="true"',
      'shield-map-token-suggest-portal',
      'data-pass361-viewport-search-portal="true"',
      'createPortal(',
      'document.body',
      'style={{\n                            top: investigatorSuggestFrame?.top',
    ],
  },
  {
    file: 'app/globals.css',
    must: [
      'PASS361 · Browser PDF modal above header',
      'z-index: 2147483647 !important',
      'body[data-velmere-pdf-modal-open="true"] header.fixed',
      'content: none !important',
      '.shield-map-token-suggest-panel[data-pass361-viewport-search-portal="true"]',
      'main[data-pass361-shield-map-search-portal="true"] .luxury-section-wide',
    ],
    mustNot: [
      'content: "min. 5s · source stitch → A4 layout → Velmère signature";',
    ],
  },
];

let failed = false;
for (const check of checks) {
  const text = fs.readFileSync(check.file, 'utf8');
  for (const needle of check.must ?? []) {
    if (!text.includes(needle)) {
      console.error(`[PASS361] missing ${needle} in ${check.file}`);
      failed = true;
    }
  }
  for (const needle of check.mustNot ?? []) {
    if (text.includes(needle)) {
      console.error(`[PASS361] forbidden ${needle} in ${check.file}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log('PASS361 modal header + Shield Map portal guard passed');
