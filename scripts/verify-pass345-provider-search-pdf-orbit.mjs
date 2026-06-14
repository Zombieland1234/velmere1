import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const errors = [];
const must = (condition, message) => { if (!condition) errors.push(message); };

const marketClient = read('components/market-integrity/MarketIntegrityClient.tsx');
const modal = read('components/market-integrity/TokenRiskModal.tsx');
const realMarkets = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const providerContract = read('lib/market-integrity/real-market-provider-contract.ts');
const providerRoute = read('app/api/market-integrity/real-markets/provider-contract/route.ts');
const crossAssetRoute = read('app/api/market-integrity/cross-asset/route.ts');
const assetMatrix = read('lib/market-integrity/universal-asset-market-matrix.ts');
const pdfRoute = read('app/api/search/lens-report/route.ts');
const css = read('app/globals.css');
const pkg = read('package.json');

must(marketClient.includes('data-pass345-inline-search-no-portal="true"'), 'Shield search is not inline/no-portal like VLM Browser');
must(!marketClient.includes('createPortal('), 'Shield search still uses createPortal and can jump under scroll');
must(!marketClient.includes('window.addEventListener("scroll", handleFrame, true)'), 'Shield search still binds global scroll repaint listener');
must(modal.includes('shield-vlm-detail-panel-pass345') && modal.includes('data-pass345-scroll-v4="true"'), 'Orbit drawer v4 scroll marker missing');
must(providerContract.includes('PASS345.real_market_provider_contract') && providerContract.includes('Crypto depth fast lane') && providerContract.includes('Proof passport lane'), 'Provider contract lanes missing');
must(providerRoute.includes('buildRealMarketProviderContract'), 'Provider contract API route missing');
must(crossAssetRoute.includes('realMarketProviderContract'), 'Cross-asset API does not expose provider contract');
must(realMarkets.includes('data-pass345-provider-contract="true"') && realMarkets.includes('data-pass345-provider-ribbon="true"') && realMarkets.includes('shield-real-provider-chip'), 'Real Markets provider-aware UI missing');
must(assetMatrix.includes('PASS345.universal_asset_market_matrix') && assetMatrix.includes('symbol: "USD/PLN"') && assetMatrix.includes('symbol: "QQQ"') && assetMatrix.includes('symbol: "BRENT"'), 'Universal asset matrix was not expanded for PASS345');
must(!assetMatrix.includes('symbol: "XAU/USD",\n    symbol: "XAU/USD"'), 'Duplicate XAU/USD symbol key still present');
must(pdfRoute.includes('PASS345 adds asset-specific profile copy') && pdfRoute.includes('assetProfile') && pdfRoute.includes('const pageStreams = [1, 2, 3, 4, 5]'), 'Lens PDF v5 asset/provider page missing');
must(css.includes('PASS345 · Shield search inline no-portal') && css.includes('shield-real-provider-ribbon') && css.includes('data-pass345-inline-search-no-portal="true"'), 'PASS345 CSS guards missing');
must(pkg.includes('verify:pass345-provider-search-pdf-orbit'), 'package.json lacks PASS345 verify script');

if (errors.length) {
  console.error('PASS345 verify failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('PASS345 verify passed: Shield inline search/no scroll listener, Orbit drawer v4 marker, provider contract API/UI, expanded Real Markets matrix and Lens PDF v5 asset/provider page are present.');
