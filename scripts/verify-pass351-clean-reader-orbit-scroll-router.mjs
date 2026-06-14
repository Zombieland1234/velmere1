import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const cross = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const modal = read('components/market-integrity/TokenRiskModal.tsx');
const css = read('app/globals.css');
const page = read('app/[locale]/market-integrity/cross-asset/page.tsx');

const checks = [
  ['Public Real Markets reader hides PASS/debug version in hero', cross.includes('data-pass351-clean-public-reader="true"') && cross.includes('Velmère Real Markets') && cross.includes('<b>public reader</b>') && !cross.includes('PASS350 · Real Markets Reader Pro')],
  ['Asset cards have human reader lens with meaning and missing-data lane', cross.includes('data-pass351-real-market-card="true"') && cross.includes('data-pass351-reader-line="true"') && cross.includes('Co to znaczy') && cross.includes('Brakuje')],
  ['Real Markets terminal keeps crypto separated below the real-market cards', cross.includes('data-pass351-crypto-reference-collapsed="true"') && cross.includes('Crypto Shield reference') && cross.includes('cryptoReferenceRows.map')],
  ['Exchange stability has one human card explanation without repeated stability note', cross.includes('data-pass351-exchange-human-cards="true"') && cross.includes('data-pass351-exchange-human-line="true"')],
  ['Second source cards keep public human boundary marker', cross.includes('data-pass351-second-source-public="true"') && cross.includes('data-pass351-human-boundary="true"')],
  ['Orbit drawer has PASS351 native scroll router marker', modal.includes('data-pass351-orbit-native-scroll-router="true"') && modal.includes('data-pass351-native-scroll-zone="true"')],
  ['Orbit native scroll is allowed inside scroll-frame and only body/orbit leak is stopped', modal.includes('isSelectedTileDetailScrollZonePass351(event.target)') && modal.includes('allow native browser scrolling') && modal.includes('routeSelectedTileDetailScrollPass350(event.deltaY)')],
  ['Orbit scroll-frame no longer forces touch-action none for the new route', css.includes('shield-vlm-detail-scroll-frame-pass351') && css.includes('touch-action: pan-y !important')],
  ['CSS includes PASS351 reader card, exchange, crypto reference and scroll router styles', css.includes('PASS351 · Public Real Markets reader polish') && css.includes('shield-real-card-pass351-reader-line') && css.includes('shield-real-exchange-pass351-human-line') && css.includes('shield-real-crypto-reference-pass351')],
  ['Cross asset page has reader copy and no horizontal table language', page.includes('Real Markets Reader.') && page.includes('Bez szerokich tabel')],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('PASS351 verification failed:');
  for (const [label] of failed) console.error(`- ${label}`);
  process.exit(1);
}

console.log('PASS351 clean reader + native Orbit scroll router guard passed.');
