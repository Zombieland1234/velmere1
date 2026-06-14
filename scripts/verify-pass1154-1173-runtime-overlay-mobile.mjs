import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const checks = [];
const add = (name, pass) => checks.push({ name, pass: Boolean(pass) });

const overlay = read('components/ui/OverlayPrimitives.tsx');
const navbar = read('components/Navbar.tsx');
const cartProvider = read('components/CartProvider.tsx');
const cartDrawer = read('components/CartDrawer.tsx');
const unified = read('components/market-integrity/UnifiedAssetAnalysisControls.tsx');
const lens = read('components/search/VelmereIntelligenceSearchClient.tsx');
const square = read('components/square/VelmereSquareClient.tsx');
const css = read('app/globals.css');
const pkg = JSON.parse(read('package.json'));

add('DropdownRoot rejects hidden/mobile anchors instead of trusting zero rects', overlay.includes('function isUsableDropdownAnchor') && overlay.includes('rect.width <= 1') && overlay.includes('style.display === "none"'));
add('DropdownRoot falls back when anchor is hidden, not only when null', overlay.includes('if (!isUsableDropdownAnchor(anchor))') && overlay.includes('resolveFallbackDropdownPosition(align, width)'));
add('DropdownRoot resolvedPosition also uses hidden-anchor fallback', overlay.includes('return isUsableDropdownAnchor(anchor)') && overlay.includes('? resolveDropdownPosition(anchor, align, width, offset)'));
add('DropdownRoot follows visualViewport scroll/resize for sticky header menus', overlay.includes('window.visualViewport') && overlay.includes('viewport?.addEventListener("scroll", update)'));
add('DropdownRoot keyboard loop still supports arrows and Home/End', overlay.includes('ArrowDown') && overlay.includes('ArrowLeft') && overlay.includes('Home') && overlay.includes('End'));
add('Navbar menu button closes language/wallet/account before drawer open', navbar.includes('setWalletOpen(false);\n              setLanguageOpen(false);\n              setMemberOpen(false);\n              setMenuOpen(true);'));
add('Navbar cart button closes all header overlays before opening cart', navbar.includes('setMenuOpen(false);\n                setWalletOpen(false);\n                setLanguageOpen(false);\n                setMemberOpen(false);\n                openCart();'));
add('CartProvider closes cart when non-cart modal/drawer opens', cartProvider.includes('velmere:overlay-opening') && cartProvider.includes('detail.kind === "modal" || detail.kind === "drawer"'));
add('CartDrawer remains a bottom motion drawer with stable surface id', cartDrawer.includes('motionPreset="bottom"') && cartDrawer.includes('surfaceId="velmere-cart-bottom-sheet"'));
add('Unified asset modal keeps analysis overlay inside modal shell', unified.includes('analysisOverlaySlot') && unified.includes('data-unified-asset-analysis-overlay="true"'));
add('Unified bubble dock keeps spatial keyboard loop without trapping Escape', unified.includes('data-analysis-bubble-keyboard="spatial-loop"') && unified.includes('if (event.key === "Escape") return;'));
add('Lens preview modal uses shared focus boundary and toolbar keyboard QA', lens.includes('useDialogFocusBoundary(Boolean(pdfPreview)') && lens.includes('data-pass470-keyboard-toolbar="true"') && lens.includes('handlePreviewToolbarKeyDown'));
add('Square post modal has scrollable article/comments regions', square.includes('surfaceId="velmere-square-post-modal"') && (square.match(/data-modal-scroll-region="true"/g) ?? []).length >= 2);
add('CSS keeps language dropdown visible and cart bottom/right hardened', css.includes('[data-surface="language-selector-anchored"]') && css.includes('#velmere-cart-bottom-sheet.velmere-cart-bottom-sheet'));
add('PASS1154 verifier is wired in package.json', pkg.scripts['verify:pass1154-1173-runtime-overlay-mobile'] === 'node scripts/verify-pass1154-1173-runtime-overlay-mobile.mjs');

for (const check of checks) console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
const failed = checks.filter((check) => !check.pass);
if (failed.length) {
  console.error(`\nPASS1154-1173 runtime overlay/mobile failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nPASS1154-1173 runtime overlay/mobile passed: ${checks.length}/${checks.length}`);
