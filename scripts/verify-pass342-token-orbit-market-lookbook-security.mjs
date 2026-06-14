import fs from 'node:fs';
function read(path) { return fs.readFileSync(path, 'utf8'); }
function must(condition, message) {
  if (!condition) {
    console.error(`PASS342 verify failed:\n- ${message}`);
    process.exit(1);
  }
}
const modal = read('components/market-integrity/TokenRiskModal.tsx');
const css = read('app/globals.css');
const shop = read('components/shop/ShopPageClient.tsx');
const security = read('components/security/SecurityTrustPage.tsx');
const cross = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const universal = read('lib/market-integrity/universal-asset-market-matrix.ts');
const page = read('app/[locale]/market-integrity/cross-asset/page.tsx');

must(modal.includes('data-pass342-token-side-clean="true"'), 'token action panel lacks PASS342 clean marker');
must(css.includes('.shield-token-action-panel[data-pass342-token-side-clean="true"] > :nth-child(n + 5)'), 'token action panel does not hide rails after four regime tiles');
must(modal.includes('data-pass342-chart-clean="true"') && modal.includes('change24h={result.metrics.priceChange24h}'), 'chart toolbar is not reduced to latest + 24h');
must(!modal.includes('{chartUi.visible}:') && !modal.includes('{chartUi.high}: {formatUsd(visibleHigh)}'), 'chart debug labels still render in toolbar/footer');
must(modal.includes('shield-vlm-detail-panel-pass342') && modal.includes('data-pass342-scroll-repair="true"'), 'Orbit drawer lacks PASS342 scroll repair marker');
must(css.includes('.shield-vlm-detail-panel-portal.shield-vlm-detail-panel-pass342') && css.includes('.shield-vlm-detail-action-row'), 'Orbit drawer CSS does not force scroll and hide previous/next row');
must(shop.includes('data-pass342-lookbook-category-runway="true"') && shop.includes('Męska linia') && shop.includes('Damska linia'), 'shop lookbook category runway missing men/women cards');
must(security.includes('data-pass342-responsible-disclosure="true"') && security.includes('Velmère Security Challenge'), 'security page lacks responsible disclosure challenge copy');
must(cross.includes('data-pass342-real-markets-terminal="true"') && page.includes('data-pass342-real-markets-universe="true"'), 'real markets terminal markers missing');
must(universal.includes('rank: 19') && universal.includes('EUR/PLN') && universal.includes('COIN') && universal.includes('XAG/USD'), 'universal asset matrix was not expanded beyond PASS341');
console.log('PASS342 verify passed: token modal is clean, chart labels are trimmed, Orbit detail drawer scroll is repaired, lookbook/security/real-markets upgrades are present.');
