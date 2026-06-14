# Velmère Master Build Map — PASS460

## A. Velmère Browser / Lens / PDF
- [x] Czteroetapowa animacja V pozostaje aktywna.
- [x] Preview i download nadal korzystają z jednego raportu.
- [x] Scroll-lock, Escape, focus trap i ikona pobierania pozostają aktywne.
- [x] PDF łączy Provider Truth PASS459 z Consensus PASS460.
- [x] PDF pokazuje limit pewności i następny krok zamiast mocnego wniosku z jednego źródła.
- [x] Stary timestamp obniża confidence cap.
- [>] PASS461: Chromium pixel QA czterech stron i test realnego pliku po pobraniu.

## B. Basic / Pro / Advanced
- [x] Basic zachowuje cenę, market cap/proxy, 24h, volume, range, źródło i freshness.
- [x] Pro zachowuje świece, FDV, turnover, drugi provider i evidence debt.
- [x] Advanced zachowuje liquidity, slippage, depth, holders, venue resilience, source entropy i lineage.
- [x] Wszystkie tryby respektują `confidenceCap` z consensus gate.
- [x] Divergent/stale/single-source nie mogą udawać pełnej pewności.
- [>] PASS461: P/E, shares outstanding, 52w range, filing age i earnings cadence jako natywne pola stock Pro/Advanced.

## C. Real Markets
- [x] Provider router rozdziela klasy aktywów.
- [x] Krypto: CoinGecko snapshot + Binance candles.
- [x] Stock/ETF/REIT/exchange equity: keyed Alpha Vantage detail hydration.
- [x] FX: keyed exchange-rate lane bez fikcyjnej kapitalizacji.
- [x] Surowce mają jawny boundary spot/reference/futures.
- [x] Primary i secondary price są porównywane w bps.
- [x] API zwraca PASS460 consensus contract.
- [x] CoinGecko używa prawdziwego `last_updated`, high24h i low24h.
- [ ] Live venue-health REST/WebSocket dla Binance i MEXC.
- [>] PASS461: ping, ticker, depth freshness, reconnect/server-shutdown state i incident ledger.

## D. Shield AI
- [x] Bot jest faktycznie renderowany w Shield.
- [x] Odpowiedź korzysta z aktualnego wyniku, historii i braków.
- [x] Source contract, provider plan i provider facts pozostają aktywne.
- [x] Dodano consensus state, confidence cap i consensus notes.
- [x] Bot nie może przekroczyć limitu pewności providera.
- [x] PL/DE/EN dla nowego panelu.
- [>] PASS461: przekazanie dokładnego divergence bps z wybranego Real Markets instrumentu do Shield AI.

## E. Shield Map / VLM Brain
- [x] Handoff Browser → PDF → Shield → Shield Map pozostaje zgodny z PASS453.
- [x] Source boundary jest wspólne dla raportu i bota.
- [ ] Orbit node z `truthState/consensusState/freshnessState`.
- [>] PASS461: wizualny source quorum i kolor stanu aligned/watch/divergent bez ogólnej kropki.

## F. Provider / Data Backbone
- [x] `ALPHA_VANTAGE_API_KEY` pozostaje server-only.
- [x] Jawne stany providera pozostają aktywne.
- [x] Dodano cache odpowiedzi i inflight deduplication.
- [x] Dodano lokalny per-minute/per-day quota guard.
- [x] Cache state jest widoczny w provider evidence.
- [x] CoinGecko/Binance pozostają właściwą ścieżką krypto.
- [x] Yahoo pozostaje jawnie opisanym compatibility fallbackiem.
- [>] PASS461: trwały quota ledger poza pamięcią procesu oraz stale-while-revalidate.

## G. UI / UX
- [x] Provider Truth pozostaje czytelny przed diagnostyką operatora.
- [x] Dodano kompaktowy panel Provider Consensus.
- [x] UI pokazuje freshness, divergence i confidence cap.
- [x] Długie wartości nadal mają kontrolowany grid i break-word.
- [x] Brak drugiej ceny pokazuje „second price required”, nie `unknown`.
- [>] PASS461: visual density QA 1080p, laptop, tablet i mobile.

## H. i18n
- [x] Gate PL/DE/EN przechodzi.
- [x] Shield consensus ma etykiety PL/DE/EN.
- [x] PDF consensus ma treść PL/DE/EN.
- [>] PASS461: lokalizacja wszystkich technicznych providerPlan/consensusNotes z Real Markets routera.

## I. Build / QA
- [x] PASS453–PASS460 regresje zielone.
- [x] 771 TS/TSX przechodzi pełny syntax sweep.
- [x] i18n zielony.
- [x] Vercel preflight zielony.
- [x] Package JSON zawiera verifier PASS460.
- [ ] Pełny `npm run build` w środowisku z `node_modules`.
- [ ] Playwright Browser → V forge → PDF → download → close.
- [ ] Playwright Real Markets → detail provider → consensus → tiers → close.

## J. Security / Secrets
- [x] API key nie trafia do UI, PDF ani odpowiedzi klienta.
- [x] Provider request ma timeout.
- [x] Quota guard nie ujawnia sekretu ani billing state.
- [x] Divergence i stale state blokują mocne twierdzenia.
- [x] Venue health nadal nie obiecuje bezpieczeństwa ani wypłacalności.
- [>] PASS461: trwały security event dla provider throttling/divergence.

## K. Performance / Quota
- [x] Tabela batchowa nie uruchamia keyed detail calls.
- [x] Keyed hydration tylko dla jednego instrumentu.
- [x] Quote/overview mają osobne TTL.
- [x] Identyczne równoległe requesty są deduplikowane.
- [x] Procesowy budget chroni przed burstem.
- [>] PASS461: cache telemetry, stale-while-revalidate i persistent budget.

## L. Otwarte blockery
1. Brak `node_modules` w paczce roboczej — brak pełnego builda.
2. Brak realnego `ALPHA_VANTAGE_API_KEY` w sandboxie — brak testu produkcyjnej odpowiedzi.
3. Procesowy quota guard resetuje się przy cold starcie i nie zastępuje trwałego limitera.
4. Venue health wymaga prawdziwych adapterów Binance/MEXC.
5. Indeksy nadal wymagają breadth/constituents providera.
6. Nie wykonano Chromium pixel testu PDF i mobile.
7. Drugi provider equity/FX pozostaje compatibility fallbackiem, nie pełnym produkcyjnym źródłem.

## M. Kolejność dalszej pracy
- **PASS461:** live venue health Binance/MEXC + persistent quota/cache telemetry + Orbit consensus state.
- **PASS462:** equity fundamentals depth + second-source production adapter + pełna lokalizacja provider plans.
- **PASS463:** Playwright/pixel QA, pełny build, mobile blocker sweep i release packet public beta.
