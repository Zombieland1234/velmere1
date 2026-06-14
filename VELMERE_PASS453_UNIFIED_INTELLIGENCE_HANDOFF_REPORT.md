# VELMÈRE PASS453 — Unified Intelligence Handoff

## Cel
Połączyć Velmère Browser/Lens, PDF, Shield, Shield Map i Real Markets jednym instrumentem, jednym payloadem i jednym stanem źródeł. Usunąć kolejny poziom chaosu `unknown`, rozdzielić werdykt dla człowieka od surowej telemetrii i pokazać pełny katalog rynków zamiast samego licznika.

## Wdrożenia

### 1. Human verdict przed tabelami
- Nowy runtime `pass453-unified-intelligence-handoff-runtime.ts`.
- Werdykt: calm / review / elevated / blocked.
- Sufit pewności, quorum źródeł, pokrycie dowodowe i świeżość danych.
- Sekcje: co potwierdzono, co ogranicza pewność, następne sprawdzenia.
- PL / DE / EN.

### 2. PDF dla człowieka
- Pierwsza strona rozpoczyna się werdyktem, a nie technicznym śmietnikiem.
- Readiness matrix: confidence ceiling, source quorum, evidence coverage, data freshness.
- Strona 4 używa ujednoliconych metryk Advanced i next-best checks.
- Podgląd i pobranie nadal korzystają z tego samego raportu/payloadu.

### 3. Browser → Shield → Shield Map
- Handoff przekazuje `query/asset`, `handoff=pass453` oraz `source=lens-pdf`.
- Shield pokazuje widoczny pasek przejęcia instrumentu.
- Shield Map automatycznie przejmuje ten sam instrument i uruchamia investigator scan.
- Brak zmiany podmiotu między Lens, PDF, Shield i Mapą.

### 4. Real Markets — pełny katalog
- Catalog łączy passy 371–419 i usuwa odziedziczone duplikaty po `assetClass + symbol`.
- UI pobiera nie tylko liczniki, ale także wiersze katalogu.
- Katalogowe akcje, FX, ETF, surowce, REIT i krypto trafiają do tabeli.
- Dodane stronicowanie „Pokaż więcej / Mehr anzeigen / Show more”.
- Pierwsze widoczne instrumenty pobierają quote/candles; brak providera pozostaje jawnym brakiem, a nie fikcyjną ceną.
- Binance/MEXC venue health pozostaje oddzielone od cen spółek i tokenów.

### 5. Regresje i stabilność
- Zachowane 3 sugestie wyszukiwania.
- Zachowany twardy scroll lock modali.
- Zachowany 4-etapowy V PDF forge.
- Zachowane Basic 10 / Pro 14 / Advanced 20.
- Zachowane PASS413–419 w katalogu.

## Walidacja
- `verify:pass453-unified-intelligence-handoff` — OK, 763 TS/TSX parsed.
- `verify:pass452-source-bound-depth-lab` — OK.
- `verify:pass451-pdf-exact-preview` — OK.
- `verify:pass450-tiered-human-analysis` — OK.
- `verify:pass449-catalog-darkmatter-guard` — OK.
- `check:i18n` — PL/DE/EN OK.
- `vercel:preflight` — OK, 759 files scanned.

## Uczciwe ograniczenie
Pełny `next build` i test Playwright nie zostały uruchomione, ponieważ paczka robocza nie zawiera kompletnego lokalnego `node_modules`, działającego serwera i przeglądarki Chromium.

## Progres po PASS453
- UI / produkt: 82–85%
- AI / real-data engine: 58–63%
- odporność architektury: 39–45%
- gotowość publicznej bety: 62–67%

## Następny kierunek
PASS454 — real browser execution: uruchomienie pełnej ścieżki Lens → V forge → PDF 1:1 → Shield → Shield Map, screenshot diff, provider errors oraz live smoke dla Binance/MEXC/CoinGecko.
