import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const cross = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const css = read('app/globals.css');
const pkg = read('package.json');

const checks = [
  ['PASS357 fallback logo helper exists', cross.includes('buildFallbackLogoDataUri')],
  ['PASS357 NVDA and gold fallback badges exist', cross.includes("NVDA: buildFallbackLogoDataUri") && cross.includes("'XAU/USD': buildFallbackLogoDataUri")],
  ['PASS357 assetVisual exposes data-symbol markers', cross.includes('data-pass357-logo-upgrade="true"') && cross.includes('data-symbol={key}')],
  ['PASS357 universal assets compact snapshot exists', cross.includes('data-pass357-universal-card-grid="true"') && cross.includes('Universal Asset Snapshot — bez szerokiej tabeli')],
  ['PASS357 CSS width repair and logo rescue exists', css.includes('PASS357 · universal snapshot cards, width repair and logo rescue') && css.includes('.shield-real-pass357-universal-intro')],
  ['PASS357 package script registered', pkg.includes('verify:pass357-market-width-logo-grid')],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('PASS357 verification failed:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}

console.log('verify:pass357-market-width-logo-grid ✅');
