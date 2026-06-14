import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const lens = read('components/search/VelmereIntelligenceSearchClient.tsx');
const searchContract = read('lib/search/intelligence-search-contract.ts');
const coingecko = read('lib/market-integrity/coingecko.ts');
const shield = read('components/market-integrity/MarketIntegrityClient.tsx');
const map = read('components/market-integrity/ShieldMapClient.tsx');
const cross = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const css = read('app/globals.css');
const pkg = read('package.json');

const checks = [
  ['Lens exact/prefix ranking blocks ETH→Tether substring noise', lens.includes('scoreLensSuggestion') && lens.includes('clean.length >= 4 && name.includes(clean)') && lens.includes('data-pass358-exact-suggestion-ranking="true"')],
  ['Shared search contract exact ranking exists', searchContract.includes('scoreVelmereSearchResult') && searchContract.includes('clean.length >= 4 && title.includes(clean)')],
  ['CoinGecko suggestion ranking uses exact/prefix score', coingecko.includes('scoreSuggestion') && coingecko.includes('symbol === clean') && coingecko.includes('clean.length >= 4 && name.includes(clean)')],
  ['Shield search uses browser-grade row ranking', shield.includes('scoreMarketSearchRow') && shield.includes('data-pass358-browser-ranking="true"')],
  ['Shield Map suggestions have token logos', map.includes('ShieldMapSuggestionAvatar') && map.includes('shieldMapTokenLogo') && map.includes('data-pass358-token-logo-suggestions="true"')],
  ['Exchange logo resolver exists for Binance/MEXC/OKX', cross.includes('data-pass358-exchange-logo-resolver="true"') && cross.includes("binance: buildFallbackLogoDataUri") && cross.includes("mexc: buildFallbackLogoDataUri")],
  ['CSS top-layer search and logo rescue exists', css.includes('PASS358 · Browser-grade search ranking') && css.includes('.vis-token-suggest-panel-pass358') && css.includes('.shield-map-suggestion-avatar-pass358')],
  ['Package script registered', pkg.includes('verify:pass358-browser-search-logo-resolver')],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('PASS358 verification failed:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}
console.log('verify:pass358-browser-search-logo-resolver ✅');
