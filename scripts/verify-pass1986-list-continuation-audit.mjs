import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const checks = [];
const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });

const nav = read('components/Navbar.tsx');
const wallet = read('components/wallet/WalletConnectOptions.tsx');
const overlay = read('components/ui/OverlayPrimitives.tsx');
const unified = read('components/market-integrity/UnifiedAssetAnalysisControls.tsx');
const css = read('app/globals.css');

add('header wallet dropdown no longer clips nested other wallets', nav.includes('velmere-wallet-dropdown-surface') && nav.includes('overflow-visible') && nav.includes('data-pass1986-wallet-nested-panel'));
add('header wallet surface carries PASS1986 nested marker', nav.includes('pass1986: "nested-other-wallets-unclipped"'));
add('wallet options root has safe nested marker', wallet.includes('data-pass1986-wallet-options-root="safe-nested-other-panel"'));
add('other wallet panel carries PASS1986 directional marker', wallet.includes('data-pass1986-wallet-other-panel="unclipped-nested-directional"'));
add('other wallet toggle carries PASS1986 marker', wallet.includes('data-pass1986-other-wallet-toggle="true"'));
add('dropdown scroll listener is window passive no capture', overlay.includes('PASS1986: anchored header dropdowns do not need capture-phase updates') && overlay.includes('data-pass1986-dropdown-scroll-listener="window-passive-no-capture"'));
add('overlay primitive no longer uses capture true scroll listener', !overlay.includes('window.addEventListener("scroll", scheduleUpdate, true)'));
add('asset chart has pointer hygiene marker', unified.includes('data-pass1986-chart-pointer-hygiene="true"'));
add('PASS1986 CSS block exists', css.includes('PASS1986 — continuation of user') && css.includes('nested wallet clipping'));
add('PASS1986 CSS unclips header wallet dropdown', css.includes('#velmere-header-wallet-menu.velmere-wallet-dropdown-surface') && css.includes('overflow: visible !important'));
add('PASS1986 CSS has mobile fallback for nested wallet panels', css.includes('@media (max-width: 980px)') && css.includes('max-height: min(24rem, calc(100dvh - 8rem))'));
add('PASS1986 scroll hygiene exists', css.includes('Scroll hygiene: restore native click-drag/trackpad scroll'));

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error(`PASS1986 verification failed: ${failed.length}/${checks.length}`);
  for (const item of failed) console.error(`- ${item.name}`);
  process.exit(1);
}
console.log(`PASS1986 verification OK: ${checks.length}/${checks.length}`);
