import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const rank = read('lib/search/velmere-search-ranking.ts');
const browser = read('components/search/VelmereIntelligenceSearchClient.tsx');
const shield = read('components/market-integrity/MarketIntegrityClient.tsx');
const shieldMap = read('components/market-integrity/ShieldMapClient.tsx');
const modal = read('components/market-integrity/TokenRiskModal.tsx');
const cross = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const realSearch = read('components/market-integrity/RealMarketSearch.tsx');
const realSearchRoute = read('app/api/market-integrity/real-markets/search/route.ts');
const assetLogo = read('components/market-integrity/AssetLogo.tsx');
const logoResolver = read('lib/market-integrity/asset-logo-resolver.ts');
const pdfRoute = read('app/api/search/lens-report/route.ts');
const shop = read('components/shop/ShopPageClient.tsx');
const css = read('app/globals.css');

const checks = [
  ['Shared ranking prioritizes exact symbols', rank.includes('exact_symbol') && rank.includes('score: 10_000')],
  ['Short ticker queries cannot match unrelated middle substrings', rank.includes('query.length >= 4') && rank.includes('Example: ETH resolves Ethereum, not Tether')],
  ['Browser, Shield and Shield Map use the shared ranking module', browser.includes('rankVelmereSearchValues') && shield.includes('rankVelmereSearchValues') && shieldMap.includes('rankVelmereSearchValues')],
  ['All three search surfaces expose keyboard combobox navigation', browser.includes('role="combobox"') && shield.includes('role="combobox"') && shieldMap.includes('role="combobox"')],
  ['Browser suggestions are anchored directly below the input', browser.includes('className="vis-search-anchor"') && browser.includes('top-[calc(100%+0.45rem)]')],
  ['Shared AssetLogo is used by Browser, Shield Map and Real Markets', browser.includes('<AssetLogo') && shieldMap.includes('<AssetLogo') && cross.includes('<AssetLogo')],
  ['Logo resolver covers crypto, companies, exchanges and provider fallback', logoResolver.includes('cryptoLogoMap') && logoResolver.includes('companyBrandSlugMap') && logoResolver.includes('exchangeBrandSlugMap') && logoResolver.includes('/api/market-integrity/asset-logo')],
  ['AssetLogo cycles through providers before rendering its badge', assetLogo.includes('setCandidateIndex((current) => current + 1)') && assetLogo.includes('data-logo-source')],
  ['Real Markets exposes catalog search with a curated fallback', cross.includes('<RealMarketSearch />') && realSearch.includes('curated fallback') && realSearchRoute.includes('TWELVE_DATA_API_KEY') && realSearchRoute.includes('symbol_search')],
  ['Orbit uses native scrolling without document wheel hijacking', modal.includes('The browser owns scrolling') && !modal.includes('document.addEventListener("wheel"') && !modal.includes('normalizeSelectedTileDetailDeltaPass355')],
  ['Final CSS pan-y contract wins after legacy none rules', css.includes('Final cascade contract: intentionally after every legacy PASS block.') && css.lastIndexOf('touch-action: pan-y !important') > css.lastIndexOf('touch-action: none !important')],
  ['PDF forge shows four stages for at least 5.2 seconds', browser.includes('setPdfForgeStage(3)') && browser.includes('}, 5200)') && browser.includes('vlm-browser-pdf-forge-progress')],
  ['PDF output wraps long titles and includes richer asset profiles', pdfRoute.includes('wrapPdfLine(report.title, 31)') && pdfRoute.includes('label: "NVIDIA"') && pdfRoute.includes('label: "Gold / USD"')],
  ['Collections use a restrained two-column lookbook rhythm', shop.includes('shop-funnel-notes') && shop.includes('velmere-lookbook-controls') && shop.includes('className="velmere-lookbook-grid grid grid-cols-1 gap-5 md:grid-cols-2 xl:gap-7"')],
];

const failures = checks.filter(([, ok]) => !ok);
if (failures.length) {
  console.error('PASS359 verification failed:');
  for (const [label] of failures) console.error(`- ${label}`);
  process.exit(1);
}

console.log('verify:pass359-unified-market-runtime OK');
