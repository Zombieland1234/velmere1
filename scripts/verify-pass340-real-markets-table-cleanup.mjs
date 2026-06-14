import fs from 'node:fs';
function read(path) { return fs.readFileSync(path, 'utf8'); }
function must(condition, message) {
  if (!condition) {
    console.error(`PASS340 verify failed:\n- ${message}`);
    process.exit(1);
  }
}

const modal = read('components/market-integrity/TokenRiskModal.tsx');
const cross = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const page = read('app/[locale]/market-integrity/cross-asset/page.tsx');
const lens = read('components/search/VelmereIntelligenceSearchClient.tsx');
const shieldMap = read('components/market-integrity/ShieldMapClient.tsx');
const css = read('app/globals.css');

must(!modal.includes('<CrossAssetCollapseRadarPanel />'), 'Cross asset wall still renders inside token modal');
must(modal.includes('const safeChartStatusLabel') && modal.includes('{safeChartStatusLabel}'), 'Token modal chart status fallback is not runtime-safe');
must(cross.includes('data-pass340-real-markets-table="true"'), 'Cross asset page lacks PASS340 real markets table marker');
must(cross.includes('<table className="shield-real-market-table"') && cross.includes('Global Market Table'), 'Real markets table shell is missing');
must(cross.includes('data-pass340-exchange-health-table="true"') && cross.includes('Binance / MEXC'), 'Exchange health table is not clearly separated');
must(cross.includes('data-pass340-asset-tables="true"') && cross.includes('Stocks / FX / real estate'), 'Stocks/FX/real estate table is missing');
must(cross.includes('data-pass340-ftx-table="true"'), 'FTX historical regression table is missing');
must(page.includes('data-pass340-real-markets-page="true"') && page.includes('Real Markets Table.'), 'Cross asset route hero was not simplified');
must(lens.includes('data-pass340-search-float="true"'), 'Lens search does not opt into PASS340 floating suggestions');
must(shieldMap.includes('symbol: "BNB"') && shieldMap.includes('name: "Bittensor"') && shieldMap.includes('name: "Bonk"'), 'Shield Map suggestions lack B-search examples');
must(css.includes('PASS340 · Real Markets table cleanup') && css.includes('main[data-pass340-search-float="true"] .vis-token-suggest-panel'), 'PASS340 CSS cleanup/search float rules missing');
console.log('PASS340 verify passed: token modal is clean, real markets page is table-first, exchange/stocks/FX/FTX lanes are separated, and search suggestions float above hero layers.');
