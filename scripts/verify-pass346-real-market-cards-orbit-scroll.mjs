import { readFileSync } from 'node:fs';

function assertContains(file, needle, message) {
  const body = readFileSync(file, 'utf8');
  if (!body.includes(needle)) {
    throw new Error(`${message}: missing ${needle} in ${file}`);
  }
}

const crossAsset = readFileSync('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'utf8');
const tokenModal = readFileSync('components/market-integrity/TokenRiskModal.tsx', 'utf8');
const css = readFileSync('app/globals.css', 'utf8');
const aiCopy = readFileSync('lib/market-integrity/ai-human-copy-engine.ts', 'utf8');
const secondSource = readFileSync('lib/market-integrity/second-source-divergence-matrix.ts', 'utf8');

for (const [needle, message] of [
  ['data-pass346-real-market-cards="true"', 'Real Market terminal must be card based'],
  ['function AssetMarketCard', 'Real-market cards component must exist'],
  ['function ExchangeStabilityCard', 'Exchange stability cards component must exist'],
  ['function SecondSourceCard', 'Second-source reader cards component must exist'],
  ['data-pass346-second-source-reader="true"', 'Second source must use reader UX'],
  ['data-pass346-exchange-cards="true"', 'Exchange stability must not stay horizontal table only'],
  ['https://logo.clearbit.com/apple.com', 'Real stock logos must be mapped'],
  ['https://logo.clearbit.com/lvmh.com', 'Luxury/LVMH proxy logo must be mapped'],
]) {
  if (!crossAsset.includes(needle)) throw new Error(`${message}: missing ${needle}`);
}

for (const [needle, message] of [
  ['shield-real-asset-card-grid', 'Real market cards CSS must exist'],
  ['shield-real-exchange-card-grid', 'Exchange card CSS must exist'],
  ['shield-real-divergence-primer', 'Second-source primer CSS must exist'],
  ['grid-template-columns: repeat(2, minmax(0, 1fr))', 'Real market cards must be responsive grid, not horizontal-only table'],
]) {
  if (!css.includes(needle)) throw new Error(`${message}: missing ${needle}`);
}

for (const [needle, message] of [
  ['data-pass346-orbit-scroll-hardlock="true"', 'Orbit drawer must expose PASS346 hard scroll lock'],
  ['panel.scrollTop += event.deltaY', 'Orbit drawer must manually route wheel deltas to drawer'],
  ['event.preventDefault();', 'Orbit drawer must stop browser/body wheel leak'],
  ['shield-vlm-detail-panel-pass346', 'Orbit drawer PASS346 class must exist'],
]) {
  if (!tokenModal.includes(needle)) throw new Error(`${message}: missing ${needle}`);
}

if ((crossAsset.match(/Stability: wyżej = lepiej/g) || []).length > 1) {
  throw new Error('Stability explanation is repeated too many times in public JSX. Keep it once in header.');
}

if (!secondSource.includes('Dla stocków bot porównuje ruch rynku z raportami i komunikatami')) {
  throw new Error('Stock disclosure divergence must have stock-specific human copy, not reserve copy.');
}

if (!aiCopy.includes('source freshness')) {
  throw new Error('AI human copy engine must keep source freshness dictionary.');
}

console.log('verify:pass346-real-market-cards-orbit-scroll ✅');
