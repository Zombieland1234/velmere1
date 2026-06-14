# Velmère Master Build Map — PASS463

## A. Velmère Browser / Lens / PDF
- [x] Czteroetapowa animacja V pozostaje aktywna.
- [x] Preview i pobieranie używają jednego raportu oraz jednego source-bound payloadu.
- [x] Scroll-lock pozostaje ciągły między generowaniem i podglądem.
- [x] Escape, focus trap, restore focus i ikona pobierania pozostają aktywne.
- [x] Dokładne wyniki wspieranych krypto dostają symbol-aware venue evidence.
- [x] PDF pokazuje aktywo, parę kanoniczną, primary/secondary quote, pair coverage i quote-basis penalty.
- [x] PDF confidence cap nie może przekroczyć limitu cross-venue evidence.
- [x] Brak porównywalnej drugiej pary pozostaje widoczny jako source gap.
- [x] PASS459–463 source contract jest wspólny dla preview, download i Shield AI.
- [ ] Uruchomić rzeczywisty render wszystkich czterech stron w Chromium.
- [ ] Wykonać pixel diff preview ↔ pobrany PDF dla PL/DE/EN.
- [>] PASS464: osobna wizualna timeline źródeł i stanów freshness na stronie 2 PDF.

## B. Basic / Pro / Advanced
- [x] Basic zachowuje cenę, kapitalizację/proxy, 24h, wolumen, zakres i freshness.
- [x] Pro zachowuje FDV, turnover, drugi provider, source contract, quorum i evidence debt.
- [x] Advanced zachowuje spread, depth, venue health, divergence i confidence cap.
- [x] Advanced zna dokładną parę i quote basis dla aktualnego aktywa.
- [x] USD/USDT/USDC nie są traktowane jako identyczne bez disclosure.
- [x] Nieporównywalna baza blokuje bezpośredni price divergence.
- [x] Stock/ETF/REIT fundamentals z PASS462 pozostają rozdzielone od token unlock/holder metrics.
- [ ] Dodać filing age, earnings cadence, cash-flow quality, net debt i debt maturity.
- [ ] Dodać ETF overlap, concentration i sector/geography exposure.
- [>] PASS464: Fundamentals Quality Score bez prognozy ceny i bez mieszania klas aktywów.

## C. Real Markets
- [x] Crypto, stock, ETF, REIT, FX, commodity, index i venue health mają osobne source policies.
- [x] Crypto detail hydration pobiera właściwy symbol, nie BTC proxy.
- [x] Binance/MEXC/Coinbase są venue health, nie fikcyjnymi stockami.
- [x] ETH, SOL, XRP, ADA, DOGE, LINK, AVAX, DOT, LTC i inne mają canonical pairs.
- [x] BNB przechodzi z niedostępnego Coinbase do MEXC/Binance.
- [x] Cache i quota są izolowane per venue + asset.
- [x] Panel pokazuje Pair coverage, quote basis, penalty i resolution note.
- [x] Provider error/unsupported nie są oznaczane jako live.
- [x] Batch tabeli pozostaje ograniczony, a ciężkie venue/fundamentals są uruchamiane w detail mode.
- [ ] Dodać Kraken, OKX i Bybit jako kolejne niezależne venue.
- [ ] Dodać realny USDT/USD i USDC/USD basis feed.
- [>] PASS464: adaptive secondary venue selection według aktywa, spreadu i freshness.

## D. Shield AI
- [x] Bot jest faktycznie renderowany w modalu.
- [x] Bot pobiera venue evidence dla bieżącego symbolu.
- [x] Source context zawiera pair resolution, quote basis i penalty.
- [x] `aligned/watch/divergent/stale/single_source/unavailable` ograniczają język odpowiedzi.
- [x] Brak źródła nie wraca jako surowe `unknown`.
- [x] Boundary blokuje gwarancje ceny, bezpieczeństwa, wypłat, rezerw i wypłacalności.
- [x] Provider facts i operator plan są PL/DE/EN.
- [ ] Dodać cytowalny source timeline w odpowiedzi bota.
- [ ] Dodać automatyczny follow-up probe po `stale/watch`, z zachowaniem quota guard.
- [>] PASS464: evidence citations per zdanie i explain-why-confidence-changed.

## E. Shield Map / VLM Brain / Orbit 360
- [x] Browser → PDF → Shield → Map handoff pozostaje zachowany.
- [x] Orbit rozróżnia aligned/watch/divergent/stale/single_source/probing/unavailable.
- [x] Cross Asset API udostępnia PASS463 pair coverage contract.
- [x] Pair-aware confidence może sterować stanem Orbit.
- [ ] Nody Orbit nie pokazują jeszcze osobno primary pair, secondary pair i quote basis.
- [ ] Brak klikanej linii divergence między dwoma venue nodes.
- [>] PASS464: para primary/secondary jako dwa węzły, basis bridge i drill-down telemetryczny.

## F. Provider / Data Backbone
- [x] Provider Truth Router rozdziela klasy aktywów.
- [x] CoinGecko obsługuje market snapshot krypto, Binance/MEXC/Coinbase venue evidence.
- [x] Alpha Vantage keyed provider pozostaje server-only dla stock/ETF/FX/commodity.
- [x] Canonical registry normalizuje aliasy i wybiera parę per venue.
- [x] Candidate pair wymaga potwierdzenia endpointu przed source-bound wording.
- [x] Quote basis ma jawny stan i karę pewności.
- [x] Inflight dedupe, cache, quota guard i durable snapshot są asset-aware.
- [x] Router nie dubluje fallbacku wolumenu.
- [ ] Realny FX/stablecoin basis source.
- [ ] Wspólny durable provider registry dla wszystkich instancji i klas aktywów.
- [ ] Circuit breaker oparty o serię błędów, latency percentiles i provider recovery.
- [>] PASS464: stale-while-revalidate i provider health registry.

## G. UI / UX
- [x] Najważniejsze KPI są przed diagnostyką operatora.
- [x] Publiczny modal zachowuje progresywne ujawnianie starych paneli PASS.
- [x] Pair coverage i quote basis mają osobne, czytelne wiersze.
- [x] Brak danych jest opisany jako wymagane źródło lub nieobsługiwana para.
- [x] Advanced nie ucina 20 pól w czytniku.
- [x] Real Markets nie pokazuje błędnego live badge przy provider_error.
- [ ] Pixel QA dla 1080p, laptopa, tabletu i telefonu.
- [ ] Sprawdzić wysokość i sticky tier tabs w modalu z pełnymi fundamentals.
- [>] PASS464: density modes Compact/Analyst/Operator bez utraty informacji.

## H. i18n
- [x] Gate PL/DE/EN przechodzi.
- [x] Browser summary, Shield AI i PDF mają copy pair-aware.
- [x] Pair coverage, quote basis, source required i confidence cap mają lokalizowane znaczenie.
- [x] Techniczne identyfikatory providerów pozostają nieprzetłumaczone celowo.
- [ ] Pełny locale-leak test wszystkich nowych krótkich labeli.
- [ ] Ujednolicić `quote basis`/`baza kwotowania`/`Notierungsbasis` w całym UI.
- [>] PASS464: centralny słownik technical labels zamiast lokalnych ternary copy.

## I. Build / QA
- [x] PASS453–PASS463 regression gates zielone.
- [x] PASS463 verifier obejmuje 14 kluczowych plików.
- [x] Resolver runtime cases zielone.
- [x] Cross-venue synthetic runtime cases zielone.
- [x] Pełny parser: 775 TS/TSX, 0 błędów składni.
- [x] i18n zielony.
- [x] Vercel preflight zielony — 771 plików.
- [x] ZIP integrity i SHA-256 w pakiecie końcowym.
- [ ] Pełny `npm run build` w środowisku z `node_modules`.
- [ ] Playwright Browser → V animation → PDF → Shield AI → Real Markets.
- [ ] Live network smoke w środowisku z działającym DNS.
- [ ] Test rzeczywistych limitów i odpowiedzi 429 providerów.

## J. Security / Claim Boundaries
- [x] Publiczne venue probe'y nie wymagają sekretów w kliencie.
- [x] Alpha Vantage key pozostaje server-only.
- [x] Input aktywa jest normalizowany i ograniczony do bezpiecznego symbolu.
- [x] Candidate pair nie zostaje automatycznie uznana za istniejącą.
- [x] Quote-basis mismatch obniża confidence zamiast być ukryty.
- [x] Provider error nie jest pozytywnym werdyktem.
- [x] Venue health nie jest proof of reserves, solvency, withdrawal guarantee ani rekomendacją.
- [ ] Status-page/incident feed z niezależnym timestampem.
- [ ] SSRF allowlist test dla wszystkich provider URLs.
- [>] PASS464: signed provider ledger receipt i redacted incident trail.

## K. Performance / Quota
- [x] Tabela nie odpala kosztownych probe'ów dla wszystkich wierszy.
- [x] Detail hydration uruchamia venue evidence dla pojedynczego aktywa.
- [x] Cache key rozdziela venue i canonical asset.
- [x] Inflight request dedupe działa per venue + asset.
- [x] Stale fallback nie podnosi confidence.
- [x] Quote-basis gate nie wymaga dodatkowego requestu.
- [ ] Współdzielony quota budget dashboard.
- [ ] Adaptive cadence według widoczności modala i freshness.
- [>] PASS464: preload wyłącznie dla aktywnego wiersza i abort po zamknięciu modala.

## L. Otwarte blockery
1. Brak `node_modules` — pełny Next.js build nie został wykonany.
2. Sandbox nie rozwiązał DNS Binance, MEXC ani Coinbase — brak live payload smoke testu.
3. Brak Chromium/Playwright — brak interakcyjnego testu i pixel diff PDF.
4. USD/USDT/USDC mają confidence penalty, lecz nie mają jeszcze osobnego live basis feedu.
5. Candidate pairs wymagają rzeczywistego endpoint confirmation w środowisku sieciowym.
6. Kraken/OKX/Bybit nie są jeszcze aktywnymi providerami venue consensus.
7. Alpha Vantage wymaga `ALPHA_VANTAGE_API_KEY` i ma ograniczony budżet.
8. Fundamentals nie zastępują filings ani audytowanych sprawozdań.
9. Durable shared ledger wymaga skonfigurowanego Upstash.
10. Orbit nie renderuje jeszcze osobnych pair nodes i basis bridge.
11. Pełny katalog instrumentów nadal zależy od pokrycia zewnętrznych providerów.
12. Brak automatycznego testu locale-leak dla lokalnych etykiet technicznych.

## M. Kolejność dalszej pracy
- **PASS464:** Fundamentals Quality Layer — filing age, earnings cadence, cash flow, debt, ETF overlap/concentration, source citations i centralny słownik technical labels.
- **PASS465:** Orbit evidence topology — primary/secondary nodes, basis bridge, divergence animation i klikany telemetry drawer.
- **PASS466:** pełny build, Playwright, PDF render/diff, mobile blocker sweep i public-beta release packet.
