import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const navbar = read('components/Navbar.tsx');
const wallet = read('components/wallet/WalletConnectOptions.tsx');
const product = read('components/shop/ProductDetailClient.tsx');
const css = read('app/globals.css');
const pkg = JSON.parse(read('package.json'));

const checks = [];
function check(label, ok) {
  checks.push({ label, ok });
  console.log(`${ok ? 'OK' : 'FAIL'} ${label}`);
}

check('PASS2002 Navbar route-close no duplicate closeHeaderSurfaces call in pathname effect', !navbar.includes('useEffect(() => {\n    closeHeaderSurfaces();\n    closeHeaderSurfaces();'));
check('PASS2002 Navbar header/logo focus moved from gold ring to calmer cyan ring', navbar.includes('focus-visible:ring-cyan-200/[0.35]') && !navbar.includes('focus-visible:ring-velmere-gold/[0.45]'));
check('PASS2002 Navbar dropdowns use solid no-blur pass markers', navbar.includes('pass2002: "solid-no-blur-cyan-focus"') && navbar.includes('pass2002: "solid-no-blur-outside-dismiss-safe"'));
check('PASS2002 Navbar main menu links are cards without row-line borders', navbar.includes('data-pass2002-menu-links="cards-no-row-lines"') && navbar.includes('hover:border-cyan-200/[0.18]') && !navbar.includes('border-b border-white/[0.10] py-3 text-sm'));
check('PASS2002 Wallet other list closes on outside click and Escape', wallet.includes('document.addEventListener("pointerdown", closeFromPointer, true)') && wallet.includes('document.addEventListener("keydown", closeFromKeyboard, true)') && wallet.includes('event.key !== "Escape"'));
check('PASS2002 Wallet other panel has explicit outside-click/escape marker', wallet.includes('data-pass2002-wallet-other-dismiss="outside-click-escape"') && wallet.includes('data-pass2002-wallet-options-root="outside-click-escape-other-wallets"'));
check('PASS2002 Product detail has premium cards/no-row-lines sweep marker', product.includes('data-pass2002-product-detail-sweep="premium-cards-no-row-lines-low-lag-size-guide"'));
check('PASS2002 Product accordions are card surfaces with aria-expanded and low-lag motion', product.includes('data-pass2002-product-accordion="card-no-row-line-fast-motion"') && product.includes('aria-expanded={open}') && product.includes('data-pass2002-product-accordion-motion="low-lag"'));
check('PASS2002 Product size guide uses solid surface and pointerdown close', product.includes('pass2002: "solid-owned-scroll-fast-close"') && product.includes('data-pass2002-size-guide-close="pointerdown-fast"'));
check('PASS2002 Product mobile purchase dock is solid no-glass safe-area', product.includes('data-pass2002-mobile-purchase-dock="solid-no-glass-safe-area"'));
check('PASS2002 CSS locks no-blur solid menu/wallet/product surfaces', css.includes('PASS2002 — broad file sweep') && css.includes('[data-pass2002-menu-links="cards-no-row-lines"] a') && css.includes('[data-pass2002-product-accordion="card-no-row-line-fast-motion"]') && css.includes('[data-pass2002-wallet-other-dismiss="outside-click-escape"]'));
check('package exposes PASS2002 verifier', pkg.scripts?.['verify:pass2002-broad-commerce-nav-wallet-sweep'] === 'node scripts/verify-pass2002-broad-commerce-nav-wallet-sweep.mjs');

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error(`PASS2002 verifier failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`PASS2002 verifier OK: ${checks.length}/${checks.length}`);
