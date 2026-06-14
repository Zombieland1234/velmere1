import { readFileSync } from 'node:fs';

const files = {
  css: 'app/globals.css',
  unified: 'components/market-integrity/UnifiedAssetAnalysisControls.tsx',
  shield: 'components/market-integrity/TokenRiskModal.tsx',
  shieldTable: 'components/market-integrity/MarketIntegrityClient.tsx',
  real: 'components/market-integrity/CrossAssetCollapseRadarPanel.tsx',
  map: 'components/market-integrity/ShieldMapCommandClient.tsx',
};

const read = (name) => readFileSync(files[name], 'utf8');
const checks = [
  ['unified marker', () => read('unified').includes('data-pass1984-five-piece-final="icon-strip-chart-three-depth-cards-contained-brain"')],
  ['contained brain marker', () => read('unified').includes('data-pass1984-contained-brain="same-popup-no-fullscreen"')],
  ['depth dock marker', () => read('unified').includes('data-pass1984-depth-dock="three-cards-fly-to-chart"')],
  ['shield chart cleanChrome prop', () => read('shield').includes('cleanChrome = false') && read('shield').includes('cleanChrome?: boolean')],
  ['shield popup uses cleanChrome', () => read('shield').includes('<PopupMarketChart') && read('shield').includes('cleanChrome\n            />')],
  ['shield chart data clean attribute', () => read('shield').includes('data-chart-clean-chrome={cleanChrome ? "true" : "false"}')],
  ['shield hover tooltip suppressed in clean mode', () => read('shield').includes('{!cleanChrome && hoveredX !== undefined')],
  ['shield evidence rail conditional', () => read('shield').includes('{!cleanChrome ? evidenceRail : null}')],
  ['shield table tri-state marker', () => read('shieldTable').includes('data-pass1984-tristate="desc-asc-neutral"')],
  ['shield risk centered', () => read('shieldTable').includes('SortHeader label={t("marketTable.risk")} sort="risk" align="right"')],
  ['real markets tri-state marker', () => read('real').includes('data-pass1984-tristate="desc-asc-neutral"')],
  ['real markets sort-key marker', () => read('real').includes('data-sort-key={sortKey}')],
  ['shield map three pills marker', () => read('map').includes('data-pass1984-command-pills="three-only"') && read('map').includes('{["BTC", "ETH", "SOL"].map')],
  ['pass1984 css exists', () => read('css').includes('PASS1984 — continue user')],
  ['overlay low-lag css', () => read('css').includes('--velmere-pass1984-overlay-duration') && read('css').includes('backdrop-filter: none !important;')],
  ['five piece css final', () => read('css').includes('.unified-asset-modal-shell[data-pass1984-five-piece-final]')],
  ['command screen css', () => read('css').includes('.velmere-command-center-title') && read('css').includes('shield-map-command-pills[data-pass1984-command-pills="three-only"]')],
  ['square stable modal css', () => read('css').includes('#velmere-square-post-modal.velmere-square-post-modal-centered') && read('css').includes('scrollbar-gutter: stable both-edges')],
];

const failures = [];
for (const [label, fn] of checks) {
  try {
    if (!fn()) failures.push(label);
  } catch (error) {
    failures.push(`${label}: ${error.message}`);
  }
}

if (failures.length) {
  console.error('PASS1984 verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`PASS1984 verification OK · ${checks.length}/${checks.length} checks`);
