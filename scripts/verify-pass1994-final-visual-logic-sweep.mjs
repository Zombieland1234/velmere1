import { readFileSync, existsSync } from 'node:fs';

const checks = [
  ['components/market-integrity/UnifiedAssetAnalysisControls.tsx', 'data-pass1994-modal="final-visual-audit-five-clean-windows"'],
  ['components/market-integrity/UnifiedAssetAnalysisControls.tsx', 'data-pass1994-depth-dock="separate-right-actions-locked-height"'],
  ['components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'PASS1994_REAL_MARKET_ALIASES'],
  ['components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'manualAliasAssets'],
  ['lib/market-integrity/asset-logo-resolver.ts', 'baseSymbolKey'],
  ['app/globals.css', 'PASS1994 — full visual/logical sweep'],
  ['app/globals.css', 'grid-template-columns:\n    minmax(10.8rem, 1.48fr)'],
  ['app/globals.css', 'velmere-asset-logo img.is-loaded + span'],
  ['app/globals.css', 'shield-table-scroll-x thead button'],
  ['app/globals.css', 'velmere-side-drawer-backdrop[data-velmere-drawer-backdrop-surface="main-menu"]'],
];

let failures = 0;
for (const [file, needle] of checks) {
  if (!existsSync(file)) {
    console.error(`[FAIL] missing ${file}`);
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

const controls = readFileSync('components/market-integrity/UnifiedAssetAnalysisControls.tsx', 'utf8');
const testIdCount = (controls.match(/testIdPrefix\?: string;/g) ?? []).length;
if (testIdCount !== 1) {
  console.error(`[FAIL] testIdPrefix prop count ${testIdCount}, expected 1`);
  failures++;
} else {
  console.log('[OK] no duplicate testIdPrefix prop');
}

const realMarkets = readFileSync('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'utf8');
if (/buildPass621MarketSearchResolution\(query, searchUniverse, 8\),\s*\(\) => buildPass621MarketSearchResolution/s.test(realMarkets)) {
  console.error('[FAIL] duplicate useMemo callback for pass621 search is back');
  failures++;
} else {
  console.log('[OK] pass621 search useMemo has one callback');
}
if (!realMarkets.includes('MEXC: ["mexc", "mexc venue", "mexc venue health"')) {
  console.error('[FAIL] MEXC alias lane missing');
  failures++;
} else {
  console.log('[OK] MEXC venue alias lane present');
}

if (failures) process.exit(1);
console.log('PASS1994 final visual/logical sweep verifier OK');
