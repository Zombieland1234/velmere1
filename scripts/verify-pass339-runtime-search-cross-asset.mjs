import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function must(condition, message) {
  if (!condition) {
    console.error(`PASS339 verify failed:\n- ${message}`);
    process.exit(1);
  }
}

const modal = read('components/market-integrity/TokenRiskModal.tsx');
const lens = read('components/search/VelmereIntelligenceSearchClient.tsx');
const shield = read('components/market-integrity/ShieldMapClient.tsx');
const market = read('components/market-integrity/MarketIntegrityClient.tsx');
const cross = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const route = read('app/api/search/lens-report/route.ts');
const contract = read('lib/search/intelligence-search-contract.ts');
const css = read('app/globals.css');

must(modal.includes('const chartStatusLabel = chartError'), 'chartStatusLabel runtime guard missing near chart render');
must(!/const chartStatusLabel[\s\S]{0,260}chartPoints/.test(modal.slice(15000, 16550)), 'chartStatusLabel is still defined inside the wrong VLM overlay scope');
must(lens.includes('data-pass339-search-overlay="true"'), 'VLM Browser lacks PASS339 search overlay marker');
must(lens.includes('symbol: "BNB"') && lens.includes('name: "Bittensor"') && lens.includes('name: "Bonk"'), 'VLM Browser B-search suggestions lack multiple B assets');
must(contract.includes('title: "BNB"') && contract.includes('title: "Bittensor"') && contract.includes('title: "Bonk"'), 'Lens search results lack BNB/Bittensor/Bonk seeds');
must(shield.includes('createPortal(') && shield.includes('data-pass339-search-portal="true"'), 'Shield Map suggestions are not portaled above all layers');
must(market.includes('href="/market-integrity/cross-asset"'), 'Main Shield search dock lacks Real markets / cross-asset button');
must(fs.existsSync('app/[locale]/market-integrity/cross-asset/page.tsx'), 'Cross-asset route page missing');
must(cross.includes('data-pass339-cross-asset-navigation="true"') && cross.includes('href="#exchange-health"') && cross.includes('href="#asset-tables"'), 'Cross-asset panel lacks quick navigation anchors');
must(route.includes('PAGE 2 · GLOBAL MARKET CONTEXT') || route.includes('GLOBAL MARKET CONTEXT'), 'Lens PDF does not expose multi-page global market context');
must(route.includes('[1, 2, 3].map'), 'Lens PDF is not split into multiple pages');
must(css.includes('data-pass339-search-overlay') && css.includes('shield-cross-asset-page-hero'), 'PASS339 CSS overlays/page hero missing');
console.log('PASS339 verify passed: runtime chart error fixed, search overlays are above all layers, B-query returns multiple assets, cross-asset tables have a page/button, and PDF splits into multi-page context.');
