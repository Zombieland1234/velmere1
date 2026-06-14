import { readFileSync } from 'node:fs';

const crossAsset = readFileSync('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'utf8');
const tokenModal = readFileSync('components/market-integrity/TokenRiskModal.tsx', 'utf8');
const css = readFileSync('app/globals.css', 'utf8');
const page = readFileSync('app/[locale]/market-integrity/cross-asset/page.tsx', 'utf8');

function must(condition, message) {
  if (!condition) throw new Error(message);
}

for (const [needle, message] of [
  ['data-pass348-professional-reader="true"', 'Cross Asset reader must expose PASS348 professional reader marker'],
  ['data-pass348-real-market-reader-pro="true"', 'Real Market terminal must expose PASS348 reader pro marker'],
  ['data-pass348-real-market-card="true"', 'Each real-market row must render as a PASS348 card'],
  ['adapterStateReaderCopy', 'Asset cards must explain provider state in human language'],
  ['assetReaderRole', 'Asset cards must show human role labels for stock/FX/ETF/real estate/commodity'],
  ['secondSourcePlainCopy', 'Second-source cards must include plain-language explanations'],
  ['Drugie źródło — co to znaczy?', 'Second-source public title must be human-readable'],
  ['shield-real-card-source-state', 'Asset cards must show source state without a wide table'],
]) {
  must(crossAsset.includes(needle), `${message}: missing ${needle}`);
}

for (const [needle, message] of [
  ['data-pass348-real-markets-reader-page="true"', 'Cross-asset route must expose PASS348 page marker'],
  ['Real Markets Reader.', 'Route hero must stop advertising the old wide table'],
  ['Bez szerokich tabel', 'Route hero must call out no-wide-table layout'],
]) {
  must(page.includes(needle), `${message}: missing ${needle}`);
}

for (const [needle, message] of [
  ['shield-real-asset-card-pass348', 'PASS348 asset card CSS missing'],
  ['shield-real-card-source-state', 'PASS348 source-state CSS missing'],
  ['shield-real-divergence-human-line', 'PASS348 divergence human line CSS missing'],
  ['shield-vlm-detail-panel-pass348[data-pass348-orbit-native-scroll-v6="true"]', 'PASS348 Orbit native scroll CSS missing'],
  ['animation: vlmDetailSlideFromRightPass325 1480ms', 'PASS348 Orbit drawer reveal must be slower than PASS347'],
]) {
  must(css.includes(needle), `${message}: missing ${needle}`);
}

for (const [needle, message] of [
  ['shield-vlm-detail-panel-pass348', 'Token modal must add PASS348 drawer class'],
  ['data-pass348-orbit-native-scroll-v6="true"', 'Token modal must expose PASS348 native-scroll v6 marker'],
  ['Do not preventDefault on the main drawer', 'Wheel handler must use native panel scroll instead of forcing JS scroll'],
  ['scrollTarget !== panel && maxScroll > 0', 'Wheel handler should only prevent default for nested zones'],
]) {
  must(tokenModal.includes(needle), `${message}: missing ${needle}`);
}

must((crossAsset.match(/<table className="shield-real-market-table/g) || []).length >= 1, 'Legacy hidden tables may remain for compatibility but must stay hidden.');
must(crossAsset.includes('id="global-risk"') && crossAsset.includes('id="universal-assets"'), 'Legacy compatibility anchors must remain hidden for old guards.');

console.log('verify:pass348-real-market-pro-orbit-native ✅');
