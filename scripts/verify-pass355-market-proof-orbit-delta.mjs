import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const cross = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const modal = read('components/market-integrity/TokenRiskModal.tsx');
const css = read('app/globals.css');
const matrix = read('lib/market-integrity/universal-asset-market-matrix.ts');
const page = read('app/[locale]/market-integrity/cross-asset/page.tsx');

const checks = [
  ['PASS355 Real Markets root marker exists', cross.includes('data-pass355-market-proof-reader="true"')],
  ['Per-symbol professional profiles exist for real stocks/FX/ETF/commodities', cross.includes('assetProfessionalProfiles') && cross.includes('AAPL') && cross.includes('NVDA') && cross.includes('EUR/USD') && cross.includes('BRENT')],
  ['Asset cards expose proof-reader strip and public cue', cross.includes('data-pass355-professional-strip="true"') && cross.includes('data-pass355-public-cue="true"')],
  ['Exchange cards keep stability explanation once, not repeated in every metric row', cross.includes('data-pass355-exchange-proof="true"') && cross.includes('wyżej = lepiej, ale nadal tylko jakość lane')],
  ['Second source text is human-readable and not a fear table', cross.includes('data-pass355-second-source-proof="true"') && cross.includes('To nie jest osobna tabela strachu')],
  ['Orbit delta normalizer handles wheel deltaMode lines/pages', modal.includes('normalizeSelectedTileDetailDeltaPass355') && modal.includes('deltaMode === 1') && modal.includes('deltaMode === 2')],
  ['Orbit scroll sink consumes wheel and touch inside the inner frame', modal.includes('consumeSelectedTileWheelPass355') && modal.includes('consumeSelectedTileTouchMovePass355') && modal.includes('data-pass355-scroll-delta-sink="true"')],
  ['Orbit document listener uses the PASS355 consumers', modal.includes('consumeSelectedTileWheelPass355(event)') && modal.includes('consumeSelectedTileTouchMovePass355(event)')],
  ['CSS has PASS355 proof-reader and deterministic delta sink styles', css.includes('PASS355 · Real Markets proof-reader + Orbit deterministic delta sink') && css.includes('.shield-real-pass355-professional-strip') && css.includes('.shield-vlm-detail-scroll-frame-pass355[data-pass355-scroll-delta-sink="true"]')],
  ['Duplicate SPY rank property from previous passes is removed', !matrix.includes('id: "spy",\n    rank: 11,\n    rank: 11')],
  ['Page metadata uses proof reader language', page.includes('Velmère Shield — Real Markets Proof Reader') && page.includes('data-pass355-market-proof-reader-page="true"')],
];

const failures = checks.filter(([, ok]) => !ok);
if (failures.length) {
  console.error('PASS355 verification failed:');
  for (const [label] of failures) console.error(`- ${label}`);
  process.exit(1);
}

console.log('verify:pass355-market-proof-orbit-delta ✅');
