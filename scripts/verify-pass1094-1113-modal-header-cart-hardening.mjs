import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const checks = [];
const add = (name, pass) => checks.push({ name, pass: Boolean(pass) });

const unified = read('components/market-integrity/UnifiedAssetAnalysisControls.tsx');
const cross = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const nav = read('components/Navbar.tsx');
const overlay = read('components/ui/OverlayPrimitives.tsx');
const css = read('app/globals.css');
const pkg = JSON.parse(read('package.json'));

add('Bubble dock is a toolbar for keyboard navigation', unified.includes('role="toolbar"') && unified.includes('data-analysis-bubble-keyboard="spatial-loop"'));
add('Bubble dock loops ArrowRight/ArrowLeft/ArrowDown/ArrowUp', ['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].every((key) => unified.includes(`event.key === "${key}"`)));
add('Bubble dock does not trap Escape', unified.includes('if (event.key === "Escape") return;'));
add('Analysis overlay is a nested dialog with scroll ownership', unified.includes('role="dialog"') && unified.includes('data-modal-scroll-region="true"') && unified.includes('aria-live="polite"'));
add('Real Markets passes closeButtonRef into shared shell', cross.includes('modalCloseButtonRef') && cross.includes('closeButtonRef={modalCloseButtonRef}'));
add('DropdownRoot tracks visualViewport movement', overlay.includes('window.visualViewport') && overlay.includes('data-dropdown-visual-viewport="true"'));
add('Header overlay triggers are stable focus-return anchors', ['header-language','header-wallet','header-account','header-cart'].every((id) => nav.includes(`data-velmere-overlay-trigger="${id}"`)));
add('Language dropdown remains anchored and visible over header', css.includes('[data-surface="language-selector-anchored"]') && css.includes('z-index: 1250'));
add('Bubble keyboard focus style exists', css.includes('[data-analysis-bubble-keyboard="spatial-loop"] .unified-asset-bubble-button:focus-visible'));
add('Cart bottom sheet has bottom-right containment', css.includes('contain: layout paint') && css.includes('transform-origin: bottom right'));
add('Verifier is exposed in package scripts', pkg.scripts?.['verify:pass1094-1113-modal-header-cart-hardening'] === 'node scripts/verify-pass1094-1113-modal-header-cart-hardening.mjs');

let ok = 0;
for (const check of checks) {
  if (check.pass) {
    ok += 1;
    console.log(`PASS ${check.name}`);
  } else {
    console.error(`FAIL ${check.name}`);
  }
}
if (ok !== checks.length) {
  console.error(`PASS1094-1113 verifier failed: ${ok}/${checks.length}`);
  process.exit(1);
}
console.log(`PASS1094-1113 verifier passed: ${ok}/${checks.length}`);
