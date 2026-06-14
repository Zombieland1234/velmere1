# VELMÈRE PASS347 — Real Market Reader + Orbit Scroll v5

## Cel
Naprawić to, co użytkownik widział w publicznym Real Markets: szerokie tabele, boczne przesuwanie, niezrozumiałe sekcje `Second Source Divergence`, brak profesjonalnych ikon giełd i nadal niestabilny scroll Orbit drawer po kliknięciu kafelka.

## Zmiany kodu
- `components/market-integrity/CrossAssetCollapseRadarPanel.tsx`
  - dodany `data-pass347-public-reader-terminal`;
  - dodany human reader primer: jak czytać rynek, risk i second source;
  - dodane kategorie kart: FX, stocki, ETF, real estate proxy, commodities;
  - legacy tabele `global-risk`, `universal-assets`, `asset-tables`, `ftx-patterns` mają twardy `hidden`;
  - Exchange Stability dostał logo map dla Binance/MEXC/Coinbase/Kraken/Bybit/OKX;
  - Second Source copy przepisane na ludzki model A → B → Missing.

- `components/market-integrity/TokenRiskModal.tsx`
  - dodany `shield-vlm-detail-panel-pass347`;
  - dodany `data-pass347-orbit-scroll-native`;
  - wheel delta trafia do najbliższego scroll-zone albo drawer, a nie do body/orbit canvas;
  - touch/pointer/scroll propagation jest blokowany na drawerze.

- `app/globals.css`
  - nowe style `shield-real-reader-primer`, `shield-real-category-section`, `shield-real-category-stack`;
  - public Real Markets ma `overflow-x: clip`;
  - legacy hidden tables są wymuszone przez CSS;
  - Orbit drawer v5 ma wolniejsze wysuwanie, native scroll, brak sticky pseudo-label i mobile bottom-sheet override.

- `scripts/verify-pass347-real-market-reader-orbit-v5.mjs`
  - nowy guard blokujący powrót poziomych tabel i regresję scrolla.

## Testy
- `npm run verify:pass347-real-market-reader-orbit-v5` ✅
- `node scripts/verify-pass346-real-market-cards-orbit-scroll.mjs` ✅
- `node scripts/verify-pass345-provider-search-pdf-orbit.mjs` ✅
- `node scripts/verify-pass344-user-blocker-repair.mjs` ✅
- `npm run check:i18n` ✅
- `npm run typecheck` ❌ nadal blokowane przez brak `node_modules`/typów w paczce eksportowej: `next`, `react`, `lucide-react`, `next-intl`, `@types/node`, `tailwindcss`, `zustand`, itd.

## Następne ID
PASS348: Orbit focus trap/ESC/mobile QA + drawer read-mode accordion.
PASS349: PDF renderer v6 visual engine + visual regression.
PASS350: logo/icon provider cache dla wszystkich assetów.
