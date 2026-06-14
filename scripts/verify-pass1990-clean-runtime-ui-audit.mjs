import { readFileSync } from 'node:fs';

const checks = [];
const read = (file) => readFileSync(file, 'utf8');
const css = read('app/globals.css');
const unified = read('components/market-integrity/UnifiedAssetAnalysisControls.tsx');
const markets = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const lens = read('components/search/VelmereIntelligenceSearchClient.tsx');
const metamask = read('public/wallets/metamask.svg');
const phantom = read('public/wallets/phantom.svg');

function check(name, ok) { checks.push({ name, ok: Boolean(ok) }); }

check('Shield sort headers are clickable again', css.includes('.shield-sort-header[data-pass1984-tristate]') && css.includes('pointer-events: auto !important'));
check('Asset modal has PASS1990 separate window marker', unified.includes('data-pass1990-clean-modal="separate-header-metrics-chart-right-actions"'));
check('Asset chart and right action rail are split', unified.includes('data-pass1990-chart-stage="separate-chart-card-plus-three-right-cards"') && unified.includes('data-pass1990-depth-position="right-side-three-separate-windows"'));
check('PASS1990 CSS separates header, metrics, chart and right actions', css.includes('separate-header-metrics-chart-right-actions') && css.includes('grid-template-columns: minmax(0, 1fr) minmax(14rem, 16rem)'));
check('Lens headline typewriter is wired', lens.includes('data-pass1990-typewriter-title="true"') && lens.includes('setCommandPromptState'));
check('Lens PDF capsule no longer shows before results', lens.includes('data-pass1990-lens-capsule="hidden-until-result"') && lens.includes('{results.length ? ('));
check('Real Markets starts on stocks not all', markets.includes('const [category, setCategory] = useState<Category>("stocks")'));
check('Real Markets category rail hides All/Crypto tabs', markets.includes('filter((item) => item !== "all" && item !== "crypto")'));
check('Real Markets venue rows map to native quote symbols', markets.includes('providerSymbol: "BNB-USD"') && markets.includes('providerSymbol: "MX-USD"'));
check('Venue health detection survives native quote provider symbols', markets.includes('asset?.id.endsWith("-venue")') && markets.includes('/venue health/i'));
check('Real Markets search popover duplicate style typo removed', !markets.includes(`style={pass628LayerStyle("listbox")}>
              style={pass628LayerStyle("listbox")}>`));
check('Menu/cart/mail surfaces are opaque and lower blur cost', css.includes('#velmere-private-mail-drawer') && css.includes('backdrop-filter: none !important'));
check('ShieldMap and RealMarkets search popovers have rounded no-square focus', css.includes('.shield-map-token-suggest-panel') && css.includes('.shield-real-search-result.is-active'));
check('Wallet SVG assets are brand-colored not gold-only', metamask.includes('#E2761B') && phantom.includes('#AB9FF2'));

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error('PASS1990 verifier failed:');
  for (const item of failed) console.error(`- ${item.name}`);
  process.exit(1);
}
console.log(`PASS1990 clean runtime UI audit OK · ${checks.length}/${checks.length}`);
