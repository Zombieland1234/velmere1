import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const checks = [];
function expect(condition, label) { checks.push({ ok: Boolean(condition), label }); }

const globals = read('app/globals.css');
const layers = read('lib/ui/pass628-overlay-constitution.ts');
const primitives = read('components/ui/OverlayPrimitives.tsx');
const cart = read('components/CartDrawer.tsx');
const navbar = read('components/Navbar.tsx');
const wallet = read('components/wallet/WalletConnectOptions.tsx');
const vlmAccess = read('components/vlm/VlmBuyAccessPanel.tsx');
const lens = read('components/search/VelmereIntelligenceSearchClient.tsx');
const shield = read('components/market-integrity/MarketIntegrityClient.tsx');

expect(globals.includes('inset: 0 !important;') && globals.includes('Each drawer surface decides'), 'Drawer portal frame is full viewport, not forcing left/top placement');
expect(layers.includes('listbox: 45'), 'Listbox layer sits above header and below drawers');
expect(primitives.includes('motionPreset?: "right" | "left" | "bottom" | "fade"'), 'DrawerRoot supports side-specific motion presets');
expect(cart.includes('motionPreset="bottom"') && cart.includes('cart-bottom-sheet'), 'Cart opens as bottom sheet/right-bottom panel');
expect(navbar.includes('<DropdownRoot') && navbar.includes('anchorRef={walletButtonRef}') && navbar.includes('surface: "header-wallet-panel"'), 'Header connect wallet opens from its trigger as anchored dropdown');
expect(navbar.includes('surface: "language-selector"') && navbar.includes('width={144}') && navbar.includes('Change language'), 'Language selector is a mini table under the globe trigger');
expect(wallet.includes('wallet-other-list-inline') && !wallet.includes('ModalRoot'), 'Other wallets expand inside the current wallet panel, not from screen corner');
expect(wallet.includes('label: "Coinbase Wallet"') && wallet.includes('icon: "CB"') && wallet.includes('label: "Rabby"') && wallet.includes('label: "Trust Wallet"'), 'Wallet list has named Coinbase/Rabby/Trust visual identifiers');
expect(vlmAccess.includes('motionPreset="left"') && vlmAccess.includes('<WalletConnectOptions showStatus={false} />'), 'VLM side access panel keeps wallet options inside the opened panel');
expect(globals.includes('animation: velmereLensCoreSpin 48s linear infinite') && globals.includes('@keyframes velmereLensCoreSpin'), 'Lens/VLM core spins continuously, with faster scan mode');
expect(lens.indexOf('velmere-command-shell sticky') < lens.indexOf('velmere-lens-hero'), 'Browser search is above the Lens hero/animation block');
expect(lens.includes('focus-visible:outline-none') && lens.includes('rounded-full bg-transparent'), 'Browser search avoids square native focus highlight');
expect(shield.includes('data-pass803-shield-top-trim="search-actions-only"'), 'Shield top hero is trimmed so search/actions become the primary surface');
expect(shield.includes('const [sortKey, setSortKey] = useState<MarketSortKey | null>') && shield.includes('setSortKey(null);'), 'Shield table headers cycle desc → asc → neutral');
expect(shield.includes('<Sparkline') && shield.includes('label="30d"') && shield.includes('sort="volume"') && shield.includes('sort="risk"'), 'Shield table keeps 30d, volume, risk and right mini chart');

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error('PASS803-812 runtime polish failed');
  for (const item of failed) console.error(' - ' + item.label);
  process.exit(1);
}
console.log(`PASS803-812 runtime polish passed: ${checks.length}/${checks.length}`);
for (const item of checks) console.log(' + ' + item.label);
