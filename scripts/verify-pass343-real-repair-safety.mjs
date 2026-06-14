import { readFileSync } from 'node:fs';

function read(path) { return readFileSync(path, 'utf8'); }
const errors = [];
function must(condition, message) { if (!condition) errors.push(message); }

const modal = read('components/market-integrity/TokenRiskModal.tsx');
const shieldMap = read('components/market-integrity/ShieldMapClient.tsx');
const lens = read('components/search/VelmereIntelligenceSearchClient.tsx');
const route = read('app/api/search/lens-report/route.ts');
const searchRoute = read('app/api/search/route.ts');
const realMarkets = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const css = read('app/globals.css');
const pkg = read('package.json');

must(modal.includes('data-pass343-scroll-lock="manual-wheel"'), 'Orbit drawer lacks PASS343 scroll marker');
must(!modal.includes('event.currentTarget.scrollTop += event.deltaY'), 'Orbit drawer still overrides native scroll manually');
must(css.includes('PASS343 · real repair') && css.includes('z-index: 2147483000'), 'PASS343 drawer/search CSS missing');
must(shieldMap.includes('data-pass343-inline-search-suggestions="true"'), 'Shield Map suggestions are not inline/anchored');
must(!shieldMap.includes('createPortal('), 'Shield Map still portals suggestions and may jump on scroll');
must(lens.includes('data-pass343-pdf-forge-delay="true"') && lens.includes('vlm-browser-pdf-forge-active'), 'Lens PDF forge animation state missing');
must(route.includes('PASS343 fixes PDF page spacing') && !route.includes('rhythmY -= 0'), 'Lens PDF route still has clipped/duplicated rhythm layout');
must(searchRoute.includes('loadCoinGeckoMatches') && searchRoute.includes('CoinGecko markets'), 'CoinGecko live search lane missing');
must(realMarkets.includes('data-pass343-real-market-terminal="true"') && realMarkets.includes('realWorldRows.map'), 'Real Markets first non-crypto terminal missing');
must(pkg.includes('verify:pass343-real-repair'), 'package.json lacks PASS343 verify script');

if (errors.length) {
  console.error('PASS343 verify failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('PASS343 verify passed: Orbit scroll is native, Shield Map suggestions are anchored, PDF forge has a V animation, PDF route avoids clipped rows, CoinGecko search lane and Real Market terminal are present.');
