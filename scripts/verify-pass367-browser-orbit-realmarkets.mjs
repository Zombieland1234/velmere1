import { readFileSync } from 'node:fs';

const files = {
  browser: readFileSync('components/search/VelmereIntelligenceSearchClient.tsx', 'utf8'),
  tokenModal: readFileSync('components/market-integrity/TokenRiskModal.tsx', 'utf8'),
  realMarkets: readFileSync('components/market-integrity/CrossAssetCollapseRadarPanel.tsx', 'utf8'),
  css: readFileSync('app/globals.css', 'utf8'),
  searchRoute: readFileSync('app/api/search/route.ts', 'utf8'),
  reportRoute: readFileSync('app/api/search/lens-report/route.ts', 'utf8'),
};

const checks = [
  ['browser suggestions render through fixed portal', files.browser.includes('data-pass367-browser-portal-suggestions="true"') && files.browser.includes('suggestionPortalRef') && files.browser.includes('position: "fixed"')],
  ['browser passes locale into live search', files.browser.includes('&locale=${encodeURIComponent(locale)}')],
  ['PDF download passes locale into report route', files.browser.includes('format=pdf&locale=${encodeURIComponent(locale)}')],
  ['Orbit drawer has PASS367 scroll and trim markers', files.tokenModal.includes('data-pass367-orbit-reader-scroll="true"') && files.tokenModal.includes('data-pass367-public-detail-trim="true"')],
  ['Orbit drawer hides raw operator footrail', files.tokenModal.includes('shield-vlm-detail-operator-footrail') && files.css.includes('.shield-vlm-detail-operator-footrail')],
  ['Token chart footer uses safe label', files.tokenModal.includes('{safeChartStatusLabel}') && !files.tokenModal.includes('{chartStatusLabel}')],
  ['Real Markets includes PASS367 reader note and logo expansion', files.realMarkets.includes('data-pass367-real-market-no-crypto-copy="true"') && files.realMarkets.includes('real-markets-pass367-context-note') && files.realMarkets.includes('Binance: brandIcon("binance.com")')],
  ['CSS includes PASS367 portal and native scroll layer', files.css.includes('PASS367 · Browser portal') && files.css.includes('pass367OrbitReaderSlideIn') && files.css.includes('vis-token-suggest-panel-pass367')],
  ['API search localizes CoinGecko copy', files.searchRoute.includes('resolveLensLocale') && files.searchRoute.includes('localized.summary')],
  ['PDF report route localizes live CoinGecko copy', files.reportRoute.includes('resolveReportLocale') && files.reportRoute.includes('coinToLiveLensResult(match.coin, locale)')],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('PASS367 verification failed:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}

console.log('PASS367 browser/orbit/real-markets guard OK');
