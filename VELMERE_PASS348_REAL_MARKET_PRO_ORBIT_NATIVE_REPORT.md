# VELMÈRE PASS348 — Real Market Reader Pro + Orbit Native Scroll v6

## Cel
Kontynuacja po screenach użytkownika: Real Markets ma wyglądać jak Shield, nie jak szeroka tabela; Second Source ma być zrozumiały dla ludzi; Exchange Stability nie ma powtarzać tej samej notki; Orbit drawer po kliknięciu kafelka ma scrollować natywnie i nie oddawać scrolla do body/orbitu.

## Zmiany kodu
- `app/[locale]/market-integrity/cross-asset/page.tsx`
  - hero zmieniony z `Real Markets Table. Terminal.` na `Real Markets Reader.`;
  - opis jasno mówi, że layout jest kartowy, z logo, mini-wykresem i bez szerokich tabel;
  - dodany marker `data-pass348-real-markets-reader-page`.

- `components/market-integrity/CrossAssetCollapseRadarPanel.tsx`
  - dodany `data-pass348-professional-reader` i `data-pass348-real-market-reader-pro`;
  - karty real-market dostały role użytkowe: waluta / tło płynności, spółka / disclosure, ETF / koszyk rynku, real estate proxy, commodity / makro;
  - karty dostały ludzkie wyjaśnienie provider state, żeby `provider required` nie wyglądał jak losowy debug;
  - score dostał podpis `review pressure`, żeby nie wyglądał jak sygnał tradingowy;
  - `Second Source` dostał prosty opis per lane, np. API freshness, reserve context, FX reference i stock disclosure;
  - Exchange Stability ma jeden opis w nagłówku i krótsze karty, bez powtarzania `stability wyżej = lepiej` przy każdym venue.

- `components/market-integrity/TokenRiskModal.tsx`
  - dodany `shield-vlm-detail-panel-pass348` i `data-pass348-orbit-native-scroll-v6`;
  - główny drawer nie używa już `preventDefault()` na normalnym panelu, więc scroll zostaje natywny;
  - JS scroll zostaje tylko dla zagnieżdżonych `data-vlm-scroll-zone`, a główny panel ma działać jak zwykły scroll container;
  - zachowana kompatybilność PASS346/PASS347 guardów.

- `app/globals.css`
  - style PASS348 dla Real Market Reader Pro: source-state box, score stack, role labels, human second-source line;
  - wymuszone `min-width: 0`, `max-width: 100%` i `overflow-wrap`, żeby karty nie rozpychały widoku;
  - Orbit drawer v6 ma wolniejszy premium reveal `1480ms`, native scroll, `overscroll-behavior-y: contain` i `touch-action: pan-y`.

- `scripts/verify-pass348-real-market-pro-orbit-native.mjs`
  - nowy guard blokujący powrót starego hero, brak ludzkiego provider-state, brak prostego second-source i regresję scrolla Orbit v6.

## Testy
- `npm run check:i18n` ✅
- `npm run verify:pass348-real-market-pro-orbit-native` ✅
- `npm run verify:pass347-real-market-reader-orbit-v5` ✅
- `npm run verify:pass346-real-market-cards-orbit-scroll` ✅
- `npm run verify:pass345-provider-search-pdf-orbit` ✅
- `npm run verify:pass344-user-blocker-repair` ✅
- `npm run typecheck` ❌ nadal blokowane przez brak `node_modules`/typów w paczce eksportowej: `next`, `react`, `lucide-react`, `next-intl`, `@types/node`, `tailwindcss`, `zustand`, itd.

## Następne ID
PASS349: PDF renderer v6 + visual regression i multi-page print layout.
PASS350: logo/icon provider cache dla wszystkich assetów + deterministic fallback.
PASS351: Orbit focus trap / keyboard QA / mobile drawer replay.
