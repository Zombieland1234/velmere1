import fs from 'node:fs';

const checks = [
  ['components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'data-pass354-lux-market-compass="true"'],
  ['components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'shield-real-card-pass354-reader-proof'],
  ['components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'shield-real-pass354-human-translation'],
  ['components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'data-pass354-exchange-ledger="true"'],
  ['components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'Premium rule'],
  ['components/market-integrity/TokenRiskModal.tsx', 'target instanceof Element'],
  ['components/market-integrity/TokenRiskModal.tsx', 'data-pass354-orbit-svg-scroll-router="true"'],
  ['components/market-integrity/TokenRiskModal.tsx', 'data-pass354-native-scroll-zone="true"'],
  ['components/market-integrity/TokenRiskModal.tsx', 'PASS354 marker: every selected tile opens with a focused native scroll frame'],
  ['app/globals.css', 'PASS354 · luxury Real Markets proof-reader + robust Orbit SVG scroll router'],
  ['app/globals.css', '.shield-real-card-pass354-reader-proof'],
  ['app/globals.css', '.shield-vlm-detail-scroll-frame-pass354[data-pass354-native-scroll-zone="true"]'],
];

const failures = [];
for (const [file, needle] of checks) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(needle)) failures.push(`${file} missing: ${needle}`);
}

const css = fs.readFileSync('app/globals.css', 'utf8');
if (/overflow-x:\s*auto[^;]*!important/.test(css) && !css.includes('data-pass354-lux-market-compass')) {
  failures.push('Possible horizontal auto scroll remains without pass354 containment');
}

const modal = fs.readFileSync('components/market-integrity/TokenRiskModal.tsx', 'utf8');
const htmlOnlyChecks = (modal.match(/target instanceof HTMLElement/g) ?? []).length;
if (htmlOnlyChecks > 0) failures.push(`Orbit scroll still has HTMLElement-only target checks: ${htmlOnlyChecks}`);

if (failures.length) {
  console.error('PASS354 verification failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('verify:pass354-lux-market-orbit-scroll-router ✅');
