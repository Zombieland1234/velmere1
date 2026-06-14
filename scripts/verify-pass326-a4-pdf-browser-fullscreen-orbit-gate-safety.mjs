import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const must = (condition, message) => {
  if (!condition) {
    console.error(`PASS326 guard failed: ${message}`);
    process.exit(1);
  }
};

const gate = read('lib/market-integrity/public-a4-pdf-browser-fullscreen-orbit-gate.ts');
const lens = read('components/search/VelmereIntelligenceSearchClient.tsx');
const reportRoute = read('app/api/search/lens-report/route.ts');
const modal = read('components/market-integrity/TokenRiskModal.tsx');
const shieldMap = read('components/market-integrity/ShieldMapClient.tsx');
const shop = read('components/shop/ShopPageClient.tsx');
const productCard = read('components/product/ProductCard.tsx');
const css = read('app/globals.css');
const prompt = read('VELMERE_PASS326_NEXT_CHAT_MAP_AND_PROMPT.md');

must(gate.includes('a4_evidence_sheet_browser'), 'missing PASS326 gate innovation');
must(lens.includes('data-pass326-a4-pdf-browser="true"'), 'Lens lacks PASS326 A4 marker');
must(lens.includes('vlm-browser-a4-sheet'), 'Lens lacks in-page A4 sheet');
must(!lens.includes('vlm-browser-pdf-modal-root'), 'Lens still renders auto popup modal');
must(reportRoute.includes('format === "pdf"'), 'PDF route lacks real PDF branch');
must(reportRoute.includes('application/pdf'), 'PDF route does not return application/pdf');
must(modal.includes('data-pass326-fullscreen-orbit="true"'), 'Orbit lacks fullscreen marker');
must(modal.includes('shield-vlm-detail-panel-pass326'), 'Orbit detail drawer lacks PASS326 class');
must(!modal.includes('onWheelCapture={(event) => {\n                event.preventDefault();'), 'Orbit drawer still hijacks wheel preventDefault');
must(shieldMap.includes('absolute left-0 right-0 top-[calc(100%+0.65rem)]'), 'Shield Map suggestions are not anchored to search input');
must(!shieldMap.includes('createPortal('), 'Shield Map suggestions still portal to body and can jump on scroll');
must(shieldMap.includes('Źródło live chwilowo limituje zapytania'), 'Shield Map lacks friendly 429 handling');
must(shop.includes('velmere-lookbook-intro'), 'Shop lacks lookbook intro');
for (const noisy of ['Atelier product receipt', 'Provenance concierge', 'Quiet first purchase', 'Atelier trust ribbon', 'Concierge proof whisper', 'Velmère store preview']) {
  must(!shop.includes(noisy), `Shop still renders noisy public block: ${noisy}`);
}
must(productCard.includes('lookbook preview'), 'Product cards lack public lookbook language');
must(!productCard.includes('{providerCopy.provider}: {product.provider}'), 'Product cards still expose provider audit');
must(css.includes('vlm-browser-a4-sheet'), 'CSS lacks A4 sheet styling');
must(css.includes('vlmDetailSlideFromRightPass326'), 'CSS lacks PASS326 drawer animation');
must(css.includes('shield-vlm-sequence-pass326'), 'CSS lacks fullscreen orbit styling');
must(prompt.includes('OBSZAR DZIAŁANIA PASS326'), 'new chat map/prompt missing PASS326 scope');

console.log('PASS326 A4 PDF Browser + Fullscreen Orbit + Lookbook Collection Gate verified.');
