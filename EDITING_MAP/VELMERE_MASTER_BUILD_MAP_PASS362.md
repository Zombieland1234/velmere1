# VELMERE MASTER BUILD MAP — PASS362

## Zakres PASS362

PASS362 naprawia dwa bieżące blokery zgłoszone na screenach:

1. Shield Map search portal nie może „lecieć za użytkownikiem” po scrollu. Dropdown ma być przypięty do inputa i znikać, gdy input wyjdzie poza viewport.
2. Real Markets nie może być ścianą opisów ani osobną skomplikowaną dokumentacją. Ma działać jak główna tabela Shield: wyszukiwarka, segmenty rynku, logo, cena, ryzyko, mini trend i klikany panel z wykresem oraz trybami Basic / Pro / Advanced.

## Zmienione pliki

- `components/market-integrity/ShieldMapClient.tsx`
- `components/market-integrity/CrossAssetCollapseRadarPanel.tsx`
- `app/[locale]/market-integrity/cross-asset/page.tsx`
- `app/globals.css`
- `scripts/verify-pass362-real-markets-shield-table.mjs`
- `package.json`

## Naprawy Shield Map

- Portal z wynikami nadal wychodzi ponad ramki i kontenery.
- Dodany scroll listener z `requestAnimationFrame`, ale tylko gdy dropdown jest otwarty.
- Po scrollu panel przelicza pozycję względem inputa.
- Gdy input wyjdzie poza widoczny obszar, panel zamyka się zamiast zostawać przyklejony na ekranie.
- Marker: `data-pass362-scroll-anchored-portal="true"`.

## Real Markets — nowy kierunek UI

Real Markets zostało przebudowane w kierunku Shield-style terminal:

- brak dużego hero z opisami,
- na wejściu tylko wyszukiwarka,
- segmenty: Stocki, Waluty, ETF, Surowce, Real estate, Giełdy,
- osobne tabele zamiast mieszania NVDA z walutami i giełdami,
- logo każdego instrumentu/giełdy,
- cena / preview value,
- zmiana,
- źródło,
- ryzyko,
- mini trend,
- klik w row otwiera modal chart-first,
- modal ma prawy panel z Basic analysis / Pro review / Advanced analysis.

## Granica bezpieczeństwa

- UI nie robi porad inwestycyjnych.
- `risk` jest review pressure, nie sygnałem kupna/sprzedaży.
- Provider-pending dane są oznaczane jako preview/source state.
- Real Markets ma być czytelne i premium, ale nie udawać live providera bez source timestamp.

## Testy

- `verify:pass362-real-markets-shield-table` ✅
- `verify:pass361-modal-header-shieldmap-portal` ✅
- `verify:pass360-browser-pdf-modal-confidence` ✅
- `verify:pass357-market-width-logo-grid` ✅
- `verify:pass356-proof-passport-security-orbit` ✅
- `verify:pass355-market-proof-orbit-delta` ✅
- `verify:pass354-lux-market-orbit-scroll-router` ✅
- `check:i18n` ✅
- `vercel:preflight` ✅

## Następne priorytety

PASS363 powinien iść dalej w Real Markets:

1. dopiąć prawdziwy search ranking dla instrumentów Real Markets,
2. dodać real logo resolver wspólny z Shield,
3. dodać lepsze dane w modalach,
4. rozdzielić pseudo-price od provider-ready value,
5. zrobić dokładniejszy chart panel podobny do Shield token modal,
6. później dopiero podpiąć provider API.
