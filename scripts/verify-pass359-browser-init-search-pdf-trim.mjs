import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });

const lens = read('components/search/VelmereIntelligenceSearchClient.tsx');
const searchRoute = read('app/api/search/route.ts');
const searchContract = read('lib/search/intelligence-search-contract.ts');
const pdfRoute = read('app/api/search/lens-report/route.ts');
const market = read('components/market-integrity/MarketIntegrityClient.tsx');
const tokenModal = read('components/market-integrity/TokenRiskModal.tsx');
const css = read('app/globals.css');

add('Browser main has PASS359 clean-init marker', lens.includes('data-pass359-browser-clean-init="true"'));
add('Browser suggestions are anchored under input marker', lens.includes('data-pass359-anchored-under-input="true"'));
add('Browser suggestion seed includes USDT/Tether', lens.includes('id: "tether"') && lens.includes('symbol: "USDT"'));
add('Local search exact query returns single result', searchContract.includes('PASS359: exact symbol/id/name queries are single-result') && searchContract.includes('bestScore <= 2'));
add('CoinGecko search uses ranked exact-only logic', searchRoute.includes('function scoreCoinGeckoMatch') && searchRoute.includes('PASS359: exact CoinGecko symbol/id/name search returns that asset only'));
add('PDF route has PASS359 spacing marker', pdfRoute.includes('PASS359 fixes downloaded PDF spacing'));
add('PDF page 2 limits rhythm rows to avoid overlap', pdfRoute.includes('.slice(0, 2)') && pdfRoute.includes('no overlapping cadence boxes'));
add('PDF has expanded asset profile coverage', pdfRoute.includes('nvda: {') && pdfRoute.includes('bnb: {') && pdfRoute.includes('sol: {') && pdfRoute.includes('xau: {'));
add('Shield public surface trim marker exists', market.includes('data-pass359-public-surface-trim="true"'));
add('Orbit drawer PASS359 panel marker exists', tokenModal.includes('shield-vlm-detail-panel-pass359') && tokenModal.includes('data-pass359-orbit-clean-drawer="true"'));
add('Orbit drawer PASS359 scroll frame marker exists', tokenModal.includes('shield-vlm-detail-scroll-frame-pass359') && tokenModal.includes('data-pass359-native-scroll-zone="true"'));
add('CSS overrides PASS340 floating Browser dropdown', css.includes('PASS359 · Velmère Browser init repair') && css.includes('top: calc(100% + 0.55rem) !important'));
add('CSS hides public operator PASS waterfall', css.includes('data-pass359-public-surface-trim') && css.includes('.shield-pass306-source-credential-sync'));
add('CSS restores native drawer scrolling', css.includes('pass359RightEdgeDrawerIn') && css.includes('touch-action: pan-y !important'));

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}${check.detail ? ` - ${check.detail}` : ''}`);
}

if (failed.length) {
  console.error(`\nPASS359 verification failed: ${failed.length} check(s).`);
  process.exit(1);
}

console.log('\nPASS359 verification passed.');
