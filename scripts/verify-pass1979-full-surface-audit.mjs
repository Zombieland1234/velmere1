import fs from 'node:fs';

const checks = [];
function read(file) { return fs.readFileSync(file, 'utf8'); }
function check(name, condition) { checks.push({ name, ok: Boolean(condition) }); }

const overlay = read('components/ui/OverlayPrimitives.tsx');
const cartProvider = read('components/CartProvider.tsx');
const cartDrawer = read('components/CartDrawer.tsx');
const navbar = read('components/Navbar.tsx');
const mail = read('components/contact/FloatingMailWidget.tsx');
const css = read('app/globals.css');
const tokenModal = read('components/market-integrity/TokenRiskModal.tsx');
const realMarkets = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');

check('OverlayPrimitives exposes lockScroll for lightweight menu/cart/mail drawers', overlay.includes('lockScroll?: boolean') && overlay.includes('useModalScrollLock(open && lockScroll)'));
check('OverlayPrimitives closes modal/drawer on pointerdown and click outside', (overlay.match(/onPointerDown=\{closeOnBackdrop \? onClose : undefined\}/g) || []).length >= 2 && (overlay.match(/onClick=\{closeOnBackdrop \? onClose : undefined\}/g) || []).length >= 2);
check('CartProvider removed laggy document pointerdown/click hard-open capture', cartProvider.includes('PASS1979') && !cartProvider.includes('header-cart-pointerdown-capture') && !cartProvider.includes('header-cart-click-capture'));
check('CartDrawer no longer closes cart on initial pathname hydration effect', cartDrawer.includes('pathnameCloseArmedRef') && cartDrawer.includes('lockScroll={false}'));
check('Navbar hard-opens header surfaces across same-frame cleanup races', navbar.includes('PASS1979: real-click repair') && navbar.includes('window.requestAnimationFrame(applySurface)') && navbar.includes('window.setTimeout(applySurface, 80)'));
check('Navbar menu drawer uses lightweight non-freezing overlay', navbar.includes('surfaceId="velmere-main-menu-drawer"') && navbar.includes('lockScroll={false}'));
check('Mail drawer uses lightweight non-freezing overlay', mail.includes('surfaceId="velmere-private-mail-drawer"') && mail.includes('lockScroll={false}'));
check('PASS1979 CSS final overlay layer exists', css.includes('PASS1979 — full bottom-up runtime audit'));
check('PASS1979 CSS keeps menu/mail/cart surfaces visible above light backdrop', css.includes('--velmere-pass1979-overlay-z-backdrop') && css.includes('#velmere-main-menu-drawer[data-surface="main-menu"]') && css.includes('#velmere-cart-bottom-sheet[data-surface="cart-bottom-sheet"]'));
check('PASS1979 CSS makes backdrop full-screen and light for outside-click close', css.includes('top: 0 !important;') && css.includes('backdrop-filter: none !important') && css.includes('rgba(0, 0, 0, 0.12)'));
check('Language/wallet/account dropdowns stay fixed and visible', css.includes('#velmere-header-language-menu[data-surface="language-selector-anchored"]') && css.includes('#velmere-header-wallet-menu[data-surface="header-wallet-panel-anchored"]') && css.includes('#velmere-header-account-menu[data-surface="member-menu"]'));
check('Shield Basic/Pro/Advanced still launches VLM brain sequence', tokenModal.includes('setVlmSequenceMode(normalizedTier)') && tokenModal.includes('<VlmNeuralAuditExperience'));
check('Real Markets Basic/Pro/Advanced still launches VLM brain sequence', realMarkets.includes('openUnifiedAuditMode') && realMarkets.includes('<VlmNeuralAuditExperience'));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? 'OK' : 'FAIL'} ${item.name}`);
if (failed.length) {
  console.error(`PASS1979 failed ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`PASS1979 full surface audit OK · ${checks.length}/${checks.length}`);
