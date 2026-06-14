import { readFileSync } from 'node:fs';

const checks = [];
const read = (path) => readFileSync(path, 'utf8');
const add = (name, pass, detail = '') => checks.push({ name, pass: Boolean(pass), detail });

const overlay = read('components/ui/OverlayPrimitives.tsx');
const navbar = read('components/Navbar.tsx');
const cartProvider = read('components/CartProvider.tsx');
const cartDrawer = read('components/CartDrawer.tsx');
const unified = read('components/market-integrity/UnifiedAssetAnalysisControls.tsx');
const css = read('app/globals.css');
const packageJson = JSON.parse(read('package.json'));

add('DropdownRoot accepts stable id for aria-controls', /type DropdownRootProps[\s\S]*id\?: string/.test(overlay) && /<motion\.div\s+id=\{id\}/.test(overlay));
add('DropdownRoot uses visualViewport-aware anchored positioning', overlay.includes('visualViewport?.offsetLeft') && overlay.includes('visualViewport?.offsetTop'));
add('DropdownRoot has keyboard loop for menu items', overlay.includes('ArrowDown') && overlay.includes('ArrowRight') && overlay.includes('Home') && overlay.includes('End') && overlay.includes("role='menuitem'"));
add('DrawerRoot bottom frame is structurally aligned bottom-right', overlay.includes('data-velmere-drawer-frame={motionPreset}') && overlay.includes('items-end justify-end'));
add('Modal/Drawer surfaces expose stable surfaceId', overlay.includes('surfaceId?: string') && overlay.includes('id={surfaceId}'));
add('Navbar language trigger has aria-controls', navbar.includes('aria-controls={languageMenuId}') && navbar.includes('id={languageMenuId}'));
add('Navbar wallet/account triggers have aria-controls', navbar.includes('aria-controls={walletMenuId}') && navbar.includes('aria-controls={accountMenuId}'));
add('Navbar cart trigger closes header overlays before opening', navbar.includes('aria-controls={cartDrawerId}') && navbar.includes('setWalletOpen(false);') && navbar.includes('setLanguageOpen(false);') && navbar.includes('setMemberOpen(false);'));
add('Navbar listens for global cart-opening to close dropdowns', navbar.includes('velmere:cart-opening') && navbar.includes('closeHeaderOverlays'));
add('CartProvider emits velmere:cart-opening on open/toggle/add', cartProvider.includes('notifyCartOpening') && cartProvider.match(/velmere:cart-opening/g)?.length >= 1 && cartProvider.includes('rawAddItem(item)'));
add('CartDrawer has stable bottom sheet surface id', cartDrawer.includes('surfaceId="velmere-cart-bottom-sheet"'));
add('Unified analysis bubbles keep toolbar keyboard contract', unified.includes('role="toolbar"') && unified.includes('data-analysis-bubble-keyboard="spatial-loop"') && unified.includes('Escape') && unified.includes('ArrowRight'));
add('PASS1114 CSS locks cart bottom/right and dropdown focus rings', css.includes('PASS1114-PASS1133') && css.includes('[data-velmere-drawer-frame="bottom"]') && css.includes('#velmere-cart-bottom-sheet'));
add('PASS1114 verifier is wired in package.json', packageJson.scripts['verify:pass1114-1133-overlay-runtime-gate'] === 'node scripts/verify-pass1114-1133-overlay-runtime-gate.mjs');

const failed = checks.filter((check) => !check.pass);
for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}${check.detail ? ` — ${check.detail}` : ''}`);
}
if (failed.length) {
  console.error(`\nPASS1114-1133 overlay runtime gate failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nPASS1114-1133 overlay runtime gate passed: ${checks.length}/${checks.length}`);
