import { readFileSync } from 'node:fs';

const files = {
  nav: readFileSync('components/Navbar.tsx', 'utf8'),
  wallet: readFileSync('components/wallet/WalletConnectOptions.tsx', 'utf8'),
  square: readFileSync('components/square/VelmereSquareClient.tsx', 'utf8'),
  lens: readFileSync('components/search/VelmereIntelligenceSearchClient.tsx', 'utf8'),
  market: readFileSync('components/market-integrity/MarketIntegrityClient.tsx', 'utf8'),
  css: readFileSync('app/globals.css', 'utf8'),
};

const checks = [
  ['navbar wallet uses DrawerRoot, not hidden tiny dropdown', /surface=\"header-wallet-panel\"|surface: \"header-wallet-panel\"/.test(files.nav) && /<DrawerRoot\s*\n\s*open=\{walletOpen\}/.test(files.nav)],
  ['language selector remains anchored dropdown with outside close primitive', /<DropdownRoot[\s\S]*surface: \"language-selector\"/.test(files.nav)],
  ['other wallet panel uses centered nested ModalRoot', /<ModalRoot[\s\S]*nested[\s\S]*surface: \"wallet-other-list\"/.test(files.wallet)],
  ['wallet panel removed visible routes label heading', !/\{routesLabel\}/.test(files.wallet) && !/routesLabel: string/.test(files.wallet)],
  ['wallet rows include Coinbase/Rabby/Trust labels', /Coinbase Wallet/.test(files.wallet) && /Rabby/.test(files.wallet) && /Trust Wallet/.test(files.wallet)],
  ['Square post modal is not wrapped in extra BodyPortal', !/import BodyPortal/.test(files.square) && /"square-post-modal": \"visible\"/.test(files.square)],
  ['Square modal has deterministic post/article plus comments aside layout', /<article[\s\S]*<aside className=\"flex min-h-\[18rem\]/.test(files.square)],
  ['Lens mode chips removed from public search form', !/\{modes\.map\(\(item\) => \(/.test(files.lens)],
  ['Lens has minimum PDF forge duration', /minimumForgeMs/.test(files.lens) && /remainingForgeMs/.test(files.lens)],
  ['Lens professional animation is visible again', /Lens keeps one search\/result\/PDF/.test(files.css) && !/velmere-lens-live-stage,[\s\S]{0,160}display: none !important/.test(files.css)],
  ['Lens input focus is rounded full gold focus shell', /focus-within:border-velmere-gold/.test(files.lens) && /rounded-full/.test(files.lens)],
  ['Shield desktop table includes right-side chart column', /<Sparkline[\s\S]*values=\{row\.sparkline7d\}[\s\S]*change=\{row\.priceChange7d\}/.test(files.market)],
  ['Shield table still has tri-state sortable headers', /function updateSort\(nextKey: MarketSortKey\)[\s\S]*setSortDirection\("asc"\)[\s\S]*setSortKey\(fallback\.key\)/.test(files.market)],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed += 1;
}
if (failed) {
  console.error(`\n${failed} PASS793-802 checks failed.`);
  process.exit(1);
}
console.log(`\nPASS793-802 verifier: ${checks.length}/${checks.length} checks passed.`);
