import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const checks = [];
const add = (name, pass) => checks.push({ name, pass: Boolean(pass) });

const overlay = read('components/ui/OverlayPrimitives.tsx');
const navbar = read('components/Navbar.tsx');
const cartProvider = read('components/CartProvider.tsx');
const cartDrawer = read('components/CartDrawer.tsx');
const unified = read('components/market-integrity/UnifiedAssetAnalysisControls.tsx');
const shield = read('components/market-integrity/TokenRiskModal.tsx');
const realMarkets = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const lens = read('components/search/VelmereIntelligenceSearchClient.tsx');
const pkg = JSON.parse(read('package.json'));

add('Header wallet trigger is visible on mobile instead of hidden md:block anchor', navbar.includes('data-velmere-mobile-wallet-anchor="visible"') && !navbar.includes('<div className="relative hidden md:block">\n              <button\n                ref={walletButtonRef}'));
add('Mobile wallet trigger remains icon-only below md and expands label on desktop', navbar.includes('h-10 w-10') && navbar.includes('md:w-auto md:px-3') && navbar.includes('<span className="hidden md:inline">{walletLabel}</span>'));
add('Wallet trigger has aria-label/title for icon-only mobile state', navbar.includes('aria-label={t.wallet}') && navbar.includes('title={walletLabel}'));
add('DropdownRoot rejects hidden anchors and still has fallback placement', overlay.includes('isUsableDropdownAnchor') && overlay.includes('resolveFallbackDropdownPosition(align, width)'));
add('DropdownRoot returns focus on outside click when anchor is usable', overlay.includes('window.requestAnimationFrame(() => anchor.focus({ preventScroll: true }))'));
add('DropdownRoot exposes surface id for runtime QA and overlay arbitration', overlay.includes('data-velmere-surface-id={id}'));
add('Header overlay arbiter still closes menu/wallet/language/account on cart open', navbar.includes('window.addEventListener("velmere:cart-opening", closeHeaderOverlays)'));
add('CartProvider still closes cart when another modal/drawer opens', cartProvider.includes('detail.kind === "modal" || detail.kind === "drawer"'));
add('CartDrawer remains bottom motion sheet with stable surface id', cartDrawer.includes('motionPreset="bottom"') && cartDrawer.includes('surfaceId="velmere-cart-bottom-sheet"'));
add('Unified asset shell keeps circular chart + messenger bubble contract', unified.includes('data-unified-asset-circular-chart="true"') && unified.includes('data-unified-asset-bubble-dock="true"'));
add('Unified bubble dock supports spatial keyboard and does not trap Escape', unified.includes('data-analysis-bubble-keyboard="spatial-loop"') && unified.includes('if (event.key === "Escape") return;'));
add('Shield modal emits stable overlay opening event and uses unified shell', shield.includes('surfaceId: "velmere-shield-asset-modal"') && shield.includes('<UnifiedAssetModalShell'));
add('Real Markets modal analysis overlay remains inside unified modal shell', realMarkets.includes('surfaceId="velmere-real-markets-asset-modal"') && realMarkets.includes('analysisOverlaySlot={'));
add('Lens preview still uses shared focus boundary and keyboard toolbar handler', lens.includes('useDialogFocusBoundary(Boolean(pdfPreview)') && lens.includes('handlePreviewToolbarKeyDown'));
add('PASS1174 verifier is wired in package.json', pkg.scripts['verify:pass1174-1193-runtime-click-readiness'] === 'node scripts/verify-pass1174-1193-runtime-click-readiness.mjs');

for (const check of checks) console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
const failed = checks.filter((check) => !check.pass);
if (failed.length) {
  console.error(`\nPASS1174-1193 runtime click readiness failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nPASS1174-1193 runtime click readiness passed: ${checks.length}/${checks.length}`);
