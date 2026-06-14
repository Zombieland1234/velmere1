import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const cross = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const modal = read('components/market-integrity/TokenRiskModal.tsx');
const css = read('app/globals.css');
const page = read('app/[locale]/market-integrity/cross-asset/page.tsx');
const pkg = JSON.parse(read('package.json'));

const checks = [
  ['PASS353 Real Markets root declares human market compass', cross.includes('data-pass353-market-compass="true"') && cross.includes('Real Markets Compass')],
  ['PASS353 has human compass rail before technical matrices', cross.includes('data-pass353-market-compass-rail="true"') && cross.includes('Jak Velmère tłumaczy real markets bez ściany tabel')],
  ['PASS353 cards add AI takeaway for non-technical readers', cross.includes('data-pass353-human-market-card="true"') && cross.includes('data-pass353-human-takeaway="true"') && cross.includes('assetHumanTakeaway')],
  ['PASS353 exchange cards use one public explanation and keep metrics collapsed', cross.includes('data-pass353-exchange-card="true"') && cross.includes('data-pass353-exchange-one-line="true"') && cross.includes('Adapter checks')],
  ['PASS353 second-source ladder stays human and non-alarmist', cross.includes('data-pass353-second-source-ladder="true"') && cross.includes('braki przed pewnością')],
  ['PASS353 Orbit drawer has document-level scroll router markers', modal.includes('shield-vlm-detail-open-pass353') && modal.includes('document.addEventListener("wheel", handleWheel') && modal.includes('PASS353 marker: document-level Orbit scroll router')],
  ['PASS353 Orbit panel and frame expose boundary/scroll-zone data markers', modal.includes('data-pass353-orbit-scroll-boundary="true"') && modal.includes('data-pass353-native-scroll-zone="true"')],
  ['PASS353 Orbit router preserves native scroll inside scroll-frame and prevents body/orbit leaks outside', modal.includes('if (isScrollZone(event.target))') && modal.includes('routeSelectedTileDetailScrollPass350(event.deltaY)') && modal.includes('event.preventDefault()')],
  ['PASS353 CSS contains market compass, human takeaway and orbit document scroll router', css.includes('PASS353 · Real Markets human compass') && css.includes('.shield-real-market-compass-pass353') && css.includes('.shield-real-card-pass353-human-takeaway') && css.includes('.shield-vlm-detail-open-pass353')],
  ['PASS353 page copy announces Real Markets Compass', page.includes('data-pass353-market-compass-page="true"') && page.includes('Real Markets Compass.')],
  ['Package exposes verify pass353 script', pkg.scripts['verify:pass353-market-compass-orbit-router']?.includes('verify-pass353-market-compass-orbit-router.mjs')],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('PASS353 verification failed:');
  for (const [label] of failed) console.error(`- ${label}`);
  process.exit(1);
}

console.log('PASS353 market compass + Orbit document scroll router guard passed.');
