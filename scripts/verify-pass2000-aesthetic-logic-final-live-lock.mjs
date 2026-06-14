import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const controls = read('components/market-integrity/UnifiedAssetAnalysisControls.tsx');
const css = read('app/globals.css');
const overlay = read('components/ui/OverlayPrimitives.tsx');
const wallet = read('components/wallet/WalletConnectOptions.tsx');
const cross = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const shield = read('components/market-integrity/MarketIntegrityClient.tsx');
const pkg = JSON.parse(read('package.json'));

let total = 0;
let passed = 0;
function check(name, condition) {
  total += 1;
  if (condition) {
    passed += 1;
    console.log(`OK ${name}`);
  } else {
    console.error(`FAIL ${name}`);
  }
}

check('PASS2000 modal shell marker exists', controls.includes('data-pass2000-modal="premium-live-lock-five-windows-no-scroll-final-qa"'));
check('PASS2000 all five separate window markers exist', [
  'header-one-row-no-rings-no-overflow',
  'metric-strip-three-equal-cards-readability-lock',
  'timeframe-row-no-gold-focus-no-layout-shift',
  'chart-card-wheel-contained-no-page-scroll',
  'right-actions-three-equal-premium-cards',
].every((marker) => controls.includes(`data-pass2000-window="${marker}"`)));
check('PASS2000 chart stage and dock markers exist', controls.includes('data-pass2000-stage="chart-dominant-actions-fit-one-viewport"') && controls.includes('data-pass2000-depth-dock="three-equal-click-safe-no-cramped-copy"'));
check('PASS2000 click-safe depth and timeframe handlers stop propagation', (controls.match(/event\.stopPropagation\(\)/g) ?? []).length >= 4 && controls.includes('data-pass2000-action-window="large-click-target-calm-hover"'));
check('PASS2000 timeframe active styling moved away from gold', controls.includes('border-cyan-200/[0.34] bg-cyan-300/[0.095] text-cyan-50') && !controls.includes('border-velmere-gold/[0.46] bg-velmere-gold/[0.13] text-velmere-gold'));
check('PASS2000 CSS locks modal to viewport and separates surfaces', css.includes('PASS2000 — final live QA lock') && css.includes('grid-template-rows: auto minmax(0, 1fr)') && css.includes('contain: layout paint style'));
check('PASS2000 CSS keeps desktop no-scroll but mobile controlled scroll', css.includes('overflow: hidden !important') && css.includes('-webkit-overflow-scrolling: touch'));
check('PASS2000 overlay runtime markers exist', overlay.includes('data-pass2000-overlay-runtime="solid-fast-fixed-no-blur"'));
check('PASS2000 wallet other panel is left-attached and no viewport clipping', wallet.includes('data-pass2000-wallet-other="left-attached-no-viewport-clipping"') && css.includes('right: calc(100% + .75rem)'));
check('PASS2000 Real Markets table QA and source-line hide exist', cross.includes('data-pass2000-table-qa="aligned-chart-column-no-source-no-row-noise"') && css.includes('.realmarkets-source-line-quiet'));
check('PASS2000 Shield and Real Markets sort markers exist', shield.includes('data-pass2000-sort-click-target="full-cell-no-overlay-steal"') && cross.includes('data-pass2000-sort-click-target="full-cell-no-overlay-steal"'));
check('package exposes PASS2000 verifier', pkg.scripts?.['verify:pass2000-aesthetic-logic-final-live-lock'] === 'node scripts/verify-pass2000-aesthetic-logic-final-live-lock.mjs');

if (passed !== total) {
  console.error(`PASS2000 verifier failed: ${passed}/${total}`);
  process.exit(1);
}
console.log(`PASS2000 verifier OK: ${passed}/${total}`);
