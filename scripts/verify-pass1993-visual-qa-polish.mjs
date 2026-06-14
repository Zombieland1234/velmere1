import { readFileSync, existsSync } from 'node:fs';

const checks = [
  ['components/market-integrity/UnifiedAssetAnalysisControls.tsx', 'data-pass1993-modal="visual-qa-separated-solid-windows-no-scroll"'],
  ['components/market-integrity/UnifiedAssetAnalysisControls.tsx', 'data-pass1993-depth-dock="short-meta-no-cramped-text"'],
  ['components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'const unit = safeLocale === "pl" ? "pól"'],
  ['components/market-integrity/TokenRiskModal.tsx', 'const unit = auditLocale === "pl" ? "pól"'],
  ['app/globals.css', 'PASS1993 — visual QA pass'],
  ['app/globals.css', 'data-pass1993-modal="visual-qa-separated-solid-windows-no-scroll"'],
  ['app/globals.css', 'shield-sort-header'],
  ['app/globals.css', 'max-width: min(100%, 1120px)'],
  ['app/globals.css', 'background: #090b0f'],
  ['public/market-logos/msft.svg', '<svg'],
  ['public/market-logos/googl.svg', '<svg'],
];

let failures = 0;
for (const [file, needle] of checks) {
  if (!existsSync(file)) {
    console.error(`[FAIL] missing file ${file}`);
    failures++;
    continue;
  }
  const text = readFileSync(file, 'utf8');
  if (!text.includes(needle)) {
    console.error(`[FAIL] ${file} missing ${needle}`);
    failures++;
  } else {
    console.log(`[OK] ${file} contains ${needle}`);
  }
}

const realMarkets = readFileSync('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'utf8');
if (realMarkets.includes('${a.sourceSignals} · VLM Brain')) {
  console.error('[FAIL] Real Markets depth meta still uses long sourceSignals copy');
  failures++;
} else {
  console.log('[OK] Real Markets depth meta is short');
}

const shield = readFileSync('components/market-integrity/TokenRiskModal.tsx', 'utf8');
if (shield.includes('fields · VLM Brain 2')) {
  console.error('[FAIL] Shield depth meta still uses long VLM Brain copy');
  failures++;
} else {
  console.log('[OK] Shield depth meta is short/localized');
}

if (failures) process.exit(1);
console.log('PASS1993 visual QA verifier OK');
