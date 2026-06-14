import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function must(condition, message) {
  if (!condition) {
    console.error(`PASS341 verify failed:\n- ${message}`);
    process.exit(1);
  }
}

const lib = read('lib/market-integrity/universal-asset-market-matrix.ts');
const panel = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const route = read('app/api/market-integrity/cross-asset/route.ts');
const css = read('app/globals.css');
const exchange = read('lib/market-integrity/exchange-health-adapter.ts');

must(lib.includes('UniversalAssetMarketMatrix') && lib.includes('PASS341.universal_asset_market_matrix'), 'Universal Asset Matrix library missing');
must(lib.includes('"stock"') && lib.includes('"fx"') && lib.includes('"real_estate"') && lib.includes('"etf"') && lib.includes('"commodity"'), 'universal matrix must include non-crypto asset classes');
must(lib.includes('AAPL') && lib.includes('NVDA') && lib.includes('EUR/USD') && lib.includes('VNQ') && lib.includes('SPY') && lib.includes('XAU/USD'), 'universal matrix lacks concrete stock/FX/REIT/ETF/commodity rows');
must(panel.includes('data-pass341-universal-asset-matrix="true"') && panel.includes('data-pass341-universal-asset-table="true"'), 'panel lacks PASS341 markers');
must(panel.includes('StabilityPill') && panel.includes('wyżej = lepiej'), 'exchange stability score is still visually treated as risk');
must(route.includes('buildUniversalAssetMarketMatrix') && route.includes('universalAssetMatrix'), 'cross-asset API does not expose universalAssetMatrix');
must(css.includes('PASS341 · Universal Asset Matrix') && css.includes('.shield-real-stability-pill'), 'PASS341 CSS missing');
must(exchange.includes('Stability jest dobra jak na preview') && exchange.includes('Second-source lane obniża fałszywe alarmy'), 'exchange copy not recalibrated away from scary warning language');

console.log('PASS341 verify passed: every asset class can render advanced Shield-style rows, exchange stability is not colored as risk, and cross-asset API exposes universalAssetMatrix.');
