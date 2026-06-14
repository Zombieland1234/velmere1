import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const cross = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const modal = read('components/market-integrity/TokenRiskModal.tsx');
const css = read('app/globals.css');
const page = read('app/[locale]/market-integrity/cross-asset/page.tsx');
const pkg = JSON.parse(read('package.json'));

const checks = [
  ['PASS352 Real Markets root is marked as shield-grade reader', cross.includes('data-pass352-shield-grade-reader="true"') && cross.includes('shield-grade reader')],
  ['Real Market cards have Shield-style public strip with source proof and risk labels', cross.includes('data-pass352-shield-card-strip="true"') && cross.includes('assetProofMiniLabel') && cross.includes('assetRiskReaderLabel')],
  ['Asset/exchange icons have deterministic glyph fallback if remote logos fail', cross.includes('data-pass352-logo-fallback="true"') && cross.includes('shield-real-logo-glyph') && cross.includes('assetLogoGlyph')],
  ['Card mini chart is visible as a Shield-like market signal instead of wide tables', cross.includes('data-pass352-mini-chart="true"') && cross.includes('kierunek poglądowy + rytm źródła')],
  ['Second source has a three-step human ladder for people to understand the lane', cross.includes('data-pass352-second-source-ladder="true"') && cross.includes('drugi punkt kontroli')],
  ['Exchange cards explain stability once and show missing proof lane cleanly', cross.includes('data-pass352-exchange-ledger="true"') && cross.includes('wyżej = lepsza jakość adaptera')],
  ['Orbit drawer has PASS352 scroll contract markers on panel and inner frame', modal.includes('data-pass352-orbit-scroll-contract="true"') && modal.includes('data-pass352-native-scroll-zone="true"')],
  ['Orbit frame keeps native scroll but stops body/orbit leak', modal.includes('stopOrbitLeakPass352') && modal.includes('inside-frame wheel stays native') && modal.includes('onWheelCapture={stopOrbitLeakPass352}')],
  ['CSS contains PASS352 shield-grade card styles and hides old price/debug row', css.includes('PASS352 · Shield-grade Real Markets cards') && css.includes('.shield-real-card-price-row-pass352') && css.includes('display: none !important')],
  ['CSS contains PASS352 orbit native scroll contract with pan-y and overflow auto', css.includes('shield-vlm-detail-scroll-frame-pass352') && css.includes('touch-action: pan-y !important') && css.includes('overflow-y: auto !important')],
  ['Cross asset page copy announces Shield Reader and no horizontal scroll wall', page.includes('Real Markets Shield Reader.') && page.includes('Bez szerokich tabel')],
  ['Package exposes verify pass352 script', pkg.scripts['verify:pass352-shield-grade-reader-orbit-contract']?.includes('verify-pass352-shield-grade-reader-orbit-contract.mjs')],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('PASS352 verification failed:');
  for (const [label] of failed) console.error(`- ${label}`);
  process.exit(1);
}

console.log('PASS352 shield-grade reader + Orbit scroll contract guard passed.');
