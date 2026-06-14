import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const controls = read('components/market-integrity/UnifiedAssetAnalysisControls.tsx');
const overlay = read('components/ui/OverlayPrimitives.tsx');
const css = read('app/globals.css');
const logos = read('lib/market-integrity/asset-logo-resolver.ts');
const pkg = JSON.parse(read('package.json'));

const results = [];
function check(name, ok) { results.push({ name, ok: Boolean(ok) }); }

check('UnifiedAssetAnalysisControls no duplicate closing brace before timeframe export', !controls.includes('}\n}\n\nexport function UnifiedTimeframeTabs'));
check('PASS1997 modal shell marker exists', controls.includes('data-pass1997-modal="syntax-safe-final-viewport-visual-lock"'));
check('PASS1997 five window markers exist', [
  'header-title-logo-close',
  'metric-strip-three-readable-cards',
  'timeframe-row-contained',
  'chart-window-wide-readable',
  'right-actions-equal-clean',
].every((marker) => controls.includes(`data-pass1997-window="${marker}"`)));
check('PASS1997 stage and depth action markers exist', controls.includes('data-pass1997-stage="desktop-fit-chart-actions-no-scroll"') && controls.includes('data-pass1997-depth-dock="equal-premium-action-cards"') && controls.includes('data-pass1997-action-window="premium-cta-no-cramped-copy"'));
check('PASS1997 CSS viewport lock exists', css.includes('data-pass1997-modal="syntax-safe-final-viewport-visual-lock"') && css.includes('desktop-fit-chart-actions-no-scroll'));
check('PASS1997 header dropdown solid no blur CSS exists', css.includes('#velmere-header-wallet-menu') && css.includes('backdrop-filter: none !important'));
check('PASS1997 overlay runtime markers exist', overlay.includes('data-pass1997-dropdown-runtime="fast-close-stable-position"') && overlay.includes('data-pass1997-drawer-runtime="fast-solid-no-blur-lag"') && overlay.includes('data-pass1997-modal-runtime="syntax-safe-fast-stable-no-scroll-shell"'));
check('PASS1997 drawer transition is faster', overlay.includes('motionPreset === "bottom" ? 0.34 : 0.22') && overlay.includes('transition={{ duration: 0.18'));
check('PASS1997 logo resolver covers additional bluechip, ETF and exchange keys', ['NOVONORDISK','PALOALTONETWORKS','XETRA','KUCOIN','FTX','ARKK','VOO'].every((key) => logos.includes(key)));
check('PASS1997 generated fallback logo files exist', ['nvo','unh','jnj','panw','snow','voo','xetra','kucoin','ftx'].every((file) => fs.existsSync(`public/market-logos/${file}.svg`)));
check('package exposes PASS1997 verifier', pkg.scripts?.['verify:pass1997-syntax-visual-logic-lock'] === 'node scripts/verify-pass1997-syntax-visual-logic-lock.mjs');

const failed = results.filter((result) => !result.ok);
for (const result of results) console.log(`${result.ok ? 'OK' : 'FAIL'} ${result.name}`);
if (failed.length) {
  console.error(`PASS1997 verifier failed: ${failed.length}/${results.length}`);
  process.exit(1);
}
console.log(`PASS1997 verifier passed: ${results.length}/${results.length}`);
