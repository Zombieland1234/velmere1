# VELMÈRE PASS344 — user blocker repair

Generated: 2026-06-05

## Cel passu
Naprawa konkretnych problemów ze screenów: niescrollujący Orbit drawer, sticky pasek w drawerze, dropdown Lens schowany pod clean-mode boxem, zbyt szybki PDF forge, słaby/clipped PDF, za ciężki Real Markets i brak BAT w podpowiedziach.

## Zmiany w kodzie

### 1. Orbit 360 drawer scroll v3
- Dodano `shield-vlm-detail-panel-pass344` i `data-pass344-native-scroll-no-sticky="true"`.
- Drawer ma teraz fixed right-edge, natywny `overflow-y:auto`, `touch-action: pan-y`, momentum scroll i wysoki z-index.
- Header draweru nie jest już sticky, więc nie wyskakuje u góry podczas przewijania.
- Pasek poprzedni/następny kafelek jest ukryty w publicznym drawerze.

### 2. Token modal digest
- Dodano `data-pass344-token-public-digest="true"`.
- Publiczny panel kończy się na action buttons + regime chips; ciężkie operatorowe bloki po nich są ukryte CSS-em.
- Ukryte: pressure, contract trap, unlock, OSINT, source quorum, freshness registry, analytics taxonomy, storage, privacy envelope, SLA, retention.

### 3. Lens / VLM Browser dropdown
- Dropdown podpowiedzi ma `data-pass344-lens-suggestions-top="true"` i najwyższy z-index.
- Search shell ma isolation i overflow visible, żeby podpowiedzi nie chowały się pod `Velmère Browser · clean mode`.
- Dodano BAT / Basic Attention Token do lokalnych podpowiedzi i local search contract.

### 4. PDF forge
- Kliknięcie `Otwórz podgląd PDF` nie pokazuje A4 natychmiast: minimalny czas animacji to 5200 ms.
- UI pokazuje etap `source stitch → A4 layout → Velmère signature`.

### 5. PDF route v4
- PDF ma 4 strony zamiast 3.
- Legal/source ledger przeniesiony na osobną stronę, żeby nie ucinać dolnych tekstów.
- Page 3 kończy się lekkim `SOURCE LEDGER CONTINUES`, a Page 4 ma boundary, customer safe interpretation, source snapshot, next review i signature.

### 6. Real Markets clean terminal
- Główna tabela Real Markets została odchudzona do: #, Instrument, Class, Source, Price lane, Risk, AI note, Trend.
- Ukryte publicznie zostały ciężkie debug tables: global risk, universal assets duplicate, adapter tables, FTX old data.
- Zostaje clean terminal + exchange stability/second-source jako niższe warstwy.

## Pliki dotknięte
- `components/market-integrity/TokenRiskModal.tsx`
- `components/search/VelmereIntelligenceSearchClient.tsx`
- `lib/search/intelligence-search-contract.ts`
- `components/market-integrity/CrossAssetCollapseRadarPanel.tsx`
- `app/api/search/lens-report/route.ts`
- `app/globals.css`
- `scripts/verify-pass344-user-blocker-repair.mjs`
- `package.json`

## Testy
- `node scripts/verify-pass344-user-blocker-repair.mjs` ✅
- `node scripts/verify-pass343-real-repair-safety.mjs` ✅
- `npm run check:i18n` ✅

## Dalej
PASS345 powinien wejść w realne cache/search hardening: CoinGecko cache TTL, większy token index, logo map fallback, search virtualization, stale/fallback UI i browser QA dla scrolla.
