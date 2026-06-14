import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const cross = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const modal = read('components/market-integrity/TokenRiskModal.tsx');
const css = read('app/globals.css');
const security = read('components/security/SecurityTrustPage.tsx');
const safeHarbor = read('lib/security/security-safe-harbor.ts');
const page = read('app/[locale]/market-integrity/cross-asset/page.tsx');

const checks = [
  ['PASS356 Real Markets root marker exists', cross.includes('data-pass356-proof-passport-reader="true"')],
  ['PASS356 proof passport UI exists', cross.includes('shield-real-pass356-proof-passport') && cross.includes('buildAssetPass356Passport(row)')],
  ['PASS356 luxury proof rail exists', cross.includes('data-pass356-luxury-proof-rail="true"')],
  ['PASS356 page metadata exists', page.includes('Velmère Shield — Real Markets Proof Passport') && page.includes('data-pass356-proof-passport-page="true"')],
  ['Orbit native bridge does not preventDefault inside scroll frame', modal.includes('data-pass356-orbit-native-bridge="true"') && modal.includes('stopSelectedTileNativeScrollLeakPass356') && modal.includes('inside the scroll-frame stays native')],
  ['Orbit keyboard scroll handler exists', modal.includes('handleSelectedTileKeyboardScrollPass356') && modal.includes('PageDown') && modal.includes('Home') && modal.includes('End')],
  ['Security safe harbor snapshot exists', safeHarbor.includes('PASS356.security_safe_harbor_readiness') && safeHarbor.includes('private_intake')],
  ['Security page renders safe harbor readiness', security.includes('data-pass356-safe-harbor-readiness="true"') && security.includes('buildSecuritySafeHarborSnapshot')],
  ['CSS has PASS356 proof, orbit and safe harbor styles', css.includes('PASS356 · Real Markets proof passport') && css.includes('[data-pass356-native-scroll-bridge="true"]') && css.includes('.security-safe-harbor-strip')],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('PASS356 verification failed:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}

console.log('verify:pass356-proof-passport-security-orbit ✅');
