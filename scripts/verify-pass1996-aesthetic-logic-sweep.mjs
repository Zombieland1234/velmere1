import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
const css = read('app/globals.css');
const controls = read('components/market-integrity/UnifiedAssetAnalysisControls.tsx');
const cross = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const resolver = read('lib/market-integrity/asset-logo-resolver.ts');
const shieldMap = read('components/market-integrity/ShieldMapClient.tsx');
const pkg = JSON.parse(read('package.json'));
const checks = [];
function add(name, pass) { checks.push({ name, pass: Boolean(pass) }); }

add('PASS1996 modal marker exists', controls.includes('data-pass1996-modal="aesthetic-logic-viewport-locked"'));
add('PASS1996 five window markers exist', ['asset-header-clean','metric-strip-clean','timeframe-strip-clean','chart-window-clean','right-actions-clean'].every((m) => controls.includes(`data-pass1996-window="${m}"`)));
add('PASS1996 depth/action markers exist', controls.includes('data-pass1996-depth-dock="equal-readable-action-cards"') && controls.includes('data-pass1996-action-window="short-clean-cta"'));
add('PASS1996 modal CSS removes outer modal surface chrome', css.includes('#velmere-real-markets-asset-modal') && css.includes('background: transparent !important') && css.includes('box-shadow: none !important'));
add('PASS1996 row source clutter is hidden', cross.includes('data-pass1996-row-source-line="quiet-hidden-until-expanded"') && css.includes('.realmarkets-source-line-quiet'));
add('PASS1996 quote fallback keys use symbol/name/provider/id/exchange', cross.includes('function pass1996FallbackKeysForAsset') && cross.includes('asset.exchange'));
add('PASS1996 ShieldMap gold square focus reduced', shieldMap.includes('focus-within:border-cyan-200/[0.20] focus-within:shadow-none'));
add('PASS1996 resolver has extended logo coverage', ['TSM','AVGO','WMT','DIS','HD','BAC','VOW3','PYPL','SPY','QQQ'].every((k) => resolver.includes(`${k}: "/market-logos/`)));
add('PASS1996 generated fallback logo files exist', ['tsm','avgo','wmt','dis','hd','bac','pypl','spy','qqq'].every((f) => fs.existsSync(`public/market-logos/${f}.svg`)));
add('package.json exposes PASS1996 verifier', pkg.scripts?.['verify:pass1996-aesthetic-logic-sweep'] === 'node scripts/verify-pass1996-aesthetic-logic-sweep.mjs');

const failed = checks.filter((c) => !c.pass);
if (failed.length) {
  console.error('PASS1996 aesthetic logic sweep FAILED');
  for (const item of failed) console.error(`- ${item.name}`);
  process.exit(1);
}
console.log(`PASS1996 aesthetic logic sweep OK — ${checks.length}/${checks.length} checks`);
