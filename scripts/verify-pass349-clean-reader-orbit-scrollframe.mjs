import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const cross = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const modal = read('components/market-integrity/TokenRiskModal.tsx');
const css = read('app/globals.css');

const checks = [
  ['Real Markets has PASS349 clean reader marker', cross.includes('data-pass349-clean-reader="true"')],
  ['Real Markets provider contract is collapsed behind details', cross.includes('data-pass349-provider-collapsed="true"') && cross.includes('<summary>Provider contract · źródła i statusy</summary>')],
  ['Asset cards hide source lanes behind details', cross.includes('data-pass349-clean-details="true"') && cross.includes('<summary>Źródła i następny krok</summary>')],
  ['Exchange cards hide adapter metrics behind details', cross.includes('data-pass349-exchange-checks="true"')],
  ['Second source technical flow is collapsed', cross.includes('data-pass349-second-source-clean="true"')],
  ['Orbit drawer uses PASS349 scroll-frame marker', modal.includes('data-pass349-orbit-scroll-frame="true"') && modal.includes('shield-vlm-detail-scroll-frame-pass349')],
  ['Orbit drawer trims heavy operator dumps from public drawer', modal.includes('data-pass349-public-drawer-trim="true"') && css.includes('.shield-vlm-report-capsule')],
  ['CSS defines PASS349 detail cards', css.includes('shield-real-card-details-pass349') && css.includes('shieldPass349DetailsReveal')],
  ['CSS defines PASS349 scroll sandbox', css.includes('shield-vlm-detail-scroll-frame-pass349') && css.includes('touch-action: pan-y')],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('PASS349 verification failed:');
  for (const [label] of failed) console.error(`- ${label}`);
  process.exit(1);
}

console.log('PASS349 clean reader + orbit scroll-frame guard passed.');
