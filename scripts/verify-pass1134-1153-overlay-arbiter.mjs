import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const checks = [];
const add = (name, pass) => checks.push({ name, pass: Boolean(pass) });

const overlay = read('components/ui/OverlayPrimitives.tsx');
const cartProvider = read('components/CartProvider.tsx');
const navbar = read('components/Navbar.tsx');
const tokenModal = read('components/market-integrity/TokenRiskModal.tsx');
const realMarkets = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const square = read('components/square/VelmereSquareClient.tsx');
const pkg = JSON.parse(read('package.json'));

add('OverlayPrimitives declares global velmere:overlay-opening event', overlay.includes('"velmere:overlay-opening"') && overlay.includes('VelmereOverlayOpeningDetail'));
add('OverlayPrimitives emits overlay opening events for dropdown/modal/drawer', overlay.includes('kind: "dropdown"') && overlay.includes('kind: "modal"') && overlay.includes('kind: "drawer"'));
add('DropdownRoot has no-anchor fallback position for hidden/mobile anchors', overlay.includes('resolveFallbackDropdownPosition') && overlay.includes('viewportTop + 84'));
add('DropdownRoot resolvedPosition falls back when anchorRef is null', overlay.includes('resolveFallbackDropdownPosition(align, width)'));
add('Overlay event effects use stable primitive overlaySurface dependency', overlay.includes('const overlaySurface = surfaceName(surfaceData)') && !overlay.includes('}, [id, open, surfaceData]'));
add('CartProvider closes cart when a non-cart modal/drawer opens', cartProvider.includes('velmere:overlay-opening') && cartProvider.includes('detail.surfaceId === "velmere-cart-bottom-sheet"') && cartProvider.includes('detail.kind === "modal" || detail.kind === "drawer"'));
add('Navbar closes header overlays when external modal/drawer opens', navbar.includes('velmere:overlay-opening') && navbar.includes('detail.surfaceId !== "velmere-main-menu-drawer"') && navbar.includes('closeHeaderOverlays();'));
add('Navbar main menu drawer has stable surface id', navbar.includes('surfaceId="velmere-main-menu-drawer"'));
add('Shield custom asset modal emits overlay opening event', tokenModal.includes('surfaceId: "velmere-shield-asset-modal"') && tokenModal.includes('new CustomEvent("velmere:overlay-opening"'));
add('Shield custom asset modal has matching stable shell id', tokenModal.includes('id="velmere-shield-asset-modal"'));
add('Real Markets modal exposes stable surfaceId and surface metadata', realMarkets.includes('surfaceId="velmere-real-markets-asset-modal"') && realMarkets.includes('surface: "real-markets-asset-modal"'));
add('Square post/composer overlays expose stable surface ids', square.includes('surfaceId="velmere-square-post-modal"') && square.includes('surfaceId="velmere-square-composer-drawer"'));
add('PASS1134 verifier is wired in package.json', pkg.scripts['verify:pass1134-1153-overlay-arbiter'] === 'node scripts/verify-pass1134-1153-overlay-arbiter.mjs');

for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
}
const failed = checks.filter((check) => !check.pass);
if (failed.length) {
  console.error(`\nPASS1134-1153 overlay arbiter failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nPASS1134-1153 overlay arbiter passed: ${checks.length}/${checks.length}`);
