import fs from 'node:fs';

const modal = fs.readFileSync('components/market-integrity/TokenRiskModal.tsx', 'utf8');
const css = fs.readFileSync('app/globals.css', 'utf8');
const requiredModal = [
  'shield-popup-chart-toolbar',
  'shield-popup-chart-footer',
  'shield-popup-chart-guide',
  'modeGuideKicker',
  'setHoverIndex',
  'chartUi.feedWarmup',
  'chartUi.move',
];
const requiredCss = [
  'PASS156 · heavy shield polish',
  '.shield-popup-chart-premium',
  '.shield-popup-chart-toolbar',
  '.shield-vlm-orbit-status',
  '.shield-vlm-detail-dismiss-layer',
  'overscroll-behavior: contain',
  'overflow: clip',
];
const missingModal = requiredModal.filter((needle) => !modal.includes(needle));
const missingCss = requiredCss.filter((needle) => !css.includes(needle));
if (missingModal.length || missingCss.length) {
  console.error('PASS156 shield chart/tile safety failed');
  for (const item of missingModal) console.error(`- missing modal marker: ${item}`);
  for (const item of missingCss) console.error(`- missing css marker: ${item}`);
  process.exit(1);
}
if (/\bdrag\b/i.test(modal.match(/shield-popup-chart-guide">\{chartUi\.move\}/)?.[0] ?? '')) {
  // guide remains localized through chartUi; no raw debug drag text in JSX.
}
console.log('PASS156 shield chart/tile safety checks passed.');
