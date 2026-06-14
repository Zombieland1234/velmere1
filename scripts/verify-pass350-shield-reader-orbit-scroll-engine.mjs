import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const cross = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const modal = read('components/market-integrity/TokenRiskModal.tsx');
const css = read('app/globals.css');
const page = read('app/[locale]/market-integrity/cross-asset/page.tsx');

const checks = [
  ['Real Markets has PASS350 shield reader marker', cross.includes('data-pass350-shield-reader="true"')],
  ['Real Markets executive ribbon explains card/second-source/detail contract', cross.includes('data-pass350-executive-ribbon="true"') && cross.includes('1</b> karta')],
  ['Asset cards have Shield-like decision strip instead of table wall', cross.includes('data-pass350-decision-strip="true"') && cross.includes('szczegóły źródeł są w rozwinięciu')],
  ['Exchange cards have clean collapsed adapter checks', cross.includes('data-pass350-exchange-clean="true"') && cross.includes('data-pass350-exchange-checks="collapsed"')],
  ['Second source has human explanation and clean boundary', cross.includes('data-pass350-second-source-clean="true"') && cross.includes('shield-real-divergence-human-line-pass350')],
  ['Orbit drawer has PASS350 scroll engine marker', modal.includes('data-pass350-orbit-scroll-engine="true"')],
  ['Orbit wheel is always routed into scroll frame and prevents body leaks', modal.includes('routeSelectedTileDetailScrollPass350(event.deltaY)') && modal.includes('event.preventDefault();')],
  ['Orbit touch scroll is routed into the same scroll frame', modal.includes('onTouchStartCapture') && modal.includes('onTouchMoveCapture') && modal.includes('previousY - nextY')],
  ['Orbit scroll-frame has ref and PASS350 marker', modal.includes('ref={selectedTileDetailScrollFrameRef}') && modal.includes('data-pass350-orbit-scroll-frame="true"')],
  ['CSS defines PASS350 card and scroll engine styles', css.includes('PASS350 · Shield-like Real Markets cards') && css.includes('touch-action: none !important') && css.includes('shield-real-pass350-executive-ribbon')],
  ['Cross asset page copy was updated to reader language', page.includes('Velmère Shield — Real Markets Reader') && page.includes('bez bocznego scrolla')],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('PASS350 verification failed:');
  for (const [label] of failed) console.error(`- ${label}`);
  process.exit(1);
}

console.log('PASS350 shield reader + orbit scroll engine guard passed.');
