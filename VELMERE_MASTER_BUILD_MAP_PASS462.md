# Velmère Master Build Map — PASS462

## A. Velmère Browser / Lens / PDF
- [x] Czteroetapowa animacja V pozostaje aktywna.
- [x] Preview i download korzystają z jednego raportu/payloadu.
- [x] Scroll-lock, Escape, focus trap i ikona pobierania pozostają aktywne.
- [x] Dokładne wyszukiwanie BTC może dołączyć chroniony packet Binance + Coinbase.
- [x] PDF pokazuje PASS462 cross-venue state, divergence i confidence cap.
- [x] PDF nie zamienia zgodności ceny w certyfikat bezpieczeństwa giełdy.
- [ ] Wykonać render PDF w prawdziwej przeglądarce i porównać pikselowo wszystkie 4 strony.
- [>] PASS463: osobna wizualna strona PDF dla venue evidence i source timeline.

## B. Basic / Pro / Advanced
- [x] Basic zachowuje cenę, kapitalizację/proxy, 24h, wolumen i świeżość.
- [x] Pro zachowuje FDV, drugi provider, source contract i evidence debt.
- [x] Advanced ma cross-venue divergence, spread delta, freshness delta i depth ratio.
- [x] Stock/REIT dostają P/E, PEG, P/B, marże, ROE, EBITDA, EPS i zakres 52W, gdy provider je zwraca.
- [x] ETF dostaje net assets, expense ratio, turnover, inception oraz top holdings.
- [x] FX i surowce nadal nie udają stockowych fundamentals.
- [ ] Dodać filing age, earnings cadence, cash-flow quality i debt maturity lane.
- [>] PASS463: fundamentals scoring bez mieszania raportowania finansowego z przewidywaniem ceny.

## C. Real Markets
- [x] Coinbase Exchange jest trzecim realnym venue obok Binance i MEXC.
- [x] Coinbase używa publicznych product/ticker/stats/book/candles.
- [x] Wybrany Binance/MEXC jest porównywany z Coinbase; Coinbase z Binance.
- [x] Porównanie obejmuje cenę referencyjną, spread, świeżość, 24h move, health score i depth ratio.
- [x] Jawny stan: aligned/watch/divergent/stale/single_source/unavailable.
- [x] Real Markets pokazuje osobne panele Cross-Venue Consensus i Fundamentals.
- [x] Venue nadal nie udaje stocka i nie pokazuje fikcyjnej kapitalizacji.
- [ ] Kraken, OKX i Bybit jako dodatkowe niezależne venue.
- [>] PASS463: dynamiczny wybór najlepszego drugiego źródła według pary i regionu.

## D. Shield AI
- [x] Bot pozostaje faktycznie renderowany w modalu Shield.
- [x] Dla BTC pobiera ten sam chroniony packet Binance ↔ Coinbase.
- [x] Provider facts zawierają venue, health score, divergence, spread i freshness.
- [x] Stan watch/divergent/stale ogranicza confidence cap i język odpowiedzi.
- [x] Boundary zabrania utożsamiania market-data health z rezerwami, wypłatami lub wypłacalnością.
- [ ] Uogólnić cross-venue evidence na ETH/SOL/BNB bez używania pary BTC jako proxy.
- [>] PASS463: symbol-aware venue pairs i wspólny source-context store Browser → Shield → Map.

## E. Shield Map / VLM Brain / Orbit 360
- [x] PASS461 state-aware Orbit pozostaje aktywny.
- [x] Orbit nadal rozróżnia aligned/watch/divergent/stale/single_source/probing/unavailable.
- [x] Konsensus PASS462 jest dostępny w publicznym kontrakcie Cross Asset API.
- [x] Handoff Browser → PDF → Shield → Map pozostaje zachowany.
- [ ] Nody Orbit nie pokazują jeszcze osobno Binance, Coinbase i różnicy między nimi.
- [>] PASS463: dwa venue-nody, łącznik divergence i klikany drill-down telemetryczny.

## F. Provider / Data Backbone
- [x] PASS462 Cross Venue Consensus jest osobnym modułem domenowym.
- [x] USD/USDT basis jest jawnie opisany jako proxy, a nie identyczna waluta kwotowana.
- [x] Venue probe ma cache, inflight dedupe, quota guard i opcjonalny durable snapshot.
- [x] Alpha Vantage ma strukturalny fundamentals payload.
- [x] ETF_PROFILE i OVERVIEW są rozdzielone zgodnie z klasą aktywa.
- [x] Brak fundamentals nie niszczy poprawnego quote — obniża zakres dowodowy.
- [ ] Trwały, wspólny ledger dla Alpha Vantage i wszystkich venue.
- [>] PASS463: provider health registry, circuit breaker i stale-while-revalidate.

## G. UI / UX
- [x] Panel danych pokazuje ważne KPI przed diagnostyką techniczną.
- [x] Fundamentals ma osobną, czytelną kartę zamiast dumpu provider evidence.
- [x] ETF pokazuje top holdings w chipach.
- [x] Cross-venue panel pokazuje pary, divergence, spread, freshness i depth ratio.
- [x] Braki pozostają jako source required, nie surowe `unknown`.
- [x] PL/DE/EN copy obejmuje główne nowe komunikaty PASS462.
- [ ] Pixel QA na 1080p, laptop, tablet i telefon.
- [>] PASS463: redukcja wysokości modala, sticky tier tabs i progressive disclosure fundamentals.

## H. i18n
- [x] Gate PL/DE/EN przechodzi.
- [x] Cross-venue headline i boundary mają PL/DE/EN.
- [x] Shield AI provider plan ma PL/DE/EN.
- [x] Browser summary dla BTC ma PL/DE/EN.
- [ ] Część krótkich nazw KPI pozostaje po angielsku jako termin rynkowy.
- [>] PASS463: pełny słownik technical labels oraz test locale-leak dla nowych paneli.

## I. Build / QA
- [x] PASS453-PASS462 regresje zielone.
- [x] PASS462 verifier obejmuje 14 kluczowych plików.
- [x] Pełny parser: 775 TS/TSX, 0 błędów składni.
- [x] i18n zielony.
- [x] Vercel preflight zielony — 770 plików.
- [x] ZIP integrity i SHA-256 w pakiecie końcowym.
- [ ] Pełny `npm run build` w środowisku z `node_modules`.
- [ ] Playwright Browser → V forge → PDF → Shield AI → Real Markets.
- [ ] Live smoke test endpointów w środowisku z działającym DNS.

## J. Security / Claim Boundaries
- [x] Wszystkie probe'y używają publicznych endpointów bez sekretów po stronie klienta.
- [x] Alpha Vantage key pozostaje wyłącznie po stronie serwera.
- [x] Timeout, cache i quota guard ograniczają burst.
- [x] Cross-venue aligned nie oznacza proof of reserves, solvency ani withdrawal availability.
- [x] USD/USDT basis jest ujawniony.
- [x] Provider error nie jest przepisywany jako pozytywny werdykt.
- [ ] Połączyć status-page/incident feed bez używania social chatter jako dowodu.

## K. Performance / Quota
- [x] Tabela nie odpala keyed fundamentals dla wszystkich wierszy.
- [x] Fundamentals są pobierane dopiero w detail mode jednego instrumentu.
- [x] BTC cross-venue enrichment uruchamia się tylko dla dokładnego wyniku.
- [x] Venue probe używa cache i deduplikacji.
- [x] Coinbase REST limit ma własny chroniony budget przez istniejący runtime.
- [ ] Telemetry budget dashboard i współdzielony quota ledger między instancjami.
- [>] PASS463: adaptive probe cadence według freshness/visibility.

## L. Otwarte blockery
1. Brak `node_modules` — nie wykonano pełnego builda Next.js.
2. Sandbox nie rozwiązał DNS dla Coinbase ani Binance — brak live smoke testu payloadów.
3. Brak Chromium/Playwright — brak testu pikselowego PDF i pełnej interakcji.
4. Cross-venue packet w Browser/Shield jest obecnie symbol-aware tylko dla BTC.
5. Coinbase/USD i Binance/USDT wymagają jawnej kontroli stablecoin basis; PASS462 ją opisuje, ale nie pobiera osobnego USDT/USD feedu.
6. Alpha Vantage wymaga sekretu `ALPHA_VANTAGE_API_KEY` i ma ograniczony budżet zapytań.
7. OVERVIEW/ETF_PROFILE nie zastępują filings ani audytowanych sprawozdań.
8. Venue health nie obejmuje proof of reserves, wypłat, status-page ani incident response.
9. Brak trwałego współdzielonego quota ledgera bez konfiguracji Upstash.
10. Kraken/OKX/Bybit nadal nie są drugim/ trzecim źródłem produkcyjnym.

## M. Kolejność dalszej pracy
- **PASS463:** symbol-aware venue routing dla BTC/ETH/SOL/BNB, Orbit telemetry nodes, durable provider registry i incident lane.
- **PASS464:** fundamentals quality layer: filing age, earnings cadence, cash flow, debt, ETF overlap i concentration.
- **PASS465:** pełny build + Playwright + PDF render/diff + mobile blocker sweep + public-beta release packet.
