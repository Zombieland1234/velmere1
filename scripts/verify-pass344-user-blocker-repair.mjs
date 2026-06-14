import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const errors = [];
const must = (condition, message) => { if (!condition) errors.push(message); };

const modal = read('components/market-integrity/TokenRiskModal.tsx');
const lens = read('components/search/VelmereIntelligenceSearchClient.tsx');
const searchContract = read('lib/search/intelligence-search-contract.ts');
const realMarkets = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const pdfRoute = read('app/api/search/lens-report/route.ts');
const css = read('app/globals.css');
const pkg = read('package.json');

must(modal.includes('shield-vlm-detail-panel-pass344') && modal.includes('data-pass344-native-scroll-no-sticky="true"'), 'PASS344 Orbit drawer native-scroll/no-sticky marker missing');
must(css.includes('data-pass344-native-scroll-no-sticky="true"] > div:first-child') && css.includes('position: static !important'), 'PASS344 CSS does not disable sticky drawer header');
must(css.includes('.shield-vlm-detail-action-row') && css.includes('display: none !important'), 'PASS344 CSS does not hide previous/next drawer strip');
must(modal.includes('data-pass344-token-public-digest="true"'), 'Token side panel lacks PASS344 public digest marker');
must(css.includes('.shield-token-action-panel[data-pass344-token-public-digest="true"] > .shield-pass270-pressure-rail') && css.includes('.shield-pass284-retention-policy'), 'Token public digest does not hide operator wall blocks after four chips');
must(lens.includes('data-pass344-pdf-forge-min-duration="5200ms"') && lens.includes('}, 5200);'), 'PDF forge minimum 5.2s duration missing');
must(lens.includes('data-pass344-lens-suggestions-top="true"') && css.includes('z-index: 2147483400'), 'Lens suggestions are not promoted above clean-mode card');
must(lens.includes('symbol: "BAT"') && searchContract.includes('symbol: "BAT"') && searchContract.includes('Basic Attention Token'), 'BAT search/suggestion lane missing');
must(realMarkets.includes('data-pass344-real-markets-clean="true"') && realMarkets.includes('shield-real-market-table-clean'), 'Real Markets clean terminal table missing');
must(css.includes('#universal-assets') && css.includes('#ftx-patterns') && css.includes('display: none !important'), 'Real Markets deep debug tables are not hidden from public clean view');
must(pdfRoute.includes('PASS344 adds a fourth page') && (pdfRoute.includes('const pageStreams = [1, 2, 3, 4]') || pdfRoute.includes('const pageStreams = [1, 2, 3, 4, 5]')) && pdfRoute.includes('SOURCE LEDGER + TRUST BOUNDARY'), 'Lens PDF v4 four-page unclipped boundary missing');
must(pkg.includes('verify:pass344-user-blocker-repair'), 'package.json lacks PASS344 verify script');

if (errors.length) {
  console.error('PASS344 verify failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('PASS344 verify passed: Orbit drawer scroll/sticky repair, token digest trim, Lens dropdown z-index, 5.2s PDF forge, BAT search lane, clean Real Markets and 4-page PDF boundary are present.');
