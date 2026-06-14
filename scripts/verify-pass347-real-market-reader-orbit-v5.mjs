import { readFileSync } from 'node:fs';

const crossAsset = readFileSync('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'utf8');
const tokenModal = readFileSync('components/market-integrity/TokenRiskModal.tsx', 'utf8');
const css = readFileSync('app/globals.css', 'utf8');

const crossAssetNeedles = [
  ['data-pass347-public-reader-terminal="true"', 'Real Markets must expose PASS347 reader terminal marker'],
  ['data-pass347-human-reader-primer="true"', 'Real Markets must explain source/risk/second-source in human copy'],
  ['function RealMarketCategorySection', 'Real Markets must be grouped by category sections'],
  ['data-pass347-category-section="true"', 'Category sections must render real-market cards'],
  ['data-pass347-no-horizontal-real-tables="true"', 'Real Market terminal must avoid horizontal tables'],
  ['https://logo.clearbit.com/binance.com', 'Exchange logos must be mapped'],
  ['https://logo.clearbit.com/mexc.com', 'MEXC logo must be mapped'],
  ['Po ludzku: system nie ufa jednej giełdzie', 'Second source explainer must be human-readable'],
];

for (const [needle, message] of crossAssetNeedles) {
  if (!crossAsset.includes(needle)) throw new Error(`${message}: missing ${needle}`);
}

for (const id of ['global-risk', 'universal-assets', 'asset-tables', 'ftx-patterns']) {
  const pattern = new RegExp(`<div\\s+hidden[\\s\\S]{0,80}id=\"${id}\"`);
  if (!pattern.test(crossAsset)) {
    throw new Error(`Legacy table ${id} must be hard-hidden with the hidden attribute.`);
  }
}

const cssNeedles = [
  ['.shield-real-reader-primer', 'Reader primer CSS missing'],
  ['.shield-real-category-stack', 'Category stack CSS missing'],
  ['.shield-real-category-section', 'Category section CSS missing'],
  ['overflow-x: clip !important', 'Public reader must prevent horizontal overflow'],
  ['.shield-real-markets-table-page[data-pass347-public-reader-terminal="true"] [hidden]', 'Legacy hidden tables must be enforced in CSS'],
  ['.shield-vlm-detail-panel-portal.shield-vlm-detail-panel-pass347[data-pass347-orbit-scroll-native="true"]', 'Orbit PASS347 native scroll CSS missing'],
  ['animation: vlmDetailSlideFromRightPass325 1280ms', 'Orbit drawer reveal must be slower and premium'],
];

for (const [needle, message] of cssNeedles) {
  if (!css.includes(needle)) throw new Error(`${message}: missing ${needle}`);
}

const tokenNeedles = [
  ['shield-vlm-detail-panel-pass347', 'TokenRiskModal must attach PASS347 drawer class'],
  ['data-pass347-orbit-scroll-native="true"', 'Orbit drawer must expose PASS347 native scroll marker'],
  ['nearestScrollZone', 'Wheel handler must route deltas to the nearest scroll zone'],
  ['Math.max(0, scrollTarget.scrollTop + event.deltaY)', 'Wheel handler must clamp scroll direction safely'],
  ['onTouchMove={(event) => event.stopPropagation()}', 'Touch scroll must not leak to Orbit/body'],
];

for (const [needle, message] of tokenNeedles) {
  if (!tokenModal.includes(needle)) throw new Error(`${message}: missing ${needle}`);
}

if ((crossAsset.match(/Stability: wyżej = lepiej/g) || []).length > 1) {
  throw new Error('Stability explanation is repeated too many times in public JSX. Keep it only in header.');
}

console.log('verify:pass347-real-market-reader-orbit-v5 ✅');
