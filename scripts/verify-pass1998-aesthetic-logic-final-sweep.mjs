import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const pkg = JSON.parse(read('package.json'));
const controls = read('components/market-integrity/UnifiedAssetAnalysisControls.tsx');
const css = read('app/globals.css');
const overlay = read('components/ui/OverlayPrimitives.tsx');
const assetLogo = read('components/market-integrity/AssetLogo.tsx');
const resolver = read('lib/market-integrity/asset-logo-resolver.ts');
const cross = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const shield = read('components/market-integrity/MarketIntegrityClient.tsx');

const checks = [];
function check(label, ok) {
  checks.push({ label, ok: Boolean(ok) });
}

check('PASS1998 modal root marker exists', controls.includes('data-pass1998-modal="final-aesthetic-logic-no-outer-frame-no-page-scroll"'));
check('PASS1998 modal window markers exist', [
  'header-logo-title-close-balanced',
  'metric-strip-three-compact-cards',
  'timeframe-pill-row-no-gold-box',
  'chart-window-quiet-premium',
  'right-actions-three-equal-quiet-cards',
].every((marker) => controls.includes(`data-pass1998-window="${marker}"`)));
check('PASS1998 depth/action markers exist', controls.includes('data-pass1998-depth-dock="three-equal-readable-action-cards"') && controls.includes('data-pass1998-action-window="quiet-premium-no-cramped-copy"'));
check('PASS1998 CSS viewport/modal lock exists', css.includes('PASS1998 — final aesthetic/logic sweep') && css.includes('chart-actions-fit-viewport-no-page-scroll') && css.includes('max-height: calc(100dvh - 2.25rem)'));
check('PASS1998 logo glyph policy hides fake fallback while images load', assetLogo.includes('hasImageCandidate') && assetLogo.includes('data-pass1998-logo-glyph-policy') && assetLogo.includes('{!hasImageCandidate ? <span'));
check('PASS1998 resolver covers all major visible Real Markets symbols', ['BTC','ETH','BNB','SOL','XRP','ADA','DOGE','NKE','AIR','RMS','KER','CFR','OR','SIE','ALV','P911','SP500','EURUSD','GC','CL','0388HK'].every((key) => resolver.includes(key)));
check('PASS1998 generated missing visible logo files exist', ['btc','eth','bnb','sol','xrp','ada','doge','nke','air','rms','ker','cfr','or','sie','alv','porsche','sp500','eurusd','gc','cl','hk0388'].every((file) => fs.existsSync(`public/market-logos/${file}.svg`)));
check('PASS1998 dropdown/modal/drawer low-lag runtime markers exist', overlay.includes('data-pass1998-dropdown-runtime="no-blur-fast-close-low-lag"') && overlay.includes('data-pass1998-modal-runtime="solid-backdrop-fixed-viewport-low-lag"') && overlay.includes('data-pass1998-drawer-runtime="solid-surface-faster-close-no-blur"'));
check('PASS1998 Real Markets table polish and sort target markers exist', cross.includes('data-pass1998-table-polish="desktop-clean-no-source-clutter"') && cross.includes('data-pass1998-sort-click-target="full-header-cell"'));
check('PASS1998 Shield sort stopPropagation marker exists', shield.includes('data-pass1998-sort-click-target="shield-full-header-cell"') && shield.includes('onPointerDown={(event) => event.stopPropagation()}'));
check('package exposes PASS1998 verifier', pkg.scripts?.['verify:pass1998-aesthetic-logic-final-sweep'] === 'node scripts/verify-pass1998-aesthetic-logic-final-sweep.mjs');

const failed = checks.filter((item) => !item.ok);
for (const item of checks) {
  console.log(`${item.ok ? 'OK' : 'FAIL'} ${item.label}`);
}
if (failed.length) {
  console.error(`PASS1998 verifier failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`PASS1998 verifier OK: ${checks.length}/${checks.length}`);
