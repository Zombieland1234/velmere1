import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const css = read('app/globals.css');
const controls = read('components/market-integrity/UnifiedAssetAnalysisControls.tsx');
const cross = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const resolver = read('lib/market-integrity/asset-logo-resolver.ts');
const api = read('app/api/market-integrity/real-markets/route.ts');
const pkg = JSON.parse(read('package.json'));

const checks = [];
const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });

add('PASS1995 modal marker is rendered by UnifiedAssetModalShell', controls.includes('data-pass1995-modal="visual-logic-lock-five-real-windows"'));
add('PASS1995 labels five modal windows explicitly', ['asset-header','price-risk-confidence-strip','timeframe-strip','main-chart','right-actions-rail'].every((marker) => controls.includes(`data-pass1995-window="${marker}"`)));
add('PASS1995 depth dock and action windows are marked', controls.includes('data-pass1995-depth-dock="clean-equal-action-windows"') && controls.includes('data-pass1995-action-window="basic-pro-advanced"'));
add('PASS1995 CSS makes shell transparent and windows solid', css.includes('PASS1995 — final visual logic lock') && css.includes('background: transparent !important') && css.includes('--velmere-pass1995-window'));
add('PASS1995 CSS locks desktop modal scroll and viewport height', css.includes('max-height: calc(100dvh - 1.25rem)') && css.includes('overflow: hidden !important'));
add('PASS1995 CSS keeps mobile controlled internal scroll only', css.includes('@media (max-width: 980px)') && css.includes('overscroll-behavior: contain'));
add('Real Markets has quoteSymbolsForAsset fallback list', cross.includes('PASS1995_REAL_MARKETS_QUOTE_FALLBACKS') && cross.includes('function quoteSymbolsForAsset') && cross.includes('function quoteForAsset'));
add('Real Markets visible quote fetch includes fallback symbols', cross.includes('.flatMap((asset) => quoteSymbolsForAsset(asset))'));
add('Real Markets selected quote fetch hydrates all fallback quotes', cross.includes('selectedProviderSymbolsKey') && cross.includes('Object.fromEntries(quotes.map((quote) => [quote.symbol, quote]))'));
add('Exchange/native aliases include Binance, MEXC, OKX and Bybit', ['BINANCE','MEXC','OKX','BYBIT'].every((key) => cross.includes(`${key}: [`)));
add('Real markets API recognizes MX/OKB/MNT ids', ['mx: "MX-USD"','okb: "OKB-USD"','mnt: "MNT-USD"'].every((needle) => api.includes(needle)));
add('Logo resolver includes expanded local market logo map', ['ORCL','JPM','COIN','CRM','BINANCE','MEXC','KRAKEN'].every((key) => resolver.includes(`${key}: "/market-logos/`)));
add('Local logo assets exist for new major markets', ['amd','intc','orcl','ibm','jpm','coin','crm','mexc','okx','kraken'].every((name) => fs.existsSync(`public/market-logos/${name}.svg`)));
add('package.json exposes PASS1995 verifier', pkg.scripts?.['verify:pass1995-visual-logic-lock'] === 'node scripts/verify-pass1995-visual-logic-lock.mjs');

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error('PASS1995 visual logic lock FAILED');
  for (const fail of failed) console.error(`- ${fail.name}`);
  process.exit(1);
}
console.log(`PASS1995 visual logic lock OK — ${checks.length}/${checks.length} checks`);
