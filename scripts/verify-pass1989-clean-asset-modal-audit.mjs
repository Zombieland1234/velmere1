#!/usr/bin/env node
import fs from 'node:fs';

const files = {
  shell: 'components/market-integrity/UnifiedAssetAnalysisControls.tsx',
  css: 'app/globals.css',
};

const checks = [
  [files.shell, 'data-pass1989-clean-modal="single-layer-top-actions-chart-only"', 'clean modal marker'],
  [files.shell, 'data-pass1989-modal-body="clean-top-actions-chart-only"', 'clean modal body marker'],
  [files.shell, 'unified-asset-clean-command-row', 'top command row'],
  [files.shell, 'data-pass1989-depth-position="top-right-not-extra-window"', 'depth buttons moved to top rail'],
  [files.shell, 'data-pass1989-chart-stage="one-chart-no-empty-depth-column"', 'chart-only stage'],
  [files.shell, 'data-pass1989-chart-card="only-large-visual-panel"', 'single chart panel marker'],
  [files.shell, 'data-pass1989-details-hidden="source-details-removed-from-public-asset-popup"', 'details tray hidden'],
  [files.css, 'PASS1989 — user screenshot correction', 'PASS1989 css block'],
  [files.css, '.unified-shield-token-popup-shell::before', 'shield pseudo ring suppression'],
  [files.css, '#velmere-real-markets-asset-modal::after', 'real markets pseudo ring suppression'],
  [files.css, 'grid-template-columns: repeat(3, minmax(0, 1fr)) !important;', 'three analysis buttons in one row'],
  [files.css, '@keyframes velmerePass1989DepthJoin', 'depth join animation'],
  [files.css, 'data-pass1989-details-hidden', 'CSS hides legacy details tray'],
  [files.css, 'data-pass1989-chart-card="only-large-visual-panel"', 'CSS targets single large chart'],
];

const failures = [];
for (const [file, needle, label] of checks) {
  const body = fs.readFileSync(file, 'utf8');
  if (!body.includes(needle)) failures.push(`${label}: missing ${needle} in ${file}`);
}

if (failures.length) {
  console.error('PASS1989 clean asset modal audit FAILED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(`PASS1989 clean asset modal audit OK — ${checks.length}/${checks.length} checks`);
