import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const checks = [];
const check = (label, ok) => checks.push({ label, ok: Boolean(ok) });

const controls = read('components/market-integrity/UnifiedAssetAnalysisControls.tsx');
const css = read('app/globals.css');
const overlay = read('components/ui/OverlayPrimitives.tsx');
const nav = read('components/Navbar.tsx');
const shieldMap = read('components/market-integrity/ShieldMapClient.tsx');
const shop = read('components/shop/ShopPageClient.tsx');
const pkg = JSON.parse(read('package.json'));

check('PASS1999 modal shell marker exists', controls.includes('data-pass1999-modal="live-screen-premium-five-window-lock"'));
check('PASS1999 five window markers exist', [
  'header-logo-title-close-one-row',
  'metric-strip-no-overflow-three-cards',
  'timeframe-row-calm-cyan-focus',
  'chart-window-dominant-no-page-wheel',
  'right-actions-readable-premium-stack',
].every((marker) => controls.includes(`data-pass1999-window="${marker}"`)));
check('PASS1999 chart stage and action dock markers exist', controls.includes('data-pass1999-stage="live-screen-chart-dominant-actions-fit"') && controls.includes('data-pass1999-depth-dock="three-equal-premium-cards-no-cramped-copy"') && controls.includes('data-pass1999-action-window="short-readable-click-target"'));
check('PASS1999 modal CSS locks viewport and no blur', css.includes('PASS1999 — live-screen visual logic sweep') && css.includes('max-height: calc(100dvh - 1rem)') && css.includes('backdrop-filter: none'));
check('PASS1999 overlay runtime removes blur and shortens motion', overlay.includes('data-pass1999-dropdown-runtime="solid-fast-close-no-layout-shift"') && overlay.includes('data-pass1999-modal-runtime="solid-backdrop-no-blur-fixed-premium"') && overlay.includes('data-pass1999-drawer-runtime="no-blur-fast-close-scroll-lock-safe"') && overlay.includes('className="fixed inset-0 bg-black/[0.84]"'));
check(
  'PASS1999 main menu keeps fast close or uses the newer no-scroll-lock lag fix',
  nav.includes('data-pass1999-menu-close="pointerdown-fast-no-lag"') &&
    nav.includes('pass1999: "scroll-locked-fast-close-solid-surface"') &&
    (
      nav.includes('lockScroll={true}') ||
      (
        nav.includes('lockScroll={false}') &&
        nav.includes('pass2011: "classic-list-instant-close-no-scroll-lock"')
      )
    ),
);
check('PASS1999 Shield Map focus uses cyan not gold square', shieldMap.includes('data-pass1999-focus-clean="true"') && shieldMap.includes('focus-visible:ring-cyan-200/[0.28]') && !shieldMap.includes('focus-visible:ring-velmere-gold/[0.35]'));
check('PASS1999 shop copy removes visible Lookbook filter label', shop.includes('data-pass1999-shop-copy="commerce-atelier-no-lookbook-clutter"') && shop.includes('data-pass1999-shop-link="atelier-not-lookbook-copy"') && !shop.includes('>\n              Lookbook\n            </Link>'));
check('PASS1999 shop grid marker exists for cards-not-row-lines', shop.includes('data-pass1999-shop-grid="cards-not-row-lines"') && css.includes('.velmere-atelier-product-grid'));
check('package exposes PASS1999 verifier', pkg.scripts?.['verify:pass1999-live-screen-aesthetic-logic-sweep'] === 'node scripts/verify-pass1999-live-screen-aesthetic-logic-sweep.mjs');

for (const item of checks) console.log(`${item.ok ? 'OK' : 'FAIL'} ${item.label}`);
const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error(`PASS1999 verifier failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`PASS1999 verifier OK: ${checks.length}/${checks.length}`);
